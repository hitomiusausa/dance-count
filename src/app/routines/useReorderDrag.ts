import { useEffect, useRef, useState } from 'preact/hooks';
import { dropDestination } from '../../engine/routine-editor-order.js';
import { nextFrame, onDragInterrupt, pageScrollY, scrollPageBy, visibleViewport } from '../platform/viewport.ts';
import { autoScrollBottom, autoScrollStep, dropTargetFromY, isDragStart, liftOffset, unliftBox, type DropTarget } from './reorder-drag.ts';

// S4 のフィガーのドラッグ（Ruling 49）。Pointer Events だけ（マウス・タッチ・ペン共通。HTML5 drag は iOS のタッチで来ない）。
// つかみ（.dc-grip）を押して 8px 以上動いたらドラッグ、未満で離したら click＝タップ（行を開く）。
// 行き先は一覧の行（.dc-row[data-index]）の矩形と指の高さから毎フレーム決める（自動スクロール中も更新）。
// つかんだ行は少し浮いて指についてくる（Ruling 51）。持ち上げ量 --dy とクラス .dc-row--dragging は
// Preact の state を経由せず、このフックが行の要素へ直接書く（13 行の再描画を毎フレーム起こさないための、描画規則の例外）。
export interface ReorderDragOptions {
  list: { current: HTMLElement | null };
  count: number;
  onStart(index: number): void;          // 開いている行を閉じる・試聴を止める
  onDrop(from: number, to: number): void;
  onTap(index: number): void;
  onStep(index: number, delta: -1 | 1): void;   // つかみの上下矢印
}

interface Press {
  index: number; pointerId: number; x: number; y: number; lastY: number; dragging: boolean;
  row: HTMLElement | null;
  // Ruling 51: 持ち上げの基準。liftY は押した点（並びがずれたら一緒にずらす）、rowTop0/rowBottom0 は scrollY0 の時の行の矩形、dy は今書いている量。
  liftY: number; scrollY0: number; rowTop0: number; rowBottom0: number; dy: number;
}
export interface DragView { from: number; lineTop: number | null }

export function useReorderDrag(options: ReorderDragOptions) {
  const latest = useRef(options);
  latest.current = options;
  const press = useRef<Press | null>(null);
  const target = useRef<DropTarget | null>(null);
  const stopLoop = useRef<(() => void) | null>(null);
  const ignoreClick = useRef(false);
  const [view, setView] = useState<DragView | null>(null);

  const rows = () => [...(latest.current.list.current?.querySelectorAll<HTMLElement>('.dc-row[data-index]') ?? [])];

  // つかんだ行を指の位置へ動かす（Ruling 51-2・4）。transform を除いた今の矩形から、開いていた行が閉じた等の
  // 並びのずれを拾い、つかんだ所が指の下に留まるよう基準をずらしてから、一覧の範囲に止めた dy を書く。
  const lift = () => {
    const current = press.current;
    const list = latest.current.list.current;
    if (!current?.dragging || !current.row || !list) return;
    const scrollY = pageScrollY();
    const laidOut = unliftBox(current.row.getBoundingClientRect(), current.dy);
    const shift = laidOut.top - (current.rowTop0 - (scrollY - current.scrollY0));
    current.rowTop0 += shift;
    current.rowBottom0 = current.rowTop0 + (laidOut.bottom - laidOut.top);
    current.liftY += shift;
    const listBox = list.getBoundingClientRect();
    current.dy = liftOffset({
      pointerY: current.lastY, pressY: current.liftY, scrollY, scrollY0: current.scrollY0,
      rowTop0: current.rowTop0, rowBottom0: current.rowBottom0, listTop: listBox.top, listBottom: listBox.bottom
    });
    current.row.classList.add('dc-row--dragging');
    current.row.style.setProperty('--dy', `${current.dy}px`);
  };

  // いまの指の高さから行き先と線の位置を決める。動かしている行は元の位置の矩形で数える（Ruling 51-3）。
  const locate = () => {
    const current = press.current;
    const list = latest.current.list.current;
    if (!current || !list) return;
    const boxes = rows().map(row => (row === current.row ? unliftBox(row.getBoundingClientRect(), current.dy) : row.getBoundingClientRect()));
    target.current = dropTargetFromY(boxes, current.lastY);
    const box = target.current ? boxes[target.current.targetIndex]! : null;
    const lineTop = box && target.current ? (target.current.placeAfter ? box.bottom : box.top) - list.getBoundingClientRect().top : null;
    setView({ from: current.index, lineTop });
  };

  // 毎フレーム: 端に近ければ画面を動かし、行き先を更新する。
  const loop = () => {
    if (!press.current?.dragging) return;
    const dock = latest.current.list.current?.ownerDocument.querySelector('.dc-dock');
    const visibleBottom = autoScrollBottom(dock ? dock.getBoundingClientRect() : null, visibleViewport().bottom);
    const step = autoScrollStep(press.current.lastY, 0, visibleBottom);
    if (step !== 0) scrollPageBy(step);
    lift();
    locate();
    stopLoop.current = nextFrame(loop);
  };

  // 落とした・中断した瞬間に浮きを外す（着地のアニメーションなし。Ruling 51-7）。
  const finish = () => {
    stopLoop.current?.();
    stopLoop.current = null;
    const row = press.current?.row;
    if (row) {
      row.style.removeProperty('--dy');
      row.classList.remove('dc-row--dragging');
    }
    press.current = null;
    target.current = null;
    setView(null);
  };

  // 中断で捨てる時、ドラッグが始まっていたら離した時の click で行を開かない（つかみがまだ pointer を掴んでいる）。
  useEffect(() => onDragInterrupt(() => {
    if (!press.current) return;
    if (press.current.dragging) ignoreClick.current = true;
    finish();
  }), []);
  useEffect(() => () => stopLoop.current?.(), []);

  const gripProps = (index: number) => ({
    onPointerDown(event: PointerEvent) {
      if (event.button > 0) return;
      event.preventDefault();   // iOS の文字選択・長押しメニューを出さない
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      ignoreClick.current = false;
      const row = (event.currentTarget as HTMLElement).closest<HTMLElement>('.dc-row[data-index]');
      const box = row?.getBoundingClientRect();
      press.current = {
        index, pointerId: event.pointerId, x: event.clientX, y: event.clientY, lastY: event.clientY, dragging: false,
        row, liftY: event.clientY, scrollY0: pageScrollY(), rowTop0: box?.top ?? 0, rowBottom0: box?.bottom ?? 0, dy: 0
      };
    },
    onPointerMove(event: PointerEvent) {
      const current = press.current;
      if (!current || event.pointerId !== current.pointerId) return;
      current.lastY = event.clientY;
      if (!current.dragging) {
        if (!isDragStart(event.clientX - current.x, event.clientY - current.y)) return;
        current.dragging = true;
        latest.current.onStart(current.index);
        stopLoop.current = nextFrame(loop);
      }
      lift();
      locate();
    },
    onPointerUp(event: PointerEvent) {
      const current = press.current;
      if (!current || event.pointerId !== current.pointerId) return;
      if (!current.dragging) { press.current = null; return; }   // 動かしていない: 続く click がタップになる
      ignoreClick.current = true;
      const drop = target.current;
      finish();
      if (drop) latest.current.onDrop(current.index, dropDestination(current.index, drop.targetIndex, drop.placeAfter, latest.current.count));
    },
    onPointerCancel() { finish(); },
    onClick() {
      if (ignoreClick.current) { ignoreClick.current = false; return; }
      latest.current.onTap(index);   // 軽く押した・Enter・Space
    },
    onKeyDown(event: KeyboardEvent) {
      ignoreClick.current = false;   // ドラッグの後に click が来ず残った印で、この後の Enter・Space の click を捨てない
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      latest.current.onStep(index, event.key === 'ArrowUp' ? -1 : 1);
    },
    onContextMenu(event: Event) { event.preventDefault(); }
  });

  return { gripProps, view };
}
