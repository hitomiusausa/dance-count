import { APP_VERSION } from '../app-version.ts';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/icon-names.ts';
import { UpdateBanner } from '../components/UpdateBanner.tsx';
import type { AppLocale, MessageKey } from '../i18n/index.ts';
import { phrased } from '../i18n/phrased.tsx';
import { buildHash, type ScreenId } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import { DEFAULT_VOICE, voiceDisplayName } from '../voices/selection.ts';
import { usePlaybackVoice } from '../voices/use-playback-voice.ts';

const LANGUAGES: Array<{ locale: AppLocale; label: string; lang: string }> = [
  { locale: 'ja-JP', label: '日本語', lang: 'ja' },
  { locale: 'en', label: 'English', lang: 'en' }
];

// 見出しの下に並ぶ同じ種類の行（› で画面へ行く行）の束（Ruling 98-2）。束は S1 の種目タイルと同じく 1 つの判断（[data-group]）。
// 見出しは必ず目に見える（aria-labelledby。見出しの無い束は禁止＝ui:check の R98）。行の名前は 320 幅で 2 行になるので句の境で折る（「プライバシー・／アプリについて」）。
const GROUPS: Array<{ group: string; heading: MessageKey; rows: Array<{ screen: ScreenId; icon: IconName; label: MessageKey }> }> = [
  { group: 'help', heading: 'settingsHelpHeading', rows: [
    { screen: 'S12', icon: 'plus-square', label: 'settingsInstall' },
    { screen: 'S11', icon: 'alert', label: 'soundHelpTitle' }
  ] },
  { group: 'teacher', heading: 'forTeachers', rows: [
    { screen: 'S8', icon: 'mic', label: 'recordVoice' },
    { screen: 'S9', icon: 'share', label: 'shareRoutines' }
  ] }
];

// S6 設定（仕様 §4 S6・Ruling 60-8・98）。上から: 言語（切替は即保存。Ruling 26）・声（→ S7。今の声の名前を右に）・
// 「困った時は」（S12・S11）・「先生の方へ」（S8・S9）・「プライバシー・アプリについて」（→ S13。版を右に）＝主要操作 5（上限ちょうど。v1 ではもう足さない）
export function SettingsScreen() {
  const { translator, setLocale } = useI18n();
  const { voice } = usePlaybackVoice();
  return (
    <main class="dc-screen" data-screen="S6">
      <h1 class="dc-heading">{translator.t('settingsTitle')}</h1>
      <UpdateBanner />
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
      {GROUPS.map(({ group, heading, rows }) => (
        <div key={group} class="dc-settings-group" role="group" aria-labelledby={`dc-s6-${group}`} data-group={group}>
          <h2 class="dc-field-label dc-settings-section" id={`dc-s6-${group}`}>{translator.t(heading)}</h2>
          {rows.map(row => (
            <a key={row.screen} class="dc-link-row" href={buildHash({ screen: row.screen, params: {} })}>
              <Icon name={row.icon} />
              <span class="dc-link-label">{phrased(translator, row.label)}</span>
              <Icon name="chev-r" />
            </a>
          ))}
        </div>
      ))}
      <a class="dc-link-row dc-settings-section" href={buildHash({ screen: 'S13', params: {} })}>
        <Icon name="info" />
        <span class="dc-link-label">{phrased(translator, 'settingsAbout')}</span>
        <small class="dc-link-value">{translator.t('versionLabel', { version: APP_VERSION })}</small>
        <Icon name="chev-r" />
      </a>
    </main>
  );
}
