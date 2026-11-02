import { figureDisplayName } from '../routines/figure-names.ts';
import { honorific } from '../lib/honorific.ts';
import type { LastPractice } from '../state/resume.ts';
import { DanceName } from './DanceName.tsx';
import type { AppLocale, AppTranslator } from './index.ts';

// 前回の練習の名前（D57・Ruling 121-2）: 「ワルツ · ウィスク」（種目名 ＋ ` · ` ＋ 表示言語のフィガー名）。基本のカウントなら種目名だけ。
// フィガー名の前で折れてよい（375 で 1 行に入らない長い名前がある）。フィガー名の途中では折らない（.dc-figure-name。「ウィス／ク」を作らない）
// 夜間便 B-1（Ruling 124）: ルーティンなら「ルーティン · {名前}」・受け取った物は「{配った人}さんのルーティン · {名前}」（D49 の敬称）。
// 名前は「 · 」の後で折る（名前の途中では折らない＝.dc-figure-name。「ワルツ／の練習」を作らない）。40 字の名前は枠に収まる所で折れ、2 行を超えたら「…」（既存の data-ellipsis）
export function LastPracticeName({ last, locale, translator }: { last: LastPractice; locale: AppLocale; translator: AppTranslator }) {
  if (last.kind === 'routine') {
    const { routine } = last;
    const lead = routine.receivedFrom
      ? translator.t('lastRoutineFrom', { from: honorific(routine.receivedFrom.distributor, locale) })
      : translator.t('lastRoutine');
    return <>{lead} · <wbr /><span class="dc-figure-name">{routine.name}</span></>;
  }
  return (
    <>
      <DanceName danceId={last.danceId} locale={locale} />
      {last.figure && <> · <wbr /><span class="dc-figure-name">{figureDisplayName(last.danceId, last.figure.englishName, locale)}</span></>}
    </>
  );
}
