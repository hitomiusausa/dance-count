import test from 'node:test';
import assert from 'node:assert/strict';
import { RoutineEditor } from '../../../src/app/routines/editor.ts';
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

test('add with the same name and the same counts is a plain "Add" (Ruling 50-2b)', () => {
  const e = editor();
  e.openAdd();
  e.setDraft({ name: 'ウィスク', counts: '１２＆３' });
  const check = e.check();
  assert.deepEqual([check.valid, check.reason, check.action], [true, null, 'add']);
  assert.equal(e.decide(), true);
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
  assert.equal(e.check().action, 'done'); // ひらがなは別の名前
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
  const e = editor([['ウィスク', '12&3'], ['ナチュラルターン', '123'], ['whisk', '12&3'], ['WHISK', '12&3'], ['Whisk', '12&3']]);
  e.openRow(2);
  e.setDraft({ counts: '123' });
  const check = e.check();
  assert.deepEqual([check.valid, check.reason, check.action], [true, null, 'updateAll']);
  assert.deepEqual(check.same, { index: 3, name: 'WHISK', counts: '12&3', others: 2 });
  assert.equal(e.close(), true);
  assert.deepEqual(names(e), ['ウィスク:12&3', 'ナチュラルターン:123', 'whisk:123', 'WHISK:123', 'Whisk:123']);
  e.undo();
  assert.deepEqual(names(e), ['ウィスク:12&3', 'ナチュラルターン:123', 'whisk:12&3', 'WHISK:12&3', 'Whisk:12&3']);
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
  e.setDraft({ name: 'ナチュラルターン' });
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
