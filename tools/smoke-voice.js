#!/usr/bin/env node
// 段4の完了条件（全体地図・Ruling 63-5）を本物の Chrome と偽マイク（WAV ファイル）で確かめる。
// S1「先生の声で練習」→ S7「自分の声を録音する」→ S8 英語 →「録音をはじめる」→ 3 語録って「戻る」→ S7 に「· 3 / 12 語」→
// 開いて「続きを録音する」→ 4 語目から 12 語目まで（録るたびに波形と「聞く」）→ 完成 → 聞き比べ（自分の声・標準の声が鳴って止まる）→
// 「完了」→ S7 で選ばれている → S2 ワルツが自分の声で鳴る・チップ「声: 自分の声（英語）」→ 再読み込みでも同じ →
// くわしくの「早く」×2 で「−20 ms」→ 再読み込みでも残る → S7 で削除 → チップ「声: 標準（英語）」。
// 無音の本: 別のブラウザを無音の WAV で起動 → 1 語目「録音する」→「声が入っていませんでした」・「次へ」は押せない。
// 前提: `npm run dev`（既定 http://localhost:5173/）。DC_BASE_URL で変更可。偽マイクの WAV は `node tools/make-fake-mic-wav.js` で作って commit 済み。
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE = process.env.DC_BASE_URL ?? 'http://localhost:5173/';
const FIXTURES = path.resolve(import.meta.dirname, '../test/fixtures/voice');
const SOUND_TIMEOUT_MS = 10000;
const TAKE_TIMEOUT_MS = 8000;      // getUserMedia（〜0.3 秒）＋ 1.5 秒の録音 ＋ 正規化と保存
const WRITE_SETTLE_MS = 500;       // 書き込みの確定を待ってから再読み込み（smoke-routines.js と同じ理由）
const errors = [];

function launch(wav) {
  return chromium.launch({
    channel: 'chrome',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${path.join(FIXTURES, wav)}`]
  });
}

async function openPage(browser) {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, locale: 'ja-JP', permissions: ['microphone'] });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  return { context, page };
}

async function expectSounding(page, label) {
  const seen = new Set();
  const end = Date.now() + SOUND_TIMEOUT_MS;
  while (Date.now() < end && seen.size < 3) {
    const text = (await page.locator('.dc-now').textContent())?.trim();
    if (text && /^[1-8SQ&a]$/.test(text)) seen.add(text);
    await page.waitForTimeout(100);
  }
  const alert = await page.locator('[data-alert]').getAttribute('data-alert').catch(() => null);
  if (alert === 'no-sound' || alert === 'voice-missing') errors.push(`${label}: ${alert} shown`);
  if (seen.size < 3) errors.push(`${label}: count display did not advance (${[...seen].join(', ')})`);
}

async function chipText(page) {
  return (await page.locator('[data-voice-chip]').textContent())?.trim();
}

// 今の語を録る: 「録音する」→ 録音中は押せない → 波形と「聞く」が出て、ボタンが「録り直す」に戻る。
async function recordWord(page, label) {
  await page.locator('.dc-rec').click();
  try {
    await page.waitForSelector('.dc-take', { timeout: TAKE_TIMEOUT_MS });
    await page.waitForSelector('.dc-rec:not([disabled])', { timeout: TAKE_TIMEOUT_MS });
  } catch {
    const alert = await page.locator('[data-alert]').getAttribute('data-alert').catch(() => null);
    errors.push(`${label}: no take (alert ${alert})`);
    return false;
  }
  return true;
}

async function wordNumber(page) {
  return Number((await page.locator('.dc-record-progress-text b').textContent())?.trim());
}

const browser = await launch('fake-mic.wav');
try {
  const { page } = await openPage(browser);
  await page.goto(BASE);
  await page.waitForSelector('[data-screen="S1"]');
  await page.locator('[data-teacher-card]').click();
  await page.waitForSelector('[data-screen="S7"]:not([data-loading])');
  await page.locator('.dc-record-link').click();
  await page.waitForSelector('[data-step="intro"]');
  if ((await page.locator('[data-group="record-language"] [role="radio"]').first().getAttribute('aria-checked')) !== 'true') errors.push('S8: English is not the first choice');
  await page.locator('.dc-dock .dc-primary').click();
  await page.waitForSelector('[data-step="word"]');

  // 3 語録って戻る（Ruling 59-2: 1 語ごとに保存済み）
  for (let word = 1; word <= 3; word += 1) {
    if ((await wordNumber(page)) !== word) errors.push(`S8: expected word ${word}, at ${await wordNumber(page)}`);
    if (!(await recordWord(page, `word ${word}`))) break;
    if (word === 1 && (await page.locator('.dc-record-dock .dc-button--secondary').count())) errors.push('S8: "Previous" on the first word');
    await page.locator('.dc-record-dock .dc-primary').click();
  }
  await page.waitForTimeout(WRITE_SETTLE_MS);
  await page.locator('[data-back]').click();
  await page.waitForSelector('[data-screen="S7"]:not([data-loading])');
  const partial = (await page.locator('.dc-voice-partial').textContent())?.replace(/\u00a0/g, ' ').trim(); // 「3 / 12 語」は改行しない空白（U+00A0）でつないである
  if (partial !== '自分の声（英語） · 3 / 12 語') errors.push(`S7: partial row reads "${partial}"`);
  await page.locator('.dc-voice-partial').click();
  await page.locator('[data-group="voice-actions"] .dc-button').first().click();
  await page.waitForSelector('[data-step="intro"]');
  const progressLine = (await page.locator('[data-group="record-language"] [aria-checked="true"] small').textContent())?.replace(/\u00a0/g, ' ').trim();
  if (progressLine !== '3 / 12 語まで録音済み') errors.push(`S8 intro: progress reads "${progressLine}"`);
  await page.locator('.dc-dock .dc-primary').click();
  await page.waitForSelector('[data-step="word"]');

  for (let word = 4; word <= 12; word += 1) {
    if ((await wordNumber(page)) !== word) errors.push(`S8: expected word ${word}, at ${await wordNumber(page)}`);
    if (!(await recordWord(page, `word ${word}`))) break;
    await page.locator('.dc-record-dock .dc-primary').click();
  }
  await page.waitForSelector('[data-step="done"]');

  // 聞き比べ（Ruling 59-5）: 押した方が鳴り（aria-pressed）、2 小節で自分で止まる。
  for (const index of [0, 1]) {
    const button = page.locator('[data-group="compare"] button').nth(index);
    await button.click();
    await page.waitForFunction(element => element.getAttribute('aria-pressed') === 'true', await button.elementHandle(), { timeout: 3000 })
      .catch(() => errors.push(`compare ${index}: did not start`));
    await page.waitForFunction(element => element.getAttribute('aria-pressed') === 'false', await button.elementHandle(), { timeout: SOUND_TIMEOUT_MS })
      .catch(() => errors.push(`compare ${index}: did not end by itself`));
  }
  await page.locator('.dc-dock .dc-primary').click();
  await page.waitForSelector('[data-screen="S7"]:not([data-loading])');
  const chosen = (await page.locator('[data-group="voice"] [role="radio"][aria-checked="true"]').textContent())?.trim();
  if (chosen !== '自分の声（英語）') errors.push(`S7: chosen row is "${chosen}"`);

  // S2 が自分の声で鳴る（段4の完了条件）
  await page.goto(`${BASE}#/practice/waltz`);
  await page.waitForSelector('[data-screen="S2"]');
  await page.waitForFunction(() => document.querySelector('[data-voice-chip]')?.textContent?.includes('自分の声'), null, { timeout: 3000 })
    .catch(() => errors.push(`S2 chip: "${'?'}"`));
  await page.locator('[data-play]').click();
  await expectSounding(page, 'S2 with my voice');
  await page.locator('[data-play]').click();
  await page.reload();
  await page.waitForSelector('[data-screen="S2"]');
  await page.waitForTimeout(300);
  if ((await chipText(page)) !== '声: 自分の声（英語）') errors.push(`S2 after reload: chip "${await chipText(page)}"`);

  // 声のタイミング（Ruling 62）: 早く ×2 → −20 ms。録音の声そのものに保存される。
  await page.locator('summary[data-more]').click();
  for (let i = 0; i < 2; i += 1) await page.locator('[data-group="voice-offset"] .dc-chip').first().click();
  if ((await page.locator('[data-voice-offset]').textContent())?.trim() !== '−20 ms') errors.push(`voice offset: "${await page.locator('[data-voice-offset]').textContent()}"`);
  await page.waitForTimeout(WRITE_SETTLE_MS);
  await page.reload();
  await page.waitForSelector('[data-screen="S2"]');
  await page.locator('summary[data-more]').click();
  await page.waitForTimeout(300);
  if ((await page.locator('[data-voice-offset]').textContent())?.trim() !== '−20 ms') errors.push('voice offset was not kept after reload');

  // 削除 → 標準に戻る（Ruling 60-4）
  await page.goto(`${BASE}#/voices`);
  await page.waitForSelector('[data-screen="S7"]:not([data-loading])');
  await page.locator('[data-group="voice"] [role="radio"][aria-checked="true"]').click();
  await page.locator('[data-group="voice-actions"] .dc-button').last().click();
  await page.locator('dialog[open] .dc-primary').click();
  await page.waitForTimeout(WRITE_SETTLE_MS);
  const after = (await page.locator('[data-group="voice"] [role="radio"][aria-checked="true"]').textContent())?.trim();
  if (after !== '標準の声（英語）') errors.push(`S7 after delete: chosen "${after}"`);
  await page.goto(`${BASE}#/practice/waltz`);
  await page.waitForSelector('[data-screen="S2"]');
  await page.waitForTimeout(300);
  if ((await chipText(page)) !== '声: 標準（英語）') errors.push(`S2 after delete: chip "${await chipText(page)}"`);
} finally {
  await browser.close();
}

// 無音の本（Ruling 58）
const silent = await launch('silence.wav');
try {
  const { page } = await openPage(silent);
  await page.goto(`${BASE}#/voices/record`);
  await page.waitForSelector('[data-step="intro"]');
  await page.locator('.dc-dock .dc-primary').click();
  await page.waitForSelector('[data-step="word"]');
  await page.locator('.dc-rec').click();
  await page.waitForSelector('[data-alert="no-voice"]', { timeout: TAKE_TIMEOUT_MS }).catch(() => errors.push('silence: "no voice" was not shown'));
  if (!(await page.locator('.dc-record-dock .dc-primary').isDisabled())) errors.push('silence: "Next" is pressable');
  if (await page.locator('.dc-take').count()) errors.push('silence: a take is shown');
} finally {
  await silent.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('voice smoke OK: 12 words recorded (with a break), compared, chosen, played in S2, timing kept, deleted; silence is refused');
