import { Fragment } from 'preact';
import { getDanceProfile } from '../../engine/dance-profiles.js';
import { BackButton } from '../components/BackButton.tsx';
import { Icon } from '../components/Icon.tsx';
import { danceName } from '../i18n/index.ts';
import { formatCounts } from '../lib/count-display.ts';
import { unlockAudioInsideTap } from '../platform/audio-context.ts';
import { practiceChoice, type DanceProfileLike } from '../practice/preferences.ts';
import { figureDisplayName } from '../routines/figure-names.ts';
import { reviewedFigures } from '../routines/reviewed-counts.ts';
import { requestAutoplay } from '../state/autoplay.ts';
import { useI18n } from '../state/i18n.ts';
import { navigate } from '../state/route.ts';
import { useSettings } from '../state/settings.ts';

// F1「種目のフィガー」（D57・Ruling 119）。集中画面（下タブ無し・左上「‹ 戻る」）。上から: 見出し＝種目名 → 「基本のカウント」の行（主・紺。
// 今の型＝practiceChoice）→ 見出し「フィガー」→ 監修済みのフィガーの一覧（登録簿の順。名前の下に型の文字）。行を押すとすぐ鳴って S2（U2 の行と同じ型）。
// 主要操作は 基本の行 1・一覧 [data-list] 1 ＝ 2。一覧の下に文は置かない（未監修は無い物＝Ruling 3）。空の F1 は resolve.ts が出さない
export function FigureListScreen({ danceId }: { danceId: string }) {
  const { translator } = useI18n();
  const { settings } = useSettings();
  const locale = translator.locale;
  const basic = practiceChoice(getDanceProfile(danceId) as DanceProfileLike, settings).counts;
  const play = (figureSlug: string | null) => {
    try { unlockAudioInsideTap(); } catch { /* 音が使えない端末は S2 の2秒判定で案内する */ }
    requestAutoplay({ kind: 'dance', id: danceId });
    navigate({ screen: 'S2', params: figureSlug ? { danceId, figureSlug } : { danceId } });
  };
  const tag = <span class="dc-play-tag"><Icon name="play" /><span>{translator.t('play')}</span></span>;
  return (
    <main class="dc-screen dc-screen--focus dc-figures" data-screen="F1">
      <BackButton screen="F1" />
      <h1 class="dc-heading">{danceName(danceId, locale)}</h1>
      <button type="button" class="dc-row-head dc-row--play dc-basic-row" data-basic onClick={() => play(null)}>
        <span class="dc-row-text"><b>{translator.t('basicCount')}</b><small>{formatCounts(danceId, basic)}</small></span>
        {tag}
      </button>
      <h2 class="dc-field-label dc-figures-heading" id="dc-f1-figures">{translator.t('tabFigures')}</h2>
      <div class="dc-list" role="list" aria-labelledby="dc-f1-figures" data-list>
        {reviewedFigures(danceId).map(figure => (
          <div key={figure.slug} role="listitem" class="dc-row" data-row>
            <button type="button" class="dc-row-head dc-row--play" data-figure={figure.slug} onClick={() => play(figure.slug)}>
              <span class="dc-row-text"><b><FigureName name={figureDisplayName(danceId, figure.englishName, locale)} /></b><small>{formatCounts(danceId, figure.counts)}</small></span>
              {tag}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

// フィガー名は「・」「＆」・空白の後でだけ折る（.dc-figure-name＝keep-all）。iOS の WebKit は keep-all の下で「・」の後でも折らず、
// 安全弁（overflow-wrap: anywhere）で「シャッセ・ト／ゥ」と切るので、折ってよい所に <wbr> を明示する（使いやすさの通し確認 Task 7）。textContent は同じ
function FigureName({ name }: { name: string }) {
  return (
    <span class="dc-figure-name">
      {name.split(/(?<=[・＆ ])/).map((part, index) => <Fragment key={index}>{index > 0 && <wbr />}{part}</Fragment>)}
    </span>
  );
}
