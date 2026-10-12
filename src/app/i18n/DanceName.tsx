import { Fragment } from 'preact';
import { danceNameWords } from './dance-name-words.ts';
import type { AppLocale } from './index.ts';

// 段8 Task 12（final-review I1）: 種目名を語の境（<wbr>・英語は空白）でだけ折る。textContent は danceName() と同じ。
// .dc-dance-name は word-break: keep-all・overflow-wrap: normal（1 語が入らない時も語の途中では折らず、そのまま 1 語で置く）。
export function DanceName({ danceId, locale }: { danceId: string; locale: AppLocale }) {
  return (
    <span class="dc-dance-name">
      {danceNameWords(danceId, locale).map((word, index) => (
        <Fragment key={index}>{index > 0 && <wbr />}{word}</Fragment>
      ))}
    </span>
  );
}
