// 「戻る」の判断に使う、このタブで見てきたハッシュの列（仕様 §3・Ruling 17）。純粋関数だけ。
// ひとつ前と同じハッシュに来たら「戻った」とみなして末尾を落とし、そうでなければ積む。
// 列が1件（直接開いた・再読み込みした）なら、戻る先は履歴ではなく親画面（置き換え）。
// 注意: ハッシュだけでは進む／戻るの向きは分からない。進む A→B→A を「戻った」と誤読しても、
// 次の「戻る」が親画面へ行くだけ（仕様 §3 のフォールバック）で、アプリの外へ出ることはない。
export function recordVisit(stack: readonly string[], hash: string): string[] {
  const visit = hashPath(hash);
  if (stack.length >= 2 && stack[stack.length - 2] === visit) return stack.slice(0, -1);
  if (stack[stack.length - 1] === visit) return [...stack];
  return [...stack, visit];
}

// 親への置き換え（履歴を積まない遷移）の時、末尾を置き換えて幽霊の項目を残さない。
export function replaceTop(stack: readonly string[], hash: string): string[] {
  return [...stack.slice(0, -1), hashPath(hash)];
}

export function canGoBackInHistory(stack: readonly string[]): boolean {
  return stack.length > 1;
}

// クエリ（?ui-state=…）は画面の違いではないので比べない。空のハッシュはホーム。
function hashPath(hash: string): string {
  const path = hash.split('?')[0] ?? '';
  return path === '' || path === '#' ? '#/' : path;
}
