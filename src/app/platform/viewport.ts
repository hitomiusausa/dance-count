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
