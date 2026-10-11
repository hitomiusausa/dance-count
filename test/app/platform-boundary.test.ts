import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const appDir = path.resolve(import.meta.dirname, '../../src/app');
// 端末依存の入口。ここ以外の src/app から直接触ったら落とす（仕様 §10「lint で禁止」の代わり）。
const DEVICE_GLOBALS = /\b(window|navigator|localStorage|sessionStorage|indexedDB|location|history)\s*[.[]/;

async function sourceFiles(): Promise<string[]> {
  const entries = await fs.readdir(appDir, { recursive: true });
  return entries.filter(entry => /\.(ts|tsx)$/.test(entry)).map(entry => entry.split(path.sep).join('/'));
}

test('only src/app/platform touches window, navigator, storage, location or history', async () => {
  const offenders: string[] = [];
  for (const file of await sourceFiles()) {
    if (file.startsWith('platform/')) continue;
    const lines = (await fs.readFile(path.join(appDir, file), 'utf8')).split('\n');
    lines.forEach((line, index) => {
      if (!line.trim().startsWith('//') && DEVICE_GLOBALS.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, []);
});

test('platform adapters named in spec §10 exist', async () => {
  const files = await sourceFiles();
  for (const name of ['audio-context.ts', 'recorder.ts', 'storage.ts', 'files.ts', 'wake-lock.ts']) {
    assert.ok(files.includes(`platform/${name}`), `missing platform/${name}`);
  }
});
