import { withExternalBrowser } from '../app-url.ts';

// 文書の言語と題名を表示言語に合わせる（段1持ち越し: index.html の lang="ja" 固定）。
export function applyDocumentLanguage(locale: string, title: string): void {
  document.documentElement.lang = locale;
  document.title = title;
}

// 「更新する」（§11 の新しすぎるファイル）。段7で Service Worker の更新に差し替える。
export function reloadPage(): void {
  window.location.reload();
}

// LINE のアプリ内ブラウザ（UA に "Line/"）。Safari と保存領域が別なので、受け取る画面で一言出す（Ruling 83-1・F27。推測の上に立つ）。
export function isLineInAppBrowser(): boolean {
  return /\bLine\//.test(navigator.userAgent);
}

// 今の画面を LINE の外（Safari／Chrome）で開き直す URL（F26。効かなければ同じ画面が開くだけ）。
export function externalBrowserUrl(): string | null {
  return withExternalBrowser(window.location.href);
}
