// 段8 Task 12（final-review I1）: 種目タイルの名前は語の境でだけ折る。区切りの表は文字を変えない。
import test from 'node:test';
import assert from 'node:assert/strict';
import { DANCE_NAMES } from '../../src/engine/ui-messages.js';
import { APP_LOCALES, danceName } from '../../src/app/i18n/index.ts';
import { danceNameWords } from '../../src/app/i18n/dance-name-words.ts';

test('dance name words rebuild the displayed name exactly, in every locale', () => {
  for (const danceId of Object.keys(DANCE_NAMES)) {
    for (const locale of APP_LOCALES) assert.equal(danceNameWords(danceId, locale).join(''), danceName(danceId, locale), `${danceId} ${locale}`);
  }
});

test('the long Japanese names that broke mid-word at 320/360 (I1) have word breaks', () => {
  assert.deepEqual(danceNameWords('vwaltz', 'ja-JP'), ['ヴィエニーズ', 'ワルツ']);
  assert.deepEqual(danceNameWords('slowfox', 'ja-JP'), ['スロー', 'フォックス']);
  assert.deepEqual(danceNameWords('quickstep', 'ja-JP'), ['クイック', 'ステップ']);
  assert.deepEqual(danceNameWords('vwaltz', 'en'), ['Viennese Waltz'], 'English breaks at its own spaces');
});
