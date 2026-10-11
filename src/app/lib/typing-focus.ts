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

// 帯を隠す／出す時機（F6 round 2）。隠すのはフォーカスが文字の欄に入った時にすぐ。出すのは欄から離れた時だが、指（マウス）を
// 押している最中に離れた時は指を離すまで待つ: 押した瞬間に固定の帯が現れると、離した点が帯の上になり、押したはずのボタン
// （例「1 2 3 で複製して追加」）でなく帯のボタンが押される。各メソッドは帯を隠すか（true/false）を返す。変えない時は null。
export class TypingDock {
  private typing = false;
  private pressing = false;
  private pendingShow = false;

  get hidden(): boolean { return this.typing; }

  // フォーカスがボタン等へ移った時（focusin の target・focusout の relatedTarget）も、押している最中なら出すのは待つ。
  focusIn(target: { tagName?: string; type?: string } | null | undefined): boolean | null {
    return this.moveTo(target);
  }

  focusOut(next: { tagName?: string; type?: string } | null | undefined): boolean | null {
    return this.moveTo(next);
  }

  private moveTo(element: { tagName?: string; type?: string } | null | undefined): boolean | null {
    if (isTypingTarget(element)) return this.set(true);
    if (!this.typing) return null;
    if (this.pressing) { this.pendingShow = true; return null; }
    return this.set(false);
  }

  pointerDown(): void {
    this.pressing = true;
  }

  pointerUp(): boolean | null {
    this.pressing = false;
    if (!this.pendingShow) return null;
    this.pendingShow = false;
    return this.set(false);
  }

  private set(typing: boolean): boolean | null {
    this.pendingShow = false;
    if (typing === this.typing) return null;
    this.typing = typing;
    return typing;
  }
}
