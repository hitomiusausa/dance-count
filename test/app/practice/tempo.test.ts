import test from 'node:test';
import assert from 'node:assert/strict';
import { DANCE_PROFILES } from '../../../src/engine/dance-profiles.js';
import { barsPerMinute, formatTempo, musicBeatsPerBar, tempoText } from '../../../src/app/practice/tempo.ts';
import { APP_MESSAGES } from '../../../src/app/i18n/messages.ts';
import { createAppTranslator } from '../../../src/app/i18n/index.ts';

test('D71: tempo (bars per minute) = ♩ ÷ beats per bar', () => {
  assert.equal(barsPerMinute('waltz', 84), 28);
  assert.equal(barsPerMinute('quickstep', 200), 50);
  assert.equal(barsPerMinute('vwaltz', 180), 60);
  assert.equal(barsPerMinute('samba', 100), 50);
  assert.equal(barsPerMinute('jive', 176), 44);
});

test('D71: paso doble is 2/4 music — its tempo is ♩ ÷ 2 (competition 60–62), not the 4-count practice bar', () => {
  assert.equal(musicBeatsPerBar('pasodoble'), 2);
  assert.equal(DANCE_PROFILES.pasodoble.beatsPerBar, 4);   // 練習の数え方（強拍・帯）は変えない
  assert.equal(tempoText('pasodoble', 124), '62');
});

test('D71: integer when exact, otherwise one decimal (no trailing .0)', () => {
  assert.equal(formatTempo(28), '28');
  assert.equal(formatTempo(67 / 3), '22.3');
  assert.equal(formatTempo(123 / 4), '30.8');
  assert.equal(formatTempo(90 / 4), '22.5');
  assert.equal(formatTempo(27.96), '28');
  assert.equal(formatTempo(Number.NaN), '');
});

test('D71: competition ranges shown for every dance', () => {
  const expected: Record<string, [string, string]> = {
    waltz: ['28', '30'], tango: ['31', '34'], vwaltz: ['56', '60'], slowfox: ['28', '30'], quickstep: ['48', '52'],
    rumba: ['25', '27'], chacha: ['28', '32'], samba: ['50', '52'], pasodoble: ['56', '62'], jive: ['42', '44']
  };
  for (const [danceId, profile] of Object.entries(DANCE_PROFILES)) {
    assert.deepEqual([tempoText(danceId, profile.competitionBpm.min), tempoText(danceId, profile.competitionBpm.max)], expected[danceId], danceId);
  }
});

test('D71: Japanese buttons say テンポ, English buttons keep ♩; inside “More” both are shown', () => {
  const ja = createAppTranslator('ja-JP');
  const en = createAppTranslator('en');
  const vars = { tempo: 84, mpm: tempoText('waltz', 84) };
  assert.equal(ja.t('presetTempo', vars), 'テンポ28');
  assert.equal(en.t('presetTempo', vars), '♩=84');
  assert.equal(ja.t('fineTempo', vars), '♩=84（テンポ28）');
  assert.equal(en.t('fineTempo', vars), '♩=84 · 28 MPM');
  assert.equal(ja.t('competitionSpeed', { min: 84, max: 90, mpmMin: '28', mpmMax: '30' }), '競技の速さ（♩=84〜90・テンポ28〜30）');
  assert.equal(en.t('competitionSpeed', { min: 84, max: 90, mpmMin: '28', mpmMax: '30' }), 'Competition speed (♩=84–90 · 28–30 MPM)');
  assert.ok(!/MPM/.test(Object.values(APP_MESSAGES['ja-JP']).join('')), 'Japanese UI uses テンポ, not MPM');
});
