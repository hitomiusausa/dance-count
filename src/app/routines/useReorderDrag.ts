import { useEffect, useRef, useState } from 'preact/hooks';
import { dropDestination } from '../../engine/routine-editor-order.js';
import { nextFrame, onDragInterrupt, scrollPageBy, viewportHeight } from '../platform/viewport.ts';
import { autoScrollStep, dropTargetFromY, isDragStart, type DropTarget } from './reorder-drag.ts';

// S4 のフィガーのドラッグ（Ruling 49）。Pointer Events だけ（マウス・タッチ・ペン共通。HTML5 drag は iOS のタッチで来ない）。
// つかみ（.dc-grip）を押して 8px 以上動いたらドラッグ、未満で離したら click＝タップ（行を開く）。
// 行き先は一覧の行（.dc-row[data-index]）の矩形と指の高さから毎フレーム決める（自動スクロール中も更新）。
export interface ReorderDragOptions {
  list: { current: HTMLElement | null };
  count: number;
  onStart(index: number): void;          // 開いている行を閉じる・試聴を止める
  onDrop(from: number, to: number): void;
  onTap(index: number): void;
  onStep(index: number, delta: -1 | 1): void;   // つかみの上下矢印
}

interface Press { index: number; pointerId: number; x: number; y: number; lastY: number; dragging: boolean }
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

  // いまの指の高さから行き先と線の位置を決める。
  const locate = () => {
    const current = press.current;
    const list = latest.current.list.current;
    if (!current || !list) return;
    const boxes = rows().map(row => row.getBoundingClientRect());
    target.current = dropTargetFromY(boxes, current.lastY);
    const box = target.current ? boxes[target.current.targetIndex]! : null;
    const lineTop = box && target.current ? (target.current.placeAfter ? box.bottom : box.top) - list.getBoundingClientRect().top : null;
    setView({ from: current.index, lineTop });
  };

  // 毎フレーム: 端に近ければ画面を動かし、行き先を更新する。
  const loop = () => {
    if (!press.current?.dragging) return;
    const dock = latest.current.list.current?.ownerDocument.querySelector('.dc-dock');
    const visibleBottom = dock ? dock.getBoundingClientRect().top : viewportHeight();
    const step = autoScrollStep(press.current.lastY, 0, visibleBottom);
    if (step !== 0) scrollPageBy(step);
    locate();
    stopLoop.current = nextFrame(loop);
  };

  const finish = () => {
    stopLoop.current?.();
    stopLoop.current = null;
    press.current = null;
    target.current = null;
    setView(null);
  };

  useEffect(() => onDragInterrupt(() => { if (press.current) finish(); }), []);
  useEffect(() => () => stopLoop.current?.(), []);

  const gripProps = (index: number) => ({
    onPointerDown(event: PointerEvent) {
      if (event.button > 0) return;
      event.preventDefault();   // iOS の文字選択・長押しメニューを出さない
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      ignoreClick.current = false;
      press.current = { index, pointerId: event.pointerId, x: event.clientX, y: event.clientY, lastY: event.clientY, dragging: false };
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
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      latest.current.onStep(index, event.key === 'ArrowUp' ? -1 : 1);
    },
    onContextMenu(event: Event) { event.preventDefault(); }
  });

  return { gripProps, view };
}
