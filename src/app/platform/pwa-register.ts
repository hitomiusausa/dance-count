/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from 'virtual:pwa-register';
import { startPwa } from './pwa.ts';

// Service Worker の登録（段7・Ruling 88-4）。vite-plugin-pwa の仮想モジュールはここだけが import する
// （Node のテストは pwa.ts を読むので、仮想モジュールを pwa.ts に入れない）。公開ビルドの ./sw.js を scope './' で登録する。
export function registerServiceWorker(): void {
  startPwa(registerSW);
}
