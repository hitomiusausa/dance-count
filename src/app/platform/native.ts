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

// アプリに同梱したファイル（標準の声・音楽の一式）を読む fetch。
// Capacitor 8.5.3 の iOS（WebViewAssetHandler.swift）は、音のファイル（wav・flac・mp3 など）だけ HTTP の応答ではない形で返すため、
// 中身はそろっているのに status 0・ok=false になる（2026-11-03 Mac のシミュレーター: 同梱の標準の声が「まだ端末に入っていません」になった）。
// アプリの中で、同じ出どころ（opaque でない）の status 0 は、中身を読んで 200 として渡す。ファイルが無い時は Capacitor が読み込みごと
// 失敗させる（didFailWithError）ので、無いファイルを「ある」とは扱わない。Web 版（ブラウザ）は何も変えない。
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function bundledFetchWith(fetchImpl: FetchLike, native: () => boolean): FetchLike {
  return async (input, init) => {
    const response = await fetchImpl(input, init);
    if (response.status !== 0 || response.type === 'opaque' || !native()) return response;
    const body = await response.arrayBuffer();
    if (body.byteLength === 0) return response;   // 中身の無い 0 は失敗のまま
    return new Response(body, { status: 200, headers: response.headers });
  };
}

export const fetchBundled: FetchLike = bundledFetchWith((input, init) => fetch(input, init), isNativeApp);
