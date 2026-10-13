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

// 段8 Task 9b（Ruling 101）: 書体の @font-face（524 個・約 415KB）は描画を止めない別の CSS に分ける。
// main.tsx から import すると index-*.css に入り、それを読み終えるまで起動の殻すら描かれない（Slow 3G で白 8.4 秒）。
// ビルドでは fonts.css を別の入口（rolldownOptions.input）にして assets/fonts-*.css を作り、index.html に
// media="print"＋onload で差す＝読み込み中も描画は止まらず、届いたら全部の画面に効く（font-display: swap なので書体が後から替わるだけ）。
// 開発（vite）では同じ link を元の fonts.css に向ける。precache は globPatterns の assets/*.css で入る（check-pwa が確かめる）。
const FONTS_CSS = 'src/app/styles/fonts.css';
const fontsStylesheet: Plugin = {
  name: 'dc-fonts-stylesheet',
  transformIndexHtml: {
    order: 'post',
    handler(_html, ctx) {
      let href = `/${FONTS_CSS}`;
      if (ctx.bundle) {
        const asset = Object.values(ctx.bundle).find(file => file.type === 'asset' && file.fileName.endsWith('.css') && file.originalFileNames.includes(FONTS_CSS));
        if (!asset) throw new Error(`the build has no stylesheet for ${FONTS_CSS}`);
        href = `./${asset.fileName}`;
      }
      return [{ tag: 'link', attrs: { rel: 'stylesheet', href, media: 'print', onload: "this.media='all'" }, injectTo: 'head' }];
    }
  }
};

// 夜間便 A-5（Ruling 123・QW1）: 公開ページのメタ（index.html の description・og:*）の URL。PUBLIC_APP_URL の末尾の / を落として %DC_APP_URL% に入れる
// （空の時＝開発・普段のビルドは "/" と "/icons/icon-512.png" になる）。og:image は既存の icon-512.png（新しい画像は作らない）。
const appUrl: Plugin = { name: 'dc-app-url', transformIndexHtml: html => html.replaceAll('%DC_APP_URL%', (process.env.PUBLIC_APP_URL ?? '').replace(/\/+$/, '')) };

// 夜間便 A-5: index.html の <!-- … --> は開発者向けの注記なので、ビルドで全部落とす（公開 HTML に内部の注記を出さない＝check-pwa が dist に <!-- が無いことを見る）。
// index.html のコメントの行そのものは触らない（agent/logo と衝突させない）。
const stripHtmlComments: Plugin = { name: 'dc-strip-html-comments', apply: 'build', transformIndexHtml: { order: 'post', handler: html => html.replace(/<!--[\s\S]*?-->\s*/g, '') } };

// base:'./' は Capacitor とサブドメイン配信の両方で同じ成果物を使うため（仕様 §10）。
// optimizeDeps.entries を index.html に限定し、legacy/ や旧 HTML（1MB超）を依存スキャンに巻き込まない。
export default defineConfig({
  base: './',
  plugins: [
    preact(),
    buildTag,
    fontsStylesheet,
    appUrl,
    stripHtmlComments,
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
  // 案内文の公開 URL（§16-1・Ruling 82-7）。src/app/app-url.ts が読む。公開ビルドは RELEASE=1 PUBLIC_APP_URL=https://… npm run build（空なら check-dist が失敗＝final-review I2）。
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __PUBLIC_APP_URL__: JSON.stringify(process.env.PUBLIC_APP_URL ?? '') },
  optimizeDeps: { entries: ['index.html'], include: ['preact', 'preact/hooks', 'preact/jsx-runtime'] },
  server: { port: 5173, strictPort: true },
  preview: { port: 4174, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true, rolldownOptions: { input: { index: 'index.html', fonts: FONTS_CSS } } }
});
