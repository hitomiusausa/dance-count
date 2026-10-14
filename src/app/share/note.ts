import { stripInvisible } from './clean-text.ts';

// 配る時の「生徒へのひとこと」（D68・ひとみうさ指示 2026-10-14）。任意・80 字まで（字は書記素＝見た目の 1 字。絵文字・濁点つきの字も 1 字）。
// 見えない文字（clean-text.ts）を除き、改行・タブを含む空白の並びは 1 つの空白にし、前後を落とす。長ければ 80 字で切る（受け取る側は切って読む＝壊れたファイルにしない）。
// 画面にはテキストとしてだけ出す（HTML として解釈しない。Preact は文字として描く）。
export const NOTE_MAX = 80;

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

function graphemes(text: string): string[] {
  return segmenter ? [...segmenter.segment(text)].map(part => part.segment) : [...text];
}

export function noteLength(text: string): number {
  return graphemes(text).length;
}

// 打っている途中の欄の値（前後の空白は残す・改行は空白に）。80 字を超えた分は入れない
export function limitNoteInput(text: string): string {
  return graphemes(text.replace(/[\r\n\t]+/g, ' ')).slice(0, NOTE_MAX).join('');
}

// ファイルに書く値・読んだ値。空なら null
export function cleanNote(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // 書記素は 1 字が長くても数十のコード単位。巨大な値を丸ごと分けないよう、先に十分な長さで切る
  const text = stripInvisible(value.slice(0, NOTE_MAX * 32).replace(/[\r\n\t\f\v]+/g, ' ')).replace(/\s+/g, ' ').trim();
  const clipped = graphemes(text).slice(0, NOTE_MAX).join('').trim();
  return clipped === '' ? null : clipped;
}
