import { DANCE_PROFILES } from '../../engine/dance-profiles.js';
import type { AppLocale } from '../i18n/index.ts';
import { clampBpm, type SpeedChoice } from '../practice/speed.ts';
import { isFigureSlug } from '../routines/figure-names.ts';
import { isRoutineId } from '../routines/ids.ts';
import { normalizeVoiceOffset } from '../practice/voice-offset.ts';
import { DISTRIBUTOR_NAME_MAX } from '../share/limits.ts';
import { isVoiceId } from '../voices/ids.ts';

// 設定（仕様 §7）。保存先は IndexedDB の settings ストア、キーは SETTINGS_KEY の1件だけ。
// selectedVoiceId は録音・受け取った声の ID も残す（段4・Ruling 61-1）。voiceOffsetMsByVoiceId は標準の声のタイミング（Ruling 62-3。
// 録音の声は声そのものの timingAdjustments に持つ）。distributorName は S9 の「あなたの名前」（次回から入っている。Ruling 82-2）。
// hints.backupTip* はバックアップの 1 行を出したか（S8 完成・S4 の最初の保存で各 1 回。Ruling 86-2・86-3）。
// hints.firstPlaybackDone は初めて鳴った印・homeScreenCardDismissed は S1 の「ホーム画面に追加」カードを × で閉じた印（段7・Ruling 92-7・D42）。
export const SETTINGS_KEY = 'app';
export const STANDARD_VOICE_ID = 'default-en-female-v1';

export interface AppSettings {
  uiLocale: AppLocale | null;               // null = 端末の言語に従う
  voiceLocale: 'en' | 'ja-JP';              // D3: 初期値は UI 言語に関わらず英語
  selectedVoiceId: string;                  // 声の ID（標準・録音・受け取り）。見つからない・未完成なら再生時に標準（英語）へ落とす（Ruling 61-2）
  voiceOffsetMsByVoiceId: Record<string, number>;   // 標準の声のタイミング（ms・±200・0 は持たない）
  lastDanceId: string | null;               // 「前回」カード（無ければ出さない）
  lastFigure: string | null;                // 前回のフィガー（D57・Ruling 121。監修表の slug。基本のカウントなら null。lastDanceId と組）
  lastKind: 'dance' | 'routine';            // 夜間便 B-1（Ruling 124）: 前回が種目（S2）かルーティン（S5）か。版は上げない（欠けていれば 'dance'）
  lastRoutineId: string | null;             // 夜間便 B-1: 前回鳴らしたルーティン（S5 の ▶）。消えていれば種目の記憶へ落ちる（state/resume.ts）
  lastTemplateByDance: Record<string, string>;
  speedPresetByDance: Record<string, SpeedChoice>;
  customBpmByDance: Record<string, number>;
  speedPresetByRoutine: Record<string, SpeedChoice>;   // S5 の速さはルーティンごと（Ruling 40）。キーはルーティンID
  customBpmByRoutine: Record<string, number>;
  metronome: boolean;
  countInBars: 0 | 1;                       // はじめの合図 オン / オフ（オンの小節数は LEAD_IN_BARS=2。D17）
  loop: boolean;
  barCounting: boolean;                     // D72 小節を数える（くわしく。S2・S5 共通・既定オフ。出す種目は practice/bar-count.ts）
  distributorName: string;                  // 配る人の名前（40 字まで・'' は未入力）
  hints: {
    wakeLockTipShown: boolean; backupTipShownForRecording: boolean; backupTipShownForRoutine: boolean;
    firstPlaybackDone: boolean; homeScreenCardDismissed: boolean;
  };
}

export const DEFAULT_SETTINGS: AppSettings = Object.freeze({
  uiLocale: null,
  voiceLocale: 'en',
  selectedVoiceId: STANDARD_VOICE_ID,
  voiceOffsetMsByVoiceId: {},
  lastDanceId: null,
  lastFigure: null,
  lastKind: 'dance',
  lastRoutineId: null,
  lastTemplateByDance: {},
  speedPresetByDance: {},
  customBpmByDance: {},
  speedPresetByRoutine: {},
  customBpmByRoutine: {},
  metronome: true,
  countInBars: 1,
  loop: true,
  barCounting: false,
  distributorName: '',
  hints: { wakeLockTipShown: false, backupTipShownForRecording: false, backupTipShownForRoutine: false, firstPlaybackDone: false, homeScreenCardDismissed: false }
}) as AppSettings;

const SPEED_CHOICES: readonly SpeedChoice[] = ['slow', 'standard', 'fast', 'custom'];
const DANCES = DANCE_PROFILES as Record<string, { templates: readonly string[] }>;

// 保存されていた値を信用しない: 型・種目・カウントの型・速さの範囲を確かめ、外れた項目だけ既定に戻す。
export function normalizeSettings(raw: unknown): AppSettings {
  const source = isRecord(raw) ? raw : {};
  const hints = isRecord(source.hints) ? source.hints : {};
  return {
    uiLocale: source.uiLocale === 'en' || source.uiLocale === 'ja-JP' ? source.uiLocale : null,
    voiceLocale: source.voiceLocale === 'ja-JP' ? 'ja-JP' : 'en',
    selectedVoiceId: isVoiceId(source.selectedVoiceId) ? source.selectedVoiceId : STANDARD_VOICE_ID,
    voiceOffsetMsByVoiceId: pickVoiceOffsets(source.voiceOffsetMsByVoiceId),
    lastDanceId: typeof source.lastDanceId === 'string' && Object.hasOwn(DANCES, source.lastDanceId) ? source.lastDanceId : null,
    lastFigure: typeof source.lastDanceId === 'string' && Object.hasOwn(DANCES, source.lastDanceId) && isFigureSlug(source.lastFigure) ? source.lastFigure : null,
    lastKind: source.lastKind === 'routine' ? 'routine' : 'dance',
    lastRoutineId: isRoutineId(source.lastRoutineId) ? source.lastRoutineId : null,
    lastTemplateByDance: pickByDance(source.lastTemplateByDance, (danceId, value) =>
      typeof value === 'string' && DANCES[danceId]!.templates.includes(value) ? value : undefined),
    speedPresetByDance: pickByDance(source.speedPresetByDance, (_danceId, value) =>
      SPEED_CHOICES.find(choice => choice === value)),
    customBpmByDance: pickByDance(source.customBpmByDance, (_danceId, value) => clampBpm(value) ?? undefined),
    speedPresetByRoutine: pickByRoutine(source.speedPresetByRoutine, value => SPEED_CHOICES.find(choice => choice === value)),
    customBpmByRoutine: pickByRoutine(source.customBpmByRoutine, value => clampBpm(value) ?? undefined),
    metronome: typeof source.metronome === 'boolean' ? source.metronome : DEFAULT_SETTINGS.metronome,
    countInBars: source.countInBars === 0 ? 0 : 1,
    loop: typeof source.loop === 'boolean' ? source.loop : DEFAULT_SETTINGS.loop,
    barCounting: source.barCounting === true,
    distributorName: typeof source.distributorName === 'string' ? [...source.distributorName.trim()].slice(0, DISTRIBUTOR_NAME_MAX).join('') : '',
    hints: {
      wakeLockTipShown: hints.wakeLockTipShown === true,
      backupTipShownForRecording: hints.backupTipShownForRecording === true,
      backupTipShownForRoutine: hints.backupTipShownForRoutine === true,
      firstPlaybackDone: hints.firstPlaybackDone === true,
      homeScreenCardDismissed: hints.homeScreenCardDismissed === true
    }
  };
}

function pickByDance<T>(value: unknown, accept: (danceId: string, item: unknown) => T | undefined): Record<string, T> {
  const result: Record<string, T> = {};
  if (!isRecord(value)) return result;
  for (const [danceId, item] of Object.entries(value)) {
    if (!Object.hasOwn(DANCES, danceId)) continue;
    const accepted = accept(danceId, item);
    if (accepted !== undefined) result[danceId] = accepted;
  }
  return result;
}

function pickByRoutine<T>(value: unknown, accept: (item: unknown) => T | undefined): Record<string, T> {
  const result: Record<string, T> = {};
  if (!isRecord(value)) return result;
  for (const [routineId, item] of Object.entries(value)) {
    if (!isRoutineId(routineId)) continue;
    const accepted = accept(item);
    if (accepted !== undefined) result[routineId] = accepted;
  }
  return result;
}

function pickVoiceOffsets(value: unknown): Record<string, number> {
  const result: Record<string, number> = {};
  if (!isRecord(value)) return result;
  for (const [voiceId, item] of Object.entries(value)) {
    const offset = normalizeVoiceOffset(item);
    if (isVoiceId(voiceId) && offset !== null && offset !== 0) result[voiceId] = offset;
  }
  return result;
}

// ルーティンを消した時に、そのルーティンの速さの記憶も消す差分（Ruling 44）。
export function forgetRoutineSettings(settings: AppSettings, routineId: string): Partial<AppSettings> {
  const { [routineId]: _preset, ...speedPresetByRoutine } = settings.speedPresetByRoutine;
  const { [routineId]: _custom, ...customBpmByRoutine } = settings.customBpmByRoutine;
  return { speedPresetByRoutine, customBpmByRoutine };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
