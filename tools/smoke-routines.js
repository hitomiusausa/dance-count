#!/usr/bin/env node
// 段3の完了条件（全体地図・Ruling 43）を本物の Chrome で確かめる。
// UI の操作だけで: 新しいルーティンで名前だけ打って端末の戻る → 一覧に戻り名前が残る（編集画面に戻されない）→ 消す →
// ワルツのルーティンを作る（種目 → フィガー2本を「追加する」で確定・不正なカウントでは押せない）→
// つかみで引いて並べ替える・元に戻す・再読み込みで残る・軽く押すと行が開く（Ruling 49）→
// 行を開いて書き換えたまま戻る（閉じ方の原則で確定）→
// 再読み込みしても一覧に残る → 行を開いて ▶ → S5 で鳴る（大きなカウント表示が音声の時計に沿って変わる）→ 戻る → 削除 → 0件 →
// 使える文字の常設の行（Ruling 50 D14）→ 同じ名前で「複製して追加」（Ruling 50 D13）→ 小節の注意（D16・Ruling 52）→ カウントの形（D18・Ruling 53）→
// 同じ名前の行で形をタップ →「3件まとめて決定」→ 3 行とも変わり、1 回の元に戻すで 3 行とも戻る（最終レビュー M4）。
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

  // 同じ名前は同じカウント（Ruling 50 D13）＋複製専用の形（D19）: 「ウィスク 123」がある所へ「ウィスク」→ 名前の欄の下に注意・
  // カウント欄と形は消え、主ボタンが「1 2 3 で複製して追加」。名前を変えると打っていたカウント（&123）のまま欄が戻る。押すと 2 行目が「ウィスク 1 2 3」
  const COPY = '1 2 3 で複製して追加';
  const nameInput = addForm.locator('input').nth(0);
  await nameInput.fill('ウィスク');
  const copyButton = addForm.locator('.dc-primary');
  if ((await copyButton.textContent())?.trim() !== COPY) errors.push(`same name should switch the button to "${COPY}" ("${await copyButton.textContent()}")`);
  const notice = await nameInput.evaluate(input => {
    const next = input.nextElementSibling;
    return next?.matches('.dc-reason') && (input.getAttribute('aria-describedby') ?? '').split(' ').includes(next.id) ? next.textContent.trim() : null;
  });
  if (notice !== '同じ名前があります：ウィスク（1 2 3）') errors.push(`the same-name notice should sit under the name field ("${notice}")`);
  if (await addForm.locator('.dc-input--counts').count()) errors.push('the counts field should be hidden while adding a copy');
  if (await addForm.locator('[data-group="count-patterns"] .dc-chip').count()) errors.push('count patterns should be hidden while adding a copy');
  // 打っている間は下の帯（「▶ 全体を試聴」）を出さない。欄から離れると戻る（D19・F6 round 2）
  if (await page.locator('.dc-dock').isVisible()) errors.push('the bottom dock should hide while typing in the name field');
  await nameInput.blur();
  if (!(await page.locator('.dc-dock').isVisible())) errors.push('the bottom dock should come back when nothing is being typed');
  await nameInput.fill('ウィスク（短）');
  const kept = await addForm.locator('.dc-input--counts').inputValue().catch(() => null);
  if (kept !== '&123') errors.push(`a different name should bring the counts back as typed ("${kept}")`);
  await nameInput.fill('ウィスク');
  await copyButton.click();
  const copied = await page.locator('.dc-figure-head').nth(1).textContent().catch(() => '');
  if (!copied?.includes('ウィスク') || !copied.includes('1 2 3')) errors.push(`"Add a copy" should add ウィスク 1 2 3 as the 2nd row ("${copied}")`);

  // 小節の注意（D16・Ruling 52）: ワルツで 12 のフィガーを 2 件 → 1 件目（3 行目）に全文・2 件目に短い形・一覧の下に全体の注意。止めない。
  const FULL = '3拍のカウントではありません。必要なら編集してください。';
  const SHORT = '3拍のカウントではありません';
  const rowNote = index => page.locator(`.dc-row[data-index="${index}"] .dc-row-note`).textContent({ timeout: 500 }).then(text => text.trim()).catch(() => null);
  const barNote = () => page.locator('.dc-bar-note').count();
  await page.locator('.dc-add-tail').click();
  await addFigure(page, 'クローズドチェンジ', '12');
  await page.locator('.dc-add-tail').click();
  await addFigure(page, 'リバースターン', '12');
  if ((await page.locator('.dc-figure-head').count()) !== 4) errors.push('a 2-beat waltz figure must still be added (D16: not blocked)');
  if (await rowNote(2) !== FULL || await rowNote(3) !== SHORT) errors.push(`row notes should be full then short: ${JSON.stringify([await rowNote(2), await rowNote(3)])}`);
  if (await barNote() !== 1) errors.push('the mid-bar note should show under the list');
  // 1 件目を開く: 見出しの注意は消え、入力欄の下に短い形・「決定」は押せる。全文は 2 件目へ移る
  await page.locator('.dc-figure-head').nth(2).click();
  const offForm = page.locator('.dc-row[data-index="2"] .dc-figure-form');
  if (await rowNote(2) !== null) errors.push('the open row should not show the note in its heading');
  if ((await offForm.locator('.dc-reason').textContent())?.trim() !== SHORT) errors.push('the open row should show the short note under the counts');
  if (await offForm.locator('.dc-primary').isDisabled()) errors.push('"Done" must stay pressable with an off-bar count');
  if (await rowNote(3) !== FULL) errors.push(`the full note should move to the next closed row ("${await rowNote(3)}")`);
  await offForm.locator('input').nth(1).fill('123');
  if (await offForm.locator('.dc-reason').count()) errors.push('the note under the counts should go away for 123');
  await offForm.locator('.dc-primary').click();
  if (await rowNote(2) !== null || await rowNote(3) !== FULL) errors.push(`after fixing the 1st, the 2nd should be full: ${JSON.stringify([await rowNote(2), await rowNote(3)])}`);
  await page.locator('.dc-figure-head').nth(3).click();
  await page.locator('.dc-row[data-index="3"] .dc-figure-form input').nth(1).fill('123');
  await page.locator('.dc-row[data-index="3"] .dc-figure-form .dc-primary').click();
  if ((await page.locator('.dc-row-note').count()) || await barNote()) errors.push('all notes should be gone after fixing both');
  // カウントの形（D18・Ruling 53）: ワルツは 8 個。タップで欄を置き換え、そのチップだけ押された印 → 決定で見出しに出る
  await page.locator('.dc-figure-head').nth(3).click();
  const patternForm = page.locator('.dc-row[data-index="3"] .dc-figure-form');
  const chips = patternForm.locator('[data-group="count-patterns"] .dc-chip');
  if ((await chips.count()) !== 8) errors.push(`waltz should show 8 count patterns (got ${await chips.count()})`);
  await chips.filter({ hasText: /^1 & 2 & 3 &$/ }).click();
  const patternValue = await patternForm.locator('input').nth(1).inputValue();
  if (patternValue !== '1&2&3&') errors.push(`tapping a count pattern should replace the counts (got "${patternValue}")`);
  const pressedChips = await chips.evaluateAll(list => list.filter(chip => chip.getAttribute('aria-pressed') === 'true').map(chip => chip.textContent.trim()));
  if (JSON.stringify(pressedChips) !== JSON.stringify(['1 & 2 & 3 &'])) errors.push(`only the tapped pattern should be pressed: ${JSON.stringify(pressedChips)}`);
  await patternForm.locator('.dc-primary').click();
  const patternHead = (await page.locator('.dc-figure-head').nth(3).textContent()) ?? '';
  if (!patternHead.includes('1 & 2 & 3 &')) errors.push(`the row heading should show the chosen pattern ("${patternHead.trim()}")`);

  // 同じ名前の行で形をタップ（Ruling 50 D13 × Ruling 53）: ウィスクを 3 行にする → 1 行目で形をタップ → 「3件まとめて決定」→ 3 行とも変わる → 元に戻すで 3 行とも戻る
  await page.locator('.dc-add-tail').click();
  const thirdForm = page.locator('.dc-figure-form').last();
  await thirdForm.locator('input').nth(0).fill('ウィスク');
  await thirdForm.locator('.dc-primary').click();   // 1 2 3 で複製して追加
  const whiskCounts = async () => (await page.locator('.dc-figure-head').evaluateAll(heads => heads
    .filter(head => head.querySelector('b')?.textContent.trim() === 'ウィスク').map(head => head.querySelector('small')?.textContent.trim())));
  if (JSON.stringify(await whiskCounts()) !== JSON.stringify(['1 2 3', '1 2 3', '1 2 3'])) errors.push(`expected 3 ウィスク rows at 1 2 3: ${JSON.stringify(await whiskCounts())}`);
  await page.locator('.dc-figure-head').first().click();
  const groupForm = page.locator('.dc-row[data-index="0"] .dc-figure-form');
  await groupForm.locator('[data-group="count-patterns"] .dc-chip').filter({ hasText: /^1 2 & 3$/ }).click();
  const groupButton = groupForm.locator('.dc-primary');
  if ((await groupButton.textContent())?.trim() !== '3件まとめて決定') errors.push(`a pattern on a shared name should read "Update all 3" ("${await groupButton.textContent()}")`);
  await groupButton.click();
  if (JSON.stringify(await whiskCounts()) !== JSON.stringify(['1 2 & 3', '1 2 & 3', '1 2 & 3'])) errors.push(`"Update all 3" should change every ウィスク row: ${JSON.stringify(await whiskCounts())}`);
  await page.locator('[data-group="history"] button').first().click();   // 元に戻す（1 回で 3 行とも）
  if (JSON.stringify(await whiskCounts()) !== JSON.stringify(['1 2 3', '1 2 3', '1 2 3'])) errors.push(`one undo should restore every ウィスク row: ${JSON.stringify(await whiskCounts())}`);
  await context.close();
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('routines smoke OK: name kept on back, created by taps, invalid counts blocked, dragged (lifted row follows the finger) and undone, survives reload, plays in S5, deleted, allowed symbols always shown, same name adds a copy (notice under the name, counts hidden and kept), bar notes inform without blocking, count patterns fill the counts, a pattern on a shared name updates all and undoes as one');
