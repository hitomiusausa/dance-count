// 見えている範囲の下端より下にある要素を、上へ何 px スクロールすれば見えるか（D19・F6 の iOS シミュレーターの所見）。
// iOS はフォーカスのある入力欄だけを見える所へ動かすので、複製の形に切り替わった時の主ボタンがキーボード（と上の付属の帯）に隠れる。
// 見えている範囲は visualViewport（キーボードを除いた高さ）。keepTop（フォーカスのある欄の上端）は見える範囲の上から出さない。
export const REVEAL_MARGIN_PX = 12;

export interface RevealInput {
  bottom: number;         // 見せたい要素の下端（getBoundingClientRect の座標）
  keepTop: number;        // 上へ押し出したくない要素の上端（フォーカスのある欄）
  visibleTop: number;     // 見えている範囲の上端（visualViewport.offsetTop）
  visibleBottom: number;  // 見えている範囲の下端（visualViewport.offsetTop + height）
  coverTop?: number;      // 下に固定の帯（「全体を試聴」）が見えていればその上端。帯の下も「見えない」に数える
  margin?: number;
}

// 戻り値は下へスクロールする量（0 以上の整数）。すでに見えていれば 0。
export function revealScrollBy({ bottom, keepTop, visibleTop, visibleBottom, coverTop, margin = REVEAL_MARGIN_PX }: RevealInput): number {
  const limit = coverTop !== undefined && coverTop > visibleTop && coverTop < visibleBottom ? coverTop : visibleBottom;
  const need = bottom + margin - limit;
  if (need <= 0) return 0;
  const room = Math.max(0, keepTop - visibleTop - margin);
  return Math.ceil(Math.min(need, room));
}
