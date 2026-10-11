// フィガーのドラッグの判断（Ruling 49）。画面（useReorderDrag）から座標を渡し、ここは数だけで決める。
// 行き先の番号は既存の dropDestination（エンジン）で求める。
export const DRAG_START_PX = 8;          // 押した点からこれ以上動いたらドラッグ。未満で離したらタップ（行を開く）
export const AUTO_SCROLL_EDGE_PX = 48;   // 見えている領域の上下端からこの内側に指が入ったら自動スクロール
export const AUTO_SCROLL_STEP_PX = 8;    // 1フレームに動かす量（固定速度。指の位置で加速しない）

export interface RowBox { top: number; bottom: number }
export interface DropTarget { targetIndex: number; placeAfter: boolean }

export function isDragStart(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= DRAG_START_PX;
}

// 指の高さ y から「どの行の前か後か」。最初の行より上は先頭の前、最後の行より下は末尾の後。行の中央ちょうどは後。
export function dropTargetFromY(rows: readonly RowBox[], y: number): DropTarget | null {
  if (rows.length === 0) return null;
  const last = rows.length - 1;
  if (y < rows[0]!.top) return { targetIndex: 0, placeAfter: false };
  if (y >= rows[last]!.bottom) return { targetIndex: last, placeAfter: true };
  const index = rows.findIndex(row => y < row.bottom);
  const row = rows[index]!;
  return { targetIndex: index, placeAfter: y >= row.top + (row.bottom - row.top) / 2 };
}

// 自動スクロールの向き（-1 上へ・1 下へ・0 止める）×量。visibleTop/Bottom は固定の帯を除いた見えている領域。
export function autoScrollStep(y: number, visibleTop: number, visibleBottom: number): number {
  if (y < visibleTop + AUTO_SCROLL_EDGE_PX) return -AUTO_SCROLL_STEP_PX;
  if (y > visibleBottom - AUTO_SCROLL_EDGE_PX) return AUTO_SCROLL_STEP_PX;
  return 0;
}

// つかんだ行の持ち上げ量 dy（Ruling 51-2・4）。押した点からの指の移動量＋ドラッグ開始からのスクロール量。
// rowTop0/rowBottom0 は開始時の行の矩形、listTop/listBottom は今の一覧の矩形（どちらも画面の座標）。
// 行の上端が一覧の上端より上へ・下端が一覧の下端より下へ出ないように止める（末尾の追加ボタン・固定の帯にかぶらない）。
export interface LiftInput {
  pointerY: number; pressY: number; scrollY: number; scrollY0: number;
  rowTop0: number; rowBottom0: number; listTop: number; listBottom: number;
}

export function liftOffset(input: LiftInput): number {
  const scrolled = input.scrollY - input.scrollY0;
  const dy = input.pointerY - input.pressY + scrolled;
  const min = input.listTop - input.rowTop0 + scrolled;
  const max = input.listBottom - input.rowBottom0 + scrolled;
  return Math.min(Math.max(dy, min), Math.max(min, max));
}

// 動かしている行の矩形を元の（並びの中の）位置に戻す。dropTargetFromY と線の位置はこの矩形で決める（Ruling 51-3）。
export function unliftBox(box: RowBox, dy: number): RowBox {
  return { top: box.top - dy, bottom: box.bottom - dy };
}
