import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRecordedVoicePack,
  createVoiceTimingAdjustments,
  decodeRecordedVoicePack,
  exportRecordedVoicePack,
  importRecordedVoicePack,
  recordedPackProgress,
  REQUIRED_VOICE_KEYS,
  validateRecordedVoicePack,
  voiceTimingAdjustmentsEqual
} from '../../src/engine/recorded-voice-pack.js';

function completePack() {
  const pack = createRecordedVoicePack('Test voice');
  for (const key of REQUIRED_VOICE_KEYS) {
    pack.words[key] = { blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' }), onsetMs: 20, gainDb: 0 };
  }
  return pack;
}

test('recorded voice pack reports completion and validates all required words', () => {
  const pack = createRecordedVoicePack();
  assert.deepEqual(recordedPackProgress(pack), { recorded: 0, total: 12, complete: false });
  assert.throws(() => validateRecordedVoicePack(pack, { requireComplete: true }), /未録音/);
  const complete = completePack();
  assert.equal(validateRecordedVoicePack(complete, { requireComplete: true }), true);
  assert.equal(recordedPackProgress(complete).complete, true);
});

test('recorded voice packs can keep English and Japanese sets under different ids', () => {
  const english = createRecordedVoicePack('English', { id: 'user-recorded-v1', locale: 'en' });
  const japanese = createRecordedVoicePack('日本語', { id: 'user-recorded-ja-v1', locale: 'ja' });
  assert.equal(english.id, 'user-recorded-v1');
  assert.equal(english.locale, 'en');
  assert.equal(japanese.id, 'user-recorded-ja-v1');
  assert.equal(japanese.locale, 'ja-JP');
  assert.equal(japanese.vocabularyId, 'ja-JP');
  assert.equal(validateRecordedVoicePack(japanese), true);
});

test('recorded voice packs accept canonical world locales without changing count vocabulary', () => {
  const spanish = createRecordedVoicePack('Mi voz', { id: 'user-recorded-es-mx-v1', locale: 'es-MX', vocabularyId: 'es-MX' });
  assert.equal(spanish.locale, 'es-MX');
  assert.equal(spanish.vocabularyId, 'es-MX');
  assert.equal(validateRecordedVoicePack(spanish), true);
});

test('voice timing adjustments compare all count words and normalize missing values', () => {
  const committed = createVoiceTimingAdjustments(-5, { three: -20 }, '2026-07-13T10:00:00.000Z');
  assert.equal(committed.wordOffsetsMs.three, -20);
  assert.equal(committed.wordOffsetsMs.six, 0);
  assert.equal(voiceTimingAdjustmentsEqual(committed, { globalOffsetMs: -5, wordOffsetsMs: { three: -20 } }), true);
  assert.equal(voiceTimingAdjustmentsEqual(committed, { globalOffsetMs: -5, wordOffsetsMs: { three: -15 } }), false);
});

test('recorded voice pack export and import preserves audio and onset metadata', async () => {
  const original = completePack();
  original.timingAdjustments = { globalOffsetMs: -5, wordOffsetsMs: { three: -20 }, adjustedAt: '2026-07-13T10:00:00.000Z' };
  original.words.six = {
    ...original.words.six,
    normalized: true,
    sourceOnsetMs: 320,
    durationMs: 745
  };
  const restored = importRecordedVoicePack(await exportRecordedVoicePack(original));
  assert.equal(restored.name, 'Test voice');
  assert.equal(restored.words.six.onsetMs, 20);
  assert.equal(restored.words.six.blob.type, 'audio/webm');
  assert.equal(restored.words.six.normalized, true);
  assert.equal(restored.words.six.sourceOnsetMs, 320);
  assert.equal(restored.words.six.durationMs, 745);
  assert.deepEqual(restored.timingAdjustments, original.timingAdjustments);
  assert.deepEqual([...new Uint8Array(await restored.words.six.blob.arrayBuffer())], [1, 2, 3]);
});

test('recorded voice pack decodes to the same runtime shape as a static pack', async () => {
  const audioContext = { decodeAudioData: async () => ({ duration: 1 }) };
  const decoded = await decodeRecordedVoicePack(audioContext, completePack());
  assert.equal(decoded.manifest.source, 'local-recording');
  assert.equal(decoded.manifest.locale, 'en');
  assert.deepEqual([...decoded.words.keys()], REQUIRED_VOICE_KEYS);
  assert.equal(decoded.words.get('one').buffer.duration, 1);
});
