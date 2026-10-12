#!/usr/bin/env node
// 段7の完了条件（Ruling 95-2・仕様 §14 G7）を、静的に配った公開ビルドと本物の Service Worker で確かめる。dev には依存しない。
// 前提: `npm run build`（dist/）。このスモークが別の版（dist-b/。DC_BUILD_TAG=smoke-b）を自分で作る。
// 1. 初めて開く → SW が入り precache が全部そろう → 2. 網を切る（Chromium の setOffline）→ 開き直して S1 → ワルツ ▶ が鳴る・
//    音声は全部 SW から（six.wav?v=… も。F32 の対策）・パソドブレも鳴る・日本語の書体が出る → 3. Android の共有（POST ./receive）→ S10 が確認から →
// 4. サーバーを新しい版に入れ替えて確かめる → S6 に「新しい版があります。」→「更新する」→ 新しい版になる。
// 番号は DC_PWA_PORT（既定 4176。5173 はひとみうさの開発サーバー）。失敗があれば終了コード 1。
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { BUNDLE_MAX_BYTES } from '../src/app/share/limits.ts';
import { readPrecacheList } from './pwa/check-pwa.js';
import { startServer } from './serve-dist.js';

const root = path.resolve(import.meta.dirname, '..');
const PORT = Number(process.env.DC_PWA_PORT ?? 4176);
const BASE = `http://127.0.0.1:${PORT}/`;
const DIST = path.join(root, 'dist');
const DIST_B = path.join(root, 'dist-b');
const B_TAG = 'smoke-b';
const SOUND_TIMEOUT_MS = 10000;
const PRECACHE_TIMEOUT_MS = 30000;
const UPDATE_TIMEOUT_MS = 15000;
const FIXTURE = path.join(root, 'test/fixtures/share/bundle-routines-only.dancecount.txt');
const errors = [];

if (!fs.existsSync(path.join(DIST, 'sw.js'))) {
  console.error('dist/sw.js がありません。先に npm run build を実行してください。');
  process.exit(2);
}
const precacheUrls = readPrecacheList(fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8')).map(entry => entry.url);

// 新しい版（index.html の dc-build だけが違う → index.html の revision が変わる → sw.js が変わる）
const built = spawnSync('npx', ['vite', 'build', '--outDir', 'dist-b', '--emptyOutDir', '--logLevel', 'error'], { cwd: root, env: { ...process.env, DC_BUILD_TAG: B_TAG }, encoding: 'utf8' });
if (built.status !== 0) {
  console.error(`dist-b を作れませんでした:\n${built.stderr}`);
  process.exit(2);
}

let server = await startServer(DIST, PORT);
const stop = () => new Promise(resolve => { server.closeAllConnections(); server.close(() => resolve()); });

async function expectSounding(page, label) {
  const seen = new Set();
  const end = Date.now() + SOUND_TIMEOUT_MS;
  while (Date.now() < end && seen.size < 3) {
    const text = (await page.locator('.dc-now').textContent())?.trim();
    if (text && /^[1-8SQ&a]$/.test(text)) seen.add(text);
    await page.waitForTimeout(100);
  }
  const alert = await page.locator('[data-alert]').getAttribute('data-alert').catch(() => null);
  if (alert) errors.push(`${label}: alert "${alert}" shown`);
  if ((await page.locator('[data-screen="S2"]').getAttribute('data-playing')) !== 'true') errors.push(`${label}: not playing`);
  if (seen.size < 3) errors.push(`${label}: count display did not advance (${[...seen].join(', ')})`);
}

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, locale: 'ja-JP' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

  // 1. 初めて開く: SW が入り、precache が sw.js の一覧と同じ数になる
  await page.goto(BASE);
  await page.waitForSelector('[data-screen="S1"]');
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  if (scope !== BASE) errors.push(`service worker scope ${scope}, expected ${BASE}`);
  const cached = await page.waitForFunction(async expected => {
    const keys = await caches.keys();
    const name = keys.find(key => key.startsWith('workbox-precache'));
    return name ? (await (await caches.open(name)).keys()).length >= expected : false;
  }, precacheUrls.length, { timeout: PRECACHE_TIMEOUT_MS, polling: 200 }).then(() => true, () => false);
  if (!cached) errors.push(`precache did not reach ${precacheUrls.length} entries`);
  await page.reload();   // ここから SW がこのページを受け持つ（clients.claim はしない＝初回は網から読んだまま）
  await page.waitForSelector('[data-screen="S1"]');
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) errors.push('the page is not controlled by the service worker after a reload');
  // アプリの入口（scope の直下・index.html）以外の深いパスには index.html を返さない（段7 レビュー M2）。サーバーの 404 がそのまま見える
  // （別のタブで見る: 404 の「Failed to load resource」をこのタブのコンソールの失敗に数えない）
  const probe = await context.newPage();
  const deep = await probe.goto(`${BASE}no/such/page`);
  if (deep?.status() !== 404 || deep.fromServiceWorker()) errors.push(`a deep path was answered with ${deep?.status()}${deep?.fromServiceWorker() ? ' by the service worker' : ''} (expected the server's 404, not the app)`);
  const entry = await probe.goto(`${BASE}index.html?from=smoke`);
  if (!entry?.fromServiceWorker()) errors.push('index.html?… was not answered by the service worker');
  await probe.close();

  // 2. 網を切る（機内モードの代わり）。開き直しても S1 が描け、ワルツとパソドブレが鳴り、網へ出る要求が 0
  const failed = [];
  const audio = [];
  page.on('requestfailed', request => failed.push(request.url()));
  page.on('response', response => { if (/\/audio\//.test(response.url())) audio.push({ url: response.url(), sw: response.fromServiceWorker() }); });
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('[data-screen="S1"]');
  await page.locator('[data-group="dance"] a').first().click();
  await page.waitForSelector('[data-screen="S2"]');
  await page.locator('[data-play]').click();
  await expectSounding(page, 'offline waltz');
  await page.locator('[data-play]').click();   // 止める
  if (!audio.some(item => /six\.wav\?v=/.test(item.url) && item.sw)) errors.push('six.wav?v=… was not answered by the service worker (ignoreURLParametersMatching)');
  for (const item of audio) if (!item.sw) errors.push(`offline: ${item.url} did not come from the service worker`);
  await page.goto(`${BASE}#/practice/pasodoble`);
  await page.waitForSelector('[data-screen="S2"]');
  await page.locator('[data-play]').click();
  await expectSounding(page, 'offline paso doble');
  await page.locator('[data-play]').click();
  const font = await page.evaluate(async () => (await document.fonts.load('18px "Noto Sans JP"', 'ワルツ')).length);
  if (font === 0) errors.push('offline: Noto Sans JP did not load for ワルツ');
  if (failed.length) errors.push(`offline: ${failed.length} requests failed (${failed.slice(0, 3).join(', ')})`);
  await context.setOffline(false);

  // 3. Android の共有（share_target）: SW が POST を受けて受け口に置き、S10 は確認から始まる・受け口は空になる
  const status = await page.evaluate(async text => {
    const form = new FormData();
    form.append('bundle', new File([text], 'ルーティン-山田-2026-10-12.dancecount.txt', { type: 'text/plain' }));
    // redirect:'manual' で SW の答えが転送（303）であることを見る（ページから見ると opaqueredirect）
    const response = await fetch('receive', { method: 'POST', body: form, redirect: 'manual' });
    return response.type;
  }, fs.readFileSync(FIXTURE, 'utf8'));
  if (status !== 'opaqueredirect') errors.push(`share_target POST was answered with "${status}", expected a redirect to the app`);
  await page.goto(`${BASE}#/receive`);
  await page.waitForSelector('[data-step="confirm"]', { timeout: 5000 }).catch(() => errors.push('share_target: S10 did not start on the confirm step'));
  if (!(await page.locator('body').innerText()).includes('ルーティン 1 本: ワルツのルーティン')) errors.push('share_target: the confirm step does not list the routine');
  if (await page.evaluate(async () => Boolean(await (await caches.open('dance-count-inbox')).match('./inbox/bundle')))) errors.push('share_target: the file is still in the inbox');
  // ファイルの無い POST（共有の途中で取り消した等）も S10 へ送り、「選ぶ」から始まる（止まらない）
  const empty = await page.evaluate(async () => (await fetch('receive', { method: 'POST', body: new FormData(), redirect: 'manual' })).type);
  if (empty !== 'opaqueredirect') errors.push(`share_target POST without a file was answered with "${empty}", expected a redirect`);
  await page.goto(`${BASE}#/settings`);
  await page.goto(`${BASE}#/receive`);
  await page.waitForSelector('[data-screen="S10"][data-step="pick"]', { timeout: 5000 }).catch(() => errors.push('share_target without a file: S10 did not start on the pick step'));
  // 20MB を超えるファイルの共有: 受け口に書かず（印だけ）S10 へ。S10 は「選ぶ」から「大きすぎ」の枠を出す（段7 レビュー M1）
  const big = await page.evaluate(async size => {
    const form = new FormData();
    form.append('bundle', new File([new Uint8Array(size)], 'big.dancecount.txt', { type: 'text/plain' }));
    return (await fetch('receive', { method: 'POST', body: form, redirect: 'manual' })).type;
  }, BUNDLE_MAX_BYTES + 1);
  if (big !== 'opaqueredirect') errors.push(`share_target POST of a too-large file was answered with "${big}", expected a redirect`);
  const inboxBytes = await page.evaluate(async () => (await (await (await caches.open('dance-count-inbox')).match('./inbox/bundle'))?.arrayBuffer())?.byteLength ?? -1);
  if (inboxBytes !== 0) errors.push(`share_target: a too-large file was written to the inbox (${inboxBytes} bytes, expected an empty marker)`);
  await page.goto(`${BASE}#/settings`);
  await page.goto(`${BASE}#/receive`);
  await page.waitForSelector('[data-screen="S10"][data-step="pick"] [data-alert="too-large"]', { timeout: 5000 }).catch(() => errors.push('share_target too large: S10 did not show the too-large notice'));
  if (await page.evaluate(async () => Boolean(await (await caches.open('dance-count-inbox')).match('./inbox/bundle')))) errors.push('share_target: the too-large marker is still in the inbox');

  // 4. 新しい版: サーバーを dist-b に入れ替えて確かめる → S6 の帯 →「更新する」→ 新しい版で開き直る
  await stop();
  server = await startServer(DIST_B, PORT);
  await page.goto(`${BASE}#/settings`);
  await page.waitForSelector('[data-screen="S6"]');
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
  const banner = await page.waitForSelector('[data-alert="update"]', { timeout: UPDATE_TIMEOUT_MS }).then(() => true, () => false);
  if (!banner) errors.push('the update banner did not appear on S6');
  else {
    if (!(await page.locator('[data-alert="update"]').innerText()).includes('新しい版があります。')) errors.push('the update banner does not say 新しい版があります。');
    await Promise.all([page.waitForEvent('load', { timeout: UPDATE_TIMEOUT_MS }).catch(() => null), page.locator('[data-alert="update"] [data-alert-action]').click()]);
    await page.waitForSelector('[data-screen="S6"]');
    const tag = await page.locator('meta[name="dc-build"]').getAttribute('content');
    if (tag !== B_TAG) errors.push(`after "Update" the page is build ${tag}, expected ${B_TAG}`);
    if (await page.locator('[data-alert="update"]').count()) errors.push('the update banner is still shown after updating');
  }
  await context.close();
} finally {
  await browser.close();
  await stop();
  fs.rmSync(DIST_B, { recursive: true, force: true });
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`pwa smoke OK: service worker installed and precached ${precacheUrls.length} files; offline the app opens, the waltz and paso doble play from the cache (six.wav?v= too) and Noto Sans JP shows; a deep path is not answered with the app; a shared file posted to ./receive opens S10 on the confirm step and one over 20MB is not stored and shows the too-large notice; a new build shows the update banner on S6 and "Update" switches to it`);
