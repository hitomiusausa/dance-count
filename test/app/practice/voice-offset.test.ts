import test from 'node:test';
import assert from 'node:assert/strict';
import { packFixture } from '../helpers/voice-fixtures.ts';
import {
  VOICE_OFFSET_MAX_MS, VOICE_OFFSET_STEP_MS, canStep, chooseStandardVoiceOffset, clampVoiceOffset, formatVoiceOffset, normalizeVoiceOffset,
  stepVoice, stepVoiceOffset, voiceOffsetFor, withPackOffset
} from '../../../src/app/practice/voice-offset.ts';
import { DEFAULT_VOICE, packSelection } from '../../../src/app/voices/selection.ts';

const NOW = '2026-10-12T02:00:00.000Z';

test('10 ms steps within ±200 (Ruling 62-1)', () => {
  assert.equal(VOICE_OFFSET_STEP_MS, 10);
  assert.equal(VOICE_OFFSET_MAX_MS, 200);
  assert.equal(stepVoiceOffset(0, -1), -10);
  assert.equal(stepVoiceOffset(-10, -1), -20);
  assert.equal(stepVoiceOffset(190, 1), 200);
  assert.equal(stepVoiceOffset(200, 1), 200);
  assert.equal(stepVoiceOffset(-200, -1), -200);
  assert.equal(stepVoiceOffset(7, 1), 20, 'an odd stored value snaps to the 10 ms grid');
  assert.equal(canStep(200, 1), false);
  assert.equal(canStep(-200, -1), false);
  assert.equal(canStep(0, 1), true);
  assert.equal(clampVoiceOffset(-0), 0);
  assert.ok(Object.is(clampVoiceOffset(-4), 0), 'no negative zero');
  assert.equal(clampVoiceOffset(999), 200);
});

test('the shown value is ±0 ms, −20 ms or +10 ms (D24)', () => {
  assert.equal(formatVoiceOffset(0), '±0 ms');
  assert.equal(formatVoiceOffset(-20), '−20 ms');
  assert.equal(formatVoiceOffset(10), '+10 ms');
});

test('stored values: integers within ±200 only', () => {
  for (const ok of [0, 10, -200, 200, 15]) assert.equal(normalizeVoiceOffset(ok), ok);
  for (const bad of [201, -201, 1.5, Number.NaN, '10', null, undefined]) assert.equal(normalizeVoiceOffset(bad), null, String(bad));
});

test('a standard voice keeps its offset in the settings; 0 removes the entry (Ruling 62-3)', () => {
  const settings = { voiceOffsetMsByVoiceId: { 'default-en-female-v1': -20, other: 30 } };
  assert.equal(voiceOffsetFor(settings, DEFAULT_VOICE), -20);
  assert.deepEqual(chooseStandardVoiceOffset(settings, 'default-en-female-v1', -30), { voiceOffsetMsByVoiceId: { 'default-en-female-v1': -30, other: 30 } });
  assert.deepEqual(chooseStandardVoiceOffset(settings, 'default-en-female-v1', 0), { voiceOffsetMsByVoiceId: { other: 30 } });
  assert.equal(voiceOffsetFor({ voiceOffsetMsByVoiceId: {} }, DEFAULT_VOICE), 0);
});

test('a recorded voice keeps its offset in timingAdjustments.globalOffsetMs (Ruling 62-3 [仕様差])', () => {
  const pack = packFixture('en', 12);
  const settings = { voiceOffsetMsByVoiceId: { 'user-recorded-v1': 90 } };
  assert.equal(voiceOffsetFor(settings, packSelection(pack)), 0, 'the settings map is for standard voices only');
  const earlier = withPackOffset(pack, -20, NOW);
  assert.equal(earlier.timingAdjustments?.globalOffsetMs, -20);
  assert.equal(earlier.timingAdjustments?.adjustedAt, NOW);
  assert.ok(Object.values(earlier.timingAdjustments!.wordOffsetsMs).every(value => value === 0));
  assert.equal(earlier.updatedAt, pack.updatedAt, 'the sound did not change');
  assert.equal(voiceOffsetFor(settings, packSelection(earlier)), -20);
  assert.equal(withPackOffset(earlier, 0, NOW).timingAdjustments, undefined, 'back to 0 drops the adjustments');
});

test('per-word offsets of a received voice survive the knob (Ruling 62-5)', () => {
  const pack = { ...packFixture('en', 12), timingAdjustments: { globalOffsetMs: 0, wordOffsetsMs: { slow: 15 }, adjustedAt: NOW } };
  const zero = withPackOffset(pack, 0, NOW);
  assert.equal(zero.timingAdjustments?.wordOffsetsMs.slow, 15);
  assert.equal(withPackOffset(pack, 30, NOW).timingAdjustments?.wordOffsetsMs.slow, 15);
});

test('one press: settings patch for a standard voice, a rewritten pack for a recorded one', () => {
  const standard = stepVoice({ voiceOffsetMsByVoiceId: {} }, DEFAULT_VOICE, -1, NOW);
  assert.deepEqual(standard.patch, { voiceOffsetMsByVoiceId: { 'default-en-female-v1': -10 } });
  assert.equal(standard.pack, null);
  assert.equal(standard.offsetMs, -10);
  const recorded = stepVoice({ voiceOffsetMsByVoiceId: {} }, packSelection(packFixture('en', 12)), 1, NOW);
  assert.deepEqual(recorded.patch, {});
  assert.equal(recorded.pack?.timingAdjustments?.globalOffsetMs, 10);
  assert.equal(recorded.voice.kind === 'pack' && recorded.voice.pack, recorded.pack);
  assert.equal(recorded.offsetMs, 10);
});
