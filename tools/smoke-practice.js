#!/usr/bin/env node
// 段2の完了条件 G1・G2（仕様 §1）と「戻る」（Ruling 17）を本物の Chrome で確かめる。
// G1: 初回は 表紙の「使う」→ 種目タイル → ▶ の3タップで鳴る（D56・Ruling 118-5）。G2: 2回目以降は表紙の「続きから」・U1 の「前回」カードの1タップで鳴る。
// 「鳴っている」の判定: 2秒判定の警告が出ず、大きなカウント表示が音声の時計に沿って3種類以上変わる
// （表示はエンジンの frame が AudioContext.currentTime から作るので、時計が止まっていれば変わらない）。
// 前提: `npm run dev`（既定 http://localhost:5173/）。DC_BASE_URL で変更可。失敗があれば終了コード1。
import { chromium } from 'playwright-core';

const BASE = process.env.DC_BASE_URL ?? 'http://localhost:5173/';
const SOUND_TIMEOUT_MS = 10000;   // はじめの合図（2小節。ワルツ♩=84で約4.3秒、D17）＋声の読み込みを待っても、この間にカウントが3種類変わること
const errors = [];
const browser = await chromium.launch({ channel: 'chrome' });

async function expectSounding(page, label) {
  const seen = new Set();
  const end = Date.now() + SOUND_TIMEOUT_MS;
  while (Date.now() < end && seen.size < 3) {
    const text = (await page.locator('.dc-now').textContent())?.trim();
    if (text && /^[1-8SQ&a]$/.test(text)) seen.add(text);
    await page.waitForTimeout(100);
  }
  const alert = await page.locator('[data-alert]').getAttribute('data-alert').catch(() => null);
  if (alert === 'no-sound') errors.push(`${label}: no-sound banner shown`);
  if ((await page.locator('[data-screen="S2"]').getAttribute('data-playing')) !== 'true') errors.push(`${label}: not playing`);
  if (seen.size < 3) errors.push(`${label}: count display did not advance (${[...seen].join(', ')})`);
}

try {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, locale: 'ja-JP' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

  // G1: 新しい端末（保存なし）。表紙にも U1 にも前回は出ない → 「使う」→ タイル → ▶ の3タップ。
  await page.goto(BASE);
  await page.waitForSelector('[data-screen="S0"]');
  if (await page.locator('[data-resume]').count()) errors.push('G1: resume shown on the cover on first visit');
  await page.locator('[data-door="use"]').click(); // 1
  await page.waitForSelector('[data-screen="S1"]');
  if (await page.locator('[data-resume]').count()) errors.push('G1: resume card shown on first visit');
  await page.locator('[data-group="dance"] a').first().click(); // 2
  await page.waitForSelector('[data-screen="S2"]');
  await page.locator('[data-play]').click(); // 3
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

  // G2（表紙・D56 Ruling 115-1 の C 案）: 起動（#/）の表紙で「前回の練習 ▶ 続きから」の1タップで鳴る。戻るは履歴で表紙へ。
  await page.goto(BASE);
  await page.waitForSelector('[data-screen="S0"] [data-resume]');
  await page.locator('[data-resume]').click(); // 1
  await page.waitForSelector('[data-screen="S2"]');
  await expectSounding(page, 'G2 from the cover');
  await page.locator('[data-back]').click();
  await page.waitForSelector('[data-screen="S0"]');

  // 下タブの切替は履歴を積まない（D56）: 表紙 → 使う → ルーティン（タブ）→「‹ 表紙」で表紙に着く（U1 に戻らない）
  await page.locator('[data-door="use"]').click();
  await page.waitForSelector('[data-screen="S1"]');
  await page.locator('[data-nav] a').nth(1).click();
  await page.waitForSelector('[data-screen="U2"]');
  await page.locator('[data-back]').click();
  await page.waitForSelector('[data-screen="S0"]');
  await page.goto(`${BASE}#/practice/waltz`);
  await page.waitForSelector('[data-screen="S2"]');

  // 再読み込みした S2 は勝手に鳴らない（Ruling 32）。戻るは履歴が無いので親（U1）へ置き換え、U1 の「‹ 表紙」も親（表紙）へ置き換え。
  await page.reload();
  await page.waitForSelector('[data-screen="S2"]');
  await page.waitForTimeout(1500);
  if ((await page.locator('[data-screen="S2"]').getAttribute('data-playing')) !== 'false') errors.push('reload of S2 started playing by itself');
  await page.locator('[data-back]').click();
  await page.waitForSelector('[data-screen="S1"]');
  if (!page.url().endsWith('#/use')) errors.push(`back without history should replace with #/use (url ${page.url()})`);
  await page.locator('[data-back]').click();
  await page.waitForSelector('[data-screen="S0"]');
  if (!page.url().endsWith('#/')) errors.push(`"‹ Cover" without history should replace with #/ (url ${page.url()})`);
  await context.close();
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('practice smoke OK: G1 (3 taps from the cover) and G2 (1 tap: the U1 card and the cover) play, tabs do not stack history, reload does not autoplay, back falls back to the parent');
