// 段7（Ruling 92-1・92-7・D42）: S1 の案内カードの条件と、S12 に出す 1 通り。
import test from 'node:test';
import assert from 'node:assert/strict';
import { installGuideFor, showsInstallCard, showsRecordInstallHint } from '../../../src/app/lib/install-card.ts';

const SHOWN = { firstPlaybackDone: true, homeScreenCardDismissed: false };

test('the card shows after the first playback on a phone browser only (D42)', () => {
  for (const kind of ['ios-safari', 'ios-other', 'android'] as const) assert.equal(showsInstallCard({ hints: SHOWN, kind, standalone: false }), true, kind);
  assert.equal(showsInstallCard({ hints: SHOWN, kind: 'desktop', standalone: false }), false, 'not on a PC');
  assert.equal(showsInstallCard({ hints: { ...SHOWN, firstPlaybackDone: false }, kind: 'ios-safari', standalone: false }), false, 'not before the first sound');
  assert.equal(showsInstallCard({ hints: { ...SHOWN, homeScreenCardDismissed: true }, kind: 'ios-safari', standalone: false }), false, 'never again after ×');
  assert.equal(showsInstallCard({ hints: SHOWN, kind: 'android', standalone: true }), false, 'not in the added app');
});

test('S12 shows one way per device, and "done" in the added app (Ruling 92-1・92-6)', () => {
  assert.equal(installGuideFor('ios-safari', false), 'ios-safari');
  assert.equal(installGuideFor('ios-other', false), 'ios-other');
  assert.equal(installGuideFor('android', false), 'android');
  assert.equal(installGuideFor('desktop', false), 'desktop');
  for (const kind of ['ios-safari', 'ios-other', 'android', 'desktop'] as const) assert.equal(installGuideFor(kind, true), 'done');
});

test('S8 recommends adding to the Home Screen before recording only in an iPhone browser with nothing recorded yet (D46)', () => {
  for (const kind of ['ios-safari', 'ios-other'] as const) assert.equal(showsRecordInstallHint({ kind, standalone: false, recorded: false }), true, kind);
  for (const kind of ['android', 'desktop'] as const) assert.equal(showsRecordInstallHint({ kind, standalone: false, recorded: false }), false, kind);
  assert.equal(showsRecordInstallHint({ kind: 'ios-safari', standalone: true, recorded: false }), false, 'not in the added app');
  assert.equal(showsRecordInstallHint({ kind: 'ios-safari', standalone: false, recorded: true }), false, 'too late once a word is recorded');
});
