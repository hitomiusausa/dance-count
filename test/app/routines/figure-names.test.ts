import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIGURE_CHOICES_MAX, FIGURE_SUGGESTIONS_MAX, figureNameChoices, figureNameSuggestions, foldFigureName, hasFigureNameSuggestions, hiraganaToKatakana, spellingKey
} from '../../../src/app/routines/figure-names.ts';

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

// D20・Ruling 54: 名前が空の追加の行に出す、種目ごとの照合済みフィガーの一覧（定義順・verified だけ・切らない）
test('figureNameChoices lists every verified figure of the dance in definition order, in the UI language (Ruling 54 (a))', () => {
  const ja = figureNameChoices('waltz', 'ja-JP');
  assert.equal(ja.length, 17);
  assert.equal(ja[0], 'クローズドチェンジ');
  assert.equal(ja.at(-1), 'フォーラウェイリバース＆スリップピボット');
  assert.equal(figureNameChoices('waltz', 'en')[0], 'Closed Changes');
  assert.deepEqual(figureNameChoices('vwaltz', 'ja-JP'), []);
  assert.deepEqual(figureNameChoices('vwaltz', 'en'), []);
});

test('the number of choices per dance is fixed by this table (Ruling 54 (b))', () => {
  const expected = { waltz: 17, tango: 19, slowfox: 11, quickstep: 5, vwaltz: 0, rumba: 14, chacha: 16, samba: 10, pasodoble: 10, jive: 6 };
  const actual = Object.fromEntries(Object.keys(expected).map(danceId => [danceId, figureNameChoices(danceId, 'ja-JP').length]));
  assert.deepEqual(actual, expected);
  for (const danceId of Object.keys(expected)) assert.equal(figureNameChoices(danceId, 'en').length, expected[danceId as keyof typeof expected], danceId);
});

test('choices stay within FIGURE_CHOICES_MAX, have no duplicates, and a tapped choice shows no further suggestions (Ruling 54 (c))', () => {
  for (const danceId of ['waltz', 'tango', 'slowfox', 'quickstep', 'vwaltz', 'rumba', 'chacha', 'samba', 'pasodoble', 'jive']) {
    for (const locale of ['ja-JP', 'en'] as const) {
      const choices = figureNameChoices(danceId, locale);
      assert.ok(choices.length <= FIGURE_CHOICES_MAX, `${danceId} ${locale}: ${choices.length} > ${FIGURE_CHOICES_MAX}`);
      assert.equal(new Set(choices.map(foldFigureName)).size, choices.length, `${danceId} ${locale} has duplicates`);
      for (const name of choices) assert.deepEqual(figureNameSuggestions(danceId, name, locale), [], `${danceId} ${locale} ${name}`);
    }
  }
});

// 375 幅のチップの文字幅 ≒ 291px＝18px で全角約 16 字・半角約 30 字／行（Ruling 54-5）。2 行に収まる上限を余裕をもって
// 日本語 28 字・英語 52 字とする（今の最長 24／32 字）。超える名前を足す時は見た目の裁定が要る。
test('choice names are short enough to fit in two lines of a 375px chip (Ruling 54 (d))', () => {
  for (const danceId of ['waltz', 'tango', 'slowfox', 'quickstep', 'rumba', 'chacha', 'samba', 'pasodoble', 'jive']) {
    for (const name of figureNameChoices(danceId, 'ja-JP')) assert.ok([...name].length <= 28, `${danceId} ja "${name}"`);
    for (const name of figureNameChoices(danceId, 'en')) assert.ok(name.length <= 52, `${danceId} en "${name}"`);
  }
});

// D21・Ruling 54-8・9: ひらがなとカタカナは同じ名前。「選び終えた」の判定だけは綴り（かなを畳まない）で見る
test('hiragana folds to katakana inside foldFigureName only (Ruling 54 (g))', () => {
  assert.equal(hiraganaToKatakana('うぃすく'), 'ウィスク');
  assert.equal(hiraganaToKatakana('ゔ'), 'ヴ');
  assert.equal(hiraganaToKatakana('ー・＆abc'), 'ー・＆abc');
  assert.equal(foldFigureName('べーしっく '), 'ベーシック');
  assert.equal(foldFigureName('ｳｨｽｸ'), 'ウィスク');
  assert.equal(foldFigureName('ｳﾞｨｴﾆｰｽﾞ'), 'ヴィエニーズ');
  assert.equal(foldFigureName('Whisk'), 'whisk');
  assert.notEqual(foldFigureName('ナチュラル ターン'), foldFigureName('ナチュラルターン'));
  assert.equal(spellingKey(' ｗｈｉｓｋ'), 'whisk');
  assert.equal(spellingKey('うぃすく'), 'うぃすく');
});

test('hiragana finds katakana names, and an unconverted spelling keeps its suggestions (Ruling 54 (h))', () => {
  assert.deepEqual(figureNameSuggestions('waltz', 'うぃ', 'ja-JP'), ['ウィスク', 'バックウィスク', 'ウィーブ フロム PP']);
  assert.deepEqual(figureNameSuggestions('waltz', 'うぃすく', 'ja-JP'), ['ウィスク', 'バックウィスク']);
  assert.deepEqual(figureNameSuggestions('waltz', 'ウィスク', 'ja-JP'), []);
  assert.deepEqual(figureNameSuggestions('waltz', 'うぃーぶ', 'en'), ['Weave from PP']);
});
