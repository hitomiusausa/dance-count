/// <reference lib="webworker" />
// Service Worker（段7・Ruling 88〜93）。vite-plugin-pwa の injectManifest がこのファイルを dist/sw.js に組み、
// self.__WB_MANIFEST に precache の一覧（ファイル名と revision）を入れる。src/app の外（境界テストの対象外・tsconfig.sw.json で型を見る）。
// 1. precache: 殻・manifest・アイコン・標準の声・アプリの文字が要る書体（Ruling 89）。?v= は無視して当てる（F32）。
// 2. 書体の残りは一度表示したら端末に残す（CacheFirst）。
// 3. 更新は「更新する」を押した時だけ（SKIP_WAITING）。自動で切り替えない（Ruling 90）。
// 4. Android の share_target の POST を受け、段5の受け口（Cache）に置いて S10 へ 303（Ruling 93-3）。20MB を超えるファイルは書かず印だけ（M1。Content-Length があれば本文を読む前に。m3）。
// ユーザーのデータ（声・ルーティン）はここに入れない（IndexedDB。仕様 §7）。
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute, type PrecacheEntry } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { INBOX_CACHE, INBOX_KEY, SHARE_POST_MAX_BYTES, SHARE_TARGET_FIELD, inboxResponseFor, readBodyWithin, shareTooLargeByLength, tooLargeMarker } from './share-inbox-contract.ts';
import { appEntryPattern } from './sw-navigation.ts';

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
// ハッシュルーターなので画面の移動はすべて index.html（#/… は SW に届かない）。index.html を返すのはアプリ自身の入口
// （scope の直下と index.html。?… は付いていてよい）だけ。それ以外の深いパスは網へ（存在しない URL にアプリを見せない。段7 レビュー M2）。
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { allowlist: [appEntryPattern(new URL(self.registration.scope).pathname)] }));
registerRoute(
  ({ request, url }) => request.method === 'GET' && url.origin === self.location.origin && url.pathname.endsWith('.woff2'),
  new CacheFirst({ cacheName: FONT_CACHE, plugins: [new ExpirationPlugin({ maxEntries: FONT_MAX_ENTRIES, maxAgeSeconds: FONT_MAX_AGE_SECONDS })] })
);
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.endsWith(RECEIVE_PATH),
  async ({ request }) => {
    try {
      // 大きすぎる共有は本文を全部は読まずに断る（安い Android で 200MB の動画を SW のメモリに溜めない。段7 最終レビュー m3）。
      // 1. Content-Length があれば本文を読む前に。2. 無ければ（Chrome は SW に見せない）本文を数えながら読み、上限を超えた所でやめる。
      // どちらも印だけ置く。本文の流れが無い時は従来どおり formData() と、読んだ後の判定（inboxResponseFor）が受け持つ。
      const tooLarge = async () => {
        await (await caches.open(INBOX_CACHE)).put(INBOX_KEY, tooLargeMarker());
        return Response.redirect(RECEIVE_REDIRECT, SEE_OTHER);
      };
      if (shareTooLargeByLength(request.headers.get('content-length'))) return await tooLarge();
      let form: FormData;
      if (request.body) {
        const bytes = await readBodyWithin(request.body, SHARE_POST_MAX_BYTES);
        if (!bytes) return await tooLarge();
        form = await new Response(bytes, { headers: { 'Content-Type': request.headers.get('content-type') ?? '' } }).formData();
      } else {
        form = await request.formData();
      }
      const file = form.get(SHARE_TARGET_FIELD);
      if (file instanceof File) {
        // 20MB を超えるファイルは書かず、印だけ置く（S10 が「大きすぎ」の枠を出す。段7 レビュー M1）
        await (await caches.open(INBOX_CACHE)).put(INBOX_KEY, inboxResponseFor(file));
      }
    } catch { /* 読めなくても S10 の「選ぶ」へ（ファイルを選び直せる） */ }
    return Response.redirect(RECEIVE_REDIRECT, SEE_OTHER);
  },
  'POST'
);
