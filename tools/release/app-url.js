// 段8 Task 12（final-review I2）: 案内文の公開 URL（PUBLIC_APP_URL・vite.config.ts の define）の番人。check-dist.js が呼ぶ。純粋。
// 公開ビルドは `RELEASE=1 PUBLIC_APP_URL=https://… npm run build`。RELEASE=1 で URL が空・壊れていたら失敗させる（普段のビルド・テストは空のまま通る）。
// URL そのもの（D4）はひとみうさが決める。ここでは値を選ばない。

// check-dist の最後の行に足す「app url: …」（空なら案内文から「アプリ:」の行が消えることを書く）
export function appUrlLine(url) {
  return url ? `app url: ${url}` : 'app url: (none — student instructions omit the app line)';
}

// 公開ビルド（RELEASE=1）の時だけ見る。問題が無ければ null
export function releaseAppUrlProblem({ release, url }) {
  if (!release) return null;
  if (!url) return 'RELEASE=1 needs PUBLIC_APP_URL (the app URL printed in the student instructions). Example: RELEASE=1 PUBLIC_APP_URL=https://… npm run build';
  let parsed;
  try { parsed = new URL(url); } catch { return `PUBLIC_APP_URL is not a URL: "${url}"`; }
  if (parsed.protocol !== 'https:') return `PUBLIC_APP_URL must be https:// for a release build: "${url}"`;
  return null;
}

export function isRelease(value) {
  return value === '1' || value === 'true';
}
