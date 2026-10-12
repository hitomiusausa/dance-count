import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { BackButton } from '../components/BackButton.tsx';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/icon-names.ts';
import type { AppTranslator } from '../i18n/index.ts';
import { phrased } from '../i18n/phrased.tsx';
import { buildHash, type ScreenId } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import { useRoutines } from '../state/routines.ts';
import { useStorage } from '../state/storage.ts';
import { listVoicePacks, packProgress, type VoicePackRecord } from '../voices/store.ts';

// M0「作る」（D56・Ruling 115-3）。指導者の 3 つの仕事を 1 枚の入口に並べる（束にしない＝主要操作 3）。下タブ無し・左上「‹ 表紙」。
// 行の下の 1 行は「今どこまでできているか」: 自分の声の録音（言葉ごとの語数）・ルーティンの本数・配るの説明。中身（S8・M1・S9）は変えない。
export function MakeScreen() {
  const { translator } = useI18n();
  const { routines } = useRoutines();
  const storage = useStorage();
  const [packs, setPacks] = useState<VoicePackRecord[] | null>(null);
  useEffect(() => {
    let alive = true;
    void listVoicePacks(storage).then(list => { if (alive) setPacks(list); });
    return () => { alive = false; };
  }, [storage]);

  const rows: Array<{ screen: ScreenId; icon: IconName; title: string; status: ComponentChildren | null }> = [
    { screen: 'S8', icon: 'mic', title: translator.t('recordVoice'), status: packs === null ? null : recordingStatus(translator, packs) },
    { screen: 'M1', icon: 'edit', title: translator.t('makeRoutines'),
      status: routines.length === 0 ? translator.t('routinesNone') : routines.length === 1 ? translator.t('routinesCountOne') : translator.t('routinesCount', { count: routines.length }) },
    { screen: 'S9', icon: 'share', title: translator.t('makeShare'), status: phrased(translator, 'makeShareSub') }
  ];
  return (
    <main class="dc-screen dc-make" data-screen="M0" data-loading={packs === null ? '' : undefined}>
      <BackButton screen="M0" />
      <h1 class="dc-heading">{translator.t('coverMake')}</h1>
      <p class="dc-body dc-make-intro">{phrased(translator, 'makeIntro')}</p>
      <div class="dc-hublist">
        {rows.map(row => (
          <a key={row.screen} class="dc-hub" href={buildHash({ screen: row.screen, params: {} })}>
            <span class="dc-door-icon"><Icon name={row.icon} /></span>
            <span class="dc-hub-text"><b>{row.title}</b>{row.status !== null && <small data-description>{row.status}</small>}</span>
            <Icon name="chev-r" />
          </a>
        ))}
      </div>
    </main>
  );
}

// 録音の状態の 1 行（純粋。自分で録った声だけ。受け取った声は数えない）。2 つの言葉があれば「英語 · 12 / 12 語 · 日本語 · 7 / 12 語」と並べる
function recordingStatus(translator: AppTranslator, packs: readonly VoicePackRecord[]): string {
  const recorded = packs.filter(pack => pack.origin === 'recorded');
  if (recorded.length === 0) return translator.t('voiceStatusNone');
  const parts = recorded.map(pack => {
    const { recorded: count, total } = packProgress(pack);
    return translator.t('voiceStatusPack', { language: translator.t(pack.locale === 'ja-JP' ? 'languageJapanese' : 'languageEnglish'), count, total });
  });
  if (recorded.length === 1) parts.push(translator.t(packProgress(recorded[0]!).complete ? 'voiceStatusDone' : 'resume'));
  return parts.join(' · ');
}
