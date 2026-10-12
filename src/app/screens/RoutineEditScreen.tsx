import { useEffect, useReducer, useRef, useState } from 'preact/hooks';
import { DANCE_PROFILES, getDanceProfile } from '../../engine/dance-profiles.js';
import { figureDisplayName } from '../../engine/figure-terminology.js';
import { BackButton } from '../components/BackButton.tsx';
import { Icon } from '../components/Icon.tsx';
import { danceName } from '../i18n/index.ts';
import { formatCounts } from '../lib/count-display.ts';
import { hidesDock, isKeyboardOpen } from '../lib/keyboard.ts';
import { onVisibleViewportChange, viewportHeights } from '../platform/viewport.ts';
import { MoreOptions, NoticeBox, VoiceOffsetRow, type AlertNotice } from '../practice/controls.tsx';
import { routineBaseBpm } from '../practice/routine-preferences.ts';
import { BPM_MAX, BPM_MIN, clampBpm, type SpeedProfile } from '../practice/speed.ts';
import { usePracticeSession } from '../practice/use-session.ts';
import { voiceOffsetFor } from '../practice/voice-offset.ts';
import { beatsPerBar, offBarIndexes, routineEndsMidBar } from '../routines/bar-check.ts';
import { RoutineEditor } from '../routines/editor.ts';
import { useReorderDrag } from '../routines/useReorderDrag.ts';
import { FigureForm } from '../routines/FigureForm.tsx';
import { makeId } from '../routines/ids.ts';
import { ROUTINE_NAME_MAX } from '../routines/limits.ts';
import { createRoutine, uniqueRoutineName, type Routine } from '../routines/routine.ts';
import { useI18n } from '../state/i18n.ts';
import { replaceRoute } from '../state/route.ts';
import { useRoutines } from '../state/routines.ts';
import { useSettings } from '../state/settings.ts';
import { DEFAULT_VOICE } from '../voices/selection.ts';
import { usePlaybackVoice } from '../voices/use-playback-voice.ts';

const DANCE_IDS = Object.keys(DANCE_PROFILES);
const TEMPLATES = DANCE_PROFILES as Record<string, { templates: readonly string[] }>;

// S4 ルーティン編集（仕様 §4・Ruling 36〜39）。新規はまず種目を選ぶ（Ruling 37）。
// 変更は確定のたびに自動保存（保存ボタンなし）。最初の保存で ID を発行し、ハッシュを編集の形に置き換える。
export function RoutineEditScreen({ routineId }: { routineId?: string }) {
  const { translator } = useI18n();
  const { routines, save } = useRoutines();
  const { settings, update } = useSettings();
  const locale = translator.locale;
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const editor = useRef<RoutineEditor | null>(null);
  const saved = useRef(false);   // 端末に1回でも保存したか（新規は最初の確定まで false）
  const [saveFailed, setSaveFailed] = useState(false);
  const [backupTip, setBackupTip] = useState(false);   // 最初の保存の後に 1 回だけの「配るで自分にも送れる」（Ruling 86-3）
  const [choosingDance, setChoosingDance] = useState(false);   // フィガー0件の時の「変える」
  // 画面のキーボードが開いている間は下の帯（「▶ 全体を試聴」）を出さない（D19・F6 round 4。iOS 26 は帯をキーボードの上へ
  // 持ち上げ、打っている欄のすぐ下を覆う）。フォーカスや指の動きでは決めず、見えている高さで決める（lib/keyboard.ts）。
  // 閉じれば visualViewport の resize で戻る（押したボタンの click の後なので、指の下に帯は現れない）。隠し方は base.css の [data-keyboard]。
  // 鳴らしている間は隠さない（帯の「■ 止める」を残す。最終レビュー2 M4・hidesDock）。
  const [keyboardOpen, setKeyboardOpen] = useState(() => isKeyboardOpen(viewportHeights()));
  useEffect(() => {
    const check = () => setKeyboardOpen(isKeyboardOpen(viewportHeights()));
    check();
    return onVisibleViewportChange(check);
  }, []);
  const mounted = useRef(true);   // 画面を離れた後（戻る・スワイプ）の保存ではハッシュを置き換えない
  const pendingName = useRef<string | null>(null);   // 名前欄の確定前の文字（離れる時に確定する。blur が来ない端末向け）
  const { session, view } = usePracticeSession('S4');
  const playback = usePlaybackVoice();
  // 試聴の声（S2 と同じ選んだ声。解き終わる前は標準（英語）。Ruling 61-4）
  // 続けて来るクリック（描画の前）でも最新の設定を読む（S2・S5 の latest と同じ）。
  const latestSettings = useRef(settings);
  latestSettings.current = settings;
  const voiceOptions = () => { const voice = playback.voice ?? DEFAULT_VOICE; return { voice, voiceOffsetMs: voiceOffsetFor(latestSettings.current, voice) }; };
  // まだ解けていない録音の声は、解けるのを待ってその声で試聴する（Ruling 61-2）
  const pendingVoice = () => (playback.voice ? undefined : playback.pending(latestSettings.current));

  // 同じ画面のままハッシュだけ替わった（ブラウザの戻る・進む）。自分で置き換えた時（新規 → 編集）は編集を続け、
  // それ以外は、開いている行を原則どおり閉じて保存してから、新しいハッシュのルーティンで開き直す。
  const shownFor = useRef(routineId);
  if (routineId !== shownFor.current) {
    shownFor.current = routineId;
    if (!(routineId && editor.current?.routine.id === routineId)) {
      const renamed = pendingName.current !== null && !!editor.current?.rename(pendingName.current);   // 名前欄の打ちかけも前のルーティンへ
      pendingName.current = null;
      if (editor.current?.close() || renamed) persist({ replace: false });   // 離れる時の保存: 未保存の新規でも確定した行は残す（ハッシュは置き換えない）
      editor.current = null;
      saved.current = false;
    }
  }
  if (routineId && editor.current?.routine.id !== routineId) {
    const routine = routines.find(item => item.id === routineId);
    if (routine) {
      editor.current = new RoutineEditor(routine, () => makeId('f'));
      saved.current = true;
    }
  }

  const defaultName = (danceId: string, others: readonly Routine[]) =>
    uniqueRoutineName(translator.t('defaultRoutineName', { dance: danceName(danceId, locale) }), others.map(item => item.name));

  // （関数宣言: 上のハッシュ切り替えからも呼ぶ）replace:false は画面を離れる時の保存（最初の保存でもハッシュを編集の形に置き換えない）。
  function persist({ replace = true }: { replace?: boolean } = {}) {
    const current = editor.current;
    if (!current) return;
    const routine = { ...current.routine, updatedAt: new Date().toISOString() };
    const first = !saved.current;
    void save(routine).then(ok => {
      setSaveFailed(!ok);
      // 最初の保存が書けた時だけ（失敗の枠が出ている時は出さず、次の機会に回す。枠は 1 つ）。出したら hints に書く（閉じなくても次回は出さない）。
      const hints = latestSettings.current.hints;
      if (ok && first && mounted.current && !hints.backupTipShownForRoutine) {
        setBackupTip(true);
        update({ hints: { ...hints, backupTipShownForRoutine: true } });
      }
    });
    if (!saved.current) {
      saved.current = true;
      if (replace && mounted.current) replaceRoute({ screen: 'S4', params: { routineId: routine.id } });
    }
  }

  // 操作の共通の入口: 試聴を止めて、変えて、変わったら保存して、描き直す。
  const act = (change: (current: RoutineEditor) => boolean) => {
    const current = editor.current;
    if (!current) return;
    session.stop();
    if (change(current)) persist();
    rerender(0);
  };

  // ドラッグで並べ替え（Ruling 49）。始めたら試聴を止め、開いている行を原則どおり閉じる。落としたら1回の変更。
  const list = useRef<HTMLDivElement>(null);
  const focusGrip = (index: number) => setTimeout(() => list.current?.querySelectorAll<HTMLElement>('.dc-grip')[index]?.focus({ preventScroll: true }), 0);
  const drag = useReorderDrag({
    list,
    count: editor.current?.routine.figures.length ?? 0,
    onStart: () => act(current => current.close()),
    onDrop: (from, to) => { act(current => current.move(from, to)); focusGrip(to); },
    onTap: index => act(current => (current.open?.kind === 'edit' && current.open.index === index ? current.close() : current.openRow(index))),
    onStep: (index, delta) => {
      const to = index + delta;
      if (to < 0 || to >= (editor.current?.routine.figures.length ?? 0)) return;
      act(current => current.move(index, to));
      focusGrip(to);
    }
  });

  // 戻る（端末の戻る・タブ移動も）: 名前欄の打ちかけと開いている行は原則どおり確定して保存する（Ruling 36-1）。
  // 先に mounted を下ろす: この後に来る名前欄の blur（Chrome は外す時に出す）でも、ハッシュを編集の形に置き換えない。
  useEffect(() => () => {
    mounted.current = false;
    const current = editor.current;
    if (!current) return;
    const renamed = pendingName.current !== null && current.rename(pendingName.current);
    pendingName.current = null;
    const closed = current.close();
    if (renamed || closed) persist({ replace: false });
  }, []);

  // 種目を選ぶ（新規）・選び直す（フィガー0件の「変える」）。選び直しで、名前が前の種目の既定のままなら新しい種目の既定に。
  // 種目を選んだだけでは保存しない（Ruling 37: 最初の確定は名前・フィガー・くわしくの値）。保存済みなら保存し直す。
  const pickDance = (danceId: string) => {
    const existing = editor.current;
    setChoosingDance(false);
    if (!existing) {
      const now = new Date().toISOString();
      editor.current = new RoutineEditor(createRoutine({ id: makeId('r'), danceId, name: defaultName(danceId, routines), now }), () => makeId('f'));
      rerender(0);
      return;
    }
    const others = routines.filter(item => item.id !== existing.routine.id);
    const keepName = existing.routine.name !== defaultName(existing.routine.danceId, others);
    if (existing.changeDance(danceId, keepName ? existing.routine.name : defaultName(danceId, others)) && saved.current) persist();
    rerender(0);
  };

  const current = editor.current;
  if (!current || choosingDance) {
    return (
      <main class="dc-screen dc-screen--focus" data-screen="S4">
        <header class="dc-focus-head"><BackButton screen="S4" /><span class="dc-focus-title">{translator.t(current ? 'editRoutineTitle' : 'newRoutineTitle')}</span></header>
        <h1 class="dc-heading">{translator.t('chooseDance')}</h1>
        <div class="dc-tiles" role="group" aria-label={translator.t('danceGroup')} data-group="dance">
          {DANCE_IDS.map(danceId => (
            <button key={danceId} type="button" class="dc-tile" onClick={() => pickDance(danceId)}>
              <b>{danceName(danceId, locale)}</b>
              <small>{formatCounts(danceId, TEMPLATES[danceId]!.templates[0]!)}</small>
            </button>
          ))}
        </div>
      </main>
    );
  }

  const routine = current.routine;
  const profile = getDanceProfile(routine.danceId) as SpeedProfile & { id: string };
  const open = current.open;
  const count = routine.figures.length;
  const playing = view.playing || view.starting;
  const notice: AlertNotice = saveFailed || playback.saveFailed ? 'save-failed' : backupTip ? 'backup-tip' : view.notice;
  const sounding = (index: number) => view.playing && view.figureIndex === index;
  // 小節の注意（D16・Ruling 52）。閉じた行のうち上から最初の1件だけ全文（「必要なら編集してください。」つき）、残りは短い形。
  // 開いている行は見出しに出さない（入力欄の下に短い形。FigureForm）。「最初」は閉じた行の中で数えるので、全文は常に1つ。
  const openIndex = open?.kind === 'edit' ? open.index : null;
  const offBar = offBarIndexes(routine.danceId, routine.figures).filter(index => index !== openIndex);
  const barBeats = beatsPerBar(routine.danceId);
  const endsMidBar = routineEndsMidBar(routine.danceId, routine.figures);

  // 種目の「変える」: 開いている行を原則どおり閉じて（有効なら確定して保存）から。確定でフィガーができたら種目は変えられないので、選び直しは出さない（Ruling 36-1・段3 Task 7 の裁定）。
  const changeDance = () => {
    act(current => current.close());
    if ((editor.current?.routine.figures.length ?? 0) === 0) setChoosingDance(true);
  };

  // 開いた行の主ボタン（Ruling 50-7）: 働きは editor の check().action が決める（画面に判定を書かない）。
  const primaryAction = () => act(editor => {
    const { action } = editor.check();
    if (action === 'addCopy') return editor.addCopy();
    if (action === 'matchCounts') return editor.matchCounts();
    return editor.decide();
  });

  const previewOpen = () => {
    const preview = current.previewOpen();
    if (!preview) return;
    if (playing) { session.stop(); return; }
    void session.play({
      kind: 'routine', danceId: routine.danceId, figures: preview.figures, range: { startIndex: preview.index, endIndex: preview.index },
      bpm: routineBaseBpm(profile, routine), metronome: settings.metronome, countInBars: 0, loop: false, track: null, ...voiceOptions()
    }, pendingVoice());
  };

  const previewAll = () => {
    if (playing) { session.stop(); return; }
    if (current.close()) persist();
    rerender(0);
    void session.play({
      kind: 'routine', danceId: routine.danceId, figures: current.routine.figures,
      bpm: routineBaseBpm(profile, routine), metronome: settings.metronome, countInBars: routine.countInBars, loop: false, track: null, ...voiceOptions()
    }, pendingVoice());
  };

  return (
    <main class="dc-screen dc-screen--focus dc-screen--dock" data-screen="S4" data-playing={playing ? 'true' : 'false'}
      data-keyboard={hidesDock(keyboardOpen, playing) ? 'true' : undefined}>
      <header class="dc-focus-head"><BackButton screen="S4" /><span class="dc-focus-title">{translator.t('editRoutineTitle')}</span></header>
      <NoticeBox notice={notice} onClose={() => (notice === 'backup-tip' ? setBackupTip(false) : session.dismissNotice())} />
      <RoutineNameField name={routine.name} onText={text => { pendingName.current = text; }}
        onCommit={name => { pendingName.current = null; act(editor => editor.rename(name)); }} />
      <div class="dc-dance-line">
        <span>{translator.t('danceLine', { dance: danceName(routine.danceId, locale) })}</span>
        {count === 0 && <button type="button" class="dc-button dc-button--secondary" onClick={changeDance}>{translator.t('changeDance')}</button>}
      </div>
      {count > 0 && (
        <div class="dc-history" data-group="history">
          <button type="button" class="dc-button dc-button--secondary" disabled={!current.canUndo} onClick={() => act(editor => editor.undo())}>
            <Icon name="undo" /><span>{translator.t('undo')}</span>
          </button>
          <button type="button" class="dc-button dc-button--secondary" disabled={!current.canRedo} onClick={() => act(editor => editor.redo())}>
            <Icon name="redo" /><span>{translator.t('redo')}</span>
          </button>
        </div>
      )}
      {count === 0 && open?.kind !== 'add' && <p class="dc-empty" data-body>{translator.t('noFigures')}</p>}
      {(count > 0 || open?.kind === 'add') && (
        <div ref={list} class="dc-list dc-figures" role="list" data-list data-dragging={drag.view ? '' : undefined}>
          {routine.figures.map((figure, index) => {
            const isOpen = open?.kind === 'edit' && open.index === index;
            return (
              <div key={figure.id} role="listitem" data-index={index} data-row data-open={isOpen ? '' : undefined}
                class={`dc-row${sounding(index) ? ' dc-row--now' : ''}${drag.view?.from === index ? ' dc-row--dragging' : ''}`}>
                <div class="dc-row-line">
                  <button type="button" class="dc-row-head dc-figure-head" aria-expanded={isOpen ? 'true' : 'false'}
                    onClick={() => act(editor => (isOpen ? editor.close() : editor.openRow(index)))}>
                    <span class="dc-figure-no">{index + 1}</span>
                    <span class="dc-row-text">
                      <b>{figureDisplayName(routine.danceId, figure.name, locale)}</b>
                      <small>{formatCounts(routine.danceId, figure.counts)}</small>
                    </span>
                    <Icon name="chevron" class="dc-row-chev" />
                    {!isOpen && offBar.includes(index) && (
                      <small class="dc-row-note">
                        <Icon name="alert" />
                        <span>{translator.t(offBar[0] === index ? 'offBarFigureEdit' : 'offBarFigure', { beats: barBeats })}</span>
                      </small>
                    )}
                  </button>
                  {count > 1 && (
                    <button type="button" class="dc-grip" aria-keyshortcuts="ArrowUp ArrowDown"
                      aria-label={translator.t('moveFigureLabel', { name: figureDisplayName(routine.danceId, figure.name, locale) })}
                      {...drag.gripProps(index)}>
                      <Icon name="grip" />
                    </button>
                  )}
                </div>
                {isOpen && open.kind === 'edit' && (
                  <div class="dc-row-body" data-row-body>
                    <FigureForm idPrefix={`dc-f${index}`} kind="edit" danceId={routine.danceId} draft={open.draft} check={current.check()}
                      onDraft={patch => { current.setDraft(patch); rerender(0); }} onPrimary={primaryAction} />
                    <div class="dc-figure-actions" data-group="figure-actions">
                      <button type="button" class="dc-button dc-button--secondary dc-span3" disabled={!current.previewOpen()} onClick={previewOpen}>
                        <Icon name={playing ? 'stop' : 'play'} /><span>{playing ? translator.t('stop') : translator.t('previewFigure')}</span>
                      </button>
                      <button type="button" class="dc-button dc-button--secondary" disabled={index === 0} onClick={() => act(editor => editor.moveOpen(-1))}>
                        <Icon name="up" /><span>{translator.t('moveUp')}</span>
                      </button>
                      <button type="button" class="dc-button dc-button--secondary" disabled={index === count - 1} onClick={() => act(editor => editor.moveOpen(1))}>
                        <Icon name="down" /><span>{translator.t('moveDown')}</span>
                      </button>
                      <button type="button" class="dc-button dc-button--secondary" disabled={!current.canAdd} onClick={() => act(editor => editor.duplicateOpen())}>
                        <Icon name="copy" /><span>{translator.t('duplicate')}</span>
                      </button>
                      <button type="button" class="dc-button dc-button--secondary dc-span3" onClick={() => act(editor => editor.removeOpen())}>
                        <Icon name="trash" /><span>{translator.t('delete')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {drag.view?.lineTop != null && <div class="dc-drop-line" style={{ top: `${drag.view.lineTop - 1.5}px` }} aria-hidden="true" />}
          {open?.kind === 'add' && (
            <div role="listitem" class={`dc-row${sounding(count) ? ' dc-row--now' : ''}`} data-row data-open="">
              <div class="dc-row-head dc-figure-head">
                <span class="dc-figure-no">{count + 1}</span>
                <span class="dc-row-text"><b>{translator.t('newFigure')}</b></span>
              </div>
              <div class="dc-row-body" data-row-body>
                <FigureForm idPrefix="dc-fnew" kind="add" danceId={routine.danceId} draft={open.draft} check={current.check()}
                  onDraft={patch => { current.setDraft(patch); rerender(0); }} onPrimary={primaryAction} />
              </div>
            </div>
          )}
        </div>
      )}
      {endsMidBar && <div class="dc-bar-note">{translator.t('routineEndsMidBar')}</div>}
      {count > 0 && open?.kind !== 'add' && (
        <button type="button" class="dc-button dc-button--secondary dc-wide dc-add-tail" disabled={!current.canAdd} onClick={() => act(editor => editor.openAdd())}>
          <Icon name="plus" /><span>{translator.t('addFigure')}</span>
        </button>
      )}
      <MoreOptions label={translator.t('moreOptions')} open={current.moreOpen} onToggle={next => { if (next !== current.moreOpen) act(editor => editor.setMoreOpen(next)); }}>
        <div>
          <div class="dc-field-label" id="dc-s4-leadin-label">{translator.t('leadInLength')}</div>
          <div class="dc-chips" role="radiogroup" aria-labelledby="dc-s4-leadin-label" data-group="lead-in-bars">
            {([1, 2] as const).map(bars => (
              <button key={bars} type="button" class="dc-chip" role="radio" aria-checked={routine.countInBars === bars ? 'true' : 'false'}
                onClick={() => act(editor => editor.setLeadInBars(bars))}>
                {translator.t(bars === 1 ? 'oneBar' : 'twoBars')}
              </button>
            ))}
          </div>
        </div>
        <RoutineSpeedField profile={profile} bpm={routine.bpm} onChange={bpm => act(editor => editor.setBpm(bpm))} />
        <VoiceOffsetRow idPrefix="dc-s4" offsetMs={playback.offsetMs} onStep={direction => {
          session.stop();   // 試聴中なら止める（ほかの操作と同じ。Ruling 36）
          const result = playback.step(latestSettings.current, direction);
          if (result && Object.keys(result.patch).length > 0) {
            latestSettings.current = { ...latestSettings.current, ...result.patch };
            update(result.patch);
          }
        }} />
      </MoreOptions>
      {!(count === 0 && open?.kind === 'add') && (
        <div class="dc-dock">
          {count === 0
            ? <button type="button" class="dc-button dc-primary dc-dock-button" onClick={() => act(editor => editor.openAdd())}>
                <Icon name="plus" /><span>{translator.t('addFigure')}</span>
              </button>
            : <button type="button" class="dc-button dc-primary dc-dock-button" onClick={previewAll}>
                <Icon name={playing ? 'stop' : 'play'} /><span>{playing ? translator.t('stop') : translator.t('previewAll')}</span>
              </button>}
        </div>
      )}
    </main>
  );
}

// 名前（常に表示の入力欄）。確定は blur か Enter。空なら直前の名前に戻す（Ruling 36-6）。
function RoutineNameField({ name, onText, onCommit }: { name: string; onText(text: string): void; onCommit(name: string): void }) {
  const { translator } = useI18n();
  const [text, setText] = useState(name);
  const shownName = useRef(name);   // 名前が外から変わった時だけ欄を合わせる（出した直後の effect で打ち始めた文字を消さない）
  useEffect(() => { if (name !== shownName.current) { shownName.current = name; setText(name); } }, [name]);
  const commit = () => { if (text.trim() === '') setText(name); else onCommit(text); };
  return (
    <div class="dc-field">
      <div class="dc-field-label" id="dc-s4-name-label">{translator.t('routineName')}</div>
      <input class="dc-input" type="text" aria-labelledby="dc-s4-name-label" value={text} maxLength={ROUTINE_NAME_MAX} autocomplete="off"
        onInput={event => { const value = (event.currentTarget as HTMLInputElement).value; setText(value); onText(value); }} onBlur={commit}
        onKeyDown={event => { if (event.key === 'Enter') (event.currentTarget as HTMLInputElement).blur(); }} />
    </div>
  );
}

// 速さ指定（くわしく）: 「種目の標準」とスライダーで1グループ。標準と同じ値は空（種目の標準）として持つ。
function RoutineSpeedField({ profile, bpm, onChange }: { profile: SpeedProfile; bpm: number | null; onChange(bpm: number | null): void }) {
  const { translator } = useI18n();
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? bpm ?? profile.practiceBpm;
  const commit = (value: unknown) => {
    const next = clampBpm(value);
    if (next !== null) onChange(next === profile.practiceBpm ? null : next);
  };
  return (
    <div class="dc-fine" data-group="routine-speed">
      <div class="dc-field-label" id="dc-s4-speed-label">
        <span>{translator.t('routineSpeed')}</span>
        <span>{translator.t('tempoMark', { tempo: shown })}</span>
      </div>
      <input aria-labelledby="dc-s4-speed-label" type="range" min={BPM_MIN} max={BPM_MAX} step={1} value={shown}
        onInput={event => setDrag(Number((event.currentTarget as HTMLInputElement).value))}
        onChange={event => { setDrag(null); commit((event.currentTarget as HTMLInputElement).value); }} />
      <button type="button" class="dc-chip" aria-pressed={bpm === null ? 'true' : 'false'} onClick={() => onChange(null)}>
        {translator.t('danceStandardSpeed', { tempo: profile.practiceBpm })}
      </button>
    </div>
  );
}
