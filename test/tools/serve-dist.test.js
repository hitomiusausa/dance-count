// 段7 レビュー I-1・m-1: serve-dist は空白のあるパスでもコマンドとして起動し、壊れた %エスケープで落ちない。
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../../tools/serve-dist.js';

const STARTUP_TIMEOUT_MS = 10000;

async function makeDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dc serve '));   // 空白入り（このリポジトリのパスと同じ条件）
  await fs.writeFile(path.join(dir, 'index.html'), '<p>ok</p>');
  return dir;
}

test('a malformed percent-escape is answered 400 and the server keeps serving (m-1)', async t => {
  const server = await startServer(await makeDir(), 0);
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/%E0%A4%A`)).status, 400);
  const page = await fetch(`${base}/`);
  assert.equal(page.status, 200);
  assert.equal(await page.text(), '<p>ok</p>');
  assert.equal((await fetch(`${base}/missing`)).status, 404);
});

test('run as a command from a path with spaces, it serves (I-1)', async t => {
  const dir = await makeDir();
  const script = path.join(dir, 'tools dir', 'serve-dist.js');
  await fs.mkdir(path.dirname(script));
  await fs.copyFile(path.resolve(import.meta.dirname, '../../tools/serve-dist.js'), script);
  const child = spawn(process.execPath, [script, dir, '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => child.kill());
  const line = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('serve-dist did not start')), STARTUP_TIMEOUT_MS);
    child.stdout.on('data', data => { clearTimeout(timer); resolve(String(data)); });
    child.on('exit', code => { clearTimeout(timer); reject(new Error(`serve-dist exited (${code}) without serving`)); });
  });
  assert.match(line, /^serving /);
});
