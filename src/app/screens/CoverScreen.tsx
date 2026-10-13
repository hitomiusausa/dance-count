import { BrandMark } from '../brand/BrandMark.tsx';
import { Icon } from '../components/Icon.tsx';
import { UpdateBanner } from '../components/UpdateBanner.tsx';
import { LastPracticeName } from '../i18n/LastPracticeName.tsx';
import { phrased } from '../i18n/phrased.tsx';
import { buildHash } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import { lastPractice, resumePractice } from '../state/resume.ts';
import { useRoutines } from '../state/routines.ts';
import { useSettings } from '../state/settings.ts';

// S0 表紙（D56・Ruling 115-1・117）。D62: アプリ名の左にうさぎの絵（アプリのアイコンと同じ）。起動のたびに出る（側は覚えない）。上から: アプリ名と言語 → 扉「使う」（主・紺）＋その下にくっついた
// 「前回の練習 ▶ 続きから」（C 案。初めて鳴った後だけ＝G2 の 1 タップ）→ 扉「作る」（副・枠線）→ 行「設定」→ 更新の帯（ルート画面と同じ帯）。
// D58: 扉の見出しは「使う（生徒の方）」「作る（指導者の方）」。括弧は見出しと同じ行に小さく（.dc-door-for）。
// 主要操作は 扉 2・続きから 1・設定 1 ＝ 4（初回 3）。言語は [data-utility]。
export function CoverScreen() {
  const { translator, setLocale } = useI18n();
  const { settings } = useSettings();
  const { routines } = useRoutines();
  const locale = translator.locale;
  const last = settings.hints.firstPlaybackDone ? lastPractice(settings, routines) : null;
  return (
    <main class="dc-screen dc-cover" data-screen="S0">
      <header class="dc-appbar">
        <div class="dc-lockup">
          <BrandMark />
          <div class="dc-brand">
            <h1 class="dc-appname">{translator.t('appName')}</h1>
            <div class="dc-appsub">{translator.t('appSubtitle')}</div>
          </div>
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
          <span class="dc-door-text"><b>{translator.t('coverUse')}<span class="dc-door-for">{translator.t('coverUseFor')}</span></b><small data-description>{phrased(translator, 'coverUseSub')}</small></span>
          <Icon name="chev-r" />
        </a>
        {last && (
          <button type="button" class="dc-door-resume" data-resume onClick={() => resumePractice(last)}>
            <span class="dc-resume-text">
              <small>{translator.t('continueLast')}</small>
              <b data-ellipsis><LastPracticeName last={last} locale={locale} translator={translator} /></b>
            </span>
            <span class="dc-resume-go"><Icon name="play" /><span>{translator.t('resume')}</span></span>
          </button>
        )}
      </div>
      <a class="dc-door" data-door="make" href={buildHash({ screen: 'M0', params: {} })}>
        <span class="dc-door-icon"><Icon name="mic" /></span>
        <span class="dc-door-text"><b>{translator.t('coverMake')}<span class="dc-door-for">{translator.t('coverMakeFor')}</span></b><small data-description>{phrased(translator, 'coverMakeSub')}</small></span>
        <Icon name="chev-r" />
      </a>
      <a class="dc-link-row dc-cover-settings" href={buildHash({ screen: 'S6', params: {} })}>
        <Icon name="gear" />
        <span class="dc-link-label dc-link-stack"><span>{translator.t('settingsTitle')}</span><small>{phrased(translator, 'coverSettingsSub')}</small></span>
        <Icon name="chev-r" />
      </a>
      <UpdateBanner />
    </main>
  );
}
