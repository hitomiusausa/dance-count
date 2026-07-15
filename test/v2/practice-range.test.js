import test from 'node:test';
import assert from 'node:assert/strict';
import { figureRangeTicks, normalizeFigureRange } from '../../src/v2/practice-range.js';

test('figure range clamps indices and never ends before it starts', () => {
  assert.deepEqual(normalizeFigureRange(4, 2, 1), { startIndex: 2, endIndex: 2 });
  assert.deepEqual(normalizeFigureRange(4, -3, 20), { startIndex: 0, endIndex: 3 });
});

test('figure range resolves exact compiled tick boundaries', () => {
  const compiled = { figures: [
    { startTick: 0, endTick: 1920 },
    { startTick: 1920, endTick: 3840 },
    { startTick: 3840, endTick: 6720 }
  ] };
  assert.deepEqual(figureRangeTicks(compiled, { startIndex: 1, endIndex: 2 }), {
    startIndex: 1, endIndex: 2, startTick: 1920, endTick: 6720
  });
});
