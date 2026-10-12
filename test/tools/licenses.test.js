// 段8（D48）: 同梱するライセンスの全文は node_modules の LICENSE と同じ（版を上げて写し忘れたら落ちる）。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { LICENSE_FILES } from '../../tools/licenses.js';

const root = path.resolve(import.meta.dirname, '../..');

test('each bundled license is a byte-for-byte copy of the package LICENSE', () => {
  for (const [published, source] of Object.entries(LICENSE_FILES)) {
    assert.ok(fs.readFileSync(path.join(root, 'public', published)).equals(fs.readFileSync(path.join(root, source))), published);
  }
  assert.match(fs.readFileSync(path.join(root, 'public/licenses/NotoSansJP-OFL.txt'), 'utf8'), /SIL Open Font License, Version 1\.1/);
});

test('every Workbox package the service worker uses carries the same MIT text', () => {
  for (const name of ['workbox-precaching', 'workbox-routing', 'workbox-strategies', 'workbox-expiration', 'workbox-core', 'workbox-window']) {
    assert.ok(fs.readFileSync(path.join(root, 'node_modules', name, 'LICENSE')).equals(fs.readFileSync(path.join(root, 'public/licenses/Workbox-MIT.txt'))), name);
  }
});
