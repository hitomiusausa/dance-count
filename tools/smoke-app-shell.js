// 段1の器の目視前チェック: 新アプリ（下タブ3つ・S1/S3/S6・言語）と legacy/ の旧画面（標準音声の読み込み）を
// 375×667 と 1280×900 で開き、スクリーンショットを保存する。console error・pageerror があれば終了コード1。
// 前提: `npm run dev`（5173）と `npm run legacy`（4173）を別ターミナルで起動しておく。
// 保存先は DC_SHOT_DIR（既定 output/playwright）。ファイル名は ${DC_SHOT_PREFIX:-stage1}-*.png。
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const APP_URL = process.env.DC_APP_URL ?? 'http://localhost:5173/';
const LEGACY_URL = process.env.DC_LEGACY_URL ?? 'http://localhost:4173/legacy/';
const outDir = path.resolve(process.env.DC_SHOT_DIR ?? path.join(import.meta.dirname, '../output/playwright'));
const prefix = process.env.DC_SHOT_PREFIX ?? 'stage1';
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
const watch = (page, label) => {
  page.on('console', message => { if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`); });
  page.on('pageerror', error => errors.push(`${label} pageerror: ${error.message}`));
};
const expectEqual = (label, actual, expected) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};

try {
  for (const [width, height] of [[375, 667], [1280, 900]]) {
    for (const [locale, tabs, heading] of [
      ['ja-JP', ['練習', 'ルーティン', '設定'], '種目を選んでください'],
      ['en-US', ['Practice', 'Routines', 'Settings'], 'Choose a dance']
    ]) {
      const label = `${width} ${locale}`;
      const context = await browser.newContext({ viewport: { width, height }, locale });
      const page = await context.newPage();
      watch(page, label);
      await page.goto(APP_URL);
      await page.waitForSelector('[data-screen="S1"]');
      expectEqual(`${label} tabs`, await page.locator('[data-nav] a').allTextContents(), tabs);
      expectEqual(`${label} S1 heading`, await page.locator('[data-screen="S1"] h2').textContent(), heading);
      await page.screenshot({ path: path.join(outDir, `${prefix}-s1-${width}-${locale}.png`), fullPage: true });
      await page.locator('[data-nav] a').nth(1).click();
      await page.waitForSelector('[data-screen="S3"]');
      await page.locator('[data-nav] a').nth(2).click();
      await page.waitForSelector('[data-screen="S6"]');
      await page.screenshot({ path: path.join(outDir, `${prefix}-s6-${width}-${locale}.png`), fullPage: true });
      await page.goBack();
      await page.waitForSelector('[data-screen="S3"]');
      await page.goto(`${APP_URL}#/nope/nope`);
      await page.waitForSelector('[data-screen="S1"]');
      await page.locator('[data-utility]').click();
      expectEqual(`${label} language toggled`, await page.locator('[data-nav] a').first().textContent(), locale === 'ja-JP' ? 'Practice' : '練習');
      await context.close();
    }
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  watch(page, 'legacy');
  const voiceResponses = [];
  page.on('response', response => { if (response.url().includes('/public/audio/default-en-female-v1/')) voiceResponses.push(response.status()); });
  await page.goto(`${LEGACY_URL}practice.html`);
  await page.locator('#play').click(); // 標準音声は再生ボタンで初めて読み込まれる
  await page.waitForTimeout(1500);
  expectEqual('legacy voice files (13 = manifest + 12 words, all 200)', voiceResponses, Array(13).fill(200));
  await page.goto(`${LEGACY_URL}routine-editor.html`);
  await page.waitForTimeout(1000);
  await context.close();
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`smoke OK. screenshots in ${path.relative(process.cwd(), outDir)}/${prefix}-*.png`);
