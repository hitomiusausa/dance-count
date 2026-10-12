import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_MESSAGES } from '../../src/app/i18n/messages.ts';
import { findForbiddenWords } from '../../src/app/i18n/forbidden-words.ts';
import { createAppTranslator, resolveAppLocale, danceName, APP_LOCALES } from '../../src/app/i18n/index.ts';
import { DANCE_PROFILES } from '../../src/engine/dance-profiles.js';

test('every locale defines exactly the same keys, none empty', () => {
  const [base, ...others] = APP_LOCALES;
  const baseKeys = Object.keys(APP_MESSAGES[base]).sort();
  for (const locale of others) {
    assert.deepEqual(Object.keys(APP_MESSAGES[locale]).sort(), baseKeys, `${locale} keys differ from ${base}`);
  }
  for (const locale of APP_LOCALES) {
    for (const [key, value] of Object.entries(APP_MESSAGES[locale])) {
      assert.ok(typeof value === 'string' && value.trim().length > 0, `${locale}:${key} is empty`);
    }
  }
});

test('UI strings contain no forbidden words (spec §6 U14)', () => {
  for (const locale of APP_LOCALES) {
    for (const [key, value] of Object.entries(APP_MESSAGES[locale])) {
      assert.deepEqual(findForbiddenWords(value), [], `${locale}:${key} = "${value}"`);
    }
  }
});

test('forbidden word detector catches each banned term and ignores lookalikes', () => {
  for (const sample of ['BPM 84', '読み込み', '書き出し', 'インポート', 'エクスポート', 'カウントイン', '音声パック', 'ボイスパック',
    '設定を保存', 'ストレージ', 'キャッシュ', '同期', 'エラーコード', 'Import a file', 'Export', 'voice pack', 'Storage', 'cache', 'Sync now', 'Error code 3']) {
    assert.notDeepEqual(findForbiddenWords(sample), [], `missed: ${sample}`);
  }
  for (const sample of ['Important', 'Synchronised swimming is not a word we use', 'Speed', 'Lead-in', 'Count-in', 'Voice', 'はじめの合図']) {
    assert.deepEqual(findForbiddenWords(sample), [], `false positive: ${sample}`);
  }
});

test('device languages resolve to ja-JP only for Japanese, English otherwise', () => {
  assert.equal(resolveAppLocale(['ja']), 'ja-JP');
  assert.equal(resolveAppLocale(['ja-JP', 'en-US']), 'ja-JP');
  assert.equal(resolveAppLocale(['en-GB']), 'en');
  assert.equal(resolveAppLocale(['fr-FR', 'ja-JP']), 'en');
  assert.equal(resolveAppLocale([]), 'en');
  assert.equal(resolveAppLocale(['not a tag!!']), 'en');
});

test('translator returns the locale string and falls back to English then the key', () => {
  assert.equal(createAppTranslator('ja-JP').t('tabPractice'), '練習');
  assert.equal(createAppTranslator('en').t('tabPractice'), 'Practice');
  assert.equal(createAppTranslator('de').t('tabPractice'), 'Practice');
});

test('every dance has a display name in both locales (dance-profiles name is not used for display)', () => {
  for (const danceId of Object.keys(DANCE_PROFILES)) {
    assert.ok(danceName(danceId, 'en'), `en name for ${danceId}`);
    assert.ok(danceName(danceId, 'ja-JP'), `ja name for ${danceId}`);
  }
  assert.equal(danceName('waltz', 'ja-JP'), 'ワルツ');
  assert.equal(danceName('slowfox', 'en'), 'Slow Foxtrot');
});

test('stage 8 settled copy: the voice limit says how many voices you already have (Ruling 96-4・段5 M6)', () => {
  assert.equal(createAppTranslator('ja-JP').t('voiceLimitReached', { count: 20 }), '声はすでに 20 あるので、受け取れません。使わない声を削除してから、もう一度選んでください。');
  assert.equal(createAppTranslator('en').t('voiceLimitReached', { count: 20 }), "You already have 20 voices. Delete one you don't use, then choose the file again.");
});
