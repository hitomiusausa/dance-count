import test from 'node:test';
import assert from 'node:assert/strict';
import { shareDockNote, shareSectionOrder } from '../../../src/app/share/layout.ts';

test('S9 puts routines before the voice unless a voice was chosen to share (Task 10b)', () => {
  assert.deepEqual(shareSectionOrder({ voiceId: 'user-recorded-v1' }), ['voice', 'routines']);   // S7・S8 から
  assert.deepEqual(shareSectionOrder({ routineId: 'r1' }), ['routines', 'voice']);               // S3 の行から
  assert.deepEqual(shareSectionOrder({}), ['routines', 'voice']);
  assert.deepEqual(shareSectionOrder(null), ['routines', 'voice']);                              // S6 から・直接開いた時
});

test('the "choose a voice or a routine" note is shown only when there is something to choose (Task 10b)', () => {
  assert.equal(shareDockNote({ needsSomething: true, voiceCount: 1, routineCount: 0 }), 'choose');
  assert.equal(shareDockNote({ needsSomething: true, voiceCount: 0, routineCount: 3 }), 'choose');
  assert.equal(shareDockNote({ needsSomething: false, voiceCount: 1, routineCount: 3 }), null);
});

test('with no recorded voice and no routine, the dock says what to do first instead of a dead end (D51・final-review m2)', () => {
  assert.equal(shareDockNote({ needsSomething: true, voiceCount: 0, routineCount: 0 }), 'nothing');
});

test('S9 starts with the only routine and the only finished recording chosen; consent is never a default (夜間便 B-3)', async () => {
  const { shareDefaults } = await import('../../../src/app/share/layout.ts');
  // 指定の声（S7・S8 から）が勝つ
  assert.deepEqual(shareDefaults({ intent: { voiceId: 'v2' }, recordedIds: ['v1', 'v2'], routineIds: ['r1'] }), { voiceId: 'v2', routineIds: ['r1'] });
  // 指定が無く完成した録音がちょうど 1 つ → それ
  assert.deepEqual(shareDefaults({ intent: null, recordedIds: ['v1'], routineIds: ['r1', 'r2'] }), { voiceId: 'v1', routineIds: [] });
  // 録音が 2 つ → 入れない・指定のルーティン（S3 から）はそのまま
  assert.deepEqual(shareDefaults({ intent: { routineId: 'r2' }, recordedIds: ['v1', 'v2'], routineIds: ['r1', 'r2'] }), { voiceId: null, routineIds: ['r2'] });
  // 録音なし・ルーティンなし → 何も選ばない
  assert.deepEqual(shareDefaults({ intent: null, recordedIds: [], routineIds: [] }), { voiceId: null, routineIds: [] });
  // 指定の声がもう配れない（消えた）→ 入れない（ほかの録音に勝手に替えない）
  assert.deepEqual(shareDefaults({ intent: { voiceId: 'gone' }, recordedIds: ['v1'], routineIds: [] }), { voiceId: null, routineIds: [] });
});
