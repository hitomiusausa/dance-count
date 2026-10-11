import test from 'node:test';
import assert from 'node:assert/strict';
import { DANCE_PROFILES } from '../../../src/engine/dance-profiles.js';
import { displayForVoiceKey, formatCounts } from '../../../src/app/lib/count-display.ts';

test('dance subtitles are the first template (Ruling 22 table)', () => {
  const expected: Record<string, string> = {
    waltz: '1 2 3', tango: 'S S Q Q S', vwaltz: '1 2 3', slowfox: 'S Q Q', quickstep: 'S Q Q',
    rumba: '2 3 4 1', chacha: '2 3 4 & 1', samba: '1 a 2', pasodoble: '1 2 3 4', jive: '1 2 3 a 4 5 a 6'
  };
  for (const profile of Object.values(DANCE_PROFILES)) {
    assert.equal(formatCounts(profile.id, profile.templates[0]), expected[profile.id], profile.id);
  }
});

test('alternative patterns format the same way', () => {
  assert.equal(formatCounts('waltz', '12&3'), '1 2 & 3');
  assert.equal(formatCounts('quickstep', 'QQS'), 'Q Q S');
  assert.equal(formatCounts('samba', 'SQQ'), 'S Q Q');
  assert.equal(formatCounts('pasodoble', '12345678'), '1 2 3 4 5 6 7 8');
});

test('each voice key has one display word, the same in every language (Ruling 28)', () => {
  const keys = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'slow', 'quick', 'and', 'ah'];
  assert.deepEqual(keys.map(displayForVoiceKey), ['1', '2', '3', '4', '5', '6', '7', '8', 'S', 'Q', '&', 'a']);
  for (const nothing of [null, undefined, '', 'nine', 'toString']) assert.equal(displayForVoiceKey(nothing), '', String(nothing));
});

test('no subtitle mentions a time signature', () => {
  for (const profile of Object.values(DANCE_PROFILES)) assert.doesNotMatch(formatCounts(profile.id, profile.templates[0]), /\d\/\d|拍子/);
});
