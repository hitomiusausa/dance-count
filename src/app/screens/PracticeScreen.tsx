import { useEffect, useRef, useState } from 'preact/hooks';
import { closeTarget } from '../practice/notice-close';
import { getDanceProfile } from '../../engine/dance-profiles.js';
import { BackButton } from '../components/BackButton.tsx';
import { danceName } from '../i18n/index.ts';
import { displayForVoiceKey, formatCounts } from '../lib/count-display.ts';
import { idleProgram, leadStripView, stripCells, stripView } from '../practice/beat-indicator.ts';
import { CountBox, FORCED_NOTICE, type AlertNotice, FineSpeed, MoreOptions, NoticeBox, PlayDock, PracticeToggles, PlaySwitches, SpeedChoices, VoiceChip, VoiceOffsetRow } from '../practice/controls.tsx';
import { chooseCustomBpm, choosePreset, chooseTemplate, practiceChoice, practiceCounts, practiceLeadInBars, type DanceProfileLike } from '../practice/preferences.ts';
import type { PracticeOptions } from '../practice/session.ts';
import { speedPresetBpms } from '../practice/speed.ts';
import { barCountingAvailable } from '../practice/bar-count.ts';
import { tempoText } from '../practice/tempo.ts';
import { usePracticeSession } from '../practice/use-session.ts';
import { voiceOffsetFor } from '../practice/voice-offset.ts';
import type { UiState } from '../router/routes.ts';
import { figureDisplayName } from '../routines/figure-names.ts';
import { reviewedFigureBySlug } from '../routines/reviewed-counts.ts';
import type { AppSettings } from '../settings/settings.ts';
import { takeAutoplay } from '../state/autoplay.ts';
import { useI18n } from '../state/i18n.ts';
import { useSettings } from '../state/settings.ts';
import { DEFAULT_VOICE, voiceDisplayName, type VoiceSelection } from '../voices/selection.ts';
import { usePlaybackVoice } from '../voices/use-playback-voice.ts';

// S2 再生（仕様 §4・Ruling 13・18・19・21・23・28〜32・42）。部品は practice/controls.tsx（S5 と共通）。
// D57（Ruling 120）: figureSlug があれば監修済みのフィガーのカウントを鳴らす（S2 の counts は practiceCounts の 1 本だけ。エンジン・セッションは同じ経路）。
// その時は見出しの下に「ウィスク · 1 2 3」、くわしくの「カウントの型」は出さない（型はフィガーが決めている）。速さ・メトロノーム・合図・繰り返しは種目ごとの記憶のまま
export function PracticeScreen({ danceId, figureSlug, uiState }: { danceId: string; figureSlug?: string; uiState?: UiState }) {
  const { translator } = useI18n();
  const { settings, update } = useSettings();
  const profile = getDanceProfile(danceId) as DanceProfileLike;
  const choice = practiceChoice(profile, settings);
  const figure = reviewedFigureBySlug(danceId, figureSlug);   // resolve.ts が表に無い slug を基本へ置き換えるので、figureSlug があれば必ずある
  const counts = practiceCounts(profile, settings, figure);
  const { session, view } = usePracticeSession(danceId);
  const playback = usePlaybackVoice();
  // クリック処理は描画を待たずに続けて来ることがある（連打）。常に最新の設定・再生状態・声を読む（Ruling 42）。
  const latest = useRef({ settings, view, voice: playback.voice });
  latest.current = { settings, view, voice: playback.voice };
  const autoplayChecked = useRef(false);
  const [forcedDismissed, setForcedDismissed] = useState(false);
  const [dragBpm, setDragBpm] = useState<number | null>(null);

  // voice は解けた声。まだ解けていない時は標準（英語）を置き、start が pending の解決を待って差し替える（Ruling 61-2）。
  const optionsFrom = (next: AppSettings, voice: VoiceSelection = latest.current.voice ?? DEFAULT_VOICE): PracticeOptions => {
    const nextChoice = practiceChoice(profile, next);
    return {
      kind: 'counts', danceId, counts: practiceCounts(profile, next, figure), bpm: nextChoice.bpm, metronome: next.metronome, countInBars: practiceLeadInBars(next), loop: next.loop, barCounting: next.barCounting && barCountingAvailable(danceId), track: null,
      voice, voiceOffsetMs: voiceOffsetFor(next, voice)
    };
  };

  // 開いた時点で「前回」を書く（Ruling 26）。フィガーも同じ 1 回で（D57・Ruling 121-1。基本なら null）
  useEffect(() => { update({ lastDanceId: danceId, lastFigure: figure?.slug ?? null, lastKind: 'dance' }); }, [session]);
  // 前回カードの印があれば、声が決まった時点ですぐ鳴らす（Ruling 32・61-6）。止めるのは usePracticeSession。
  useEffect(() => {
    if (autoplayChecked.current || !playback.voice) return;
    autoplayChecked.current = true;
    if (takeAutoplay({ kind: 'dance', id: danceId })) {
      try { void session.play(optionsFrom(latest.current.settings, playback.voice)); } catch { /* 入力は practiceChoice 済み。万一でも画面は止まったまま */ }
    }
  }, [session, playback.voice]);

  const isPlaying = () => latest.current.view.playing || latest.current.view.starting;
  // ▶・再開はすべてここから（選んだ録音の声がまだ読み終わっていなければ、それを待ってその声で鳴らす）。
  const start = (next: AppSettings) => session.play(optionsFrom(next), latest.current.voice ? undefined : playback.pending(next));

  // 設定を変える。再生中なら止めて適用して再開（このクリックの中で行うので音の解除も保たれる）。
  const change = (patch: Partial<AppSettings>) => {
    if (Object.keys(patch).length === 0) return;
    const next = { ...latest.current.settings, ...patch };
    latest.current.settings = next;
    update(patch);
    if (isPlaying()) void start(next);
  };

  // 声のタイミング（Ruling 62）。標準の声は設定、録音の声は声そのものに書く。再生中なら止めて適用して再開。
  const stepVoiceOffset = (direction: -1 | 1) => {
    const result = playback.step(latest.current.settings, direction);
    if (!result) return;
    latest.current.voice = result.voice;
    if (Object.keys(result.patch).length > 0) change(result.patch);
    else if (isPlaying()) void start(latest.current.settings);
  };

  const togglePlay = () => {
    setForcedDismissed(true);
    if (isPlaying()) session.stop();
    else void start(latest.current.settings);
  };

  const current = () => latest.current.settings;
  const forced = uiState ? FORCED_NOTICE[uiState] : undefined;
  const notice: AlertNotice = forced && !forcedDismissed ? forced : playback.saveFailed ? 'save-failed' : view.notice;
  // D55: 帯は鳴っている型（セッションの program）。止まっている間は今の型を表示のためだけに語にする。はじめの合図の間は点けない
  // 夜間便 B-5: はじめの合図の間は丸を灰で 1 語ずつ（leadStripView）。数字は出さない
  const cells = stripCells(view.program ?? idleProgram(danceId, counts));
  const strip = view.playing && view.countIn ? leadStripView(cells, view.leadTick) : stripView(cells, view.playing && !view.countIn ? view.originalTick : null);
  const nowText = view.playing && !view.countIn ? displayForVoiceKey(view.voiceKey) : '';
  // 止まっている間は「最初に鳴るカウント」を灰色で出す（空白にしない。琥珀は鳴っている時だけ）。
  const idleText = view.playing ? '' : formatCounts(danceId, counts).split(' ')[0] ?? '';
  const playing = view.playing || view.starting;

  return (
    <main class="dc-screen dc-screen--focus dc-screen--dock dc-practice" data-screen="S2" data-playing={playing ? 'true' : 'false'}>
      <BackButton screen="S2" />
      <div class="dc-practice-grid">
        <div>
          <header class="dc-playhead">
            <h1>{danceName(danceId, translator.locale)}</h1>
            <small>{figure ? `${figureDisplayName(danceId, figure.englishName, translator.locale)} · ${formatCounts(danceId, counts)}` : formatCounts(danceId, counts)}</small>
          </header>
          <NoticeBox notice={notice} onClose={() => { setForcedDismissed(true); if (closeTarget(notice) === 'save-failed') playback.dismissSaveFailed(); else session.dismissNotice(); }} />
          <CountBox playing={view.playing} countIn={view.countIn} nowText={nowText} idleText={idleText} strip={strip} preparing={view.starting} bar={view.bar} />
        </div>
        <div>
          <SpeedChoices danceId={danceId} presets={speedPresetBpms(profile)} selected={choice.speed} onChoose={preset => change(choosePreset(current(), danceId, preset))} />
          <PracticeToggles metronome={settings.metronome} leadIn={settings.countInBars === 1}
            onMetronome={() => change({ metronome: !current().metronome })}
            onLeadIn={() => change({ countInBars: current().countInBars === 1 ? 0 : 1 })} />
          <VoiceChip name={voiceDisplayName(translator, playback.voice ?? DEFAULT_VOICE, 'chip')} />
          <MoreOptions label={choice.customBpm !== null ? translator.t('moreOptionsWithTempo', { tempo: choice.customBpm, mpm: tempoText(danceId, choice.customBpm) }) : translator.t('moreOptions')}>
            {!figure && profile.templates.length > 1 && (
              <div>
                <div class="dc-field-label"><span>{translator.t('countPattern')}</span></div>
                <div class="dc-chips" role="radiogroup" aria-label={translator.t('countPattern')} data-group="pattern">
                  {profile.templates.map(counts => (
                    <button key={counts} type="button" class="dc-chip" role="radio" aria-checked={choice.counts === counts ? 'true' : 'false'}
                      onClick={() => { if (practiceChoice(profile, current()).counts !== counts) change(chooseTemplate(current(), profile, counts)); }}>
                      {formatCounts(danceId, counts)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <FineSpeed danceId={danceId} idPrefix="dc-s2" bpm={choice.bpm} dragBpm={dragBpm} competition={profile.competitionBpm} onDrag={setDragBpm}
              onCommit={value => change(chooseCustomBpm(current(), profile, value))} />
            <PlaySwitches idPrefix="dc-s2" loop={settings.loop} onLoop={() => change({ loop: !current().loop })}
              barCounting={barCountingAvailable(danceId) ? settings.barCounting : null} onBarCounting={() => change({ barCounting: !current().barCounting })} />
            <VoiceOffsetRow idPrefix="dc-s2" offsetMs={playback.offsetMs} onStep={stepVoiceOffset} />
          </MoreOptions>
        </div>
      </div>
      <PlayDock playing={playing} onToggle={togglePlay} />
    </main>
  );
}
