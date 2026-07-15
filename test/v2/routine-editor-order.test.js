import test from 'node:test';
import assert from 'node:assert/strict';
import { dropDestination } from '../../src/v2/routine-editor-order.js';

test('drop destination accounts for removing the source before a downward insertion', () => {
  assert.equal(dropDestination(0, 2, true, 4), 2);
  assert.equal(dropDestination(0, 2, false, 4), 1);
});

test('drop destination keeps direct upward insertion positions', () => {
  assert.equal(dropDestination(3, 1, false, 4), 1);
  assert.equal(dropDestination(3, 1, true, 4), 2);
});
