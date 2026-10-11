import test from 'node:test';
import assert from 'node:assert/strict';
import { isTypingTarget, TypingDock } from '../../../src/app/lib/typing-focus.ts';

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
  assert.equal(dock.hidden, true);
  assert.equal(dock.pointerUp(), false);
  assert.equal(dock.hidden, false);
  assert.equal(dock.pointerUp(), null);
});

test('TypingDock: pressing from one text field into another keeps the dock hidden', () => {
  const dock = new TypingDock();
  dock.focusIn({ tagName: 'INPUT' });
  dock.pointerDown();
  assert.equal(dock.focusOut({ tagName: 'BUTTON' }), null);
  assert.equal(dock.focusIn({ tagName: 'TEXTAREA' }), null); // 保留は取り消し
  assert.equal(dock.pointerUp(), null);
  assert.equal(dock.hidden, true);
});
