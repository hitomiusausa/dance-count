import test from 'node:test';
import assert from 'node:assert/strict';
import { DANCE_PROFILES } from '../../../src/engine/dance-profiles.js';
import { BPM_MAX, BPM_MIN, SPEED_FAST_RATIO, SPEED_SLOW_RATIO, clampBpm, resolveBpm, speedPresetBpms } from '../../../src/app/practice/speed.ts';

test('speed ratios are the Ruling 24 constants', () => {
  assert.equal(SPEED_SLOW_RATIO, 0.8);
  assert.equal(SPEED_FAST_RATIO, 1.1);
});

test('waltz is 67 / 84 / 90 (Ruling 24)', () => {
  assert.deepEqual(speedPresetBpms(DANCE_PROFILES.waltz), { slow: 67, standard: 84, fast: 90 });
});

test('every dance: slower < standard < faster <= competition max, all integers', () => {
  for (const profile of Object.values(DANCE_PROFILES)) {
    const { slow, standard, fast } = speedPresetBpms(profile);
    assert.ok(slow < standard && standard < fast, `${profile.id}: ${slow} ${standard} ${fast}`);
    assert.ok(fast <= profile.competitionBpm.max, `${profile.id}: fast ${fast} > ${profile.competitionBpm.max}`);
    for (const value of [slow, standard, fast]) assert.ok(Number.isInteger(value), `${profile.id}: ${value}`);
  }
});

test('the documented examples from Ruling 24 hold', () => {
  assert.equal(speedPresetBpms(DANCE_PROFILES.tango).fast, 123);
  assert.equal(speedPresetBpms(DANCE_PROFILES.quickstep).fast, 176);
  assert.equal(speedPresetBpms(DANCE_PROFILES.jive).fast, 150);
});

test('clampBpm keeps 40..220 integers and rejects non-numbers', () => {
  assert.equal(clampBpm(84), 84);
  assert.equal(clampBpm(84.6), 85);
  assert.equal(clampBpm('90'), 90);
  assert.equal(clampBpm(10), BPM_MIN);
  assert.equal(clampBpm(999), BPM_MAX);
  for (const bad of [Number.NaN, Infinity, '', 'abc', null, undefined, [84], true]) assert.equal(clampBpm(bad), null, String(bad));
});

test('resolveBpm always returns a number and falls back to standard for a missing custom value', () => {
  const waltz = DANCE_PROFILES.waltz;
  assert.equal(resolveBpm(waltz, 'slow', undefined), 67);
  assert.equal(resolveBpm(waltz, 'custom', 100), 100);
  assert.equal(resolveBpm(waltz, 'custom', 500), 220);
  assert.equal(resolveBpm(waltz, 'custom', undefined), 84);
  assert.equal(typeof resolveBpm(waltz, 'custom', '96' as unknown as number), 'number');
});
