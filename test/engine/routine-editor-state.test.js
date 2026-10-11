import test from 'node:test';
import assert from 'node:assert/strict';
import { RoutineEditorState } from '../../src/engine/routine-editor-state.js';

const routine = {
  id: 'test', danceId: 'waltz', name: 'Test',
  figures: [{ id: 'f1', name: 'Natural', counts: '123' }]
};

test('routine editor state supports undo and redo without mutating input', () => {
  const state = new RoutineEditorState(routine);
  state.update(value => { value.figures[0].counts = '123123'; });
  assert.equal(routine.figures[0].counts, '123');
  assert.equal(state.value.figures[0].counts, '123123');
  assert.equal(state.undo().figures[0].counts, '123');
  assert.equal(state.redo().figures[0].counts, '123123');
});

test('new update clears redo history', () => {
  const state = new RoutineEditorState(routine);
  state.update(value => { value.name = 'First'; });
  state.undo();
  state.update(value => { value.name = 'Second'; });
  assert.equal(state.canRedo, false);
});

test('confirmed deletion can be undone', () => {
  const state = new RoutineEditorState({
    ...routine,
    figures: [
      { id: 'f1', name: 'First', counts: '123' },
      { id: 'f2', name: 'Second', counts: '123' }
    ]
  });
  state.update(value => { value.figures.splice(0, 1); });
  assert.deepEqual(state.value.figures.map(item => item.name), ['Second']);
  assert.deepEqual(state.undo().figures.map(item => item.name), ['First', 'Second']);
});

test('moving a figure is undoable and keeps its data together', () => {
  const state = new RoutineEditorState({
    ...routine,
    figures: [
      { id: 'f1', name: 'First', counts: '123' },
      { id: 'f2', name: 'Second', counts: '12&3' },
      { id: 'f3', name: 'Third', counts: '123' }
    ]
  });
  state.moveFigure(1, 0);
  assert.deepEqual(state.value.figures.map(item => [item.name, item.counts]), [
    ['Second', '12&3'], ['First', '123'], ['Third', '123']
  ]);
  assert.deepEqual(state.undo().figures.map(item => item.name), ['First', 'Second', 'Third']);
});

test('out-of-range move does not create history', () => {
  const state = new RoutineEditorState(routine);
  state.moveFigure(0, 4);
  assert.equal(state.canUndo, false);
});

test('duplicating a figure inserts an independent undoable copy', () => {
  const state = new RoutineEditorState(routine);
  state.duplicateFigure(0, 'f1-copy');
  assert.deepEqual(state.value.figures.map(item => [item.id, item.name, item.counts]), [
    ['f1', 'Natural', '123'],
    ['f1-copy', 'Natural（コピー）', '123']
  ]);
  state.update(value => { value.figures[1].counts = '12&3'; });
  assert.equal(state.value.figures[0].counts, '123');
  state.undo();
  state.undo();
  assert.equal(state.value.figures.length, 1);
});

test('adding a figure is undoable and supports an insertion position', () => {
  const state = new RoutineEditorState(routine);
  state.addFigure({ id: 'new', name: 'Added', counts: '12&3' }, 0);
  assert.deepEqual(state.value.figures.map(item => item.id), ['new', 'f1']);
  state.undo();
  assert.deepEqual(state.value.figures.map(item => item.id), ['f1']);
});

test('routine playback preferences survive state snapshots', () => {
  const state = new RoutineEditorState({ ...routine, bpm: 100, countInBars: 2 });
  assert.equal(state.value.bpm, 100);
  assert.equal(state.value.countInBars, 2);
  state.update(value => { value.name = 'Renamed'; });
  assert.equal(state.value.bpm, 100);
  assert.equal(state.value.countInBars, 2);
  assert.equal(state.undo().bpm, 100);
  assert.equal(state.value.countInBars, 2);
});
