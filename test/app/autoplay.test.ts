import test from 'node:test';
import assert from 'node:assert/strict';
import { requestAutoplay, takeAutoplay } from '../../src/app/state/autoplay.ts';

test('the resume mark plays once for its dance and is then gone', () => {
  requestAutoplay('waltz');
  assert.equal(takeAutoplay('waltz'), true);
  assert.equal(takeAutoplay('waltz'), false);
});

test('a mark for another dance does not play and is still consumed', () => {
  requestAutoplay('tango');
  assert.equal(takeAutoplay('waltz'), false);
  assert.equal(takeAutoplay('tango'), false);
});

test('with no mark nothing plays (reload, browser back, direct open)', () => {
  assert.equal(takeAutoplay('jive'), false);
});
