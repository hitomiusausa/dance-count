import test from 'node:test';
import assert from 'node:assert/strict';
import { countInBeatCount, effectiveVoiceOffsetMs, eventOccurrenceTime, isAccentedBeat, patternDurationSeconds, rangeEventTimeSeconds } from '../../src/v2/audio-engine.js';

test('pattern duration is derived from integer ticks', () => {
  assert.equal(patternDurationSeconds(3 * 960, 90), 2);
});

test('loop occurrence time is calculated from iteration, without accumulation', () => {
  const event = { absoluteTick: 480 };
  const actual = eventOccurrenceTime({ event, iteration: 1000, durationTicks: 3840, bpm: 120, startTime: 10 });
  assert.equal(actual, 2010.25);
});

test('range playback keeps original event phase while starting local time at zero', () => {
  const actual = rangeEventTimeSeconds({
    event: { absoluteTick: 5 * 960 },
    iteration: 0,
    rangeStartTick: 4 * 960,
    rangeDurationTicks: 3 * 960,
    bpm: 120,
    startTime: 10
  });
  assert.equal(actual, 10.5);
});

test('count-in accent preserves the original bar phase before a range', () => {
  assert.equal(isAccentedBeat(4, 4), true);
  assert.equal(isAccentedBeat(3, 4), false);
  assert.equal(isAccentedBeat(-4, 4), true);
});

test('count-in supports none, one bar, or two bars', () => {
  assert.equal(countInBeatCount(4, 0), 0);
  assert.equal(countInBeatCount(4, 1), 4);
  assert.equal(countInBeatCount(3, 2), 6);
  assert.throws(() => countInBeatCount(4, 3), /0, 1, or 2/);
});

test('word timing adjustment is added to the global voice adjustment', () => {
  assert.equal(effectiveVoiceOffsetMs(10, { six: -15 }, 'six'), -5);
  assert.equal(effectiveVoiceOffsetMs(10, { six: -15 }, 'one'), 10);
  assert.equal(effectiveVoiceOffsetMs(undefined, undefined, 'one'), 0);
});
