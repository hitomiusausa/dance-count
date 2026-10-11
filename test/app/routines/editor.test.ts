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
  assert.deepEqual(e.check(), { valid: false, counts: '', reason: null });
  e.setDraft({ name: 'ウィスク', counts: '１２ａ３' });
  assert.deepEqual(e.check(), { valid: false, counts: '12a3', reason: 'symbols' });
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
  assert.equal(e.setLeadInBars(2), true);
  assert.equal(e.setLeadInBars(2), false);
  e.setBpm(100);
  assert.deepEqual([e.routine.countInBars, e.routine.bpm], [2, 100]);
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
