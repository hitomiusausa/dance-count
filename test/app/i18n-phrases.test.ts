// 段8（Ruling 97）: 日本語の文を句の境で折る。JSON は BudouX が作り、文字列そのものは変えない。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadDefaultJapaneseParser } from 'budoux';
import { APP_MESSAGES } from '../../src/app/i18n/messages.ts';
import { createAppTranslator } from '../../src/app/i18n/index.ts';
import { phraseParts } from '../../src/app/i18n/phrase-parts.ts';
import JA_PHRASES from '../../src/app/i18n/ja-phrases.json' with { type: 'json' };
import { PHRASES_PATH, renderPhrases, segmentText } from '../../tools/i18n/segment-ja.js';

const root = path.resolve(import.meta.dirname, '../..');
const PHRASES = JA_PHRASES as Record<string, string[]>;
const JA = APP_MESSAGES['ja-JP'] as Record<string, string>;
const joined = (parts: ReturnType<typeof phraseParts>) => parts.map(part => part.text).join('');

test('the committed ja-phrases.json is not stale (run npm run i18n:phrases after changing messages.ts or about.ts)', async () => {
  assert.equal(await renderPhrases(root), fs.readFileSync(path.join(root, PHRASES_PATH), 'utf8'));
});

test('every phrase list rebuilds its Japanese text exactly and never cuts a {placeholder}', () => {
  for (const [key, chunks] of Object.entries(PHRASES)) {
    if (key in JA) assert.equal(chunks.join(''), JA[key], key);
    for (const chunk of chunks) assert.equal((chunk.match(/\{/g) ?? []).length, (chunk.match(/\}/g) ?? []).length, `${key}: "${chunk}"`);
    assert.ok(chunks.length > 1, `${key} has one phrase (one-phrase texts are left out)`);
  }
});

test('no break next to a hand-set no-break mark (U+00A0・U+2060), but the rest of the sentence still breaks at phrases', () => {
  for (const [key, chunks] of Object.entries(PHRASES)) {
    chunks.slice(0, -1).forEach((chunk, index) => {
      assert.ok(!/[\u00A0\u2060]$/.test(chunk) && !/^[\u00A0\u2060]/.test(chunks[index + 1]), `${key}: break next to a no-break mark after "${chunk}"`);
    });
  }
  assert.ok(PHRASES.receiveHelpLine.length > 1, 'the long S10 line keeps phrase breaks outside its hand-set label');
  const fake = { parse: () => ['7\u00A0', '/\u00A012', '語まで', '録音済み'] };
  assert.deepEqual(segmentText(fake, '7\u00A0/\u00A012語まで録音済み'), ['7\u00A0/\u00A012', '語まで', '録音済み']);
});

test('a placeholder that BudouX would split is joined back into one phrase', () => {
  const fake = { parse: () => ['{na', 'me}さんの', '声'] };
  assert.deepEqual(segmentText(fake, '{name}さんの声'), ['{name}さんの', '声']);
});

test('parts break only at phrase boundaries, keep 「…」 and 押します。 whole, and read the same as translator.t()', () => {
  const ja = createAppTranslator('ja-JP');
  const parts = phraseParts(JA.installIntro, PHRASES.installIntro);
  assert.equal(joined(parts), ja.t('installIntro'));
  assert.deepEqual(parts.filter(part => part.breakBefore).length, PHRASES.installIntro.length - 1);
  const step = phraseParts(JA.installIosStep3, PHRASES.installIosStep3);
  assert.equal(joined(step), JA.installIosStep3);
  assert.ok(step.some(part => part.label && part.text === '「もっと見る」'));
  assert.ok(step.some(part => part.label && part.text === '押します。'));
  assert.ok(step.filter(part => part.label).every(part => !part.text.includes('<')), 'labels are plain text');
  assert.equal(step[0].breakBefore, false, 'never a break before the first part');
});

test('variables are filled inside a phrase, so a name is one unbreakable piece of the text', () => {
  const parts = phraseParts('{name}さんの声で鳴ります。', ['{name}さんの', '声で', '鳴ります。'], { name: '山田 花子' });
  assert.deepEqual(parts.map(part => [part.text, part.breakBefore]), [['山田 花子さんの', false], ['声で', true], ['鳴ります。', true]]);
});

test('English and stale phrase lists give no break points (the browser breaks at spaces)', () => {
  const en = phraseParts(APP_MESSAGES.en.installIosStep3, undefined);
  assert.equal(joined(en), APP_MESSAGES.en.installIosStep3);
  assert.ok(en.every(part => !part.breakBefore));
  assert.ok(en.some(part => part.label && part.text.startsWith('“')), 'a “…” label stays whole in English too');
  const stale = phraseParts('新しい文です。', ['古い', '文です。']);
  assert.deepEqual(stale.map(part => part.breakBefore), [false]);
});

test('one way of breaking: auto-phrase is gone, and keep-all sits only on the phrased wrapper (Ruling 97-5)', () => {
  const css = fs.readFileSync(path.join(root, 'src/app/styles/base.css'), 'utf8');
  assert.doesNotMatch(css, /word-break:\s*auto-phrase/);
  assert.match(css, /\.dc-phrased \{ word-break: keep-all; overflow-wrap: anywhere; \}/);
});
