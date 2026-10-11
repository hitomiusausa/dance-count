import test from 'node:test';
import assert from 'node:assert/strict';
import { INBOX_CACHE, INBOX_KEY, takeInboxFile } from '../../../src/app/platform/files.ts';

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
    const file = await takeInboxFile();
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
    assert.equal((await takeInboxFile())?.name, 'bundle.dancecount.txt', 'a missing name falls back');
  } finally { restoreNameless(); }
});

test('the inbox file name loses direction-changing characters (stage-5 review)', async () => {
  const restore = withCaches(fakeCaches());
  try {
    const cache = await (globalThis as unknown as { caches: ReturnType<typeof fakeCaches> }).caches.open(INBOX_CACHE);
    await cache.put(INBOX_KEY, new Response('x', { headers: { 'X-File-Name': encodeURIComponent('山田‮txt.dancecount.txt') } }));
    assert.equal((await takeInboxFile())?.name, '山田txt.dancecount.txt');
  } finally { restore(); }
});
