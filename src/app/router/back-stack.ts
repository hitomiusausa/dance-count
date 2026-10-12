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

// 画面替えの向き（Fable 答え 2026-10-13 §2-1）: 列が縮んだ＝戻った。置き換え（replaceTop）・同じ長さ＝進む扱い。
// 進む時だけ新しい画面を上端にし、戻る時はブラウザのスクロールの復元を残す（App.tsx）。
export function wentBack(before: readonly string[], after: readonly string[]): boolean {
  return after.length < before.length;
}

export function canGoBackInHistory(stack: readonly string[]): boolean {
  return stack.length > 1;
}

// クエリ（?ui-state=…）は画面の違いではないので比べない。空のハッシュはホーム。
function hashPath(hash: string): string {
  const path = hash.split('?')[0] ?? '';
  return path === '' || path === '#' ? '#/' : path;
}

// 「‹ 表紙」（親が表紙の画面＝U1・U2・M0・S6）は 1 回で表紙に着く（Fable 答え §1-1・Task 1 修正 1）。
// 見てきた列の中で一番近い表紙（'#/'）まで何個戻るか。末尾（今の画面）は数えない。無ければ null（表紙へ置き換える）。
export function stepsBackTo(stack: readonly string[], hash: string): number | null {
  const target = hashPath(hash);
  for (let index = stack.length - 2; index >= 0; index -= 1) {
    if (stack[index] === target) return stack.length - 1 - index;
  }
  return null;
}

// 履歴を n 個戻った後の列（戻った先が末尾。その後の hashchange では recordVisit が何も変えない）。
export function dropLast(stack: readonly string[], steps: number): string[] {
  return stack.slice(0, Math.max(1, stack.length - steps));
}

// 「出口」（S10 の受け取った → U1／U2 など）: 1 つ前が行き先と同じ画面なら、置き換えずに 1 つ戻る。
// 置き換えると同じ画面が 2 つ続き、「‹」や戻るスワイプの 1 回目が何も起きないように見える（Task 1 修正 1・Repro A）。
export function exitByBack(stack: readonly string[], hash: string): boolean {
  return stack.length >= 2 && stack[stack.length - 2] === hashPath(hash);
}
