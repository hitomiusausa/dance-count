import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWithEngine } from '../../../tools/voices/engine-render.js';
import { renderTrack, renderTrackOverlapped } from '../../../tools/voices/render-gate.js';
import { compileRhythm } from '../../../src/engine/rhythm-compiler.js';

const RATE = 48_000;
// 1 秒の一定の音（頭の 40ms は無音）。重なった時に打ち消し合わないよう、語ごとに高さを変える
function longWord(hz) {
  const samples = new Float32Array(RATE);
  for (let index = Math.round(0.04 * RATE); index < samples.length; index += 1) samples[index] = 0.1 * Math.sin(2 * Math.PI * hz * index / RATE);
  return { samples, onsetMs: 40 };
}
const rmsAt = (samples, ms, widthMs = 20) => {
  const from = Math.round(ms / 1000 * RATE); const to = from + Math.round(widthMs / 1000 * RATE);
  let sum = 0; for (let index = from; index < to; index += 1) sum += samples[index] ** 2;
  return Math.sqrt(sum / (to - from));
};

test('renderWithEngine cuts each word at the next word\'s beat, as the app does', () => {
  const words = Object.fromEntries([['one', 220], ['two', 330], ['three', 495]].map(([key, hz]) => [key, longWord(hz)]));
  words.two.onsetMs = 100;   // 「に」は拍の 60ms 前から声が出る（早めに置いた語）
  const compiled = compileRhythm({ danceId: 'waltz', counts: '123' });
  const { samples } = renderWithEngine(words, compiled, 120, { clicks: false, repetitions: 1, preRollMs: 300 });
  // 拍は 300・800・1300ms。「に」の拍の 100ms 後は「に」だけ（「いち」は 800ms で消えている）
  const single = 0.1 / Math.SQRT2;
  assert.ok(Math.abs(rmsAt(samples, 900) - single) < 0.01, `${rmsAt(samples, 900)}`);
  // 「に」は 740ms（拍の 60ms 前）から声が出て、800ms の少し前（12ms で消し始める）までは「いち」と重なる
  assert.ok(rmsAt(samples, 750, 20) > single * 1.3, `${rmsAt(samples, 750, 20)}`);
  // 語を最後まで重ねる描き方では、900ms でも 2 語が鳴っている（アプリとは違う）
  const overlapped = renderTrackOverlapped(words, compiled, 120, 3, { clicks: false, repetitions: 1 }).samples;
  assert.ok(rmsAt(overlapped, 900) > single * 1.3);
});

test('the gate renders through the app engine', () => {
  const words = Object.fromEntries([['one', 220], ['two', 330], ['three', 495]].map(([key, hz]) => [key, longWord(hz)]));
  const compiled = compileRhythm({ danceId: 'waltz', counts: '123' });
  const { samples } = renderTrack(words, compiled, 120, 3, { clicks: false, repetitions: 1 });
  assert.ok(Math.abs(rmsAt(samples, 900) - 0.1 / Math.SQRT2) < 0.01);
});
