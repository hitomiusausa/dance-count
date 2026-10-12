import { useEffect, useRef, useState } from 'preact/hooks';
import { closeTarget } from '../practice/notice-close';
import { getDanceProfile } from '../../engine/dance-profiles.js';
import { figureDisplayName } from '../../engine/figure-terminology.js';
import { BackButton } from '../components/BackButton.tsx';
import { Icon } from '../components/Icon.tsx';
import { danceName } from '../i18n/index.ts';
import { displayForVoiceKey, formatCounts } from '../lib/count-display.ts';
import { honorific } from '../lib/honorific.ts';
import { idleProgram, stripCells, stripView } from '../practice/beat-indicator.ts';
import { CountBox, FORCED_NOTICE, type AlertNotice, FineSpeed, MoreOptions, NoticeBox, PlayDock, PracticeToggles, RepeatRow, SpeedChoices, VoiceChip, VoiceOffsetRow } from '../practice/controls.tsx';
import { chooseRoutineCustomBpm, chooseRoutinePreset, routineLeadInBars, routinePracticeChoice } from '../practice/routine-preferences.ts';
import type { PracticeOptions } from '../practice/session.ts';
import type { SpeedProfile } from '../practice/speed.ts';
import { usePracticeSession } from '../practice/use-session.ts';
import { voiceOffsetFor } from '../practice/voice-offset.ts';
import type { UiState } from '../router/routes.ts';
import type { Routine } from '../routines/routine.ts';
import type { AppSettings } from '../settings/settings.ts';
import { takeAutoplay } from '../state/autoplay.ts';
import { viewportHeight } from '../platform/viewport.ts';
import { useI18n } from '../state/i18n.ts';
import { useRoutines } from '../state/routines.ts';
import { useSettings } from '../state/settings.ts';
import { DEFAULT_VOICE, voiceDisplayName, type VoiceSelection } from '../voices/selection.ts';
import { usePlaybackVoice } from '../voices/use-playback-voice.ts';

type Profile = SpeedProfile;
interface Range { startIndex: number; endIndex: number }

// S5 ルーティン再生（仕様 §4・Ruling 40・42・46〜48・D10）。S2 と同じ骨格（主要操作も同じ5つ）を practice/controls.tsx で組む。
// 速さの記憶はルーティンごと、トグルと繰り返しは S2 と共通の設定。範囲は記憶しない（開くたびに全体）。
// 鳴っているフィガーは onFrame の event.figureIndex だけから（第2の時間計算をしない）。
export function RoutinePlayScreen({ routineId, uiState }: { routineId: string; uiState?: UiState }) {
  const { routines } = useRoutines();
  const routine = routines.find(item => item.id === routineId);
  // router/resolve.ts が「ある・鳴らせる」を確かめてから来る。消えた直後の1回の描画だけ何も出さない。
  return routine ? <RoutinePlayer routine={routine} uiState={uiState} /> : null;
}

function RoutinePlayer({ routine, uiState }: { routine: Routine; uiState?: UiState }) {
  const { translator } = useI18n();
  const { settings, update } = useSettings();
  const locale = translator.locale;
  const profile = getDanceProfile(routine.danceId) as Profile;
  const choice = routinePracticeChoice(profile, routine, settings);
  const { session, view } = usePracticeSession(routine.id);
  const last = routine.figures.length - 1;
  const [range, setRange] = useState<Range>({ startIndex: 0, endIndex: last });
  const playback = usePlaybackVoice();
  const latest = useRef({ settings, view, range, voice: playback.voice });
  latest.current = { settings, view, range, voice: playback.voice };
  const autoplayChecked = useRef(false);
  const [forcedDismissed, setForcedDismissed] = useState(false);
  const [dragBpm, setDragBpm] = useState<number | null>(null);
  const list = useRef<HTMLDivElement>(null);

  const optionsFrom = (next: AppSettings, nextRange: Range, voice: VoiceSelection = latest.current.voice ?? DEFAULT_VOICE): PracticeOptions => {
    const nextChoice = routinePracticeChoice(profile, routine, next);
    const whole = nextRange.startIndex === 0 && nextRange.endIndex === last;
    return {
      kind: 'routine', danceId: routine.danceId, figures: routine.figures, ...(whole ? {} : { range: nextRange }),
      bpm: nextChoice.bpm, metronome: next.metronome, countInBars: routineLeadInBars(next, routine), loop: next.loop, track: null,
      voice, voiceOffsetMs: voiceOffsetFor(next, voice)
    };
  };

  // S3 の ▶ から来た時だけ、声が決まった時点ですぐ鳴らす（一回限りの印。Ruling 32・40・61-6）。止めるのは usePracticeSession。
  useEffect(() => {
    if (autoplayChecked.current || !playback.voice) return;
    autoplayChecked.current = true;
    if (takeAutoplay({ kind: 'routine', id: routine.id })) {
      try { void session.play(optionsFrom(latest.current.settings, latest.current.range, playback.voice)); } catch { /* resolve 済みのルーティン。万一でも止まったまま */ }
    }
  }, [session, playback.voice]);

  // 鳴っている行を一覧の中で見える位置へ。一覧が画面に少しでも見えている時だけ（見ていない時に画面を動かさない。Ruling 46）。
  useEffect(() => {
    const element = list.current;
    if (!element || view.figureIndex === null) return;
    const box = element.getBoundingClientRect();
    const dock = element.ownerDocument.querySelector('.dc-dock');
    const visibleBottom = dock ? dock.getBoundingClientRect().top : viewportHeight();
    if (box.bottom <= 0 || box.top >= visibleBottom) return;
    element.children[view.figureIndex]?.scrollIntoView({ block: 'nearest' });
  }, [view.figureIndex]);

  const isPlaying = () => latest.current.view.playing || latest.current.view.starting;
  const current = () => latest.current.settings;

  // ▶・再開はすべてここから（選んだ録音の声がまだ読み終わっていなければ、それを待ってその声で鳴らす。Ruling 61-2）。
  const start = (next: AppSettings, nextRange: Range) => session.play(optionsFrom(next, nextRange), latest.current.voice ? undefined : playback.pending(next));
  const restart = (next: AppSettings, nextRange: Range) => { if (isPlaying()) void start(next, nextRange); };

  const change = (patch: Partial<AppSettings>) => {
    if (Object.keys(patch).length === 0) return;
    const next = { ...latest.current.settings, ...patch };
    latest.current.settings = next;
    update(patch);
    restart(next, latest.current.range);
  };

  const stepVoiceOffset = (direction: -1 | 1) => {
    const result = playback.step(latest.current.settings, direction);
    if (!result) return;
    latest.current.voice = result.voice;
    if (Object.keys(result.patch).length > 0) change(result.patch);
    else restart(latest.current.settings, latest.current.range);
  };

  const changeRange = (next: Range) => {
    latest.current.range = next;
    setRange(next);
    restart(latest.current.settings, next);
  };

  const togglePlay = () => {
    setForcedDismissed(true);
    if (isPlaying()) session.stop();
    else void start(latest.current.settings, latest.current.range);
  };

  const forced = uiState ? FORCED_NOTICE[uiState] : undefined;
  const notice: AlertNotice = forced && !forcedDismissed ? forced : playback.saveFailed ? 'save-failed' : view.notice;

  const nowText = view.playing && !view.countIn ? displayForVoiceKey(view.voiceKey) : '';
  const sounding = view.playing && !view.countIn && view.figureIndex !== null ? view.figureIndex : null;
  const shownIndex = sounding ?? range.startIndex;
  const shownFigure = routine.figures[shownIndex]!;
  const idleText = view.playing ? '' : formatCounts(routine.danceId, routine.figures[range.startIndex]!.counts).split(' ')[0] ?? '';
  // D55: 帯は鳴っているフィガーの型（figureIndex で絞り、ルーティン全体の tick で点ける）。止まっている間・はじめの合図の間は始めのフィガーの型を表示だけ
  const strip = view.program && sounding !== null
    ? stripView(stripCells(view.program, sounding), view.originalTick)
    : stripView(stripCells(idleProgram(routine.danceId, routine.figures[range.startIndex]!.counts)), null);
  const playing = view.playing || view.starting;
  const dance = danceName(routine.danceId, locale);
  const subtitle = routine.receivedFrom
    ? translator.t('madeBy', { dance, name: honorific(routine.receivedFrom.distributor, translator.locale) })
    : translator.t('madeByYou', { dance });
  const figureName = (name: string) => figureDisplayName(routine.danceId, name, locale);

  return (
    <main class="dc-screen dc-screen--focus dc-screen--dock dc-practice dc-routine-play" data-screen="S5" data-playing={playing ? 'true' : 'false'}>
      <BackButton screen="S5" />
      <div class="dc-practice-grid">
        <div class="dc-area-main">
          <header class="dc-playhead">
            <h1 data-ellipsis title={routine.name} aria-label={routine.name}>{routine.name}</h1>
            <small data-ellipsis>{subtitle}</small>
          </header>
          <NoticeBox notice={notice} onClose={() => { setForcedDismissed(true); if (closeTarget(notice) === 'save-failed') playback.dismissSaveFailed(); else session.dismissNotice(); }} />
          <CountBox playing={view.playing} countIn={view.countIn} nowText={nowText} idleText={idleText} strip={strip}>
            <div class={`dc-figure-now${sounding !== null ? ' dc-figure-now--on' : ''}`} data-figure-now data-ellipsis>
              <span class="dc-figure-now-pos">{shownIndex + 1} / {routine.figures.length}</span> {figureName(shownFigure.name)}
            </div>
          </CountBox>
        </div>
        <div class="dc-area-controls">
          <SpeedChoices presets={choice.presets} selected={choice.speed} onChoose={preset => change(chooseRoutinePreset(current(), routine.id, preset))} />
          <PracticeToggles metronome={settings.metronome} leadIn={settings.countInBars === 1}
            onMetronome={() => change({ metronome: !current().metronome })}
            onLeadIn={() => change({ countInBars: current().countInBars === 1 ? 0 : 1 })} />
          <VoiceChip name={voiceDisplayName(translator, playback.voice ?? DEFAULT_VOICE, 'chip')} />
          <MoreOptions label={choice.customBpm !== null ? translator.t('moreOptionsWithTempo', { tempo: choice.customBpm }) : translator.t('moreOptions')}>
            <div>
              <div class="dc-field-label">{translator.t('practiceRange')}</div>
              <div class="dc-range" data-group="range">
                <RangeStep label={translator.t('rangeStart')} index={range.startIndex} name={figureName(routine.figures[range.startIndex]!.name)}
                  canPrev={range.startIndex > 0} canNext={range.startIndex < last}
                  onStep={delta => { const now = latest.current.range; const start = now.startIndex + delta; changeRange({ startIndex: start, endIndex: Math.max(now.endIndex, start) }); }} />
                <RangeStep label={translator.t('rangeEnd')} index={range.endIndex} name={figureName(routine.figures[range.endIndex]!.name)}
                  canPrev={range.endIndex > 0} canNext={range.endIndex < last}
                  onStep={delta => { const now = latest.current.range; const end = now.endIndex + delta; changeRange({ startIndex: Math.min(now.startIndex, end), endIndex: end }); }} />
              </div>
            </div>
            <FineSpeed idPrefix="dc-s5" bpm={choice.bpm} dragBpm={dragBpm} competition={profile.competitionBpm} onDrag={setDragBpm}
              onCommit={value => change(chooseRoutineCustomBpm(current(), profile, routine, value))} />
            <RepeatRow loop={settings.loop} onToggle={() => change({ loop: !current().loop })} />
            <VoiceOffsetRow idPrefix="dc-s5" offsetMs={playback.offsetMs} onStep={stepVoiceOffset} />
          </MoreOptions>
        </div>
        <div class="dc-area-list">
          <h2 class="dc-list-heading">{translator.t('figuresHeading')}</h2>
          <div ref={list} class="dc-list dc-play-list" role="list" data-list>
            {routine.figures.map((figure, index) => {
              const outside = index < range.startIndex || index > range.endIndex;
              return (
                <div key={figure.id} role="listitem" class={`dc-play-row${sounding === index ? ' dc-row--now' : ''}${outside ? ' dc-play-row--out' : ''}`}>
                  <span class="dc-figure-no">{index + 1}</span>
                  <span class="dc-play-name">{figureName(figure.name)}</span>
                  <small>{formatCounts(routine.danceId, figure.counts)}</small>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <PlayDock playing={playing} onToggle={togglePlay} />
    </main>
  );
}

// 範囲の段送り（Ruling 40）。アイコン単独は禁止なので「‹ 前」「次 ›」と文字を添える（仕様 §5）。
function RangeStep({ label, index, name, canPrev, canNext, onStep }: {
  label: string; index: number; name: string; canPrev: boolean; canNext: boolean; onStep(delta: -1 | 1): void;
}) {
  const { translator } = useI18n();
  return (
    <div class="dc-range-step">
      <span class="dc-range-label">{label}</span>
      <span class="dc-range-value">{index + 1} {name}</span>
      <button type="button" class="dc-button dc-button--secondary dc-step" disabled={!canPrev} onClick={() => onStep(-1)}>
        <Icon name="chev-l" /><span>{translator.t('previous')}</span>
      </button>
      <button type="button" class="dc-button dc-button--secondary dc-step" disabled={!canNext} onClick={() => onStep(1)}>
        <span>{translator.t('next')}</span><Icon name="chev-r" />
      </button>
    </div>
  );
}
