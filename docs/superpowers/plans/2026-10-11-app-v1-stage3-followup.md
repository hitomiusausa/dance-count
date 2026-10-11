# Dance Count アプリ化 v1 — 段3 追加便（iPhone 実機確認の指摘 D13〜D16）

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development。この計画は段3本体（`2026-10-11-app-v1-stage3.md`）の後の小さな追加便。**完全なコードは載せない**: 正は裁定 `docs/app-v1/rulings.md` の **Ruling 50（D13・D14）・Ruling 51（D15）・Ruling 52（D16）** で、各 Ruling の末尾「計画への反映（計画者）」が触るファイルの一覧。実装者（Opus）はその Ruling を読み、既存のコード（段3）の流儀に合わせて書く。

**Goal:** ひとみうさの iPhone 実機確認の4つの指摘を直す（＋D17 はじめの合図2小節・D18 カウントの形を増やす） — 同じ名前のフィガーは同じカウント（D13）、使える文字を常に見せる（D14）、つかんだ行が指についてくる（D15）、3拍・小節の注意（D16）。

**Spec:** `docs/superpowers/specs/2026-10-11-app-v1-design.md`（§4 S4・§5・§6）＋裁定 Ruling 50〜52・D13〜D16。迷ったら Ruling が正。見た目の選択肢は各 Ruling の「推奨」で作る（ひとみうさは実物を見て変える）。

## Global Constraints（段3と同じ）

- 主要操作数（Ruling 18・35・36）: S4 は 1件以上＝5・行を開く＝7・くわしく開＝7・0件＝3 のまま。`[data-group]` の選択肢は 10 以下（U5）。ボタンを増やさない（主ボタンの文言と動きを切り替える）。
- 文字 本文 18px／補助 16px 以上、タップ 48px・間隔 8px、コントラスト 4.5:1（大きな太字 3:1・枠 3:1）、transition/animation は 300ms 以下（指の動きそのものの transform は対象外。Ruling 51）。
- UI の文言は `src/app/i18n/messages.ts` の日英キーだけ（禁止語テスト）。依頼文「〜してください」は1画面1つ（Ruling 52）。
- 時間の計算はエンジンの中だけ（拍数は `compileRhythm`／`compileRoutine` の tick から）。`src/engine/` は変えない。
- `window`・`navigator`・storage・`requestAnimationFrame` 等は `src/app/platform/` からだけ（境界テスト。`history` という名前も禁止）。
- 未監修データを出さない（候補は verified 名、カウントは templates だけ）。
- `.tsx` のテストは書かない。判断は `.ts` の純粋関数に置いてテストする。
- `git add -A` / `git add .` 禁止（未追跡の `フィガー/`）。push しない。
- 完了の関門（各 Task の最後）: `npm test`（件数を報告）・`npm run -s typecheck`・`npm run -s build`・`npm run dev` を温めてから `npm run ui:check`（全件 PASS・exit 0）・`npm run smoke:routines`・`npm run smoke:practice`。375×667 で該当画面を撮って目視（`~/.playwright-mcp/`）。サーバーとブラウザは片付ける。

## Task F1: 同じ名前のフィガーは同じカウント（D13）＋使える文字を常に表示（D14） — Ruling 50

- 正: Ruling 50 の全文（原則1文・同じ名前の判定 `foldFigureName`・追加の行の「複製して追加」・編集で名前を変えた時の「カウントを合わせる」・名前そのままでカウントを変えた時の「N+1 件まとめて決定」・古いデータ・型（`DraftReason`/`DraftCheck`）・常設の `.dc-hint`／`.dc-hint--bad`・`allowedSymbols(danceId, locale)`・「・」の除去・`aria-describedby`・文言・テスト・smoke・実機確認表・`design-skeleton.md`）。
- TDD: `test/app/routines/editor.test.ts`（Ruling 50 の 7 件）と `counts.test.ts`（3 件）を先に書いて落ちることを確かめてから実装。
- 完了: 関門すべて。smoke に Ruling 50 の 2 本。

## Task F2: つかんだ行が指についてくる（D15） — Ruling 51

- 正: Ruling 51 の全文（行自身を `transform: translateY(var(--dy))`・`--dy` は style へ直接・`dy` の式と `scrollY0`・`pageScrollY()`・`unliftBox` で判定前に元の位置へ戻す・`liftOffset` で一覧内に clamp・見た目（影 `--lift-shadow`・背景・角丸・下罫線・outline・⠿ の色）・`isolation: isolate`・transition なし・落下と中断で即解除・テスト・smoke 2 本の更新・実機確認表 4 行）。
- TDD: `test/app/routines/reorder-drag.test.ts` に `liftOffset`・`unliftBox` を先に足す。
- 完了: 関門すべて。

## Task F3: 3拍の注意と小節の途中で終わる注意（D16） — Ruling 52

- 正: Ruling 52 の全文（`src/app/routines/bar-check.ts` の `figureBeats`・`isOffBar`（waltz・vwaltz だけ）・`offBarIndexes`・`routineEndsMidBar`／閉じた行の `.dc-row-note`（最初の1件だけ全文・以降は短い形）／開いた行は `.dc-reason` に短い形（`DraftCheck.note`、決定は押せる）／全体の注意 `.dc-bar-note`（一覧の直下・追加ボタンの上、S3・S5 には出さない）／文言 3 キー（`{beats}`）／ui:check の `R.waltzOffBar` と状態「S4 小節の注意」と `barNote` の検査／smoke 1 本／実機確認表 2 行／`design-skeleton.md`）。
- TDD: `test/app/routines/bar-check.test.ts` を先に。
- 完了: 関門すべて（ui:check は状態が1つ増えて 97 件 PASS の見込み＝23→24 状態×4＋拡大1）。

## Task F4: はじめの合図は2小節（D17）

- 正: rulings.md の **D17** 全文。S2 のオンは `LEAD_IN_BARS = 2`（`src/app/practice/` の定数。S2 の `optionsFrom` が `countInBars: settings.countInBars === 1 ? LEAD_IN_BARS : 0`）。新しいルーティンの `countInBars` 初期値 2（`createRoutine`）。S5 は今のまま（`routineLeadInBars` がルーティンの値）。`PracticeOptions.countInBars` は 0|1|2 のまま。
- テスト: S2 のオンで 2 小節がエンジンに渡ること（`practice` の純粋部分で）、`createRoutine` の初期値 2（`routine.test.ts` の期待値を更新）。`tools/smoke-practice.js` は最初のカウント（1〜8・S・Q・&・a）が出るまで最大 10 秒待ってから「3種類変わる」を判定（`smoke-routines.js` の `expectSounding` と同じ形）。
- 仕様の読み替え: §4 S2 の「はじめの合図オン（1小節）」→「（2小節。D17）」。§7 のルーティンの `countInBars` の既定 2。
- 完了: 関門すべて。

## Task F5: カウントの形を増やす（D18） — Ruling 53

- 正: Ruling 53 の全文（純粋関数 `countPatterns(danceId)`・`src/app/routines/count-patterns.ts`・`COUNT_PATTERNS_MAX = 8`・読むのは `DANCE_PROFILES` だけ・作り方の規則（数字の種目／S・Q の種目）・種目ごとの固定一覧の表・置き場（`[data-group="figure-form"]` と `[data-group="count-patterns"]` の 2 グループ）・見出し「カウントの形 / Count patterns」・`.dc-chip` に `white-space: nowrap`・タップで欄を置き換え・`aria-pressed`・Ruling 3 との線引き・テスト 6 件・ui:check（行を開 7→8・`patterns: 8`・不正カウントで pressed 0）・smoke 1 本・実機確認表 2 行・仕様の読み替え）。
- TDD: `test/app/routines/count-patterns.test.ts` を先に。
- 完了: 関門すべて（ui:check の期待値は Ruling 53 のとおりに更新）。

## 締め

- 段3台帳 `docs/app-v1/stage3-ledger.md` に追加便の記録（各 Task の完了・修正便・裁定）を追記。`docs/app-v1/HANDOVER.md` の段3の行と §0 を更新（実機の再確認＝追加便ぶんの確認表の行）。
- 全体レビュー（Opus）→ 修正便1回 → 差分の再レビュー。
