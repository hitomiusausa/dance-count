import test from 'node:test';
import assert from 'node:assert/strict';
import { dropDestination } from '../../../src/engine/routine-editor-order.js';
import { AUTO_SCROLL_STEP_PX, autoScrollStep, dropTargetFromY, isDragStart, liftOffset, unliftBox } from '../../../src/app/routines/reorder-drag.ts';

test('a drag starts at 8px from the press point; less is a tap (Ruling 49-4)', () => {
  assert.equal(isDragStart(7.9, 0), false);
  assert.equal(isDragStart(0, 8), true);
  assert.equal(isDragStart(5, 6), false);  // 7.81
  assert.equal(isDragStart(6, 6), true);   // 8.49
});

const ROWS = Array.from({ length: 13 }, (_, index) => ({ top: 100 + index * 65, bottom: 165 + index * 65 }));

test('the finger height picks the row and the side of it', () => {
  assert.equal(dropTargetFromY([], 10), null);
  assert.deepEqual(dropTargetFromY(ROWS, 50), { targetIndex: 0, placeAfter: false });     // 先頭より上
  assert.deepEqual(dropTargetFromY(ROWS, 2000), { targetIndex: 12, placeAfter: true });   // 末尾より下
  assert.deepEqual(dropTargetFromY(ROWS, 110), { targetIndex: 0, placeAfter: false });
  assert.deepEqual(dropTargetFromY(ROWS, 132.5), { targetIndex: 0, placeAfter: true });   // 中央ちょうどは後
  assert.deepEqual(dropTargetFromY(ROWS, 165), { targetIndex: 1, placeAfter: false });    // 境目は次の行の上側
});

test('together with dropDestination: moves land where the line shows (13 figures)', () => {
  const to = (from: number, y: number) => { const target = dropTargetFromY(ROWS, y)!; return dropDestination(from, target.targetIndex, target.placeAfter, 13); };
  assert.equal(to(2, ROWS[9]!.top + 40), 9);     // 2 → 9 の行の下半分
  assert.equal(to(9, ROWS[2]!.top + 10), 2);     // 9 → 2 の行の上半分
  assert.equal(to(0, 2000), 12);                 // 先頭 → 末尾
  assert.equal(to(12, 0), 0);                    // 末尾 → 先頭
  assert.equal(to(5, ROWS[5]!.top + 10), 5);     // 同じ位置
});

test('auto-scroll only near the edges of the visible area, at a fixed step', () => {
  assert.equal(autoScrollStep(30, 0, 570), -AUTO_SCROLL_STEP_PX);
  assert.equal(autoScrollStep(300, 0, 570), 0);
  assert.equal(autoScrollStep(560, 0, 570), AUTO_SCROLL_STEP_PX);
  assert.equal(autoScrollStep(48, 0, 570), 0);
});

// つかんだ行は指についてくる（Ruling 51）。行 3（top 230・bottom 295）を y 250 で押した。一覧は 100〜945。
const LIFT = { pressY: 250, scrollY0: 0, rowTop0: 230, rowBottom0: 295, listTop: 100, listBottom: 945 };

test('the lifted row follows the finger inside the list (Ruling 51-2・4)', () => {
  assert.equal(liftOffset({ ...LIFT, pointerY: 400, scrollY: 0 }), 150);     // 中: 指の移動量そのまま
  assert.equal(liftOffset({ ...LIFT, pointerY: 0, scrollY: 0 }), -130);      // 上に出る: 行の上端は一覧の上端で止まる
  assert.equal(liftOffset({ ...LIFT, pointerY: 2000, scrollY: 0 }), 650);    // 下に出る: 行の下端は一覧の下端で止まる
});

test('after 100px of auto-scroll the row is still under the finger (Ruling 51-2)', () => {
  // ページが 100px 進むと、行も一覧も画面の上では 100px 上へずれる。指は同じ高さ 400。
  const dy = liftOffset({ ...LIFT, pointerY: 400, scrollY: 100, listTop: 0, listBottom: 845 });
  assert.equal(dy, 250);
  assert.equal(LIFT.rowTop0 - 100 + dy, LIFT.rowTop0 + (400 - LIFT.pressY));   // 見えている上端 = 押した時の上端 + 指の移動量
  // スクロール後も clamp は今の一覧の下端で効く
  assert.equal(liftOffset({ ...LIFT, pointerY: 2000, scrollY: 100, listTop: 0, listBottom: 845 }), 650);
});

test('the moved row is put back to where it is laid out before choosing the target (Ruling 51-3)', () => {
  assert.deepEqual(unliftBox({ top: 380, bottom: 445 }, 150), { top: 230, bottom: 295 });
  const boxes = ROWS.map((box, index) => (index === 2 ? { top: box.top + 300, bottom: box.bottom + 300 } : box));
  boxes[2] = unliftBox(boxes[2]!, 300);
  assert.deepEqual(boxes, ROWS);
});
