import test from 'node:test';
import assert from 'node:assert/strict';
import { shareSectionOrder, showChooseNote } from '../../../src/app/share/layout.ts';

test('S9 puts routines before the voice unless a voice was chosen to share (Task 10b)', () => {
  assert.deepEqual(shareSectionOrder({ voiceId: 'user-recorded-v1' }), ['voice', 'routines']);   // S7・S8 から
  assert.deepEqual(shareSectionOrder({ routineId: 'r1' }), ['routines', 'voice']);               // S3 の行から
  assert.deepEqual(shareSectionOrder({}), ['routines', 'voice']);
  assert.deepEqual(shareSectionOrder(null), ['routines', 'voice']);                              // S6 から・直接開いた時
});

test('the "choose a voice or a routine" note is shown only when there is something to choose (Task 10b)', () => {
  assert.equal(showChooseNote({ needsSomething: true, voiceCount: 0, routineCount: 0 }), false);
  assert.equal(showChooseNote({ needsSomething: true, voiceCount: 1, routineCount: 0 }), true);
  assert.equal(showChooseNote({ needsSomething: true, voiceCount: 0, routineCount: 3 }), true);
  assert.equal(showChooseNote({ needsSomething: false, voiceCount: 1, routineCount: 3 }), false);
});
