import { Capacitor } from '@capacitor/core';

// App Store 版（Capacitor の iOS アプリ）の中で動いているか（docs/app-store/RELEASE-PLAN.md）。判定の正本はここだけ。
// アプリの中は「ホーム画面に追加済み」と同じ扱い（pwa.ts の isStandalone）にして、追加の案内・Service Worker を出さない。
// WKWebView の UA には "Safari/" が無いので、UA だけで見ると「iPhone の Safari 以外のブラウザ」に見えてしまう（platformKindFrom）。
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
