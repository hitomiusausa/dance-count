import { BackButton } from '../components/BackButton.tsx';
import { phrased } from '../i18n/phrased.tsx';
import { useI18n } from '../state/i18n.ts';

// S11（Ruling 27-b・99-1）: 3項目＋「もう一度 ▶」。技術用語なし。文は句の境で折る（Ruling 97）。入口は S2/S5 の枠と S6「困った時は」。
export function SoundHelpScreen() {
  const { translator } = useI18n();
  return (
    <main class="dc-screen dc-screen--focus" data-screen="S11">
      <BackButton screen="S11" />
      <h1 class="dc-heading">{translator.t('soundHelpTitle')}</h1>
      <ol class="dc-steps">
        <li>{phrased(translator, 'soundHelpSwitch')}</li>
        <li>{phrased(translator, 'soundHelpVolume')}</li>
        <li>{phrased(translator, 'soundHelpEarphones')}</li>
      </ol>
      <p class="dc-body" data-body>{phrased(translator, 'soundHelpRetry')}</p>
    </main>
  );
}
