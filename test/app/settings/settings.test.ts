import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, forgetRoutineSettings, normalizeSettings } from '../../../src/app/settings/settings.ts';

test('nothing saved yet gives the spec defaults (Ruling 13・D3)', () => {
  for (const raw of [undefined, null, 'x', 3, [], {}]) assert.deepEqual(normalizeSettings(raw), DEFAULT_SETTINGS, JSON.stringify(raw));
  assert.equal(DEFAULT_SETTINGS.voiceLocale, 'en');
  assert.equal(DEFAULT_SETTINGS.metronome, true);
  assert.equal(DEFAULT_SETTINGS.countInBars, 1);
  assert.equal(DEFAULT_SETTINGS.loop, true);
  assert.equal(DEFAULT_SETTINGS.lastDanceId, null);
});

test('valid saved values survive a round trip', () => {
  const saved = {
    ...DEFAULT_SETTINGS,
    uiLocale: 'ja-JP', lastDanceId: 'jive',
    lastTemplateByDance: { waltz: '12&3' }, speedPresetByDance: { waltz: 'custom', tango: 'fast' },
    customBpmByDance: { waltz: 100 }, metronome: false, countInBars: 0, loop: false,
    speedPresetByRoutine: { 'r-aaaaaaaa': 'fast' }, customBpmByRoutine: { 'r-bbbbbbbb': 120 },
    distributorName: '山田',
    hints: { wakeLockTipShown: true, backupTipShownForRecording: true, backupTipShownForRoutine: false }
  };
  assert.deepEqual(normalizeSettings(JSON.parse(JSON.stringify(saved))), saved);
});

test('broken or foreign values fall back field by field', () => {
  const settings = normalizeSettings({
    uiLocale: 'fr', voiceLocale: 'de', lastDanceId: 'hiphop',
    lastTemplateByDance: { waltz: '1234', tango: 'SSQQS', hiphop: '1' },
    speedPresetByDance: { waltz: 'turbo', rumba: 'slow' },
    customBpmByDance: { waltz: 'abc', samba: 999, jive: 30 },
    metronome: 'yes', countInBars: 2, loop: null, hints: 'none',
    speedPresetByRoutine: { 'r-aaaaaaaa': 'slow', new: 'fast', 'r-bbbbbbbb': 'turbo' },
    customBpmByRoutine: { 'r-aaaaaaaa': 300, waltz: 90 }
  });
  assert.equal(settings.uiLocale, null);
  assert.equal(settings.voiceLocale, 'en');
  assert.equal(settings.lastDanceId, null);
  assert.deepEqual(settings.lastTemplateByDance, { tango: 'SSQQS' });
  assert.deepEqual(settings.speedPresetByDance, { rumba: 'slow' });
  assert.deepEqual(settings.customBpmByDance, { samba: 220, jive: 40 });
  assert.equal(settings.metronome, true);
  assert.equal(settings.countInBars, 1);
  assert.equal(settings.loop, true);
  assert.deepEqual(settings.hints, { wakeLockTipShown: false, backupTipShownForRecording: false, backupTipShownForRoutine: false });
  assert.deepEqual(settings.speedPresetByRoutine, { 'r-aaaaaaaa': 'slow' });
  assert.deepEqual(settings.customBpmByRoutine, { 'r-aaaaaaaa': 220 });
});

test('deleting a routine forgets its speed memory only', () => {
  const settings = normalizeSettings({
    speedPresetByRoutine: { 'r-aaaaaaaa': 'slow', 'r-bbbbbbbb': 'fast' }, customBpmByRoutine: { 'r-aaaaaaaa': 100 }
  });
  assert.deepEqual(forgetRoutineSettings(settings, 'r-aaaaaaaa'), { speedPresetByRoutine: { 'r-bbbbbbbb': 'fast' }, customBpmByRoutine: {} });
});

test('a recorded or received voice id is kept; a malformed one falls back to the standard voice (Ruling 61-1)', () => {
  assert.equal(normalizeSettings({ selectedVoiceId: 'user-recorded-v1' }).selectedVoiceId, 'user-recorded-v1');
  assert.equal(normalizeSettings({ selectedVoiceId: 'v-recv_01' }).selectedVoiceId, 'v-recv_01');
  for (const bad of ['', 'a b', '../x', 'x'.repeat(65), 3, null]) {
    assert.equal(normalizeSettings({ selectedVoiceId: bad }).selectedVoiceId, 'default-en-female-v1', String(bad));
  }
  assert.equal(DEFAULT_SETTINGS.selectedVoiceId, 'default-en-female-v1');
});

test('voice offsets keep integers within ±200 under valid ids and drop zeros (Ruling 61-1・62)', () => {
  const settings = normalizeSettings({ voiceOffsetMsByVoiceId: { 'default-en-female-v1': -20, 'user-recorded-v1': 0, big: 300, frac: 1.5, 'a b': 10, str: '10' } });
  assert.deepEqual(settings.voiceOffsetMsByVoiceId, { 'default-en-female-v1': -20 });
  assert.deepEqual(normalizeSettings({ voiceOffsetMsByVoiceId: 'x' }).voiceOffsetMsByVoiceId, {});
  assert.deepEqual(DEFAULT_SETTINGS.voiceOffsetMsByVoiceId, {});
});

test('the sharer name is kept trimmed to 40 characters; anything else is empty (Ruling 82-2・86-6)', () => {
  assert.equal(normalizeSettings({ distributorName: '  山田  ' }).distributorName, '山田');
  assert.equal(normalizeSettings({ distributorName: 'あ'.repeat(45) }).distributorName, 'あ'.repeat(40));
  for (const bad of [3, null, ['山田'], { name: '山田' }]) assert.equal(normalizeSettings({ distributorName: bad }).distributorName, '', String(bad));
  assert.equal(DEFAULT_SETTINGS.distributorName, '');
});

test('the backup hints start unshown and stay shown once true (Ruling 86-2・86-3・86-6)', () => {
  assert.deepEqual(DEFAULT_SETTINGS.hints, { wakeLockTipShown: false, backupTipShownForRecording: false, backupTipShownForRoutine: false });
  const shown = normalizeSettings({ hints: { backupTipShownForRecording: true, backupTipShownForRoutine: true } });
  assert.equal(shown.hints.backupTipShownForRecording, true);
  assert.equal(shown.hints.backupTipShownForRoutine, true);
  assert.equal(shown.hints.wakeLockTipShown, false);
});

test('broken hint values read as not shown yet', () => {
  const settings = normalizeSettings({ hints: { backupTipShownForRecording: 'yes', backupTipShownForRoutine: 1 } });
  assert.equal(settings.hints.backupTipShownForRecording, false);
  assert.equal(settings.hints.backupTipShownForRoutine, false);
});
