// 文字を打つ欄か（D19・F6 の iOS シミュレーターの所見）。iOS 26 はキーボードが出ると下に固定の帯（「▶ 全体を試聴」）を
// キーボードの上へ持ち上げ、打っている欄のすぐ下のフォームを覆う。S4 は文字を打つ欄にフォーカスがある間だけ帯を出さない。
// focusin の target・focusout の relatedTarget（次にフォーカスを受ける要素。無ければ null）をそのまま渡す。
const NON_TEXT_INPUT_TYPES = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit']);

export function isTypingTarget(element: { tagName?: string; type?: string } | null | undefined): boolean {
  if (!element?.tagName) return false;
  const tag = element.tagName.toUpperCase();
  if (tag === 'TEXTAREA') return true;
  return tag === 'INPUT' && !NON_TEXT_INPUT_TYPES.has((element.type ?? 'text').toLowerCase());
}

type FocusLike = { tagName?: string; type?: string; isConnected?: boolean } | null | undefined;
type RootLike = { contains(node: never): boolean } | null | undefined;

// いま文字を打っているか＝フォーカスのある要素が S4 の中の文字の欄で、まだ画面にある（F6 round 3）。
// WebKit（iOS）はフォーカスのある欄が DOM から消えても focusout を出さないので、focusout だけに頼らずこれで確かめ直す。
export function isTypingInside(focused: FocusLike, root: RootLike): boolean {
  if (!focused || !root || focused.isConnected === false || !isTypingTarget(focused)) return false;
  return root.contains(focused as never);
}

// 帯を隠す／出す時機（F6 round 2・3）。隠すのはフォーカスが文字の欄に入った時にすぐ。出すのは欄から離れた時だが、指（マウス）を
// 押している最中は指を離すまで待つ: 押した瞬間に固定の帯が現れると、離した点が帯の上になり、押したはずのボタン
// （例「1 2 3 で複製して追加」）でなく帯のボタンが押される。各メソッドは帯を隠すか（true/false）を返す。変えない時は null。
// 打っている状態が残り続けない（round 3）: focusout・指を離した後・描画のたびに recheck(isTypingInside(...)) で確かめ直す。
export class TypingDock {
  private typing = false;
  private pressing = false;

  get hidden(): boolean { return this.typing; }

  // フォーカスがボタン等へ移った時（focusin の target・focusout の relatedTarget）。
  focusIn(target: FocusLike): boolean | null {
    return this.recheck(isTypingTarget(target));
  }

  focusOut(next: FocusLike): boolean | null {
    return this.recheck(isTypingTarget(next));
  }

  // いま打っているか（isTypingInside の答え）で確かめ直す。打っていないのに押している最中なら、出すのは指を離すまで待つ。
  recheck(typingNow: boolean): boolean | null {
    if (typingNow) return this.set(true);
    if (!this.typing || this.pressing) return null;
    return this.set(false);
  }

  pointerDown(): void {
    this.pressing = true;
  }

  // 指を離した後（画面は click の後＝次の描画の前に呼ぶ）。いま打っているかで決める。
  pointerUp(typingNow: boolean): boolean | null {
    this.pressing = false;
    return this.recheck(typingNow);
  }

  private set(typing: boolean): boolean | null {
    if (typing === this.typing) return null;
    this.typing = typing;
    return typing;
  }
}
