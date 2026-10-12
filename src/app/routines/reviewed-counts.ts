import { figureIdentity } from './figure-names.ts';

// 監修済みのカウント表（D52・Ruling 109・110）。ひとみうさが監修シート（docs/app-v1/figure-counts-review.md）で
// 「判定」に OK か訂正を書いた行だけをここへ写す。判定が空の行（未監修の案）は 1 件も書かない（Ruling 3 はそのまま有効）。
// - counts: 入れる値（正規化後）。alternatives: 「こう数える人もいる」形（v1 では画面に出さない。記録だけ）。
// - basis: シートの「根拠」の写し（出荷ビルドに入る。旧データの目印の語を含めない）。
// - シートと 1 対 1 であることは test/app/routines/reviewed-counts.test.ts が機械で照合する（転記の誤り・漏れも落ちる）。
// 表が空でも仕組みは出荷してよい（Ruling 110-3。その間は「前に使ったカウント」だけが入る）。
export interface ReviewedCount {
  danceId: string;
  englishName: string;
  counts: string;
  alternatives?: readonly string[];
  basis: string;
  reviewedBy: 'ひとみうさ';
  reviewedAt: string;   // YYYY-MM-DD（シートが戻った日）
}

export const REVIEWED_COUNTS: readonly ReviewedCount[] = Object.freeze([]);

// figureIdentity（D22）で引く。照合済みでない名前（'text:'）は表に無いので null＝自由入力は履歴だけ（Ruling 106-5）。
export function reviewedCounts(danceId: string, name: string): ReviewedCount | null {
  const identity = figureIdentity(danceId, name);
  if (!identity.startsWith('figure:')) return null;
  return REVIEWED_COUNTS.find(entry => entry.danceId === danceId && figureIdentity(danceId, entry.englishName) === identity) ?? null;
}
