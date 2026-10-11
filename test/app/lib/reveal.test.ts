import test from 'node:test';
import assert from 'node:assert/strict';
import { REVEAL_MARGIN_PX, revealScrollBy } from '../../../src/app/lib/reveal.ts';

test('an element already above the visible bottom needs no scroll', () => {
  assert.equal(revealScrollBy({ bottom: 300, keepTop: 100, visibleTop: 0, visibleBottom: 400 }), 0);
  assert.equal(revealScrollBy({ bottom: 400 - REVEAL_MARGIN_PX, keepTop: 100, visibleTop: 0, visibleBottom: 400 }), 0);
});

test('a button under the keyboard scrolls up just enough to clear it with the margin', () => {
  assert.equal(revealScrollBy({ bottom: 450, keepTop: 200, visibleTop: 0, visibleBottom: 400 }), 50 + REVEAL_MARGIN_PX);
  assert.equal(revealScrollBy({ bottom: 450.2, keepTop: 200, visibleTop: 0, visibleBottom: 400, margin: 0 }), 51);
});

test('the visual viewport offset (iOS keyboard shifting the view) is honoured', () => {
  assert.equal(revealScrollBy({ bottom: 700, keepTop: 450, visibleTop: 300, visibleBottom: 650, margin: 10 }), 60);
});

test('the focused field never goes above the visible top (the scroll is capped)', () => {
  assert.equal(revealScrollBy({ bottom: 900, keepTop: 112, visibleTop: 0, visibleBottom: 400 }), 100);
  assert.equal(revealScrollBy({ bottom: 900, keepTop: 5, visibleTop: 0, visibleBottom: 400 }), 0);
});

test('a fixed bottom bar inside the visible area also counts as covering (the Play-all dock)', () => {
  assert.equal(revealScrollBy({ bottom: 330, keepTop: 200, visibleTop: 0, visibleBottom: 400, coverTop: 340, margin: 10 }), 0);
  assert.equal(revealScrollBy({ bottom: 350, keepTop: 200, visibleTop: 0, visibleBottom: 400, coverTop: 340, margin: 10 }), 20);
  assert.equal(revealScrollBy({ bottom: 350, keepTop: 200, visibleTop: 0, visibleBottom: 400, coverTop: 600, margin: 10 }), 0); // 帯がキーボードの下＝見えていない
});
