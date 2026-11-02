// D73 声とメトロノームの大きさ（くわしく・S2 と S5 で共通・端末に残る）。画面と設定は 0〜100 の %、エンジンには倍率で渡す。
export const VOLUME_MIN = 0;
export const VOLUME_MAX = 100;
export const VOLUME_STEP = 5;          // スライダーの 1 目盛り（矢印キー 1 回）
export const VOLUME_DEFAULT = 100;     // 今までの大きさ（倍率 1）

// 保存されていた値を 0〜100 の整数に。数でなければ null（呼ぶ側で既定に戻す）
export function clampVolumePercent(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN;
  if (!Number.isFinite(number)) return null;
  return Math.min(VOLUME_MAX, Math.max(VOLUME_MIN, Math.round(number)));
}

// % → 倍率。耳の感じ方に合わせて 2 乗（50% ≒ −12 dB・25% ≒ −24 dB。直線だと 50% でもほとんど小さく聞こえない）。100% は 1（今までと同じ）
export function volumeGain(percent: number): number {
  const clamped = clampVolumePercent(percent) ?? VOLUME_DEFAULT;
  return (clamped / VOLUME_MAX) ** 2;
}
