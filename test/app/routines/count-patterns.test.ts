import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DANCE_PROFILES } from '../../../src/engine/dance-profiles.js';
import { COUNT_PATTERNS_MAX, countPatterns } from '../../../src/app/routines/count-patterns.ts';
import { checkCounts } from '../../../src/app/routines/counts.ts';
import { isOffBar } from '../../../src/app/routines/bar-check.ts';
import { COUNTS_MAX } from '../../../src/app/routines/limits.ts';

const PROFILES = DANCE_PROFILES as Record<string, { templates: readonly string[] }>;
const DANCES = Object.keys(PROFILES);

// Ruling 53-1 の固定の一覧（この順）。
const EXPECTED: Record<string, string[]> = {
  waltz: ['123', '12&3', '1&23', '123&', '1&2&3', '1&23&', '12&3&', '1&2&3&'],
  tango: ['SSQQS', 'S', 'QQ', 'SS', 'SQQ', 'QSQ', 'QQS', 'QQQQ'],
  vwaltz: ['123', '1&23', '12&3', '123&', '1&2&3', '1&23&', '12&3&', '1&2&3&'],
  slowfox: ['SQQ', 'S', 'QQ', 'SS', 'QSQ', 'QQS', 'QQQQ'],
  quickstep: ['SQQ', 'QQS', 'S', 'QQ', 'SS', 'QSQ', 'QQQQ'],
  rumba: ['2341', '2&341', '23&41', '234&1', '2341&', '2&3&4&1&'],
  chacha: ['234&1', '2341', '2&341', '23&41', '2341&', '2&3&4&1&'],
  samba: ['1a2', 'SQQ', '12', '1&2', '12&', '1&2&'],
  pasodoble: ['1234', '12345678', '1&234', '12&34', '123&4', '1234&', '1&2&3&4&'],
  jive: ['123a45a6', '1234', '1a234', '12a34', '123a4', '1234a', '1a2a3a4a']
};

test('countPatterns: the fixed per-dance lists (Ruling 53-1)', () => {
  assert.deepEqual(DANCES.sort(), Object.keys(EXPECTED).sort());
  for (const danceId of DANCES) assert.deepEqual(countPatterns(danceId), EXPECTED[danceId], danceId);
});

test('countPatterns: every pattern passes checkCounts; waltz family patterns are whole bars (Ruling 52/53)', () => {
  for (const danceId of DANCES) {
    for (const pattern of countPatterns(danceId)) {
      assert.deepEqual({ empty: checkCounts(danceId, pattern).empty, problem: checkCounts(danceId, pattern).problem },
        { empty: false, problem: null }, `${danceId} ${pattern}`);
      assert.equal(isOffBar(danceId, pattern), false, `${danceId} ${pattern} off bar`);
    }
  }
});

test('countPatterns: at most COUNT_PATTERNS_MAX, no duplicates, templates first in order', () => {
  assert.equal(COUNT_PATTERNS_MAX, 8);
  for (const danceId of DANCES) {
    const patterns = countPatterns(danceId);
    assert.ok(patterns.length <= COUNT_PATTERNS_MAX, danceId);
    assert.equal(new Set(patterns).size, patterns.length, danceId);
    assert.deepEqual(patterns.slice(0, PROFILES[danceId]!.templates.length), [...PROFILES[danceId]!.templates], danceId);
  }
});

test('countPatterns: no pattern starts with & or a (Ruling 38)', () => {
  for (const danceId of DANCES) {
    for (const pattern of countPatterns(danceId)) assert.ok(pattern[0] !== '&' && pattern[0] !== 'a', `${danceId} ${pattern}`);
  }
});

test('countPatterns: every pattern fits COUNTS_MAX', () => {
  for (const danceId of DANCES) {
    for (const pattern of countPatterns(danceId)) assert.ok(pattern.length <= COUNTS_MAX, `${danceId} ${pattern}`);
  }
});

test('count-patterns.ts reads no figure data (Ruling 3 / 53-4)', () => {
  const source = readFileSync(new URL('../../../src/app/routines/count-patterns.ts', import.meta.url), 'utf8');
  for (const word of ['figure-catalog', 'legacy', 'terminology']) assert.ok(!source.includes(word), word);
});
