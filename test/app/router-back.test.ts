import test from 'node:test';
import assert from 'node:assert/strict';
import { canGoBackInHistory, dropLast, exitByBack, planReplace, recordVisit, replaceTop, stepsBackTo, wentBack } from '../../src/app/router/back-stack.ts';

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

// 最終レビュー I1・T1: 置き換え（replaceRoute）でも見てきた列を本当の履歴とそろえる。
// 小さな模型: 本当の履歴（entries・index）と見てきた列（visited）を、state/route.ts と同じ手順で動かす。
type Model = { entries: string[]; index: number; visited: string[] };
const open = (hash: string): Model => ({ entries: [hash], index: 0, visited: recordVisit([], hash) });
const push = (m: Model, hash: string): Model => {
  const entries = [...m.entries.slice(0, m.index + 1), hash];
  return { entries, index: entries.length - 1, visited: recordVisit(m.visited, hash) };
};
const back = (m: Model, steps = 1): Model => {
  const index = Math.max(0, m.index - steps);
  const moved = index !== m.index && m.entries[index] !== m.entries[m.index];   // 同じハッシュなら hashchange は起きない
  return { ...m, index, visited: moved ? recordVisit(m.visited, m.entries[index]!) : m.visited };
};
const replace = (m: Model, hash: string): Model => {
  const plan = planReplace(m.visited, hash);
  if (plan.kind === 'back') return back(m);
  const entries = [...m.entries];
  entries[m.index] = hash;
  return { entries, index: m.index, visited: recordVisit(plan.stack, hash) };   // 合成 hashchange も通す
};
// goBack の「‹ 表紙」（state/route.ts と同じ）
const backToCover = (m: Model): Model => {
  const steps = stepsBackTo(m.visited, '#/');
  if (steps === null) return replace(m, '#/');
  return back({ ...m, visited: dropLast(m.visited, steps) }, steps);
};
const realStack = (m: Model) => m.entries.slice(0, m.index + 1);

test('I1: S0 → U2 → S10 → "Choose a dance" (U1) → tab U2 → "‹ Cover" reaches the cover in one tap', () => {
  let m = open('#/');
  m = push(m, '#/use');
  m = replace(m, '#/use/routines');          // タブ
  m = push(m, '#/receive');
  m = replace(m, '#/use');                   // 「種目を選ぶ」（出口）
  assert.deepEqual(realStack(m), ['#/', '#/use/routines', '#/use']);
  m = replace(m, '#/use/routines');          // タブ: 1 つ前が U2 → 戻る（同じ画面を 2 つ並べない）
  assert.deepEqual(realStack(m), ['#/', '#/use/routines']);
  assert.deepEqual(m.visited, realStack(m));
  m = backToCover(m);
  assert.equal(m.entries[m.index], '#/');
});

test('T1: S7 "Record more" → S8 → finish (replace S7) leaves no dead back tap', () => {
  let m = open('#/');
  m = push(m, '#/settings');
  m = push(m, '#/voices');
  m = push(m, '#/voices/record');
  m = replace(m, '#/voices');                // 完成 → S7
  assert.deepEqual(realStack(m), ['#/', '#/settings', '#/voices']);
  assert.deepEqual(m.visited, realStack(m));
  m = back(m);                               // 「‹」1 回で S6
  assert.equal(m.entries[m.index], '#/settings');
});

test('T1: an invalid S5 opened from U2 redirects to U2 without a duplicate entry', () => {
  let m = open('#/');
  m = push(m, '#/use');
  m = replace(m, '#/use/routines');
  m = push(m, '#/routines/missing/play');
  m = replace(m, '#/use/routines');          // 見つからないルーティン → U2
  assert.deepEqual(realStack(m), ['#/', '#/use/routines']);
  assert.deepEqual(m.visited, realStack(m));
  m = backToCover(m);
  assert.equal(m.entries[m.index], '#/');
});

test('planReplace: a different target replaces the top and the synthetic hashchange does not pop again', () => {
  const plan = planReplace(['#/', '#/use'], '#/use/routines');
  assert.deepEqual(plan, { kind: 'replace', stack: ['#/', '#/use/routines'] });
  if (plan.kind === 'replace') assert.deepEqual(recordVisit(plan.stack, '#/use/routines'), ['#/', '#/use/routines']);
  // 直接開いた S5 の読み替え（列 1 件）は置き換え
  assert.equal(planReplace(['#/routines/missing/play'], '#/use/routines').kind, 'replace');
  // ui-state 付きでも画面が同じなら戻る
  assert.equal(planReplace(['#/', '#/use/routines', '#/use'], '#/use/routines?ui-state=no-sound').kind, 'back');
});

test('tabs still replace (no history growth) and "‹ Cover" stays one tap from U1/U2', () => {
  let m = open('#/');
  m = push(m, '#/use');
  m = replace(m, '#/use/routines');
  m = replace(m, '#/use');
  m = replace(m, '#/use/routines');
  assert.deepEqual(realStack(m), ['#/', '#/use/routines']);
  m = backToCover(m);
  assert.equal(m.entries[m.index], '#/');
});
