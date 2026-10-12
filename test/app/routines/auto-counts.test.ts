import test from 'node:test';
import assert from 'node:assert/strict';
import { autoCounts } from '../../../src/app/routines/auto-counts.ts';
import { createRoutine, type Routine } from '../../../src/app/routines/routine.ts';

// D52・Ruling 106: 自分が前に使ったカウント（端末の全ルーティン・今のルーティンを除く）→ 監修済みの表。
function routine(id: string, figures: Array<[string, string]>, options: { danceId?: string; updatedAt?: string; received?: boolean } = {}): Routine {
  const base = createRoutine({ id, danceId: options.danceId ?? 'waltz', name: id, now: '2026-10-01T00:00:00.000Z' });
  return {
    ...base,
    ...(options.received ? { source: 'received' as const, provenance: { ...base.provenance, sourceKind: 'received' as const }, receivedFrom: { distributor: '先生', receivedAt: '2026-10-01' } } : {}),
    updatedAt: options.updatedAt ?? '2026-10-01T00:00:00.000Z',
    figures: figures.map(([name, counts], index) => ({ id: `f-0000000${index}`, name, counts }))
  };
}
const noReviewed = () => null;

test('a figure used in another routine of the same dance gives its counts (from: history)', () => {
  const routines = [routine('r-aaaaaaaa', []), routine('r-bbbbbbbb', [['ウィスク', '12&3']])];
  assert.deepEqual(autoCounts({ danceId: 'waltz', name: 'ウィスク', routines, excludeRoutineId: 'r-aaaaaaaa', reviewed: noReviewed }), { counts: '12&3', from: 'history' });
});

test('the same figure is matched by figureIdentity (English name, hiragana)', () => {
  const routines = [routine('r-bbbbbbbb', [['Whisk', '123']])];
  assert.deepEqual(autoCounts({ danceId: 'waltz', name: 'うぃすく', routines, excludeRoutineId: 'r-aaaaaaaa', reviewed: noReviewed }), { counts: '123', from: 'history' });
});

test('free-typed names match only by the folded spelling', () => {
  const routines = [routine('r-bbbbbbbb', [['私のステップ', '1 2 3 1 2 3']])];
  assert.deepEqual(autoCounts({ danceId: 'waltz', name: ' 私のステップ ', routines, excludeRoutineId: 'r-aaaaaaaa', reviewed: noReviewed }), { counts: '123123', from: 'history' });
  assert.equal(autoCounts({ danceId: 'waltz', name: '私のステッ', routines, excludeRoutineId: 'r-aaaaaaaa', reviewed: noReviewed }), null);
});

test('the routine being edited is excluded (D13/D19 handle the same routine)', () => {
  const routines = [routine('r-aaaaaaaa', [['ウィスク', '12&3']])];
  assert.equal(autoCounts({ danceId: 'waltz', name: 'ウィスク', routines, excludeRoutineId: 'r-aaaaaaaa', reviewed: noReviewed }), null);
});

test('other dances are not used', () => {
  const routines = [routine('r-bbbbbbbb', [['ウィスク', '123']], { danceId: 'foxtrot' })];
  assert.equal(autoCounts({ danceId: 'waltz', name: 'ウィスク', routines, excludeRoutineId: 'r-aaaaaaaa', reviewed: noReviewed }), null);
});

test('received routines count as history too (Ruling 106-3)', () => {
  const routines = [routine('r-bbbbbbbb', [['ウィスク', '12&3']], { received: true })];
  assert.deepEqual(autoCounts({ danceId: 'waltz', name: 'ウィスク', routines, excludeRoutineId: 'r-aaaaaaaa', reviewed: noReviewed }), { counts: '12&3', from: 'history' });
});

test('several values: the most recently updated routine wins, then its lowest row (Ruling 106-4)', () => {
  const routines = [
    routine('r-bbbbbbbb', [['ウィスク', '123']], { updatedAt: '2026-10-05T00:00:00.000Z' }),
    routine('r-cccccccc', [['ナチュラルターン', '123'], ['ウィスク', '12&3'], ['ウィスク', '1&23']], { updatedAt: '2026-10-09T00:00:00.000Z' }),
    routine('r-dddddddd', [['ウィスク', '1a23']], { updatedAt: '2026-10-07T00:00:00.000Z' })
  ];
  assert.deepEqual(autoCounts({ danceId: 'waltz', name: 'ウィスク', routines, excludeRoutineId: 'r-aaaaaaaa', reviewed: noReviewed }), { counts: '12&3', from: 'history' });
});

test('a saved value that does not pass checkCounts is skipped', () => {
  const routines = [
    routine('r-bbbbbbbb', [['ウィスク', '12x3']], { updatedAt: '2026-10-09T00:00:00.000Z' }),
    routine('r-cccccccc', [['ウィスク', '123']], { updatedAt: '2026-10-01T00:00:00.000Z' })
  ];
  assert.deepEqual(autoCounts({ danceId: 'waltz', name: 'ウィスク', routines, excludeRoutineId: 'r-aaaaaaaa', reviewed: noReviewed }), { counts: '123', from: 'history' });
});

test('the reviewed table is used only when there is no history (Ruling 106-2)', () => {
  const reviewed = (danceId: string, name: string) => (danceId === 'waltz' && name === 'ウィスク' ? { counts: '123' } : null);
  assert.deepEqual(autoCounts({ danceId: 'waltz', name: 'ウィスク', routines: [], excludeRoutineId: 'r-aaaaaaaa', reviewed }), { counts: '123', from: 'reviewed' });
  const routines = [routine('r-bbbbbbbb', [['ウィスク', '12&3']])];
  assert.deepEqual(autoCounts({ danceId: 'waltz', name: 'ウィスク', routines, excludeRoutineId: 'r-aaaaaaaa', reviewed }), { counts: '12&3', from: 'history' });
});

test('an empty name gives nothing; with no history and the shipped (empty) table, nothing', () => {
  const routines = [routine('r-bbbbbbbb', [['ウィスク', '123']])];
  assert.equal(autoCounts({ danceId: 'waltz', name: '  ', routines, excludeRoutineId: 'r-aaaaaaaa', reviewed: noReviewed }), null);
  assert.equal(autoCounts({ danceId: 'waltz', name: 'ウィスク', routines: [], excludeRoutineId: 'r-aaaaaaaa' }), null);
});
