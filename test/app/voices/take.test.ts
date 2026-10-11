import test from 'node:test';
import assert from 'node:assert/strict';
import { measureRecordingOnset } from '../../../src/engine/recording-normalizer.js';
import { fakeAudio, fakeBuffer, tone, type FakeBuffer } from '../helpers/voice-fixtures.ts';
import { LATE_ONSET_MS, MIN_TAKE_MS, SILENCE_PEAK_RMS, checkTake } from '../../../src/app/voices/take-check.ts';
import { processTake, type DecodeContext } from '../../../src/app/voices/normalize.ts';
import { APP_MESSAGES } from '../../../src/app/i18n/messages.ts';

test('thresholds are the Ruling 58 values', () => {
  assert.equal(SILENCE_PEAK_RMS, 0.01);
  assert.equal(LATE_ONSET_MS, 1000);
  assert.equal(MIN_TAKE_MS, 600);
});

test('all-zero is silent', () => {
  assert.equal(checkTake(fakeBuffer([new Float32Array(72000)])).problem, 'silent');
});

test('steady low noise is silent even though the relative detector "finds" it (Ruling 58-1)', () => {
  const noise = fakeBuffer([tone({ amplitude: 0, noise: 0.003 })]);
  assert.equal(measureRecordingOnset(noise as unknown as AudioBuffer).onsetMs, 0, 'the engine alone would accept it at 0 ms');
  assert.equal(checkTake(noise).problem, 'silent');
});

test('a voice from 200 ms passes with its onset', () => {
  const result = checkTake(fakeBuffer([tone({ startMs: 200, amplitude: 0.5, noise: 0.002 })]));
  assert.equal(result.problem, null);
  assert.ok(result.onsetMs! >= 195 && result.onsetMs! <= 210, String(result.onsetMs));
  assert.ok(result.peakRms > 0.3);
});

test('a voice that starts after 1 s is late, a 0.4 s take is short', () => {
  assert.equal(checkTake(fakeBuffer([tone({ startMs: 1200, lengthMs: 300 })])).problem, 'late');
  assert.equal(checkTake(fakeBuffer([tone({ totalMs: 400, startMs: 50, lengthMs: 200 })])).problem, 'short');
});

function decodingTo(buffer: FakeBuffer | Error): DecodeContext {
  return { ...fakeAudio, async decodeAudioData() { if (buffer instanceof Error) throw buffer; return buffer; } };
}

test('processTake cuts a stereo take to the reference length as mono 16-bit WAV (Ruling 58-3)', async () => {
  const left = tone({ startMs: 320 });
  const stereo = fakeBuffer([left, left]);
  const result = await processTake(decodingTo(stereo), new Blob(['x']), 'six');
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const { word } = result;
  assert.equal(word.mimeType, 'audio/wav');
  assert.equal(word.normalized, true);
  assert.equal(word.gainDb, 0);
  assert.equal(word.durationMs, 745, 'six is the longest reference word');
  assert.equal(word.onsetMs, 40);
  assert.ok(word.sourceOnsetMs >= 315 && word.sourceOnsetMs <= 325, String(word.sourceOnsetMs));
  const header = new DataView(await word.blob.arrayBuffer());
  assert.equal(header.getUint16(22, true), 1, 'mono');
  assert.equal(header.getUint32(24, true), 48000, 'sample rate kept');
  assert.equal(word.blob.size, 44 + Math.round(0.745 * 48000) * 2);
});

test('processTake turns every failure into a kind, never an engine message (Ruling 58-5)', async () => {
  assert.deepEqual(await processTake(decodingTo(new Error('EncodingError: x')), new Blob(['x']), 'one'), { ok: false, problem: 'failed' });
  assert.deepEqual(await processTake(decodingTo(fakeBuffer([new Float32Array(72000)])), new Blob(['x']), 'one'), { ok: false, problem: 'silent' });
  assert.deepEqual(await processTake(decodingTo(fakeBuffer([tone({ startMs: 1200, lengthMs: 300 })])), new Blob(['x']), 'one'), { ok: false, problem: 'late' });
  const allText = JSON.stringify(APP_MESSAGES);
  for (const engineText of ['No sustained voice onset detected', '録音データが正しくありません', '基準音声がありません', '録音音声パック']) {
    assert.equal(allText.includes(engineText), false, `UI strings must not carry the engine message "${engineText}"`);
  }
});
