#!/usr/bin/env node
// 段5の完了条件（全体地図・Ruling 87-4）を本物の Chrome と本物のファイルで確かめる。2 つのコンテキスト＝2 台の端末（IndexedDB が別）。
// 先生: 録音の声とルーティンを入れた端末 → S7 で声を開いて「配る」→ S9（声が選ばれている）→ 名前・同意・ルーティン →「ファイルを作る」
//       （共有できない端末として canShare を false に＝ダウンロード）→ ファイル名・結果の 1 行・「案内文をコピー」→ 名前が次回も入っている。
// 生徒: 何も無い端末 → 表紙「使う」→ 下の「ルーティン」→「ファイルから受け取る」→ S10「ファイルを選ぶ」に先生のファイル → 確認 →「使う」→「種目を選ぶ」（U1）→「‹ 表紙」1 回で表紙（Task 1 修正 1。ルーティンだけの時の U2 からも）→
//       ワルツ ▶ が受け取った声で鳴る（標準の声の音声を 1 本も取りに行かない）・チップ「声: 山田さんの声」→ U2「山田さんから」→ 行を押すと S5 で鳴る。
//       同じファイルをもう一度 → 置き換えの 1 行 → 声もルーティンも増えない。旧画面の単体パック・読めない・新しすぎ・大きすぎ・1 本だけ読めない。
//       Android の受け口（Cache の inbox）から確認で始まり、受け取ったら消える。受け取った声は「配る」が無く、消すと標準に戻る。
// ほかの入口（段5 Task 10b）: S8 完成「配る ›」→ S9 はその声が選ばれ 声 → ルーティン の並び。M1 の行の「配る」→ S9 はそのルーティンが選ばれ
//       声は「入れない」・ルーティン → 声 の並び（S8 は偽のマイク＝起動引数。録音の声が完成している端末で「録音をはじめる」→ 完成の画面）。
// 前提: `npm run dev`（既定 http://localhost:5173/）。DC_BASE_URL で変更可。固定ファイルは `node tools/make-share-fixtures.js` で作って commit 済み。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { UI_CHECK_ROUTINES as R, openAfterSeed, seedRoutinesInPage } from './ui-check-routines.js';
import { UI_CHECK_VOICES as V, seedVoicePacksInPage } from './ui-check-voices.js';

const BASE = process.env.DC_BASE_URL ?? 'http://localhost:5173/';
const FIXTURES = path.resolve(import.meta.dirname, '../test/fixtures/share');
const SOUND_TIMEOUT_MS = 10000;
const WRITE_SETTLE_MS = 500;       // 書き込みの確定を待ってから再読み込み（smoke-routines.js と同じ理由）
const STANDARD_AUDIO = '/audio/default-en-female-v1/';
const TOO_LARGE = { name: 'big.dancecount.txt', mimeType: 'text/plain', buffer: Buffer.alloc(20 * 1024 * 1024 + 1, 32) };
const errors = [];

function today() {
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

async function openPage(browser, { canShare = true, microphone = false } = {}) {
  const permissions = ['clipboard-read', 'clipboard-write', ...(microphone ? ['microphone'] : [])];
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, locale: 'ja-JP', acceptDownloads: true, permissions });
  await context.addInitScript(({ canShare }) => {
    if (!canShare) navigator.canShare = () => false;   // 共有できない端末（PC など）＝ダウンロードに切り替わる（§11）
    // 声の語を鳴らす BufferSource の中身の指紋（smoke-voice.js と同じ）
    window.__played = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      const data = this.buffer?.getChannelData(0);
      if (data) {
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) sum += Math.abs(data[i]);
        window.__played.push(`${data.length}:${sum.toFixed(2)}`);
      }
      return start.apply(this, args);
    };
  }, { canShare });
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
  if (seen.size < 3) errors.push(`${label}: count display did not advance (${[...seen].join(', ')})`);
}

async function text(page, selector) {
  return ((await page.locator(selector).first().textContent()) ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

async function expectText(page, expected, label) {
  const body = (await page.locator('body').innerText()).replace(/ /g, ' ');
  if (!body.includes(expected)) errors.push(`${label}: the screen does not say "${expected}"`);
}

async function readStores(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('dance-count-v2');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction(['voice-packs', 'routines']);
      const packs = transaction.objectStore('voice-packs').getAll();
      const routines = transaction.objectStore('routines').getAll();
      transaction.oncomplete = () => {
        db.close();
        resolve({
          packs: packs.result.map(pack => ({ id: pack.id, origin: pack.origin, name: pack.name, distributor: pack.distributor?.name ?? null, sourceId: pack.sourceId ?? null })),
          routines: routines.result.map(routine => ({ id: routine.id, source: routine.source, from: routine.receivedFrom?.distributor ?? null }))
        });
      };
    };
  }));
}

// S10 で「ファイルを選ぶ」に渡す（隠した <input type=file> にファイルを入れる＝ピッカーで選んだのと同じ）。
async function pickFile(page, file) {
  await page.waitForSelector('[data-screen="S10"][data-step="pick"]');
  await page.locator('input[type="file"]').setInputFiles(file);
}

// S9 の見出しの並び（'voice' / 'routines'）と、選ばれている声・ルーティン
async function shareState(page) {
  return page.evaluate(() => ({
    order: [...document.querySelectorAll('.dc-share-heading')].map(heading => heading.id.replace('dc-s9-', '')),
    voice: document.querySelector('[data-group="share-voice"] [role="radio"][aria-checked="true"]')?.textContent?.trim() ?? null,
    routines: [...document.querySelectorAll('.dc-share-list [role="checkbox"][aria-checked="true"] b')].map(name => name.textContent.trim())
  }));
}

async function openReceive(page) {
  await page.goto(`${BASE}#/voices`);
  await page.waitForSelector('[data-screen="S7"]:not([data-loading])');
  await page.locator('.dc-receive-link').click();
  await page.waitForSelector('[data-screen="S10"][data-step="pick"]');
}

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-smoke-share-'));
try {
  // ---- 先生 ----
  const teacher = await openPage(browser, { canShare: false });
  const page = teacher.page;
  await page.goto(BASE);
  await page.waitForSelector('[data-screen]');
  await page.evaluate(seedRoutinesInPage, [R.waltz13]);
  await page.evaluate(seedVoicePacksInPage, [V.completeEn]);
  await openAfterSeed(page, `${BASE}#/voices`);
  await page.waitForSelector('[data-screen="S7"]:not([data-loading])');
  await page.locator('[data-group="voice"] [role="radio"]', { hasText: '自分の声（英語）' }).click();
  await page.locator('[data-group="voice"] [role="radio"]', { hasText: '自分の声（英語）' }).click();
  await page.locator('[data-group="voice-actions"] button', { hasText: '配る' }).click();
  await page.waitForSelector('[data-screen="S9"]:not([data-loading])');
  if ((await page.locator('[data-group="share-voice"] [role="radio"][aria-checked="true"]').textContent())?.trim() !== '自分の声（英語）') errors.push('S9: the voice from S7 is not chosen');
  if (!(await page.locator('.dc-dock .dc-primary').isDisabled())) errors.push('S9: "Create file" is pressable before the name and the consent');
  await page.locator('[data-group="distributor"] input').fill('山田');
  await page.locator('[data-group="distributor"] input').press('Enter');
  await page.locator('.dc-consent-box').click();
  await page.locator('.dc-share-list [role="checkbox"]', { hasText: 'ワルツの練習' }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.dc-dock .dc-primary').click()]);
  const expectedName = `声-山田-${today()}.dancecount.txt`;
  if (download.suggestedFilename() !== expectedName) errors.push(`S9: file name "${download.suggestedFilename()}", expected "${expectedName}"`);
  const teacherFile = path.join(workDir, expectedName);
  await download.saveAs(teacherFile);
  await page.waitForSelector('.dc-result');
  await expectText(page, `「${expectedName}」を保存しました。`, 'S9 result');
  await page.locator('.dc-share-done button', { hasText: '生徒への案内文をコピー' }).click();
  await page.waitForSelector('.dc-result-sub, textarea.dc-instructions');
  if (await page.locator('textarea.dc-instructions').count()) {
    if (!(await page.locator('textarea.dc-instructions').inputValue()).includes('【iPhone】')) errors.push('S9: the instructions box does not hold the instructions');
    if (!(await page.locator('textarea.dc-instructions').inputValue()).split('\n').includes('【iPhone】')) errors.push('S9: 【iPhone】 is not a line of its own (夜間便 A-6)');
  } else {
    const copied = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
    if (!copied.includes('【iPhone】')) errors.push('S9: the copied text is not the instructions');
    else if (!copied.split('\n').includes('【iPhone】')) errors.push('S9: 【iPhone】 is not a line of its own (夜間便 A-6)');
  }
  await page.waitForTimeout(WRITE_SETTLE_MS);
  await page.reload();
  await page.waitForSelector('[data-screen="S9"]:not([data-loading])');
  if ((await page.locator('[data-group="distributor"] input').inputValue()) !== '山田') errors.push('S9: the name is not remembered');
  const bundle = JSON.parse(fs.readFileSync(teacherFile, 'utf8'));
  if (bundle.type !== 'dance-count-bundle' || bundle.distributor?.name !== '山田' || !bundle.consent?.voiceDistribution || bundle.routines?.length !== 1) {
    errors.push(`teacher file: ${JSON.stringify({ type: bundle.type, distributor: bundle.distributor, consent: bundle.consent, routines: bundle.routines?.length })}`);
  }

  // ---- 先生: ほかの入口から S9 へ（段5 Task 9 I1・Task 10b） ----
  const entry = await openPage(browser, { canShare: false, microphone: true });
  const e = entry.page;
  await e.goto(BASE);
  await e.waitForSelector('[data-screen]');
  await e.evaluate(seedRoutinesInPage, [R.waltz13]);
  await e.evaluate(seedVoicePacksInPage, [V.completeEn]);
  await openAfterSeed(e, `${BASE}#/voices/record`);
  await e.waitForSelector('[data-screen="S8"][data-step="intro"]');
  await e.locator('[data-group="record-language"] [role="radio"] >> nth=0').click();
  await e.locator('.dc-dock .dc-primary').click();
  await e.waitForSelector('[data-screen="S8"][data-step="done"]');
  await e.locator('.dc-record-dock .dc-primary', { hasText: '配る' }).click();
  await e.waitForSelector('[data-screen="S9"]:not([data-loading])');
  await e.waitForSelector('[data-group="share-voice"] [role="radio"][aria-checked="true"]');
  const fromS8 = await shareState(e);
  if (fromS8.voice !== '自分の声（英語）' || fromS8.routines.length !== 0 || JSON.stringify(fromS8.order) !== '["voice","routines"]') errors.push(`S9 from S8 "Share": ${JSON.stringify(fromS8)}`);
  await e.goto(`${BASE}#/make/routines`);
  await e.waitForSelector('[data-screen="M1"]');
  await e.locator('.dc-row-head', { hasText: 'ワルツの練習' }).click();
  await e.locator('[data-group="routine-actions"] button', { hasText: '配る' }).click();
  await e.waitForSelector('[data-screen="S9"]:not([data-loading])');
  const fromM1 = await shareState(e);
  if (fromM1.voice !== '入れない' || JSON.stringify(fromM1.routines) !== '["ワルツの練習"]' || JSON.stringify(fromM1.order) !== '["routines","voice"]') errors.push(`S9 from the M1 row "Share": ${JSON.stringify(fromM1)}`);
  await entry.context.close();

  // ---- 生徒（別の端末） ----
  const student = await openPage(browser);
  const s = student.page;
  // D56（Ruling 115-7・117-4）: 案内文の 2 行目と同じ道（表紙「使う」→ 下の「ルーティン」→「ファイルから受け取る」）
  await s.goto(BASE);
  await s.waitForSelector('[data-screen="S0"]');
  await s.locator('[data-door="use"]').click();
  await s.waitForSelector('[data-screen="S1"]');
  await s.locator('[data-nav] a').nth(1).click();
  await s.waitForSelector('[data-screen="U2"]');
  await s.locator('.dc-receive-link').click();
  await pickFile(s, teacherFile);
  await s.waitForSelector('[data-step="confirm"]');
  await expectText(s, '山田さんの声（英語）· 12 語', 'S10 confirm');
  await expectText(s, 'ルーティン 1 本: ワルツの練習', 'S10 confirm');
  await s.locator('.dc-receive-dock .dc-primary').click();
  await s.waitForSelector('[data-step="done"]');
  await expectText(s, '「使う」で種目を選んで ▶ を押すと、山田さんの声で鳴ります。', 'S10 done');
  await expectText(s, 'ルーティンは、「使う」の下のタブ「ルーティン」にあります。', 'S10 done routines');   // Fable 答え 2026-10-13 §2-2
  await s.locator('.dc-dock .dc-primary').click();
  await s.waitForSelector('[data-screen="S1"]');
  if (!s.url().endsWith('#/use')) errors.push(`S10 "Choose a dance" should land on U1 (url ${s.url()})`);
  await s.waitForTimeout(WRITE_SETTLE_MS);
  // 最終レビュー I1: S10 の文のとおり下の「ルーティン」へ（U2）。その後も「‹ 表紙」1 回で表紙
  // （Task 1 修正 1・Repro B の S0 → U1 → U2 → S10 → U1 の列に、タブ U2 を足した形。U1 からの 1 回は router-back のテスト）
  await s.locator('[data-nav] a').nth(1).click();
  await s.waitForSelector('[data-screen="U2"]');
  await s.locator('[data-back]').click();
  await s.waitForSelector('[data-screen="S0"]', { timeout: 3000 }).catch(() => errors.push(`U2 (tab) after receiving: one "‹ Cover" tap did not reach the cover (url ${s.url()})`));

  // ワルツ ▶ が受け取った声で鳴る: 読み直した S2 で ▶ の間、標準の声の音声は 1 本も要求されない（smoke-voice.js と同じ証明）
  await s.goto(`${BASE}#/practice/waltz`);
  await s.waitForSelector('[data-screen="S2"]');
  const hits = [];
  const onRequest = request => { if (request.url().includes(STANDARD_AUDIO)) hits.push(request.url()); };
  s.on('request', onRequest);
  await s.reload();
  await s.waitForSelector('[data-screen="S2"]');
  await s.waitForFunction(() => document.querySelector('[data-voice-chip]')?.textContent?.includes('山田さんの声'), null, { timeout: 3000 })
    .catch(async () => errors.push(`S2 chip: "${await text(s, '[data-voice-chip]')}"`));
  await s.evaluate(() => { window.__played = []; });
  await s.locator('[data-play]').click();
  await expectSounding(s, 'S2 with the received voice');
  await s.locator('[data-play]').click();
  s.off('request', onRequest);
  if (hits.length) errors.push(`S2 with the received voice: standard audio requested (${hits.length})`);
  if (!(await s.evaluate(() => window.__played.length))) errors.push('S2 with the received voice: no voice buffer was played');

  // U2「山田さんから」→ 行を押すとすぐ S5 で鳴る（D56 Ruling 115-2）
  await s.goto(`${BASE}#/use/routines`);
  await s.waitForSelector('[data-screen="U2"]');
  const row = await text(s, '.dc-row-head');
  if (!row.includes('ワルツの練習') || !row.includes('山田さんから')) errors.push(`U2 row: "${row}"`);
  await s.locator('.dc-row--play').first().click();
  await s.waitForSelector('[data-screen="S5"]');
  await expectSounding(s, 'S5 received routine');
  await s.locator('[data-play]').click();

  // 同じファイルをもう一度 → 置き換え（増えない。D38）
  await openReceive(s);
  await pickFile(s, teacherFile);
  await s.waitForSelector('[data-step="confirm"]');
  await expectText(s, '山田さんの声はすでにあります。「使う」で新しい方に置き換わります。', 'S10 again');
  await expectText(s, '同じルーティンは新しい方に置き換わります。', 'S10 again');
  await s.locator('.dc-receive-dock .dc-primary').click();
  await s.waitForSelector('[data-step="done"]');
  await s.waitForTimeout(WRITE_SETTLE_MS);
  const afterAgain = await readStores(s);
  if (afterAgain.packs.filter(pack => pack.origin === 'received').length !== 1) errors.push(`after the same file again: voices ${JSON.stringify(afterAgain.packs)}`);
  if (afterAgain.routines.length !== 1 || afterAgain.routines[0].source !== 'received' || afterAgain.routines[0].from !== '山田') errors.push(`after the same file again: routines ${JSON.stringify(afterAgain.routines)}`);
  if (afterAgain.packs[0]?.sourceId !== 'user-recorded-v1' || !/^v-/.test(afterAgain.packs[0]?.id ?? '')) errors.push(`received voice ids: ${JSON.stringify(afterAgain.packs)}`);

  // 旧画面の単体パック（名前の無いファイル）は声の名前で受け取れる
  await openReceive(s);
  await pickFile(s, path.join(FIXTURES, 'legacy-voice-pack.json'));
  await s.waitForSelector('[data-step="confirm"]');
  await expectText(s, 'My recorded voice（英語）· 12 語', 'S10 legacy');
  await s.locator('.dc-receive-dock .dc-primary').click();
  await s.waitForSelector('[data-step="done"]');

  // 読めない・新しすぎ・大きすぎは選ぶ画面の枠。1 本だけ読めないルーティンは確認に名前が出る（やめるで戻る）
  for (const [file, alert] of [[path.join(FIXTURES, 'broken.txt'), 'broken'], [path.join(FIXTURES, 'too-new.txt'), 'too-new'], [TOO_LARGE, 'too-large']]) {
    await openReceive(s);
    await pickFile(s, file);
    await s.waitForSelector(`[data-alert="${alert}"]`, { timeout: 5000 }).catch(() => errors.push(`S10: the "${alert}" notice was not shown`));
  }
  await openReceive(s);
  await pickFile(s, path.join(FIXTURES, 'bundle-one-broken-routine.dancecount.txt'));
  await s.waitForSelector('[data-step="confirm"]');
  await expectText(s, 'ルーティン「こわれたルーティン」は読めませんでした。', 'S10 one broken routine');
  await s.locator('.dc-receive-dock .dc-button--secondary').click();
  await s.waitForSelector('[data-step="pick"]');

  // Android の受け口（Ruling 79-2）: Cache に置いたファイルで確認から始まり、受け取ったら消える
  const inboxText = fs.readFileSync(path.join(FIXTURES, 'bundle-routines-only.dancecount.txt'), 'utf8');
  await s.evaluate(async text => {
    const cache = await caches.open('dance-count-inbox');
    await cache.put('./inbox/bundle', new Response(text, { headers: { 'Content-Type': 'text/plain', 'X-File-Name': encodeURIComponent('ルーティン-山田-2026-10-12.dancecount.txt') } }));
  }, inboxText);
  await s.goto(`${BASE}#/`);
  await s.waitForSelector('[data-screen="S0"]');
  await s.goto(`${BASE}#/receive`);
  await s.waitForSelector('[data-step="confirm"]', { timeout: 5000 }).catch(() => errors.push('inbox: S10 did not start on the confirm step'));
  await expectText(s, 'ルーティン 1 本: ワルツのルーティン', 'inbox confirm');
  if (await s.evaluate(async () => Boolean(await (await caches.open('dance-count-inbox')).match('./inbox/bundle')))) errors.push('inbox: the file is still in the inbox');
  await s.locator('.dc-receive-dock .dc-button--secondary').click();

  // 新しすぎるファイルを共有して「更新する」を押しても、ファイルは失われない（段7 最終レビュー m1）: 更新の後の S10 がもう一度読む
  //（ここは SW の無い dev なので再読み込みだけ＝同じ版のまま、もう一度「新しすぎ」が出ることで、受け口に戻ったことを確かめる）
  const tooNewText = fs.readFileSync(path.join(FIXTURES, 'too-new.txt'), 'utf8');
  await s.evaluate(async text => {
    await (await caches.open('dance-count-inbox')).put('./inbox/bundle', new Response(text, { headers: { 'Content-Type': 'text/plain', 'X-File-Name': encodeURIComponent('too-new.txt') } }));
  }, tooNewText);
  await s.goto(`${BASE}#/`);
  await s.waitForSelector('[data-screen="S0"]');
  await s.goto(`${BASE}#/receive`);
  await s.waitForSelector('[data-alert="too-new"]', { timeout: 5000 }).catch(() => errors.push('m1: the shared too-new file did not show "too new"'));
  await Promise.all([s.waitForEvent('load', { timeout: 10000 }).catch(() => errors.push('m1: 「更新する」 did not reload')), s.locator('[data-alert="too-new"] [data-alert-action]').click()]);
  await s.waitForSelector('[data-alert="too-new"]', { timeout: 5000 }).catch(() => errors.push('m1: after 「更新する」 the shared file was lost (S10 did not read it again)'));
  if (await s.evaluate(async () => Boolean(await (await caches.open('dance-count-inbox')).match('./inbox/bundle')))) errors.push('m1: the too-new file is still in the inbox after S10 read it again');

  // Task 1 修正 1（Repro A）: 表紙 → 使う → ルーティン（タブ）→ 受け取る → ルーティンだけ受け取った →「ルーティンを見る」（U2）→「‹ 表紙」1 回で表紙
  await s.goto(`${BASE}#/`);
  await s.reload();   // 見てきた列を表紙 1 つから始める
  await s.waitForSelector('[data-screen="S0"]');
  await s.locator('[data-door="use"]').click();
  await s.waitForSelector('[data-screen="S1"]');
  await s.locator('[data-nav] a').nth(1).click();
  await s.waitForSelector('[data-screen="U2"]');
  await s.locator('.dc-receive-link').click();
  await pickFile(s, path.join(FIXTURES, 'bundle-routines-only.dancecount.txt'));
  await s.waitForSelector('[data-step="confirm"]');
  await s.locator('.dc-receive-dock .dc-primary').click();
  await s.waitForSelector('[data-step="done"]');
  await s.locator('.dc-dock .dc-primary').click();
  await s.waitForSelector('[data-screen="U2"]');
  if (!s.url().endsWith('#/use/routines')) errors.push(`S10 "See routines" should land on U2 (url ${s.url()})`);
  await s.locator('[data-back]').click();
  await s.waitForSelector('[data-screen="S0"]', { timeout: 3000 }).catch(() => errors.push(`U2 after receiving: one "‹ Cover" tap did not reach the cover (url ${s.url()})`));

  // 受け取った声は配れない（D37）・消すと標準（英語）に戻る
  await s.goto(`${BASE}#/voices`);
  await s.waitForSelector('[data-screen="S7"]:not([data-loading])');
  const yamada = s.locator('[data-group="voice"] [role="radio"]', { hasText: '山田さんの声' });
  await yamada.click();
  await yamada.click();
  const actions = await s.locator('[data-group="voice-actions"] button').allTextContents();
  if (JSON.stringify(actions.map(label => label.trim())) !== JSON.stringify(['削除'])) errors.push(`received voice actions: ${JSON.stringify(actions)}`);
  await s.locator('[data-group="voice-actions"] button', { hasText: '削除' }).click();
  await s.locator('dialog[open] .dc-primary').click();
  await s.waitForTimeout(WRITE_SETTLE_MS);
  const chosen = (await s.locator('[data-group="voice"] [role="radio"][aria-checked="true"]').textContent())?.trim();
  if (chosen !== '標準の声（英語）') errors.push(`S7 after deleting the received voice: chosen "${chosen}"`);
} finally {
  await browser.close();
  fs.rmSync(workDir, { recursive: true, force: true });
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('share smoke OK: S8 "Share" and the M1 row "Share" open S9 with that voice / routine chosen; teacher file made (download) → student received it → S2 played the received voice, U2/S5 the routine; same file replaced, legacy file received, broken / too new / too large / one broken routine handled, inbox taken once, a too-new shared file survives 「更新する」, received voice not shareable and deleted; one "‹ Cover" tap reaches the cover after receiving');
