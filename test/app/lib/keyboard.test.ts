import test from 'node:test';
import assert from 'node:assert/strict';
import { hidesDock, isKeyboardOpen, KEYBOARD_MIN_PX } from '../../../src/app/lib/keyboard.ts';

test('desktop and no keyboard: the visual viewport is as tall as the layout, so the dock stays', () => {
  assert.equal(isKeyboardOpen({ layoutHeight: 667, visualHeight: 667, scale: 1 }), false);
  assert.equal(isKeyboardOpen({ layoutHeight: 900, visualHeight: 900, scale: 1 }), false);
});

test('no visualViewport (null) never hides the dock', () => {
  assert.equal(isKeyboardOpen(null), false);
});

test('an iPhone software keyboard (about 260-340px) counts as open', () => {
  assert.equal(isKeyboardOpen({ layoutHeight: 667, visualHeight: 667 - 260, scale: 1 }), true);
  assert.equal(isKeyboardOpen({ layoutHeight: 844, visualHeight: 844 - 336, scale: 1 }), true);
});

test('toolbar and hardware-keyboard bar differences (under the threshold) do not hide the dock', () => {
  assert.equal(isKeyboardOpen({ layoutHeight: 667, visualHeight: 667 - 100, scale: 1 }), false);
  assert.equal(isKeyboardOpen({ layoutHeight: 667, visualHeight: 667 - 55, scale: 1 }), false);
  // ツールバーが引っ込んで visualViewport の方が高い時（差が負）も開いていない
  assert.equal(isKeyboardOpen({ layoutHeight: 667, visualHeight: 740, scale: 1 }), false);
});

test('the threshold is strict: exactly KEYBOARD_MIN_PX is not open, one more is', () => {
  assert.equal(isKeyboardOpen({ layoutHeight: 667, visualHeight: 667 - KEYBOARD_MIN_PX, scale: 1 }), false);
  assert.equal(isKeyboardOpen({ layoutHeight: 667, visualHeight: 667 - KEYBOARD_MIN_PX - 1, scale: 1 }), true);
});

test('pinch zoom alone does not count as a keyboard (height is scaled back)', () => {
  assert.equal(isKeyboardOpen({ layoutHeight: 667, visualHeight: 667 / 2, scale: 2 }), false);
  // 拡大中にキーボードも開いた時は開いている
  assert.equal(isKeyboardOpen({ layoutHeight: 667, visualHeight: (667 - 300) / 2, scale: 2 }), true);
});

test('broken readings (zero or missing heights) never hide the dock', () => {
  assert.equal(isKeyboardOpen({ layoutHeight: 0, visualHeight: 0, scale: 1 }), false);
  assert.equal(isKeyboardOpen({ layoutHeight: 667, visualHeight: 0, scale: 1 }), false);
  assert.equal(isKeyboardOpen({ layoutHeight: 667, visualHeight: 300, scale: 0 }), true);
});

test('the dock hides for the keyboard only while nothing is playing (final review 2 M4: the stop button stays)', () => {
  assert.equal(hidesDock(true, false), true);
  assert.equal(hidesDock(true, true), false);
  assert.equal(hidesDock(false, false), false);
  assert.equal(hidesDock(false, true), false);
});
