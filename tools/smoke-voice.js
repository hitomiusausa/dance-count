#!/usr/bin/env node
// 段4の完了条件（全体地図・Ruling 63-5）を本物の Chrome と偽マイク（WAV ファイル）で確かめる。
// 表紙「作る」→ M0「自分の声を録音する」→ S8 英語 →「録音をはじめる」→ 3 語録って「戻る」→ M0 に「英語 · 3 / 12 語 · 続きから」→ S7 に「· 3 / 12 語」→
// 開いて「続きを録音する」→ 4 語目から 12 語目まで（録るたびに波形と「聞く」）→ 完成 → 聞き比べ（自分の声・標準の声が鳴って止まる）→
// 「完了」→ S7 で選ばれている → S2 ワルツが自分の声で鳴る・チップ「声: 自分の声（英語）」→ 再読み込みでも同じ →
// くわしくの「早く」×2 で「−20 ms」→ 再読み込みでも残る → S7 で削除 → チップ「声: 標準（英語）」。
// 録音の声で鳴ることの証明: 12 語が IndexedDB の voice-packs に入っている → 新しく読み直して選ぶ → ▶ の間、標準の声の音声
// （/audio/default-en-female-v1/）が 1 本も要求されない。対照として、標準の声を選ぶと同じ操作で要求される。
// 無音の本: 別のブラウザを無音の WAV（全 0）と、とても小さい声の WAV（0 ではないが RMS が基準未満）で起動 → 1 語目「録音する」→
// 「声が入っていませんでした」・「次へ」は押せない。
// D64: 3 語録った後、12 語のチップで 2 語目・12 語目・4 語目へ移る（合図の間はチップを押せない）。
// 前提: `npm run dev`（既定 http://localhost:5173/）。DC_BASE_URL で変更可。偽マイクの WAV は `node tools/make-fake-mic-wav.js` で作って commit 済み。
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE = process.env.DC_BASE_URL ?? 'http://localhost:5173/';
const FIXTURES = path.resolve(import.meta.dirname, '../test/fixtures/voice');
const SOUND_TIMEOUT_MS = 10000;
const TAKE_TIMEOUT_MS = 12000;     // getUserMedia（〜0.3 秒）＋ 合図 3.3 秒（D59）＋ 2 秒の録音 ＋ 正規化と保存
const CUE_GUARD_S = 0.1;           // 録音の開始は合図の最後の音の終わり＋この秒より後（設計は 0.15 秒。D59）
const WRITE_SETTLE_MS = 500;       // 書き込みの確定を待ってから再読み込み（smoke-routines.js と同じ理由）
const STANDARD_AUDIO = '/audio/default-en-female-v1/';
const PREVIEW_MS = 2500;           // 試聴を鳴らして指紋を集める時間
const errors = [];

function launch(wav) {
  return chromium.launch({
    channel: 'chrome',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${path.join(FIXTURES, wav)}`]
  });
}

async function openPage(browser) {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, locale: 'ja-JP', permissions: ['microphone'] });
  // 声の語を鳴らす BufferSource の中身の指紋を window.__played に残す（どの声の音が実際に鳴ったかを見る）。
  await context.addInitScript(() => {
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
    // D59: 合図の音（OscillatorNode）の終わりの予約時刻と、MediaRecorder.start の時の音の時計。合図が録音に入らない証拠。
    window.__cues = [];
    window.__recStarts = [];
    const stop = OscillatorNode.prototype.stop;
    OscillatorNode.prototype.stop = function (when) {
      window.__cue = this.context;
      if (when !== undefined) window.__cues.push(when);
      else window.__cues.push(this.context.currentTime);
      return stop.call(this, when);
    };
    const recStart = MediaRecorder.prototype.start;
    MediaRecorder.prototype.start = function (...args) {
      window.__recStarts.push(window.__cue ? window.__cue.currentTime : null);
      return recStart.apply(this, args);
    };
  });
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

// 今の語を録る: 「録音する」→ 合図（3・2・1・今。D59）→ 録音中は押せない → 波形と「聞く」が出て、ボタンが「録り直す」に戻る。
// 録音の開始（MediaRecorder.start）は、合図の最後の音の終わり（音の時計）＋余白より後（合図の音が録音に入らない）。
async function recordWord(page, label) {
  await page.evaluate(() => { window.__cues = []; window.__recStarts = []; });
  await page.locator('.dc-rec').click();
  try {
    await page.waitForSelector('[data-phase="countdown"] .dc-rec-count', { timeout: 2000 });
    await page.waitForSelector('[data-phase="capture"] .dc-rec:disabled', { timeout: TAKE_TIMEOUT_MS });
    const { cues, starts } = await page.evaluate(() => ({ cues: window.__cues, starts: window.__recStarts }));
    if (cues.length !== 4) errors.push(`${label}: ${cues.length} cue sounds, expected 4 (pi pi pi pōn)`);
    else if (starts.length !== 1 || starts[0] === null || starts[0] < Math.max(...cues) + CUE_GUARD_S) {
      errors.push(`${label}: recording started at ${starts[0]} s, the last cue ends at ${Math.max(...cues)} s (needs +${CUE_GUARD_S} s)`);
    }
    await page.waitForSelector('.dc-take', { timeout: TAKE_TIMEOUT_MS });
    await page.waitForSelector('.dc-rec:not([disabled])', { timeout: TAKE_TIMEOUT_MS });
  } catch {
    const alert = await page.locator('[data-alert]').getAttribute('data-alert').catch(() => null);
    errors.push(`${label}: no take (alert ${alert})`);
    return false;
  }
  return true;
}

// IndexedDB voice-packs の中身（id・origin・録れた語の数）をページの中から読む。
async function readPacks(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('dance-count-v2');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const all = open.result.transaction('voice-packs').objectStore('voice-packs').getAll();
      all.onerror = () => reject(all.error);
      all.onsuccess = () => { open.result.close(); resolve(all.result.map(pack => ({ origin: pack.origin, words: Object.keys(pack.words ?? {}).length }))); };
    };
  }));
}

// 新しく読み直して ▶ を押し、その間に標準の声の音声が何本要求されたかを返す。
async function standardRequestsWhilePlaying(page, label) {
  const hits = [];
  const onRequest = request => { if (request.url().includes(STANDARD_AUDIO)) hits.push(request.url()); };
  page.on('request', onRequest);
  await page.reload();
  await page.waitForSelector('[data-screen="S2"]');
  await page.waitForTimeout(300);
  const played = await playAndCollect(page, label);
  page.off('request', onRequest);
  return { hits, played };
}

// ▶ で鳴らし、鳴った語の指紋（重複なし）を返す。
async function playAndCollect(page, label) {
  await page.evaluate(() => { window.__played = []; });
  await page.locator('[data-play]').click();
  await expectSounding(page, label);
  await page.locator('[data-play]').click();
  return [...new Set(await page.evaluate(() => window.__played))];
}

// D64: 今の語＝12 語のチップの aria-current="step"（1 から数える）
async function wordNumber(page) {
  return page.locator('[data-group="record-words"] .dc-record-chip').evaluateAll(chips => chips.findIndex(chip => chip.getAttribute('aria-current') === 'step') + 1);
}

const browser = await launch('fake-mic.wav');
try {
  const { page } = await openPage(browser);
  // D56（Ruling 115-3）: 録音の入口は表紙の「作る」→ M0 の行
  await page.goto(BASE);
  await page.waitForSelector('[data-screen="S0"]');
  await page.locator('[data-door="make"]').click();
  await page.waitForSelector('[data-screen="M0"]:not([data-loading])');
  await page.locator('a.dc-hub[href="#/voices/record"]').click();
  await page.waitForSelector('[data-step="intro"]');
  if ((await page.locator('[data-group="record-language"] [role="radio"]').first().getAttribute('aria-checked')) !== 'true') errors.push('S8: English is not the first choice');
  await page.locator('.dc-dock .dc-primary').click();
  await page.waitForSelector('[data-step="word"]');

  // D59: 合図の間にもう一度押すと「やめる」＝何も保存しない・録音は始まらない・波形は出ない
  await page.evaluate(() => { window.__recStarts = []; });
  await page.locator('.dc-rec').click();
  await page.waitForSelector('[data-phase="countdown"]');
  await page.waitForTimeout(1200);
  await page.locator('.dc-rec').click();
  await page.waitForSelector('[data-phase="idle"]', { timeout: 2000 }).catch(() => errors.push('cancel: the countdown did not stop'));
  await page.waitForTimeout(3000);   // やめなければ録音が始まっていた時刻を過ぎるまで待つ
  if ((await page.evaluate(() => window.__recStarts.length)) !== 0) errors.push('cancel: a recording started after "Cancel"');
  if (await page.locator('.dc-take').count()) errors.push('cancel: a take is shown');
  if ((await readPacks(page)).some(pack => pack.words > 0)) errors.push('cancel: a word was saved');

  // 3 語録って戻る（Ruling 59-2: 1 語ごとに保存済み）
  for (let word = 1; word <= 3; word += 1) {
    if ((await wordNumber(page)) !== word) errors.push(`S8: expected word ${word}, at ${await wordNumber(page)}`);
    if (!(await recordWord(page, `word ${word}`))) break;
    if (word === 1 && (await page.locator('.dc-record-dock .dc-button--secondary').count())) errors.push('S8: "Previous" on the first word');
    await page.locator('.dc-record-dock .dc-primary').click();
  }
  // D64: チップを押すとその語へ（録れた 2 語目＝波形が出る・まだの 12 語目＝波形なし）。合図の間はチップを押せない（やめると押せる）
  const chip = n => page.locator('[data-group="record-words"] .dc-record-chip').nth(n - 1);
  await chip(2).click();
  await page.waitForSelector('.dc-take').catch(() => {});
  if ((await wordNumber(page)) !== 2 || !(await page.locator('.dc-take').count())) errors.push(`chips: tapping word 2 shows word ${await wordNumber(page)} (take ${await page.locator('.dc-take').count()})`);
  await page.locator('.dc-rec').click();
  await page.waitForSelector('[data-phase="countdown"]');
  if (!(await chip(5).isDisabled())) errors.push('chips: tappable during the countdown');
  await page.locator('.dc-rec').click();
  await page.waitForSelector('[data-phase="idle"]', { timeout: 2000 });
  if (await chip(5).isDisabled()) errors.push('chips: still disabled after "Cancel"');
  await chip(12).click();
  if ((await wordNumber(page)) !== 12 || (await page.locator('.dc-take').count())) errors.push(`chips: tapping word 12 shows word ${await wordNumber(page)}`);
  await chip(4).click();
  if ((await wordNumber(page)) !== 4) errors.push(`chips: back to word 4 shows word ${await wordNumber(page)}`);
  if ((await readPacks(page)).some(pack => pack.words !== 3)) errors.push(`chips: the saved words changed ${JSON.stringify(await readPacks(page))}`);

  await page.waitForTimeout(WRITE_SETTLE_MS);
  await page.locator('[data-back]').click();
  await page.waitForSelector('[data-screen="M0"]:not([data-loading])');
  const status = (await page.locator('a.dc-hub[href="#/voices/record"] small').textContent())?.trim();
  if (status !== '英語 · 3 / 12 語 · 続きから') errors.push(`M0: the recording row reads "${status}"`);
  await page.goto(`${BASE}#/voices`);
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
  await page.waitForTimeout(WRITE_SETTLE_MS);
  const stored = await readPacks(page);
  if (stored.length !== 1 || stored[0].origin !== 'recorded' || stored[0].words !== 12) errors.push(`IndexedDB voice-packs: ${JSON.stringify(stored)}`);

  // 聞き比べ（Ruling 59-5）: 押した方が鳴り（aria-pressed）、2 小節で自分で止まる。
  for (const index of [0, 1]) {
    const button = page.locator('[data-group="compare"] button').nth(index);
    await button.click();
    await page.waitForFunction(element => element.getAttribute('aria-pressed') === 'true', await button.elementHandle(), { timeout: 3000 })
      .catch(() => errors.push(`compare ${index}: did not start`));
    await page.waitForFunction(element => element.getAttribute('aria-pressed') === 'false', await button.elementHandle(), { timeout: SOUND_TIMEOUT_MS })
      .catch(() => errors.push(`compare ${index}: did not end by itself`));
  }
  // 段5（D39）: 完成の帯は「完了」（左）と「配る ›」（右・主ボタン）。ここは「完了」で S7 へ
  await page.locator('.dc-record-dock button', { hasText: '完了' }).click();
  await page.waitForSelector('[data-screen="S7"]:not([data-loading])');
  const chosen = (await page.locator('[data-group="voice"] [role="radio"][aria-checked="true"]').textContent())?.trim();
  if (chosen !== '自分の声（英語）') errors.push(`S7: chosen row is "${chosen}"`);

  // S2 が自分の声で鳴る（段4の完了条件）
  await page.goto(`${BASE}#/practice/waltz`);
  await page.waitForSelector('[data-screen="S2"]');
  await page.waitForFunction(() => document.querySelector('[data-voice-chip]')?.textContent?.includes('自分の声'), null, { timeout: 3000 })
    .catch(async () => errors.push(`S2 chip: "${await chipText(page)}"`));
  // 新しく読み直した S2 で録音の声を選んだまま ▶: 標準の声の音声は要求されない。
  const withMine = await standardRequestsWhilePlaying(page, 'S2 with my voice');
  if (withMine.hits.length) errors.push(`S2 with my voice: standard audio requested (${withMine.hits.length}), e.g. ${withMine.hits[0]}`);
  if (!withMine.played.length) errors.push('S2 with my voice: no voice buffer was played');

  // 使い回しのエンジン（Ruling 61-3）: S7 の試聴は 1 つの画面の中で同じエンジンを使い回す。録音の声を試聴した後、同じ画面で
  // 標準の声に替えて試聴すると、標準の声の語が鳴る（setVoicePack）。録音の 12 語は同じ偽マイクの音で、標準の声とは指紋が違う。
  await page.goto(`${BASE}#/voices`);
  await page.waitForSelector('[data-screen="S7"]:not([data-loading])');
  const previewPrints = async () => {
    await page.evaluate(() => { window.__played = []; });
    await page.locator('.dc-voice-preview').click();
    await page.waitForTimeout(PREVIEW_MS);
    await page.locator('.dc-voice-preview').click().catch(() => {});   // 自分で止まっていても構わない
    return [...new Set(await page.evaluate(() => window.__played))];
  };
  const previewMine = await previewPrints();
  await page.locator('[data-group="voice"] [role="radio"]').first().click();
  const previewStandard = await previewPrints();
  if (!previewMine.length) errors.push('S7 preview of my voice played no voice buffer');
  if (!previewStandard.some(print => !previewMine.includes(print))) errors.push('engine reuse: after switching to the standard voice, still the recorded words play');
  await page.locator('[data-group="voice"] [role="radio"]', { hasText: '自分の声' }).click();
  await page.waitForTimeout(WRITE_SETTLE_MS);
  const previewMineAgain = await previewPrints();
  if (!previewMineAgain.some(print => !previewStandard.includes(print))) errors.push('engine reuse: after switching back to my voice, still the standard words play');
  await page.goto(`${BASE}#/practice/waltz`);
  await page.waitForSelector('[data-screen="S2"]');
  await page.waitForTimeout(300);
  if ((await chipText(page)) !== '声: 自分の声（英語）') errors.push(`S2 after reload: chip "${await chipText(page)}"`);

  // 声のタイミング（Ruling 62）: 早く ×2 → −20 ms。録音の声そのものに保存される。
  await page.locator('summary[data-more]').click();
  for (let i = 0; i < 2; i += 1) await page.locator('[data-voice-offset-buttons] .dc-chip').first().click();
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
  // 対照: 標準の声なら、同じ操作で標準の声の音声が要求される（検出が効いている証拠）。
  const withStandard = await standardRequestsWhilePlaying(page, 'S2 with the standard voice');
  if (!withStandard.hits.length) errors.push('control: standard voice played without requesting standard audio (the request check is blind)');
} finally {
  await browser.close();
}

// 無音の本（Ruling 58）: 全 0 の WAV と、小さい声（0 ではないが基準未満）の WAV。どちらも「声が入っていません」で止まる。
for (const wav of ['silence.wav', 'quiet.wav']) {
  const silent = await launch(wav);
  try {
    const { page } = await openPage(silent);
    await page.goto(`${BASE}#/voices/record`);
    await page.waitForSelector('[data-step="intro"]');
    await page.locator('.dc-dock .dc-primary').click();
    await page.waitForSelector('[data-step="word"]');
    await page.locator('.dc-rec').click();
    await page.waitForSelector('[data-alert="no-voice"]', { timeout: TAKE_TIMEOUT_MS }).catch(() => errors.push(`${wav}: "no voice" was not shown`));
    if (!(await page.locator('.dc-record-dock .dc-primary').isDisabled())) errors.push(`${wav}: "Next" is pressable`);
    if (await page.locator('.dc-take').count()) errors.push(`${wav}: a take is shown`);
  } finally {
    await silent.close();
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('voice smoke OK: 12 words recorded (with a break), compared, chosen, played in S2, timing kept, deleted; silence and a too-quiet voice are refused');
