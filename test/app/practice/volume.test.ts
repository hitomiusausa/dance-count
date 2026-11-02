import test from 'node:test';
import assert from 'node:assert/strict';
import { VOLUME_DEFAULT, clampVolumePercent, volumeGain } from '../../../src/app/practice/volume.ts';
import { DEFAULT_SETTINGS, normalizeSettings } from '../../../src/app/settings/settings.ts';

test('D73: 100% is today’s level, 0% is silent, the curve follows the ear (squared)', () => {
  assert.equal(volumeGain(100), 1);
  assert.equal(volumeGain(0), 0);
  assert.equal(volumeGain(50), 0.25);
  assert.equal(volumeGain(150), 1);
});

test('D73: volumes default to 100 and are kept as whole percents', () => {
  assert.equal(DEFAULT_SETTINGS.voiceVolume, VOLUME_DEFAULT);
  assert.equal(DEFAULT_SETTINGS.clickVolume, VOLUME_DEFAULT);
  assert.deepEqual([normalizeSettings({}).voiceVolume, normalizeSettings({}).clickVolume], [100, 100]);
  const saved = normalizeSettings({ voiceVolume: 35, clickVolume: '80' });
  assert.deepEqual([saved.voiceVolume, saved.clickVolume], [35, 80]);
  assert.deepEqual([normalizeSettings({ voiceVolume: -5, clickVolume: 400 }).voiceVolume, normalizeSettings({ voiceVolume: -5, clickVolume: 400 }).clickVolume], [0, 100]);
  assert.equal(normalizeSettings({ voiceVolume: 'loud' }).voiceVolume, 100);
  assert.equal(clampVolumePercent(42.6), 43);
});
