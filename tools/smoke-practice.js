#!/usr/bin/env node
// 段2の完了条件 G1・G2（仕様 §1）と「戻る」（Ruling 17）を本物の Chrome で確かめる。
// G1: 初回は 表紙の「使う」→ 種目タイル → ▶ の3タップで鳴る（D56・Ruling 118-5）。G2: 2回目以降は表紙の「続きから」・U1 の「前回」カードの1タップで鳴る。
// 「鳴っている」の判定: 2秒判定の警告が出ず、大きなカウント表示が音声の時計に沿って3種類以上変わる
// （表示はエンジンの frame が AudioContext.currentTime から作るので、時計が止まっていれば変わらない）。
// 前提: `npm run dev`（既定 http://localhost:5173/）。DC_BASE_URL で変更可。失敗があれば終了コード1。
import { chromium } from 'playwright-core';
import { figureDisplayName } from '../src/app/routines/figure-names.ts';
import { reviewedFigures } from '../src/app/routines/reviewed-counts.ts';

const BASE = process.env.DC_BASE_URL ?? 'http://localhost:5173/';
const SOUND_TIMEOUT_MS = 10000;   // はじめの合図（2小節。ワルツ♩=84で約4.3秒、D17）＋声の読み込みを待っても、この間にカウントが3種類変わること
const STRIP_WATCH_MS = 9000;      // ジャイブ（はじめの合図 2 小節＋型 1 周以上）を見る長さ
const errors = [];
let figureNote = '';
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
  // D57（Ruling 119-7）: 監修済みのフィガーがある種目（ワルツ）は F1 に着き、一番上の「基本のカウント」を押すとすぐ鳴る（3 タップのまま）。無ければ S2 の ▶
  await page.waitForSelector('[data-screen="S2"], [data-screen="F1"]');
  const viaFigures = await page.locator('[data-screen="F1"]').count() > 0;
  await page.locator(viaFigures ? '[data-basic]' : '[data-play]').click(); // 3
  await page.waitForSelector('[data-screen="S2"]');
  await expectSounding(page, 'G1');

  // 戻る（履歴あり）: S1 へ戻り（F1 を通ったら F1 → S1）、前回カードが出る。
  await page.locator('[data-back]').click();
  if (viaFigures) {
    await page.waitForSelector('[data-screen="F1"]');
    await page.locator('[data-back]').click();
  }
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

  // D57（Ruling 122-3）: U1 → ワルツ → F1 → 2 行目（表の 1 件目のフィガー）を押すとすぐ鳴る → 見出しの下に名前 →「‹ 戻る」で F1 →「‹ 戻る」で U1。
  // 監修表にワルツが無い間は「スキップ」
  const waltzFigures = reviewedFigures('waltz');
  if (waltzFigures.length === 0) figureNote = 'F1 skipped (no reviewed waltz figures)';
  else {
    await page.goto(`${BASE}#/use`);
    await page.waitForSelector('[data-screen="S1"]');
    await page.locator('[data-group="dance"] a').first().click();
    await page.waitForSelector('[data-screen="F1"]');
    await page.locator('[data-list] [data-figure]').first().click();
    await page.waitForSelector('[data-screen="S2"]');
    await expectSounding(page, 'F1 figure');
    const name = figureDisplayName('waltz', waltzFigures[0].englishName, 'ja-JP');
    const heading = (await page.locator('.dc-playhead small').textContent())?.trim() ?? '';
    if (!heading.startsWith(`${name} · `)) errors.push(`D57: the S2 heading reads "${heading}", expected "${name} · …"`);
    if (!page.url().endsWith(`#/practice/waltz/${waltzFigures[0].slug}`)) errors.push(`D57: S2 url ${page.url()}`);
    await page.locator('[data-back]').click();
    await page.waitForSelector('[data-screen="F1"]');
    await page.locator('[data-back]').click();
    await page.waitForSelector('[data-screen="S1"]');
    const resume = (await page.locator('[data-resume] .dc-resume-text b').textContent())?.trim();
    if (resume !== `ワルツ · ${name}`) errors.push(`D57: the last-time card reads "${resume}"`);
    figureNote = `F1 → ${waltzFigures[0].slug} played`;
  }

  // D55（Ruling 114-9）: ジャイブを鳴らすと、帯の琥珀の丸（aria-current）が 1 2 3 a 4 5 a 6 の順に進み、大きな語と同じ文字。時間は実再生・判定は順序だけ
  await page.goto(`${BASE}#/practice/jive`);
  await page.waitForSelector('[data-screen="S2"]');
  await page.locator('[data-play]').click();
  const strip = [];
  const stripEnd = Date.now() + STRIP_WATCH_MS;
  while (Date.now() < stripEnd) {
    strip.push(await page.evaluate(() => {
      const cells = [...document.querySelectorAll('.dc-beats li')];
      const lit = cells.findIndex(cell => cell.getAttribute('aria-current') === 'true');
      // 夜間便 B-5: はじめの合図の間の灰の丸（.dc-beats[data-lead]）は別に数える（琥珀の丸と大きな語の一致は鳴っている間だけ）
      const lead = document.querySelector('.dc-beats')?.hasAttribute('data-lead') ?? false;
      return { lit: lead ? -1 : lit, lead: lead ? lit : -1, label: lit >= 0 ? cells[lit].textContent.trim() : null, now: document.querySelector('.dc-now')?.textContent.trim() ?? '', cells: cells.length };
    }));
    await page.waitForTimeout(40);
  }
  await page.locator('[data-play]').click();
  const lit = strip.filter(sample => sample.lit >= 0);
  // 夜間便 B-5（Ruling 124）: 合図の間は灰の丸が 1 語ずつ進む（2 つ以上の丸を通る・大きな語は「はじめの合図…」のまま）
  const leads = strip.filter(sample => sample.lead >= 0);
  if (new Set(leads.map(sample => sample.lead)).size < 2) errors.push(`B-5: the count-in did not move the grey cell (${JSON.stringify(leads.map(sample => sample.lead))})`);
  if (leads.some(sample => /^[1-8a&]$/.test(sample.now))) errors.push('B-5: a count number was shown during the count-in');
  if (strip.some(sample => sample.cells !== 8)) errors.push(`D55: the jive strip should have 8 cells (${[...new Set(strip.map(sample => sample.cells))].join(', ')})`);
  const steps = lit.map(sample => sample.lit).filter((index, i, all) => i === 0 || index !== all[i - 1]);
  const backwards = steps.filter((index, i) => i > 0 && index < steps[i - 1] && !(index === 0 && steps[i - 1] >= 6));
  if (backwards.length) errors.push(`D55: the lit cell moved backwards ${JSON.stringify(steps)}`);
  if (!['1', '2', '3', '4', '5', '6'].every(label => lit.some(sample => sample.label === label))) errors.push(`D55: the lit cell did not visit 1–6 (${[...new Set(lit.map(sample => sample.label))].join(' ')})`);
  if (!steps.some((index, i) => i > 0 && index === 0 && steps[i - 1] >= 6)) errors.push(`D55: the strip did not wrap from 6 back to 1 (${JSON.stringify(steps)})`);
  const disagree = lit.filter(sample => sample.now && sample.label !== sample.now).length;
  if (disagree > lit.length * 0.1) errors.push(`D55: the lit cell and the big count disagree in ${disagree} of ${lit.length} samples`);
  await context.close();
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`practice smoke OK: ${figureNote}; the jive strip lights 1 2 3 a 4 5 a 6 in order with the big count (the count-in moves a grey cell, B-5); G1 (3 taps from the cover) and G2 (1 tap: the U1 card and the cover) play, tabs do not stack history, reload does not autoplay, back falls back to the parent`);
