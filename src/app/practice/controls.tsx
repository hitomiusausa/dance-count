import type { ComponentChildren } from 'preact';
import { Icon } from '../components/Icon.tsx';
import type { MessageKey } from '../i18n/index.ts';
import { phrased } from '../i18n/phrased.tsx';
import { buildHash, type UiState } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import type { SessionNotice } from './session.ts';
import { BPM_MAX, BPM_MIN, SPEED_PRESETS, type SpeedChoice, type SpeedPreset } from './speed.ts';
import { canStep, formatVoiceOffset } from './voice-offset.ts';

// S2・S5 が共通で組む部品（Ruling 42）。記憶の単位（種目ごと・ルーティンごと）は各画面が持ち、部品は値と操作だけを受け取る。
const SPEED_LABEL: Record<SpeedPreset, MessageKey> = { slow: 'speedSlow', standard: 'speedStandard', fast: 'speedFast' };

// 大きな現在カウント＋拍インジケータ（操作ではない）。children は拍の下に置く（S5 の「3 / 13 …」の1行）。
export function CountBox({ playing, countIn, nowText, idleText, beatsPerBar, beat, children }: {
  playing: boolean; countIn: boolean; nowText: string; idleText: string; beatsPerBar: number; beat: number | null; children?: ComponentChildren;
}) {
  const { translator } = useI18n();
  return (
    <div class="dc-countbox" aria-live="off" aria-label={nowText ? translator.t('nowCount', { count: nowText }) : undefined}>
      {playing && countIn
        ? <div class="dc-now dc-now--lead">{translator.t('leadInNow')}</div>
        : <div class={`dc-now${playing ? '' : ' dc-now--idle'}`} aria-hidden="true">{playing ? nowText : idleText}</div>}
      <ol class="dc-beats" aria-hidden="true">
        {Array.from({ length: beatsPerBar }, (_, index) => (
          <li key={index} aria-current={beat === index ? 'true' : undefined}>{index + 1}</li>
        ))}
      </ol>
      {children}
    </div>
  );
}

// 速さの選択肢（S2 は3択、S5 は端で2択になることがある。Ruling 24・40）。選択中だけ「♩=値」を併記。
export function SpeedChoices({ presets, selected, onChoose }: {
  presets: Partial<Record<SpeedPreset, number>>; selected: SpeedChoice; onChoose(preset: SpeedPreset): void;
}) {
  const { translator } = useI18n();
  const shown = SPEED_PRESETS.filter(preset => presets[preset] !== undefined);
  return (
    <>
      <div class="dc-field-label"><Icon name="gauge" /><span>{translator.t('speed')}</span></div>
      <div class="dc-seg" role="radiogroup" aria-label={translator.t('speed')} data-group="speed" style={{ gridTemplateColumns: `repeat(${shown.length}, 1fr)` }}>
        {shown.map(preset => {
          const checked = selected === preset;
          return (
            <button key={preset} type="button" class="dc-opt" role="radio" aria-checked={checked ? 'true' : 'false'}
              onClick={() => { if (!checked) onChoose(preset); }}>
              <b class="dc-opt-label">{checked && <Icon name="check" />}{translator.t(SPEED_LABEL[preset])}</b>
              {checked && <small>{translator.t('tempoMark', { tempo: presets[preset]! })}</small>}
            </button>
          );
        })}
      </div>
    </>
  );
}

// メトロノーム・はじめの合図（Ruling 19）。
export function PracticeToggles({ metronome, leadIn, onMetronome, onLeadIn }: {
  metronome: boolean; leadIn: boolean; onMetronome(): void; onLeadIn(): void;
}) {
  const { translator } = useI18n();
  return (
    <div class="dc-toggles">
      <Toggle icon="metronome" label={translator.t('metronome')} on={metronome} onToggle={onMetronome} />
      <Toggle icon="leadin" label={translator.t('leadIn')} on={leadIn} onToggle={onLeadIn} />
    </div>
  );
}

function Toggle({ icon, label, on, onToggle }: { icon: 'metronome' | 'leadin'; label: string; on: boolean; onToggle(): void }) {
  const { translator } = useI18n();
  return (
    <button type="button" class="dc-toggle" role="switch" aria-checked={on ? 'true' : 'false'} onClick={onToggle}>
      <Icon name={icon} />
      <span class="dc-toggle-label">{label}</span>
      <span class="dc-switch"><span class="dc-switch-knob" /><span class="dc-switch-text">{on ? translator.t('on') : translator.t('off')}</span></span>
    </button>
  );
}

// 声チップ（→ S7）。name は選んだ声の短い名前（voices/selection.ts の voiceDisplayName(…, 'chip')。Ruling 61-5）。
export function VoiceChip({ name }: { name: string }) {
  const { translator } = useI18n();
  return (
    <a class="dc-chip-row" href={buildHash({ screen: 'S7', params: {} })}>
      <Icon name="voice" />
      <span data-voice-chip>{translator.t('voiceChip', { name })}</span>
      <Icon name="chev-r" />
    </a>
  );
}

// 「くわしく」（1画面に1つ。Ruling 18）。label に任意の速さを併記できる（Ruling 31）。
export function MoreOptions({ label, open, onToggle, children }: {
  label: string; open?: boolean; onToggle?(open: boolean): void; children: ComponentChildren;
}) {
  return (
    <details class="dc-more" open={open} onToggle={event => onToggle?.((event.currentTarget as HTMLDetailsElement).open)}>
      <summary data-more>
        <span>{label}</span>
        <Icon name="chevron" />
      </summary>
      <div class="dc-more-body">{children}</div>
    </details>
  );
}

// 速さの細かい調整（スライダー 40〜220）と「競技の速さ」（Ruling 13・31）。1つのグループ。
export function FineSpeed({ bpm, dragBpm, competition, onDrag, onCommit, idPrefix }: {
  bpm: number; dragBpm: number | null; competition: { min: number; max: number };
  onDrag(value: number | null): void; onCommit(value: unknown): void; idPrefix: string;
}) {
  const { translator } = useI18n();
  const shown = dragBpm ?? bpm;
  const labelId = `${idPrefix}-fine-speed-label`;
  return (
    <div class="dc-fine" data-group="speed-fine">
      <div class="dc-field-label" id={labelId}>
        <span>{translator.t('fineSpeed')}</span>
        <span>{translator.t('tempoMark', { tempo: shown })}</span>
      </div>
      <input aria-labelledby={labelId} type="range" min={BPM_MIN} max={BPM_MAX} step={1} value={shown}
        onInput={event => onDrag(Number((event.currentTarget as HTMLInputElement).value))}
        onChange={event => { onDrag(null); onCommit((event.currentTarget as HTMLInputElement).value); }} />
      <button type="button" class="dc-chip" onClick={() => onCommit(competition.min)}>
        {translator.t('competitionSpeed', { min: competition.min, max: competition.max })}
      </button>
    </div>
  );
}

// 繰り返す（くわしくの中。Ruling 19）。
export function RepeatRow({ loop, onToggle }: { loop: boolean; onToggle(): void }) {
  const { translator } = useI18n();
  return (
    <div class="dc-more-row">
      <span>{translator.t('repeat')}</span>
      <button type="button" class="dc-chip" role="switch" aria-checked={loop ? 'true' : 'false'} onClick={onToggle}>
        {loop ? translator.t('on') : translator.t('off')}
      </button>
    </div>
  );
}

// 声のタイミング（くわしくの最後の行。Ruling 62・D24）。1 行目にラベルと値、2 行目に「‹ 早く」「遅く ›」（320 幅でも横に溢れない）。
// 端では押せない。スライダーは使わない（10ms を指で合わせられない）。
export function VoiceOffsetRow({ offsetMs, onStep, idPrefix }: { offsetMs: number; onStep(direction: -1 | 1): void; idPrefix: string }) {
  const { translator } = useI18n();
  const labelId = `${idPrefix}-voice-offset-label`;
  return (
    <div class="dc-voice-offset" role="group" aria-labelledby={labelId} data-group="voice-offset">
      <div class="dc-field-label" id={labelId}>
        <span>{translator.t('voiceTiming')}</span>
        <span class="dc-offset-value" data-voice-offset>{formatVoiceOffset(offsetMs)}</span>
      </div>
      <div class="dc-offset-buttons">
        <button type="button" class="dc-chip" disabled={!canStep(offsetMs, -1)} onClick={() => onStep(-1)}>
          <Icon name="chev-l" /><span>{translator.t('voiceEarlier')}</span>
        </button>
        <button type="button" class="dc-chip" disabled={!canStep(offsetMs, 1)} onClick={() => onStep(1)}>
          <span>{translator.t('voiceLater')}</span><Icon name="chev-r" />
        </button>
      </div>
      <div class="dc-offset-hint">{translator.t('voiceTimingHint')}</div>
    </div>
  );
}

// 下固定の ▶／■（72px 以上・幅 60% 以上）。
export function PlayDock({ playing, onToggle }: { playing: boolean; onToggle(): void }) {
  const { translator } = useI18n();
  return (
    <div class="dc-dock">
      <button type="button" class="dc-play dc-primary" data-play onClick={onToggle}>
        <Icon name={playing ? 'stop' : 'play'} />
        <span>{playing ? translator.t('stop') : translator.t('play')}</span>
      </button>
    </div>
  );
}

// [data-alert] の枠は1つだけ（Ruling 30）。中の操作は [data-alert-action] の1つまで（U4 から除外。Ruling 23）。
// 375 幅で高さ 120px 以下に収めるため、文は補助文（16px）の1段落・アイコン列なし（左の太線＋太字で示す）。
export type AlertNotice = SessionNotice | 'save-failed' | 'backup-tip';   // backup-tip は S4 の最初の保存の後に 1 回（Ruling 86-3）

// ui-state は見た目だけを強制する（Ruling 33）。設定・hints・再生には書かない。S2・S5 で共通。
export const FORCED_NOTICE: Partial<Record<UiState, SessionNotice>> = { 'no-sound': 'no-sound', 'wakelock-tip': 'wake-tip' };

export function NoticeBox({ notice, onClose }: { notice: AlertNotice; onClose(): void }) {
  const { translator } = useI18n();
  if (notice === 'none') return null;
  return (
    <div class="dc-alert" role="status" data-alert={notice}>
      {notice === 'no-sound' && (
        <>
          <div class="dc-alert-text"><b>{phrased(translator, 'noSoundTitle')}</b>{translator.locale === 'ja-JP' ? '' : ' '}{phrased(translator, 'noSoundBody')}</div>
          <a class="dc-alert-action" data-alert-action href={buildHash({ screen: 'S11', params: {} })}>
            <span>{translator.t('noSoundLink')}</span><Icon name="chev-r" />
          </a>
        </>
      )}
      {notice === 'stopped' && <div class="dc-alert-text"><b>{phrased(translator, 'playbackStopped')}</b></div>}
      {notice === 'voice-missing' && <div class="dc-alert-text"><b>{phrased(translator, 'voiceMissing')}</b></div>}
      {notice === 'save-failed' && <div class="dc-alert-text"><b>{phrased(translator, 'saveFailed')}</b></div>}
      {notice === 'backup-tip' && (
        <>
          <div class="dc-alert-text">{phrased(translator, 'backupTipRoutine')}</div>
          <button type="button" class="dc-alert-action" data-alert-action onClick={onClose}>{translator.t('close')}</button>
        </>
      )}
      {notice === 'wake-tip' && (
        <>
          <div class="dc-alert-text">{phrased(translator, 'wakeLockTip')}</div>
          <button type="button" class="dc-alert-action" data-alert-action onClick={onClose}>{translator.t('close')}</button>
        </>
      )}
    </div>
  );
}
