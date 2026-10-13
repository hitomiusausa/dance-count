import { measureRecordingOnset } from '../../engine/recording-normalizer.js';

// 録れた 2 秒（TAKE_MS・D59 で 1.5 → 2）が使えるかの判定（Ruling 58-1）。エンジンの検出器は「持続する声の頭」を探す物で、相対しきい値のため
// 声の無い一定ノイズでも先頭で「見つかる」。声が無いことは peakRms の絶対値で別に見る。数値は実機で調整する前提の製品判断。
export const SILENCE_PEAK_RMS = 0.01;   // ≒ −40 dBFS。これ未満は「声が入っていない」
export const LATE_ONSET_MS = 1500;      // 2 秒の窓でこれより後に始まった声は切り出し（最長 745ms）が収まらない（窓の終わりの 0.5 秒前＝1.5 秒の時と同じ余り。D59）
export const MIN_TAKE_MS = 600;         // 録れた長さがこれ未満なら失敗（iOS で稀に短い・空の録音）

export type TakeProblem = 'silent' | 'late' | 'short';

export interface AudioBufferLike {
  numberOfChannels: number;
  sampleRate: number;
  length: number;
  duration: number;
  getChannelData(channel: number): Float32Array;
}

export interface TakeCheck { problem: TakeProblem | null; onsetMs: number | null; peakRms: number }

export function checkTake(buffer: AudioBufferLike): TakeCheck {
  if (buffer.duration * 1000 < MIN_TAKE_MS) return { problem: 'short', onsetMs: null, peakRms: 0 };
  let onset: { onsetMs: number; peakRms: number };
  try {
    onset = measureRecordingOnset(buffer as unknown as AudioBuffer);
  } catch {
    return { problem: 'silent', onsetMs: null, peakRms: 0 };
  }
  if (onset.peakRms < SILENCE_PEAK_RMS) return { problem: 'silent', onsetMs: onset.onsetMs, peakRms: onset.peakRms };
  if (onset.onsetMs > LATE_ONSET_MS) return { problem: 'late', onsetMs: onset.onsetMs, peakRms: onset.peakRms };
  return { problem: null, onsetMs: onset.onsetMs, peakRms: onset.peakRms };
}
