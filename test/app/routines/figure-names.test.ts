import test from 'node:test';
import assert from 'node:assert/strict';
import { FIGURE_SUGGESTIONS_MAX, figureNameSuggestions, hasFigureNameSuggestions } from '../../../src/app/routines/figure-names.ts';

test('suggestions match Japanese aliases and English names, shown in the UI language', () => {
  assert.deepEqual(figureNameSuggestions('waltz', 'ウィ', 'ja-JP'), ['ウィスク', 'バックウィスク', 'ウィーブ フロム PP']);
  assert.deepEqual(figureNameSuggestions('waltz', 'whis', 'en'), ['Whisk', 'Back Whisk']);
  assert.deepEqual(figureNameSuggestions('waltz', 'ｗｈｉｓ', 'ja-JP'), ['ウィスク', 'バックウィスク']);
});

test('no query, no suggestions; a finished verified name shows none (in any of its spellings)', () => {
  assert.deepEqual(figureNameSuggestions('waltz', '', 'ja-JP'), []);
  assert.deepEqual(figureNameSuggestions('waltz', '  ', 'ja-JP'), []);
  for (const finished of ['ウィスク', 'Whisk', 'whisk', 'バック・ホイスク']) assert.deepEqual(figureNameSuggestions('waltz', finished, 'ja-JP'), [], finished);
  assert.deepEqual(figureNameSuggestions('tango', 'ウィスク', 'ja-JP'), []); // 他の種目の名前は「選び終えた」扱いにしない（候補も無い）
});

test('at most five suggestions, only from the same dance', () => {
  assert.ok(figureNameSuggestions('waltz', 'ン', 'ja-JP').length <= FIGURE_SUGGESTIONS_MAX);
  assert.deepEqual(figureNameSuggestions('tango', 'ウィスク', 'ja-JP'), []);
});

test('Viennese waltz has no verified names, so the suggestion area is not shown (Ruling 39)', () => {
  assert.equal(hasFigureNameSuggestions('vwaltz'), false);
  for (const danceId of ['waltz', 'tango', 'slowfox', 'quickstep', 'rumba', 'chacha', 'samba', 'pasodoble', 'jive']) {
    assert.equal(hasFigureNameSuggestions(danceId), true, danceId);
  }
});
