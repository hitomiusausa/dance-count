import { figureSvg, rabbitIconSvg } from './rabbit.ts';

// D62: 絵は rabbit.ts の 1 つだけ。画面では SVG の文字列をそのまま入れる（Icon.tsx の sprite と同じ型。中身はこのリポジトリの定数だけ）。
const TILE = rabbitIconSvg({ shape: 'rounded', size: 44 });
const COIN_FRONT = rabbitIconSvg({ shape: 'circle', placement: 'coin', size: 32 });
const COIN_BACK = rabbitIconSvg({ shape: 'circle', placement: 'coin', size: 32, figure: 'gent' });
// S0 の扉の絵（D62 確認・案 1）: 「使う」＝女性（紺の扉の上に絵だけ）・「作る」＝男性（白い扉の上に紺の角丸ごと）。大きさは前の丸と同じ 48px
const DOOR_USE = figureSvg('lady', 48);
const DOOR_MAKE = rabbitIconSvg({ shape: 'rounded', size: 48, figure: 'gent' });

// トップ（S0）のロゴの絵。文字「Dance Count」の左。読み上げは見出しの文字に任せる（絵は隠す）
export function BrandMark() {
  return <span class="dc-brand-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TILE }} />;
}

// S0 の扉の絵。読み上げは扉の文字に任せる（絵は隠す）
export function DoorFigure({ door }: { door: 'use' | 'make' }) {
  return <span class="dc-door-icon dc-door-figure" aria-hidden="true" dangerouslySetInnerHTML={{ __html: door === 'use' ? DOOR_USE : DOOR_MAKE }} />;
}

// 待ちの印（声の準備・一覧の読み込み）: 丸いうさぎのコイン（表＝女性・裏＝男性。2 小節で 1 回ずつ返る）の下にワルツの 1・2・3 の点。
// 0.4 秒より短い待ちでは見えない（CSS の遅れ。ちらつかせない）。文字は無い（読み上げには出さない）。
// 動きを減らす設定ではコインは返らず（表の女性のまま）、点は止まって 3 つとも薄く点く。
export function WaltzSpinner() {
  return (
    <span class="dc-waltz" aria-hidden="true" data-waltz>
      <span class="dc-waltz-coin">
        <span class="dc-waltz-face" dangerouslySetInnerHTML={{ __html: COIN_FRONT }} />
        <span class="dc-waltz-face dc-waltz-back" dangerouslySetInnerHTML={{ __html: COIN_BACK }} />
      </span>
      <span class="dc-waltz-dots"><i /><i /><i /></span>
    </span>
  );
}
