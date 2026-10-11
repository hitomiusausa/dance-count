import test from 'node:test';
import assert from 'node:assert/strict';
import { measureOnset } from '../../tools/measure-voice-onsets.js';

test('measureOnset finds a sustained signal after silence', () => {
  const sampleRate = 1000;
  const samples = new Float32Array(500);
  samples.fill(0.2, 120, 300);
  const result = measureOnset(samples, sampleRate, {
    windowMs: 5,
    sustainMs: 15,
    relativeThreshold: 0.035,
    absoluteThreshold: 0.002
  });
  assert.equal(result.onsetMs, 120);
});

test('measureOnset ignores a short click before the voice', () => {
  const sampleRate = 1000;
  const samples = new Float32Array(500);
  samples.fill(0.5, 40, 45);
  samples.fill(0.2, 150, 350);
  const result = measureOnset(samples, sampleRate);
  assert.equal(result.onsetMs, 150);
});

test('measureOnset rejects silent audio', () => {
  assert.throws(() => measureOnset(new Float32Array(100), 1000), /No sustained/);
});
