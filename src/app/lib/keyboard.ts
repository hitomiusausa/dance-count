// 画面のキーボードが開いているか（D19・F6 round 4）。S4 は開いている間だけ下の帯（「▶ 全体を試聴」）を出さない:
// iOS 26 はキーボードが出ると下に固定の帯をキーボードの上へ持ち上げ、打っている欄のすぐ下のフォームを覆う。
// フォーカスや指の動き（focusout・pointerup・click の順）では決めない（round 2・3 は iOS の順番を当てられず帯が戻らなかった）。
// 見ているのは高さだけ: レイアウトの高さ（キーボードで変わらない）と visualViewport の高さ（キーボードのぶん縮む）の差。
// キーボードが閉じると visualViewport の resize が来て帯が戻る。閉じるのは押したボタンの click の後なので、押す指の上に帯は現れない。

// しきい値 150px の根拠: iPhone のソフトウェアキーボードは予測変換の行を除いても約 216pt 以上（付属の帯を足せば 260pt 前後）。
// 一方、キーボードが無いのに差が出るのは Safari のツールバーの出し入れ（約 50〜100px）とハードウェアキーボードの
// ショートカットの帯（約 55px）。150 はその間で、どちらからも 50px 以上離れている。
export const KEYBOARD_MIN_PX = 150;

export interface ViewportHeights {
  layoutHeight: number;   // レイアウトの高さ（document.documentElement.clientHeight）
  visualHeight: number;   // visualViewport.height（CSS px。拡大中は 1/scale に縮む）
  scale: number;          // visualViewport.scale（ピンチで拡大していれば 1 より大きい）
}

// visualViewport が無い環境（古いブラウザ・テスト）は null → 開いていない扱い（帯は隠さない）。
// ピンチで拡大した時も visualViewport.height は縮むので、scale を掛けて画面上の高さに戻してから比べる（拡大だけでは隠さない）。
export function isKeyboardOpen(heights: ViewportHeights | null): boolean {
  if (!heights) return false;
  const { layoutHeight, visualHeight, scale } = heights;
  if (!(layoutHeight > 0) || !(visualHeight > 0)) return false;
  const shown = visualHeight * (scale > 0 ? scale : 1);
  return layoutHeight - shown > KEYBOARD_MIN_PX;
}

// 帯を隠すか（最終レビュー2 M4）。ルーティン全体を鳴らしている間は、キーボードが開いていても隠さない
// （帯の「■ 止める」が止める唯一の近い手段。打っても試聴は止まらない）。止めると、開いていれば隠れる。
export function hidesDock(keyboardOpen: boolean, playing: boolean): boolean {
  return keyboardOpen && !playing;
}
