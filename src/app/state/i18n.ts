import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { createAppTranslator, type AppLocale, type AppTranslator } from '../i18n/index.ts';

export interface I18nValue { translator: AppTranslator; setLocale(locale: AppLocale): void }

export const I18nContext = createContext<I18nValue>({ translator: createAppTranslator('en'), setLocale: () => {} });

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
