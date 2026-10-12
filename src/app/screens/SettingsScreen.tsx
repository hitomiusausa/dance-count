import { Icon } from '../components/Icon.tsx';
import type { AppLocale } from '../i18n/index.ts';
import { buildHash } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import { DEFAULT_VOICE, voiceDisplayName } from '../voices/selection.ts';
import { usePlaybackVoice } from '../voices/use-playback-voice.ts';

const LANGUAGES: Array<{ locale: AppLocale; label: string; lang: string }> = [
  { locale: 'ja-JP', label: '日本語', lang: 'ja' },
  { locale: 'en', label: 'English', lang: 'en' }
];

// S6 設定（仕様 §4 S6・Ruling 60-8）。言語（切替は即保存。Ruling 26）・声（→ S7。今の声の名前を右に）・
// 見出し「先生の方へ」の下に「自分の声を録音する」（→ S8）「ルーティンを配る」（→ S9・印なし。Ruling 86-5）。ほかの項目は段7・8で足す。
export function SettingsScreen() {
  const { translator, setLocale } = useI18n();
  const { voice } = usePlaybackVoice();
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
      <a class="dc-link-row" href={buildHash({ screen: 'S7', params: {} })}>
        <Icon name="voice" />
        <span class="dc-link-label">{translator.t('voicesTitle')}</span>
        <small class="dc-link-value">{voiceDisplayName(translator, voice ?? DEFAULT_VOICE, 'chip')}</small>
        <Icon name="chev-r" />
      </a>
      <h2 class="dc-field-label dc-settings-section">{translator.t('forTeachers')}</h2>
      <a class="dc-link-row" href={buildHash({ screen: 'S8', params: {} })}>
        <Icon name="mic" />
        <span class="dc-link-label">{translator.t('recordVoice')}</span>
        <Icon name="chev-r" />
      </a>
      <a class="dc-link-row" href={buildHash({ screen: 'S9', params: {} })}>
        <Icon name="share" />
        <span class="dc-link-label">{translator.t('shareRoutines')}</span>
        <Icon name="chev-r" />
      </a>
    </main>
  );
}
