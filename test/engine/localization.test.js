import test from 'node:test';
import assert from 'node:assert/strict';

import { COUNT_VOCABULARIES, getCountVocabulary, vocabularyDisplayName } from '../../src/engine/count-vocabularies.js';
import { canonicalLanguageTag, createTranslator, isValidLanguageTag, resolveUiLocale } from '../../src/engine/localization.js';
import { createPracticeTranslator, danceDisplayName } from '../../src/engine/ui-messages.js';

test('BCP 47 locales canonicalize and unsupported UI locales fall back to English', () => {
  assert.equal(canonicalLanguageTag('ja-jp'), 'ja-JP');
  assert.equal(isValidLanguageTag('es-MX'), true);
  assert.equal(isValidLanguageTag('not_a_locale'), false);
  assert.equal(resolveUiLocale('ja'), 'ja-JP');
  assert.equal(resolveUiLocale('es-MX'), 'en');
});

test('translator uses the requested locale, base-language match, and English fallback', () => {
  const messages = { en: { hello: 'Hello {name}', fallback: 'English' }, 'ja-JP': { hello: 'こんにちは {name}' } };
  const japanese = createTranslator(messages, 'ja');
  assert.equal(japanese.locale, 'ja-JP');
  assert.equal(japanese.t('hello', { name: 'Mika' }), 'こんにちは Mika');
  assert.equal(japanese.t('fallback'), 'English');
});

test('count vocabularies are runtime-key compatible and independent of UI locale', () => {
  assert.equal(getCountVocabulary('ja').prompts.one[0], 'いち');
  assert.equal(getCountVocabulary('en-US').prompts.one[0], 'One');
  assert.equal(vocabularyDisplayName(COUNT_VOCABULARIES['ja-JP'], 'en'), 'Japanese counts');
  assert.deepEqual(Object.keys(COUNT_VOCABULARIES.en.prompts), Object.keys(COUNT_VOCABULARIES['ja-JP'].prompts));
});

test('practice UI language changes display names without changing dance ids or count tokens', () => {
  const english = createPracticeTranslator('en-US');
  const japanese = createPracticeTranslator('ja');
  assert.equal(english.t('play'), '▶ Play');
  assert.equal(japanese.t('play'), '▶ 再生');
  assert.equal(danceDisplayName('slowfox', english.locale), 'Slow Foxtrot');
  assert.equal(danceDisplayName('slowfox', japanese.locale), 'スローフォックス');
  assert.equal(english.t('figureSingular'), 'figure');
  assert.equal(english.t('figurePlural'), 'figures');
});
