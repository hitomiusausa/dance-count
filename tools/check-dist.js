// 公開ビルド（dist/）に開発用ページ・未監修データが混ざっていないことを確かめる（Ruling 10）。
// 使い方: npm run build（vite build のあとに自動で実行される）
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const REQUIRED = ['index.html', 'audio/default-en-female-v1/manifest.json'];
const FORBIDDEN_PATHS = [/(^|\/)legacy\//, /six-candidates/, /subdivision-review/, /\.html$/];
// src/engine/data/ 配下の JSON（未監修ルーティン）が1つでも束ねられたら落とす。ファイルごとに固有のキー（目印）を置く。
// 新しい JSON を src/engine/data/ に足したら、下の DATA_MARKERS にそのファイル固有の目印を足すこと（足し忘れは自己検査で落ちる）。
const DATA_MARKERS = {
  'legacy-routines-report.json': ['legacy-routines-report', 'mechanically-valid-unreviewed', 'issueCounts'],
  'imported-routine-sources.json': ['imported-routine-sources', 'printedCounts', 'printedName']
};
const FORBIDDEN_CONTENT = Object.values(DATA_MARKERS).flat();
// 音声などの実バイナリ以外は拡張子を問わず（.map・.webmanifest・.txt も含め）すべて走査する。
const BINARY_EXT = /\.(wav|mp3|ogg|m4a|png|jpe?g|gif|webp|ico|woff2?|ttf|otf)$/i;

// 自己検査: src/engine/data/ の全 JSON に目印があり、その目印が本当にファイルの中にあること。
const dataDir = path.join(root, 'src/engine/data');
const problems = [];
for (const name of (await fs.readdir(dataDir)).filter(file => file.endsWith('.json'))) {
  const markers = DATA_MARKERS[name];
  if (!markers) { problems.push(`src/engine/data/${name} has no marker in DATA_MARKERS (tools/check-dist.js)`); continue; }
  const text = await fs.readFile(path.join(dataDir, name), 'utf8');
  if (!markers.some(marker => text.includes(marker))) problems.push(`src/engine/data/${name} contains none of its markers ${markers.join(', ')}`);
}

const files = (await fs.readdir(dist, { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile())
  .map(entry => path.relative(dist, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));
for (const file of REQUIRED) if (!files.includes(file)) problems.push(`missing ${file}`);
for (const file of files) {
  if (file !== 'index.html' && FORBIDDEN_PATHS.some(pattern => pattern.test(file))) problems.push(`must not ship ${file}`);
  if (!BINARY_EXT.test(file)) {
    const text = await fs.readFile(path.join(dist, file), 'utf8');
    for (const word of FORBIDDEN_CONTENT) if (text.includes(word)) problems.push(`${file} contains "${word}"`);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`dist OK: ${files.length} files, no legacy pages or unreviewed data`);
