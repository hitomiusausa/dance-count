import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoutine, normalizeRoutine, routinePlayability, uniqueRoutineName, type Routine } from '../../../src/app/routines/routine.ts';

const NOW = '2026-10-11T09:00:00.000Z';
const ID = 'r-0f8fad5b-d9cb-469f-a165-70867728950e';

function waltz(figures: Routine['figures'] = [{ id: 'f-11111111', name: 'ナチュラルターン', counts: '123' }]): Routine {
  return { ...createRoutine({ id: ID, danceId: 'waltz', name: 'ワルツの練習', now: NOW }), figures };
}

test('a new routine has the Ruling 44 values', () => {
  const routine = createRoutine({ id: ID, danceId: 'waltz', name: 'ワルツのルーティン', now: NOW });
  assert.deepEqual(routine, {
    id: ID, danceId: 'waltz', name: 'ワルツのルーティン', bpm: null, countInBars: 1, source: 'user-created', status: 'ready', figures: [],
    provenance: { sourceKind: 'user-created', authority: null, authorityClaimStatus: 'not-applicable', reviewStatus: 'unreviewed' },
    createdWith: { app: 'dance-count', version: 'test' }, createdAt: NOW, updatedAt: NOW
  });
});

test('default names count up when taken (Ruling 37)', () => {
  assert.equal(uniqueRoutineName('ワルツのルーティン', []), 'ワルツのルーティン');
  assert.equal(uniqueRoutineName('ワルツのルーティン', ['ワルツのルーティン']), 'ワルツのルーティン 2');
  assert.equal(uniqueRoutineName('ワルツのルーティン', ['ワルツのルーティン', 'ワルツのルーティン 2']), 'ワルツのルーティン 3');
});

test('playability: empty, invalid stored counts, ok (Ruling 40)', () => {
  assert.equal(routinePlayability(waltz([])), 'empty');
  assert.equal(routinePlayability(waltz()), 'ok');
  assert.equal(routinePlayability(waltz([{ id: 'f-11111111', name: 'x', counts: '12a3' }])), 'invalid');
});

test('a saved routine survives normalizing unchanged (JSON round trip)', () => {
  const routine = { ...waltz(), bpm: 90, countInBars: 2 as const };
  assert.deepEqual(normalizeRoutine(JSON.parse(JSON.stringify(routine))), routine);
});

test('unknown keys are dropped and a missing createdAt falls back to updatedAt', () => {
  const { createdAt: _drop, ...old } = waltz();
  const normalized = normalizeRoutine({ ...old, extra: 'x', figures: [{ id: 'f-11111111', name: 'a', counts: '123', note: 'y' }] });
  assert.equal(normalized?.createdAt, NOW);
  assert.equal(Object.hasOwn(normalized!, 'extra'), false);
  assert.deepEqual(normalized?.figures, [{ id: 'f-11111111', name: 'a', counts: '123' }]);
});

test('legacy, foreign and broken values are not listed (Ruling 44)', () => {
  const base = waltz();
  const broken: unknown[] = [
    null, 'x', [], { ...base, id: 'new' }, { ...base, danceId: 'hiphop' }, { ...base, name: '  ' }, { ...base, name: 'x'.repeat(41) },
    { ...base, bpm: 39 }, { ...base, bpm: 84.5 }, { ...base, countInBars: 0 }, { ...base, source: 'legacy-import' },
    { ...base, provenance: { ...base.provenance, sourceKind: 'legacy-import' } },
    { ...base, provenance: { ...base.provenance, reviewStatus: 'reviewed' } },
    { ...base, figures: 'x' }, { ...base, figures: [{ id: 'bad', name: 'a', counts: '1' }] },
    { ...base, figures: [{ id: 'f-11111111', name: 'a', counts: '' }] },
    { ...base, figures: Array.from({ length: 65 }, (_, i) => ({ id: `f-${String(i).padStart(8, '0')}`, name: 'a', counts: '123' })) },
    { ...base, createdWith: { app: 'other', version: '1' } }, { ...base, updatedAt: 5 }
  ];
  for (const value of broken) assert.equal(normalizeRoutine(value), null, JSON.stringify(value)?.slice(0, 80));
});

test('received-from is kept only in the right shape (display only until stage 5)', () => {
  assert.deepEqual(normalizeRoutine({ ...waltz(), receivedFrom: { distributor: '山田', receivedAt: NOW } })?.receivedFrom, { distributor: '山田', receivedAt: NOW });
  assert.equal(normalizeRoutine({ ...waltz(), receivedFrom: { distributor: 3 } })?.receivedFrom, undefined);
});
