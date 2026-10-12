import { figureDisplayName } from '../routines/figure-names.ts';
import type { LastPractice } from '../state/resume.ts';
import { DanceName } from './DanceName.tsx';
import type { AppLocale } from './index.ts';

// 前回の練習の名前（D57・Ruling 121-2）: 「ワルツ · ウィスク」（種目名 ＋ ` · ` ＋ 表示言語のフィガー名）。基本のカウントなら種目名だけ。
// フィガー名の前で折れてよい（375 で 1 行に入らない長い名前がある）。フィガー名の途中では折らない（.dc-figure-name。「ウィス／ク」を作らない）
export function LastPracticeName({ last, locale }: { last: LastPractice; locale: AppLocale }) {
  return (
    <>
      <DanceName danceId={last.danceId} locale={locale} />
      {last.figure && <> · <wbr /><span class="dc-figure-name">{figureDisplayName(last.danceId, last.figure.englishName, locale)}</span></>}
    </>
  );
}
