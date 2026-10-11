#!/usr/bin/env node
// 段3の完了条件（全体地図・Ruling 43）を本物の Chrome で確かめる。
// UI の操作だけで: 新しいルーティンで名前だけ打って端末の戻る → 一覧に戻り名前が残る（編集画面に戻されない）→ 消す →
// ワルツのルーティンを作る（種目 → フィガー2本を「追加する」で確定・不正なカウントでは押せない）→
// つかみで引いて並べ替える・元に戻す・再読み込みで残る・軽く押すと行が開く（Ruling 49）→
// 行を開いて書き換えたまま戻る（閉じ方の原則で確定）→
// 再読み込みしても一覧に残る → 行を開いて ▶ → S5 で鳴る（大きなカウント表示が音声の時計に沿って変わる）→ 戻る → 削除 → 0件 →
// 使える文字の常設の行（Ruling 50 D14）→ 同じ名前で「複製して追加」（Ruling 50 D13）。
// 前提: `npm run dev`（既定 http://localhost:5173/）。DC_BASE_URL で変更可。失敗があれば終了コード1。
import { chromium } from 'playwright-core';

const BASE = process.env.DC_BASE_URL ?? 'http://localhost:5173/';
const SOUND_TIMEOUT_MS = 10000;   // はじめの合図（1小節）＋声の読み込みを待っても、この間にカウントが3種類変わること
// 画面は先に変わり、端末への書き込みはその少し後に確定する（platform/storage.ts）。確定前に再読み込みすると
// 取り消されるので、再読み込みの前にこれだけ待つ（人が「消した直後」に再読み込みする競り合いはアプリでは防げない）。
const WRITE_SETTLE_MS = 500;
const errors = [];
const browser = await chromium.launch({ channel: 'chrome' });

async function addFigure(page, name, counts) {
  const form = page.locator('.dc-figure-form').last();
  await form.locator('input').nth(0).fill(name);
  await form.locator('input').nth(1).fill(counts);
  await form.locator('.dc-primary').click();
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
  if ((await page.locator('[data-alert]').getAttribute('data-alert').catch(() => null)) === 'no-sound') errors.push(`${label}: no-sound banner shown`);
}

try {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, locale: 'ja-JP' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

  await page.goto(`${BASE}#/routines`);
  await page.waitForSelector('[data-screen="S3"]');
  if (await page.locator('[data-row]').count()) errors.push('S3 should start empty');

  // 名前だけ打って端末の戻る（iPhone の端からのスワイプも同じ）: 離れる時の保存でハッシュを置き換えず S3 に着く・名前は残る
  await page.locator('[data-screen="S3"] .dc-primary').click();
  await page.locator('[data-group="dance"] button').first().click();
  await page.locator('[data-screen="S4"] .dc-field input').fill('金曜クラス');
  await page.goBack();
  await page.waitForSelector('[data-screen="S3"]');
  if (!page.url().endsWith('#/routines')) errors.push(`back after typing a name should land on the list (url ${page.url()})`);
  await page.waitForTimeout(WRITE_SETTLE_MS);
  await page.reload();
  await page.waitForSelector('[data-screen="S3"] [data-row]');
  const typed = await page.locator('[data-row] .dc-row-head').allTextContents();
  if (typed.length !== 1 || !typed[0]?.includes('金曜クラス')) errors.push(`a name typed before going back was not kept: ${JSON.stringify(typed)}`);
  await page.locator('[data-row] .dc-row-head').first().click();
  await page.locator('[data-row-body] .dc-button--secondary').last().click();
  await page.locator('dialog[open] .dc-primary').click();
  await page.waitForSelector('.dc-empty');

  // 作る: 新しいルーティン → 種目（ワルツ）→ 0件の下固定「＋ フィガーを追加」
  await page.locator('[data-screen="S3"] .dc-primary').click();
  await page.waitForSelector('[data-screen="S4"] [data-group="dance"]');
  await page.locator('[data-group="dance"] button').first().click();
  if (!page.url().endsWith('#/routines/new')) errors.push(`choosing a dance must not save yet (url ${page.url()})`);
  await page.locator('.dc-dock .dc-primary').click();
  await addFigure(page, 'ナチュラルターン', '１２３');   // 全角でも受け付ける（Ruling 38）
  await page.waitForURL(/#\/routines\/r-[A-Za-z0-9-]+\/edit$/);

  // 2本目: 不正なカウントでは「追加する」が押せない → 直すと押せる
  await page.locator('.dc-add-tail').click();
  const form = page.locator('.dc-figure-form').last();
  await form.locator('input').nth(0).fill('ウィスク');
  await form.locator('input').nth(1).fill('12a3');
  if (!(await form.locator('.dc-primary').isDisabled())) errors.push('"Add" must be disabled for 12a3 in waltz');
  await form.locator('input').nth(1).fill('12&3');
  await form.locator('.dc-primary').click();
  await page.locator('.dc-add-tail').click();
  await addFigure(page, 'クローズドチェンジ', '123');
  const names = () => page.locator('.dc-figure-head b').allTextContents();
  if ((await names()).length !== 3) errors.push(`expected 3 figures, found ${(await names()).length}`);

  // ドラッグ（Ruling 49・51）: 3行目のつかみを先頭より上へ引く → 途中は行が浮いて指についてくる → 並びが変わり、浮き・枠・線が消える → 元に戻す → やり直す
  const grip = await page.locator('.dc-grip').nth(2).boundingBox();
  const firstRow = await page.locator('.dc-row[data-index]').first().boundingBox();
  const thirdTop = (await page.locator('.dc-row[data-index="2"]').boundingBox()).y;
  const pressY = grip.y + grip.height / 2;
  await page.mouse.move(grip.x + grip.width / 2, pressY);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2, grip.y - 30, { steps: 3 });
  const lifted = await page.evaluate(() => {
    const row = document.querySelector('.dc-row[data-index="2"]');
    return { top: row.getBoundingClientRect().top, shadow: getComputedStyle(row).boxShadow, dragging: row.classList.contains('dc-row--dragging'),
      line: document.querySelectorAll('.dc-drop-line').length };
  });
  const moved = grip.y - 30 - pressY;
  if (Math.abs(lifted.top - (thirdTop + moved)) > 1) errors.push(`the lifted row should follow the finger: top ${lifted.top}, expected ${thirdTop + moved}`);
  if (!lifted.dragging || lifted.shadow === 'none') errors.push(`the lifted row should float with a shadow (shadow ${lifted.shadow})`);
  if (lifted.line !== 1) errors.push('the drop line should show while dragging');
  await page.mouse.move(grip.x + grip.width / 2, firstRow.y - 10, { steps: 3 });
  await page.mouse.up();
  const dragged = ['クローズドチェンジ', 'ナチュラルターン', 'ウィスク'];
  if (JSON.stringify(await names()) !== JSON.stringify(dragged)) errors.push(`drag did not reorder: ${JSON.stringify(await names())}`);
  if (await page.locator('.dc-row--dragging, .dc-drop-line').count()) errors.push('drag marks are left after the drop');
  const transforms = await page.locator('.dc-row[data-index]').evaluateAll(rows => rows.map(row => getComputedStyle(row).transform + (row.style.getPropertyValue('--dy') || '')));
  if (transforms.some(value => value !== 'none')) errors.push(`rows keep a transform after the drop: ${JSON.stringify(transforms)}`);
  await page.locator('[data-group="history"] button').first().click();   // 元に戻す
  if ((await names())[0] !== 'ナチュラルターン') errors.push('undo did not restore the order before the drag');
  await page.locator('[data-group="history"] button').last().click();    // やり直す
  await page.waitForTimeout(WRITE_SETTLE_MS);
  await page.reload();
  await page.waitForSelector('.dc-figure-head');
  if (JSON.stringify(await names()) !== JSON.stringify(dragged)) errors.push(`the dragged order did not survive reload: ${JSON.stringify(await names())}`);

  // 4px だけ動かして離す → タップ扱いで行が開く（「動かす」を押して何も起きない状態を作らない）
  const tapGrip = await page.locator('.dc-grip').first().boundingBox();
  await page.mouse.move(tapGrip.x + tapGrip.width / 2, tapGrip.y + tapGrip.height / 2);
  await page.mouse.down();
  await page.mouse.move(tapGrip.x + tapGrip.width / 2, tapGrip.y + tapGrip.height / 2 + 4);
  await page.mouse.up();
  if ((await page.locator('.dc-row[data-index="0"][data-open]').count()) !== 1) errors.push('a short press on the grip should open the row');
  await page.locator('.dc-figure-head').first().click();   // 閉じる

  // 閉じ方の原則（Ruling 36-1）: 行を開いて有効な値を入れたまま「戻る」→ 確定して保存される
  await page.locator('.dc-figure-head').first().click();
  await page.locator('.dc-figure-form input').nth(1).fill('123123');

  // 戻る → 一覧 → 再読み込みしても残る
  await page.locator('[data-back]').click();
  await page.waitForSelector('[data-screen="S3"] [data-row]');
  await page.waitForTimeout(WRITE_SETTLE_MS);
  await page.reload();
  await page.waitForSelector('[data-screen="S3"] [data-row]');
  const rows = await page.locator('[data-row] .dc-row-head').allTextContents();
  if (rows.length !== 1 || !rows[0]?.includes('3 フィガー')) errors.push(`after reload the list shows ${JSON.stringify(rows)}`);
  await page.locator('[data-row] .dc-row-head').first().click();
  await page.locator('[data-row-body] .dc-button--secondary').first().click();   // 編集
  await page.waitForSelector('[data-screen="S4"] .dc-figure-head');
  const firstCounts = (await page.locator('.dc-figure-head small').first().textContent())?.trim();
  if (firstCounts !== '1 2 3 1 2 3') errors.push(`back with a valid open row should commit it (first figure shows "${firstCounts}")`);
  await page.locator('[data-back]').click();
  await page.waitForSelector('[data-screen="S3"]');

  // 鳴らす: 行を開いて ▶（タブ → 行 → ▶ の3タップ目）→ S5 ですぐ鳴る
  await page.locator('[data-row] .dc-row-head').first().click();
  await page.locator('[data-row-body] .dc-primary').click();
  await page.waitForSelector('[data-screen="S5"]');
  await expectSounding(page, 'S5');

  // 消す: 戻る → 行を開いて削除 → 確認の「削除する」→ 0件
  await page.locator('[data-back]').click();
  await page.waitForSelector('[data-screen="S3"]');
  await page.locator('[data-row] .dc-row-head').first().click();
  await page.locator('[data-row-body] .dc-button--secondary').last().click();
  await page.locator('dialog[open] .dc-primary').click();
  await page.waitForSelector('.dc-empty');
  await page.waitForTimeout(WRITE_SETTLE_MS);
  await page.reload();
  await page.waitForSelector('[data-screen="S3"]');
  if (await page.locator('[data-row]').count()) errors.push('the deleted routine came back after reload');

  // 使える文字はいつも見える（Ruling 50 D14）: 空欄でも「使える文字：1・2・3・&」。12a3 はその行が赤く理由の行は無し。&123 は灰のまま下に理由。
  await page.locator('[data-screen="S3"] .dc-primary').click();
  await page.locator('[data-group="dance"] button').first().click();
  await page.locator('.dc-dock .dc-primary').click();
  await addFigure(page, 'ウィスク', '123');
  await page.waitForURL(/#\/routines\/r-[A-Za-z0-9-]+\/edit$/);
  await page.locator('.dc-add-tail').click();
  const addForm = page.locator('.dc-figure-form').last();
  const hint = addForm.locator('.dc-hint');
  if ((await hint.textContent())?.trim() !== '使える文字：1・2・3・&') errors.push(`allowed-symbols line on an empty row: "${await hint.textContent()}"`);
  await addForm.locator('input').nth(1).fill('12a3');
  if (!(await hint.evaluate(node => node.classList.contains('dc-hint--bad')))) errors.push('12a3 should turn the allowed-symbols line red');
  if (await addForm.locator('.dc-reason').count()) errors.push('12a3 should not add a reason line under the red allowed-symbols line');
  await addForm.locator('input').nth(1).fill('&123');
  if (await hint.evaluate(node => node.classList.contains('dc-hint--bad'))) errors.push('&123 should keep the allowed-symbols line grey');
  if (!(await addForm.locator('.dc-reason').count())) errors.push('&123 should show its reason under the allowed-symbols line');

  // 同じ名前は同じカウント（Ruling 50 D13）: 「ウィスク 123」がある所へ「ウィスク」→ 主ボタンが「複製して追加」→ 押すと 2 行目が「ウィスク 1 2 3」
  await addForm.locator('input').nth(0).fill('ウィスク');
  await addForm.locator('input').nth(1).fill('');
  const copyButton = addForm.locator('.dc-primary');
  if ((await copyButton.textContent())?.trim() !== '複製して追加') errors.push(`same name should switch the button to "Add a copy" ("${await copyButton.textContent()}")`);
  await copyButton.click();
  const copied = await page.locator('.dc-figure-head').nth(1).textContent().catch(() => '');
  if (!copied?.includes('ウィスク') || !copied.includes('1 2 3')) errors.push(`"Add a copy" should add ウィスク 1 2 3 as the 2nd row ("${copied}")`);
  await context.close();
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('routines smoke OK: name kept on back, created by taps, invalid counts blocked, dragged (lifted row follows the finger) and undone, survives reload, plays in S5, deleted, allowed symbols always shown, same name adds a copy');
