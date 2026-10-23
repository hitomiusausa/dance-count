import { useEffect, useState } from 'preact/hooks';
import { historyBack, historyGo, onHashChange, readHash, setHash } from '../platform/hash.ts';
import { canGoBackInHistory, dropLast, wentBack, planReplace, recordVisit, stepsBackTo } from '../router/back-stack.ts';
import { buildHash, buildHashWithQuery, parentScreen, parseHash, type RedirectTarget, type Route, type RouteTarget, type ScreenId } from '../router/routes.ts';

// このタブで見てきた画面の列（「戻る」の判断用。仕様 §3・Ruling 17）。起動時の画面から始まる。
let visited: string[] = recordVisit([], readHash());
// 最後の画面替えが「戻る」だったか（Fable 答え 2026-10-13 §2-1。App.tsx が進む時だけ上端にする）
let lastMoveWasBack = false;

export function lastNavigationWasBack(): boolean {
  return lastMoveWasBack;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(readHash()));
  useEffect(() => {
    const accept = (hash: string) => {
      const next = recordVisit(visited, hash);
      lastMoveWasBack = wentBack(visited, next);
      visited = next;
      setRoute(parseHash(hash));
    };
    const unsubscribe = onHashChange(accept);
    // A hash can change while the first render is waiting for settings, before
    // the effect subscribes. Reconcile after subscribing so that visit is kept.
    accept(readHash());
    return unsubscribe;
  }, []);
  return route;
}

export function navigate(target: RouteTarget): void {
  setHash(buildHash(target));
}

// 履歴を積まずに画面を替える（新規ルーティンの ID 発行・見つからないルーティンから一覧へ・下タブの切替・S8 の完成 → S7・出口。Ruling 37・40・116）。
// 1 つ前が行き先と同じなら置き換えずに 1 つ戻る（同じ画面を 2 つ並べない。見てきた列を本当の履歴とそろえる。最終レビュー I1・T1・Task 1 修正 1）。
// そうでなければ見てきた列の末尾も置き換えて、幻の履歴を残さない。
// 古い経路の読み替え（resolveScreen の redirect）は ui-state を持ち越す（query。戻る時は 1 つ前の項目のまま）。ほかの呼び出しは query を渡さない。
export function replaceRoute(target: RedirectTarget): void {
  const hash = buildHashWithQuery(target);
  const plan = planReplace(visited, hash);
  if (plan.kind === 'back') {
    historyBack();
    return;
  }
  visited = plan.stack;
  lastMoveWasBack = false;
  setHash(hash, { replace: true });
}

// 出口（S10 の受け取った → U1／U2）。replaceRoute と同じ（1 つ前が行き先なら戻る、違えば置き換え）。
export function exitTo(target: RouteTarget): void {
  replaceRoute(target);
}

// 履歴があれば1つ戻る。直接開いた等で無ければ親画面へ置き換え（親は params を持たない画面だけ）。
// 親が表紙の画面（「‹ 表紙」）は 1 回で表紙に着く: 見てきた列の一番近い表紙まで戻り、無ければ表紙へ置き換え（Fable 答え §1-1・Task 1 修正 1）。
export function goBack(current: ScreenId): void {
  if (parentScreen(current) === 'S0') {
    const steps = stepsBackTo(visited, '#/');
    if (steps === null) {
      replaceRoute({ screen: 'S0', params: {} });
      return;
    }
    visited = dropLast(visited, steps);
    if (steps === 1) historyBack();
    else historyGo(-steps);
    return;
  }
  if (canGoBackInHistory(visited)) {
    historyBack();
    return;
  }
  replaceRoute({ screen: parentScreen(current) ?? 'S0', params: {} });
}
