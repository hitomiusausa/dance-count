import { useI18n } from '../state/i18n.ts';

// S1 の器。前回カード・先生カード・種目タイルは段2。
export function HomeScreen() {
  const { translator, setLocale } = useI18n();
  const other = translator.locale === 'ja-JP' ? 'en' : 'ja-JP';
  return (
    <main class="dc-screen" data-screen="S1">
      <header class="dc-appbar">
        <div>
          <h1 class="dc-appname">{translator.t('appName')}</h1>
          <p class="dc-appsub">{translator.t('appSubtitle')}</p>
        </div>
        <button type="button" class="dc-utility" data-utility onClick={() => setLocale(other)}>
          {translator.t('switchLanguage')}
        </button>
      </header>
      <h2 class="dc-heading">{translator.t('chooseDance')}</h2>
    </main>
  );
}
