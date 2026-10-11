import test from 'node:test';
import assert from 'node:assert/strict';
import { DANCE_PROFILES } from '../../../src/engine/dance-profiles.js';
import { chooseRoutineCustomBpm, chooseRoutinePreset, routineBaseBpm, routineLeadInBars, routinePracticeChoice, routineSpeedPresets } from '../../../src/app/practice/routine-preferences.ts';
import { DEFAULT_SETTINGS, normalizeSettings } from '../../../src/app/settings/settings.ts';

const WALTZ = DANCE_PROFILES.waltz;
const ID = 'r-aaaaaaaa';

test('no routine speed: the same three as practice (67 / 84 / 90)', () => {
  assert.deepEqual(routineSpeedPresets(WALTZ, null), { slow: 67, standard: 84, fast: 90 });
  assert.equal(routineBaseBpm(WALTZ, { bpm: null }), 84);
});

test('a teacher speed is the base: ×0.8 / base / ×1.1, not cut at the competition max (Ruling 40)', () => {
  assert.deepEqual(routineSpeedPresets(WALTZ, 100), { slow: 80, standard: 100, fast: 110 });
  assert.deepEqual(routineSpeedPresets(WALTZ, 150), { slow: 120, standard: 150, fast: 165 });
  assert.equal(routineBaseBpm(WALTZ, { bpm: 100 }), 100);
});

test('at the ends a choice equal to standard is left out (two choices)', () => {
  assert.deepEqual(routineSpeedPresets(WALTZ, 220), { slow: 176, standard: 220 });
  assert.deepEqual(routineSpeedPresets(WALTZ, 210), { slow: 168, standard: 210, fast: 220 });
  assert.deepEqual(routineSpeedPresets(WALTZ, 40), { standard: 40, fast: 44 });
  assert.deepEqual(routineSpeedPresets(WALTZ, 45), { slow: 40, standard: 45, fast: 50 });
});

test('the choice is remembered per routine and falls back to standard when gone', () => {
  const routine = { id: ID, bpm: 220 };
  const fast = normalizeSettings({ speedPresetByRoutine: { [ID]: 'fast' } });
  assert.deepEqual(routinePracticeChoice(WALTZ, routine, fast), { presets: { slow: 176, standard: 220 }, speed: 'standard', bpm: 220, customBpm: null });
  const slow = normalizeSettings({ speedPresetByRoutine: { [ID]: 'slow' } });
  assert.equal(routinePracticeChoice(WALTZ, routine, slow).bpm, 176);
  assert.equal(routinePracticeChoice(WALTZ, { id: 'r-bbbbbbbb', bpm: null }, slow).bpm, 84);
});

test('custom speed shows in "More options" and a preset clears it', () => {
  const routine = { id: ID, bpm: null };
  const patch = chooseRoutineCustomBpm(DEFAULT_SETTINGS, WALTZ, routine, 100);
  const settings = { ...DEFAULT_SETTINGS, ...patch };
  assert.deepEqual(routinePracticeChoice(WALTZ, routine, settings), { presets: { slow: 67, standard: 84, fast: 90 }, speed: 'custom', bpm: 100, customBpm: 100 });
  const back = { ...settings, ...chooseRoutinePreset(settings, ID, 'slow') };
  assert.deepEqual([back.speedPresetByRoutine[ID], back.customBpmByRoutine[ID]], ['slow', undefined]);
});

test('a custom value equal to a choice selects that choice (Ruling 31)', () => {
  const patch = chooseRoutineCustomBpm(DEFAULT_SETTINGS, WALTZ, { id: ID, bpm: 100 }, 110);
  assert.deepEqual(patch.speedPresetByRoutine, { [ID]: 'fast' });
  assert.deepEqual(chooseRoutineCustomBpm(DEFAULT_SETTINGS, WALTZ, { id: ID, bpm: 100 }, 'abc'), {});
});

test('lead-in: off in settings is 0; on uses the routine bars (Ruling 40)', () => {
  assert.equal(routineLeadInBars({ countInBars: 0 }, { countInBars: 2 }), 0);
  assert.equal(routineLeadInBars({ countInBars: 1 }, { countInBars: 2 }), 2);
  assert.equal(routineLeadInBars({ countInBars: 1 }, { countInBars: 1 }), 1);
});
