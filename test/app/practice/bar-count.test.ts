import test from 'node:test';
import assert from 'node:assert/strict';
import { DANCE_PROFILES } from '../../../src/engine/dance-profiles.js';
import { BAR_COUNT_WORDS } from '../../../src/engine/audio-engine.js';
import { REQUIRED_VOICE_KEYS } from '../../../src/engine/recorded-voice-pack.js';
import fs from 'node:fs';
import { BARS_PER_CYCLE, barCountingAvailable } from '../../../src/app/practice/bar-count.ts';
import { DEFAULT_SETTINGS, normalizeSettings } from '../../../src/app/settings/settings.ts';

test('D72: the bar-counting switch is offered only for waltz and Viennese waltz', () => {
  assert.deepEqual(Object.keys(DANCE_PROFILES).filter(barCountingAvailable), ['waltz', 'vwaltz']);
});

test('D72: 8 bars per cycle, spoken with number words every voice has (one〜eight)', () => {
  assert.equal(BARS_PER_CYCLE, BAR_COUNT_WORDS.length);
  assert.deepEqual([...BAR_COUNT_WORDS], ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']);
  // 録音・受け取った声（完成した 12 語）にも、同梱の標準の声にも、8 語すべてがある
  for (const word of BAR_COUNT_WORDS) assert.ok(REQUIRED_VOICE_KEYS.includes(word), word);
  const manifest = JSON.parse(fs.readFileSync(new URL('../../../public/audio/default-en-female-v1/manifest.json', import.meta.url), 'utf8'));
  for (const word of BAR_COUNT_WORDS) assert.ok(manifest.words[word], `standard voice: ${word}`);
});

test('D72: bar counting is off by default and only true is kept', () => {
  assert.equal(DEFAULT_SETTINGS.barCounting, false);
  assert.equal(normalizeSettings({}).barCounting, false);
  assert.equal(normalizeSettings({ barCounting: true }).barCounting, true);
  assert.equal(normalizeSettings({ barCounting: 'yes' }).barCounting, false);
});
