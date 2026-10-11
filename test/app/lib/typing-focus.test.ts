import test from 'node:test';
import assert from 'node:assert/strict';
import { isTypingInside, isTypingTarget, TypingDock } from '../../../src/app/lib/typing-focus.ts';

test('text inputs and textareas are typing targets', () => {
  assert.equal(isTypingTarget({ tagName: 'INPUT', type: 'text' }), true);
  assert.equal(isTypingTarget({ tagName: 'input', type: 'search' }), true);
  assert.equal(isTypingTarget({ tagName: 'INPUT' }), true);
  assert.equal(isTypingTarget({ tagName: 'TEXTAREA' }), true);
});

test('buttons, switches, radios and nothing are not typing targets (the dock shows)', () => {
  assert.equal(isTypingTarget({ tagName: 'BUTTON', type: 'button' }), false);
  assert.equal(isTypingTarget({ tagName: 'INPUT', type: 'checkbox' }), false);
  assert.equal(isTypingTarget({ tagName: 'INPUT', type: 'radio' }), false);
  assert.equal(isTypingTarget({ tagName: 'SUMMARY' }), false);
  assert.equal(isTypingTarget(null), false);
  assert.equal(isTypingTarget(undefined), false);
});

test('TypingDock hides at once on focus into a text field and shows on leaving it', () => {
  const dock = new TypingDock();
  assert.equal(dock.focusIn({ tagName: 'INPUT', type: 'text' }), true);
  assert.equal(dock.hidden, true);
  assert.equal(dock.focusOut({ tagName: 'INPUT', type: 'text' }), null); // 文字の欄から文字の欄へ: 隠したまま
  assert.equal(dock.focusOut(null), false);
  assert.equal(dock.hidden, false);
  assert.equal(dock.focusIn({ tagName: 'BUTTON' }), null);
});

test('TypingDock waits for the finger to lift before showing the dock (the press must land on the button under it)', () => {
  const dock = new TypingDock();
  dock.focusIn({ tagName: 'INPUT' });
  dock.pointerDown();
  assert.equal(dock.focusOut({ tagName: 'BUTTON' }), null);
  assert.equal(dock.focusIn({ tagName: 'BUTTON' }), null); // ボタンがフォーカスを受けても、押している間は隠したまま
  assert.equal(dock.recheck(false), null);                  // 描画のたびの確かめ直しでも、押している間は待つ
  assert.equal(dock.hidden, true);
  assert.equal(dock.pointerUp(false), false);
  assert.equal(dock.hidden, false);
  assert.equal(dock.pointerUp(false), null);
});

test('TypingDock: pressing from one text field into another keeps the dock hidden', () => {
  const dock = new TypingDock();
  dock.focusIn({ tagName: 'INPUT' });
  dock.pointerDown();
  assert.equal(dock.focusOut({ tagName: 'BUTTON' }), null);
  assert.equal(dock.focusIn({ tagName: 'TEXTAREA' }), null);
  assert.equal(dock.pointerUp(true), null);
  assert.equal(dock.hidden, true);
});

test('TypingDock does not get stuck when the focused field is removed without a focusout (WebKit, F6 round 3)', () => {
  const dock = new TypingDock();
  dock.focusIn({ tagName: 'INPUT' });
  dock.pointerDown();                          // iOS: ボタンを押してもフォーカスは欄に残る
  assert.equal(dock.pointerUp(true), null);    // 押した直後はまだ欄が画面にある
  assert.equal(dock.recheck(false), false);    // 複製で行が閉じ欄が消えた後の描画で確かめ直す → 帯が戻る
  assert.equal(dock.hidden, false);
});

test('isTypingInside: a connected text field inside the root only', () => {
  const root = { contains: (node: unknown) => node === inside || node === removed };
  const inside = { tagName: 'INPUT', type: 'text', isConnected: true };
  const removed = { tagName: 'INPUT', type: 'text', isConnected: false };
  assert.equal(isTypingInside(inside, root), true);
  assert.equal(isTypingInside(removed, root), false);
  assert.equal(isTypingInside({ tagName: 'INPUT', isConnected: true }, root), false); // 根の外（例 別の画面）
  assert.equal(isTypingInside({ tagName: 'BODY', isConnected: true }, root), false);
  assert.equal(isTypingInside(inside, null), false);
  assert.equal(isTypingInside(null, root), false);
});
