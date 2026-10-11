import { BackButton } from '../components/BackButton.tsx';
import { useI18n } from '../state/i18n.ts';

// S11（Ruling 27-b）: 3項目＋「もう一度 ▶」。技術用語なし。文言の監修は段8。
export function SoundHelpScreen() {
  const { translator } = useI18n();
  return (
    <main class="dc-screen dc-screen--focus" data-screen="S11">
      <BackButton screen="S11" />
      <h1 class="dc-heading">{translator.t('soundHelpTitle')}</h1>
      <ol class="dc-steps">
        <li>{translator.t('soundHelpSwitch')}</li>
        <li>{translator.t('soundHelpVolume')}</li>
        <li>{translator.t('soundHelpEarphones')}</li>
      </ol>
      <p class="dc-body" data-body>{translator.t('soundHelpRetry')}</p>
    </main>
  );
}
