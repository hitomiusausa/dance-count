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

test('D73: the voice volume defaults to 100 and is kept as a whole percent', () => {
  assert.equal(DEFAULT_SETTINGS.voiceVolume, VOLUME_DEFAULT);
  assert.equal(normalizeSettings({}).voiceVolume, 100);
  assert.equal(normalizeSettings({ voiceVolume: 35 }).voiceVolume, 35);
  assert.equal(normalizeSettings({ voiceVolume: -5 }).voiceVolume, 0);
  assert.equal(normalizeSettings({ voiceVolume: 'loud' }).voiceVolume, 100);
  assert.equal(clampVolumePercent(42.6), 43);
});

test('D81: a saved D73 metronome percent carries over to the 0–1 metronome volume with the same loudness', () => {
  assert.equal(normalizeSettings({ clickVolume: 50 }).metronomeVolume, volumeGain(50));
  assert.equal(normalizeSettings({ clickVolume: '80' }).metronomeVolume, volumeGain(80));
  assert.equal(normalizeSettings({ clickVolume: 400 }).metronomeVolume, 1);
  assert.equal(normalizeSettings({ clickVolume: 50, metronomeVolume: 0.7 }).metronomeVolume, 0.7, 'the new value wins');
  assert.equal(normalizeSettings({}).metronomeVolume, 1);
  assert.equal('clickVolume' in normalizeSettings({ clickVolume: 50 }), false);
});
