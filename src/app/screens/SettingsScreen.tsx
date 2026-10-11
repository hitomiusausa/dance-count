import { Icon } from '../components/Icon.tsx';
import type { AppLocale } from '../i18n/index.ts';
import { useI18n } from '../state/i18n.ts';

const LANGUAGES: Array<{ locale: AppLocale; label: string; lang: string }> = [
  { locale: 'ja-JP', label: '日本語', lang: 'ja' },
  { locale: 'en', label: 'English', lang: 'en' }
];

// S6 の器。段2は「言語」だけ（切替は即保存。Ruling 26）。他の項目は段3〜8で順に足す。
export function SettingsScreen() {
  const { translator, setLocale } = useI18n();
  return (
    <main class="dc-screen" data-screen="S6">
      <h1 class="dc-heading">{translator.t('settingsTitle')}</h1>
      <h2 class="dc-field-label">{translator.t('settingsLanguage')}</h2>
      <div class="dc-radiogroup" role="radiogroup" aria-label={translator.t('settingsLanguage')} data-group="language">
        {LANGUAGES.map(item => {
          const checked = translator.locale === item.locale;
          return (
            <button key={item.locale} type="button" class="dc-radio-row" role="radio" aria-checked={checked ? 'true' : 'false'} lang={item.lang}
              onClick={() => setLocale(item.locale)}>
              {checked ? <Icon name="check" /> : <span class="dc-ic" aria-hidden="true" />}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </main>
  );
}
