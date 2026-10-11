#!/usr/bin/env node
// 新アプリの高齢者向け数値基準（仕様 §6 U1〜U15・Ruling 7・16・18・21・23・33・35・43・47）を Playwright で検査する。
// 前提: `npm run dev`（既定 http://localhost:5173/）を起動しておく。DC_BASE_URL で `npm run preview`（4174）にも向けられる。
// DC_ONLY=S5,S4 のように状態名の頭で絞れる（直しながらの確認用。完了の判定は絞らずに全部で）。
// 1件でも違反があれば終了コード1。U14（禁止語）は node --test 側（test/app/i18n.test.ts）。
import { chromium } from 'playwright-core';
import { UI_CHECK_ROUTINES as R, seedRoutinesInPage } from './ui-check-routines.js';

const BASE = process.env.DC_BASE_URL ?? 'http://localhost:5173/';
const VIEWPORTS = [{ width: 375, height: 667 }, { width: 1280, height: 900 }];
const ZOOM_VIEWPORT = { width: 640, height: 450 }; // 1280×900 の 200% 拡大相当（U9）
const NARROW_VIEWPORT = { width: 320, height: 568 }; // 最も狭い端末（iPhone SE 第1世代）。横スクロールが出ない（段4から全画面）
const LIMITS = Object.freeze({
  bodyFont: 18, minFont: 16, fineprintFont: 14, // U1
  primaryHeight: 56, playHeight: 72, playWidthRatio: 0.6, // U2
  tap: 48, tapGap: 8, // U3
  initialOps: 5, totalOps: 9, groupChoices: 10, moreSummaries: 1, // U4〜U6
  catalogChoices: 20, // U5 の例外: 照合済みの名前の一覧 [data-group][data-catalog] は選択肢でなく一覧（Ruling 54。src の FIGURE_CHOICES_MAX と同じ）
  contrastText: 4.5, contrastLarge: 3, contrastUi: 3, // U7
  motionMs: 300, // U8
  buttonLines: 2, // U10
  alertHeight: 120, // Ruling 23（375 幅）
  chipToDock: 8 // Ruling 47（S5: 声チップの下端〜▶ の帯の上端）
});

// 検査する画面と状態（Ruling 33・43）。kind は仕様 §3 の種別、ops は初期表示・total は画面全体の主要操作数の期待値（Ruling 18・35・36・40）。
// prepare は「前回あり」を実経路で作る（偽装クエリは使わない）。seed はブラウザの IndexedDB に検査用のルーティンを書く（Ruling 43）。
// steps は開いた後の人の操作（クリック・入力）。人の操作の後の状態は「初期表示 5 以下」を当てず全体（9 以下）だけを見る。
const SEEDED = [R.waltz13, R.empty, R.longJa, R.longEn];
const S4_13 = `#/routines/${R.waltz13.id}/edit`;
const S5_13 = `#/routines/${R.waltz13.id}/play`;
const STATES = [
  { name: 'S1 初回', hash: '#/', screen: 'S1', kind: 'root', ops: 2, teacherAndTiles: true },
  { name: 'S1 前回あり', hash: '#/', screen: 'S1', kind: 'root', ops: 3, teacherAndTiles: true, prepare: '#/practice/waltz' },
  { name: 'S2 くわしく閉', hash: '#/practice/waltz', screen: 'S2', kind: 'focus', ops: 5, speedAndPlay: true },
  { name: 'S2 くわしく開', hash: '#/practice/waltz', screen: 'S2', kind: 'focus', openMore: true, total: 9, voiceOffset: '±0 ms' },
  { name: 'S2 音が出ない', hash: '#/practice/waltz?ui-state=no-sound', screen: 'S2', kind: 'focus', speedAndPlay: true, alert: true },
  { name: 'S2 画面が暗くなる案内', hash: '#/practice/jive?ui-state=wakelock-tip', screen: 'S2', kind: 'focus', speedAndPlay: true, alert: true },
  { name: 'S3 0件', hash: '#/routines', screen: 'S3', kind: 'root', ops: 1, total: 1 },
  { name: 'S3 2本・1本開', hash: '#/routines', screen: 'S3', kind: 'root', seed: [R.waltz13, R.empty], steps: [{ click: '.dc-row-head >> nth=0' }], total: 3 },
  { name: 'S3 削除の確認', hash: '#/routines?ui-state=confirm-delete', screen: 'S3', kind: 'root', seed: [R.waltz13, R.empty], confirm: true },
  { name: 'S4 新規・種目選択', hash: '#/routines/new', screen: 'S4', kind: 'focus', ops: 1, total: 1 },
  { name: 'S4 0件', hash: `#/routines/${R.empty.id}/edit`, screen: 'S4', kind: 'focus', seed: SEEDED, ops: 3, total: 3 },
  { name: 'S4 13件・閉', hash: S4_13, screen: 'S4', kind: 'focus', seed: SEEDED, total: 5 },
  { name: 'S4 13件・行を開', hash: S4_13, screen: 'S4', kind: 'focus', seed: SEEDED, steps: [{ click: '.dc-figure-head >> nth=2' }], total: 8, patterns: 8, pressed: 1 },
  { name: 'S4 13件・くわしく開', hash: S4_13, screen: 'S4', kind: 'focus', seed: SEEDED, openMore: true, total: 8 },
  { name: 'S4 不正カウント', hash: S4_13, screen: 'S4', kind: 'focus', seed: SEEDED, invalidCounts: true, patterns: 8, pressed: 0,
    steps: [{ click: '.dc-add-tail' }, { fill: ['.dc-figure-form input >> nth=0', 'コントラチェック'] }, { fill: ['.dc-figure-form input >> nth=1', '12a3'] }] },
  // D19: 追加の行に既にある名前（1 件目＝templates[0] の 123）→ 複製専用の形。カウント欄・使える文字・形は出ず、注意は名前の欄の下、主ボタンは「1 2 3 で複製して追加」。
  // total 6＝閉じた 13 件の画面の 5 から「＋ フィガーを追加」が消え（追加の行を開いている間は出ない）、追加の行の 2 グループ（figure-form・count-patterns）が足される。
  // 下の帯（「▶ 全体を試聴」）は画面のキーボードが開いている間だけ隠す（D19・F6 round 4。判定は見えている高さ＝lib/keyboard.ts・単体テスト）。
  // Chromium にはキーボードが無いので、名前の欄にフォーカスがあっても帯は出たまま（dockWhileFocused: フォーカスで隠す作りに戻っていないか）
  { name: 'S4 同じ名前（追加）', hash: S4_13, screen: 'S4', kind: 'focus', seed: SEEDED, total: 6, sameNameCopy: '1 2 3 で複製して追加', dockWhileFocused: true,
    steps: [{ click: '.dc-add-tail' }, { fill: ['.dc-figure-form input >> nth=0', R.waltz13.figures[0].name] }] },
  // D20・Ruling 54: 名前が空の追加の行は、名前の欄の下にその種目の照合済みフィガー全部（一覧＝[data-group="figure-names"][data-catalog]）。
  // カウントの欄・使える文字・形は名前が入ってから。total 7＝閉じた 13 件の 5 −「＋ フィガーを追加」＋ figure-form・figure-names・count-patterns。
  // 0 件のタンゴ（19 件＝一覧の最大）は 名前・種目「変える」＋3 グループ＝5（下固定の帯は追加の行の間は出ない）。
  { name: 'S4 追加の行・名前の一覧', hash: S4_13, screen: 'S4', kind: 'focus', seed: SEEDED, steps: [{ click: '.dc-add-tail' }], total: 7,
    nameChoices: { count: 17, heading: 'ワルツのフィガー（17）', first: 'クローズドチェンジ' } },
  { name: 'S4 0件・追加の行', hash: `#/routines/${R.empty.id}/edit`, screen: 'S4', kind: 'focus', seed: SEEDED, steps: [{ click: '.dc-dock-button' }], total: 5,
    nameChoices: { count: 19, heading: 'タンゴのフィガー（19）', first: 'プログレッシブリンク' } },
  // 一覧の 17 番目（waltz13 は定義順の 0〜12 番を使うので未使用＝複製の形にならない。最長のワルツ名で 2 行の U10 も通す）
  { name: 'S4 追加の行・名前を選んだ後', hash: S4_13, screen: 'S4', kind: 'focus', seed: SEEDED, total: 6, patterns: 8, pressed: 0,
    nameChosen: 'フォーラウェイリバース＆スリップピボット',
    steps: [{ click: '.dc-add-tail' }, { click: '[data-group="figure-names"] .dc-chip >> nth=16' }] },
  { name: 'S4 小節の注意', hash: `#/routines/${R.waltzOffBar.id}/edit`, screen: 'S4', kind: 'focus', seed: [...SEEDED, R.waltzOffBar], total: 5, barNote: true },
  // ↑ ops は固定しない: 375×667 では注意の行のぶん「＋ フィガーを追加」が下の帯の下に隠れて初期表示 4、1280 幅では 5（「S4 13件・閉」と同じ扱い。U4 の上限 5 は当たる）
  { name: 'S5 くわしく閉', hash: S5_13, screen: 'S5', kind: 'focus', seed: SEEDED, ops: 5, speedAndPlay: true, chipToDock: true, singleLineHeading: true },
  { name: 'S5 くわしく開', hash: S5_13, screen: 'S5', kind: 'focus', seed: SEEDED, openMore: true, total: 9 },
  { name: 'S5 音が出ない', hash: `${S5_13}?ui-state=no-sound`, screen: 'S5', kind: 'focus', seed: SEEDED, speedAndPlay: true, alert: true },
  { name: 'S5 40字の名前（全角）', hash: `#/routines/${R.longJa.id}/play`, screen: 'S5', kind: 'focus', seed: SEEDED, ops: 5, speedAndPlay: true, chipToDock: true, singleLineHeading: true },
  { name: 'S5 40字の名前（英数字）', hash: `#/routines/${R.longEn.id}/play`, screen: 'S5', kind: 'focus', seed: SEEDED, ops: 5, speedAndPlay: true, chipToDock: true, singleLineHeading: true },
  { name: 'S6', hash: '#/settings', screen: 'S6', kind: 'root' },
  { name: 'S7', hash: '#/voices', screen: 'S7', kind: 'list' },
  { name: 'S11', hash: '#/help/sound', screen: 'S11', kind: 'focus' }
];

const ONLY = (process.env.DC_ONLY ?? '').split(',').map(item => item.trim()).filter(Boolean);
const CHECKED = ONLY.length ? STATES.filter(state => ONLY.some(prefix => state.name.startsWith(prefix))) : STATES;

const browser = await chromium.launch({ channel: 'chrome' }).catch(error => {
  console.error('Google Chrome を起動できませんでした。Chrome のインストールと開発サーバー（npm run dev）を確認してください。');
  console.error(error.message);
  process.exit(2);
});

let violations = 0;
const report = (label, problems) => {
  console.log(`\n== ${label} : ${problems.length ? `${problems.length} 件の違反` : 'PASS'}`);
  for (const problem of problems) console.log(`  ${problem}`);
  violations += problems.length;
};

try {
  for (const state of CHECKED) {
    for (const viewport of VIEWPORTS) {
      for (const reducedMotion of ['no-preference', 'reduce']) {
        const label = `${state.name} @ ${viewport.width}x${viewport.height}${reducedMotion === 'reduce' ? ' reduced-motion' : ''}`;
        const context = await browser.newContext({ viewport, locale: 'ja-JP', reducedMotion });
        const page = await context.newPage();
        const consoleErrors = [];
        page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`U15 console: ${message.text()}`); });
        page.on('pageerror', error => consoleErrors.push(`U15 pageerror: ${error.message}`));
        if (state.prepare || state.seed) {
          await page.goto(BASE + (state.prepare ?? '#/'));
          await page.waitForSelector('[data-screen]');
        }
        if (state.seed) await page.evaluate(seedRoutinesInPage, state.seed);
        await page.goto(BASE + state.hash);
        if (state.seed) await page.reload();
        await page.waitForSelector(`[data-screen="${state.screen}"]`);
        for (const step of state.steps ?? []) {
          if (step.click) await page.locator(step.click).click();
          if (step.fill) await page.locator(step.fill[0]).fill(step.fill[1]);
        }
        if (state.openMore) await page.locator('summary[data-more]').click();
        if (state.confirm) await page.waitForSelector('dialog[open][data-confirm]');
        const opened = state.openMore ? await page.locator('details[open]').count() : 0;
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => window.scrollTo(0, 0));
        const problems = await page.evaluate(audit, { state: { ...state, afterAction: Boolean(state.openMore || state.steps) }, LIMITS, reducedMotion: reducedMotion === 'reduce' });
        const openFail = state.openMore && opened === 0 ? ['U4 "more" did not open'] : [];
        report(label, [...openFail, ...problems, ...consoleErrors]);
        await context.close();
      }
    }
  }

  // U9: 200% 拡大相当で横スクロールが出ない・viewport meta に拡大禁止が無い
  const context = await browser.newContext({ viewport: ZOOM_VIEWPORT, locale: 'en-US' });
  const page = await context.newPage();
  const problems = [];
  // S4・S5 は検査用のルーティンが要る（無いと S3 へ置き換わる）。先に入れて読み直してから全画面を回る。
  await page.goto(BASE);
  await page.waitForSelector('[data-screen]');
  await page.evaluate(seedRoutinesInPage, [...new Map(STATES.flatMap(state => state.seed ?? []).map(item => [item.id, item])).values()]);
  await page.reload();
  await page.waitForSelector('[data-screen]');   // アプリがハッシュの変化を聞き始めてから次のハッシュへ
  for (const state of CHECKED) {
    await page.goto(BASE + state.hash);
    await page.waitForSelector(`[data-screen="${state.screen}"]`);
    const { scrollWidth, clientWidth, meta } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      meta: document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? ''
    }));
    if (scrollWidth > clientWidth) problems.push(`U9 ${state.name}: horizontal scroll ${scrollWidth} > ${clientWidth}`);
    if (/user-scalable\s*=\s*(no|0)|maximum-scale/i.test(meta)) problems.push(`U9 ${state.name}: viewport meta blocks zoom "${meta}"`);
  }
  report(`U9 拡大 ${ZOOM_VIEWPORT.width}x${ZOOM_VIEWPORT.height}`, problems);
  await context.close();

  // 320 幅（最も狭い端末）でも横スクロールが出ない（ひとみうさの要件・段4から）。状態の初期表示を全部回る。
  const narrow = await browser.newContext({ viewport: NARROW_VIEWPORT, locale: 'ja-JP' });
  const narrowPage = await narrow.newPage();
  const narrowProblems = [];
  await narrowPage.goto(BASE);
  await narrowPage.waitForSelector('[data-screen]');
  await narrowPage.evaluate(seedRoutinesInPage, [...new Map(STATES.flatMap(state => state.seed ?? []).map(item => [item.id, item])).values()]);
  await narrowPage.reload();
  await narrowPage.waitForSelector('[data-screen]');
  for (const state of CHECKED) {
    await narrowPage.goto(BASE + state.hash);
    await narrowPage.waitForSelector(`[data-screen="${state.screen}"]`);
    const { scrollWidth, clientWidth } = await narrowPage.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    if (scrollWidth > clientWidth) narrowProblems.push(`320 ${state.name}: horizontal scroll ${scrollWidth} > ${clientWidth}`);
  }
  report(`横スクロール ${NARROW_VIEWPORT.width}x${NARROW_VIEWPORT.height}`, narrowProblems);
  await narrow.close();
} finally {
  await browser.close();
}

process.exit(violations ? 1 : 0);

// ---- ここから下はブラウザの中で動く（page.evaluate に関数ごと渡す。外の変数は使えない） ----
function audit({ state, LIMITS, reducedMotion }) {
  const issues = [];
  const TARGETS = 'button, a[href], select, summary, input:not([type="hidden"]), label[for], [role=button], [role=switch], [role=radio]';
  const OPS = 'button, a[href], [role=button], [role=switch], [role=radio], input:not([type="hidden"]), select, summary, label[for]';
  const EXCLUDED_OPS = '[data-nav], [data-back], [data-utility], summary[data-more], [data-alert-action]';
  const FIXED_BARS = '[data-nav], .dc-dock';

  const visible = element => {
    if (element.closest('[hidden]')) return false;
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    // 閉じた <details> の中身は見えない（summary だけが見える）。Chrome は中身の rect を返すことがあるので明示的に除く
    const closed = element.closest('details:not([open])');
    if (closed && !closed.querySelector(':scope > summary')?.contains(element)) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const describe = element => `${element.tagName.toLowerCase()}${element.className && typeof element.className === 'string' ? `.${element.className.trim().split(/\s+/).join('.')}` : ''} "${(element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 24)}"`;
  const inFixedBar = element => Boolean(element.closest(FIXED_BARS));

  // 固定バーを除いた「見える範囲」（U4・U12・Ruling 21/23 の判定に使う）
  let usableTop = 0;
  let usableBottom = innerHeight;
  for (const bar of document.querySelectorAll(FIXED_BARS)) {
    if (!visible(bar)) continue;
    const rect = bar.getBoundingClientRect();
    if (rect.top <= 1) usableTop = Math.max(usableTop, rect.bottom);
    else usableBottom = Math.min(usableBottom, rect.top);
  }
  const fullyInView = element => {
    const rect = element.getBoundingClientRect();
    const top = inFixedBar(element) ? 0 : usableTop;
    const bottom = inFixedBar(element) ? innerHeight : usableBottom;
    return rect.top >= top - 0.5 && rect.bottom <= bottom + 0.5 && rect.left >= -0.5 && rect.right <= innerWidth + 0.5;
  };

  // U1 文字の大きさ
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textElements = new Set();
  while (walker.nextNode()) {
    const parent = walker.currentNode.parentElement;
    if (parent && walker.currentNode.textContent.trim() && visible(parent)) textElements.add(parent);
  }
  for (const element of textElements) {
    const size = parseFloat(getComputedStyle(element).fontSize);
    const fineprint = element.closest('[data-fineprint]');
    if (size < LIMITS.fineprintFont - 0.01) issues.push(`U1 font ${size}px < ${LIMITS.fineprintFont} ${describe(element)}`);
    else if (!fineprint && size < LIMITS.minFont - 0.01) issues.push(`U1 font ${size}px < ${LIMITS.minFont} ${describe(element)}`);
    else if (element.closest('p, li, [data-body]') && size < LIMITS.bodyFont - 0.01) issues.push(`U1 body font ${size}px < ${LIMITS.bodyFont} ${describe(element)}`);
  }

  // U2 主要ボタン
  for (const element of document.querySelectorAll('.dc-primary')) {
    if (!visible(element)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.height < LIMITS.primaryHeight - 0.5) issues.push(`U2 primary height ${Math.round(rect.height)} < ${LIMITS.primaryHeight} ${describe(element)}`);
  }
  for (const element of document.querySelectorAll('[data-play]')) {
    if (!visible(element)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.height < LIMITS.playHeight - 0.5) issues.push(`U2 play height ${Math.round(rect.height)} < ${LIMITS.playHeight}`);
    if (rect.width < innerWidth * LIMITS.playWidthRatio - 0.5) issues.push(`U2 play width ${Math.round(rect.width)} < ${Math.round(innerWidth * LIMITS.playWidthRatio)}`);
  }

  // U3 タップ対象の大きさと間隔（固定バーと本文の間・別の固定バー同士は対象外。同じバーの中は測る）
  const targets = [...document.querySelectorAll(TARGETS)].filter(visible).filter(element => !(element.tagName === 'INPUT' && element.closest('label')));
  for (const element of targets) {
    const rect = element.getBoundingClientRect();
    if (rect.width < LIMITS.tap - 0.5 || rect.height < LIMITS.tap - 0.5) issues.push(`U3 tap ${Math.round(rect.width)}x${Math.round(rect.height)} ${describe(element)}`);
  }
  for (let i = 0; i < targets.length; i += 1) {
    for (let j = i + 1; j < targets.length; j += 1) {
      const a = targets[i];
      const b = targets[j];
      if (a.contains(b) || b.contains(a)) continue;
      const barA = a.closest(FIXED_BARS);
      const barB = b.closest(FIXED_BARS);
      if (barA !== barB) continue; // 片方だけ固定バー、または別々の固定バー: スクロールで重なり方が変わるので対象外（同じバーの中は測る）
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const dx = Math.max(0, Math.max(ra.left, rb.left) - Math.min(ra.right, rb.right));
      const dy = Math.max(0, Math.max(ra.top, rb.top) - Math.min(ra.bottom, rb.bottom));
      const gap = Math.hypot(dx, dy);
      if (gap < LIMITS.tapGap - 0.5) issues.push(`U3 gap ${gap.toFixed(1)}px < ${LIMITS.tapGap} between ${describe(a)} and ${describe(b)}`);
    }
  }

  // U4 主要操作数（Ruling 18・35）: 同じ [data-group] は1つ、除外の要素は数えない。
  // 一覧 [data-list] は閉じた行（行の見出し）をまとめて1つ。開いた行の中身 [data-row-body] はその中の [data-group] ごと・グループ外は個別。
  const operationKey = element => {
    if (element.closest('[data-row-body]')) return element.closest('[data-group]') ?? element;
    return element.closest('[data-list]') ?? element.closest('[data-group]') ?? element;
  };
  const operations = scope => {
    const keys = new Set();
    for (const element of document.querySelectorAll(OPS)) {
      if (!visible(element) || element.closest(EXCLUDED_OPS)) continue;
      if (scope === 'initial' && !fullyInView(element)) continue;
      keys.add(operationKey(element));
    }
    return keys.size;
  };
  // Ruling 35: [data-list] は [data-group] の中にも [data-list] の中にも置かない
  for (const list of document.querySelectorAll('[data-list]')) {
    if (list.parentElement?.closest('[data-group], [data-list]')) issues.push(`U4 [data-list] must not be nested in a group or list ${describe(list)}`);
  }
  const initialOps = operations('initial');
  const totalOps = operations('all');
  // 「初期表示」は画面を開いた直後のこと。「くわしく」を開いた状態は人の操作の後なので全体（9以下）だけを見る（Ruling 31: 開くと8）。
  if (!state.afterAction && initialOps > LIMITS.initialOps) issues.push(`U4 initial operations ${initialOps} > ${LIMITS.initialOps}`);
  if (totalOps > LIMITS.totalOps) issues.push(`U4 total operations ${totalOps} > ${LIMITS.totalOps}`);
  if (state.total !== undefined && totalOps !== state.total) issues.push(`U4 total operations ${totalOps}, expected ${state.total}`);
  if (state.ops !== undefined && initialOps !== state.ops) issues.push(`U4 initial operations ${initialOps}, expected ${state.ops}`);

  // U5 選択肢の数・U6「くわしく」は1つ
  // 照合済みの名前の一覧（[data-catalog]）は選択肢でなく一覧なので 10 を当てず、黙って増えないよう catalogChoices を当てる（Ruling 54-4）
  for (const group of document.querySelectorAll('[data-group]')) {
    const choices = [...group.querySelectorAll(OPS)].filter(visible).length;
    const limit = group.hasAttribute('data-catalog') ? LIMITS.catalogChoices : LIMITS.groupChoices;
    if (choices > limit) issues.push(`U5 group "${group.dataset.group}" has ${choices} choices > ${limit}`);
  }
  for (const select of document.querySelectorAll('select')) {
    if (select.options.length > LIMITS.groupChoices) issues.push(`U5 select has ${select.options.length} options`);
  }
  const summaries = document.querySelectorAll('summary[data-more]').length;
  if (summaries > LIMITS.moreSummaries) issues.push(`U6 ${summaries} "more" sections > ${LIMITS.moreSummaries}`);

  // U7 コントラスト（文字・操作の枠線）
  const linear = channel => { const c = channel / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const luminance = rgb => 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
  const parse = value => { const m = value.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? { rgb: [+m[1], +m[2], +m[3]], alpha: m[4] === undefined ? 1 : +m[4] } : null; };
  const background = element => {
    for (let node = element; node; node = node.parentElement) {
      const parsed = parse(getComputedStyle(node).backgroundColor);
      if (parsed && parsed.alpha >= 0.9) return parsed.rgb;
    }
    return [255, 255, 255];
  };
  const ratio = (a, b) => { const la = luminance(a); const lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  for (const element of textElements) {
    const style = getComputedStyle(element);
    const color = parse(style.color);
    if (!color) continue;
    const size = parseFloat(style.fontSize);
    const large = size >= 24 && Number(style.fontWeight) >= 700;
    const needed = large ? LIMITS.contrastLarge : LIMITS.contrastText;
    const value = ratio(color.rgb, background(element));
    if (value < needed) issues.push(`U7 text contrast ${value.toFixed(2)} < ${needed} ${describe(element)}`);
  }
  for (const element of targets) {
    const style = getComputedStyle(element);
    const width = parseFloat(style.borderTopWidth);
    if (!(width > 0) || style.borderTopStyle === 'none') continue;
    const border = parse(style.borderTopColor);
    if (!border || border.alpha < 0.9) continue;
    const value = ratio(border.rgb, background(element.parentElement ?? element));
    if (value < LIMITS.contrastUi) issues.push(`U7 border contrast ${value.toFixed(2)} < ${LIMITS.contrastUi} ${describe(element)}`);
  }

  // U8 動き
  const durations = value => value.split(',').map(part => parseFloat(part) * (part.trim().endsWith('ms') ? 1 : 1000));
  for (const element of document.querySelectorAll('*')) {
    const style = getComputedStyle(element);
    for (const ms of [...durations(style.transitionDuration), ...durations(style.animationDuration)]) {
      if (reducedMotion ? ms > 0 : ms > LIMITS.motionMs) { issues.push(`U8 motion ${ms}ms ${describe(element)}`); break; }
    }
  }

  // U10 はみ出し・ボタン文言は2行まで（[data-ellipsis] は「…」で省略してよい要素。Ruling 47）
  for (const element of textElements) {
    if (element.closest('[data-ellipsis]')) continue;
    if (element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).overflowX !== 'visible') {
      issues.push(`U10 clipped text ${element.scrollWidth} > ${element.clientWidth} ${describe(element)}`);
    }
  }
  // 「ボタン文言は最大2行」を「各文字列2行まで・ボタン全体で折り返しは1回まで」と読む（アイコンや2段組みの配置は行に数えない）
  for (const button of targets) {
    if (!['BUTTON', 'A', 'SUMMARY'].includes(button.tagName)) continue;
    const texts = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
    let wraps = 0;
    let reported = false;
    while (texts.nextNode()) {
      if (!texts.currentNode.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(texts.currentNode);
      const lines = new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top))).size;
      wraps += Math.max(0, lines - 1);
      if (lines > LIMITS.buttonLines) { issues.push(`U10 button text ${lines} lines > ${LIMITS.buttonLines} ${describe(button)}`); reported = true; break; }
    }
    if (!reported && wraps > 1) issues.push(`U10 button text wraps ${wraps} times > 1 ${describe(button)}`);
  }

  // U11 下タブと戻る（種別の表と照合）
  const nav = document.querySelector('[data-nav]');
  const back = document.querySelector('[data-back]');
  const navVisible = Boolean(nav && visible(nav));
  const backVisible = Boolean(back && visible(back));
  if (state.kind === 'focus' && navVisible) issues.push('U11 tabs are visible on a focus screen');
  if (state.kind !== 'focus' && !navVisible) issues.push('U11 tabs are missing on a root/list screen');
  if (state.kind === 'root' && backVisible) issues.push('U11 back button on a root screen');
  if (state.kind !== 'root') {
    if (!backVisible) issues.push('U11 back button missing');
    else {
      const rect = back.getBoundingClientRect();
      if (rect.height < LIMITS.tap - 0.5 || rect.width < LIMITS.tap - 0.5) issues.push('U11 back button smaller than 48px');
      if (!back.textContent.trim()) issues.push('U11 back button has no text');
    }
  }

  // U12 S1: 先生カードと10種目が初期表示に入る（Ruling 16）
  if (state.teacherAndTiles) {
    const teacher = document.querySelector('[data-teacher-card]');
    if (!teacher || !fullyInView(teacher)) issues.push('U12 teacher card is not fully in the first view');
    const tiles = [...document.querySelectorAll('[data-group="dance"] > *')];
    if (tiles.length !== 10) issues.push(`U12 expected 10 dance tiles, found ${tiles.length}`);
    tiles.forEach((tile, index) => { if (!fullyInView(tile)) issues.push(`U12 dance tile ${index + 1} is not fully in the first view (bottom ${Math.round(tile.getBoundingClientRect().bottom)} > ${Math.round(usableBottom)})`); });
  }

  // U13 固定バーが画面の端に接している（下タブ・再生帯。PC の上部タブは上端）
  for (const bar of document.querySelectorAll(FIXED_BARS)) {
    if (!visible(bar)) continue;
    const rect = bar.getBoundingClientRect();
    const touches = Math.abs(rect.bottom - innerHeight) <= 2 || Math.abs(rect.top) <= 2;
    if (!touches) issues.push(`U13 fixed bar not at an edge (top ${Math.round(rect.top)} bottom ${Math.round(rect.bottom)}) ${describe(bar)}`);
  }

  // Ruling 21・23: 速さと ▶ は初期表示に入る。警告の枠は 375 幅で 120px 以下、中の操作は1つ
  if (state.speedAndPlay) {
    for (const selector of ['[data-group="speed"]', '[data-play]']) {
      const element = document.querySelector(selector);
      if (!element || !fullyInView(element)) issues.push(`R21/23 ${selector} is not fully in the first view`);
    }
  }
  if (state.alert) {
    const alert = document.querySelector('[data-alert]');
    if (!alert || !visible(alert)) issues.push('R23 alert is not shown');
    else {
      if (innerWidth < 1024 && alert.getBoundingClientRect().height > LIMITS.alertHeight + 0.5) issues.push(`R23 alert height ${Math.round(alert.getBoundingClientRect().height)} > ${LIMITS.alertHeight}`);
      const actions = [...alert.querySelectorAll(OPS)].filter(visible);
      if (actions.length > 1 || actions.some(action => !action.matches('[data-alert-action]'))) issues.push('R23 alert has an action other than one [data-alert-action]');
    }
  }
  // Ruling 47: S5 は声チップの下端〜▶ の帯の上端に 8px 以上の余裕。見出し（ルーティン名）は1行
  if (state.chipToDock) {
    const chip = document.querySelector('.dc-chip-row');
    const dock = document.querySelector('.dc-dock');
    if (chip && dock && innerWidth < 1024) {
      const room = dock.getBoundingClientRect().top - chip.getBoundingClientRect().bottom;
      if (room < LIMITS.chipToDock - 0.5) issues.push(`R47 voice chip to dock ${Math.round(room)}px < ${LIMITS.chipToDock}`);
    }
  }
  if (state.singleLineHeading) {
    const heading = document.querySelector('h1');
    const lines = heading ? Math.round(heading.getBoundingClientRect().height / parseFloat(getComputedStyle(heading).lineHeight)) : 0;
    if (lines !== 1) issues.push(`R47 heading is ${lines} lines, expected 1`);
  }
  // Ruling 44: 確認ダイアログは質問1つ・ボタン2つ・取り消しが左
  if (state.confirm) {
    const dialog = document.querySelector('dialog[open][data-confirm]');
    if (!dialog) issues.push('R44 confirm dialog is not open');
    else {
      const buttons = [...dialog.querySelectorAll('button')].filter(visible);
      if (buttons.length !== 2) issues.push(`R44 dialog has ${buttons.length} buttons, expected 2`);
      const [left] = buttons.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      if (!left?.matches('[data-cancel]')) issues.push('R44 the cancel button is not on the left');
    }
  }
  // Ruling 36・38・50: 不正な文字は赤枠と、常設の「使える文字」の行が赤くなる（同じ文を 2 回出さない＝理由の行は無し）、「追加する」は押せない
  // （名前は検査用の 13 件に無いもの。同じ名前だと「複製して追加」になる。Ruling 50-2）
  if (state.invalidCounts) {
    if (!document.querySelector('.dc-input--bad[aria-invalid="true"]')) issues.push('R38 invalid counts are not marked');
    const hint = document.querySelector('.dc-hint.dc-hint--bad');
    if (!hint || !visible(hint)) issues.push('R50 the allowed-symbols line is not shown in red');
    if (document.querySelector('.dc-reason')) issues.push('R50 a reason line is shown under the red allowed-symbols line');
    const decide = [...document.querySelectorAll('.dc-figure-form .dc-primary')].pop();
    if (!decide?.disabled) issues.push('R36 "Add" is pressable with invalid counts');
  }
  // D19: 同じ名前の追加は複製専用の形。注意は名前の欄のすぐ下（aria-describedby も名前の欄）、カウント欄・使える文字・形は出さない、
  // 主ボタンは複製元のカウント入りで押せる。依頼（「してください」）は画面に 1 つまで（Ruling 52・Ruling 7）
  if (state.sameNameCopy) {
    const form = [...document.querySelectorAll('.dc-figure-form')].pop();
    const name = form?.querySelector('input');
    const notice = name?.nextElementSibling;
    if (!notice?.matches('.dc-reason') || !visible(notice)) issues.push('D19 the same-name notice is not right under the name field');
    else if (!(name.getAttribute('aria-describedby') ?? '').split(' ').includes(notice.id)) issues.push('D19 the name field is not described by the same-name notice');
    if (form?.querySelector('.dc-input--counts')) issues.push('D19 the counts field is shown while adding a copy');
    if (form?.querySelector('[data-group="count-patterns"] .dc-chip')) issues.push('D19 count patterns are shown while adding a copy');
    if (form?.querySelector('[data-allowed-symbols]')) issues.push('D19 the allowed-symbols line is shown while adding a copy');
    const button = form?.querySelector('.dc-primary');
    if (button?.textContent.trim() !== state.sameNameCopy) issues.push(`D19 the main button reads "${button?.textContent.trim()}", expected "${state.sameNameCopy}"`);
    if (button?.disabled) issues.push('D19 the copy button is not pressable');
    const requests = (document.body.innerText.match(/してください/g) ?? []).length;
    if (requests > 1) issues.push(`R52 ${requests} requests on one screen (Ruling 7)`);
  }
  // D19・F6 round 4: 帯を隠すのはキーボードが開いている間だけ。フォーカスだけでは隠さない（キーボードの無い Chromium では出たまま）
  if (state.dockWhileFocused) {
    const dock = document.querySelector('.dc-dock');
    const focused = document.activeElement;
    if (!focused?.matches('.dc-figure-form input')) issues.push('F6 the name field should still have focus in this state');
    if (!dock) issues.push('F6 the bottom dock is missing from the page');
    else if (!visible(dock)) issues.push('F6 the bottom dock is hidden without an on-screen keyboard (it must not hide on focus alone)');
  }
  // Ruling 53・D18: カウントの形はワルツで 8 個・欄と一致するチップだけ押された印（開いた行は 1 個・不正なカウントは 0 個）・文字はチップの中で折れない
  if (state.patterns !== undefined) {
    const chips = [...document.querySelectorAll('[data-group="count-patterns"] .dc-chip')].filter(visible);
    if (chips.length !== state.patterns) issues.push(`R53 ${chips.length} count patterns, expected ${state.patterns}`);
    const pressed = chips.filter(chip => chip.getAttribute('aria-pressed') === 'true').length;
    if (pressed !== state.pressed) issues.push(`R53 ${pressed} pressed count patterns, expected ${state.pressed}`);
    for (const chip of chips) if (chip.scrollWidth > chip.clientWidth) issues.push(`R53 count pattern "${chip.textContent}" overflows its chip`);
  }
  // D20・Ruling 54: 名前が空の追加の行は一覧だけ（件数・見出し・先頭）。カウントの欄・使える文字・形・候補は無く、主ボタンは押せない。
  // 一覧のグループは figure-form の兄弟（ほかの [data-group] の中に入れ子にしない）
  if (state.nameChoices) {
    const group = document.querySelector('[data-group="figure-names"][data-catalog]');
    const form = [...document.querySelectorAll('.dc-figure-form')].pop();
    if (!group || !visible(group)) issues.push('R54 the figure name list is not shown');
    else {
      const chips = [...group.querySelectorAll('.dc-chip')].filter(visible);
      if (chips.length !== state.nameChoices.count) issues.push(`R54 ${chips.length} figure names, expected ${state.nameChoices.count}`);
      const heading = group.querySelector('.dc-field-label')?.textContent.trim();
      if (heading !== state.nameChoices.heading) issues.push(`R54 the list heading reads "${heading}", expected "${state.nameChoices.heading}"`);
      if (chips[0]?.textContent.trim() !== state.nameChoices.first) issues.push(`R54 the first name is "${chips[0]?.textContent.trim()}", expected "${state.nameChoices.first}"`);
      if (group.parentElement?.closest('[data-group]')) issues.push('R54 the figure name list is nested in another group');
      if (chips.some(chip => chip.hasAttribute('aria-pressed'))) issues.push('R54 the figure names carry aria-pressed (they fill the name, they do not toggle)');
    }
    for (const [selector, what] of [['.dc-input--counts', 'counts field'], ['[data-allowed-symbols]', 'allowed-symbols line'],
      ['[data-group="count-patterns"] .dc-chip', 'count patterns'], ['.dc-suggestions', 'name suggestions']]) {
      if (form?.querySelector(selector)) issues.push(`R54 the ${what} is shown while the name is empty`);
    }
    if (!form?.querySelector('.dc-primary')?.disabled) issues.push('R54 "Add" is pressable while the name is empty');
  }
  // 一覧の名前をタップした後: 名前の欄に入り、一覧は消え、同じ所にカウントの欄と形が出る（カウントが空なので「追加する」はまだ押せない）
  if (state.nameChosen) {
    const form = [...document.querySelectorAll('.dc-figure-form')].pop();
    const name = form?.querySelector('input')?.value;
    if (name !== state.nameChosen) issues.push(`R54 the name field reads "${name}", expected "${state.nameChosen}"`);
    if (document.querySelector('[data-group="figure-names"]')) issues.push('R54 the figure name list is still shown after choosing a name');
    if (!form?.querySelector('.dc-input--counts')) issues.push('R54 the counts field did not appear after choosing a name');
    if (!form?.querySelector('.dc-primary')?.disabled) issues.push('R54 "Add" is pressable before the counts are entered');
  }
  // Ruling 52・D16: 行の注意は 2 つで、依頼（「してください」）はちょうど 1 つ（Ruling 7 の機械判定）。全体の注意は一覧の下に 1 つ
  if (state.barNote) {
    const notes = [...document.querySelectorAll('.dc-row-note')].filter(visible);
    if (notes.length !== 2) issues.push(`R52 ${notes.length} row notes, expected 2`);
    const requests = notes.filter(note => note.textContent.includes('してください')).length;
    if (requests !== 1) issues.push(`R52 ${requests} row notes ask to edit, expected exactly 1 (Ruling 7)`);
    const barNotes = [...document.querySelectorAll('.dc-bar-note')].filter(visible);
    if (barNotes.length !== 1) issues.push(`R52 ${barNotes.length} mid-bar notes, expected 1`);
    else if (barNotes[0].closest('[data-list]')) issues.push('R52 the mid-bar note is inside the list');
  }
  if (state.voiceOffset) {
    const value = document.querySelector('[data-voice-offset]')?.textContent.trim();
    if (value !== state.voiceOffset) issues.push(`R62 voice timing reads "${value}", expected "${state.voiceOffset}"`);
  }
  return issues;
}
