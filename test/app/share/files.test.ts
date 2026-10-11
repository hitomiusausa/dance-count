import test from 'node:test';
import assert from 'node:assert/strict';
import { BundleTooLargeError, canShareFile, copyText, downloadFile, readBundleText, shareFile } from '../../../src/app/platform/files.ts';
import { BUNDLE_MAX_BYTES } from '../../../src/app/share/limits.ts';

// navigator・document の偽物を差し替えて、終わったら戻す（Node 24 の globalThis.navigator は差し替えられる）。
function withGlobal(name: 'navigator' | 'document', value: unknown): () => void {
  const before = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  return () => { if (before) Object.defineProperty(globalThis, name, before); else delete (globalThis as Record<string, unknown>)[name]; };
}
const file = () => new File(['{"a":1}'], '声-山田-2026-10-12.dancecount.txt', { type: 'text/plain' });
const named = (name: string) => Object.assign(new Error(name), { name });

test('share is called in the same turn as the tap (no await first) and its outcome is shared / cancelled / refused (Ruling 81・F22)', async () => {
  const calls: string[] = [];
  for (const [settle, expected] of [[() => Promise.resolve(), 'shared'], [() => Promise.reject(named('AbortError')), 'cancelled'],
    [() => Promise.reject(named('NotAllowedError')), 'refused'], [() => { throw named('TypeError'); }, 'refused']] as const) {
    const restore = withGlobal('navigator', { share: () => { calls.push('share'); return settle(); } });
    try {
      const pending = shareFile(file());
      calls.push('returned');
      assert.equal(await pending, expected);
    } finally { restore(); }
  }
  assert.deepEqual(calls, ['share', 'returned', 'share', 'returned', 'share', 'returned', 'share', 'returned']);
});

test('a second tap while the share sheet is open gets the same result instead of a second share (F22)', async () => {
  let calls = 0;
  let finish: () => void = () => {};
  const restore = withGlobal('navigator', { share: () => { calls += 1; return new Promise<void>(resolve => { finish = resolve; }); } });
  try {
    const first = shareFile(file());
    const second = shareFile(file());
    assert.equal(second, first);
    assert.equal(calls, 1);
    finish();
    assert.equal(await first, 'shared');
    void shareFile(file());
    assert.equal(calls, 2, 'after it settles, a new share starts');
    finish();
  } finally { restore(); }
});

test('canShareFile is true only when share exists and canShare says yes; a throwing canShare is false', () => {
  for (const [nav, expected] of [[{}, false], [{ share() {}, canShare: () => false }, false], [{ share() {}, canShare: () => true }, true],
    [{ share() {} }, false], [{ share() {}, canShare: () => { throw new Error('x'); } }, false]] as const) {
    const restore = withGlobal('navigator', nav);
    try { assert.equal(canShareFile(file()), expected, JSON.stringify(Object.keys(nav))); } finally { restore(); }
  }
});

test('download clicks a hidden link named after the file and frees the URL a minute later', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const clicked: string[] = [];
  const revoked: string[] = [];
  const realRevoke = URL.revokeObjectURL;
  URL.revokeObjectURL = url => { revoked.push(url); };
  const link = { href: '', download: '', rel: '', style: { display: '' }, click() { clicked.push(`${this.download}`); }, remove() { clicked.push('removed'); } };
  const restore = withGlobal('document', { createElement: (tag: string) => { assert.equal(tag, 'a'); return link; }, body: { append() {} } });
  try {
    downloadFile(file());
    assert.deepEqual(clicked, ['声-山田-2026-10-12.dancecount.txt', 'removed']);
    assert.match(link.href, /^blob:/);
    assert.deepEqual(revoked, []);
    t.mock.timers.tick(60_000);
    assert.deepEqual(revoked, [link.href]);
  } finally { restore(); URL.revokeObjectURL = realRevoke; }
});

test('copyText is true when the clipboard takes it, false without a clipboard or when refused', async () => {
  for (const [nav, expected] of [[{ clipboard: { writeText: async () => {} } }, true], [{}, false],
    [{ clipboard: { writeText: async () => { throw new Error('denied'); } } }, false]] as const) {
    const restore = withGlobal('navigator', nav);
    try { assert.equal(await copyText('案内文'), expected); } finally { restore(); }
  }
});

test('a file over 20MB is refused before reading; a normal one is read as text (Ruling 80-4)', async () => {
  let read = false;
  const big = { size: BUNDLE_MAX_BYTES + 1, text: async () => { read = true; return ''; } } as unknown as File;
  await assert.rejects(readBundleText(big), BundleTooLargeError);
  assert.equal(read, false);
  assert.equal(await readBundleText(file()), '{"a":1}');
});
