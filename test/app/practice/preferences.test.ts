import test from 'node:test';
import assert from 'node:assert/strict';
import { DANCE_PROFILES } from '../../../src/engine/dance-profiles.js';
import { DEFAULT_SETTINGS, type AppSettings } from '../../../src/app/settings/settings.ts';
import { LEAD_IN_BARS, chooseCustomBpm, choosePreset, chooseTemplate, practiceChoice, practiceCounts, practiceLeadInBars } from '../../../src/app/practice/preferences.ts';

const waltz = DANCE_PROFILES.waltz;
const apply = (settings: AppSettings, patch: Partial<AppSettings>): AppSettings => ({ ...settings, ...patch });

test('first visit: first template, standard speed (Ruling 13・18)', () => {
  assert.deepEqual(practiceChoice(waltz, DEFAULT_SETTINGS), { counts: '123', speed: 'standard', bpm: 84, customBpm: null });
});

test('presets and templates are remembered per dance', () => {
  let settings = apply(DEFAULT_SETTINGS, choosePreset(DEFAULT_SETTINGS, 'waltz', 'slow'));
  settings = apply(settings, chooseTemplate(settings, waltz, '12&3'));
  assert.deepEqual(practiceChoice(waltz, settings), { counts: '12&3', speed: 'slow', bpm: 67, customBpm: null });
  assert.deepEqual(practiceChoice(DANCE_PROFILES.tango, settings), { counts: 'SSQQS', speed: 'standard', bpm: 112, customBpm: null });
});

test('a custom value unchecks the three choices and shows ♩=value (Ruling 31)', () => {
  const settings = apply(DEFAULT_SETTINGS, chooseCustomBpm(DEFAULT_SETTINGS, waltz, 100));
  assert.deepEqual(practiceChoice(waltz, settings), { counts: '123', speed: 'custom', bpm: 100, customBpm: 100 });
});

test('a custom value equal to a preset becomes that preset (competition 84 = standard for waltz)', () => {
  const custom = apply(DEFAULT_SETTINGS, chooseCustomBpm(DEFAULT_SETTINGS, waltz, 100));
  const settings = apply(custom, chooseCustomBpm(custom, waltz, waltz.competitionBpm.min));
  assert.deepEqual(practiceChoice(waltz, settings), { counts: '123', speed: 'standard', bpm: 84, customBpm: null });
  assert.equal(settings.customBpmByDance.waltz, undefined);
});

test('pressing a preset forgets the custom value', () => {
  const custom = apply(DEFAULT_SETTINGS, chooseCustomBpm(DEFAULT_SETTINGS, waltz, 100));
  const settings = apply(custom, choosePreset(custom, 'waltz', 'fast'));
  assert.equal(settings.customBpmByDance.waltz, undefined);
  assert.equal(practiceChoice(waltz, settings).bpm, 90);
});

test('custom values are clamped; garbage is ignored; unknown templates are refused', () => {
  assert.equal(practiceChoice(waltz, apply(DEFAULT_SETTINGS, chooseCustomBpm(DEFAULT_SETTINGS, waltz, 999))).bpm, 220);
  assert.deepEqual(chooseCustomBpm(DEFAULT_SETTINGS, waltz, 'abc'), {});
  assert.deepEqual(chooseTemplate(DEFAULT_SETTINGS, waltz, '1234'), {});
});

test('a custom choice without a stored value falls back to standard', () => {
  const settings = { ...DEFAULT_SETTINGS, speedPresetByDance: { waltz: 'custom' as const } };
  assert.deepEqual(practiceChoice(waltz, settings), { counts: '123', speed: 'standard', bpm: 84, customBpm: null });
});

test('lead-in switch: off = 0, on = LEAD_IN_BARS (2 bars, D17); stored 0|1 needs no migration', () => {
  assert.equal(LEAD_IN_BARS, 2);
  assert.equal(practiceLeadInBars({ ...DEFAULT_SETTINGS, countInBars: 1 }), 2);
  assert.equal(practiceLeadInBars({ ...DEFAULT_SETTINGS, countInBars: 0 }), 0);
  assert.equal(practiceLeadInBars(DEFAULT_SETTINGS), 2);
});

test('a reviewed figure decides the counts; without one the remembered pattern does (D57・Ruling 120-3)', () => {
  const remembered = apply(DEFAULT_SETTINGS, { lastTemplateByDance: { waltz: '12&3' } });
  assert.equal(practiceCounts(waltz, remembered, { counts: '123123' }), '123123', 'two-bar figures are counts too');
  assert.equal(practiceCounts(waltz, remembered, null), '12&3');
  assert.equal(practiceCounts(waltz, DEFAULT_SETTINGS, null), waltz.templates[0]);
});
