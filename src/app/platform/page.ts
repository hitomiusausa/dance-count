import { withExternalBrowser } from '../app-url.ts';

// 文書の言語と題名を表示言語に合わせる（段1持ち越し: index.html の lang="ja" 固定）。
export function applyDocumentLanguage(locale: string, title: string): void {
  document.documentElement.lang = locale;
  document.title = title;
}

// 再読み込み。§11 の新しすぎるファイルの「更新する」は段7から platform/pwa.ts の checkForUpdateThenReload（SW が無い時にここへ落ちる）。
export function reloadPage(): void {
  window.location.reload();
}

// S13「データを全て消す」の後（Ruling 99-4）: 初期状態の S1 から開き直す（ハッシュを #/ に置き換えてから再読み込み。履歴に S13 を残さない）
export function reloadAtHome(): void {
  window.history.replaceState(null, '', '#/');
  window.location.reload();
}

// 起動の殻（index.html の .dc-boot。段8・Ruling 101）を外す。最初の画面を描いた時に 1 回（Preact は #app に元からある殻を消さないため）
export function removeBootShell(): void {
  document.querySelector('.dc-boot')?.remove();
}

// 今の画面のアドレス（S12 の「アドレスをコピー」。Safari・スマホで開き直すと、そのまま同じ手順の画面が出る）。
export function currentAddress(): string {
  return window.location.href;
}

// LINE のアプリ内ブラウザ（UA に "Line/"）。Safari と保存領域が別なので、受け取る画面で一言出す（Ruling 83-1・F27。推測の上に立つ）。
export function isLineInAppBrowser(): boolean {
  return /\bLine\//.test(navigator.userAgent);
}

// 今の画面を LINE の外（Safari／Chrome）で開き直す URL（F26。効かなければ同じ画面が開くだけ）。
export function externalBrowserUrl(): string | null {
  return withExternalBrowser(window.location.href);
}

// 画面が隠れた（ホーム画面へ戻る・アプリの切り替え・ロック・閉じる）。S4 が開いている行を確定して保存する（段7・Ruling 94-2）。
// visibilitychange の hidden と pagehide の両方で呼ぶ（2 回呼ばれてよい作りにする）。戻り値で購読をやめる。
export function onPageHidden(listener: () => void): () => void {
  const onVisibility = () => { if (document.visibilityState === 'hidden') listener(); };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', listener);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', listener);
  };
}
