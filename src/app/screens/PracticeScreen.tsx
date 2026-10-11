import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { getDanceProfile } from '../../engine/dance-profiles.js';
import { BackButton } from '../components/BackButton.tsx';
import { Icon } from '../components/Icon.tsx';
import type { MessageKey } from '../i18n/index.ts';
import { danceName } from '../i18n/index.ts';
import { displayForVoiceKey, formatCounts } from '../lib/count-display.ts';
import { beatIndexInBar } from '../practice/beat-indicator.ts';
import { chooseCustomBpm, choosePreset, chooseTemplate, practiceChoice, type DanceProfileLike } from '../practice/preferences.ts';
import { browserSessionDeps } from '../practice/session-deps.ts';
import { IDLE_VIEW, PracticeSession, type PracticeOptions, type SessionNotice, type SessionView } from '../practice/session.ts';
import { BPM_MAX, BPM_MIN, SPEED_PRESETS, speedPresetBpms, type SpeedPreset } from '../practice/speed.ts';
import { buildHash, type UiState } from '../router/routes.ts';
import type { AppSettings } from '../settings/settings.ts';
import { takeAutoplay } from '../state/autoplay.ts';
import { useI18n } from '../state/i18n.ts';
import { useSettings } from '../state/settings.ts';

type Profile = DanceProfileLike & { beatsPerBar: number };

const SPEED_LABEL: Record<SpeedPreset, MessageKey> = { slow: 'speedSlow', standard: 'speedStandard', fast: 'speedFast' };
// ui-state は見た目だけを強制する（Ruling 33）。設定・hints・再生には書かない。
const FORCED_NOTICE: Partial<Record<UiState, SessionNotice>> = { 'no-sound': 'no-sound', 'wakelock-tip': 'wake-tip' };

// S2 再生（仕様 §4・Ruling 13・18・19・21・23・28〜32）。
export function PracticeScreen({ danceId, uiState }: { danceId: string; uiState?: UiState }) {
  const { translator } = useI18n();
  const { settings, update } = useSettings();
  const profile = getDanceProfile(danceId) as Profile;
  const choice = practiceChoice(profile, settings);
  const latest = useRef({ settings, update });
  latest.current = { settings, update };
  const session = useMemo(() => new PracticeSession(browserSessionDeps, {
    wakeTipAlreadyShown: () => latest.current.settings.hints.wakeLockTipShown,
    markWakeTipShown: () => latest.current.update({ hints: { ...latest.current.settings.hints, wakeLockTipShown: true } })
  }), [danceId]);
  const [view, setView] = useState<SessionView>(IDLE_VIEW);
  const [forcedDismissed, setForcedDismissed] = useState(false);
  const [dragBpm, setDragBpm] = useState<number | null>(null);

  const optionsFrom = (next: AppSettings): PracticeOptions => {
    const nextChoice = practiceChoice(profile, next);
    return { kind: 'counts', danceId, counts: nextChoice.counts, bpm: nextChoice.bpm, metronome: next.metronome, countInBars: next.countInBars, loop: next.loop, track: null };
  };

  // 開いた時点で「前回」を書き（Ruling 26）、前回カードの印があればすぐ鳴らす（Ruling 32）。離れたら必ず止める。
  useEffect(() => {
    update({ lastDanceId: danceId });
    const unsubscribe = session.subscribe(setView);
    if (takeAutoplay({ kind: 'dance', id: danceId })) {
      try { void session.play(optionsFrom(settings)); } catch { /* 入力は practiceChoice 済み。万一でも画面は止まったまま */ }
    }
    return () => { unsubscribe(); session.dispose(); };
  }, [session]);

  // 設定を変える。再生中なら止めて適用して再開（このクリックの中で行うので音の解除も保たれる）。
  const change = (patch: Partial<AppSettings>) => {
    if (Object.keys(patch).length === 0) return;
    update(patch);
    if (view.playing || view.starting) void session.play(optionsFrom({ ...settings, ...patch }));
  };

  const togglePlay = () => {
    setForcedDismissed(true);
    if (view.playing || view.starting) session.stop();
    else void session.play(optionsFrom(settings));
  };

  const presets = speedPresetBpms(profile);
  const forced = uiState ? FORCED_NOTICE[uiState] : undefined;
  const notice: SessionNotice = forced && !forcedDismissed ? forced : view.notice;
  const beat = view.playing && !view.countIn ? beatIndexInBar(view.originalTick, profile.beatsPerBar) : null;
  const nowText = view.playing && !view.countIn ? displayForVoiceKey(view.voiceKey) : '';
  // 止まっている間は「最初に鳴るカウント」を灰色で出す（空白にしない。琥珀は鳴っている時だけ）。
  const idleText = view.playing ? '' : formatCounts(danceId, choice.counts).split(' ')[0] ?? '';
  const shownBpm = dragBpm ?? choice.bpm;
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
          <Alert notice={notice} onClose={() => { setForcedDismissed(true); session.dismissNotice(); }} />
          <div class="dc-countbox" aria-live="off" aria-label={nowText ? translator.t('nowCount', { count: nowText }) : undefined}>
            {view.playing && view.countIn
              ? <div class="dc-now dc-now--lead">{translator.t('leadInNow')}</div>
              : <div class={`dc-now${view.playing ? '' : ' dc-now--idle'}`} aria-hidden="true">{view.playing ? nowText : idleText}</div>}
            <ol class="dc-beats" aria-hidden="true">
              {Array.from({ length: profile.beatsPerBar }, (_, index) => (
                <li key={index} aria-current={beat === index ? 'true' : undefined}>{index + 1}</li>
              ))}
            </ol>
          </div>
        </div>
        <div>
          <div class="dc-field-label"><Icon name="gauge" /><span>{translator.t('speed')}</span></div>
          <div class="dc-seg" role="radiogroup" aria-label={translator.t('speed')} data-group="speed">
            {SPEED_PRESETS.map(preset => {
              const checked = choice.speed === preset;
              return (
                <button key={preset} type="button" class="dc-opt" role="radio" aria-checked={checked ? 'true' : 'false'}
                  onClick={() => { if (!checked) change(choosePreset(settings, danceId, preset)); }}>
                  <b class="dc-opt-label">{checked && <Icon name="check" />}{translator.t(SPEED_LABEL[preset])}</b>
                  {checked && <small>{translator.t('tempoMark', { tempo: presets[preset] })}</small>}
                </button>
              );
            })}
          </div>
          <div class="dc-toggles">
            <Toggle icon="metronome" label={translator.t('metronome')} on={settings.metronome} onText={translator.t('on')} offText={translator.t('off')}
              onToggle={() => change({ metronome: !settings.metronome })} />
            <Toggle icon="leadin" label={translator.t('leadIn')} on={settings.countInBars === 1} onText={translator.t('on')} offText={translator.t('off')}
              onToggle={() => change({ countInBars: settings.countInBars === 1 ? 0 : 1 })} />
          </div>
          <a class="dc-chip-row" href={buildHash({ screen: 'S7', params: {} })}>
            <Icon name="voice" />
            <span>{translator.t('voiceChip', { name: translator.t('standardVoiceShort') })}</span>
            <Icon name="chev-r" />
          </a>
          <details class="dc-more">
            <summary data-more>
              <span>{choice.customBpm !== null ? translator.t('moreOptionsWithTempo', { tempo: choice.customBpm }) : translator.t('moreOptions')}</span>
              <Icon name="chevron" />
            </summary>
            <div class="dc-more-body">
              {profile.templates.length > 1 && (
                <div>
                  <div class="dc-field-label"><span>{translator.t('countPattern')}</span></div>
                  <div class="dc-chips" role="radiogroup" aria-label={translator.t('countPattern')} data-group="pattern">
                    {profile.templates.map(counts => (
                      <button key={counts} type="button" class="dc-chip" role="radio" aria-checked={choice.counts === counts ? 'true' : 'false'}
                        onClick={() => { if (choice.counts !== counts) change(chooseTemplate(settings, profile, counts)); }}>
                        {formatCounts(danceId, counts)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div class="dc-fine" data-group="speed-fine">
                <div class="dc-field-label" id="dc-fine-speed-label">
                  <span>{translator.t('fineSpeed')}</span>
                  <span>{translator.t('tempoMark', { tempo: shownBpm })}</span>
                </div>
                <input aria-labelledby="dc-fine-speed-label" type="range" min={BPM_MIN} max={BPM_MAX} step={1} value={shownBpm}
                  onInput={event => setDragBpm(Number((event.currentTarget as HTMLInputElement).value))}
                  onChange={event => { setDragBpm(null); change(chooseCustomBpm(settings, profile, (event.currentTarget as HTMLInputElement).value)); }} />
                <button type="button" class="dc-chip" onClick={() => change(chooseCustomBpm(settings, profile, profile.competitionBpm.min))}>
                  {translator.t('competitionSpeed', { min: profile.competitionBpm.min, max: profile.competitionBpm.max })}
                </button>
              </div>
              <div class="dc-more-row">
                <span>{translator.t('repeat')}</span>
                <button type="button" class="dc-chip" role="switch" aria-checked={settings.loop ? 'true' : 'false'}
                  onClick={() => change({ loop: !settings.loop })}>
                  {settings.loop ? translator.t('on') : translator.t('off')}
                </button>
              </div>
            </div>
          </details>
        </div>
      </div>
      <div class="dc-dock">
        <button type="button" class="dc-play dc-primary" data-play onClick={togglePlay}>
          <Icon name={playing ? 'stop' : 'play'} />
          <span>{playing ? translator.t('stop') : translator.t('play')}</span>
        </button>
      </div>
    </main>
  );
}

function Toggle({ icon, label, on, onText, offText, onToggle }: {
  icon: 'metronome' | 'leadin'; label: string; on: boolean; onText: string; offText: string; onToggle(): void;
}) {
  return (
    <button type="button" class="dc-toggle" role="switch" aria-checked={on ? 'true' : 'false'} onClick={onToggle}>
      <Icon name={icon} />
      <span class="dc-toggle-label">{label}</span>
      <span class="dc-switch"><span class="dc-switch-knob" /><span class="dc-switch-text">{on ? onText : offText}</span></span>
    </button>
  );
}

// [data-alert] の枠は1つだけ（Ruling 30）。中の操作は [data-alert-action] の1つまで（U4 から除外。Ruling 23）。
// 375 幅で高さ 120px 以下に収めるため、文は補助文（16px）の1段落・アイコン列なし（左の太線＋太字で示す）。
function Alert({ notice, onClose }: { notice: SessionNotice; onClose(): void }) {
  const { translator } = useI18n();
  if (notice === 'none') return null;
  return (
    <div class="dc-alert" role="status" data-alert={notice}>
      {notice === 'no-sound' && (
        <>
          <div class="dc-alert-text"><b>{translator.t('noSoundTitle')}</b>{translator.locale === 'ja-JP' ? '' : ' '}{translator.t('noSoundBody')}</div>
          <a class="dc-alert-action" data-alert-action href={buildHash({ screen: 'S11', params: {} })}>
            <span>{translator.t('noSoundLink')}</span><Icon name="chev-r" />
          </a>
        </>
      )}
      {notice === 'stopped' && <div class="dc-alert-text"><b>{translator.t('playbackStopped')}</b></div>}
      {notice === 'voice-missing' && <div class="dc-alert-text"><b>{translator.t('voiceMissing')}</b></div>}
      {notice === 'wake-tip' && (
        <>
          <div class="dc-alert-text">{translator.t('wakeLockTip')}</div>
          <button type="button" class="dc-alert-action" data-alert-action onClick={onClose}>{translator.t('close')}</button>
        </>
      )}
    </div>
  );
}
