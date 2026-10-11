// 公開ビルド（dist/）に開発用ページ・未監修データが混ざっていないことを確かめる（Ruling 10）。
// 使い方: npm run build（vite build のあとに自動で実行される）
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const REQUIRED = ['index.html', 'audio/default-en-female-v1/manifest.json'];
const FORBIDDEN_PATHS = [/(^|\/)legacy\//, /six-candidates/, /subdivision-review/, /\.html$/];
// src/engine/data/ 配下の JSON（未監修ルーティン）が1つでも束ねられたら落とす。ファイルごとに固有のキーを置く。
// 新しい JSON を src/engine/data/ に足したら、そのファイル固有のキーをここへ足すこと。
const FORBIDDEN_CONTENT = [
  'legacy-routines-report', 'imported-routine-sources', 'mechanically-valid-unreviewed',
  'issueCounts',   // legacy-routines-report.json 固有
  'printedCounts', 'printedName'   // imported-routine-sources.json 固有
];
// 音声などの実バイナリ以外は拡張子を問わず（.map・.webmanifest・.txt も含め）すべて走査する。
const BINARY_EXT = /\.(wav|mp3|ogg|m4a|png|jpe?g|gif|webp|ico|woff2?|ttf|otf)$/i;

const files = (await fs.readdir(dist, { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile())
  .map(entry => path.relative(dist, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));
const problems = [];
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
