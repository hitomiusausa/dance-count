import test from 'node:test';
import assert from 'node:assert/strict';
import { INBOX_CACHE, INBOX_KEY, INBOX_TOO_LARGE, returnToInbox, takeInboxFile } from '../../../src/app/platform/files.ts';
import { BUNDLE_MAX_BYTES } from '../../../src/app/share/limits.ts';
import { INBOX_TOO_LARGE_HEADER, SHARE_POST_MAX_BYTES, SHARE_POST_OVERHEAD_BYTES, inboxResponseFor, readBodyWithin, shareTooLargeByLength, tooLargeMarker } from '../../../src/share-inbox-contract.ts';

// Cache API の偽物（段7の Service Worker が書く形: Response の本文＝ファイル、X-File-Name＝名前）。
function fakeCaches() {
  const stores = new Map<string, Map<string, Response>>();
  return {
    stores,
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        async match(key: string) { return store.get(key)?.clone(); },
        async put(key: string, response: Response) { store.set(key, response); },
        async delete(key: string) { return store.delete(key); }
      };
    }
  };
}
// 本物のファイルが来る場面（大きすぎの印ではない）
async function takeFile(): Promise<File | null> {
  const taken = await takeInboxFile();
  assert.notEqual(taken, INBOX_TOO_LARGE);
  return taken as File | null;
}
function withCaches(value: unknown) {
  const before = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  Object.defineProperty(globalThis, 'caches', { value, configurable: true, writable: true });
  return () => { if (before) Object.defineProperty(globalThis, 'caches', before); else delete (globalThis as Record<string, unknown>).caches; };
}

test('the Android inbox gives the shared file once, then it is gone (Ruling 79-2)', async () => {
  const caches = fakeCaches();
  const restore = withCaches(caches);
  try {
    assert.equal(await takeInboxFile(), null, 'empty inbox');
    const cache = await caches.open(INBOX_CACHE);
    await cache.put(INBOX_KEY, new Response('{"type":"dance-count-bundle"}', { headers: { 'Content-Type': 'text/plain', 'X-File-Name': encodeURIComponent('声-山田-2026-10-12.dancecount.txt') } }));
    const file = await takeFile();
    assert.equal(file?.name, '声-山田-2026-10-12.dancecount.txt');
    assert.equal(await file?.text(), '{"type":"dance-count-bundle"}');
    assert.equal(caches.stores.get(INBOX_CACHE)?.has(INBOX_KEY), false, 'taken out of the inbox');
    assert.equal(await takeInboxFile(), null);
  } finally { restore(); }
});

test('without the Cache API, or when it fails, there is no inbox file', async () => {
  assert.equal(await takeInboxFile(), null);
  const restore = withCaches({ open: async () => { throw new Error('SecurityError'); } });
  try { assert.equal(await takeInboxFile(), null); } finally { restore(); }
  const restoreNameless = withCaches(fakeCaches());
  try {
    const cache = await (globalThis as unknown as { caches: ReturnType<typeof fakeCaches> }).caches.open(INBOX_CACHE);
    await cache.put(INBOX_KEY, new Response('x'));
    assert.equal((await takeFile())?.name, 'bundle.dancecount.txt', 'a missing name falls back');
  } finally { restoreNameless(); }
});

test('the inbox file name loses direction-changing characters (stage-5 review)', async () => {
  const restore = withCaches(fakeCaches());
  try {
    const cache = await (globalThis as unknown as { caches: ReturnType<typeof fakeCaches> }).caches.open(INBOX_CACHE);
    await cache.put(INBOX_KEY, new Response('x', { headers: { 'X-File-Name': encodeURIComponent('山田‮txt.dancecount.txt') } }));
    assert.equal((await takeFile())?.name, '山田txt.dancecount.txt');
  } finally { restore(); }
});

test('the service worker puts a shared file as it came, and only a marker for one over 20MB; S10 gets "too-large" (stage-7 review M1)', async () => {
  const fine = inboxResponseFor(new File(['{"type":"dance-count-bundle"}'], '声-山田.dancecount.txt', { type: 'text/plain' }));
  assert.equal(await fine.text(), '{"type":"dance-count-bundle"}');
  assert.equal(fine.headers.get('X-File-Name'), encodeURIComponent('声-山田.dancecount.txt'));
  assert.equal(fine.headers.get(INBOX_TOO_LARGE_HEADER), null);
  const big = { size: BUNDLE_MAX_BYTES + 1, name: 'big.dancecount.txt', type: 'text/plain' } as unknown as File;
  const marker = inboxResponseFor(big);
  assert.equal(marker.headers.get(INBOX_TOO_LARGE_HEADER), '1');
  assert.equal(await marker.text(), '', 'the big file itself is not written');
  const exact = { size: BUNDLE_MAX_BYTES, name: 'edge.txt', type: '' } as unknown as File;
  assert.equal(inboxResponseFor(exact).headers.get(INBOX_TOO_LARGE_HEADER), null, '20MB exactly is still accepted (same as readBundleText)');

  const caches = fakeCaches();
  const restore = withCaches(caches);
  try {
    await (await caches.open(INBOX_CACHE)).put(INBOX_KEY, marker);
    assert.equal(await takeInboxFile(), INBOX_TOO_LARGE);
    assert.equal(caches.stores.get(INBOX_CACHE)?.has(INBOX_KEY), false, 'the marker is taken out too');
    assert.equal(await takeInboxFile(), null);
  } finally { restore(); }
});

test('a too-new file goes back to the inbox before 「更新する」 and the reloaded S10 reads it again, once (stage-7 final review m1)', async () => {
  const caches = fakeCaches();
  const restore = withCaches(caches);
  try {
    await (await caches.open(INBOX_CACHE)).put(INBOX_KEY, new Response('{"type":"dance-count-bundle","bundleVersion":99}', { headers: { 'X-File-Name': encodeURIComponent('ルーティン-山田.dancecount.txt') } }));
    const shared = await takeFile();
    assert.equal(caches.stores.get(INBOX_CACHE)?.has(INBOX_KEY), false, 'S10 took it (still taken once)');
    await returnToInbox(shared!);   // 「更新する」を押した
    const again = await takeFile();   // 更新の後の S10
    assert.equal(again?.name, 'ルーティン-山田.dancecount.txt');
    assert.equal(await again?.text(), '{"type":"dance-count-bundle","bundleVersion":99}');
    assert.equal(await takeInboxFile(), null, 'taken once again after the reload');
  } finally { restore(); }
  await returnToInbox(new File(['x'], 'a.txt'));   // Cache API が無くても投げない（更新は続く）
  const restoreBroken = withCaches({ open: async () => { throw new Error('SecurityError'); } });
  try { await returnToInbox(new File(['x'], 'a.txt')); } finally { restoreBroken(); }
});

test('the service worker turns away an oversized share by Content-Length before reading the body (stage-7 final review m3)', async () => {
  assert.equal(shareTooLargeByLength(String(200 * 1024 * 1024)), true, 'a mistaken 200MB video share');
  assert.equal(shareTooLargeByLength(String(BUNDLE_MAX_BYTES + SHARE_POST_OVERHEAD_BYTES + 1)), true);
  assert.equal(shareTooLargeByLength(String(BUNDLE_MAX_BYTES + SHARE_POST_OVERHEAD_BYTES)), false, 'a 20MB file plus the multipart wrapping is still read');
  assert.equal(shareTooLargeByLength(String(BUNDLE_MAX_BYTES + 1)), false, 'between 20MB and the margin: the read check decides');
  assert.equal(shareTooLargeByLength('1234'), false);
  for (const value of [null, '', 'abc', '-1', '1e9']) assert.equal(shareTooLargeByLength(value), false, `no early answer for ${JSON.stringify(value)}`);
  const marker = tooLargeMarker();
  assert.equal(marker.headers.get(INBOX_TOO_LARGE_HEADER), '1');
  assert.equal(await marker.text(), '');
  const caches = fakeCaches();
  const restore = withCaches(caches);
  try {
    await (await caches.open(INBOX_CACHE)).put(INBOX_KEY, marker);
    assert.equal(await takeInboxFile(), INBOX_TOO_LARGE, 'S10 shows the same "too large" notice');
  } finally { restore(); }
});

test('without Content-Length the service worker counts the body and stops reading past the limit (stage-7 final review m3)', async () => {
  assert.equal(SHARE_POST_MAX_BYTES, BUNDLE_MAX_BYTES + SHARE_POST_OVERHEAD_BYTES);
  let pulled = 0;
  let cancelled = false;
  const endless = new ReadableStream<Uint8Array>({
    pull(controller) { pulled += 1; controller.enqueue(new Uint8Array(1024)); },
    cancel() { cancelled = true; }
  });
  assert.equal(await readBodyWithin(endless, 10 * 1024), null, 'over the limit');
  assert.equal(cancelled, true, 'the rest of the body is not read');
  assert.ok(pulled <= 12, `stopped right after the limit (${pulled} chunks)`);
  const form = new FormData();
  form.append('bundle', new File(['{"type":"dance-count-bundle"}'], '声.dancecount.txt', { type: 'text/plain' }));
  const request = new Request('https://example.test/receive', { method: 'POST', body: form });
  const bytes = await readBodyWithin(request.body!, SHARE_POST_MAX_BYTES);
  assert.ok(bytes);
  const parsed = await new Response(bytes, { headers: { 'Content-Type': request.headers.get('content-type')! } }).formData();
  const file = parsed.get('bundle') as File;
  assert.equal(file.name, '声.dancecount.txt');
  assert.equal(await file.text(), '{"type":"dance-count-bundle"}');
  const exact = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(100)); controller.close(); } });
  assert.equal((await readBodyWithin(exact, 100))?.byteLength, 100, 'exactly the limit is read');
});
