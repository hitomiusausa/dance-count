import { rabbitIconSvg } from './rabbit.ts';

// D62: 絵は rabbit.ts の 1 つだけ。画面では SVG の文字列をそのまま入れる（Icon.tsx の sprite と同じ型。中身はこのリポジトリの定数だけ）。
const TILE = rabbitIconSvg({ shape: 'rounded', size: 44 });
const SMALL_TILE = rabbitIconSvg({ shape: 'rounded', size: 28 });

// トップ（S0）のロゴの絵。文字「Dance Count」の左。読み上げは見出しの文字に任せる（絵は隠す）
export function BrandMark() {
  return <span class="dc-brand-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TILE }} />;
}

// 待ちの印（声の準備・一覧の読み込み）: 小さいうさぎ＋ワルツの 1・2・3 の点。0.4 秒より短い待ちでは見えない（CSS の遅れ。ちらつかせない）。
// 文字は無い（読み上げには出さない）。動きを減らす設定では点は止まって 3 つとも薄く点く。
export function WaltzSpinner() {
  return (
    <span class="dc-waltz" aria-hidden="true" data-waltz>
      <span class="dc-waltz-mark" dangerouslySetInnerHTML={{ __html: SMALL_TILE }} />
      <span class="dc-waltz-dots"><i /><i /><i /></span>
    </span>
  );
}
