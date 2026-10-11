import { createVoiceTimingAdjustments } from '../../engine/recorded-voice-pack.js';
import type { AppSettings } from '../settings/settings.ts';
import type { VoicePackRecord } from '../voices/store.ts';
import type { VoiceSelection } from '../voices/selection.ts';

// 声のタイミング（Ruling 62・D24）。「くわしく」の最後の行の「‹ 早く」「遅く ›」。負＝声が早く鳴る（エンジンの userOffsetMs と同じ向き）。
// 保存先: 標準の声は設定の voiceOffsetMsByVoiceId、録音・受け取った声は声そのものの timingAdjustments.globalOffsetMs。
export const VOICE_OFFSET_STEP_MS = 10;
export const VOICE_OFFSET_MAX_MS = 200;

// 保存されていた値を受け取る形にする: 有限の整数で ±200 の内だけ（外れたら null）。
export function normalizeVoiceOffset(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || Math.abs(value) > VOICE_OFFSET_MAX_MS) return null;
  return value === 0 ? 0 : value;   // -0 を 0 に
}

export function clampVoiceOffset(value: number): number {
  const rounded = Math.round(value / VOICE_OFFSET_STEP_MS) * VOICE_OFFSET_STEP_MS;
  return Math.max(-VOICE_OFFSET_MAX_MS, Math.min(VOICE_OFFSET_MAX_MS, rounded)) || 0;
}

// 1 回押すと 10ms。端で止まる（端ではボタン自体を押せなくする＝canStep）。
export function stepVoiceOffset(current: number, direction: -1 | 1): number {
  return clampVoiceOffset(clampVoiceOffset(current) + direction * VOICE_OFFSET_STEP_MS);
}

export function canStep(current: number, direction: -1 | 1): boolean {
  return direction < 0 ? current > -VOICE_OFFSET_MAX_MS : current < VOICE_OFFSET_MAX_MS;
}

// 表示（D24）: 0 は「±0 ms」、負は数学のマイナス記号「−20 ms」、正は「+10 ms」。日英共通。
export function formatVoiceOffset(ms: number): string {
  if (ms === 0) return '±0 ms';
  return ms < 0 ? `−${Math.abs(ms)} ms` : `+${ms} ms`;
}

export function voiceOffsetFor(settings: Pick<AppSettings, 'voiceOffsetMsByVoiceId'>, voice: VoiceSelection): number {
  if (voice.kind === 'standard') return settings.voiceOffsetMsByVoiceId[voice.id] ?? 0;
  return voice.pack.timingAdjustments?.globalOffsetMs ?? 0;
}

// 標準の声: 設定への差分（0 なら消す）。
export function chooseStandardVoiceOffset(settings: Pick<AppSettings, 'voiceOffsetMsByVoiceId'>, voiceId: string, value: number): Partial<AppSettings> {
  const { [voiceId]: _old, ...rest } = settings.voiceOffsetMsByVoiceId;
  const next = clampVoiceOffset(value);
  return { voiceOffsetMsByVoiceId: next === 0 ? rest : { ...rest, [voiceId]: next } };
}

// 録音・受け取った声: globalOffsetMs に書いた新しい声（語ごとの値は残す＝旧画面で調整した受け取りの声。Ruling 62-5）。
// 全部 0 になったら timingAdjustments ごと外す。音は変わらないので updatedAt は進めない（decode の記憶を捨てない）。
export function withPackOffset(pack: VoicePackRecord, value: number, now: string): VoicePackRecord {
  const next = clampVoiceOffset(value);
  const words = pack.timingAdjustments?.wordOffsetsMs ?? {};
  const { timingAdjustments: _old, ...rest } = pack;
  if (next === 0 && Object.values(words).every(offset => offset === 0)) return rest;
  return { ...rest, timingAdjustments: createVoiceTimingAdjustments(next, words, now) };
}

// 「‹ 早く」「遅く ›」を 1 回押した結果（純粋）。標準の声は設定の差分、録音・受け取った声は書き換えた声（呼び出し側が保存する）。
export interface VoiceOffsetStep { voice: VoiceSelection; patch: Partial<AppSettings>; pack: VoicePackRecord | null; offsetMs: number }

export function stepVoice(settings: Pick<AppSettings, 'voiceOffsetMsByVoiceId'>, voice: VoiceSelection, direction: -1 | 1, now: string): VoiceOffsetStep {
  const offsetMs = stepVoiceOffset(voiceOffsetFor(settings, voice), direction);
  if (voice.kind === 'standard') return { voice, patch: chooseStandardVoiceOffset(settings, voice.id, offsetMs), pack: null, offsetMs };
  const pack = withPackOffset(voice.pack, offsetMs, now);
  return { voice: { kind: 'pack', id: pack.id, pack }, patch: {}, pack, offsetMs };
}
