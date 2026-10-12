import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };
import { SHARE_TARGET_FIELD } from './src/share-inbox-contract.ts';
import { neededFontGlob, neededFontSubsets } from './tools/fonts/needed-subsets.js';

// 段7: index.html の <meta name="dc-build"> に入る版の印（smoke:pwa が DC_BUILD_TAG=b で別の版を作り、更新されたかを見る）。
// 既定は package.json の版（同じ木からは同じ dist ができる）。
const BUILD_TAG = process.env.DC_BUILD_TAG ?? pkg.version;
const buildTag: Plugin = { name: 'dc-build-tag', transformIndexHtml: html => html.replace('%DC_BUILD%', BUILD_TAG) };

// base:'./' は Capacitor とサブドメイン配信の両方で同じ成果物を使うため（仕様 §10）。
// optimizeDeps.entries を index.html に限定し、legacy/ や旧 HTML（1MB超）を依存スキャンに巻き込まない。
export default defineConfig({
  base: './',
  plugins: [
    preact(),
    buildTag,
    // Service Worker（Ruling 88〜93）。自前の src/sw.ts に precache の一覧を注入する。dev では動かさない（devOptions を付けない）。
    // 登録は src/app/platform/pwa-register.ts（virtual:pwa-register）だけ。更新は「更新する」を押した時（registerType: 'prompt'）。
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      includeManifestIcons: false,   // アイコンは下の globPatterns の icons/* で入る（二重に載せない）
      manifest: {
        name: 'Dance Count',
        short_name: 'Dance Count',
        description: 'Count practice for ballroom dancing',
        lang: 'ja',
        start_url: './',
        scope: './',
        display: 'standalone',
        theme_color: '#1B2A4A',
        background_color: '#FFFFFF',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        // Android の「共有 → Dance Count」（段5の受け口の契約。Ruling 79-2・93-3）。iOS は無視する（F37）。
        share_target: {
          action: './receive',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: { files: [{ name: SHARE_TARGET_FIELD, accept: ['text/plain', '.txt', 'application/json', '.json'] }] }
        }
      },
      injectManifest: {
        // precache（Ruling 89-1）: 殻・アイコン・標準の声の全パック（standard-voices.json にある物だけが public/audio にある＝check-dist）・
        // アプリの文字が要る書体サブセットの woff2 だけ（.woff と残りのサブセットは入れない）。manifest.webmanifest は plugin が足す。
        globPatterns: ['index.html', 'assets/*.{js,css}', 'icons/*.{png,svg}', 'audio/**/*.{json,wav}', neededFontGlob(neededFontSubsets())]
      }
    })
  ],
  // ルーティンの createdWith.version（仕様 §7・Ruling 37）。src/app/app-version.ts が読む。
  // 案内文の公開 URL（§16-1・Ruling 82-7）。src/app/app-url.ts が読む。公開前に PUBLIC_APP_URL=https://… npm run build。
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __PUBLIC_APP_URL__: JSON.stringify(process.env.PUBLIC_APP_URL ?? '') },
  optimizeDeps: { entries: ['index.html'], include: ['preact', 'preact/hooks', 'preact/jsx-runtime'] },
  server: { port: 5173, strictPort: true },
  preview: { port: 4174, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true }
});
