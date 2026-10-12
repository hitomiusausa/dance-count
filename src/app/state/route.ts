import { useEffect, useState } from 'preact/hooks';
import { historyBack, onHashChange, readHash, setHash } from '../platform/hash.ts';
import { canGoBackInHistory, recordVisit, replaceTop } from '../router/back-stack.ts';
import { buildHash, parentScreen, parseHash, type Route, type RouteTarget, type ScreenId } from '../router/routes.ts';

// このタブで見てきた画面の列（「戻る」の判断用。仕様 §3・Ruling 17）。起動時の画面から始まる。
let visited: string[] = recordVisit([], readHash());

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(readHash()));
  useEffect(() => onHashChange(hash => {
    visited = recordVisit(visited, hash);
    setRoute(parseHash(hash));
  }), []);
  return route;
}

export function navigate(target: RouteTarget): void {
  setHash(buildHash(target));
}

// 履歴を積まずに画面を替える（新規ルーティンの ID 発行・見つからないルーティンから一覧へ・下タブの切替。Ruling 37・40・116）。
// 見てきた列の末尾も置き換えて、幻の履歴を残さない。
export function replaceRoute(target: RouteTarget): void {
  const hash = buildHash(target);
  visited = replaceTop(visited, hash);
  setHash(hash, { replace: true });
}

// 履歴があれば1つ戻る。直接開いた等で無ければ親画面へ置き換え（親は params を持たない画面だけ）。
export function goBack(current: ScreenId): void {
  if (canGoBackInHistory(visited)) {
    historyBack();
    return;
  }
  replaceRoute({ screen: parentScreen(current) ?? 'S0', params: {} });
}
