import test from 'node:test';
import assert from 'node:assert/strict';
import { formLayout, RoutineEditor, type FormLayout } from '../../../src/app/routines/editor.ts';
import { hasFigureNameSuggestions } from '../../../src/app/routines/figure-names.ts';
import { FIGURES_MAX } from '../../../src/app/routines/limits.ts';
import { createRoutine, type Routine } from '../../../src/app/routines/routine.ts';

const NOW = '2026-10-11T09:00:00.000Z';
function editor(figures: Array<[string, string]> = [['ナチュラルターン', '123'], ['ウィスク', '12&3']]) {
  let next = 0;
  const routine: Routine = {
    ...createRoutine({ id: 'r-aaaaaaaa', danceId: 'waltz', name: 'ワルツの練習', now: NOW }),
    figures: figures.map(([name, counts], index) => ({ id: `f-0000000${index}`, name, counts }))
  };
  return new RoutineEditor(routine, () => `f-new0000${next++}`);
}
const names = (e: RoutineEditor) => e.routine.figures.map(figure => `${figure.name}:${figure.counts}`);
// 画面（FigureForm）が formLayout に渡すのと同じ文脈（Ruling 54-2）。
const layout = (e: RoutineEditor): FormLayout => formLayout(e.check(), {
  kind: e.open!.kind, nameEmpty: e.open!.draft.name.trim() === '', hasCatalog: hasFigureNameSuggestions(e.routine.danceId)
});

test('add: the form opens empty, "Add" works only when valid, the counts are normalized', () => {
  const e = editor([]);
  e.openAdd();
  assert.deepEqual(e.check(), { valid: false, counts: '', reason: null, action: 'add', note: null });
  e.setDraft({ name: 'ウィスク', counts: '１２ａ３' });
  assert.deepEqual(e.check(), { valid: false, counts: '12a3', reason: 'symbols', action: 'add', note: null });
  assert.equal(e.decide(), false);
  e.setDraft({ counts: '１２＆３' });
  assert.equal(e.decide(), true);
  assert.equal(e.open, null);
  assert.deepEqual(e.routine.figures, [{ id: 'f-new00000', name: 'ウィスク', counts: '12&3' }]);
});

test('one reason at a time: counts first, then the missing name', () => {
  const e = editor([]);
  e.openAdd();
  e.setDraft({ name: '', counts: '&12' });
  assert.equal(e.check().reason, 'leading');
  e.setDraft({ counts: '123' });
  assert.equal(e.check().reason, 'name');
  e.setDraft({ name: '  ' });
  assert.equal(e.check().valid, false);
});

test('closing rule: any close commits a valid draft and drops an invalid one (Ruling 36-1)', () => {
  const e = editor();
  e.openRow(0);
  e.setDraft({ counts: '123123' });
  assert.equal(e.openRow(1), true); // 別の行をタップ → 有効なので確定
  assert.deepEqual(names(e), ['ナチュラルターン:123123', 'ウィスク:12&3']);
  e.setDraft({ counts: '12a3' });
  assert.equal(e.close(), false); // 戻る等 → 無効なので捨てる
  assert.deepEqual(names(e), ['ナチュラルターン:123123', 'ウィスク:12&3']);
  e.openAdd();
  e.setDraft({ name: 'クローズドチェンジ', counts: '123' });
  assert.equal(e.close(), true);
  assert.equal(e.routine.figures.length, 3);
});

test('opening a row closes "More options"; opening "More options" closes the row by the rule (Ruling 36-2)', () => {
  const e = editor();
  e.setMoreOpen(true);
  e.openRow(0);
  assert.equal(e.moreOpen, false);
  e.setDraft({ name: 'リバースターン' });
  assert.equal(e.setMoreOpen(true), true);
  assert.equal(e.open, null);
  assert.equal(e.routine.figures[0]!.name, 'リバースターン');
});

test('an unchanged row closes without a change (no save, no history)', () => {
  const e = editor();
  e.openRow(0);
  assert.equal(e.close(), false);
  assert.equal(e.canUndo, false);
});

test('up / down move the open figure and the row follows it', () => {
  const e = editor([['A', '123'], ['B', '123'], ['C', '123']]);
  e.openRow(1);
  assert.equal(e.moveOpen(-1), true);
  assert.deepEqual(names(e).map(item => item[0]), ['B', 'A', 'C']);
  assert.equal(e.open?.kind === 'edit' && e.open.index, 0);
  assert.equal(e.moveOpen(-1), false); // 先頭より上は無し
  e.moveOpen(1);
  e.moveOpen(1);
  assert.deepEqual(names(e).map(item => item[0]), ['A', 'C', 'B']);
});

test('duplicate puts the same name right below; delete needs no confirmation and can be undone', () => {
  const e = editor();
  e.openRow(0);
  e.duplicateOpen();
  assert.deepEqual(names(e), ['ナチュラルターン:123', 'ナチュラルターン:123', 'ウィスク:12&3']);
  e.openRow(2);
  e.removeOpen();
  assert.equal(e.open, null);
  assert.deepEqual(names(e), ['ナチュラルターン:123', 'ナチュラルターン:123']);
  e.undo();
  assert.deepEqual(names(e), ['ナチュラルターン:123', 'ナチュラルターン:123', 'ウィスク:12&3']);
  e.redo();
  assert.equal(e.routine.figures.length, 2);
});

test('the routine name: blank keeps the old name; trimmed and limited to 40', () => {
  const e = editor();
  assert.equal(e.rename('   '), false);
  assert.equal(e.routine.name, 'ワルツの練習');
  e.rename(`  ${'あ'.repeat(50)}  `);
  assert.equal(e.routine.name.length, 40);
});

test('lead-in bars and speed are undoable changes', () => {
  const e = editor();
  assert.equal(e.setLeadInBars(1), true);
  assert.equal(e.setLeadInBars(1), false);
  e.setBpm(100);
  assert.deepEqual([e.routine.countInBars, e.routine.bpm], [1, 100]);
  e.undo();
  assert.equal(e.routine.bpm, null);
});

test('the row preview uses the typed values when valid, before "Done" (Ruling 36-7)', () => {
  const e = editor();
  e.openRow(1);
  e.setDraft({ counts: '123' });
  assert.deepEqual(e.previewOpen(), { figures: [{ id: 'f-00000000', name: 'ナチュラルターン', counts: '123' }, { id: 'f-00000001', name: 'ウィスク', counts: '123' }], index: 1 });
  e.setDraft({ counts: '12a3' });
  assert.equal(e.previewOpen(), null);
  e.close();
  e.openAdd();
  e.setDraft({ name: 'X', counts: '123' });
  assert.equal(e.previewOpen()?.index, 2);
});

test('keeps the meta (provenance, createdAt) and the 64-figure limit', () => {
  const e = editor(Array.from({ length: FIGURES_MAX }, () => ['A', '123'] as [string, string]));
  assert.equal(e.canAdd, false);
  e.openAdd();
  assert.equal(e.open, null);
  assert.deepEqual(e.routine.provenance.sourceKind, 'user-created');
  assert.equal(e.routine.createdAt, NOW);
});

test('the dance can change only while there are no figures', () => {
  const empty = editor([]);
  assert.equal(empty.changeDance('tango', 'タンゴのルーティン'), true);
  assert.deepEqual([empty.routine.danceId, empty.routine.name], ['tango', 'タンゴのルーティン']);
  const filled = editor();
  assert.equal(filled.changeDance('tango', 'x'), false);
  assert.equal(filled.routine.danceId, 'waltz');
});

test('move (drag / grip arrows): closes the open row by the rule first, one undo step each (Ruling 49)', () => {
  const e = editor([['A', '123'], ['B', '123'], ['C', '123']]);
  assert.equal(e.move(2, 0), true);
  assert.deepEqual(names(e).map(item => item[0]), ['C', 'A', 'B']);
  e.undo();
  assert.deepEqual(names(e).map(item => item[0]), ['A', 'B', 'C']);
  e.openRow(0);
  e.setDraft({ name: 'A2' });
  assert.equal(e.move(0, 2), true);
  assert.equal(e.open, null);
  assert.deepEqual(names(e).map(item => item.split(':')[0]), ['B', 'C', 'A2']);
  e.undo();
  e.undo();
  assert.deepEqual(names(e).map(item => item.split(':')[0]), ['A', 'B', 'C']);
});

test('move to the same place or out of range changes nothing and adds no history', () => {
  const e = editor([['A', '123'], ['B', '123']]);
  assert.equal(e.move(1, 1), false);
  assert.equal(e.move(0, 5), false);
  assert.equal(e.move(-1, 0), false);
  assert.equal(e.canUndo, false);
});

test('changing the dance closes the open add-draft first; a committed figure keeps the old dance (Ruling 36-1)', () => {
  const e = editor([]);
  e.openAdd();
  e.setDraft({ name: 'A', counts: '123' });
  assert.equal(e.changeDance('tango', 'タンゴのルーティン'), true);
  assert.equal(e.routine.danceId, 'waltz');
  assert.equal(e.routine.figures.length, 1);
  assert.equal(e.open, null);
});

test('up / down with an invalid draft drops the draft, moves the stored figure, and the row follows', () => {
  const e = editor([['A', '123'], ['B', '123'], ['C', '123']]);
  e.openRow(0);
  e.setDraft({ counts: '12a3' });
  assert.equal(e.moveOpen(1), true);
  assert.deepEqual(names(e), ['B:123', 'A:123', 'C:123']);
  assert.deepEqual(e.open, { kind: 'edit', index: 1, draft: { name: 'A', counts: '123' } });
});

test('duplicate with an invalid draft drops the draft, copies the stored figure below, and the original row stays open', () => {
  const e = editor([['A', '123'], ['B', '123'], ['C', '123']]);
  e.openRow(1);
  e.setDraft({ counts: '12a3' });
  assert.equal(e.duplicateOpen(), true);
  assert.deepEqual(names(e), ['A:123', 'B:123', 'B:123', 'C:123']);
  assert.deepEqual(e.open, { kind: 'edit', index: 1, draft: { name: 'B', counts: '123' } });
});

// Ruling 50（D13）: 名前の仲間に入る時はその仲間のカウントを受け取る。仲間のカウントを変える時は仲間ごと変わる。
test('add with the same name and empty counts: "Add a copy" adds the first same-named figure as it is, one undo step (Ruling 50-2a)', () => {
  const e = editor([['ナチュラルターン', '123'], ['ウィスク', '12&3'], ['ウィスク', '123']]);
  e.openAdd();
  e.setDraft({ name: ' ウィスク ' });
  const check = e.check();
  assert.equal(check.action, 'addCopy');
  assert.equal(check.reason, 'sameName');
  assert.equal(check.valid, false);
  assert.deepEqual(check.same, { index: 1, name: 'ウィスク', counts: '12&3', others: 2 });
  assert.equal(e.close(), false); // 無効＝捨てる（別の行をタップして勝手に複製が増えない）
  assert.equal(e.routine.figures.length, 3);
  e.openAdd();
  e.setDraft({ name: 'ウィスク', counts: '123' });
  assert.equal(e.addCopy(), true);
  assert.equal(e.open, null);
  assert.deepEqual(names(e), ['ナチュラルターン:123', 'ウィスク:12&3', 'ウィスク:123', 'ウィスク:12&3']);
  e.undo();
  assert.equal(e.routine.figures.length, 3);
});

test('add with the same name and the same counts is still "Add a copy" with the same result (Ruling 50-2b, changed by F6 I1)', () => {
  const e = editor();
  e.openAdd();
  e.setDraft({ name: 'ウィスク', counts: '１２＆３' });
  const check = e.check();
  assert.deepEqual([check.valid, check.reason, check.action], [false, 'sameName', 'addCopy']);
  assert.equal(e.addCopy(), true);
  assert.deepEqual(names(e), ['ナチュラルターン:123', 'ウィスク:12&3', 'ウィスク:12&3']);
});

test('add with the same name and invalid counts: the same name comes before the counts reason (Ruling 50-2c)', () => {
  const e = editor();
  e.openAdd();
  e.setDraft({ name: 'ウィスク', counts: '12a3' });
  assert.deepEqual([e.check().valid, e.check().reason, e.check().action], [false, 'sameName', 'addCopy']);
  e.setDraft({ counts: '&123' });
  assert.equal(e.check().reason, 'sameName');
});

test('edit: renaming into a same-named group asks to use that count; close drops it; after matching it is "Done" (Ruling 50-3d)', () => {
  const e = editor();
  e.openRow(0);
  e.setDraft({ name: 'うぃすく' });
  assert.equal(e.check().action, 'matchCounts'); // ひらがなもカタカナと同じ名前（D21・Ruling 54-8。以前は別の名前）
  e.setDraft({ name: 'ｳｨｽｸ' });
  const check = e.check();
  assert.deepEqual([check.valid, check.reason, check.action], [false, 'sameName', 'matchCounts']);
  assert.deepEqual(check.same, { index: 1, name: 'ウィスク', counts: '12&3', others: 1 });
  assert.equal(e.close(), false);
  assert.deepEqual(names(e), ['ナチュラルターン:123', 'ウィスク:12&3']);
  e.openRow(0);
  e.setDraft({ name: 'ｳｨｽｸ', counts: '12a3' });
  assert.equal(e.check().reason, 'symbols'); // 編集の行はカウントの理由が先
  e.setDraft({ counts: '123' });
  assert.equal(e.matchCounts(), false);
  assert.deepEqual(e.open?.draft, { name: 'ウィスク', counts: '12&3' });
  assert.deepEqual([e.check().valid, e.check().action], [true, 'done']);
  assert.equal(e.decide(), true);
  assert.deepEqual(names(e), ['ウィスク:12&3', 'ウィスク:12&3']);
});

test('edit: same name, new counts, two others: "Update all 3" changes all three in one undo step (Ruling 50-4e)', () => {
  // D22 より前は 1 行目が「ウィスク」だった（今は Whisk と同じフィガーなので、別のフィガーに替えて大小の畳みだけを見る）
  const e = editor([['リバースターン', '12&3'], ['ナチュラルターン', '123'], ['whisk', '12&3'], ['WHISK', '12&3'], ['Whisk', '12&3']]);
  e.openRow(2);
  e.setDraft({ counts: '123' });
  const check = e.check();
  assert.deepEqual([check.valid, check.reason, check.action], [true, null, 'updateAll']);
  assert.deepEqual(check.same, { index: 3, name: 'WHISK', counts: '12&3', others: 2 });
  assert.equal(e.close(), true);
  assert.deepEqual(names(e), ['リバースターン:12&3', 'ナチュラルターン:123', 'whisk:123', 'WHISK:123', 'Whisk:123']);
  e.undo();
  assert.deepEqual(names(e), ['リバースターン:12&3', 'ナチュラルターン:123', 'whisk:12&3', 'WHISK:12&3', 'Whisk:12&3']);
});

test('same name: half-width kana and letter case fold together; spaces inside the name do not (Ruling 50-1f)', () => {
  const e = editor([['ウィスク', '12&3'], ['Natural Turn', '123'], ['ナチュラル ターン', '123']]);
  e.openAdd();
  e.setDraft({ name: 'ｳｨｽｸ' });
  assert.equal(e.check().action, 'addCopy');
  e.setDraft({ name: 'natural turn' });
  assert.equal(e.check().action, 'addCopy');
  e.setDraft({ name: 'naturalturn' });
  assert.equal(e.check().action, 'add');
  // D22: 「ナチュラルターン」は照合済みの Natural Turn の日本語名なので、空白の規則とは別に同じフィガー（英語の行が代表）
  e.setDraft({ name: 'ナチュラルターン' });
  assert.deepEqual([e.check().action, e.check().same?.name], ['addCopy', 'Natural Turn']);
  e.setDraft({ name: 'ナチュラル  ターン' });
  assert.equal(e.check().action, 'add');
});

test('the open row is not its own same name; old mismatched data stays until touched (Ruling 50-1g・5)', () => {
  const e = editor([['ウィスク', '12&3'], ['ナチュラルターン', '123']]);
  e.openRow(0);
  e.setDraft({ counts: '123' });
  assert.deepEqual([e.check().valid, e.check().action], [true, 'done']);
  e.setDraft({ name: 'ｳｨｽｸ' }); // 自分の表記を変えただけ（ほかに同じ名前なし）
  assert.equal(e.check().action, 'done');
  const old = editor([['ウィスク', '12&3'], ['ウィスク', '123']]);
  old.openRow(1);
  assert.deepEqual([old.check().valid, old.check().action], [true, 'done']); // 触るまで何もしない
  old.setDraft({ counts: '1&23' });
  assert.equal(old.check().action, 'updateAll');
});

test('off-bar note: a waltz count that is not 3 beats is a note, not a reason, and "Done" stays pressable (Ruling 52-3)', () => {
  const e = editor([['ナチュラルターン', '123'], ['ウィスク', '12']]);
  e.openRow(1);
  assert.deepEqual([e.check().valid, e.check().reason, e.check().note], [true, null, 'offBar']);
  e.setDraft({ counts: '１２３' });
  assert.equal(e.check().note, null);
  e.close();
  e.openAdd();
  e.setDraft({ name: 'シャッセ', counts: '12' });
  assert.deepEqual([e.check().valid, e.check().reason, e.check().note], [true, null, 'offBar']);
  e.setDraft({ name: '' });
  assert.deepEqual([e.check().reason, e.check().note], ['name', 'offBar']); // 画面は reason が null の時だけ note を描く
  e.setDraft({ name: 'シャッセ', counts: '12a' });
  assert.equal(e.check().note, null); // 数えられない時は出さない
  assert.equal(e.decide(), false);
  e.setDraft({ counts: '12' });
  assert.equal(e.decide(), true);
  assert.deepEqual(names(e).at(-1), 'シャッセ:12');
});

test('note order: the "others will change" notice comes before the off-bar note (Ruling 52-3)', () => {
  const e = editor([['ウィスク', '123'], ['ウィスク', '123']]);
  e.openRow(0);
  e.setDraft({ counts: '12' });
  assert.deepEqual([e.check().valid, e.check().action, e.check().note], [true, 'updateAll', 'othersWillChange']);
});

test('the off-bar note is only for waltz and Viennese waltz (D16)', () => {
  const routine: Routine = {
    ...createRoutine({ id: 'r-bbbbbbbb', danceId: 'tango', name: 'タンゴ', now: NOW }),
    figures: [{ id: 'f-00000000', name: 'プログレッシブリンク', counts: 'QQ' }]
  };
  const e = new RoutineEditor(routine, () => 'f-new00000');
  e.openRow(0);
  assert.deepEqual([e.check().valid, e.check().note], [true, null]);
});

// D19: 同じ名前の時は「複製専用の形」。判断は formLayout（画面はこれで出す部品を選ぶだけ）。
test('add with a same name hides the counts parts, shows the notice under the name, and keeps the typed counts for when the name changes (D19)', () => {
  const e = editor();
  e.openAdd();
  e.setDraft({ name: 'クローズドチェンジ', counts: '1&23' });
  assert.deepEqual(layout(e), { countsShown: true, sameName: null, namePicker: false });
  e.setDraft({ name: 'ウィスク' });
  const check = e.check();
  assert.equal(check.action, 'addCopy');
  assert.deepEqual(layout(e), { countsShown: false, sameName: 'copy', namePicker: false });
  assert.deepEqual([check.same?.name, check.same?.counts], ['ウィスク', '12&3']); // ボタンの「{counts} で複製して追加」の引数
  assert.equal(e.open?.draft.counts, '1&23'); // 欄を出さない間も打った値は残る
  e.setDraft({ name: 'ウィスク（短）' });
  assert.deepEqual(layout(e), { countsShown: true, sameName: null, namePicker: false });
  assert.deepEqual([e.check().action, e.check().counts, e.check().valid], ['add', '1&23', true]);
});

test('on the add row the layout depends on the name only: editing the counts never hides the field in use (D19・F6 I1)', () => {
  const e = editor();
  e.openAdd();
  for (const counts of ['', '12&3', '12', '123', '12a3', '&123']) {
    e.setDraft({ name: 'クローズドチェンジ', counts });
    assert.deepEqual(layout(e), { countsShown: true, sameName: null, namePicker: false }, counts);
    e.setDraft({ name: 'ウィスク' });
    assert.deepEqual(layout(e), { countsShown: false, sameName: 'copy', namePicker: false }, counts);
  }
});

test('edit: renaming into another name keeps the counts shown and moves only the notice under the name (D19)', () => {
  const e = editor();
  e.openRow(0);
  e.setDraft({ name: 'ウィスク' });
  assert.equal(e.check().action, 'matchCounts');
  assert.deepEqual(layout(e), { countsShown: true, sameName: 'match', namePicker: false });
  e.setDraft({ counts: '12a3' }); // 編集の行はカウントの理由が先＝名前の下の注意は出ない
  assert.deepEqual(layout(e), { countsShown: true, sameName: null, namePicker: false });
  e.setDraft({ name: 'ナチュラルターン', counts: '12&3' });
  assert.deepEqual(layout(e), { countsShown: true, sameName: null, namePicker: false });
});

test('old mismatched same-name rows stay as they are; the copy source is the first one (D19・Ruling 50-1・5)', () => {
  const e = editor([['ウィスク', '123'], ['ウィスク', '12&3']]);
  assert.deepEqual(names(e), ['ウィスク:123', 'ウィスク:12&3']);
  e.openAdd();
  e.setDraft({ name: 'ウィスク' });
  assert.deepEqual([e.check().same?.index, e.check().same?.counts], [0, '123']);
  assert.equal(e.addCopy(), true);
  assert.deepEqual(names(e), ['ウィスク:123', 'ウィスク:12&3', 'ウィスク:123']);
});

// D20・Ruling 54-2・3: 名前が空の追加の行は「名前を選ぶ所だけ」（照合済みの一覧）。カウントの欄・使える文字・形は名前が入ってから。
test('formLayout shows the name list only on an add row with an empty name in a dance that has verified names (Ruling 54 (e))', () => {
  const e = editor();
  e.openAdd();
  assert.deepEqual(layout(e), { countsShown: false, namePicker: true, sameName: null });
  e.setDraft({ name: '   ' }); // 空白だけは「空」
  assert.deepEqual(layout(e), { countsShown: false, namePicker: true, sameName: null });
  e.setDraft({ name: 'x' });
  assert.deepEqual(layout(e), { countsShown: true, namePicker: false, sameName: null });
  e.setDraft({ name: 'ウィスク' });
  assert.deepEqual(layout(e), { countsShown: false, namePicker: false, sameName: 'copy' });
  e.openRow(0);
  e.setDraft({ name: '' }); // 編集の行では名前を空にしても一覧は出さない
  assert.deepEqual(layout(e), { countsShown: true, namePicker: false, sameName: null });
  // ヴィエニーズワルツは一覧が無いので、名前が空でも最初からカウントの欄を出す
  const vw = new RoutineEditor(createRoutine({ id: 'r-bbbbbbbb', danceId: 'vwaltz', name: 'VW', now: NOW }), () => 'f-vw000000');
  vw.openAdd();
  assert.deepEqual(layout(vw), { countsShown: true, namePicker: false, sameName: null });
  // 純粋関数としても: 同じ入力で同じ答え
  assert.deepEqual(formLayout({ action: 'add', reason: null }, { kind: 'add', nameEmpty: true, hasCatalog: false }), { countsShown: true, namePicker: false, sameName: null });
  assert.deepEqual(formLayout({ action: 'done', reason: null }, { kind: 'edit', nameEmpty: true, hasCatalog: true }), { countsShown: true, namePicker: false, sameName: null });
});

test('counts typed before the name was cleared come back when a name is chosen again (Ruling 54 (f))', () => {
  const e = editor();
  e.openAdd();
  e.setDraft({ name: 'コントラチェック', counts: '1&23' });
  e.setDraft({ name: '' });
  assert.equal(layout(e).namePicker, true);
  assert.equal(e.open?.draft.counts, '1&23');
  e.setDraft({ name: 'リバースターン' });
  assert.deepEqual([layout(e).countsShown, e.check().counts, e.check().valid], [true, '1&23', true]);
});

// D21・Ruling 54-8・10: かなとカナは同じ名前（foldFigureName の 1 段）。保存した表記は変えない。
test('a hiragana name joins the katakana figure and adds a copy in the representative spelling (Ruling 54 (i))', () => {
  const e = editor([['ウィスク', '123']]);
  e.openAdd();
  e.setDraft({ name: 'うぃすく' });
  const check = e.check();
  assert.equal(check.action, 'addCopy');
  assert.equal(check.same?.name, 'ウィスク');
  assert.equal(e.addCopy(), true);
  assert.deepEqual(names(e), ['ウィスク:123', 'ウィスク:123']);
});

test('changing the counts of a hiragana row updates the katakana row too, and one undo restores both (Ruling 54 (j))', () => {
  const e = editor([['ウィスク', '123'], ['うぃすく', '123']]);
  e.openRow(1);
  e.setDraft({ counts: '12&3' });
  const check = e.check();
  assert.deepEqual([check.action, check.same?.others], ['updateAll', 1]);
  assert.equal(e.close(), true);
  assert.deepEqual(names(e), ['ウィスク:12&3', 'うぃすく:12&3']);
  assert.equal(e.undo(), true);
  assert.deepEqual(names(e), ['ウィスク:123', 'うぃすく:123']);
});

test('respelling a name in kana is not a rename: only the spelling changes (Ruling 54 (k))', () => {
  const e = editor([['ウィスク', '123'], ['ウィスク', '123']]);
  e.openRow(0);
  e.setDraft({ name: 'うぃすく' });
  assert.deepEqual([e.check().action, e.check().valid], ['done', true]);
  assert.equal(e.close(), true);
  assert.deepEqual(names(e), ['うぃすく:123', 'ウィスク:123']);
  // 綴りを変えたままカウントも変えると、名前を変えていない扱いなので仲間ごと変わる（カウントを合わせる、にはならない）
  e.openRow(0);
  e.setDraft({ name: 'ウィスク', counts: '12&3' });
  assert.equal(e.check().action, 'updateAll');
});

// D22: 同じフィガーなら同じ名前（照合済みの登録簿で日英を結ぶ）。保存した表記は変えない。
test('EN: picking "Whisk" from the list when a JA ウィスク row exists switches to the copy layout (D22)', () => {
  const e = editor([['ウィスク', '123']]);
  e.openAdd();
  e.setDraft({ name: 'Whisk' });
  const check = e.check();
  assert.deepEqual([check.action, check.reason, check.same?.name, check.same?.counts], ['addCopy', 'sameName', 'ウィスク', '123']);
  assert.deepEqual(layout(e), { countsShown: false, namePicker: false, sameName: 'copy' });
  assert.equal(e.addCopy(), true);
  assert.deepEqual(names(e), ['ウィスク:123', 'ウィスク:123']);
});

test('updateAll groups the JA and EN rows of the same figure, and leaves other figures alone (D22)', () => {
  const e = editor([['ウィスク', '123'], ['Whisk', '123'], ['うぃすく', '123'], ['Back Whisk', '123']]);
  e.openRow(1);
  e.setDraft({ counts: '12&3' });
  assert.deepEqual([e.check().action, e.check().same?.others, e.check().same?.name], ['updateAll', 2, 'ウィスク']);
  assert.equal(e.close(), true);
  assert.deepEqual(names(e), ['ウィスク:12&3', 'Whisk:12&3', 'うぃすく:12&3', 'Back Whisk:123']);
  assert.equal(e.undo(), true);
  assert.deepEqual(names(e), ['ウィスク:123', 'Whisk:123', 'うぃすく:123', 'Back Whisk:123']);
});

test('renaming to the other language of the same figure is not a rename; to another figure asks to match counts (D22)', () => {
  const e = editor([['ウィスク', '123'], ['Natural Turn', '12&3']]);
  e.openRow(0);
  e.setDraft({ name: 'Whisk' });
  assert.deepEqual([e.check().action, e.check().valid], ['done', true]);
  e.setDraft({ name: 'ナチュラルターン' });
  assert.deepEqual([e.check().action, e.check().reason, e.check().same?.name], ['matchCounts', 'sameName', 'Natural Turn']);
});

test('free-text names still compare by folded spelling only (D22)', () => {
  const e = editor([['マイステップ', '123']]);
  e.openAdd();
  e.setDraft({ name: 'まいすてっぷ' });
  assert.equal(e.check().action, 'addCopy');
  e.setDraft({ name: 'My Step', counts: '123' });
  assert.equal(e.check().action, 'add');
});
