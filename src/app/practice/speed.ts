// 速さ3択（仕様 §4 S2・Ruling 24）。比率は製品判断で、ダンス上の根拠はない。値はこの1か所だけで持つ。
export const SPEED_SLOW_RATIO = 0.8;
export const SPEED_FAST_RATIO = 1.1;
// 「くわしく」の細かい調整の範囲（仕様 §4 S2・Ruling 13）。
export const BPM_MIN = 40;
export const BPM_MAX = 220;

export type SpeedPreset = 'slow' | 'standard' | 'fast';
export type SpeedChoice = SpeedPreset | 'custom';
export const SPEED_PRESETS: readonly SpeedPreset[] = ['slow', 'standard', 'fast'];

export interface SpeedProfile { practiceBpm: number; competitionBpm: { min: number; max: number } }

export function speedPresetBpms(profile: SpeedProfile): Record<SpeedPreset, number> {
  return {
    slow: Math.round(profile.practiceBpm * SPEED_SLOW_RATIO),
    standard: profile.practiceBpm,
    fast: Math.min(Math.round(profile.practiceBpm * SPEED_FAST_RATIO), profile.competitionBpm.max)
  };
}

// 40〜220 の整数に丸める。数でないものは null（呼び出し側で既定に戻す）。
export function clampBpm(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN;
  if (!Number.isFinite(number)) return null;
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(number)));
}

// 再生に渡す BPM は必ず数値（段1持ち越し: constantTempo は '84' を通すが .bpm が文字列のまま残る）。
export function resolveBpm(profile: SpeedProfile, choice: SpeedChoice, customBpm: number | undefined): number {
  if (choice === 'custom') return clampBpm(customBpm) ?? profile.practiceBpm;
  return speedPresetBpms(profile)[choice];
}
