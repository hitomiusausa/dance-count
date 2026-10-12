import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIGURE_CHOICES_MAX, FIGURE_SUGGESTIONS_MAX, buildFigureIdentity, figureDisplayName, figureIdentity, figureNameChoices, figureNameSuggestions, figureSlug,
  foldFigureName, hasFigureNameSuggestions, hiraganaToKatakana, isFigureSlug, spellingKey
} from '../../../src/app/routines/figure-names.ts';
import { DANCE_PROFILES } from '../../../src/engine/dance-profiles.js';

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

// D22: 同じフィガーなら同じ名前。同じ種目の照合済みフィガーに当たれば日本語の別名・英語名・かなを問わず同じ印、当たらなければ畳んだ綴り。
test('figureIdentity: ウィスク = Whisk = うぃすく in waltz, aliases of one figure are one figure (D22)', () => {
  const whisk = figureIdentity('waltz', 'ウィスク');
  assert.ok(!whisk.startsWith('text:'));
  for (const name of ['Whisk', 'whisk ', 'うぃすく', 'ｳｨｽｸ', 'ＷＨＩＳＫ']) assert.equal(figureIdentity('waltz', name), whisk, name);
  assert.equal(figureIdentity('waltz', 'クローズド・チェンジ'), figureIdentity('waltz', 'Closed Changes'));
  assert.equal(figureIdentity('waltz', 'クローズドチェンジ'), figureIdentity('waltz', 'クローズド・チェンジ'));
  assert.notEqual(figureIdentity('waltz', 'Back Whisk'), whisk);
});

test('figureIdentity: the same text in another dance is a different figure (D22)', () => {
  assert.notEqual(figureIdentity('waltz', 'Natural Turn'), figureIdentity('slowfox', 'Natural Turn'));
  assert.notEqual(figureIdentity('waltz', 'ナチュラルターン'), figureIdentity('slowfox', 'ナチュラルターン'));
  assert.equal(figureIdentity('slowfox', 'ナチュラルターン'), figureIdentity('slowfox', 'Natural Turn'));
  // タンゴに Whisk は登録が無い＝自由入力の名前として綴りで比べる（日英は結びつかない）
  assert.equal(figureIdentity('tango', 'Whisk'), 'text:whisk');
  assert.notEqual(figureIdentity('tango', 'ウィスク'), figureIdentity('tango', 'Whisk'));
  assert.equal(figureIdentity('vwaltz', 'ウィスク'), 'text:ウィスク');
});

test('figureIdentity: names not in the registry compare by their folded spelling (D22)', () => {
  assert.equal(figureIdentity('waltz', 'べーしっく '), 'text:ベーシック');
  assert.equal(figureIdentity('waltz', 'ベーシック'), figureIdentity('waltz', 'べーしっく'));
  assert.equal(figureIdentity('waltz', 'My Step'), figureIdentity('waltz', ' my step'));
  assert.notEqual(figureIdentity('waltz', 'ナチュラル ターン'), figureIdentity('waltz', 'ナチュラルターン'));
  // 登録簿の名前と同じ綴りの自由入力（'text:…'）が照合済みの印と混ざらない
  assert.notEqual(figureIdentity('waltz', 'Whisk'), 'text:whisk');
});

test('figureIdentity: a name shared by two verified figures in one dance is ambiguous and compares by spelling (D22)', () => {
  const entry = (englishName: string, sourceAliases: string[], claimStatus = 'verified') => ({ danceId: 'waltz', englishName, sourceAliases, claimStatus });
  const identity = buildFigureIdentity([
    entry('Alpha Turn', ['ターン', 'アルファ']),
    entry('Beta Turn', ['ターン', 'ベータ']),
    entry('Gamma', ['ガンマ', 'がんま']),
    entry('Delta', ['デルタ'], 'unverified')
  ]);
  assert.equal(identity('waltz', 'ターン'), 'text:ターン');
  assert.equal(identity('waltz', 'たーん'), 'text:ターン');
  assert.equal(identity('waltz', 'アルファ'), identity('waltz', 'Alpha Turn'));
  assert.notEqual(identity('waltz', 'アルファ'), identity('waltz', 'ベータ'));
  assert.equal(identity('waltz', 'ガンマ'), identity('waltz', 'Gamma'));   // 1 つのフィガーの 2 つの別名が同じに畳まれても曖昧ではない
  assert.equal(identity('waltz', 'デルタ'), 'text:デルタ');                 // 未照合は登録簿に無いのと同じ
  assert.equal(identity('waltz', 'Delta'), 'text:delta');
});

test('the real registry has no name shared by two figures in one dance (D22)', () => {
  for (const danceId of ['waltz', 'tango', 'slowfox', 'quickstep', 'rumba', 'chacha', 'samba', 'pasodoble', 'jive']) {
    for (const locale of ['ja-JP', 'en'] as const) {
      for (const name of figureNameChoices(danceId, locale)) assert.ok(!figureIdentity(danceId, name).startsWith('text:'), `${danceId} "${name}"`);
    }
  }
});

// D57（Ruling 120-1・120-2・122-3）: 経路のフィガーの印と表示名
test('figureSlug folds an English name into a path segment', () => {
  assert.equal(figureSlug('Chasse from PP'), 'chasse-from-pp');
  assert.equal(figureSlug('Natural Turn'), 'natural-turn');
  assert.equal(figureSlug('Fallaway Reverse and Slip Pivot'), 'fallaway-reverse-and-slip-pivot');
  assert.equal(figureSlug(' Back  Lock! '), 'back-lock');
  assert.ok(isFigureSlug('whisk') && !isFigureSlug('Whisk') && !isFigureSlug('a b') && !isFigureSlug('') && !isFigureSlug('-x') && !isFigureSlug(3));
});

test('every verified figure has a slug that fits a route segment and is unique within its dance (Ruling 120-1)', () => {
  let count = 0;
  for (const danceId of Object.keys(DANCE_PROFILES)) {
    const slugs = figureNameChoices(danceId, 'en').map(figureSlug);
    count += slugs.length;
    for (const slug of slugs) assert.ok(isFigureSlug(slug) && /^[A-Za-z0-9_-]+$/.test(slug), `${danceId} ${slug}`);
    assert.equal(new Set(slugs).size, slugs.length, `${danceId} has a duplicate slug`);
  }
  assert.ok(count > 0);
});

test('figureDisplayName shows the verified name in the UI language (the same spelling as the S4 list)', () => {
  assert.equal(figureDisplayName('waltz', 'Whisk', 'ja-JP'), 'ウィスク');
  assert.equal(figureDisplayName('waltz', 'Whisk', 'en'), 'Whisk');
  assert.equal(figureDisplayName('waltz', 'Chasse from PP', 'ja-JP'), 'シャッセ フロム PP');
  assert.equal(figureDisplayName('waltz', 'Not A Figure', 'ja-JP'), 'Not A Figure');
});
