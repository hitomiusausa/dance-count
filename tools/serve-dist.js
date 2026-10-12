#!/usr/bin/env node
// 公開ビルド（dist/）をそのまま配る小さな静的サーバー（段7・Ruling 95-2）。smoke:pwa が子プロセスで起動し、止めて「オフライン」、
// 別のフォルダ（dist-b）で起動し直して「新しい版」を作る。Node の http だけ（新しい依存なし）。localhost だけで待ち受ける。
// 使い方: node tools/serve-dist.js <フォルダ> <番号>   例: node tools/serve-dist.js dist 4176
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

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
    const pathname = decodeURIComponent(url.pathname) === '/' ? '/index.html' : decodeURIComponent(url.pathname);
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
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir = 'dist', port = '4176'] = process.argv.slice(2);
  await startServer(dir, Number(port));
  console.log(`serving ${dir} at http://localhost:${port}/`);
}
