#!/usr/bin/env node
// アプリのアイコン（D62: うさぎのワルツ。絵の元は src/app/brand/rabbit.ts だけ）を作る。PNG は commit する（ビルドでは作らない）。
// 使い方: node tools/make-icons.js（Google Chrome で描いて撮る。新しい依存なし）。絵を変える時は rabbit.ts を直して再実行する。
// 作る物: public/icons/icon.svg（ブラウザのタブ・角丸）・icon-192.png・icon-512.png（角丸・角は透明）・icon-512-maskable.png（全面・絵は安全域 80% の円の内側）・
// apple-touch-icon.png（180・全面・透明なし。iOS が角を丸める）。
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { rabbitIconSvg } from '../src/app/brand/rabbit.ts';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'public/icons');

export const ICONS = [
  { file: 'icon-192.png', size: 192, shape: 'rounded', placement: 'any' },
  { file: 'icon-512.png', size: 512, shape: 'rounded', placement: 'any' },
  { file: 'icon-512-maskable.png', size: 512, shape: 'square', placement: 'maskable' },
  { file: 'apple-touch-icon.png', size: 180, shape: 'square', placement: 'any' }
];

// リポジトリのパスに空白があるので file:// を手で組まず pathToFileURL で比べる（%20 になる）
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'icon.svg'), `${rabbitIconSvg({ shape: 'rounded' })}\n`);
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    for (const icon of ICONS) {
      const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size }, deviceScaleFactor: 1 });
      await page.setContent(`<!doctype html><style>html, body { margin: 0; background: transparent; } svg { display: block; }</style>${rabbitIconSvg(icon)}`);
      await page.screenshot({ path: path.join(outDir, icon.file), omitBackground: icon.shape === 'rounded' });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`icons written to ${path.relative(root, outDir)}: icon.svg, ${ICONS.map(icon => icon.file).join(', ')}`);
}
