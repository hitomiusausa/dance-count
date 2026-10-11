import { FIGURE_TERMINOLOGY } from '../../engine/figure-terminology.js';

// フィガー名の候補（仕様 §4 S4・Ruling 3・39・54）。ISTD の資料と照合済み（verified）の語だけ。カウントは付けない。
// 未監修のカタログ（figure-catalog.js・旧ルーティン）からは何も出さない。
export const FIGURE_SUGGESTIONS_MAX = 5;
// 名前が空の追加の行に出す一覧の上限（Ruling 54-1。今の最大はタンゴ 19）。切らない: 超えたらテストと ui:check が落ちる
// （21 件目を足す時は分け方の裁定が要る）。ui:check の LIMITS.catalogChoices と同じ値。
export const FIGURE_CHOICES_MAX = 20;

const KANA_OFFSET = 0x60;   // ひらがな → 同じ音のカタカナ（う U+3046 → ウ U+30A6）

interface Entry { danceId: string; englishName: string; sourceAliases: readonly string[]; claimStatus: string }
interface Figure { danceId: string; display: { ja: string; en: string }; keys: string[]; spellings: string[] }

// ひらがなをカタカナに（D21・Ruling 54-8）。ほかの字（長音「ー」・「・」・「＆」・英数・漢字）は触らない。
export function hiraganaToKatakana(text: string): string {
  return text.replace(/[ぁ-ゖ]/g, char => String.fromCodePoint(char.codePointAt(0)! + KANA_OFFSET));   // ぁ〜ゖ（ゔ を含む）→ ァ〜ヶ
}

// 綴りの比べ方（Ruling 54-9）: NFKC → 前後の空白を除く → 小文字化。かなは畳まない。
// 「打った名前がもう照合済みの綴りか（候補を消してよいか）」の問いだけに使う。「うぃすく」を選び終えた扱いにすると、
// カタカナの「ウィスク」に直す道（候補のタップ）が消えるため。
export function spellingKey(text: string): string {
  return text.normalize('NFKC').trim().toLowerCase();
}

// 「同じ名前」の判定（Ruling 50-1・54-8）: NFKC → 前後の空白を除く → 小文字化 → ひらがなをカタカナに。名前の中の空白は除かない。
// 同じ名前の判定（editor.ts）・候補の部分一致・仲間分けはすべてこの 1 つの関数（判定を 2 か所に書かない）。
// spellingKey との違いはかなを畳むかどうかだけ（こちらは「同じフィガーか」、あちらは「綴りが照合済みか」）。
export function foldFigureName(text: string): string {
  return hiraganaToKatakana(spellingKey(text));
}
const fold = foldFigureName;

// 別名ごとに並んでいる登録簿を、1フィガー1件にまとめる（登録簿の順のまま）。
const FIGURES: Figure[] = (() => {
  const seen = new Set<string>();
  const figures: Figure[] = [];
  for (const entry of Object.values(FIGURE_TERMINOLOGY as Record<string, Entry>)) {
    if (entry.claimStatus !== 'verified') continue;
    const id = `${entry.danceId}\u0000${entry.englishName}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const names = [...entry.sourceAliases, entry.englishName];
    figures.push({
      danceId: entry.danceId,
      display: { ja: entry.sourceAliases[0]!, en: entry.englishName },
      keys: names.map(fold),
      spellings: names.map(spellingKey)
    });
  }
  return figures;
})();

const shownIn = (locale: 'en' | 'ja-JP'): 'ja' | 'en' => (locale === 'ja-JP' ? 'ja' : 'en');

// ヴィエニーズワルツは 0 件なので、候補の枠ごと出さない（Ruling 39）。
export function hasFigureNameSuggestions(danceId: string): boolean {
  return FIGURES.some(figure => figure.danceId === danceId);
}

// 種目の照合済みフィガー全部（D20・Ruling 54-1）。登録簿の定義順のまま（五十音順にしない）・表示の言語の表記（候補と同じ）。
// VW は []。切らない（上限は FIGURE_CHOICES_MAX とテストで固定）。
export function figureNameChoices(danceId: string, locale: 'en' | 'ja-JP'): string[] {
  const shown = shownIn(locale);
  return FIGURES.filter(figure => figure.danceId === danceId).map(figure => figure.display[shown]);
}

// 1文字以上打ってから。部分一致（foldFigureName＝NFKC・大小無視・かなとカナを同じに）。打った名前がすでに照合済みの綴り
// （別名・英語名）とぴったり同じなら、もう選び終えているので何も出さない（「ウィスク」に「バックウィスク」を出し続けない）。
// ぴったりの判定だけは綴り（spellingKey）で見る＝「うぃすく」では候補を残し、タップでカタカナに直せる（Ruling 54-9）。
export function figureNameSuggestions(danceId: string, query: string, locale: 'en' | 'ja-JP', limit = FIGURE_SUGGESTIONS_MAX): string[] {
  const needle = fold(query);
  if (!needle) return [];
  const spelled = spellingKey(query);
  if (FIGURES.some(figure => figure.danceId === danceId && figure.spellings.includes(spelled))) return [];
  const shown = shownIn(locale);
  return FIGURES
    .filter(figure => figure.danceId === danceId && figure.keys.some(key => key.includes(needle)))
    .map(figure => figure.display[shown])
    .slice(0, limit);
}
