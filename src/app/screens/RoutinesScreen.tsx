import { useI18n } from '../state/i18n.ts';

// S3 の器。一覧と「＋ 新しいルーティン」は段3。
export function RoutinesScreen() {
  const { translator } = useI18n();
  return (
    <main class="dc-screen" data-screen="S3">
      <h1 class="dc-heading">{translator.t('routinesTitle')}</h1>
      <p data-body>{translator.t('routinesEmpty')}</p>
    </main>
  );
}
