import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedSymbols, checkCounts, normalizeCounts } from '../../../src/app/routines/counts.ts';

test('full-width, lower-case, spaces and bars are normalized (Ruling 38)', () => {
  assert.equal(normalizeCounts('１２＆３'), '12&3');
  assert.equal(normalizeCounts('ssqqs'), 'SSQQS');
  assert.equal(normalizeCounts('ｓ ｑ ｑ'), 'SQQ');
  assert.equal(normalizeCounts('1 2 3 | 1 2 3'), '123123');
  assert.equal(normalizeCounts('1A2'), '1a2');
});

test('allowed symbols are listed per dance without @ (Ruling 38 table)', () => {
  const expected: Record<string, string> = {
    waltz: '1 2 3 &', vwaltz: '1 2 3 &', tango: 'S Q &', slowfox: 'S Q &', quickstep: 'S Q &',
    rumba: '1 2 3 4 &', chacha: '1 2 3 4 & a', samba: '1 2 S Q & a', pasodoble: '1 2 3 4 5 6 7 8 &', jive: '1 2 3 4 5 6 a'
  };
  for (const [danceId, symbols] of Object.entries(expected)) assert.equal(allowedSymbols(danceId, 'en').split(' · ').join(' '), symbols, danceId);
});

test('valid counts pass after normalizing', () => {
  assert.deepEqual(checkCounts('waltz', '１２＆３'), { counts: '12&3', empty: false, problem: null });
  assert.deepEqual(checkCounts('tango', 'ssqqs'), { counts: 'SSQQS', empty: false, problem: null });
  assert.equal(checkCounts('jive', '123a45a6').problem, null);
  assert.equal(checkCounts('waltz', '1@3').problem, null); // @ は受け付ける（案内には出さない）
});

test('empty counts are not a problem to show, just empty', () => {
  assert.deepEqual(checkCounts('waltz', '  '), { counts: '', empty: true, problem: null });
});

test('symbols the dance does not use are "symbols" (waltz has no a or 4)', () => {
  assert.equal(checkCounts('waltz', '12a3').problem, 'symbols');
  assert.equal(checkCounts('waltz', '1234').problem, 'symbols');
  assert.equal(checkCounts('tango', '123').problem, 'symbols');
  assert.equal(checkCounts('waltz', 'x').problem, 'symbols');
});

test('a count starting with & or a is "leading" (every figure fails AMBIGUOUS_LEADING_SUBDIVISION)', () => {
  assert.equal(checkCounts('waltz', '&123').problem, 'leading');
  assert.equal(checkCounts('jive', 'a123').problem, 'leading');
});

test('right symbols in an order that cannot be counted are "invalid"', () => {
  assert.equal(checkCounts('waltz', '1&&2').problem, 'invalid');
  assert.equal(checkCounts('samba', 'Q&').problem, 'invalid'); // サンバの Q は半拍で & を足す余地がない
});

// Ruling 50（D14）: 使える文字は「・」区切りで常に見せる。案内どおり「・」を打っても通る。
test('the middle dot (and its half-width form) is removed like spaces (Ruling 50-D14-5)', () => {
  assert.equal(normalizeCounts('1・2・3・&'), '123&');
  assert.equal(normalizeCounts('1･2･3'), '123');
  assert.equal(checkCounts('waltz', '1・2・&・3').problem, null);
});

test('allowed symbols in Japanese are joined by 「・」 with no spaces (Ruling 50-D14-1)', () => {
  assert.equal(allowedSymbols('waltz', 'ja-JP'), '1・2・3・&');
  assert.equal(allowedSymbols('chacha', 'ja-JP'), '1・2・3・4・&・a');
});

test('allowed symbols in English are joined by " · " (Ruling 50-D14-1)', () => {
  assert.equal(allowedSymbols('waltz', 'en'), '1 · 2 · 3 · &');
  assert.equal(allowedSymbols('tango', 'en'), 'S · Q · &');
});
