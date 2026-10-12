import { Icon } from '../components/Icon.tsx';
import { UpdateBanner } from '../components/UpdateBanner.tsx';
import { DanceName } from '../i18n/DanceName.tsx';
import { phrased } from '../i18n/phrased.tsx';
import { buildHash } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import { resumePractice } from '../state/resume.ts';
import { useSettings } from '../state/settings.ts';

// S0 表紙（D56・Ruling 115-1・117）。起動のたびに出る（側は覚えない）。上から: アプリ名と言語 → 扉「使う」（主・紺）＋その下にくっついた
// 「前回の練習 ▶ 続きから」（C 案。初めて鳴った後だけ＝G2 の 1 タップ）→ 扉「作る」（副・枠線）→ 行「設定」→ 更新の帯（ルート画面と同じ帯）。
// 主要操作は 扉 2・続きから 1・設定 1 ＝ 4（初回 3）。言語は [data-utility]。
export function CoverScreen() {
  const { translator, setLocale } = useI18n();
  const { settings } = useSettings();
  const locale = translator.locale;
  const lastDanceId = settings.hints.firstPlaybackDone ? settings.lastDanceId : null;
  return (
    <main class="dc-screen dc-cover" data-screen="S0">
      <header class="dc-appbar">
        <div class="dc-brand">
          <h1 class="dc-appname">{translator.t('appName')}</h1>
          <div class="dc-appsub">{translator.t('appSubtitle')}</div>
        </div>
        <button type="button" class="dc-utility" data-utility lang={locale === 'ja-JP' ? 'en' : 'ja'}
          onClick={() => setLocale(locale === 'ja-JP' ? 'en' : 'ja-JP')}>
          <Icon name="globe" />
          <span>{translator.t('switchLanguage')}</span>
        </button>
      </header>
      <div class="dc-doorset">
        <a class="dc-door dc-door--main" data-door="use" href={buildHash({ screen: 'S1', params: {} })}>
          <span class="dc-door-icon"><Icon name="play" /></span>
          <span class="dc-door-text"><b>{translator.t('coverUse')}</b><small data-description>{phrased(translator, 'coverUseSub')}</small></span>
          <Icon name="chev-r" />
        </a>
        {lastDanceId && (
          <button type="button" class="dc-door-resume" data-resume onClick={() => resumePractice(lastDanceId)}>
            <span class="dc-resume-text">
              <small>{translator.t('continueLast')}</small>
              <b><DanceName danceId={lastDanceId} locale={locale} /></b>
            </span>
            <span class="dc-resume-go"><Icon name="play" /><span>{translator.t('resume')}</span></span>
          </button>
        )}
      </div>
      <a class="dc-door" data-door="make" href={buildHash({ screen: 'M0', params: {} })}>
        <span class="dc-door-icon"><Icon name="mic" /></span>
        <span class="dc-door-text"><b>{translator.t('coverMake')}</b><small data-description>{phrased(translator, 'coverMakeSub')}</small></span>
        <Icon name="chev-r" />
      </a>
      <a class="dc-link-row dc-cover-settings" href={buildHash({ screen: 'S6', params: {} })}>
        <Icon name="gear" />
        <span class="dc-link-label dc-link-stack"><span>{translator.t('settingsTitle')}</span><small>{translator.t('coverSettingsSub')}</small></span>
        <Icon name="chev-r" />
      </a>
      <UpdateBanner />
    </main>
  );
}
