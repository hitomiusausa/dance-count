import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoutine } from '../../../src/app/routines/routine.ts';
import { deleteRoutine, loadRoutines, saveRoutine } from '../../../src/app/routines/store.ts';
import { memoryStorage } from '../helpers/memory-storage.ts';

const routine = (id: string, createdAt: string) => createRoutine({ id, danceId: 'waltz', name: id, now: createdAt });
const A = routine('r-aaaaaaaa', '2026-10-11T09:00:00.000Z');
const B = routine('r-bbbbbbbb', '2026-10-11T08:00:00.000Z');

test('no storage (private mode): empty list, saves report false', async () => {
  assert.deepEqual(await loadRoutines(null), []);
  assert.equal(await saveRoutine(null, A), false);
  assert.equal(await deleteRoutine(null, A.id), false);
});

test('saved routines come back in creation order (Ruling 44)', async () => {
  const { storage } = memoryStorage();
  assert.equal(await saveRoutine(storage, A), true);
  assert.equal(await saveRoutine(storage, B), true);
  assert.deepEqual((await loadRoutines(storage)).map(item => item.id), [B.id, A.id]);
});

test('broken or legacy records are skipped, not deleted', async () => {
  const { storage, data } = memoryStorage({ 'routines/r-legacy01': { ...A, id: 'r-legacy01', source: 'legacy-import' } });
  await saveRoutine(storage, A);
  assert.deepEqual((await loadRoutines(storage)).map(item => item.id), [A.id]);
  assert.ok(data.has('routines/r-legacy01'));
});

test('delete removes the record', async () => {
  const { storage } = memoryStorage();
  await saveRoutine(storage, A);
  assert.equal(await deleteRoutine(storage, A.id), true);
  assert.deepEqual(await loadRoutines(storage), []);
});

test('a failing write returns false and the next write still happens', async () => {
  const failing = memoryStorage({}, { failWrites: true });
  assert.equal(await saveRoutine(failing.storage, A), false);
  const { storage } = memoryStorage();
  assert.equal(await saveRoutine(storage, B), true);
});

test('a failing read gives an empty list instead of throwing', async () => {
  assert.deepEqual(await loadRoutines(memoryStorage({}, { failReads: true }).storage), []);
});
