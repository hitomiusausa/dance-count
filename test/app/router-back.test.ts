import test from 'node:test';
import assert from 'node:assert/strict';
import { canGoBackInHistory, dropLast, exitByBack, recordVisit, replaceTop, stepsBackTo, wentBack } from '../../src/app/router/back-stack.ts';

const walk = (hashes: string[]) => hashes.reduce<string[]>((stack, hash) => recordVisit(stack, hash), []);

test('opening a screen directly leaves nothing to go back to', () => {
  assert.equal(canGoBackInHistory(walk(['#/practice/waltz'])), false);
  assert.equal(canGoBackInHistory(walk(['', '#/'])), false);
});

test('home -> practice can go back; after going back the stack shrinks', () => {
  const forward = walk(['#/', '#/practice/waltz']);
  assert.deepEqual(forward, ['#/', '#/practice/waltz']);
  assert.equal(canGoBackInHistory(forward), true);
  assert.deepEqual(recordVisit(forward, '#/'), ['#/']);
});

test('direct practice -> voices -> back -> back needs the parent fallback', () => {
  const stack = walk(['#/practice/waltz', '#/voices', '#/practice/waltz']);
  assert.deepEqual(stack, ['#/practice/waltz']);
  assert.equal(canGoBackInHistory(stack), false);
});

test('the ui-state query does not count as a different screen', () => {
  assert.deepEqual(walk(['#/practice/waltz?ui-state=no-sound', '#/practice/waltz']), ['#/practice/waltz']);
});

test('replaceTop swaps the last entry for the normalized path', () => {
  assert.deepEqual(replaceTop([], '#/voices?ui-state=no-sound'), ['#/voices']);
  assert.deepEqual(replaceTop([], ''), ['#/']);
  assert.deepEqual(replaceTop(['#/practice/waltz'], '#/'), ['#/']);
  assert.deepEqual(replaceTop(['#/', '#/practice/waltz'], '#/voices'), ['#/', '#/voices']);
});

test('direct S8 -> parent replace leaves no phantom entry', () => {
  const opened = recordVisit([], '#/voices/record');
  const replaced = replaceTop(opened, '#/voices');
  const afterHashChange = recordVisit(replaced, '#/voices');
  assert.deepEqual(afterHashChange, ['#/voices']);
  assert.equal(canGoBackInHistory(afterHashChange), false);
});

// Task 1 修正 1（Fable 答え §1-1）: 「‹ 表紙」は 1 回で表紙に着く
test('"‹ Cover" counts the steps back to the nearest cover entry, not counting the current screen', () => {
  assert.equal(stepsBackTo(['#/', '#/use'], '#/'), 1);
  // Repro B: S6 → S7 → S10 →（受け取った・声）U1 に置き換え → 表紙まで 3 つ
  assert.equal(stepsBackTo(['#/', '#/settings', '#/voices', '#/use'], '#/'), 3);
  // 近い方の表紙
  assert.equal(stepsBackTo(['#/', '#/make', '#/', '#/use', '#/practice/waltz', '#/use'], '#/'), 3);
  assert.equal(stepsBackTo(['#/', '#/use?ui-state=update-ready'], '#/?ui-state=update-ready'), 1);
});

test('"‹ Cover" with no cover in the stack falls back to replacing (null)', () => {
  assert.equal(stepsBackTo(['#/use/routines'], '#/'), null);
  assert.equal(stepsBackTo(['#/receive', '#/use/routines'], '#/'), null);
  assert.equal(stepsBackTo([], '#/'), null);
  // 今の画面が表紙でも、それ自身は数えない
  assert.equal(stepsBackTo(['#/'], '#/'), null);
});

test('after going back n steps the stack ends at the cover and the hashchange keeps it', () => {
  const stack = ['#/', '#/settings', '#/voices', '#/use'];
  const dropped = dropLast(stack, 3);
  assert.deepEqual(dropped, ['#/']);
  assert.deepEqual(recordVisit(dropped, '#/'), ['#/']);
  assert.deepEqual(dropLast(['#/', '#/use'], 5), ['#/']);
});

test('an exit whose target is the previous screen goes back instead of stacking a duplicate (Repro A)', () => {
  // S0 → U1 →（タブ・置き換え）U2 → S10 →「ルーティンを見る」
  const stack = walk(['#/', '#/use']);
  const onU2 = replaceTop(stack, '#/use/routines');
  const onReceive = recordVisit(onU2, '#/receive');
  assert.equal(exitByBack(onReceive, '#/use/routines'), true);
  assert.deepEqual(recordVisit(onReceive, '#/use/routines'), ['#/', '#/use/routines']);
  // 声の時は U1 へ（1 つ前は U2）→ 置き換え
  assert.equal(exitByBack(onReceive, '#/use'), false);
  // 直接開いた S10（Android の共有）→ 置き換え
  assert.equal(exitByBack(['#/receive'], '#/use/routines'), false);
});

// Fable 答え 2026-10-13 §2-1: 進む時だけ新しい画面を上端に（戻る時はブラウザの復元を残す）
test('wentBack: a forward visit is not a back move', () => {
  const before = walk(['#/', '#/use', '#/figures/waltz']);
  assert.equal(wentBack(before, recordVisit(before, '#/practice/waltz/whisk')), false);
});

test('wentBack: returning to the previous screen (history back) is a back move', () => {
  const before = walk(['#/', '#/use', '#/figures/waltz', '#/practice/waltz/whisk']);
  assert.equal(wentBack(before, recordVisit(before, '#/figures/waltz')), true);
});

test('wentBack: a replacement (same length) counts as forward', () => {
  const before = walk(['#/', '#/use']);
  assert.equal(wentBack(before, replaceTop(before, '#/use/routines')), false);
});
