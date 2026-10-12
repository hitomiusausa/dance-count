import test from 'node:test';
import assert from 'node:assert/strict';
import { IMPLEMENTED_SCREENS, resolveScreen } from '../../src/app/router/resolve.ts';
import { SCREENS, parseHash } from '../../src/app/router/routes.ts';
import { ROUTINES_MAX } from '../../src/app/routines/limits.ts';
import { buildReviewedFigures } from '../../src/app/routines/reviewed-counts.ts';
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
const toMake = { screen: 'M1', redirect: { screen: 'M1', params: {} } };   // S4（作る側）が開けない時（D56）
const toUse = { screen: 'U2', redirect: { screen: 'U2', params: {} } };     // S5（使う側）が開けない時

test('new routine and existing routines open the editor', () => {
  assert.deepEqual(resolve('#/routines/new'), { screen: 'S4', redirect: null });
  for (const routine of ALL) assert.deepEqual(resolve(`#/routines/${routine.id}/edit`), { screen: 'S4', redirect: null }, routine.id);
});

test('only a playable routine opens the player (Ruling 40)', () => {
  assert.deepEqual(resolve(`#/routines/${READY.id}/play`), { screen: 'S5', redirect: null });
  assert.deepEqual(resolve(`#/routines/${EMPTY.id}/play`), toUse);
  assert.deepEqual(resolve(`#/routines/${BROKEN.id}/play`), toUse);
});

test('unknown ids and the reserved word "new" go back to the list (Ruling 37)', () => {
  for (const hash of ['#/routines/new/edit', '#/routines/r-missing1/edit']) assert.deepEqual(resolve(hash), toMake, hash);
  for (const hash of ['#/routines/new/play', '#/routines/r-missing1/play', '#/routines/x/play']) assert.deepEqual(resolve(hash), toUse, hash);
});

test('the old #/routines lands on U2 and the hash is replaced (D56・Ruling 116-1)', () => {
  assert.deepEqual(resolve('#/routines'), { screen: 'U2', redirect: { screen: 'U2', params: {} } });
  assert.deepEqual(resolve('#/use/routines'), { screen: 'U2', redirect: null });
  // ui-state は置き換えた先へ持ち越す（Task 1 修正 1・M2）
  assert.deepEqual(resolve('#/routines?ui-state=update-ready'), { screen: 'U2', redirect: { screen: 'U2', params: {}, query: { uiState: 'update-ready' } } });
  assert.deepEqual(resolve('#/'), { screen: 'S0', redirect: null });
  assert.deepEqual(resolve('#/nope'), { screen: 'S0', redirect: null });
});

test('the practice screen needs a known dance (else U1); unbuilt screens show the cover', () => {
  assert.deepEqual(resolve('#/practice/waltz'), { screen: 'S2', redirect: null });
  assert.deepEqual(resolve('#/practice/hiphop'), { screen: 'S1', redirect: null });
  assert.deepEqual(resolve('#/about'), { screen: 'S13', redirect: null }, 'S13 is built in stage 8');
  assert.deepEqual(resolve('#/share'), { screen: 'S9', redirect: null }, 'S9 is built in stage 5');
  assert.deepEqual(resolve('#/receive'), { screen: 'S10', redirect: null }, 'S10 is built in stage 5');
  for (const hash of ['#/', '#/use', '#/use/routines', '#/make', '#/make/routines', '#/settings', '#/voices', '#/help/sound']) assert.equal(resolve(hash).redirect, null, hash);
  assert.deepEqual(resolve('#/voices/record'), { screen: 'S8', redirect: null }, 'S8 is built in stage 4');
});

test('a new routine is refused by hash too once the list is full (Ruling 37)', () => {
  const full = Array.from({ length: ROUTINES_MAX }, (_, i) => createRoutine({ id: `r-limit${String(i).padStart(4, '0')}`, danceId: 'waltz', name: `R${i}`, now: NOW }));
  assert.deepEqual(resolveScreen(parseHash('#/routines/new'), full), toMake);
  assert.deepEqual(resolveScreen(parseHash('#/routines/new'), full.slice(1)), { screen: 'S4', redirect: null });
  assert.deepEqual(resolveScreen(parseHash(`#/routines/${full[0]!.id}/edit`), full), { screen: 'S4', redirect: null });
});

test('S12 opens from stage 7 and S13 from stage 8: every screen of the spec is built (Ruling 92-9・99)', () => {
  assert.deepEqual(resolve('#/help/install'), { screen: 'S12', redirect: null });
  assert.deepEqual(resolve('#/about?ui-state=confirm-delete-all'), { screen: 'S13', redirect: null });
  assert.deepEqual([...IMPLEMENTED_SCREENS], Object.keys(SCREENS));
});

// D57（Ruling 119-6・120-4・122-3）: F1 は監修済みのフィガーが 1 件以上の種目だけ。表の中身に頼らない検査は作り物の表を渡す
const EMPTY_TABLE = buildReviewedFigures([]);
const WHISK_ONLY = buildReviewedFigures([{ danceId: 'waltz', englishName: 'Whisk', counts: '123', basis: 'テスト', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' }]);
const basic = (danceId: string) => ({ screen: 'S2', redirect: { screen: 'S2', params: { danceId } } });

test('F1 opens only for a dance with reviewed figures; otherwise the basic count, unknown dances go to U1 (Ruling 119-6)', () => {
  assert.deepEqual(resolveScreen(parseHash('#/figures/waltz'), ALL, WHISK_ONLY), { screen: 'F1', redirect: null });
  assert.deepEqual(resolveScreen(parseHash('#/figures/waltz'), ALL, EMPTY_TABLE), basic('waltz'), 'an empty table never shows F1');
  assert.deepEqual(resolveScreen(parseHash('#/figures/tango'), ALL, WHISK_ONLY), basic('tango'));
  assert.deepEqual(resolveScreen(parseHash('#/figures/hiphop'), ALL, WHISK_ONLY), { screen: 'S1', redirect: null });
});

test('S2 with a figure needs that figure in the table; an unknown slug falls back to the basic count (Ruling 120-4)', () => {
  assert.deepEqual(resolveScreen(parseHash('#/practice/waltz/whisk'), ALL, WHISK_ONLY), { screen: 'S2', redirect: null });
  assert.deepEqual(resolveScreen(parseHash('#/practice/waltz/natural-turn'), ALL, WHISK_ONLY), basic('waltz'));
  assert.deepEqual(resolveScreen(parseHash('#/practice/waltz/whisk'), ALL, EMPTY_TABLE), basic('waltz'));
  assert.deepEqual(resolveScreen(parseHash('#/practice/hiphop/whisk'), ALL, WHISK_ONLY), { screen: 'S1', redirect: null });
  assert.deepEqual(resolveScreen(parseHash('#/practice/waltz'), ALL, EMPTY_TABLE), { screen: 'S2', redirect: null });
});

test('the shipped table: waltz, slow foxtrot and tango have F1; quickstep and the Latin dances go straight to S2 (2026-10-13 の 20 件)', () => {
  for (const danceId of ['waltz', 'slowfox', 'tango']) assert.deepEqual(resolve(`#/figures/${danceId}`), { screen: 'F1', redirect: null }, danceId);
  for (const danceId of ['quickstep', 'vwaltz', 'rumba', 'chacha', 'samba', 'pasodoble', 'jive']) assert.deepEqual(resolve(`#/figures/${danceId}`), basic(danceId), danceId);
  assert.deepEqual(resolve('#/practice/waltz/whisk'), { screen: 'S2', redirect: null });
});
