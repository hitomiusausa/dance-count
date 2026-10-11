// ハッシュルーターが触る window はここだけ。
export function readHash(): string {
  return window.location.hash;
}

export function onHashChange(listener: (hash: string) => void): () => void {
  const handler = () => listener(window.location.hash);
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}

// replace=true は履歴を積まない（戻る先が無い時の親への置き換え。仕様 §3）。
export function setHash(hash: string, { replace = false }: { replace?: boolean } = {}): void {
  if (replace) {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}
