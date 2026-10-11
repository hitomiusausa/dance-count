import { BackButton } from '../components/BackButton.tsx';
import { Icon } from '../components/Icon.tsx';
import { useI18n } from '../state/i18n.ts';

// S7 の最小版（Ruling 27-a）: 標準の声（英語）1行だけ・選択済み。録音・受け取る・試聴は段4・段5で足す。
export function VoicesScreen() {
  const { translator } = useI18n();
  return (
    <main class="dc-screen" data-screen="S7">
      <BackButton screen="S7" />
      <h1 class="dc-heading">{translator.t('voicesTitle')}</h1>
      <div class="dc-radiogroup" role="radiogroup" aria-label={translator.t('voicesTitle')} data-group="voice">
        <button type="button" class="dc-radio-row" role="radio" aria-checked="true">
          <Icon name="check" />
          <span>{translator.t('standardVoiceEnglish')}</span>
        </button>
      </div>
    </main>
  );
}
