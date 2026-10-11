import test from 'node:test';
import assert from 'node:assert/strict';
import { PracticeAudioEngine, countInBeatCount, effectiveVoiceOffsetMs, eventOccurrenceTime, isAccentedBeat, patternDurationSeconds, rangeEventTimeSeconds } from '../../src/engine/audio-engine.js';
import { compileRhythm, eventTimeSeconds } from '../../src/engine/rhythm-compiler.js';
import { expectedEventTimeMs } from '../../src/engine/dance-timing-audit.js';
import { beatMapTempo } from '../../src/engine/tempo-map.js';

test('pattern duration is derived from integer ticks', () => {
  assert.equal(patternDurationSeconds(3 * 960, 90), 2);
});

// tempo-map 集約（Task 5）で意図して厳しくした点: 以前は Infinity / NaN の BPM を黙って受け取り
// 0 や NaN の時刻を返していたが、いまは constantTempo が同じ文言の RangeError で止める。
// 検査の順番（長さ → BPM）は以前のまま。
test('non-finite BPM is now rejected with the same RangeError as BPM <= 0 (deliberate tightening)', () => {
  const bpmError = { name: 'RangeError', message: 'BPM must be greater than zero' };
  for (const bpm of [Infinity, Number.NaN, 0]) {
    assert.throws(() => patternDurationSeconds(960, bpm), bpmError);
    assert.throws(() => rangeEventTimeSeconds({ event: { absoluteTick: 0 }, iteration: 0, rangeStartTick: 0, rangeDurationTicks: 960, bpm, startTime: 0 }), bpmError);
    assert.throws(() => eventTimeSeconds({ absoluteTick: 0 }, bpm), bpmError);
    assert.throws(() => expectedEventTimeMs({ absoluteTick: 0 }, bpm), bpmError);
  }
  assert.throws(() => patternDurationSeconds(0, Infinity), { name: 'RangeError', message: 'Pattern duration must be greater than zero' });
});

// 再生エンジンはまだ拍の地図（beatMap）を扱えない（範囲の頭からの tick を位置として変換しているため、
// 一定テンポでしか正しくない）。誤った時刻で鳴らさず、はっきり止めることを確かめる。
// 既存の検査（範囲）はこれより先に効く＝一定テンポの入力でのエラーの順番は変わらない。
test('playback engine rejects a beat-map tempo until it is supported', () => {
  const engine = new PracticeAudioEngine({ currentTime: 0 }, { voicePack: { words: new Map() } });
  const compiled = compileRhythm({ danceId: 'waltz', counts: '123' });
  const tempo = beatMapTempo([0, 400, 1000], 3);
  assert.throws(() => engine.start({ compiled, bpm: 84, tempo }), { name: 'Error', message: 'beat-map tempo is not supported by the playback engine yet' });
  assert.throws(() => engine.start({ compiled, bpm: 84, tempo, rangeStartTick: 0, rangeEndTick: 0 }), { name: 'RangeError', message: 'Invalid playback range' });
  assert.equal(engine.playing, false);
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
