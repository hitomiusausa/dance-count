import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TARGET_ONSET_MS, TAIL_KEEP_MS, PEAK_CEILING_DBFS, MIN_WORD_MS, MAX_WORD_MS,
  processWords, buildManifest, referencePeakRms, hasFfmpeg, dbfs, adjustWord
} from '../../../tools/voices/pipeline.js';
import { RATE, syntheticWord, voiced, concat, silence } from './helpers.js';

const REF = 0.2;

function processOne(samples, sampleRate = RATE, options = {}) {
  const result = processWords({ one: { samples, sampleRate } }, { refPeakRms: REF, ...options });
  return result.words.one;
}

test('trims the head to TARGET_ONSET_MS and keeps TAIL_KEEP_MS after the voice', () => {
  const word = processOne(syntheticWord());
  assert.ok(Math.abs(word.onsetMs - TARGET_ONSET_MS) <= 5, `onset ${word.onsetMs}`);
  const expected = 400 + TARGET_ONSET_MS + TAIL_KEEP_MS;
  assert.ok(Math.abs(word.durationMs - expected) <= 20, `duration ${word.durationMs}`);
  assert.equal(word.problem, undefined);
});

test('a voice that starts early gets silence padded in front', () => {
  const word = processOne(concat(silence(10), voiced(400), silence(200)));
  assert.ok(Math.abs(word.onsetMs - TARGET_ONSET_MS) <= 5, `onset ${word.onsetMs}`);
});

test('peak never exceeds PEAK_CEILING_DBFS even when the loudness gain is large', () => {
  const word = processOne(syntheticWord({ amplitude: 0.05 }), RATE, { refPeakRms: 0.9 });
  assert.ok(dbfs(word.peak) <= PEAK_CEILING_DBFS + 0.01, `peak ${dbfs(word.peak)} dBFS`);
  assert.ok(word.limitedDb > 0);
});

test('one gain for the whole pack keeps the relative loudness of words', () => {
  const result = processWords({
    one: { samples: syntheticWord({ amplitude: 0.1 }), sampleRate: RATE },
    two: { samples: syntheticWord({ amplitude: 0.2 }), sampleRate: RATE },
    three: { samples: syntheticWord({ amplitude: 0.4 }), sampleRate: RATE }
  }, { refPeakRms: REF });
  const ratio = result.words.three.peakRms / result.words.one.peakRms;
  assert.ok(Math.abs(ratio - 4) < 0.05, `ratio ${ratio}`);
  assert.ok(Math.abs(result.words.two.peakRms - REF) < 0.01, 'median word lands on the reference');
});

test('running the pipeline twice gives the same result (idempotent)', () => {
  const first = processOne(syntheticWord());
  const second = processOne(first.samples);
  assert.equal(second.onsetMs, first.onsetMs);
  assert.equal(second.durationMs, first.durationMs);
  assert.equal(second.samples.length, first.samples.length);
  for (let index = 0; index < first.samples.length; index += 1) assert.ok(Math.abs(second.samples[index] - first.samples[index]) <= 3 / 32768);
});

test('a silent input is marked, not thrown', () => {
  const result = processWords({ one: { samples: silence(500), sampleRate: RATE } }, { refPeakRms: REF });
  assert.equal(result.words.one.problem, 'silent');
  assert.equal(result.words.one.samples, undefined);
  assert.deepEqual(result.problems, [{ key: 'one', problem: 'silent' }]);
});

test('too short and too long words are flagged as warnings', () => {
  const result = processWords({
    one: { samples: syntheticWord({ voiceMs: 60 }), sampleRate: RATE },
    two: { samples: syntheticWord({ voiceMs: 1200 }), sampleRate: RATE }
  }, { refPeakRms: REF });
  assert.ok(result.words.one.durationMs < MIN_WORD_MS);
  assert.equal(result.words.one.problem, 'too-short');
  assert.ok(result.words.two.durationMs > MAX_WORD_MS);
  assert.equal(result.words.two.problem, 'too-long');
});

test('the written WAV bytes re-measure to the reported onset', async () => {
  const { parsePcm16Wav } = await import('../../../tools/voices/wav.js');
  const { measureOnset } = await import('../../../src/engine/onset-detector.js');
  const word = processOne(syntheticWord());
  const parsed = parsePcm16Wav(word.wav);
  assert.equal(parsed.sampleRate, 48_000);
  assert.equal(parsed.channels, 1);
  assert.equal(measureOnset(parsed.samples, parsed.sampleRate).onsetMs, word.onsetMs);
});

test('24 kHz input is resampled to 48 kHz', { skip: !hasFfmpeg() && 'ffmpeg not installed' }, () => {
  const word = processOne(syntheticWord({ rate: 24_000 }), 24_000);
  assert.equal(word.sampleRate, 48_000);
  assert.ok(Math.abs(word.onsetMs - TARGET_ONSET_MS) <= 5, `onset ${word.onsetMs}`);
  assert.ok(Math.abs(word.durationMs - 500) <= 25, `duration ${word.durationMs}`);
});

test('buildManifest writes the English fields plus the stage 6 fields', () => {
  const result = processWords({ one: { samples: syntheticWord(), sampleRate: RATE } }, { refPeakRms: REF });
  const manifest = buildManifest({
    id: 'cand', name: 'Google ja-JP-Neural2-B', provider: 'google-cloud-tts', locale: 'ja-JP',
    voiceName: 'ja-JP-Neural2-B', speakingRate: 1, generatedAt: '2026-10-12T00:00:00.000Z',
    measuredAt: '2026-10-12T00:00:01.000Z', words: result.words, overrides: {}
  });
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.source, 'google-cloud-tts');
  assert.equal(manifest.sampleRate, 48_000);
  assert.equal(manifest.status, 'auto-onset-measured');
  assert.deepEqual(manifest.pipeline, { version: 'ja-v1', targetOnsetMs: 40, loudnessRef: 'default-en-female-v1' });
  assert.deepEqual(manifest.gate, { status: 'pending' });
  assert.equal(manifest.credit, undefined);
  const word = manifest.words.one;
  assert.deepEqual(Object.keys(word), ['file', 'onsetMs', 'gainDb', 'needsOnsetMeasurement', 'onsetMethod', 'durationMs', 'peakRms']);
  assert.equal(word.file, 'one.wav');
  assert.equal(word.gainDb, 0);
  assert.equal(word.onsetMethod, 'rms-auto-v1');
});

test('an onset override is written as a manual onset with its note', () => {
  const result = processWords({ one: { samples: syntheticWord(), sampleRate: RATE } }, { refPeakRms: REF });
  const manifest = buildManifest({ id: 'c', name: 'n', provider: 'voicevox', locale: 'ja-JP', voiceName: 'v', speakingRate: 1,
    credit: 'VOICEVOX:テスト', words: result.words, overrides: { one: { onsetOverrideMs: 55, note: '「い」の頭が弱い' } } });
  assert.equal(manifest.credit, 'VOICEVOX:テスト');
  assert.equal(manifest.words.one.onsetMs, 55);
  assert.equal(manifest.words.one.onsetOverrideMs, 55);
  assert.equal(manifest.words.one.onsetMethod, 'manual');
  assert.equal(manifest.words.one.note, '「い」の頭が弱い');
  assert.throws(() => buildManifest({ id: 'c', name: 'n', provider: 'voicevox', locale: 'ja-JP', voiceName: 'v', speakingRate: 1,
    words: result.words, overrides: { one: { onsetOverrideMs: 55 } } }), /note/);
});

test('the loudness reference is the median peakRms of the English pack', async () => {
  const value = await referencePeakRms();
  assert.ok(value > 0.19 && value < 0.22, `ref ${value}`);
});

// 聴感ゲートで決めた高さ・語尾の手直し（2026-11-03 VOICEPEAK）
test('adjustWord needs a note, stretches only the tail, and re-measures the written word', () => {
  const word = processOne(syntheticWord());
  assert.equal(adjustWord(word, undefined), word);
  assert.equal(adjustWord(word, { onsetOverrideMs: 60, note: 'x' }), word);
  assert.throws(() => adjustWord(word, { tailStretch: 2 }, { key: 'two' }), /two: .*note/);
  assert.throws(() => adjustWord(word, { tailStretch: 9, note: 'x' }), /tailStretch/);
  assert.throws(() => adjustWord(word, { pitchSemitones: 12, note: 'x' }), /pitchSemitones/);
  const calls = [];
  // 偽の rubberband: tempo=0.5 なら 2 倍の長さ、pitch はそのまま返す
  const rubberband = (samples, filter) => {
    calls.push(filter);
    const tempo = /tempo=([0-9.]+)/.exec(filter)?.[1];
    if (!tempo) return Float32Array.from(samples);
    const out = new Float32Array(Math.round(samples.length / Number(tempo)));
    for (let index = 0; index < out.length; index += 1) out[index] = samples[Math.floor(index * Number(tempo))];
    return out;
  };
  const stretched = adjustWord(word, { tailStretch: 2, pitchSemitones: 3.5, note: '語尾が切れる・低い' }, { rubberband });
  assert.deepEqual(calls.map(call => call.split('=')[0]), ['pitch', 'tempo']);
  assert.match(calls[0], /^pitch=1\.22\d+:formant=preserved/);   // 2^(3.5/12)
  const tailMs = word.durationMs - (word.activeEndMs - 50);
  assert.ok(Math.abs(stretched.durationMs - (word.durationMs + tailMs)) <= 3, `duration ${word.durationMs} → ${stretched.durationMs}`);
  assert.equal(stretched.onsetMs, word.onsetMs);
  assert.ok(stretched.wav instanceof Uint8Array || Buffer.isBuffer(stretched.wav));
});

test('pitch and tail adjustments are written to the manifest with their note', () => {
  const result = processWords({ one: { samples: syntheticWord(), sampleRate: RATE } }, { refPeakRms: REF });
  const manifest = buildManifest({ id: 'c', name: 'n', provider: 'voicepeak', locale: 'ja-JP', voiceName: 'v', speakingRate: null,
    words: result.words, overrides: { one: { pitchSemitones: 3.5, tailStretch: 2.5, onsetOverrideMs: 185, note: '低い・遅れて聞こえる' } } });
  const word = manifest.words.one;
  assert.equal(word.pitchSemitones, 3.5);
  assert.equal(word.tailStretch, 2.5);
  assert.equal(word.onsetMs, 185);
  assert.equal(word.note, '低い・遅れて聞こえる');
  assert.throws(() => buildManifest({ id: 'c', name: 'n', provider: 'voicepeak', locale: 'ja-JP', voiceName: 'v', speakingRate: null,
    words: result.words, overrides: { one: { pitchSemitones: 1 } } }), /pitchSemitones.*note/);
  const plain = buildManifest({ id: 'c', name: 'n', provider: 'voicepeak', locale: 'ja-JP', voiceName: 'v', speakingRate: null, words: result.words });
  assert.equal(plain.words.one.note, undefined);
});

test('the real rubberband keeps the word length when only the pitch changes', { skip: !hasFfmpeg() && 'ffmpeg が無い' }, () => {
  const word = processOne(syntheticWord());
  const higher = adjustWord(word, { pitchSemitones: 2, note: 'test' });
  assert.ok(Math.abs(higher.durationMs - word.durationMs) <= 5, `${word.durationMs} → ${higher.durationMs}`);
});
