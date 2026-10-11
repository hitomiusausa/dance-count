// 声の ID（Ruling 56-3・61-1）。録音の声は言語ごとに 1 つで、旧画面と同じ ID（src/engine/recorded-voice-store.js:4-5 の値を写す。
// エンジンの store は IndexedDB v1 を直接開くので import しない）。同じ言語で録り直すと同じ声を上書きする。
export type VoiceLocale = 'en' | 'ja-JP';

export const RECORDED_PACK_IDS: Readonly<Record<VoiceLocale, string>> = Object.freeze({
  en: 'user-recorded-v1',
  'ja-JP': 'user-recorded-ja-v1'
});

const VOICE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function isVoiceId(value: unknown): value is string {
  return typeof value === 'string' && VOICE_ID.test(value);
}

export function recordedPackIdFor(locale: VoiceLocale): string {
  return RECORDED_PACK_IDS[locale];
}

// 'ja'・'ja-JP' などは日本語、それ以外は英語に丸める（Ruling 60-3）。
export function toVoiceLocale(value: unknown): VoiceLocale {
  return typeof value === 'string' && /^ja(?:-|$)/i.test(value) ? 'ja-JP' : 'en';
}
