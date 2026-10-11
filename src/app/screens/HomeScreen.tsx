import { DANCE_PROFILES } from '../../engine/dance-profiles.js';
import { Icon } from '../components/Icon.tsx';
import { danceName } from '../i18n/index.ts';
import { formatCounts } from '../lib/count-display.ts';
import { unlockAudioInsideTap } from '../platform/audio-context.ts';
import { buildHash } from '../router/routes.ts';
import { requestAutoplay } from '../state/autoplay.ts';
import { useI18n } from '../state/i18n.ts';
import { navigate } from '../state/route.ts';
import { useSettings } from '../state/settings.ts';

const DANCE_IDS = Object.keys(DANCE_PROFILES);

// S1（仕様 §4・Ruling 16）。上から: アプリ名と言語 → 前回カード → 先生の声カード → 見出し → 種目タイル10個。
export function HomeScreen() {
  const { translator, setLocale } = useI18n();
  const { settings } = useSettings();
  const locale = translator.locale;
  const lastDanceId = settings.lastDanceId;

  // 前回カード: このタップの中で音を解除し、一回限りの印を付けてから S2 へ（Ruling 32）。
  const resume = () => {
    if (!lastDanceId) return;
    try { unlockAudioInsideTap(); } catch { /* 音が使えない端末は S2 の2秒判定で案内する */ }
    requestAutoplay({ kind: 'dance', id: lastDanceId });
    navigate({ screen: 'S2', params: { danceId: lastDanceId } });
  };

  return (
    <main class="dc-screen dc-home" data-screen="S1">
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
      {lastDanceId && (
        <button type="button" class="dc-resume" data-resume onClick={resume}>
          <span class="dc-resume-text">
            <small>{translator.t('lastTime')}</small>
            <b>{danceName(lastDanceId, locale)}</b>
          </span>
          <span class="dc-resume-go"><Icon name="play" /><span>{translator.t('resume')}</span></span>
        </button>
      )}
      <a class="dc-teacher" data-teacher-card href={buildHash({ screen: 'S7', params: {} })}>
        <span class="dc-teacher-icon"><Icon name="mic" /></span>
        <b>{translator.t('teacherVoice')}</b>
        <Icon name="chev-r" />
      </a>
      <h2 class="dc-heading">{translator.t('chooseDance')}</h2>
      <div class="dc-tiles" role="group" aria-label={translator.t('danceGroup')} data-group="dance">
        {DANCE_IDS.map(danceId => (
          <a key={danceId} class="dc-tile" href={buildHash({ screen: 'S2', params: { danceId } })}>
            <b>{danceName(danceId, locale)}</b>
            <small>{formatCounts(danceId, (DANCE_PROFILES as Record<string, { templates: readonly string[] }>)[danceId]!.templates[0]!)}</small>
          </a>
        ))}
      </div>
    </main>
  );
}
