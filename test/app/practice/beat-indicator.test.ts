import test from 'node:test';
import assert from 'node:assert/strict';
import { beatIndexInBar } from '../../../src/app/practice/beat-indicator.ts';

test('beat index follows the tick within the bar', () => {
  assert.equal(beatIndexInBar(0, 3), 0);
  assert.equal(beatIndexInBar(959, 3), 0);
  assert.equal(beatIndexInBar(960, 3), 1);
  assert.equal(beatIndexInBar(2 * 960 + 480, 3), 2);
  assert.equal(beatIndexInBar(3 * 960, 3), 0);
  assert.equal(beatIndexInBar(7 * 960, 4), 3);
  assert.equal(beatIndexInBar(960, 2), 1);
});

test('no tick (stopped or lead-in) means no lit beat', () => {
  for (const tick of [null, undefined, Number.NaN, Infinity]) assert.equal(beatIndexInBar(tick, 3), null);
  assert.equal(beatIndexInBar(0, 0), null);
});

test('a negative tick (pickup) still lands inside the bar', () => {
  assert.equal(beatIndexInBar(-240, 4), 3);
});
