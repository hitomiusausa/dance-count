import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, normalizeSettings } from '../../../src/app/settings/settings.ts';

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
    hints: { wakeLockTipShown: true }
  };
  assert.deepEqual(normalizeSettings(JSON.parse(JSON.stringify(saved))), saved);
});

test('broken or foreign values fall back field by field', () => {
  const settings = normalizeSettings({
    uiLocale: 'fr', voiceLocale: 'de', lastDanceId: 'hiphop',
    lastTemplateByDance: { waltz: '1234', tango: 'SSQQS', hiphop: '1' },
    speedPresetByDance: { waltz: 'turbo', rumba: 'slow' },
    customBpmByDance: { waltz: 'abc', samba: 999, jive: 30 },
    metronome: 'yes', countInBars: 2, loop: null, hints: 'none'
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
  assert.deepEqual(settings.hints, { wakeLockTipShown: false });
});
