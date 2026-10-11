import { useEffect, useRef, useState } from 'preact/hooks';
import { getDanceProfile } from '../../engine/dance-profiles.js';
import { BackButton } from '../components/BackButton.tsx';
import { danceName } from '../i18n/index.ts';
import { displayForVoiceKey, formatCounts } from '../lib/count-display.ts';
import { beatIndexInBar } from '../practice/beat-indicator.ts';
import { CountBox, FORCED_NOTICE, FineSpeed, MoreOptions, NoticeBox, PlayDock, PracticeToggles, RepeatRow, SpeedChoices, VoiceChip } from '../practice/controls.tsx';
import { chooseCustomBpm, choosePreset, chooseTemplate, practiceChoice, type DanceProfileLike } from '../practice/preferences.ts';
import type { PracticeOptions, SessionNotice } from '../practice/session.ts';
import { speedPresetBpms } from '../practice/speed.ts';
import { usePracticeSession } from '../practice/use-session.ts';
import type { UiState } from '../router/routes.ts';
import type { AppSettings } from '../settings/settings.ts';
import { takeAutoplay } from '../state/autoplay.ts';
import { useI18n } from '../state/i18n.ts';
import { useSettings } from '../state/settings.ts';

type Profile = DanceProfileLike & { beatsPerBar: number };

// S2 再生（仕様 §4・Ruling 13・18・19・21・23・28〜32・42）。部品は practice/controls.tsx（S5 と共通）。
export function PracticeScreen({ danceId, uiState }: { danceId: string; uiState?: UiState }) {
  const { translator } = useI18n();
  const { settings, update } = useSettings();
  const profile = getDanceProfile(danceId) as Profile;
  const choice = practiceChoice(profile, settings);
  const { session, view } = usePracticeSession(danceId);
  // クリック処理は描画を待たずに続けて来ることがある（連打）。常に最新の設定と再生状態を読む（Ruling 42）。
  const latest = useRef({ settings, view });
  latest.current = { settings, view };
  const [forcedDismissed, setForcedDismissed] = useState(false);
  const [dragBpm, setDragBpm] = useState<number | null>(null);

  const optionsFrom = (next: AppSettings): PracticeOptions => {
    const nextChoice = practiceChoice(profile, next);
    return { kind: 'counts', danceId, counts: nextChoice.counts, bpm: nextChoice.bpm, metronome: next.metronome, countInBars: next.countInBars, loop: next.loop, track: null };
  };

  // 開いた時点で「前回」を書き（Ruling 26）、前回カードの印があればすぐ鳴らす（Ruling 32）。止めるのは usePracticeSession。
  useEffect(() => {
    update({ lastDanceId: danceId });
    if (takeAutoplay({ kind: 'dance', id: danceId })) {
      try { void session.play(optionsFrom(settings)); } catch { /* 入力は practiceChoice 済み。万一でも画面は止まったまま */ }
    }
  }, [session]);

  const isPlaying = () => latest.current.view.playing || latest.current.view.starting;

  // 設定を変える。再生中なら止めて適用して再開（このクリックの中で行うので音の解除も保たれる）。
  const change = (patch: Partial<AppSettings>) => {
    if (Object.keys(patch).length === 0) return;
    const next = { ...latest.current.settings, ...patch };
    latest.current.settings = next;
    update(patch);
    if (isPlaying()) void session.play(optionsFrom(next));
  };

  const togglePlay = () => {
    setForcedDismissed(true);
    if (isPlaying()) session.stop();
    else void session.play(optionsFrom(latest.current.settings));
  };

  const current = () => latest.current.settings;
  const forced = uiState ? FORCED_NOTICE[uiState] : undefined;
  const notice: SessionNotice = forced && !forcedDismissed ? forced : view.notice;
  const beat = view.playing && !view.countIn ? beatIndexInBar(view.originalTick, profile.beatsPerBar) : null;
  const nowText = view.playing && !view.countIn ? displayForVoiceKey(view.voiceKey) : '';
  // 止まっている間は「最初に鳴るカウント」を灰色で出す（空白にしない。琥珀は鳴っている時だけ）。
  const idleText = view.playing ? '' : formatCounts(danceId, choice.counts).split(' ')[0] ?? '';
  const playing = view.playing || view.starting;

  return (
    <main class="dc-screen dc-screen--focus dc-screen--dock dc-practice" data-screen="S2" data-playing={playing ? 'true' : 'false'}>
      <BackButton screen="S2" />
      <div class="dc-practice-grid">
        <div>
          <header class="dc-playhead">
            <h1>{danceName(danceId, translator.locale)}</h1>
            <small>{formatCounts(danceId, choice.counts)}</small>
          </header>
          <NoticeBox notice={notice} onClose={() => { setForcedDismissed(true); session.dismissNotice(); }} />
          <CountBox playing={view.playing} countIn={view.countIn} nowText={nowText} idleText={idleText} beatsPerBar={profile.beatsPerBar} beat={beat} />
        </div>
        <div>
          <SpeedChoices presets={speedPresetBpms(profile)} selected={choice.speed} onChoose={preset => change(choosePreset(current(), danceId, preset))} />
          <PracticeToggles metronome={settings.metronome} leadIn={settings.countInBars === 1}
            onMetronome={() => change({ metronome: !current().metronome })}
            onLeadIn={() => change({ countInBars: current().countInBars === 1 ? 0 : 1 })} />
          <VoiceChip />
          <MoreOptions label={choice.customBpm !== null ? translator.t('moreOptionsWithTempo', { tempo: choice.customBpm }) : translator.t('moreOptions')}>
            {profile.templates.length > 1 && (
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
            <FineSpeed idPrefix="dc-s2" bpm={choice.bpm} dragBpm={dragBpm} competition={profile.competitionBpm} onDrag={setDragBpm}
              onCommit={value => change(chooseCustomBpm(current(), profile, value))} />
            <RepeatRow loop={settings.loop} onToggle={() => change({ loop: !current().loop })} />
          </MoreOptions>
        </div>
      </div>
      <PlayDock playing={playing} onToggle={togglePlay} />
    </main>
  );
}
