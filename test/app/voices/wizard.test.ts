import test from 'node:test';
import assert from 'node:assert/strict';
import { packFixture } from '../helpers/voice-fixtures.ts';
import { packDisplayName } from '../../../src/app/voices/selection.ts';
import { newRecordedPack } from '../../../src/app/voices/store.ts';
import { createAppTranslator } from '../../../src/app/i18n/index.ts';
import { defaultRecordLanguage, defaultVoiceName, firstMissingIndex, jumpStep, nameAfterEdit, nextStep, previousStep, savesVoices, stepAfterStart, takeErrorOutcome, uiStateStartPack, wordChips, wordPrompts } from '../../../src/app/voices/wizard.ts';

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

test('prompts: the chosen vocabulary big, the other one small in the Japanese UI (Ruling 59-2)', () => {
  assert.deepEqual(wordPrompts('en', 'slow', 'ja-JP'), { main: 'Slow', other: 'スロー' });
  assert.deepEqual(wordPrompts('ja-JP', 'slow', 'ja-JP'), { main: 'スロー', other: 'Slow' });
  assert.deepEqual(wordPrompts('ja-JP', 'four', 'ja-JP'), { main: 'よん', other: 'Four' }, 'never the 「し」でも可 note');
  assert.deepEqual(wordPrompts('en', 'ah', 'ja-JP'), { main: 'a', other: 'ア' });
});

test('prompts: the English UI shows only the word to say, never a Japanese reading (D60)', () => {
  assert.deepEqual(wordPrompts('en', 'one', 'en'), { main: 'One', other: null }, 'no 「いち」 under One');
  assert.deepEqual(wordPrompts('en', 'two', 'en'), { main: 'Two', other: null }, 'no 「に」 under Two');
  assert.deepEqual(wordPrompts('ja-JP', 'one', 'en'), { main: 'いち', other: null }, 'the Japanese word once, as the word to say');
  const english = createAppTranslator('en');
  assert.equal(/[\u3040-\u30ff\u4e00-\u9fff]/.test(english.t('countInJapanese')), false, 'the language choice in English has no kana/kanji');
  assert.equal(/[\u3040-\u30ff\u4e00-\u9fff]/.test(english.t('recordHint', { word: 'One' })), false);
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
  for (const state of ['no-voice', 'mic-denied', 'no-recorder', 'mic-failed', 'save-failed']) assert.equal(savesVoices(state), false, state);
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

test('S8 picks the language of the voice in progress when no one asked for one (夜間便 A-1・監査 #1a)', () => {
  const at = (pack: ReturnType<typeof packFixture>, updatedAt: string) => ({ ...pack, updatedAt });
  const jaOne = at(packFixture('ja-JP', 1), '2026-10-14T10:00:00.000Z');
  assert.equal(defaultRecordLanguage(null, { en: null, 'ja-JP': jaOne }), 'ja-JP', 'Japanese 1/12 only → Japanese');
  assert.equal(defaultRecordLanguage(null, { en: packFixture('en', 12), 'ja-JP': jaOne }), 'ja-JP', 'a finished English voice is not in progress');
  const enFive = at(packFixture('en', 5), '2026-10-14T11:00:00.000Z');
  assert.equal(defaultRecordLanguage(null, { en: enFive, 'ja-JP': jaOne }), 'en', 'both in progress → the newer one');
  assert.equal(defaultRecordLanguage(null, { en: at(enFive, '2026-10-14T09:00:00.000Z'), 'ja-JP': jaOne }), 'ja-JP');
  assert.equal(defaultRecordLanguage(null, { en: null, 'ja-JP': null }), 'en', 'nothing → English as before');
  assert.equal(defaultRecordLanguage(null, { en: packFixture('en', 12), 'ja-JP': packFixture('ja-JP', 12) }), 'en');
  assert.equal(defaultRecordLanguage('en', { en: null, 'ja-JP': jaOne }), 'en', 'the request from S7 wins');
});

test('D64: a word chip jumps to that word (recorded or not); nothing during the countdown/recording, on the current word or out of range', () => {
  assert.deepEqual(jumpStep(2, 7, false), { kind: 'word', index: 2 }, 'back to a recorded word');
  assert.deepEqual(jumpStep(11, 7, false), { kind: 'word', index: 11 }, 'ahead to a word not recorded yet');
  assert.deepEqual(jumpStep(0, 11, false), { kind: 'word', index: 0 });
  assert.equal(jumpStep(2, 7, true), null, 'busy = countdown (3・2・1・今) or capture');
  assert.equal(jumpStep(7, 7, false), null, 'the current word');
  assert.equal(jumpStep(-1, 7, false), null);
  assert.equal(jumpStep(12, 7, false), null);
  assert.equal(jumpStep(1.5, 7, false), null);
});

test('D64: chips show the recorded pack\'s words; states recorded / now / not yet; names like 「4番目・よん・録音済み」', () => {
  const ja = createAppTranslator('ja-JP');
  const en = createAppTranslator('en');
  const chips = wordChips(packFixture('ja-JP', 7), 5, ja);
  assert.equal(chips.length, 12);
  assert.deepEqual(chips.map(chip => chip.word), ['スロー', 'クイック', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'アンド', 'ア']);
  assert.deepEqual(chips.map(chip => chip.state), ['done', 'done', 'done', 'done', 'done', 'now', 'done', 'todo', 'todo', 'todo', 'todo', 'todo'],
    'the current word is shown as now even when recorded (like the old 12 cells)');
  assert.deepEqual(chips.filter(chip => chip.current).map(chip => chip.index), [5]);
  assert.equal(chips[5]!.label, '6番目・よん・録音済み', 'recorded state is still read on the current word');
  assert.equal(chips[3]!.label, '4番目・に・録音済み');
  assert.equal(chips[8]!.label, '9番目・なな・まだ');
  const english = wordChips(packFixture('en', 2), 0, en);
  assert.deepEqual(english.map(chip => chip.word), ['Slow', 'Quick', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'And', 'a']);
  assert.equal(english[0]!.label, 'Word 1, Slow, recorded');
  assert.equal(english[8]!.label, 'Word 9, Seven, not yet');
  // 英語の画面で日本語の声: チップは録っている声の語（D60 の例外と同じ。読みの併記はしない）
  assert.equal(wordChips(packFixture('ja-JP', 0), 0, en)[2]!.label, 'Word 3, いち, not yet');
});
