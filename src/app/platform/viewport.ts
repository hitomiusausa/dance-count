// ドラッグ（Ruling 49・51）が触る画面の面はここだけ: 見えている高さ・ページのスクロール・毎フレーム・中断の知らせ。
export function viewportHeight(): number {
  return window.innerHeight;
}

// ページの縦スクロール量。つかんだ行を自動スクロール中も指の下に留める（Ruling 51-2）。
export function pageScrollY(): number {
  return window.scrollY;
}

export function scrollPageBy(dy: number): void {
  window.scrollBy(0, dy);
}

// 次の描画の前に1回。戻り値で取り消し。
export function nextFrame(callback: () => void): () => void {
  const id = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(id);
}

// ドラッグを捨てる合図: 画面がフォーカスを失う・裏に回る・Esc。戻り値で解除。
export function onDragInterrupt(listener: () => void): () => void {
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') listener(); };
  const onHidden = () => { if (document.visibilityState === 'hidden') listener(); };
  window.addEventListener('blur', listener);
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHidden);
  return () => {
    window.removeEventListener('blur', listener);
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onHidden);
  };
}

// 見えている範囲（キーボードを除く）。iOS は visualViewport の高さがキーボードと付属の帯のぶん縮む。無い環境は窓の高さ（D19・F6）。
export function visibleViewport(): { top: number; bottom: number } {
  const visual = window.visualViewport;
  if (!visual) return { top: 0, bottom: window.innerHeight };
  return { top: visual.offsetTop, bottom: visual.offsetTop + visual.height };
}

// 見えている範囲が変わった時（キーボードが出る・高さが変わる・iOS が見える範囲を動かす）の知らせ。戻り値で解除。
// visualViewport が無い環境では何もしない（窓の高さはキーボードで変わらない）。
export function onVisibleViewportChange(listener: () => void): () => void {
  const visual = window.visualViewport;
  if (!visual) return () => {};
  visual.addEventListener('resize', listener);
  visual.addEventListener('scroll', listener);
  return () => {
    visual.removeEventListener('resize', listener);
    visual.removeEventListener('scroll', listener);
  };
}

// キーボードの判定に使う高さ（D19・F6 round 4）。レイアウトの高さ＝documentElement.clientHeight（iOS ではキーボードで
// 変わらない）と visualViewport の高さ・拡大率。visualViewport が無い環境は null（判定は lib/keyboard.ts の isKeyboardOpen）。
export function viewportHeights(): { layoutHeight: number; visualHeight: number; scale: number } | null {
  const visual = typeof window === 'undefined' ? null : window.visualViewport;
  if (!visual) return null;
  return { layoutHeight: document.documentElement.clientHeight, visualHeight: visual.height, scale: visual.scale };
}
