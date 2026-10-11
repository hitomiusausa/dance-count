// アプリの版（package.json の version を Vite がビルド時に埋める。vite.config.ts の define）。
// Node のテストでは埋め込まれないので、その時だけ 'test' を返す。
declare const __APP_VERSION__: string | undefined;
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'test';
