import test from 'node:test';
import assert from 'node:assert/strict';
import { compileRoutine } from '../../../src/engine/rhythm-compiler.js';
import { MAX_STRIP_CELLS, idleProgram, stripCells, stripView } from '../../../src/app/practice/beat-indicator.ts';
import { programView } from '../../../src/app/practice/session.ts';

// D55・Ruling 114: 丸は型 1 周の語。幅（beats）は語の長さ。点く丸は tick が originalTick 以下の最後の語（エンジンの tick だけ）
const labels = (danceId: string, counts: string) => stripCells(idleProgram(danceId, counts)).map(cell => cell.label);
const beats = (danceId: string, counts: string) => stripCells(idleProgram(danceId, counts)).map(cell => cell.beats);

test('jive 123a45a6 is 8 cells with the a cells a quarter beat long (Ruling 114-1・114-2)', () => {
  assert.deepEqual(labels('jive', '123a45a6'), ['1', '2', '3', 'a', '4', '5', 'a', '6']);
  assert.deepEqual(beats('jive', '123a45a6'), [1, 1, 0.75, 0.25, 1, 0.75, 0.25, 1]);
  assert.deepEqual(stripCells(idleProgram('jive', '123a45a6')).map(cell => cell.kind), ['beat', 'beat', 'beat', 'sub', 'beat', 'beat', 'sub', 'beat']);
});

test('cha cha starts on 2, tango S is twice Q, samba SQQ halves, waltz 123 is 3 cells', () => {
  assert.deepEqual(labels('chacha', '234&1'), ['2', '3', '4', '&', '1']);
  assert.deepEqual(beats('tango', 'SSQQS'), [2, 2, 1, 1, 2]);
  assert.deepEqual(beats('samba', 'SQQ'), [1, 0.5, 0.5]);
  assert.deepEqual(labels('waltz', '123'), ['1', '2', '3']);
});

test('a silent @ is a cell without a label (time still moves)', () => {
  const cells = stripCells(idleProgram('waltz', '12@3'));
  assert.deepEqual(cells.map(cell => [cell.label, cell.kind]), [['1', 'beat'], ['2', 'beat'], ['', 'rest'], ['3', 'beat']]);
});

test('the lit cell follows the engine tick only; no tick or a tick before the first word lights nothing (Ruling 114-4)', () => {
  const cells = stripCells(idleProgram('jive', '123a45a6'));
  assert.equal(stripView(cells, 0).lit, 0);
  assert.equal(stripView(cells, 2640).lit, 3);   // a
  assert.equal(stripView(cells, 2879).lit, 3);
  assert.equal(stripView(cells, 5759).lit, 7);   // 6
  for (const tick of [null, undefined, Number.NaN]) assert.equal(stripView(cells, tick).lit, null);
  const routine = compileRoutine({ danceId: 'waltz', figures: [{ id: 'a', name: 'A', counts: '123' }, { id: 'b', name: 'B', counts: '123' }] });
  assert.equal(stripView(stripCells(programView(routine), 1), 100).lit, null, 'before the first word of the figure');
});

test('more than 12 words are shown 12 at a time; the page follows the lit word, stopped shows page 1 (Ruling 114-3)', () => {
  const counts = '1231231231231';   // 13 語（S5 の長いフィガー）
  const cells = stripCells(idleProgram('waltz', counts));
  assert.equal(cells.length, 13);
  assert.equal(stripView(cells, null).cells.length, MAX_STRIP_CELLS);
  const last = stripView(cells, cells[12]!.tick);
  assert.deepEqual([last.cells.length, last.lit], [1, 0]);
  assert.deepEqual([stripView(cells, cells[11]!.tick).cells.length, stripView(cells, cells[11]!.tick).lit], [12, 11]);
});

test('S5: the cells are the sounding figure only and light on the absolute routine tick', () => {
  const routine = compileRoutine({ danceId: 'waltz', figures: [{ id: 'a', name: 'A', counts: '123' }, { id: 'b', name: 'B', counts: '123123' }] });
  const program = programView(routine);
  const second = stripCells(program, 1);
  assert.deepEqual(second.map(cell => cell.label), ['1', '2', '3', '1', '2', '3']);
  assert.equal(second[0]!.tick, 2880);
  assert.equal(second.at(-1)!.beats, 1, 'the last word runs to the end of the figure');
  assert.equal(stripView(second, 2880 + 960).lit, 1);
  assert.deepEqual(program.figures, [{ startTick: 0, endTick: 2880 }, { startTick: 2880, endTick: 8640 }]);
});

// 夜間便 B-5（Ruling 124・監査 #8）: はじめの合図の間は丸を灰で 1 語ずつ。leadTick（最初の語までの tick・負の数）を型の拍の合計で後ろから回す
test('during the count-in the strip lights one word at a time from the lead tick, marked as lead (B-5)', async () => {
  const { leadStripView } = await import('../../../src/app/practice/beat-indicator.ts');
  const waltz = stripCells(idleProgram('waltz', '123'));
  assert.deepEqual([-6, -5, -4, -3, -2, -1].map(beat => leadStripView(waltz, beat * 960 + 10).lit), [0, 1, 2, 0, 1, 2]);   // 2 小節の合図＝型 2 周
  assert.equal(leadStripView(waltz, -960).lead, true);
  const tango = stripCells(idleProgram('tango', 'SSQQS'));   // 2+2+1+1+2＝8 拍
  assert.deepEqual([-8, -7, -6, -5, -4, -3, -2, -1].map(beat => leadStripView(tango, beat * 960).lit), [0, 0, 1, 1, 2, 3, 4, 4]);
  // ジャイブ（型 6 拍・合図 8 拍）: 合図の最後は型の最後の語「6」＝鳴り始めの「1」へ続く
  const jive = stripCells(idleProgram('jive', '123a45a6'));
  assert.equal(jive[leadStripView(jive, -480).lit!]!.label, '6');
  assert.equal(jive[leadStripView(jive, -8 * 960).lit!]!.label, '5');
  assert.deepEqual(leadStripView(waltz, null), { ...stripView(waltz, null) });   // tick が無ければ点けない
});
