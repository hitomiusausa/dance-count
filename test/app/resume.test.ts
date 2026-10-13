// 夜間便 B-1（Ruling 124・監査 #2）: 「前回」にルーティンも入る。lastPractice の 4 分岐と、設定の欠けた鍵の既定。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoutine, type Routine } from '../../src/app/routines/routine.ts';
import { DEFAULT_SETTINGS, normalizeSettings } from '../../src/app/settings/settings.ts';
import { lastPractice } from '../../src/app/state/last-practice.ts';

const NOW = '2026-10-14T09:00:00.000Z';
const make = (id: string, counts: string[]): Routine => ({
  ...createRoutine({ id, danceId: 'waltz', name: `練習 ${id}`, now: NOW }),
  figures: counts.map((value, index) => ({ id: `f-0000000${index}`, name: `F${index}`, counts: value }))
});
const READY = make('r-ready001', ['123']);
const EMPTY = make('r-empty001', []);
const base = { ...DEFAULT_SETTINGS, lastDanceId: 'waltz', lastFigure: null };

test('the last practice is the routine played in S5 when it still exists and plays', () => {
  assert.deepEqual(lastPractice({ ...base, lastKind: 'routine', lastRoutineId: READY.id }, [READY, EMPTY]), { kind: 'routine', routine: READY });
});

test('a deleted or unplayable routine falls back to the dance memory', () => {
  assert.deepEqual(lastPractice({ ...base, lastKind: 'routine', lastRoutineId: 'r-gone0001' }, [READY]), { kind: 'dance', danceId: 'waltz', figure: null });
  assert.deepEqual(lastPractice({ ...base, lastKind: 'routine', lastRoutineId: EMPTY.id }, [READY, EMPTY]), { kind: 'dance', danceId: 'waltz', figure: null });
});

test('with no dance memory and no routine there is no last practice', () => {
  assert.equal(lastPractice({ ...DEFAULT_SETTINGS, lastKind: 'routine', lastRoutineId: 'r-gone0001' }, []), null);
  assert.equal(lastPractice(DEFAULT_SETTINGS, [READY]), null);
});

test('after S2 (lastKind dance) the dance wins even if a routine is remembered', () => {
  assert.deepEqual(lastPractice({ ...base, lastKind: 'dance', lastRoutineId: READY.id }, [READY]), { kind: 'dance', danceId: 'waltz', figure: null });
});

test('settings saved before B-1 get lastKind dance and no routine; broken values fall back', () => {
  const old = normalizeSettings({ lastDanceId: 'waltz' });
  assert.equal(old.lastKind, 'dance');
  assert.equal(old.lastRoutineId, null);
  const kept = normalizeSettings({ lastKind: 'routine', lastRoutineId: READY.id });
  assert.equal(kept.lastKind, 'routine');
  assert.equal(kept.lastRoutineId, READY.id);
  const broken = normalizeSettings({ lastKind: 'song', lastRoutineId: '../x' });
  assert.equal(broken.lastKind, 'dance');
  assert.equal(broken.lastRoutineId, null);
});
