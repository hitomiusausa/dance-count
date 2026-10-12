// 段7の番人（Ruling 89-2・89-3・93-4・93-6）。公開ビルド（dist/）の Service Worker・manifest・アイコン・precache を確かめる。
// check-dist.js が呼ぶ。純粋（ファイルを読むだけ）。テストは test/tools/check-pwa.test.js（作り物の dist で 1 項目ずつ壊す）。
import fs from 'node:fs/promises';
import path from 'node:path';
import { FONT_WEIGHTS, fontFileMatches } from '../fonts/needed-subsets.js';

// precache の合計の上限（Ruling 89-3）。日本語の標準の声（≒0.8MB）が入っても余る。
export const PRECACHE_MAX_BYTES = 6 * 1024 * 1024;
export const REQUIRED_WORD_FILES = 12;   // 標準の声 1 つの語の数（manifest.json と別に 12 の WAV）

// dist/sw.js に注入された precache の一覧（[{"revision":…,"url":…}, …]）を取り出す。見つからなければ null。
export function readPrecacheList(swText) {
  const start = swText.indexOf('[{"revision"');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  for (let index = start; index < swText.length; index += 1) {
    const char = swText[index];
    if (inString) {
      if (char === '\\') index += 1;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) return JSON.parse(swText.slice(start, index + 1));
    }
  }
  return null;
}

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

// dist: dist の絶対パス・files: dist の中の全ファイル（/ 区切り）・standardVoices: standard-voices.json・fontSubsets: neededFontSubsets()
export async function checkPwaDist({ dist, files, standardVoices, fontSubsets }) {
  const problems = [];
  // 1. SW と manifest は dist 直下（受け口の鍵 ./inbox/bundle が index.html と同じ URL に解ける。Ruling 93-4）
  for (const file of ['sw.js', 'manifest.webmanifest']) if (!files.includes(file)) problems.push(`missing ${file} at the root of dist`);
  if (problems.length) return problems;
  const html = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
  for (const [pattern, what] of [[/<link rel="manifest" href="\.\/manifest\.webmanifest"/, 'manifest link'], [/<link rel="apple-touch-icon" href="\.\/icons\/apple-touch-icon\.png"/, 'apple-touch-icon link'],
    [/<meta name="apple-mobile-web-app-title" content="Dance Count"/, 'apple-mobile-web-app-title']]) {
    if (!pattern.test(html)) problems.push(`index.html has no ${what}`);
  }
  if (!files.includes('icons/apple-touch-icon.png')) problems.push('missing icons/apple-touch-icon.png');

  // 2. manifest（Ruling 93-1・93-3・93-6）
  let manifest = null;
  try { manifest = JSON.parse(await fs.readFile(path.join(dist, 'manifest.webmanifest'), 'utf8')); } catch { problems.push('manifest.webmanifest is not JSON'); }
  if (manifest) {
    if (manifest.short_name !== 'Dance Count' || manifest.name !== 'Dance Count') problems.push('manifest name/short_name must be "Dance Count"');
    if (manifest.display !== 'standalone') problems.push('manifest display must be standalone');
    if (manifest.start_url !== './' || manifest.scope !== './') problems.push('manifest start_url and scope must be "./"');
    const target = manifest.share_target;
    if (target?.action !== './receive' || target?.method !== 'POST' || target?.enctype !== 'multipart/form-data' || target?.params?.files?.[0]?.name !== 'bundle') {
      problems.push('manifest share_target must post the "bundle" file to ./receive (Ruling 79-2)');
    }
    for (const icon of manifest.icons ?? []) if (!files.includes(icon.src)) problems.push(`manifest icon ${icon.src} is not in dist`);
    if (!(manifest.icons ?? []).some(icon => icon.purpose === 'maskable')) problems.push('manifest has no maskable icon');
  }

  // 3. precache の一覧（Ruling 89）
  const list = readPrecacheList(await fs.readFile(path.join(dist, 'sw.js'), 'utf8'));
  if (!list) return [...problems, 'dist/sw.js has no precache list'];
  const urls = list.map(entry => entry.url);
  for (const url of new Set(urls.filter((url, index) => urls.indexOf(url) !== index))) problems.push(`precache lists ${url} twice`);
  for (const url of urls) if (!(await exists(path.join(dist, url)))) problems.push(`precache lists ${url} but dist has no such file`);
  for (const file of ['index.html', 'manifest.webmanifest']) if (!urls.includes(file)) problems.push(`precache is missing ${file}`);
  for (const file of files.filter(file => /^assets\/[^/]+\.(js|css)$/.test(file))) if (!urls.includes(file)) problems.push(`precache is missing ${file}`);
  for (const file of files.filter(file => file.startsWith('icons/'))) if (!urls.includes(file)) problems.push(`precache is missing ${file}`);
  // 標準の声: standard-voices.json の各パックの manifest と 12 語の WAV が全部（6c で日本語が入った日に自動で要求される。Ruling 89-2）
  for (const voice of standardVoices) {
    const prefix = `audio/${voice.id}/`;
    if (!urls.includes(`${prefix}manifest.json`)) problems.push(`precache is missing ${prefix}manifest.json`);
    const words = urls.filter(url => url.startsWith(prefix) && url.endsWith('.wav')).length;
    if (words !== REQUIRED_WORD_FILES) problems.push(`precache has ${words} word files for ${voice.id}, expected ${REQUIRED_WORD_FILES}`);
  }
  // 書体: 要るサブセット × 4 太さの woff2 が全部・.woff は無い・要らない Noto のサブセットは無い（膨らみの検出）
  const expectedFonts = files.filter(file => fontFileMatches(file, fontSubsets));
  const expectedCount = fontSubsets.length * FONT_WEIGHTS.length;
  if (expectedFonts.length !== expectedCount) problems.push(`dist has ${expectedFonts.length} needed font files, expected ${expectedCount} (${fontSubsets.length} subsets × ${FONT_WEIGHTS.length} weights)`);
  for (const file of expectedFonts) if (!urls.includes(file)) problems.push(`precache is missing the font ${file}`);
  for (const url of urls) {
    if (url.endsWith('.woff')) problems.push(`precache must not include .woff (${url})`);
    else if (url.endsWith('.woff2') && !fontFileMatches(url, fontSubsets)) problems.push(`precache includes a font subset the app text does not need (${url})`);
  }
  let total = 0;
  for (const url of urls) {
    try { total += (await fs.stat(path.join(dist, url))).size; } catch { /* 上で報告済み */ }
  }
  if (total > PRECACHE_MAX_BYTES) problems.push(`precache is ${total} bytes > ${PRECACHE_MAX_BYTES}`);
  return problems;
}

// 表示用の内訳（check-dist の最後の 1 行）
export async function precacheSummary(dist) {
  const list = readPrecacheList(await fs.readFile(path.join(dist, 'sw.js'), 'utf8')) ?? [];
  let bytes = 0;
  for (const entry of list) {
    try { bytes += (await fs.stat(path.join(dist, entry.url))).size; } catch { /* 無い物は番人が落とす */ }
  }
  return { entries: list.length, bytes };
}
