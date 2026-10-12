import test from 'node:test';
import assert from 'node:assert/strict';
import { packFixture } from '../helpers/voice-fixtures.ts';
import { packDisplayName } from '../../../src/app/voices/selection.ts';
import { newRecordedPack } from '../../../src/app/voices/store.ts';
import { createAppTranslator } from '../../../src/app/i18n/index.ts';
import { defaultVoiceName, firstMissingIndex, nameAfterEdit, nextStep, previousStep, savesVoices, stepAfterStart, takeErrorOutcome, uiStateStartPack, wordPrompts } from '../../../src/app/voices/wizard.ts';

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

test('the name field never stays empty: cleared → the default name is shown and saved only when it changes (final review M1)', () => {
  const named = packFixture('en', 12, { name: '山田先生' });
  const cleared = nameAfterEdit(named, '   ', '自分の声（英語）');
  assert.equal(cleared.shown, '自分の声（英語）');
  assert.equal(cleared.next?.name, '自分の声（英語）');
  const already = packFixture('en', 12, { name: '自分の声（英語）' });
  assert.deepEqual(nameAfterEdit(already, '', '自分の声（英語）'), { next: null, shown: '自分の声（英語）' }, 'nothing to save, but the field is written back');
  assert.deepEqual(nameAfterEdit(named, '  山田先生 ', '自分の声（英語）'), { next: null, shown: '山田先生' }, 'trimmed value written back');
  const renamed = nameAfterEdit(named, ' 鈴木先生 ', '自分の声（英語）');
  assert.equal(renamed.shown, '鈴木先生');
  assert.equal(renamed.next?.name, '鈴木先生');
});

test('ui-state URLs never write voices; no-voice starts from a copy of the saved English voice when there is one (final review M5)', () => {
  assert.equal(savesVoices(undefined), true);
  for (const state of ['no-voice', 'mic-denied', 'no-recorder']) assert.equal(savesVoices(state), false, state);
  const fresh = packFixture('en', 0);
  const saved = packFixture('en', 12);
  assert.equal(uiStateStartPack(null, fresh), fresh);
  assert.equal(uiStateStartPack(saved, fresh), saved);
});

test('a recorded voice is named in the display language at the time of recording, and the saved name is not re-translated (Ruling 96-4・76-1)', () => {
  assert.equal(defaultVoiceName(createAppTranslator('en'), 'en'), 'My voice (English)');
  const recordedInJapaneseUi = newRecordedPack('en', defaultVoiceName(createAppTranslator('ja-JP'), 'en'), '2026-10-12T00:00:00.000Z');
  assert.equal(packDisplayName(createAppTranslator('en'), recordedInJapaneseUi), '自分の声（英語）', 'switching to English later shows the stored name as it is (like a routine name)');
});
