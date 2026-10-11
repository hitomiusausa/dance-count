import { COUNT_VOCABULARIES } from '../../engine/count-vocabularies.js';
import type { AppTranslator } from '../i18n/index.ts';
import type { VoiceLocale } from './ids.ts';
import { VOICE_KEYS, type VoicePackRecord, type VoiceKey } from './store.ts';

// S8 の進み方（Ruling 59・D25）の純粋な部分。語は VOICE_KEYS の順に 1 つずつ・飛ばせない。
export type RecordStep = { kind: 'intro' } | { kind: 'word'; index: number } | { kind: 'done' };

// 最初の未録音の語。全部録れていれば null（完成画面から。D25）。
export function firstMissingIndex(pack: VoicePackRecord | null): number | null {
  const index = VOICE_KEYS.findIndex(key => !pack?.words[key]);
  return index < 0 ? null : index;
}

export function stepAfterStart(pack: VoicePackRecord | null): RecordStep {
  const index = firstMissingIndex(pack);
  return index === null ? { kind: 'done' } : { kind: 'word', index };
}

// 「次へ」はその語が録れている時だけ。12 語目の次は完成（Ruling 59-4）。
export function nextStep(pack: VoicePackRecord | null, index: number): RecordStep | null {
  if (!pack?.words[VOICE_KEYS[index]!]) return null;
  return index + 1 >= VOICE_KEYS.length ? { kind: 'done' } : { kind: 'word', index: index + 1 };
}

export function previousStep(index: number): RecordStep | null {
  return index > 0 ? { kind: 'word', index: index - 1 } : null;
}

// 見出しの語（56px）＝選んだ言葉の語彙の第一表記、下の小さい語（20px）＝もう一方の語彙の第一表記（Ruling 0-1 の訂正）。
export function wordPrompts(locale: VoiceLocale, key: VoiceKey): { main: string; other: string } {
  const vocabularies = COUNT_VOCABULARIES as Record<VoiceLocale, { prompts: Record<string, readonly string[]> }>;
  const other: VoiceLocale = locale === 'ja-JP' ? 'en' : 'ja-JP';
  return { main: vocabularies[locale].prompts[key]![0]!, other: vocabularies[other].prompts[key]![0]! };
}

// 既定名（D23）「自分の声（英語）」「自分の声（日本語）」。録り始めた時の表示言語で付ける。
export function defaultVoiceName(translator: AppTranslator, locale: VoiceLocale): string {
  return translator.t(locale === 'ja-JP' ? 'defaultVoiceNameJa' : 'defaultVoiceNameEn');
}
