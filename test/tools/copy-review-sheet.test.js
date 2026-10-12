// 段8（Ruling 96）: 文言の監修シートは道具が作り、鍵の正本は messages.ts のまま。手で書く 2 列は作り直しても残る。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assignGroups, buildSheet, keptColumns, keysReferenced, marksFor, renderSheet, SHEET_PATH } from '../../tools/i18n/copy-review-sheet.js';

const root = path.resolve(import.meta.dirname, '../..');

test('a key used by one screen belongs to that screen; by several, to the common section; §11 keys to errors', () => {
  const refs = {
    'src/app/screens/SettingsScreen.tsx': new Set(['settingsTitle', 'back']),
    'src/app/components/BackButton.tsx': new Set(['back']),
    'src/app/screens/RoutineEditScreen.tsx': new Set(['figureName']),
    'src/app/routines/FigureForm.tsx': new Set(['figureName']),
    'src/app/share/instructions.ts': new Set(['instructionsStep2']),
    'src/app/screens/PracticeScreen.tsx': new Set(['saveFailed'])
  };
  assert.deepEqual(assignGroups(['settingsTitle', 'back', 'figureName', 'instructionsStep2', 'saveFailed', 'unused'], refs), {
    settingsTitle: 'S6', back: 'common', figureName: 'S4', instructionsStep2: 'instructions', saveFailed: 'errors', unused: 'common'
  });
});

test('keys are found as quoted strings, not as parts of other words', () => {
  const keys = new Set(['share', 'shareTitle', 'back']);
  assert.deepEqual([...keysReferenced("t('shareTitle'); const k = cond ? 'back' : \"share\"; shareTitleX", keys)].sort(), ['back', 'share', 'shareTitle']);
});

test('marks: a request, a technical word outside the quoted UI words, a long line, and English first draft', () => {
  assert.deepEqual(marksFor('k', 'もう一度 ▶ を押してください。', 'Press ▶ again.', []), ['依頼', '英語の初版']);
  assert.deepEqual(marksFor('k', '「ファイルを選ぶ」を押します。', 'Tap “Choose a file”.', ['k']), []);
  assert.deepEqual(marksFor('k', 'このブラウザでは録音できません。', "This browser can't record.", ['k']), ['技術語の疑い（ブラウザ・browser）']);
  assert.ok(marksFor('k', 'あ'.repeat(36), 'a', ['k']).includes('長さ'));
  assert.ok(!marksFor('k', `${'あ'.repeat(33)}{name}`, 'a', ['k']).includes('長さ'), '{name} counts as 2 characters');
});

test('the two hand-written columns survive a rebuild, matched by key; other columns are regenerated', () => {
  const entries = [{ key: 'share', ja: '配る', en: 'Share', group: 'S9', legal: false }, { key: 'x', ja: 'a|b', en: 'c', group: 'S9', legal: false }];
  const first = buildSheet(entries);
  const edited = first.replace('| `share` | 配る | Share | 英語の初版 |  |  |', '| `share` | 配る | Share | 英語の初版 | “Share” is fine | 送る |');
  const kept = keptColumns(edited);
  assert.deepEqual(kept.get('share'), { ai: '“Share” is fine', po: '送る' });
  const rebuilt = buildSheet([{ ...entries[0], en: 'Send' }, entries[1]], kept);
  assert.match(rebuilt, /\| `share` \| 配る \| Send \| 英語の初版 \| “Share” is fine \| 送る \|/);
  assert.match(rebuilt, /\| `x` \| a\\\|b \| c \|/, 'a pipe in the text is escaped');
  assert.equal(keptColumns(rebuilt).get('x'), undefined);
});

test('the committed sheet is not stale (run npm run copy:sheet after changing messages.ts or about.ts)', async () => {
  const committed = fs.readFileSync(path.join(root, SHEET_PATH), 'utf8');
  assert.equal(await renderSheet(root), committed);
});
