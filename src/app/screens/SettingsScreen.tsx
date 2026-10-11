import { useI18n } from '../state/i18n.ts';

// S6 の器。項目は段2〜8で順に足す。
export function SettingsScreen() {
  const { translator } = useI18n();
  return (
    <main class="dc-screen" data-screen="S6">
      <h1 class="dc-heading">{translator.t('settingsTitle')}</h1>
    </main>
  );
}
