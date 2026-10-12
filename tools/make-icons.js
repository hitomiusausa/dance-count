#!/usr/bin/env node
// アプリのアイコン（段7・Ruling 93-2・D44 の仮の絵: 紺 #1B2A4A に白の太字「DC」Inter 800）を作る。PNG は commit する（ビルドでは作らない）。
// 使い方: node tools/make-icons.js（Google Chrome で描いて撮る。新しい依存なし）。絵を変える時は iconSvg() だけを直して再実行する。
// 作る物: public/icons/icon.svg（ブラウザのタブ）・icon-192.png・icon-512.png（角丸・角は透明）・icon-512-maskable.png（全面・字は安全域 80% の内側）・
// apple-touch-icon.png（180・全面・透明なし。iOS が角を丸める）。
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'public/icons');
const NAVY = '#1B2A4A';
const WHITE = '#FFFFFF';
const LABEL = 'DC';

// shape: 'rounded'（角丸 22%・角は透明）／'square'（全面）。textScale: 字の幅の目安（1 辺に対する割合。maskable は安全域の内側に小さく）
export function iconSvg({ size, shape, textScale }) {
  const radius = shape === 'rounded' ? Math.round(size * 0.22) : 0;
  const fontSize = Math.round(size * textScale);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`
    + `<rect width="${size}" height="${size}" rx="${radius}" fill="${NAVY}"/>`
    + `<text x="50%" y="50%" dy="0.36em" text-anchor="middle" fill="${WHITE}" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="${fontSize}" letter-spacing="${-Math.round(fontSize * 0.02)}">${LABEL}</text>`
    + '</svg>';
}

const ICONS = [
  { file: 'icon-192.png', size: 192, shape: 'rounded', textScale: 0.42 },
  { file: 'icon-512.png', size: 512, shape: 'rounded', textScale: 0.42 },
  { file: 'icon-512-maskable.png', size: 512, shape: 'square', textScale: 0.34 },
  { file: 'apple-touch-icon.png', size: 180, shape: 'square', textScale: 0.42 }
];

// リポジトリのパスに空白があるので file:// を手で組まず pathToFileURL で比べる（%20 になる）
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'icon.svg'), `${iconSvg({ size: 512, shape: 'rounded', textScale: 0.42 })}\n`);
  const inter = await fs.readFile(path.join(root, 'node_modules/@fontsource/inter/files/inter-latin-800-normal.woff2'));
  const fontFace = `@font-face { font-family: Inter; font-weight: 800; src: url(data:font/woff2;base64,${inter.toString('base64')}) format('woff2'); }`;
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    for (const icon of ICONS) {
      const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size }, deviceScaleFactor: 1 });
      await page.setContent(`<!doctype html><style>${fontFace} html, body { margin: 0; background: transparent; }</style>${iconSvg(icon)}`);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(outDir, icon.file), omitBackground: icon.shape === 'rounded' });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`icons written to ${path.relative(root, outDir)}: icon.svg, ${ICONS.map(icon => icon.file).join(', ')}`);
}
