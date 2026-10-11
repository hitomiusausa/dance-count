import test from 'node:test';
import assert from 'node:assert/strict';
import { isFigureId, isRoutineId, makeId } from '../../../src/app/routines/ids.ts';
import { isVoiceId } from '../../../src/app/voices/ids.ts';

test('ids are r-/f- plus a UUID and pass their own check', () => {
  const routineId = makeId('r');
  const figureId = makeId('f');
  assert.match(routineId, /^r-[0-9a-f-]{36}$/);
  assert.ok(isRoutineId(routineId) && isFigureId(figureId));
  assert.notEqual(makeId('r'), makeId('r'));
});

test('without crypto.randomUUID the fallback still makes a valid id (old Safari)', () => {
  const id = makeId('r', { now: () => 1760000000000, random: () => 0.5 });
  assert.ok(isRoutineId(id), id);
  assert.equal(id, makeId('r', { randomUUID: () => 'bad id!', now: () => 1760000000000, random: () => 0.5 }));
});

test('the reserved word "new" and other junk are never routine ids (Ruling 37)', () => {
  for (const bad of ['new', 'r-new', 'r-123', 'f-12345678', 'R-12345678', 'r-1234567_', 'r-12345678/x', '', null, 42, undefined]) {
    assert.equal(isRoutineId(bad), false, String(bad));
  }
  assert.equal(isFigureId('r-12345678'), false);
  assert.equal(isRoutineId('r-12345678'), true);
});

test('a received voice gets a v- id that the voice id check accepts (Ruling 84-1)', () => {
  const id = makeId('v');
  assert.match(id, /^v-[0-9a-f-]{36}$/);
  assert.equal(isVoiceId(id), true);
  assert.equal(isVoiceId(makeId('v', { now: () => 1760000000000, random: () => 0.5 })), true);
});
