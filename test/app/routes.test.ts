import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, buildHash, buildHashWithQuery, SCREENS, showsTabs, parentScreen, tabOf, type ScreenId } from '../../src/app/router/routes.ts';

test('every screen hash from spec §3 parses to its screen and params', () => {
  const cases: Array<[string, ScreenId, Record<string, string>]> = [
    ['#/', 'S0', {}],
    ['#/use', 'S1', {}],
    ['#/use/routines', 'U2', {}],
    ['#/make', 'M0', {}],
    ['#/make/routines', 'M1', {}],
    ['#/practice/waltz', 'S2', { danceId: 'waltz' }],
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
    ['#/about', 'S13', {}],
    ['#/poster', 'S14', {}]
  ];
  for (const [hash, screen, params] of cases) {
    assert.deepEqual(parseHash(hash), { screen, params, query: {} }, hash);
    assert.equal(buildHash({ screen, params }), hash, `round trip ${hash}`);
  }
});

test('empty, malformed and unknown hashes fall back to the cover instead of throwing (D56)', () => {
  for (const hash of ['', '#', '#/nope', '#/practice', '#/practice/', '#/practice/a/b/c', '#/routines/x/delete', 'garbage', '#/practice/%E3%81%82', '#/practice/<script>', '#/use/x', '#/make/x']) {
    assert.deepEqual(parseHash(hash), { screen: 'S0', params: {}, query: {} }, JSON.stringify(hash));
  }
});

test('the old #/routines is read as U2 and marked as an alias; building U2 gives the new path (D56・Ruling 116-1)', () => {
  assert.deepEqual(parseHash('#/routines'), { screen: 'U2', params: {}, query: {}, alias: true });
  assert.deepEqual(parseHash('#/routines?ui-state=update-ready'), { screen: 'U2', params: {}, query: { uiState: 'update-ready' }, alias: true });
  assert.equal(buildHash({ screen: 'U2', params: {} }), '#/use/routines');
  assert.equal(parseHash('#/use/routines').alias, undefined);
  assert.equal(buildHashWithQuery({ screen: 'U2', params: {}, query: { uiState: 'update-ready' } }), '#/use/routines?ui-state=update-ready');
  assert.equal(buildHashWithQuery({ screen: 'U2', params: {} }), '#/use/routines');
});

test('trailing slash is ignored', () => {
  assert.deepEqual(parseHash('#/settings/'), { screen: 'S6', params: {}, query: {} });
});

test('known ui-state values are read from the hash query (Ruling 33)', () => {
  assert.deepEqual(parseHash('#/practice/jive?ui-state=no-sound'), { screen: 'S2', params: { danceId: 'jive' }, query: { uiState: 'no-sound' } });
  assert.deepEqual(parseHash('#/practice/waltz?x=1&ui-state=wakelock-tip').query, { uiState: 'wakelock-tip' });
  assert.deepEqual(parseHash('#/make/routines?ui-state=confirm-delete'), { screen: 'M1', params: {}, query: { uiState: 'confirm-delete' } });
});

test('the three S8 display states are read too (Ruling 63-3)', () => {
  for (const uiState of ['mic-denied', 'no-voice', 'no-recorder', 'no-https', 'rec-countdown', 'rec-capture'] as const) {   // no-https は D53・rec-* は D59
    assert.deepEqual(parseHash(`#/voices/record?ui-state=${uiState}`), { screen: 'S8', params: {}, query: { uiState } });
  }
  assert.deepEqual(parseHash('#/voices?ui-state=confirm-delete').query, { uiState: 'confirm-delete' });
  // 段7（Ruling 90-7）: 更新の帯は見た目だけ強制できる（D56: 表紙・U1・U2・M1・S6・S7）
  for (const hash of ['#/', '#/use', '#/use/routines', '#/make/routines', '#/settings', '#/voices']) assert.deepEqual(parseHash(`${hash}?ui-state=update-ready`).query, { uiState: 'update-ready' });
  assert.deepEqual(parseHash('#/voices/record?ui-state=MIC-DENIED').query, {});
});

test('the §11 looks that cannot happen on demand can be shown for checking (段8 Ruling 100-2)', () => {
  for (const [hash, uiState] of [['#/practice/waltz', 'stopped'], ['#/practice/waltz', 'voice-missing'], ['#/practice/waltz', 'save-failed'],
    ['#/voices', 'voice-missing'], ['#/voices/record', 'mic-failed'], ['#/voices/record', 'save-failed'], ['#/receive', 'save-failed']] as const) {
    assert.deepEqual(parseHash(`${hash}?ui-state=${uiState}`).query, { uiState }, `${hash} ${uiState}`);
  }
});

test('S13 is #/about and its delete-all confirmation can be shown for checking (段8 Ruling 99-3)', () => {
  assert.deepEqual(parseHash('#/about?ui-state=confirm-delete-all'), { screen: 'S13', params: {}, query: { uiState: 'confirm-delete-all' } });
  assert.equal(buildHash({ screen: 'S13', params: {} }), '#/about');
});

test('unknown ui-state values and other keys are dropped', () => {
  for (const hash of ['#/practice/waltz?ui-state=boom', '#/practice/waltz?ui-state=NO-SOUND', '#/practice/waltz?ui-state=', '#/practice/waltz?debug=1', '#/practice/waltz?']) {
    assert.deepEqual(parseHash(hash).query, {}, hash);
  }
});

test('buildHash never writes the query, so navigating clears ui-state', () => {
  const route = parseHash('#/practice/waltz?ui-state=no-sound');
  assert.equal(buildHash(route), '#/practice/waltz');
});

test('tabs show on the two "Use" roots only (D56・Ruling 116-1)', () => {
  const visible = (Object.keys(SCREENS) as ScreenId[]).filter(showsTabs).sort();
  assert.deepEqual(visible, ['S1', 'U2']);
  assert.equal(tabOf('S1'), 'practice');
  assert.equal(tabOf('U2'), 'routines');
  assert.equal(tabOf('M0'), null);
});

test('back without history goes to the parent from the D56 route table (Ruling 116-1)', () => {
  const expected: Record<ScreenId, ScreenId | null> = {
    S0: null, S1: 'S0', U2: 'S0', M0: 'S0', M1: 'M0', F1: 'S1', S2: 'S1', S4: 'M1', S5: 'U2', S6: 'S0', S7: 'S1',
    S8: 'M0', S9: 'M0', S10: 'U2', S11: 'S6', S12: 'S6', S13: 'S6', S14: 'S6'
  };
  for (const screen of Object.keys(expected) as ScreenId[]) assert.equal(parentScreen(screen), expected[screen], screen);
});

test('only the cover has no back button; the screens under the cover say "Cover" (D56・Ruling 116-2・116-3)', () => {
  const kinds = Object.fromEntries((Object.keys(SCREENS) as ScreenId[]).map(screen => [screen, SCREENS[screen].kind]));
  assert.deepEqual(Object.entries(kinds).filter(([, kind]) => kind === 'cover').map(([screen]) => screen), ['S0']);
  assert.deepEqual((Object.keys(SCREENS) as ScreenId[]).filter(screen => parentScreen(screen) === 'S0').sort(), ['M0', 'S1', 'S6', 'U2']);
});

test('D57: F1 is #/figures/:danceId and S2 has a figure form #/practice/:danceId/:figureSlug (Ruling 119-1・120-1)', () => {
  assert.deepEqual(parseHash('#/figures/waltz'), { screen: 'F1', params: { danceId: 'waltz' }, query: {} });
  assert.equal(buildHash({ screen: 'F1', params: { danceId: 'waltz' } }), '#/figures/waltz');
  assert.deepEqual(parseHash('#/practice/waltz/whisk'), { screen: 'S2', params: { danceId: 'waltz', figureSlug: 'whisk' }, query: {} });
  assert.equal(buildHash({ screen: 'S2', params: { danceId: 'waltz', figureSlug: 'chasse-from-pp' } }), '#/practice/waltz/chasse-from-pp');
  assert.equal(buildHash({ screen: 'S2', params: { danceId: 'waltz' } }), '#/practice/waltz');
  assert.equal(parseHash('#/figures/bad id').screen, 'S0');
  assert.equal(parseHash('#/practice/waltz/a/b').screen, 'S0');
  assert.equal(SCREENS.F1.kind, 'focus');
  assert.equal(showsTabs('F1'), false);
});
