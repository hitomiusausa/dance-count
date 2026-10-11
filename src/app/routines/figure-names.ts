import { FIGURE_TERMINOLOGY } from '../../engine/figure-terminology.js';

// フィガー名の候補（仕様 §4 S4・Ruling 3・39）。ISTD の資料と照合済み（verified）の語だけ。カウントは付けない。
// 未監修のカタログ（figure-catalog.js・旧ルーティン）からは何も出さない。
export const FIGURE_SUGGESTIONS_MAX = 5;

interface Entry { danceId: string; englishName: string; sourceAliases: readonly string[]; claimStatus: string }
interface Figure { danceId: string; display: { ja: string; en: string }; keys: string[] }

const fold = (text: string) => text.normalize('NFKC').toLowerCase();

// 別名ごとに並んでいる登録簿を、1フィガー1件にまとめる（登録簿の順のまま）。
const FIGURES: Figure[] = (() => {
  const seen = new Set<string>();
  const figures: Figure[] = [];
  for (const entry of Object.values(FIGURE_TERMINOLOGY as Record<string, Entry>)) {
    if (entry.claimStatus !== 'verified') continue;
    const id = `${entry.danceId}\u0000${entry.englishName}`;
    if (seen.has(id)) continue;
    seen.add(id);
    figures.push({
      danceId: entry.danceId,
      display: { ja: entry.sourceAliases[0]!, en: entry.englishName },
      keys: [...entry.sourceAliases, entry.englishName].map(fold)
    });
  }
  return figures;
})();

// ヴィエニーズワルツは 0 件なので、候補の枠ごと出さない（Ruling 39）。
export function hasFigureNameSuggestions(danceId: string): boolean {
  return FIGURES.some(figure => figure.danceId === danceId);
}

// 1文字以上打ってから。部分一致（NFKC・大小無視）。打った名前がすでに照合済みの名前（別名・英語名）と
// ぴったり同じなら、もう選び終えているので何も出さない（「ウィスク」に「バックウィスク」を出し続けない）。
export function figureNameSuggestions(danceId: string, query: string, locale: 'en' | 'ja-JP', limit = FIGURE_SUGGESTIONS_MAX): string[] {
  const needle = fold(query.trim());
  if (!needle) return [];
  if (FIGURES.some(figure => figure.danceId === danceId && figure.keys.includes(needle))) return [];
  const shown = locale === 'ja-JP' ? 'ja' : 'en';
  return FIGURES
    .filter(figure => figure.danceId === danceId && figure.keys.some(key => key.includes(needle)))
    .map(figure => figure.display[shown])
    .slice(0, limit);
}
