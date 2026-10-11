import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRecordedProvider } from '../../../tools/voices/providers/recorded.js';
import { encodePcm16Wav } from '../../../tools/voices/wav.js';
import { processWords, hasFfmpeg, TARGET_ONSET_MS } from '../../../tools/voices/pipeline.js';
import { RECORDED_PACK_TYPE } from '../../../src/engine/recorded-voice-pack.js';
import { syntheticWord, RATE } from './helpers.js';

async function writePackJson(dir, wavBytes, mimeType = 'audio/wav') {
  const file = path.join(dir, 'pack.json');
  await fs.writeFile(file, JSON.stringify({
    schemaVersion: 1, type: RECORDED_PACK_TYPE, id: 'user-recorded-v1', name: 'ひとみうさの声（日本語）', locale: 'ja-JP', vocabularyId: 'ja-JP',
    words: { one: { mimeType, onsetMs: 30, gainDb: 0, normalized: true, sourceOnsetMs: 300, durationMs: 591, dataBase64: Buffer.from(wavBytes).toString('base64') } }
  }));
  return file;
}

test('reads a recorded-pack JSON (base64 WAV) and feeds the pipeline', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-rec-'));
  try {
    const file = await writePackJson(dir, encodePcm16Wav(syntheticWord(), RATE));
    const provider = await createRecordedProvider({ source: file });
    assert.equal(provider.describe().provider, 'human-recording');
    assert.equal(provider.describe().name, 'ひとみうさの声（日本語）');
    assert.deepEqual(provider.keys(), ['one']);
    const raw = await provider.synthesize({ key: 'one' });
    assert.equal(raw.sampleRate, RATE);
    const result = processWords({ one: { samples: raw.pcm, sampleRate: raw.sampleRate } }, { refPeakRms: 0.2 });
    assert.ok(Math.abs(result.words.one.onsetMs - TARGET_ONSET_MS) <= 5);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('reads a folder of <key>.wav files', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-recdir-'));
  try {
    await fs.writeFile(path.join(dir, 'two.wav'), encodePcm16Wav(syntheticWord(), RATE));
    const provider = await createRecordedProvider({ source: dir });
    assert.deepEqual(provider.keys(), ['two']);
    const raw = await provider.synthesize({ key: 'two' });
    assert.equal(raw.pcm.length, syntheticWord().length);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('non-WAV recordings (Safari mp4) are decoded with ffmpeg', { skip: !hasFfmpeg() && 'ffmpeg not installed' }, async () => {
  const { spawnSync } = await import('node:child_process');
  const wav = encodePcm16Wav(syntheticWord(), RATE);
  const encoded = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'wav', '-i', 'pipe:0', '-c:a', 'aac', '-f', 'mp4', '-movflags', 'frag_keyframe+empty_moov', 'pipe:1'], { input: wav, maxBuffer: 16 * 1024 * 1024 });
  assert.equal(encoded.status, 0, encoded.stderr?.toString());
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-recmp4-'));
  try {
    const file = await writePackJson(dir, encoded.stdout, 'audio/mp4');
    const provider = await createRecordedProvider({ source: file });
    const raw = await provider.synthesize({ key: 'one' });
    assert.equal(raw.sampleRate, 48_000);
    const result = processWords({ one: { samples: raw.pcm, sampleRate: raw.sampleRate } }, { refPeakRms: 0.2 });
    assert.ok(Math.abs(result.words.one.onsetMs - TARGET_ONSET_MS) <= 10, `onset ${result.words.one.onsetMs}`);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('a missing word is a clear error', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-recmiss-'));
  try {
    const provider = await createRecordedProvider({ source: dir });
    await assert.rejects(provider.synthesize({ key: 'one' }), /one/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
