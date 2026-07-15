import { canonicalLanguageTag, isValidLanguageTag } from './localization.js';

export const RECORDED_PACK_SCHEMA_VERSION = 1;
export const RECORDED_PACK_TYPE = 'dance-count-recorded-voice-pack';
export const REQUIRED_VOICE_KEYS = Object.freeze(['slow', 'quick', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'and', 'ah']);

export function createRecordedVoicePack(name = 'My recorded voice', { id = 'user-recorded-v1', locale = 'en', vocabularyId } = {}) {
  const normalizedLocale = normalizeVoiceLocale(locale);
  return {
    schemaVersion: RECORDED_PACK_SCHEMA_VERSION,
    type: RECORDED_PACK_TYPE,
    id,
    name,
    locale: normalizedLocale,
    vocabularyId: vocabularyId ?? defaultVocabularyId(normalizedLocale),
    updatedAt: new Date().toISOString(),
    words: {}
  };
}

export function validateRecordedVoicePack(pack, { requireComplete = false } = {}) {
  if (pack?.schemaVersion !== RECORDED_PACK_SCHEMA_VERSION || pack?.type !== RECORDED_PACK_TYPE || !pack.id || !pack.name || !pack.words) {
    throw new Error('録音音声パックの形式が正しくありません');
  }
  if (pack.locale && !isValidLanguageTag(pack.locale)) throw new Error('録音音声パックの言語が正しくありません');
  if (pack.vocabularyId != null && (typeof pack.vocabularyId !== 'string' || !pack.vocabularyId.trim())) throw new Error('カウント語彙IDが正しくありません');
  for (const [key, word] of Object.entries(pack.words)) {
    if (!REQUIRED_VOICE_KEYS.includes(key) || !(word.blob instanceof Blob) || !word.blob.size || !Number.isFinite(word.onsetMs) || word.onsetMs < 0) {
      throw new Error(`録音データが正しくありません: ${key}`);
    }
    if (word.normalized && (!Number.isFinite(word.durationMs) || word.durationMs <= 0 || !Number.isFinite(word.sourceOnsetMs) || word.sourceOnsetMs < 0)) {
      throw new Error(`自動カット情報が正しくありません: ${key}`);
    }
  }
  if (pack.timingAdjustments) {
    const timing = pack.timingAdjustments;
    if (!Number.isFinite(timing.globalOffsetMs) || Math.abs(timing.globalOffsetMs) > 1000 || !timing.wordOffsetsMs || typeof timing.wordOffsetsMs !== 'object' || !timing.adjustedAt) {
      throw new Error('音声タイミング調整の形式が正しくありません');
    }
    for (const [key, value] of Object.entries(timing.wordOffsetsMs)) {
      if (!REQUIRED_VOICE_KEYS.includes(key) || !Number.isFinite(value) || Math.abs(value) > 1000) throw new Error(`音声タイミング調整が正しくありません: ${key}`);
    }
  }
  if (requireComplete) {
    const missing = REQUIRED_VOICE_KEYS.filter(key => !pack.words[key]);
    if (missing.length) throw new Error(`未録音のカウントがあります: ${missing.join(', ')}`);
  }
  return true;
}

export function recordedPackProgress(pack) {
  const recorded = REQUIRED_VOICE_KEYS.filter(key => pack?.words?.[key]).length;
  return { recorded, total: REQUIRED_VOICE_KEYS.length, complete: recorded === REQUIRED_VOICE_KEYS.length };
}

export function createVoiceTimingAdjustments(globalOffsetMs, wordOffsetsMs, adjustedAt = new Date().toISOString()) {
  return {
    globalOffsetMs: Number(globalOffsetMs),
    wordOffsetsMs: Object.fromEntries(REQUIRED_VOICE_KEYS.map(key => [key, Number(wordOffsetsMs?.[key] ?? 0)])),
    adjustedAt
  };
}

export function voiceTimingAdjustmentsEqual(first, second) {
  if (Number(first?.globalOffsetMs ?? 0) !== Number(second?.globalOffsetMs ?? 0)) return false;
  return REQUIRED_VOICE_KEYS.every(key => Number(first?.wordOffsetsMs?.[key] ?? 0) === Number(second?.wordOffsetsMs?.[key] ?? 0));
}

export async function exportRecordedVoicePack(pack) {
  validateRecordedVoicePack(pack);
  const words = {};
  for (const [key, word] of Object.entries(pack.words)) {
    words[key] = {
      mimeType: word.blob.type || word.mimeType || 'application/octet-stream',
      onsetMs: word.onsetMs,
      gainDb: word.gainDb ?? 0,
      normalized: word.normalized === true,
      sourceOnsetMs: word.sourceOnsetMs,
      durationMs: word.durationMs,
      dataBase64: bytesToBase64(new Uint8Array(await word.blob.arrayBuffer()))
    };
  }
  return JSON.stringify({ ...pack, words, exportedAt: new Date().toISOString() }, null, 2);
}

export function importRecordedVoicePack(text) {
  const data = JSON.parse(text);
  const words = {};
  for (const [key, word] of Object.entries(data.words ?? {})) {
    if (typeof word.dataBase64 !== 'string' || word.dataBase64.length > 30_000_000) throw new Error(`録音データが大きすぎるか不正です: ${key}`);
    words[key] = {
      blob: new Blob([base64ToBytes(word.dataBase64)], { type: word.mimeType }),
      onsetMs: word.onsetMs,
      gainDb: word.gainDb ?? 0,
      mimeType: word.mimeType,
      normalized: word.normalized === true,
      sourceOnsetMs: word.sourceOnsetMs,
      durationMs: word.durationMs
    };
  }
  const locale = normalizeVoiceLocale(data.locale ?? 'en');
  const pack = {
    ...data,
    locale,
    vocabularyId: data.vocabularyId ?? defaultVocabularyId(locale),
    words,
    updatedAt: new Date().toISOString()
  };
  delete pack.exportedAt;
  validateRecordedVoicePack(pack);
  return pack;
}

export async function decodeRecordedVoicePack(audioContext, pack) {
  validateRecordedVoicePack(pack, { requireComplete: true });
  const words = new Map();
  for (const key of REQUIRED_VOICE_KEYS) {
    const word = pack.words[key];
    const buffer = await audioContext.decodeAudioData(await word.blob.arrayBuffer());
    if (word.onsetMs / 1000 >= buffer.duration) throw new Error(`声の開始位置が録音時間を超えています: ${key}`);
    words.set(key, { ...word, buffer });
  }
  return {
    manifest: {
      schemaVersion: 2,
      id: pack.id,
      name: pack.name,
      locale: normalizeVoiceLocale(pack.locale ?? 'en'),
      vocabularyId: pack.vocabularyId ?? defaultVocabularyId(pack.locale),
      source: 'local-recording'
    },
    words
  };
}

function defaultVocabularyId(locale) {
  return canonicalLanguageTag(locale).split('-')[0] === 'ja' ? 'ja-JP' : 'en';
}

function normalizeVoiceLocale(locale) {
  const canonical = canonicalLanguageTag(locale);
  return canonical === 'ja' ? 'ja-JP' : canonical;
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
