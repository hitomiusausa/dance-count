#!/usr/bin/env node
// 段2の完了条件 G1・G2（仕様 §1）と「戻る」（Ruling 17）を本物の Chrome で確かめる。
// G1: 初回は 種目タイル → ▶ の2タップで鳴る。G2: 2回目以降は「前回」カードの1タップで鳴る。
// 「鳴っている」の判定: 2秒判定の警告が出ず、大きなカウント表示が音声の時計に沿って3種類以上変わる
// （表示はエンジンの frame が AudioContext.currentTime から作るので、時計が止まっていれば変わらない）。
// 前提: `npm run dev`（既定 http://localhost:5173/）。DC_BASE_URL で変更可。失敗があれば終了コード1。
import { chromium } from 'playwright-core';

const BASE = process.env.DC_BASE_URL ?? 'http://localhost:5173/';
const LISTEN_MS = 4000;
const errors = [];
const browser = await chromium.launch({ channel: 'chrome' });

async function countsSeen(page) {
  const seen = new Set();
  const end = Date.now() + LISTEN_MS;
  while (Date.now() < end) {
    const text = (await page.locator('.dc-now').textContent())?.trim();
    if (text) seen.add(text);
    await page.waitForTimeout(100);
  }
  return seen;
}

async function expectSounding(page, label) {
  const seen = await countsSeen(page);
  const alert = await page.locator('[data-alert]').getAttribute('data-alert').catch(() => null);
  if (alert === 'no-sound') errors.push(`${label}: no-sound banner shown`);
  if ((await page.locator('[data-screen="S2"]').getAttribute('data-playing')) !== 'true') errors.push(`${label}: not playing`);
  const counts = [...seen].filter(text => /^[1-8SQ&a]$/.test(text));
  if (counts.length < 3) errors.push(`${label}: count display did not advance (${[...seen].join(', ')})`);
}

try {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, locale: 'ja-JP' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

  // G1: 新しい端末（保存なし）。前回カードは出ない → タイル → ▶ の2タップ。
  await page.goto(BASE);
  await page.waitForSelector('[data-screen="S1"]');
  if (await page.locator('[data-resume]').count()) errors.push('G1: resume card shown on first visit');
  await page.locator('[data-group="dance"] a').first().click(); // 1
  await page.waitForSelector('[data-screen="S2"]');
  await page.locator('[data-play]').click(); // 2
  await expectSounding(page, 'G1');

  // 戻る（履歴あり）: S1 へ戻り、前回カードが出る。
  await page.locator('[data-back]').click();
  await page.waitForSelector('[data-screen="S1"]');
  if (!(await page.locator('[data-resume]').count())) errors.push('G2: resume card missing after a visit');

  // G2: 再読み込み（印はメモリだけなので消える）→ 前回カードの1タップで鳴る。
  await page.reload();
  await page.waitForSelector('[data-resume]');
  await page.locator('[data-resume]').click(); // 1
  await page.waitForSelector('[data-screen="S2"]');
  await expectSounding(page, 'G2');

  // 再読み込みした S2 は勝手に鳴らない（Ruling 32）。戻るは履歴が無いので親（S1）へ置き換え。
  await page.reload();
  await page.waitForSelector('[data-screen="S2"]');
  await page.waitForTimeout(1500);
  if ((await page.locator('[data-screen="S2"]').getAttribute('data-playing')) !== 'false') errors.push('reload of S2 started playing by itself');
  await page.locator('[data-back]').click();
  await page.waitForSelector('[data-screen="S1"]');
  if (!page.url().endsWith('#/')) errors.push(`back without history should replace with #/ (url ${page.url()})`);
  await context.close();
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('practice smoke OK: G1 (2 taps) and G2 (1 tap) play, reload does not autoplay, back falls back to the parent');
