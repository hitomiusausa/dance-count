// Service Worker のナビゲーションの許可リスト（段7 レビュー M2）。純粋（Node でテストする）。src/sw.ts だけが使う。
// ハッシュルーターなのでアプリの画面の移動は #/… で、SW に届くナビゲーションは入口（scope の直下・index.html）だけ。
// それ以外の深いパス（/foo/bar）に index.html を返さない＝存在しない URL にアプリを見せない（網へ出して、無ければ 404）。
// Workbox の NavigationRoute は allowlist を pathname + search に当てる。
export function appEntryPattern(scopePathname: string): RegExp {
  const escaped = scopePathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}(index\\.html)?(\\?.*)?$`);
}
