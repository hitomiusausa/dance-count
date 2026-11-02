/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from 'virtual:pwa-register';
import { isNativeApp } from './native.ts';
import { startPwa } from './pwa.ts';

// Service Worker の登録（段7・Ruling 88-4）。vite-plugin-pwa の仮想モジュールはここだけが import する
// （Node のテストは pwa.ts を読むので、仮想モジュールを pwa.ts に入れない）。公開ビルドの ./sw.js を scope './' で登録する。
// App Store 版のアプリの中では登録しない: 中身はアプリに同梱されていて、更新は App Store が配る（「新しい版があります」の帯も出さない）。
export function registerServiceWorker(): void {
  if (isNativeApp()) return;
  startPwa(registerSW);
}
