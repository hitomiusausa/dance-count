import { DANCE_PROFILES } from '../../engine/dance-profiles.js';
import { BackButton } from '../components/BackButton.tsx';
import { Icon } from '../components/Icon.tsx';
import { UpdateBanner } from '../components/UpdateBanner.tsx';
import { DanceName } from '../i18n/DanceName.tsx';
import { LastPracticeName } from '../i18n/LastPracticeName.tsx';
import { formatCounts } from '../lib/count-display.ts';
import { showsInstallCard } from '../lib/install-card.ts';
import { isStandalone, platformKind } from '../platform/pwa.ts';
import { buildHash } from '../router/routes.ts';
import { reviewedFigures } from '../routines/reviewed-counts.ts';
import { useI18n } from '../state/i18n.ts';
import { lastPractice, resumePractice } from '../state/resume.ts';
import { useSettings } from '../state/settings.ts';

const DANCE_IDS = Object.keys(DANCE_PROFILES);

// S1＝U1「使う › フィガー」（仕様 §4・Ruling 16・D56 Ruling 115-2）。上から: 「‹ 表紙」と言語 → 前回カード → 見出し → 種目タイル10個 → 更新の帯 →
// ホーム画面に追加の案内カード（段7。最下段＝375×548 の初期表示を崩さない。Ruling 90-3・92-7）。「先生の声で練習」カードは外した（声は S2／S5 の声チップから。D56-(3)）。
export function HomeScreen() {
  const { translator, setLocale } = useI18n();
  const { settings, update } = useSettings();
  const locale = translator.locale;
  // 初めて鳴った後の 1 回だけのカード（段7・Ruling 92-7・D42）。× で閉じたら二度と出さない
  const installCard = showsInstallCard({ hints: settings.hints, kind: platformKind(), standalone: isStandalone() });
  const last = lastPractice(settings);

  return (
    <main class="dc-screen dc-home" data-screen="S1">
      <header class="dc-appbar">
        <BackButton screen="S1" />
        <button type="button" class="dc-utility" data-utility lang={locale === 'ja-JP' ? 'en' : 'ja'}
          onClick={() => setLocale(locale === 'ja-JP' ? 'en' : 'ja-JP')}>
          <Icon name="globe" />
          <span>{translator.t('switchLanguage')}</span>
        </button>
      </header>
      {last && (
        <button type="button" class="dc-resume" data-resume onClick={() => resumePractice(last)}>
          <span class="dc-resume-text">
            <small>{translator.t('lastTime')}</small>
            <b data-ellipsis><LastPracticeName last={last} locale={locale} /></b>
          </span>
          <span class="dc-resume-go"><Icon name="play" /><span>{translator.t('resume')}</span></span>
        </button>
      )}
      <h1 class="dc-heading">{translator.t('chooseDance')}</h1>
      <div class="dc-tiles" role="group" aria-label={translator.t('danceGroup')} data-group="dance">
        {DANCE_IDS.map(danceId => (
          // D57（Ruling 119-2）: 監修済みのフィガーが 1 件以上の種目は F1（一覧）、0 件は今までどおり S2
          <a key={danceId} class="dc-tile" href={buildHash({ screen: reviewedFigures(danceId).length > 0 ? 'F1' : 'S2', params: { danceId } })}>
            <b><DanceName danceId={danceId} locale={locale} /></b>
            <small>{formatCounts(danceId, (DANCE_PROFILES as Record<string, { templates: readonly string[] }>)[danceId]!.templates[0]!)}</small>
          </a>
        ))}
      </div>
      <UpdateBanner />
      {installCard && (
        <div class="dc-install-card" data-install-card>
          <a class="dc-link-row" href={buildHash({ screen: 'S12', params: {} })}>
            <Icon name="plus-square" />
            <span class="dc-link-label">{translator.t('installCard')}</span>
            <Icon name="chev-r" />
          </a>
          <button type="button" class="dc-button dc-button--secondary dc-install-close"
            onClick={() => update({ hints: { ...settings.hints, homeScreenCardDismissed: true } })}>
            <Icon name="close" /><span>{translator.t('close')}</span>
          </button>
        </div>
      )}
    </main>
  );
}
