#!/usr/bin/env node
// 公開ビルド（dist/）をそのまま配る小さな静的サーバー（段7・Ruling 95-2）。smoke:pwa が子プロセスで起動し、止めて「オフライン」、
// 別のフォルダ（dist-b）で起動し直して「新しい版」を作る。Node の http だけ（新しい依存なし）。localhost だけで待ち受ける。
// 使い方: node tools/serve-dist.js <フォルダ> <番号>   例: node tools/serve-dist.js dist 4176
import { realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8'
};
// sw.js と index.html は毎回確かめさせる（新しい版に気づけるように）。ほかはハッシュ付きの名前なので長く持たせてよいが、検査では無くてよい。
const NO_CACHE = new Set(['/sw.js', '/index.html', '/manifest.webmanifest']);

export function startServer(dir, port) {
  const root = path.resolve(dir);
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    let decoded;
    try { decoded = decodeURIComponent(url.pathname); } catch { response.writeHead(400).end(); return; }   // 壊れた %エスケープ（URIError）で落ちない
    const pathname = decoded === '/' ? '/index.html' : decoded;
    const file = path.join(root, pathname);
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405).end(); return; }
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    try {
      const body = await fs.readFile(file);
      response.writeHead(200, {
        'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
        'Cache-Control': NO_CACHE.has(pathname) ? 'no-cache' : 'max-age=0'
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      // 本文つきの 404（本文が空だと Chromium はナビゲーションを失敗にする。smoke:pwa の深いパスの確かめ＝段7 レビュー M2）
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not Found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

// 空白のあるパス（このリポジトリ）でも一致するように pathToFileURL で比べる（import.meta.url は空白を %20 にする）。
// import.meta.url は実体のパスなので、シンボリックリンク（macOS の /var → /private/var など）も実体に直して比べる。
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [dir = 'dist', port = '4176'] = process.argv.slice(2);
  await startServer(dir, Number(port));
  console.log(`serving ${dir} at http://localhost:${port}/`);
}
