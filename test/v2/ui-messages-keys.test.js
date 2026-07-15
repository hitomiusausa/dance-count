import test from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE_MESSAGES, EDITOR_MESSAGES } from '../../src/v2/ui-messages.js';

const PRACTICE_NEW_KEYS = ['languageToggle'];
const EDITOR_NEW_KEYS = ['languageToggle', 'speedShort', 'voiceShort', 'countInShort', 'settingsSummary'];

test('practice dictionaries define the redesign keys in both locales', () => {
  for (const locale of ['en', 'ja-JP']) {
    for (const key of PRACTICE_NEW_KEYS) {
      assert.ok(PRACTICE_MESSAGES[locale][key], `${locale}:${key}`);
    }
  }
});

test('editor dictionaries define the redesign keys in both locales', () => {
  for (const locale of ['en', 'ja-JP']) {
    for (const key of EDITOR_NEW_KEYS) {
      assert.ok(EDITOR_MESSAGES[locale][key], `${locale}:${key}`);
    }
  }
});
