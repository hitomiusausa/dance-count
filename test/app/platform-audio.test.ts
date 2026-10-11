import test from 'node:test';
import assert from 'node:assert/strict';
import { outputLatencySeconds } from '../../src/app/platform/audio-context.ts';

const audio = (outputLatency: unknown) => ({ outputLatency }) as unknown as AudioContext;

test('outputLatencySeconds passes sane values through (0 < v <= 0.5)', () => {
  assert.equal(outputLatencySeconds(audio(0.2)), 0.2);
  assert.equal(outputLatencySeconds(audio(0.5)), 0.5);
});

test('outputLatencySeconds returns 0 for missing, non-positive, non-finite or too-large values', () => {
  for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, undefined, 0.6, '0.2']) {
    assert.equal(outputLatencySeconds(audio(value)), 0);
  }
});
