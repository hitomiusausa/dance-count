// 公開ビルド（dist/）に開発用ページ・未監修データが混ざっていないことを確かめる（Ruling 10）。
// 使い方: npm run build（vite build のあとに自動で実行される）。公開ビルドは RELEASE=1 PUBLIC_APP_URL=https://… npm run build（URL が空なら失敗）
import fs from 'node:fs/promises';
import path from 'node:path';
import { neededFontSubsets } from './fonts/needed-subsets.js';
import { LICENSE_FILES } from './licenses.js';
import { checkPwaDist, precacheSummary } from './pwa/check-pwa.js';
import { appUrlLine, isRelease, releaseAppUrlProblem } from './release/app-url.js';
import { checkDistAudio, findSecrets, loadStandardVoices } from './voices/check-pack.js';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
// 標準音声は src/app/voices/standard-voices.json が正本（Ruling 68-3）。JSON に無いパック・聴感ゲート未通過のパックは出荷しない。
const standardVoices = await loadStandardVoices();
// 段8: ライセンスの全文（D48。書体の OFL は同梱が条件）
const REQUIRED = ['index.html', 'sw.js', 'manifest.webmanifest', ...standardVoices.map(voice => `audio/${voice.id}/manifest.json`), ...Object.keys(LICENSE_FILES)];
const FORBIDDEN_PATHS = [/(^|\/)legacy\//, /six-candidates/, /subdivision-review/, /\.html$/];
// src/engine/data/ 配下の JSON（未監修ルーティン）が1つでも束ねられたら落とす。ファイルごとに固有のキー（目印）を置く。
// 新しい JSON を src/engine/data/ に足したら、下の DATA_MARKERS にそのファイル固有の目印を足すこと（足し忘れは自己検査で落ちる）。
const DATA_MARKERS = {
  'legacy-routines-report.json': ['legacy-routines-report', 'mechanically-valid-unreviewed', 'issueCounts'],
  'imported-routine-sources.json': ['imported-routine-sources', 'printedCounts', 'printedName']
};
// 監修シート（docs/app-v1/figure-counts-review.md・D52・Ruling 110-2）の見出しの目印。シートや未監修の案を誰かが import したら落とす。
const REVIEW_SHEET_MARKER = 'FIGURE-COUNTS-DRAFT';
const FORBIDDEN_CONTENT = [...Object.values(DATA_MARKERS).flat(), REVIEW_SHEET_MARKER, '__music/', 'Paper Umbrella', '387307378d92a627'];
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
    for (const secret of findSecrets(text)) problems.push(`${file} contains a credential: ${secret}`);
  }
}
for (const problem of await checkDistAudio(dist, standardVoices)) if (!problems.includes(problem)) problems.push(problem);
// 段7: Service Worker・manifest・precache（Ruling 89・93）
for (const problem of await checkPwaDist({ dist, files, standardVoices, fontSubsets: neededFontSubsets(root) })) if (!problems.includes(problem)) problems.push(problem);
// 段8 Task 12（final-review I2）: 公開ビルド（RELEASE=1）は案内文の URL が要る（vite.config.ts と同じ環境変数を見る）
const appUrl = process.env.PUBLIC_APP_URL ?? '';
const urlProblem = releaseAppUrlProblem({ release: isRelease(process.env.RELEASE), url: appUrl });
if (urlProblem) problems.push(urlProblem);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
const precache = await precacheSummary(dist);
console.log(`dist OK: ${files.length} files, no legacy pages or unreviewed data, voices: ${standardVoices.map(voice => voice.id).join(', ')}, `
  + `precache ${precache.entries} entries ${(precache.bytes / 1024 / 1024).toFixed(2)} MB, ${appUrlLine(appUrl)}`);
