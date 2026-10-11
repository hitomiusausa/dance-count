import test from 'node:test';
import assert from 'node:assert/strict';
import { REVEAL_MARGIN_PX, revealScrollBy, throttleToFrame } from '../../../src/app/lib/reveal.ts';

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

test('throttleToFrame runs at most once per frame and cancel drops the pending run', () => {
  const frames: Array<() => void> = [];
  const schedule = (callback: () => void) => { frames.push(callback); const index = frames.length - 1; return () => { frames[index] = () => {}; }; };
  let runs = 0;
  const throttled = throttleToFrame(() => { runs += 1; }, schedule);
  throttled.request(); throttled.request(); throttled.request();
  assert.equal(frames.length, 1);
  frames[0]!();
  assert.equal(runs, 1);
  throttled.request();
  assert.equal(frames.length, 2);
  throttled.cancel();
  frames[1]!();
  assert.equal(runs, 1);
  throttled.request();
  assert.equal(frames.length, 3); // 取り消しの後はまた予約できる
});
