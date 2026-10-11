import test from 'node:test';
import assert from 'node:assert/strict';
import { canGoBackInHistory, recordVisit, replaceTop } from '../../src/app/router/back-stack.ts';

const walk = (hashes: string[]) => hashes.reduce<string[]>((stack, hash) => recordVisit(stack, hash), []);

test('opening a screen directly leaves nothing to go back to', () => {
  assert.equal(canGoBackInHistory(walk(['#/practice/waltz'])), false);
  assert.equal(canGoBackInHistory(walk(['', '#/'])), false);
});

test('home -> practice can go back; after going back the stack shrinks', () => {
  const forward = walk(['#/', '#/practice/waltz']);
  assert.deepEqual(forward, ['#/', '#/practice/waltz']);
  assert.equal(canGoBackInHistory(forward), true);
  assert.deepEqual(recordVisit(forward, '#/'), ['#/']);
});

test('direct practice -> voices -> back -> back needs the parent fallback', () => {
  const stack = walk(['#/practice/waltz', '#/voices', '#/practice/waltz']);
  assert.deepEqual(stack, ['#/practice/waltz']);
  assert.equal(canGoBackInHistory(stack), false);
});

test('the ui-state query does not count as a different screen', () => {
  assert.deepEqual(walk(['#/practice/waltz?ui-state=no-sound', '#/practice/waltz']), ['#/practice/waltz']);
});

test('replaceTop swaps the last entry for the normalized path', () => {
  assert.deepEqual(replaceTop([], '#/voices?ui-state=no-sound'), ['#/voices']);
  assert.deepEqual(replaceTop([], ''), ['#/']);
  assert.deepEqual(replaceTop(['#/practice/waltz'], '#/'), ['#/']);
  assert.deepEqual(replaceTop(['#/', '#/practice/waltz'], '#/voices'), ['#/', '#/voices']);
});

test('direct S8 -> parent replace leaves no phantom entry', () => {
  const opened = recordVisit([], '#/voices/record');
  const replaced = replaceTop(opened, '#/voices');
  const afterHashChange = recordVisit(replaced, '#/voices');
  assert.deepEqual(afterHashChange, ['#/voices']);
  assert.equal(canGoBackInHistory(afterHashChange), false);
});
