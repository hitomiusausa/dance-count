import { useEffect, useState } from 'preact/hooks';
import { historyBack, onHashChange, readHash, setHash } from '../platform/hash.ts';
import { canGoBackInHistory, recordVisit } from '../router/back-stack.ts';
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

// 履歴があれば1つ戻る。直接開いた等で無ければ親画面へ置き換え（親は params を持たない画面だけ）。
export function goBack(current: ScreenId): void {
  if (canGoBackInHistory(visited)) {
    historyBack();
    return;
  }
  const parent = parentScreen(current) ?? 'S1';
  setHash(buildHash({ screen: parent, params: {} }), { replace: true });
}
