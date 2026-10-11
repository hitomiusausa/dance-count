import test from 'node:test';
import assert from 'node:assert/strict';
import { BAR_NOTE_DANCES, figureBeats, isOffBar, offBarIndexes, routineEndsMidBar } from '../../../src/app/routines/bar-check.ts';

const figs = (...counts: string[]) => counts.map((value, index) => ({ id: `f-0000000${index}`, name: `F${index}`, counts: value }));

test('figureBeats comes from the compiled ticks; invalid counts are null (Ruling 52-1)', () => {
  assert.equal(figureBeats('waltz', '123'), 3);
  assert.equal(figureBeats('waltz', '12'), 2);
  assert.equal(figureBeats('waltz', '12&3'), 3);
  assert.equal(figureBeats('waltz', '123123'), 6);
  assert.equal(figureBeats('tango', 'SQQ'), 4);
  assert.equal(figureBeats('waltz', '12a3'), null);
});

test('isOffBar: only waltz and Viennese waltz, only when not a multiple of 3 beats (D16)', () => {
  assert.deepEqual([...BAR_NOTE_DANCES], ['waltz', 'vwaltz']);
  assert.equal(isOffBar('waltz', '12'), true);
  assert.equal(isOffBar('waltz', '123'), false);
  assert.equal(isOffBar('waltz', '123123'), false);
  assert.equal(isOffBar('waltz', '12&3'), false);
  assert.equal(isOffBar('waltz', '12a3'), false);
  assert.equal(isOffBar('vwaltz', '1231'), true);
  assert.equal(isOffBar('tango', 'QQ'), false); // 対象外（小節をまたぐフィガーが普通にある）
  assert.equal(isOffBar('quickstep', 'SQQS'), false);
});

test('offBarIndexes lists the off-bar rows in order (Ruling 52-1)', () => {
  assert.deepEqual(offBarIndexes('waltz', figs('123', '12', '12')), [1, 2]);
  assert.deepEqual(offBarIndexes('waltz', figs('123', '123')), []);
  assert.deepEqual(offBarIndexes('tango', figs('QQ', 'Q')), []);
});

test('routineEndsMidBar: every dance, by the whole routine (Ruling 52-1)', () => {
  assert.equal(routineEndsMidBar('tango', figs('QQ')), true);
  assert.equal(routineEndsMidBar('tango', figs('SQQ')), false);
  assert.equal(routineEndsMidBar('tango', figs('QQ', 'QQ')), false);
  assert.equal(routineEndsMidBar('waltz', figs('123', '12')), true);
  assert.equal(routineEndsMidBar('waltz', figs('123', '123')), false);
  assert.equal(routineEndsMidBar('waltz', figs('123123', '12', '12')), true);
  assert.equal(routineEndsMidBar('waltz', figs('12', '1')), false);
  assert.equal(routineEndsMidBar('waltz', []), false);
  assert.equal(routineEndsMidBar('waltz', figs('12a3')), false);
});
