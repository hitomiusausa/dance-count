import { stripInvisible } from '../share/clean-text.ts';

// D74 教室の名前（任意）。紙の上に 1〜2 行で入る長さ（30 字・書記素）。見えない文字・改行は落とす。端末には残さない。
export const SCHOOL_NAME_MAX = 30;

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('ja', { granularity: 'grapheme' }) : null;
const graphemes = (text: string): string[] => (segmenter ? [...segmenter.segment(text)].map(part => part.segment) : [...text]);

// keepEdges: 打っている途中（前後の空白を残す。打ち終わって紙に出す時は落とす）
export function cleanSchoolName(value: string, { keepEdges = false }: { keepEdges?: boolean } = {}): string {
  const cleaned = stripInvisible(value.replace(/[\r\n]+/g, ' '));
  const limited = graphemes(cleaned).slice(0, SCHOOL_NAME_MAX).join('');
  return keepEdges ? limited : limited.trim();
}
