import { TICKS_PER_BEAT } from '../../engine/dance-profiles.js';

// 拍インジケータの「いま何拍目か」（0 始まり）。tick はエンジンの onFrame が返す originalTick だけを使う
// （時刻から拍を計算し直さない: 第2の時間計算を作らない）。tick が無い（停止中・はじめの合図の間）は null。
export function beatIndexInBar(originalTick: number | null | undefined, beatsPerBar: number): number | null {
  if (typeof originalTick !== 'number' || !Number.isFinite(originalTick) || !(beatsPerBar > 0)) return null;
  const barTicks = beatsPerBar * TICKS_PER_BEAT;
  const inBar = ((originalTick % barTicks) + barTicks) % barTicks;
  return Math.floor(inBar / TICKS_PER_BEAT);
}
