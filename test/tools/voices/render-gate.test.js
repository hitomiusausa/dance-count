// 聴感ゲートの道具（Ruling 67）。音が無い今は合成音のパックと英パックで確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GATE_CASES, gateTracks, renderGate, renderTrack, buildGatePage, loadPack } from '../../../tools/voices/render-gate.js';
import { REQUIRED_VOICE_KEYS } from '../../../src/engine/recorded-voice-pack.js';
import { DANCE_PROFILES } from '../../../src/engine/dance-profiles.js';
import { compileRhythm } from '../../../src/engine/rhythm-compiler.js';
import { measureOnset } from '../../../src/engine/onset-detector.js';
import { parsePcm16Wav } from '../../../tools/voices/wav.js';
import { writeSyntheticPack } from './helpers.js';

const root = path.resolve(import.meta.dirname, '../../..');
const englishPack = path.join(root, 'public/audio/default-en-female-v1');

test('5 patterns × 2 speeds = 10 tracks that use all 12 words', () => {
  assert.equal(GATE_CASES.length, 5);
  const tracks = gateTracks();
  assert.equal(tracks.length, 10);
  for (const track of tracks) {
    const profile = DANCE_PROFILES[track.danceId];
    assert.ok([profile.practiceBpm, profile.competitionBpm.max].includes(track.bpm), track.id);
  }
  const used = new Set(GATE_CASES.flatMap(item => compileRhythm({ danceId: item.danceId, counts: item.counts }).events.map(event => event.voiceKey)).filter(Boolean));
  assert.deepEqual([...REQUIRED_VOICE_KEYS].filter(key => !used.has(key)), []);
});

test('renderTrack puts each word onset on its beat (no clicks)', async () => {
  const pack = await loadPack(englishPack);
  const compiled = compileRhythm({ danceId: 'waltz', counts: '123' });
  const { samples, preRollMs } = renderTrack(pack.words, compiled, 84, 3, { clicks: false, repetitions: 1 });
  const onset = measureOnset(samples, 48_000).onsetMs;
  assert.ok(Math.abs(onset - preRollMs) <= 5, `first word onset ${onset} vs ${preRollMs}`);
});

test('renderGate writes words, 10 tracks per voice, the English reference, the report and one page', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-gate-'));
  try {
    const cand = await writeSyntheticPack(base, 'google-ja-JP-Neural2-B-r1.0-20261012');
    const outDir = path.join(base, 'gate');
    const report = await renderGate([cand], { outDir, englishDir: englishPack, log: () => {} });
    const files = await fs.readdir(outDir);
    const id = path.basename(cand);
    for (const key of REQUIRED_VOICE_KEYS) assert.ok(files.includes(`${id}-${key}.wav`), key);
    for (const track of gateTracks()) {
      assert.ok(files.includes(`${id}-${track.id}.wav`), track.id);
      assert.ok(files.includes(`default-en-female-v1-${track.id}.wav`), `en ${track.id}`);
    }
    assert.ok(files.includes('index.html'));
    assert.ok(files.includes('gate-report.json'));
    const word = parsePcm16Wav(await fs.readFile(path.join(outDir, `${id}-one.wav`)));
    assert.equal(word.sampleRate, 48_000);
    const entry = report.candidates[0];
    assert.equal(entry.id, id);
    assert.equal(entry.tracks.length, 10);
    assert.deepEqual(Object.keys(entry.words), [...REQUIRED_VOICE_KEYS]);
    for (const track of entry.tracks) assert.ok(Array.isArray(track.risks));
    assert.equal(typeof entry.checks.practiceRisksZero, 'boolean');
    assert.equal(typeof entry.checks.competitionNotWorseThanEnglish, 'boolean');
    assert.equal(entry.danceAudit.length, Object.keys(DANCE_PROFILES).length);
    const saved = JSON.parse(await fs.readFile(path.join(outDir, 'gate-report.json'), 'utf8'));
    assert.equal(saved.candidates[0].id, id);
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
});

test('the English pack measured against its own baseline is never worse than itself', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-gate-en-'));
  try {
    const report = await renderGate([englishPack], { outDir: base, englishDir: englishPack, log: () => {} });
    const entry = report.candidates[0];
    assert.equal(entry.checks.competitionNotWorseThanEnglish, true);
    assert.equal(entry.checks.practiceNotWorseThanEnglish, true);
    // 英パック自身もサンバ 1a2 の練習の速さで「ア→2」が重なる（既存の timing:audit と同じ）。Ruling 67-4 の字面は満たせない
    assert.equal(entry.checks.practiceRisksZero, false);
    for (const dance of entry.danceAudit) assert.equal(dance.collisionRiskTypes, dance.baseline, dance.danceId);
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
});

test('the page is self-contained, large enough to tap, and copies a Markdown table', async () => {
  const pack = await loadPack(englishPack);
  const html = buildGatePage({ date: '2026-10-12', english: { id: pack.manifest.id }, candidates: [{ id: pack.manifest.id, name: pack.manifest.name, locale: 'en-US', speakingRate: 1.25, words: {}, tracks: [] }], tracks: gateTracks() });
  assert.doesNotMatch(html, /<(script|link|img)[^>]+(src|href)=["']https?:/i, 'no external resources');
  assert.match(html, /min-height:\s*56px/);
  assert.match(html, /font-size:\s*18px/);
  assert.doesNotMatch(html, /font-size:\s*1[0-7]px/, "no text under 18px");
  assert.match(html, /結果をコピー/);
  assert.match(html, /\| # \| 語 \| 候補 \| 自然／気になる／だめ \| メモ \|/);
  assert.match(html, /\| # \| 候補 \| 種目・型・速さ \| ずれない／ずれる \| メモ \|/);
  assert.match(html, /localStorage/);
  assert.doesNotMatch(html, /fetch\(|XMLHttpRequest|sendBeacon/, 'nothing is sent');
});
