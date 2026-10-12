/// <reference lib="webworker" />
// Service Worker（段7・Ruling 88〜93）。vite-plugin-pwa の injectManifest がこのファイルを dist/sw.js に組み、
// self.__WB_MANIFEST に precache の一覧（ファイル名と revision）を入れる。src/app の外（境界テストの対象外・tsconfig.sw.json で型を見る）。
// 1. precache: 殻・manifest・アイコン・標準の声・アプリの文字が要る書体（Ruling 89）。?v= は無視して当てる（F32）。
// 2. 書体の残りは一度表示したら端末に残す（CacheFirst）。
// 3. 更新は「更新する」を押した時だけ（SKIP_WAITING）。自動で切り替えない（Ruling 90）。
// 4. Android の share_target の POST を受け、段5の受け口（Cache）に置いて S10 へ 303（Ruling 93-3）。
// ユーザーのデータ（声・ルーティン）はここに入れない（IndexedDB。仕様 §7）。
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute, type PrecacheEntry } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { INBOX_CACHE, INBOX_FILE_HEADER, INBOX_KEY, SHARE_TARGET_FIELD } from './share-inbox-contract.ts';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<PrecacheEntry | string> };

const FONT_CACHE = 'dance-count-fonts';
const FONT_MAX_ENTRIES = 200;
const FONT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
// precache の照合で無視するクエリ: Workbox の既定（utm_・fbclid）に、標準の声の差し替え用の v を足す（voice-pack-loader.js の ?v=<revision>）。
const IGNORED_QUERY = [/^utm_/, /^fbclid$/, /^v$/];
const RECEIVE_PATH = '/receive';
const RECEIVE_REDIRECT = './#/receive';
const SEE_OTHER = 303;

// 「更新する」（platform/pwa.ts の updateServiceWorker）だけが送る。
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

cleanupOutdatedCaches();   // workbox の precache の古い版だけを消す（dance-count-inbox・dance-count-fonts には触れない）
precacheAndRoute(self.__WB_MANIFEST, { ignoreURLParametersMatching: IGNORED_QUERY });
// ハッシュルーターなので画面の移動はすべて index.html（#/… は SW に届かない）。
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
registerRoute(
  ({ request, url }) => request.method === 'GET' && url.origin === self.location.origin && url.pathname.endsWith('.woff2'),
  new CacheFirst({ cacheName: FONT_CACHE, plugins: [new ExpirationPlugin({ maxEntries: FONT_MAX_ENTRIES, maxAgeSeconds: FONT_MAX_AGE_SECONDS })] })
);
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.endsWith(RECEIVE_PATH),
  async ({ request }) => {
    try {
      const file = (await request.formData()).get(SHARE_TARGET_FIELD);
      if (file instanceof File) {
        const cache = await caches.open(INBOX_CACHE);
        await cache.put(INBOX_KEY, new Response(file, {
          headers: { 'Content-Type': file.type || 'text/plain', [INBOX_FILE_HEADER]: encodeURIComponent(file.name) }
        }));
      }
    } catch { /* 読めなくても S10 の「選ぶ」へ（ファイルを選び直せる） */ }
    return Response.redirect(RECEIVE_REDIRECT, SEE_OTHER);
  },
  'POST'
);
