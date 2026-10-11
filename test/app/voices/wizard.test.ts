import test from 'node:test';
import assert from 'node:assert/strict';
import { packFixture } from '../helpers/voice-fixtures.ts';
import { createAppTranslator } from '../../../src/app/i18n/index.ts';
import { defaultVoiceName, firstMissingIndex, nextStep, previousStep, stepAfterStart, takeErrorOutcome, wordPrompts } from '../../../src/app/voices/wizard.ts';

test('start goes to the first missing word, or to the finished screen when all 12 are there (D25)', () => {
  assert.deepEqual(stepAfterStart(null), { kind: 'word', index: 0 });
  assert.deepEqual(stepAfterStart(packFixture('en', 7)), { kind: 'word', index: 7 });
  assert.deepEqual(stepAfterStart(packFixture('en', 12)), { kind: 'done' });
  assert.equal(firstMissingIndex(packFixture('en', 12)), null);
});

test('next only after the word is recorded, 12th leads to done; previous from the 2nd word (Ruling 59-4)', () => {
  const seven = packFixture('en', 7);
  assert.deepEqual(nextStep(seven, 6), { kind: 'word', index: 7 });
  assert.equal(nextStep(seven, 7), null, 'not recorded yet');
  assert.equal(nextStep(null, 0), null);
  assert.deepEqual(nextStep(packFixture('en', 12), 11), { kind: 'done' });
  assert.equal(previousStep(0), null);
  assert.deepEqual(previousStep(3), { kind: 'word', index: 2 });
});

test('prompts: the chosen vocabulary big, the other one small (Ruling 59-2)', () => {
  assert.deepEqual(wordPrompts('en', 'slow'), { main: 'Slow', other: 'スロー' });
  assert.deepEqual(wordPrompts('ja-JP', 'slow'), { main: 'スロー', other: 'Slow' });
  assert.deepEqual(wordPrompts('ja-JP', 'four'), { main: 'よん', other: 'Four' }, 'never the 「し」でも可 note');
  assert.deepEqual(wordPrompts('en', 'ah'), { main: 'a', other: 'ア' });
});

test('default names follow D23', () => {
  assert.equal(defaultVoiceName(createAppTranslator('ja-JP'), 'en'), '自分の声（英語）');
  assert.equal(defaultVoiceName(createAppTranslator('ja-JP'), 'ja-JP'), '自分の声（日本語）');
  assert.equal(defaultVoiceName(createAppTranslator('en'), 'ja-JP'), 'My voice (Japanese)');
});

test('a failed take mid-word stays on the word as "no voice"; only denied/unsupported go to the intro (Ruling 57-6・58-2)', () => {
  assert.equal(takeErrorOutcome('denied'), 'denied');
  assert.equal(takeErrorOutcome('unsupported'), 'unsupported');
  assert.equal(takeErrorOutcome('failed'), 'no-voice');
  assert.equal(takeErrorOutcome(null), 'no-voice');
  assert.equal(takeErrorOutcome('something-else'), 'no-voice');
});
