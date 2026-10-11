import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, buildHash, SCREENS, showsTabs, parentScreen, tabOf, type ScreenId } from '../../src/app/router/routes.ts';

test('every screen hash from spec §3 parses to its screen and params', () => {
  const cases: Array<[string, ScreenId, Record<string, string>]> = [
    ['#/', 'S1', {}],
    ['#/practice/waltz', 'S2', { danceId: 'waltz' }],
    ['#/routines', 'S3', {}],
    ['#/routines/new', 'S4', {}],
    ['#/routines/r-123/edit', 'S4', { routineId: 'r-123' }],
    ['#/routines/r-123/play', 'S5', { routineId: 'r-123' }],
    ['#/settings', 'S6', {}],
    ['#/voices', 'S7', {}],
    ['#/voices/record', 'S8', {}],
    ['#/share', 'S9', {}],
    ['#/receive', 'S10', {}],
    ['#/help/sound', 'S11', {}],
    ['#/help/install', 'S12', {}],
    ['#/about', 'S13', {}]
  ];
  for (const [hash, screen, params] of cases) {
    assert.deepEqual(parseHash(hash), { screen, params }, hash);
    assert.equal(buildHash({ screen, params }), hash, `round trip ${hash}`);
  }
});

test('empty, malformed and unknown hashes fall back to home instead of throwing', () => {
  for (const hash of ['', '#', '#/nope', '#/practice', '#/practice/', '#/practice/a/b', '#/routines/x/delete', 'garbage', '#/practice/%E3%81%82', '#/practice/<script>']) {
    assert.deepEqual(parseHash(hash), { screen: 'S1', params: {} }, JSON.stringify(hash));
  }
});

test('trailing slash and a query after the path are ignored', () => {
  assert.deepEqual(parseHash('#/settings/'), { screen: 'S6', params: {} });
  assert.deepEqual(parseHash('#/practice/jive?ui-state=no-sound'), { screen: 'S2', params: { danceId: 'jive' } });
});

test('tabs show on root and list screens only (Ruling 17)', () => {
  const visible = (Object.keys(SCREENS) as ScreenId[]).filter(showsTabs).sort();
  assert.deepEqual(visible, ['S1', 'S12', 'S13', 'S3', 'S6', 'S7']);
});

test('back without history goes to the parent from spec §3', () => {
  const expected: Record<ScreenId, ScreenId | null> = {
    S1: null, S2: 'S1', S3: null, S4: 'S3', S5: 'S3', S6: null, S7: 'S6',
    S8: 'S7', S9: 'S7', S10: 'S7', S11: 'S6', S12: 'S6', S13: 'S6'
  };
  for (const screen of Object.keys(expected) as ScreenId[]) assert.equal(parentScreen(screen), expected[screen], screen);
});

test('each screen belongs to exactly one of the three tabs', () => {
  assert.equal(tabOf('S1'), 'practice');
  assert.equal(tabOf('S2'), 'practice');
  assert.equal(tabOf('S5'), 'routines');
  assert.equal(tabOf('S7'), 'settings');
  assert.equal(tabOf('S13'), 'settings');
});
