// 見えている範囲の下端より下にある要素を、上へ何 px スクロールすれば見えるか（D19・F6 の iOS シミュレーターの所見）。
// iOS はフォーカスのある入力欄だけを見える所へ動かすので、複製の形に切り替わった時の主ボタンがキーボード（と上の付属の帯）に隠れる。
// 見えている範囲は visualViewport（キーボードを除いた高さ）。keepTop（フォーカスのある欄の上端）は見える範囲の上から出さない。
export const REVEAL_MARGIN_PX = 12;

export interface RevealInput {
  bottom: number;         // 見せたい要素の下端（getBoundingClientRect の座標）
  keepTop: number;        // 上へ押し出したくない要素の上端（フォーカスのある欄）
  visibleTop: number;     // 見えている範囲の上端（visualViewport.offsetTop）
  visibleBottom: number;  // 見えている範囲の下端（visualViewport.offsetTop + height）
  margin?: number;
}

// 戻り値は下へスクロールする量（0 以上の整数）。すでに見えていれば 0。
// 下の固定の帯（「全体を試聴」）は入力中は出さない（RoutineEditScreen・typing-focus.ts）ので、端は visualViewport の下端だけ。
export function revealScrollBy({ bottom, keepTop, visibleTop, visibleBottom, margin = REVEAL_MARGIN_PX }: RevealInput): number {
  const need = bottom + margin - visibleBottom;
  if (need <= 0) return 0;
  const room = Math.max(0, keepTop - visibleTop - margin);
  return Math.ceil(Math.min(need, room));
}

// 1 フレームに 1 回だけ run する（visualViewport の resize・scroll は 1 フレームに何度も来る）。schedule は platform の nextFrame。
export function throttleToFrame(run: () => void, schedule: (callback: () => void) => () => void): { request(): void; cancel(): void } {
  let cancelPending: (() => void) | null = null;
  return {
    request() {
      if (cancelPending) return;
      cancelPending = schedule(() => { cancelPending = null; run(); });
    },
    cancel() {
      cancelPending?.();
      cancelPending = null;
    }
  };
}
