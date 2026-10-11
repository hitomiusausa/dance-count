import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveScreen } from '../../src/app/router/resolve.ts';
import { parseHash } from '../../src/app/router/routes.ts';
import { createRoutine, type Routine } from '../../src/app/routines/routine.ts';

const NOW = '2026-10-11T09:00:00.000Z';
const make = (id: string, counts: string[]): Routine => ({
  ...createRoutine({ id, danceId: 'waltz', name: id, now: NOW }),
  figures: counts.map((value, index) => ({ id: `f-0000000${index}`, name: `F${index}`, counts: value }))
});
const READY = make('r-ready001', ['123']);
const EMPTY = make('r-empty001', []);
const BROKEN = make('r-broken01', ['12a3']);
const ALL = [READY, EMPTY, BROKEN];
const resolve = (hash: string) => resolveScreen(parseHash(hash), ALL);
const toRoutines = { screen: 'S3', redirect: { screen: 'S3', params: {} } };

test('new routine and existing routines open the editor', () => {
  assert.deepEqual(resolve('#/routines/new'), { screen: 'S4', redirect: null });
  for (const routine of ALL) assert.deepEqual(resolve(`#/routines/${routine.id}/edit`), { screen: 'S4', redirect: null }, routine.id);
});

test('only a playable routine opens the player (Ruling 40)', () => {
  assert.deepEqual(resolve(`#/routines/${READY.id}/play`), { screen: 'S5', redirect: null });
  assert.deepEqual(resolve(`#/routines/${EMPTY.id}/play`), toRoutines);
  assert.deepEqual(resolve(`#/routines/${BROKEN.id}/play`), toRoutines);
});

test('unknown ids and the reserved word "new" go back to the list (Ruling 37)', () => {
  for (const hash of ['#/routines/new/edit', '#/routines/new/play', '#/routines/r-missing1/edit', '#/routines/r-missing1/play', '#/routines/x/play']) {
    assert.deepEqual(resolve(hash), toRoutines, hash);
  }
});

test('the practice screen needs a known dance; unbuilt screens show home', () => {
  assert.deepEqual(resolve('#/practice/waltz'), { screen: 'S2', redirect: null });
  assert.deepEqual(resolve('#/practice/hiphop'), { screen: 'S1', redirect: null });
  for (const hash of ['#/voices/record', '#/share', '#/receive', '#/help/install', '#/about']) assert.deepEqual(resolve(hash), { screen: 'S1', redirect: null }, hash);
  for (const hash of ['#/', '#/routines', '#/settings', '#/voices', '#/help/sound']) assert.equal(resolve(hash).redirect, null, hash);
});
