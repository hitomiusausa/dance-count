// 「戻る」の判断に使う、このタブで見てきたハッシュの列（仕様 §3・Ruling 17）。純粋関数だけ。
// ひとつ前と同じハッシュに来たら「戻った」とみなして末尾を落とし、そうでなければ積む。
// 列が1件（直接開いた・再読み込みした）なら、戻る先は履歴ではなく親画面（置き換え）。
export function recordVisit(stack: readonly string[], hash: string): string[] {
  const visit = hashPath(hash);
  if (stack.length >= 2 && stack[stack.length - 2] === visit) return stack.slice(0, -1);
  if (stack[stack.length - 1] === visit) return [...stack];
  return [...stack, visit];
}

export function canGoBackInHistory(stack: readonly string[]): boolean {
  return stack.length > 1;
}

// クエリ（?ui-state=…）は画面の違いではないので比べない。空のハッシュはホーム。
function hashPath(hash: string): string {
  const path = hash.split('?')[0] ?? '';
  return path === '' || path === '#' ? '#/' : path;
}
