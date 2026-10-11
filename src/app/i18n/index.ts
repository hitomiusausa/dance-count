import { createTranslator, resolveUiLocale } from '../../engine/localization.js';
import { DANCE_NAMES } from '../../engine/ui-messages.js';
import { APP_MESSAGES, type AppLocale, type MessageKey } from './messages.ts';

export { type AppLocale, type MessageKey } from './messages.ts';
export const APP_LOCALES = Object.keys(APP_MESSAGES) as AppLocale[];

// 端末の言語リストの先頭で決める（仕様 §3: 日本語以外は英語）。
export function resolveAppLocale(languages: readonly string[]): AppLocale {
  return resolveUiLocale(languages[0] ?? 'en', APP_LOCALES) as AppLocale;
}

export interface AppTranslator {
  locale: AppLocale;
  t(key: MessageKey, variables?: Record<string, string | number>): string;
}

export function createAppTranslator(locale: string): AppTranslator {
  return createTranslator(APP_MESSAGES, locale) as AppTranslator;
}

// 種目名は DANCE_NAMES を使い、dance-profiles の name は表示に使わない（仕様 §4 共通）。
export function danceName(danceId: string, locale: AppLocale): string {
  const names = (DANCE_NAMES as Record<string, Record<string, string>>)[danceId];
  return names?.[locale] ?? names?.en ?? danceId;
}
