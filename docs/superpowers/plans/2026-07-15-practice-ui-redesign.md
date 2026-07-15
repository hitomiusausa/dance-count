# 練習系2画面 UI刷新 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** シンプル再生・ルーティン練習編集の2画面を、年配・外国人ユーザー向けに「SVGアイコン＋短ラベル・44px以上タッチ・下固定再生バー・タップ展開カード」へ再構成する（ロジック不変）。

**Architecture:** 新規の共通CSS（`public/assets/ui.css`）とSVGスプライト（`public/assets/icons.svg`）を2ページから参照。`src/v2/` モジュール・localStorage保存形式・パーサは一切変更せず、各ページのDOM・インラインCSS・ページ内JSのDOM結線だけを変更する。検証は既存 `npm test`＋新設のアクセシビリティ機械ゲート（playwright-core＋実Chrome）＋指名ケースの目視。

**Tech Stack:** 素のHTML/CSS/ES Modules（ビルドなし）、node:test、playwright-core（devDependency・`channel:'chrome'` でインストール済みChromeを使用、ブラウザDLなし）。

**設計書:** `docs/superpowers/specs/2026-07-15-practice-ui-redesign-design.md`（本計画の正）

## Global Constraints

- **ロジック不変**: `src/v2/*.js` のモジュール、localStorageキー（`dance-count-v2-preferences` / `dance-count-v2-routine-draft:*` / `dance-count-v2-ui-locale`）、カウント表記、`timeline-view-model` 由来のクラス名（`beat-cell` `active-beat` `bar-start` `beat-event` `beat-number`）は変更禁止。
- **絵文字禁止**: アイコンは `public/assets/icons.svg` のSVG線画のみ。HTMLに絵文字コードポイントを追加しない（既存メッセージ内の `▶`/`■`/`⚠` 等の記号は絵文字ではないので許容だが、ボタン表示ではアイコンに置換する）。
- **アイコン＋短ラベル**: 主要操作は必ず `svg + <span data-i18n>` 併記。ラベルは `src/v2/ui-messages.js` の辞書（en / ja-JP 両方）に置く。
- **サイズ床**: 全ての操作要素（button, a, select, input, summary）は 44×44px 以上。主要ボタン（再生・フィガー追加・削除確認）は高さ48px以上。基本文字18px（`--dc-font`）。
- **コントラスト**: 文字と実効背景のコントラスト比 ≥ 4.5:1。主要ブルーは既存の `#315fe8`（白地に対し約5.3:1でPASS）を継承。
- **各タスクの終わりに** `npm test` 全緑を確認してからコミットする。Task 6 以降は `npm run ui:check` も全緑。
- コミットメッセージ末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` を付ける。
- サーバーは `npm start`（http://localhost:4173）。ページは `/public/practice.html` `/public/routine-editor.html`。

---

### Task 1: SVGアイコンスプライトと共通CSS

**Files:**
- Create: `public/assets/icons.svg`
- Create: `public/assets/ui.css`
- Test: `test/v2/ui-assets.test.js`

**Interfaces:**
- Produces: アイコンID `i-play i-stop i-plus i-copy i-trash i-pencil i-grip i-globe i-chevron i-undo i-redo i-repeat i-metronome i-gauge i-voice i-insert-after i-check i-arrow-up i-arrow-down`（`<use href="./assets/icons.svg#i-xxx">` で参照）。
- Produces: CSSクラス `.dc-btn .dc-btn.primary .dc-btn.danger .dc-icon .dc-icon.filled .dc-toggle .dc-chip .dc-select .dc-bar .dc-bar-inner .dc-panel .dc-add-figure` とトークン `--dc-*`。

- [ ] **Step 1: 失敗するテストを書く**

`test/v2/ui-assets.test.js` を新規作成:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

const ICON_IDS = [
  'play', 'stop', 'plus', 'copy', 'trash', 'pencil', 'grip', 'globe', 'chevron',
  'undo', 'redo', 'repeat', 'metronome', 'gauge', 'voice', 'insert-after', 'check',
  'arrow-up', 'arrow-down'
];

const UI_TOKENS = ['--dc-primary', '--dc-text', '--dc-text-sub', '--dc-tap', '--dc-tap-lg', '--dc-font'];
const UI_CLASSES = ['.dc-btn', '.dc-icon', '.dc-toggle', '.dc-chip', '.dc-select', '.dc-bar', '.dc-panel', '.dc-add-figure'];

test('icons.svg defines every required symbol id', async () => {
  const svg = await fs.readFile(path.join(root, 'public/assets/icons.svg'), 'utf8');
  for (const id of ICON_IDS) assert.ok(svg.includes(`id="i-${id}"`), `missing symbol i-${id}`);
  assert.ok(!/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(svg), 'icons.svg must not contain emoji');
});

test('ui.css defines shared tokens and component classes', async () => {
  const css = await fs.readFile(path.join(root, 'public/assets/ui.css'), 'utf8');
  for (const token of UI_TOKENS) assert.ok(css.includes(token), `missing token ${token}`);
  for (const className of UI_CLASSES) assert.ok(css.includes(className), `missing class ${className}`);
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npm test 2>&1 | grep -E "ui-assets|✖" | head`
Expected: `icons.svg defines every required symbol id` が ENOENT でFAIL。

- [ ] **Step 3: `public/assets/icons.svg` を作成**

```svg
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
  <symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></symbol>
  <symbol id="i-stop" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="i-copy" viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></symbol>
  <symbol id="i-trash" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/></symbol>
  <symbol id="i-pencil" viewBox="0 0 24 24"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></symbol>
  <symbol id="i-grip" viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></symbol>
  <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 4 5.7 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.7-4-9s1.5-6.4 4-9z"/></symbol>
  <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
  <symbol id="i-undo" viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></symbol>
  <symbol id="i-redo" viewBox="0 0 24 24"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></symbol>
  <symbol id="i-repeat" viewBox="0 0 24 24"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></symbol>
  <symbol id="i-metronome" viewBox="0 0 24 24"><path d="M10 3h4l3.5 15.5a1 1 0 0 1-1 1.5h-9a1 1 0 0 1-1-1.5L10 3z"/><path d="m12 14 5-8"/></symbol>
  <symbol id="i-gauge" viewBox="0 0 24 24"><path d="m12 13 4-4"/><path d="M4.5 17a8.5 8.5 0 1 1 15 0"/></symbol>
  <symbol id="i-voice" viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></symbol>
  <symbol id="i-insert-after" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="8" rx="2"/><path d="M12 14v7M8.5 17.5h7"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></symbol>
  <symbol id="i-arrow-up" viewBox="0 0 24 24"><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></symbol>
  <symbol id="i-arrow-down" viewBox="0 0 24 24"><path d="M12 5v14"/><path d="m6 13 6 6 6-6"/></symbol>
</svg>
```

塗り（fill）と線（stroke）はスプライト側では指定しない。参照側の `.dc-icon`（stroke）/`.dc-icon.filled`（fill）で制御する。`i-play` `i-stop` `i-grip` は filled で使う。

- [ ] **Step 4: `public/assets/ui.css` を作成**

```css
/* Dance Count 共通UI基盤 — 2026-07-15 spec */
:root {
  --dc-bg: #f3f5f9;
  --dc-card: #ffffff;
  --dc-line: #d5dce8;
  --dc-line-strong: #b7c1d2;
  --dc-text: #1a2338;
  --dc-text-sub: #4c5870;   /* 白地で 7.4:1 */
  --dc-primary: #315fe8;    /* 白地で 5.3:1 */
  --dc-primary-soft: #e9eeff;
  --dc-danger: #b13342;
  --dc-ok: #1f6b46;
  --dc-radius: 12px;
  --dc-radius-lg: 16px;
  --dc-font: 18px;
  --dc-font-sm: 14px;
  --dc-tap: 44px;
  --dc-tap-lg: 48px;
  --dc-shadow: 0 8px 24px #20335a14;
  --dc-bar-height: 78px;
}

.dc-icon { width: 22px; height: 22px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.dc-icon.filled { fill: currentColor; stroke: none; }
.dc-icon.small { width: 18px; height: 18px; }

.dc-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: var(--dc-tap); min-width: var(--dc-tap); padding: 10px 16px; border: 1px solid var(--dc-line-strong); border-radius: var(--dc-radius); background: var(--dc-card); color: var(--dc-text); font-size: var(--dc-font-sm); font-weight: 750; cursor: pointer; text-decoration: none; }
.dc-btn:hover { border-color: var(--dc-primary); color: var(--dc-primary); }
.dc-btn:disabled { opacity: .45; cursor: default; }
.dc-btn.primary { min-height: var(--dc-tap-lg); border-color: var(--dc-primary); background: var(--dc-primary); color: #fff; font-size: var(--dc-font); font-weight: 800; }
.dc-btn.primary:hover { color: #fff; }
.dc-btn.danger { color: var(--dc-danger); }
.dc-btn.danger:hover { border-color: var(--dc-danger); }

.dc-toggle { position: relative; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-height: var(--dc-tap-lg); min-width: 76px; padding: 8px 12px; border: 1.5px solid var(--dc-line-strong); border-radius: var(--dc-radius); background: var(--dc-card); color: var(--dc-text-sub); font-size: 13px; font-weight: 750; cursor: pointer; }
.dc-toggle input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
.dc-toggle:has(input:checked) { border-color: var(--dc-primary); background: var(--dc-primary-soft); color: var(--dc-primary); }
.dc-toggle:has(input:focus-visible) { outline: 3px solid #315fe84d; outline-offset: 2px; }

.dc-chip { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-height: var(--dc-tap-lg); min-width: 64px; padding: 6px 10px; border: 1px solid transparent; border-radius: var(--dc-radius); background: transparent; color: var(--dc-text-sub); font-size: 12px; font-weight: 750; cursor: pointer; }
.dc-chip:hover, .dc-chip[aria-expanded="true"] { border-color: var(--dc-line-strong); background: var(--dc-primary-soft); color: var(--dc-primary); }

.dc-select { width: 100%; min-height: var(--dc-tap-lg); padding: 10px 12px; border: 1px solid var(--dc-line-strong); border-radius: var(--dc-radius); background: #fff; color: var(--dc-text); font-size: var(--dc-font-sm); }
input.dc-select { min-height: var(--dc-tap-lg); }
input[type="range"].dc-range { min-height: var(--dc-tap); accent-color: var(--dc-primary); }

.dc-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 6; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); border-top: 1px solid var(--dc-line); background: #fffffff5; backdrop-filter: blur(12px); }
.dc-bar-inner { display: flex; align-items: center; justify-content: center; gap: 10px; max-width: 900px; margin: auto; }

.dc-panel { position: fixed; left: 12px; right: 12px; bottom: calc(var(--dc-bar-height) + 8px + env(safe-area-inset-bottom)); z-index: 7; max-width: 560px; margin: auto; padding: 16px; border: 1px solid var(--dc-line); border-radius: var(--dc-radius-lg); background: #fff; box-shadow: var(--dc-shadow); }
.dc-panel[hidden] { display: none; }

.dc-add-figure { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 56px; margin-top: 12px; border: 2px dashed var(--dc-line-strong); border-radius: var(--dc-radius-lg); background: #fbfcff; color: var(--dc-text-sub); font-size: var(--dc-font-sm); font-weight: 800; cursor: pointer; }
.dc-add-figure:hover { border-color: var(--dc-primary); color: var(--dc-primary); background: var(--dc-primary-soft); }
```

- [ ] **Step 5: テスト緑を確認してコミット**

Run: `npm test 2>&1 | grep -E "ℹ (tests|pass|fail)"`
Expected: tests 90, fail 0（既存88＋新2）。

```bash
git add public/assets/icons.svg public/assets/ui.css test/v2/ui-assets.test.js
git commit -m "feat: 共通UI基盤（SVGアイコンスプライトとui.css）を追加"
```

---

### Task 2: i18n辞書へ新ラベルを追加

**Files:**
- Modify: `src/v2/ui-messages.js`
- Test: `test/v2/ui-messages-keys.test.js`（新規）

**Interfaces:**
- Produces: PRACTICE_MESSAGES に `languageToggle`。EDITOR_MESSAGES に `languageToggle` `speedShort` `voiceShort` `countInShort` `settingsSummary` `closePanel`。en / ja-JP 両方。

- [ ] **Step 1: 失敗するテストを書く**

`test/v2/ui-messages-keys.test.js` を新規作成:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE_MESSAGES, EDITOR_MESSAGES } from '../../src/v2/ui-messages.js';

const PRACTICE_NEW_KEYS = ['languageToggle'];
const EDITOR_NEW_KEYS = ['languageToggle', 'speedShort', 'voiceShort', 'countInShort', 'settingsSummary', 'closePanel'];

test('practice dictionaries define the redesign keys in both locales', () => {
  for (const locale of ['en', 'ja-JP']) {
    for (const key of PRACTICE_NEW_KEYS) {
      assert.ok(PRACTICE_MESSAGES[locale][key], `${locale}:${key}`);
    }
  }
});

test('editor dictionaries define the redesign keys in both locales', () => {
  for (const locale of ['en', 'ja-JP']) {
    for (const key of EDITOR_NEW_KEYS) {
      assert.ok(EDITOR_MESSAGES[locale][key], `${locale}:${key}`);
    }
  }
});
```

- [ ] **Step 2: FAIL確認**

Run: `npm test 2>&1 | grep -E "redesign keys|✖" | head`
Expected: 2件FAIL。

- [ ] **Step 3: 辞書へ追加**

`src/v2/ui-messages.js` を編集。PRACTICE_MESSAGES の en オブジェクト末尾（`sambaStructure: …` の後）にカンマ区切りで追加:

```js
languageToggle: 'Switch display language'
```

PRACTICE_MESSAGES の 'ja-JP' 末尾に:

```js
languageToggle: '表示言語を切り替え'
```

EDITOR_MESSAGES の en 末尾（`unsupportedToken: …` の後）に:

```js
languageToggle: 'Switch display language', speedShort: 'Speed', voiceShort: 'Voice', countInShort: 'Count-in', settingsSummary: 'Advanced settings', closePanel: 'Close'
```

EDITOR_MESSAGES の 'ja-JP' 末尾に:

```js
languageToggle: '表示言語を切り替え', speedShort: '速度', voiceShort: '音声', countInShort: 'カウントイン', settingsSummary: '詳細設定', closePanel: '閉じる'
```

- [ ] **Step 4: 緑確認してコミット**

Run: `npm test 2>&1 | grep -E "ℹ (tests|pass|fail)"`
Expected: tests 92, fail 0。

```bash
git add src/v2/ui-messages.js test/v2/ui-messages-keys.test.js
git commit -m "feat: UI刷新用のラベルを日英辞書へ追加"
```

---

### Task 3: シンプル再生画面の再構成

**Files:**
- Modify: `public/practice.html`
- Test: `test/v2/ui-assets.test.js`（アサーション追加）

**Interfaces:**
- Consumes: Task 1 のアイコンID・CSSクラス、Task 2 の `languageToggle`。
- Produces: `#uiLocale` は `<button>` になる（`value` プロパティは持たない）。`#playLabel` `#playIcon` 要素。ロジック（保存キー・engine呼び出し）は不変。

- [ ] **Step 1: テストにアサーション追加（先に赤）**

`test/v2/ui-assets.test.js` 末尾に追加:

```js
test('practice.html links the shared UI assets and has no emoji', async () => {
  const html = await fs.readFile(path.join(root, 'public/practice.html'), 'utf8');
  assert.ok(html.includes('assets/ui.css'), 'ui.css link missing');
  assert.ok(html.includes('assets/icons.svg#i-globe'), 'globe icon missing');
  assert.ok(!/[\u{1F000}-\u{1FAFF}\u{2700}-\u{27BF}]/u.test(html), 'no emoji allowed');
});
```

Run: `npm test 2>&1 | grep "practice.html links"` → FAIL を確認。

- [ ] **Step 2: head に共通CSSを読み込む**

`<style>` タグの直前（line 13付近）に挿入:

```html
  <link rel="stylesheet" href="./assets/ui.css">
```

- [ ] **Step 3: 言語切替を globeボタンへ置換**

DOM置換（line 99）:

```html
<!-- 旧 -->
<label class="ui-locale"><span data-i18n="interfaceLanguage">画面表示</span><select id="uiLocale"><option value="en">English</option><option value="ja-JP">日本語</option></select></label>
<!-- 新 -->
<button id="uiLocale" class="dc-btn ui-locale" type="button"><svg class="dc-icon" aria-hidden="true"><use href="./assets/icons.svg#i-globe"/></svg><span>日本語 / English</span></button>
```

CSS `.ui-locale { width: 150px; margin: 0 0 14px auto; }` を `.ui-locale { display: flex; margin: 0 0 14px auto; }` に変更。

JS変更（2箇所）:

`applyUiLocale()` 内の `$('#uiLocale').value = translator.locale;` を:

```js
$('#uiLocale').setAttribute('aria-label', t('languageToggle'));
```

イベント結線（line 575の `$('#uiLocale').addEventListener('change', async event => {`）を click ＋ トグルに変更。ハンドラ本体は既存のまま、先頭だけ差し替え:

```js
$('#uiLocale').addEventListener('click', async () => {
  stop();
  translator = createPracticeTranslator(translator.locale === 'ja-JP' ? 'en' : 'ja-JP');
  localStorage.setItem(UI_LOCALE_STORAGE_KEY, translator.locale);
  // 以降は既存と同じ: applyUiLocale(); populateDanceOptions(); … updatePlayLabel();
```

- [ ] **Step 4: 繰り返す・メトロノームを大型トグルへ、カウントインを大型selectへ**

`.options` ブロック（lines 133-143）を置換。**inputのidと構造は不変**（JSは `$('#loop').checked` を読み続ける）:

```html
<div class="options">
  <label class="dc-toggle"><input id="loop" type="checkbox" checked><svg class="dc-icon" aria-hidden="true"><use href="./assets/icons.svg#i-repeat"/></svg><span data-i18n="loop">繰り返す</span></label>
  <label class="dc-toggle"><input id="metronome" type="checkbox" checked><svg class="dc-icon" aria-hidden="true"><use href="./assets/icons.svg#i-metronome"/></svg><span data-i18n="metronome">メトロノーム</span></label>
  <label class="count-in-label"><span data-i18n="countIn">カウントイン</span>
    <select id="countIn" class="dc-select">
      <option value="0" data-i18n="none">なし</option>
      <option value="1" selected data-i18n="oneBar">1小節</option>
      <option value="2" data-i18n="twoBars">2小節</option>
    </select>
  </label>
</div>
```

旧 `.check` CSS 2行（lines 64-65）を削除し、`.count-in-label { min-width: 130px; }` を追加。

- [ ] **Step 5: 再生ボタンを下固定バーへ**

`.transport` ブロック（line 151）を置換:

```html
<div class="transport dc-bar"><div class="dc-bar-inner">
  <button id="play" class="dc-btn primary play"><svg class="dc-icon filled" aria-hidden="true"><use id="playIcon" href="./assets/icons.svg#i-play"/></svg><span id="playLabel"></span></button>
</div></div>
```

CSS変更: `.transport { display:flex; justify-content:center; margin-top:25px; }` を削除（dc-barが引き受ける）。`.play` の width/min-height 指定は `width: min(420px, 100%);` のみ残す。`.app` の `padding: 28px 18px 70px;` を `padding: 28px 18px calc(var(--dc-bar-height) + 40px);` に変更。

JSにヘルパーを追加し、`playButton.textContent = …` の3箇所を置換:

```js
function setPlayDisplay(label, playing = false) {
  $('#playLabel').textContent = label.replace(/^[▶■]\s*/, '');
  $('#playIcon').setAttribute('href', `./assets/icons.svg#i-${playing ? 'stop' : 'play'}`);
  playButton.classList.toggle('stop', playing);
}
```

- `updatePlayLabel()` 末尾の `playButton.textContent = …` → `setPlayDisplay(bars ? t('playAfterBars', …) : …)`（同じ式を渡す）
- `start()` 内 `playButton.textContent = t('stop'); playButton.classList.add('stop');` → `setPlayDisplay(t('stop'), true);`
- `onFrame` の `playButton.classList.remove('stop')` は `updatePlayLabel()` が呼ばれるので削除可（残しても害なし）。

- [ ] **Step 6: 残りの大型化・リンクのボタン化・死にCSS削除**

- `select, input[type="number"]` のルール（line 44）: `min-height: 44px` → `min-height: var(--dc-tap-lg); font-size: var(--dc-font-sm);`
- `#bpm` に `class="dc-range"` を追加。
- ヘッダーのリンクを `class="dc-btn"` 付きに: `<a href="./routine-editor.html" class="dc-btn"><svg class="dc-icon small" aria-hidden="true"><use href="./assets/icons.svg#i-pencil"/></svg><span data-i18n="editor">一覧で練習・編集</span></a>`（taglineの `・` 連結はやめ、tagline文とボタンを縦に並べる）。
- `.voice-choice a`（録音・音声パック管理）も同様に `dc-btn` 化＋ `i-voice` アイコン。
- editor-link 段落内のリンクも `dc-btn` 化。
- 未使用CSS削除: lines 78-91（`details` `summary` `.advanced` `.offset-guide` `.offset-scale` `.word-details` `.word-offsets` `.word-offset` `.word-reset` — practice.html のDOMに対応要素が無い）。
- 低コントラスト色の引き上げ: `.figure-position`(#7a8498) → `var(--dc-text-sub)`、`.routine-figure-button .index`(#7c879b) → `#5b6577`、`.count.subdivision`(#69738a) → `#57637d`、`.guide`(#70798c) → `var(--dc-text-sub)`、`.routine-overview-head span`(#748096) → `var(--dc-text-sub)`。

- [ ] **Step 7: 検証してコミット**

Run: `npm test 2>&1 | grep -E "ℹ (tests|pass|fail)"` → tests 93, fail 0。
ブラウザ確認（`npm start` 起動済み前提）: http://localhost:4173/public/practice.html を390px幅と1280px幅で開き、①言語ボタンで日英が切り替わる ②トグルの押下状態が色で分かる ③下固定バーの再生→カウントが光る→停止 ④ルーティン練習モードでも動く、を確認。コンソールエラー0。

```bash
git add public/practice.html test/v2/ui-assets.test.js
git commit -m "feat: シンプル再生をアイコン+ラベル・大型トグル・下固定バーへ再構成"
```

---

### Task 4: 編集画面 — カードのタップ展開とラベル付き操作、末尾追加ボタン

**Files:**
- Modify: `public/routine-editor.html`
- Test: `test/v2/ui-assets.test.js`（アサーション追加）

**Interfaces:**
- Consumes: Task 1/2 の成果物。
- Produces: `.figure.expanded` クラス（タップ選択）、`.figure.active`（再生中・既存）。どちらかが付いたカードだけ `.beat-timeline` と `.card-actions` が見える。`#add` はカード一覧末尾の `.dc-add-figure`。

- [ ] **Step 1: テストにアサーション追加（先に赤）**

`test/v2/ui-assets.test.js` 末尾に追加:

```js
test('routine-editor.html links the shared UI assets and labels card actions', async () => {
  const html = await fs.readFile(path.join(root, 'public/routine-editor.html'), 'utf8');
  assert.ok(html.includes('assets/ui.css'), 'ui.css link missing');
  assert.ok(html.includes('dc-add-figure'), 'list-end add button missing');
  assert.ok(html.includes('icons.svg#i-copy'), 'labeled duplicate action missing');
  assert.ok(!/[\u{1F000}-\u{1FAFF}\u{2700}-\u{27BF}]/u.test(html), 'no emoji allowed');
});
```

Run: `npm test 2>&1 | grep "routine-editor.html links"` → FAIL確認。

- [ ] **Step 2: head に `<link rel="stylesheet" href="./assets/ui.css">` を挿入**（`<style>` の直前）

- [ ] **Step 3: render() のカードHTMLを差し替え**

`render()` 内 `row.innerHTML = …`（lines 454-463）を次に置換（テンプレート全文・エスケープ関数は既存を使用）:

```js
row.innerHTML = `<span class="number" aria-hidden="true">${index + 1}</span><button class="drag-handle" draggable="true" aria-label="${escapeHtml(t('moveFigure', { name: displayName }))}" title="${escapeHtml(t('moveTitle'))}"><svg class="dc-icon filled" aria-hidden="true"><use href="./assets/icons.svg#i-grip"/></svg></button>
  <button class="figure-summary" type="button" aria-expanded="false"><span class="figure-summary-name">${escapeHtml(displayName)}</span><span class="figure-summary-counts">${escapeHtml(figure.counts)}</span><svg class="dc-icon small chevron" aria-hidden="true"><use href="./assets/icons.svg#i-chevron"/></svg></button>
  <div class="figure-detail">
    <label>${escapeHtml(t('figureLabel'))}<select class="figure-name dc-select" aria-label="${escapeHtml(t('figureLabel'))}">${figureOptions.map((option, optionIndex) => `<option value="${optionIndex}"${option.name === figure.name && option.counts === figure.counts ? ' selected' : ''}>${escapeHtml(figureDisplayName(routine.danceId, option.name, translator.locale))} (${escapeHtml(option.counts)})</option>`).join('')}</select></label>
    <label>${escapeHtml(t('countsLabel'))}<input class="counts dc-select" value="${escapeHtml(figure.counts)}" readonly aria-readonly="true"></label>
    <div class="card-actions">
      <button class="preview dc-btn" aria-label="${escapeHtml(t('previewFigure', { name: displayName }))}"><svg class="dc-icon filled small" aria-hidden="true"><use href="./assets/icons.svg#i-play"/></svg><span>${escapeHtml(t('previewButton'))}</span></button>
      <button class="duplicate dc-btn" aria-label="${escapeHtml(t('duplicateFigure', { name: displayName }))}"><svg class="dc-icon small" aria-hidden="true"><use href="./assets/icons.svg#i-copy"/></svg><span>${escapeHtml(t('duplicate'))}</span></button>
      <button class="insert-after dc-btn" aria-label="${escapeHtml(t('insertAfterFigure', { name: displayName }))}"><svg class="dc-icon small" aria-hidden="true"><use href="./assets/icons.svg#i-insert-after"/></svg><span>${escapeHtml(t('insertAfter'))}</span></button>
      <button class="remove dc-btn danger" aria-label="${escapeHtml(t('deleteFigure', { name: displayName }))}"><svg class="dc-icon small" aria-hidden="true"><use href="./assets/icons.svg#i-trash"/></svg><span>${escapeHtml(t('deleteShort'))}</span></button>
    </div>
    <div class="beat-timeline" data-timeline-index="${index}" aria-label="${escapeHtml(t('timeline', { name: displayName }))}"></div>
  </div>`;
```

続けて既存リスナー結線の後に展開トグルを追加（`row.querySelector('.insert-after').addEventListener(…)` の直後）:

```js
row.querySelector('.figure-summary').addEventListener('click', () => {
  const expanded = row.classList.toggle('expanded');
  row.querySelector('.figure-summary').setAttribute('aria-expanded', String(expanded));
  document.querySelectorAll('.figure.expanded').forEach(other => {
    if (other !== row) {
      other.classList.remove('expanded');
      other.querySelector('.figure-summary')?.setAttribute('aria-expanded', 'false');
    }
  });
});
```

- [ ] **Step 4: カードCSSを更新**

`.figure` の grid 定義（line 41）を1カラムへ:

```css
.figure { position: relative; display: grid; gap: 8px; padding: 12px 13px; border: 1px solid #dce2eb; border-radius: 12px; background: white; transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, opacity .12s; }
.figure-summary { display: flex; align-items: center; gap: 10px; min-height: var(--dc-tap); padding: 4px 2px; border: 0; background: transparent; color: var(--dc-text); font-size: 15px; font-weight: 750; text-align: left; cursor: pointer; }
.figure-summary-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.figure-summary-counts { color: var(--dc-text-sub); font-size: 13px; font-weight: 800; letter-spacing: 1px; }
.figure-summary .chevron { transition: transform .15s; }
.figure.expanded .figure-summary .chevron { transform: rotate(180deg); }
.figure-detail { display: none; gap: 8px; grid-template-columns: minmax(180px, 1fr) minmax(145px, .55fr); align-items: end; }
.figure.expanded .figure-detail, .figure.active .figure-detail { display: grid; }
.beat-timeline, .card-actions { grid-column: 1 / -1; }
.card-actions { display: flex; flex-wrap: wrap; gap: 6px; }
```

旧 `.card-actions button { padding: 10px; }` `.icon-button` 系ルール（lines 74-80）と `.remove { padding: 10px; }` `.preview {…}` を削除（`.dc-btn` が引き受ける）。
`.drag-handle` は `width: 34px` → `width: 44px;`、`left: -43px` → `left: -50px;`、`::before`（radial-gradientのドット）を削除し中のSVGを表示。`.figures { padding-left: 46px; }` → `padding-left: 52px;`。モバイル用 `.drag-handle { left:-38px; width:31px; }`（line 128内）→ `left: -46px; width: 44px;`、`.figures { padding-left: 39px; }` → `padding-left: 48px;`。
モバイルの `.figure { grid-template-columns: 1fr auto auto; }` と `.figure label:nth-of-type(2) {…}` は削除（1カラム化で不要）。

- [ ] **Step 5: #add をツールバーから一覧末尾へ移動**

`.toolbar` から `#add` ボタン行（line 172）を削除し、`<section id="figures" class="figures"></section>` の直後に:

```html
<button id="add" class="dc-add-figure"><svg class="dc-icon" aria-hidden="true"><use href="./assets/icons.svg#i-plus"/></svg><span data-i18n="addFigure">フィガー追加</span></button>
```

既存の `document.querySelector('#add').addEventListener('click', () => openCreateDialog());` はそのまま動く。
`#undo` `#redo` はアイコン併記に変更（文字列先頭の `↶`/`↷` は data-i18n の辞書値に含まれるため、ボタン構造だけ変更）:

```html
<button id="undo" class="dc-btn"><svg class="dc-icon small" aria-hidden="true"><use href="./assets/icons.svg#i-undo"/></svg><span data-i18n="undo">元に戻す</span></button>
<button id="redo" class="dc-btn"><svg class="dc-icon small" aria-hidden="true"><use href="./assets/icons.svg#i-redo"/></svg><span data-i18n="redo">やり直す</span></button>
```

注意: `applyUiLocale()` は `[data-i18n]` の textContent を書き換える。span に data-i18n を置く現行構造なら svg は温存される（#add と同じパターン）。辞書の `undo: '↶ Undo'` 等の矢印文字は残っても span 内テキストなので害なし（見た目が二重になるため、`ui-messages.js` の undo/redo から `↶ `/`↷ ` プレフィックスを削除する — en/ja 4箇所）。

- [ ] **Step 6: 検証してコミット**

Run: `npm test 2>&1 | grep -E "ℹ (tests|pass|fail)"` → tests 94, fail 0。
ブラウザ確認（390px/1280px）: ①一覧がすっきり表示 ②カードタップで展開・別カードタップで排他展開 ③展開内の試聴・複製・後ろに追加・削除（確認ダイアログ→Undo復元）④ドラッグとキーボード上下で並べ替え ⑤末尾の「＋フィガー追加」→ダイアログ→末尾に追加 ⑥全体試聴中、鳴っているカードが自動で開いて拍が光る（.activeで展開される）。コンソールエラー0。

```bash
git add public/routine-editor.html src/v2/ui-messages.js test/v2/ui-assets.test.js
git commit -m "feat: 編集画面カードをタップ展開+ラベル付き操作に再構成し追加ボタンを一覧末尾へ"
```

---

### Task 5: 編集画面 — 下固定バーの再構成と詳細設定の段階表示

**Files:**
- Modify: `public/routine-editor.html`

**Interfaces:**
- Consumes: Task 2 の `speedShort` `voiceShort` `countInShort` `settingsSummary` `closePanel`。
- Produces: `#speedChip` `#voiceChip` `#countInChip`（aria-expanded制御）、`#speedPanel` `#voicePanel` `#countInPanel`（既存コントロールを内包・idは不変）、`#playLabel` `#playIcon`。

- [ ] **Step 1: transport を再構成**

`<footer class="transport">…</footer>`（lines 184-194）を置換:

```html
<footer class="transport dc-bar">
  <div class="dc-bar-inner">
    <button id="speedChip" class="dc-chip" type="button" aria-expanded="false" aria-controls="speedPanel"><svg class="dc-icon" aria-hidden="true"><use href="./assets/icons.svg#i-gauge"/></svg><span data-i18n="speedShort">速度</span></button>
    <button id="play" class="dc-btn primary play"><svg class="dc-icon filled" aria-hidden="true"><use id="playIcon" href="./assets/icons.svg#i-play"/></svg><span id="playLabel" data-i18n="previewAll">▶ 全体を試聴</span></button>
    <button id="voiceChip" class="dc-chip" type="button" aria-expanded="false" aria-controls="voicePanel"><svg class="dc-icon" aria-hidden="true"><use href="./assets/icons.svg#i-voice"/></svg><span data-i18n="voiceShort">音声</span></button>
    <button id="countInChip" class="dc-chip" type="button" aria-expanded="false" aria-controls="countInPanel"><svg class="dc-icon" aria-hidden="true"><use href="./assets/icons.svg#i-metronome"/></svg><span data-i18n="countInShort">カウントイン</span></button>
    <div id="now" class="now" data-i18n="stopped">停止中</div>
  </div>
  <div id="speedPanel" class="dc-panel" hidden>
    <label><span data-i18n="previewSpeed">試聴速度（BPM）</span>
      <span class="bpm-row"><input id="routineBpm" class="dc-select" type="number" min="40" max="220"><button id="resetBpm" type="button" class="dc-btn" data-i18n="standard">標準</button></span>
    </label>
  </div>
  <div id="voicePanel" class="dc-panel" hidden>
    <label><span data-i18n="voice">再生する音声</span><select id="editorVoicePackChoice" class="dc-select"><option value="standard" data-i18n="standardVoice">標準音声</option></select></label>
    <label class="dc-toggle voice-panel-toggle"><input id="editorMetronome" type="checkbox" checked><svg class="dc-icon" aria-hidden="true"><use href="./assets/icons.svg#i-metronome"/></svg><span data-i18n="metronome">メトロノーム</span></label>
    <a href="./voice-recorder.html" class="dc-btn"><svg class="dc-icon small" aria-hidden="true"><use href="./assets/icons.svg#i-voice"/></svg><span data-i18n="manageVoice">録音・音声パック管理</span></a>
  </div>
  <div id="countInPanel" class="dc-panel" hidden>
    <label><span data-i18n="fullCountIn">全体のカウントイン</span>
      <select id="fullCountIn" class="dc-select">
        <option value="0" data-i18n="none">なし</option>
        <option value="1" selected data-i18n="oneBar">1小節</option>
        <option value="2" data-i18n="twoBars">2小節</option>
      </select>
    </label>
  </div>
</footer>
```

対応して `<section class="top">` から BPM の label を削除（routine select と 下書き名の2カラムへ: `.top { grid-template-columns: 1.2fr 1fr; }`）。

- [ ] **Step 2: practice-panel を解体して詳細設定へ**

`<section class="practice-panel">…</section>`（lines 143-168）を削除し、`<div class="list-head">` の後・`<section id="figures">` … `#add` ボタンより後ろに:

```html
<details class="advanced-settings">
  <summary><svg class="dc-icon small" aria-hidden="true"><use href="./assets/icons.svg#i-chevron"/></svg><span data-i18n="settingsSummary">詳細設定</span></summary>
  <div class="advanced-body">
    <details class="timing-details">
      <summary data-i18n="timingSummary">音声タイミングを微調整</summary>
      <div class="timing-grid"><!-- 旧 practice-panel 内の .timing-grid の中身をそのまま移動（idは不変: #editorVoiceOffset #editorOffsetValue #resetEditorOffsets #commitVoiceTiming #commitVoiceTimingHint #editorWordOffsets） --></div>
    </details>
    <button id="reset" class="dc-btn danger" data-i18n="resetData">元データに戻す</button>
  </div>
</details>
```

CSS追加:

```css
.advanced-settings { margin: 18px 0 0; padding: 4px 0 0; border-top: 1px solid #e2e6ed; }
.advanced-settings > summary { display: flex; align-items: center; gap: 8px; min-height: var(--dc-tap); cursor: pointer; color: var(--dc-text-sub); font-weight: 800; list-style: none; }
.advanced-settings[open] > summary .dc-icon { transform: rotate(180deg); }
.advanced-body { display: grid; gap: 14px; padding: 12px 2px; }
.voice-panel-toggle { margin-top: 10px; }
#voicePanel .dc-btn { margin-top: 10px; }
```

`.toolbar` に残るのは `#undo` `#redo` のみ。

- [ ] **Step 3: チップ開閉JSを追加**

モジュールスクリプト末尾（`loadRoutine(sources[0].id);` の前）に:

```js
for (const [chipId, panelId] of [['speedChip', 'speedPanel'], ['voiceChip', 'voicePanel'], ['countInChip', 'countInPanel']]) {
  document.querySelector(`#${chipId}`).addEventListener('click', () => {
    const panel = document.querySelector(`#${panelId}`);
    const open = panel.hidden;
    document.querySelectorAll('.dc-panel').forEach(item => { item.hidden = true; });
    document.querySelectorAll('.dc-chip[aria-controls]').forEach(chip => chip.setAttribute('aria-expanded', 'false'));
    panel.hidden = !open;
    document.querySelector(`#${chipId}`).setAttribute('aria-expanded', String(open));
  });
}
document.addEventListener('click', event => {
  if (event.target.closest('.dc-panel, .dc-chip')) return;
  document.querySelectorAll('.dc-panel').forEach(item => { item.hidden = true; });
  document.querySelectorAll('.dc-chip[aria-controls]').forEach(chip => chip.setAttribute('aria-expanded', 'false'));
});
```

- [ ] **Step 4: play ボタンの表示切替をアイコン対応に**

Task 3 と同じパターン。ヘルパーを追加:

```js
function setPlayDisplay(label, playing = false) {
  document.querySelector('#playLabel').textContent = label.replace(/^[▶■]\s*/, '');
  document.querySelector('#playIcon').setAttribute('href', `./assets/icons.svg#i-${playing ? 'stop' : 'play'}`);
  play.classList.toggle('stop', playing);
}
```

置換（4箇所）: `stop()` と `stopDisplay()` の `play.textContent = t('previewAll'); play.classList.remove('stop');` → `setPlayDisplay(t('previewAll'));`、`start()` の `play.textContent = t('stop'); play.classList.add('stop');` → `setPlayDisplay(t('stop'), true);`。
また `#playLabel` に `data-i18n="previewAll"` が付いているため、`applyUiLocale()` が言語切替時に上書きしても `previewAll` ラベルになり整合する（再生中の切替は `stop()` が先に呼ばれる）。

- [ ] **Step 5: 固定バーのモバイル対応と余白**

`@media (max-width: 650px)` 内の `.transport { position: static; … } .transport-inner { flex-direction: column; } .play { width:100%; min-width:0; } .now { min-width:0; }` を削除し、代わりに:

```css
@media (max-width: 650px) { .now { display: none; } .dc-chip { min-width: 56px; } .play { min-width: 0; flex: 1; } }
```

`.app { padding: 25px 18px 120px; }` は維持（bar高さぶん確保済み）。モバイル用の `.app { padding-bottom: 35px; }` 削除。旧 `.transport {…} .transport-inner {…} .transport label {…} .transport select {…}` の固定CSSは dc-bar と重複するため削除（`.play` の min-width/font-size 指定は `.play { min-width: min(260px, 40vw); }` に整理）。

- [ ] **Step 6: 検証してコミット**

Run: `npm test 2>&1 | grep -E "ℹ (tests|pass|fail)"` → fail 0。
ブラウザ確認（390px/1280px）: ①下バーが常に固定 ②速度チップ→パネルでBPM変更・標準に戻す ③音声チップ→音声切替・メトロノームON/OFF ④カウントインチップ→なし/1小節/2小節 ⑤再生/停止でアイコンとラベルが切替 ⑥最後のカードと「＋フィガー追加」がバーに隠れない ⑦詳細設定を開くと音声タイミング微調整（A/B試聴含む）と元データに戻すが動く ⑧English切替で全ラベル英語。コンソールエラー0。

```bash
git add public/routine-editor.html
git commit -m "feat: 編集画面の下固定バー再構成と詳細設定の段階表示"
```

---

### Task 6: アクセシビリティ機械ゲート（タッチ44px・コントラスト4.5:1・コンソール0）

**Files:**
- Create: `tools/check-ui-accessibility.js`
- Modify: `package.json`（devDependency と script 追加）

**Interfaces:**
- Consumes: `npm start` で起動済みのローカルサーバー（デフォルト `http://localhost:4173/public/`、`DC_BASE_URL` で上書き可）。
- Produces: `npm run ui:check` — 違反0で exit 0、違反ありで exit 1 と一覧出力。

- [ ] **Step 1: playwright-core を導入**

```bash
npm install --save-dev playwright-core
```

`package.json` の scripts に追加: `"ui:check": "node tools/check-ui-accessibility.js"`
注意: `channel: 'chrome'` でインストール済みGoogle Chromeを使う（ブラウザのダウンロードなし）。Chromeが無い環境ではエラーメッセージを出して終了する。

- [ ] **Step 2: チェッカーを書く**

`tools/check-ui-accessibility.js`:

```js
#!/usr/bin/env node
import { chromium } from 'playwright-core';

const BASE = process.env.DC_BASE_URL ?? 'http://localhost:4173/public/';
const PAGES = ['practice.html', 'routine-editor.html'];
const VIEWPORTS = [{ name: 'mobile', width: 390, height: 844 }, { name: 'desktop', width: 1280, height: 900 }];
const MIN_TAP = 44;
const MIN_CONTRAST = 4.5;

const browser = await chromium.launch({ channel: 'chrome' }).catch(error => {
  console.error('Google Chrome を起動できませんでした。Chromeのインストールとサーバー(npm start)を確認してください。');
  console.error(error.message);
  process.exit(2);
});

let violations = 0;

for (const pageName of PAGES) {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => consoleErrors.push(error.message));
    await page.goto(BASE + pageName, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const found = await page.evaluate(({ MIN_TAP, MIN_CONTRAST }) => {
      const issues = [];
      const visible = element => {
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || element.closest('[hidden]')) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const describe = element => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}.${[...element.classList].join('.')} "${(element.textContent ?? '').trim().slice(0, 24)}"`;

      // 1) タッチ目標
      for (const element of document.querySelectorAll('button, select, summary, a, input:not([type="hidden"])')) {
        if (!visible(element)) continue;
        if (element.closest('.dc-toggle') && element.tagName === 'INPUT') continue; // トグルはlabel全体が目標
        const rect = element.getBoundingClientRect();
        const effective = element.closest('label.dc-toggle')?.getBoundingClientRect() ?? rect;
        if (effective.height < MIN_TAP - 0.5 || effective.width < MIN_TAP - 0.5) {
          issues.push(`TAP ${Math.round(effective.width)}x${Math.round(effective.height)} ${describe(element)}`);
        }
      }

      // 2) コントラスト
      const linear = channel => { const c = channel / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      const luminance = rgb => 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
      const parse = value => { const match = value.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/); return match ? { rgb: [+match[1], +match[2], +match[3]], alpha: match[4] === undefined ? 1 : +match[4] } : null; };
      const effectiveBackground = element => {
        for (let node = element; node; node = node.parentElement) {
          const parsed = parse(getComputedStyle(node).backgroundColor);
          if (parsed && parsed.alpha >= 0.9) return parsed.rgb;
        }
        return [255, 255, 255];
      };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const checked = new Set();
      while (walker.nextNode()) {
        const element = walker.currentNode.parentElement;
        if (!element || checked.has(element) || !walker.currentNode.textContent.trim()) continue;
        checked.add(element);
        if (!visible(element) || element.closest('[aria-hidden="true"]')) continue;
        if (element.closest('button:disabled, [disabled], option')) continue;
        const color = parse(getComputedStyle(element).color);
        if (!color) continue;
        const background = effectiveBackground(element);
        const light = Math.max(luminance(color.rgb), luminance(background));
        const dark = Math.min(luminance(color.rgb), luminance(background));
        const ratio = (light + 0.05) / (dark + 0.05);
        if (ratio < MIN_CONTRAST) issues.push(`CONTRAST ${ratio.toFixed(2)} ${describe(element)}`);
      }
      return issues;
    }, { MIN_TAP, MIN_CONTRAST });

    const problems = [...found, ...consoleErrors.map(text => `CONSOLE ${text}`)];
    console.log(`\n== ${pageName} @ ${viewport.name} : ${problems.length ? `${problems.length} 件の違反` : 'PASS'}`);
    for (const problem of problems) console.log('  ' + problem);
    violations += problems.length;
    await context.close();
  }
}

await browser.close();
process.exit(violations ? 1 : 0);
```

- [ ] **Step 3: 実行して違反を潰す**

Run: `npm start`（別ターミナルで起動済みであること）→ `npm run ui:check`
Expected: 初回は違反が出る可能性が高い（旧グレー文字・小さい要素の取り残し）。**違反リストの各項目を該当ページのCSS修正で潰し、再実行**。最終的に4画面分（2ページ×2幅）すべて PASS。
編集画面のカード内 select が閉じたカードでは不可視（display:none）なので対象外になる点は仕様どおり。

- [ ] **Step 4: 緑確認してコミット**

Run: `npm test 2>&1 | grep -E "ℹ (tests|pass|fail)"` → fail 0。`npm run ui:check` → 全PASS・exit 0（`echo $?` で確認）。

```bash
git add tools/check-ui-accessibility.js package.json package-lock.json public/practice.html public/routine-editor.html
git commit -m "feat: タッチ44px+コントラスト4.5:1+コンソール0の機械ゲートを追加し違反を解消"
```

---

### Task 7: 指名ケースの目視検収と引き継ぎ更新

**Files:**
- Modify: `HANDOFF.md`
- Modify: `docs/superpowers/specs/2026-07-15-practice-ui-redesign-design.md`（実装後の逸脱があれば追記）

- [ ] **Step 1: 指名ケースをブラウザで通す（スマホ幅390px・PC幅1280pxの両方）**

設計書 §7 の目視6ケース:
1. シンプル再生: 種目選択→再生→カウント点灯→停止。トグル状態が色で判別できる。
2. 編集: ルーティン選択（「ワルツ 新ファイナル級」含む）→カードタップ展開→試聴→複製→削除→確認ダイアログ→Undo復元。
3. 並べ替え: ⠿ドラッグとキーボード上下矢印の両方。
4. 「＋ フィガーを追加」→ダイアログ→末尾へ追加され、just-movedハイライトが見える。
5. 言語切替: English で全ラベル英語・アイコン共通。ja へ戻す。
6. 下バーが最後のカード/追加ボタンを隠さない。全体試聴中に鳴っているカードが自動展開され拍が光る。

各ケースをスクリーンショットで記録（`output/playwright/` へ `ui-redesign-<case>-<width>.png`）。

- [ ] **Step 2: 下書き互換の確認**

編集画面でフィガーを1つ複製→リロード→複製が残っている（localStorage下書きが新DOMでも読める）ことを確認。その後「元データに戻す」で復元。

- [ ] **Step 3: HANDOFF.md を更新**

§3「主な画面」の2画面の説明に「2026-07-15 UI刷新済み（アイコン+ラベル・44pxタッチ・下固定バー・タップ展開カード）」を追記し、§9 に `npm run ui:check`（要 `npm start` 起動・Chrome）を追加。§5 のテスト数を実数に更新。

- [ ] **Step 4: 最終確認してコミット**

Run: `npm test` 全緑、`npm run ui:check` 全PASS。

```bash
git add HANDOFF.md docs/ output/playwright/
git commit -m "docs: UI刷新の検収記録と引き継ぎを更新"
```

---

## Self-Review（記入済み）

1. **Spec coverage:** §3共通基盤→Task 1・2／§4シンプル再生→Task 3／§5編集画面（タップ展開・自動展開・末尾追加・下バー・詳細設定）→Task 4・5／§7機械ゲート→Task 6・目視→Task 7／§8下書き互換→Task 7 Step 2。§6「ロジック不変」はGlobal Constraintsで全タスクに適用。
2. **Placeholder scan:** Task 5 Step 2 のコメント「旧 practice-panel 内の .timing-grid の中身をそのまま移動」は移動指示（コピー元が現ファイル lines 152-166 に実在し、idを列挙済み）であり生成指示ではない — 許容。他になし。
3. **Type consistency:** `setPlayDisplay(label, playing)` は両ページで同名同シグネチャ。アイコンIDはTask 1定義と各タスクの `#i-*` 参照が一致（play/stop/plus/copy/trash/pencil/grip/globe/chevron/undo/redo/repeat/metronome/gauge/voice/insert-after を使用。check/arrow-up/arrow-downは将来用に定義のみ——YAGNI違反ではなく設計書§3の語彙どおり）。
