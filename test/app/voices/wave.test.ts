import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeAudioBufferAsWav } from '../../../src/engine/recording-normalizer.js';
import { fakeBuffer, tone } from '../helpers/voice-fixtures.ts';
import { WAVE_BARS, wavPeaks } from '../../../src/app/voices/wave.ts';

const wavBytes = (samples: Float32Array) => encodeAudioBufferAsWav(fakeBuffer([samples])).arrayBuffer();

test('a recorded word gives 40 bars scaled to the loudest (Ruling 59-2)', async () => {
  const peaks = wavPeaks(await wavBytes(tone({ totalMs: 745, startMs: 40, lengthMs: 300 })));
  assert.equal(peaks.length, WAVE_BARS);
  assert.equal(Math.max(...peaks), 1);
  assert.equal(peaks[0], 0, 'silence before the voice');
  assert.equal(peaks[WAVE_BARS - 1], 0, 'silence after the voice');
  assert.ok(peaks.every(peak => peak >= 0 && peak <= 1));
});

test('silence stays flat and foreign data gives no bars', async () => {
  assert.deepEqual(wavPeaks(await wavBytes(new Float32Array(48000))), Array(WAVE_BARS).fill(0));
  assert.deepEqual(wavPeaks(new ArrayBuffer(10)), []);
  assert.deepEqual(wavPeaks(new TextEncoder().encode('x'.repeat(200)).buffer), []);
  assert.deepEqual(wavPeaks(await wavBytes(new Float32Array(10))), [], 'shorter than the bars');
});
