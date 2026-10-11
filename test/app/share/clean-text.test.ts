import test from 'node:test';
import assert from 'node:assert/strict';
import { stripInvisible } from '../../../src/app/share/clean-text.ts';

test('invisible control and direction characters are removed; everything else stays (stage-5 review)', () => {
  assert.equal(stripInvisible('\u202e山田\u202c先生'), '山田先生');
  assert.equal(stripInvisible('\u2066ワルツ\u2069\u200f'), 'ワルツ');
  assert.equal(stripInvisible('a\u0000b\nc\u009fd\u061c'), 'abcd');
  assert.equal(stripInvisible('普通の名前 (1)・ナチュラルターン'), '普通の名前 (1)・ナチュラルターン');
  assert.equal(stripInvisible('\u202e\u0007'), '');
});
