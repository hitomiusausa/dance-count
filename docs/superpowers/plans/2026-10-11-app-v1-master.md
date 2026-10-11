# Dance Count アプリ化 v1 — 全体地図（段1〜8）

> **For agentic workers:** これは「地図」であり、作業手順書ではない。手を動かすのは各段の詳細計画（`2026-10-11-app-v1-stageN.md`）だけ。段1の詳細計画は同じフォルダにある。段2〜8の詳細計画は**前の段が `agent/app-v1` に統合された後に**書く（下の「詳細計画は直前に書く」）。実行は superpowers:subagent-driven-development（推奨）か superpowers:executing-plans。

**Goal:** 承認済み仕様（`docs/superpowers/specs/2026-10-11-app-v1-design.md`）の §13「実装の段」1〜8 を、依存・並列・担当モデル・レビュー関門・完了条件・人の確認点つきで一枚にまとめる。

**Architecture:** Vite＋Preact＋TypeScript（UI 層 `src/app/`）＋ JS のままのエンジン（`src/engine/`、旧 `src/v2/`）。端末依存は `src/app/platform/` だけ。旧画面は `legacy/`（公開ビルドに含めない）。PWA は `vite-plugin-pwa`（段7）。

**Spec:** `docs/superpowers/specs/2026-10-11-app-v1-design.md`（正）。迷ったら同ファイル冒頭の優先順位（D1〜D9 → Ruling → design-skeleton → モック → reuse-map）で解く。

**作成時点の確認（2026-10-11、段1計画のスクラッチ検証で実測）:** Node v24.13.0 / npm 11.6.2。`npm test` 95件緑。採用バージョンは段1計画の「採用バージョン」節。

---

## Global Constraints（全段に効く。仕様から転記）

- 主要操作数: 初期ビューポート 5 以下、画面全体 9 以下（Ruling 18 の数え方）。S1＝3（初回2）、S2＝5、S5＝5、S8 ステップ0＝2。
- 文字: 本文 18px 以上、補助文 16px 以上、14px 未満禁止。主ボタン高さ 56px 以上、▶／■ 72px 以上かつ幅 60% 以上。タップ対象 48×48px 以上・間隔 8px 以上。
- 基準端末 iPhone 375×667。PC は 1280×900 で崩れないこと（1024px 以上は S2/S5 のみ2領域、他は最大 640px 1カラム、タブは上部横並び）。
- 禁止語（UI 文言）: BPM・インポート・エクスポート・読み込み・書き出し・カウントイン・音声パック・ボイスパック・設定を保存・ストレージ・キャッシュ・同期・エラーコード / Import・Export・Voice pack・Storage・Cache・Sync・Error code。
- カウント音声の初期値は UI 言語に関わらず英語（D3）。UI 言語と声の言語は独立（Ruling 12）。
- 時間計算は `rhythm-compiler` の整数 tick（`TICKS_PER_BEAT=960`）から。tick↔時刻は `src/engine/tempo-map.js` の1か所だけ（Ruling 20）。第2の時間計算を作らない（AGENTS.md）。
- 実行時に TTS・外部 API・解析を呼ばない。フォントも同梱（外部送信なし、§12）。
- `window`・`navigator`・storage への直接参照は `src/app/platform/` だけ（段1でテスト化）。
- 公開ビルド（`dist/`）に `legacy/`・旧ルーティン・未監修データを入れない（Ruling 10、段1で `tools/check-dist.js` 化）。
- push・デプロイ・DNS・配信基盤の設定・課金の伴う操作は**ひとみうさの明示許可の後だけ**（AGENTS.md・仕様 §10・D4）。
- 作業ツリーには未追跡の `フィガー/` フォルダがある。**`git add -A` / `git add .` 禁止**。必ずパスを指定して add する。

---

## 段の一覧

| 段 | 内容（仕様 §13） | 依存 | 並列 | 担当（実装） | 完了条件（測れる形） |
|---|---|---|---|---|---|
| 1 | 器: Vite＋Preact＋TS、`src/engine` 移設、`legacy/` 退避、platform の空実装、i18n 基盤、ハッシュルーター、`tempo-map.js`＋集約 | — | — | **Opus**（エンジン移設） | `npm test` 149件緑（移設前95＋新規54）、`npm run timing:compare` 一致（2回: 移設直後と集約直後）、エンジン予約時刻のゴールデン一致、`npm run typecheck`・`npm run build`（`check-dist` 込み）成功、`npm run dev` で下タブ3つの空画面（375/1280 のスクショ） |
| 2 | 生徒の再生（S1・S2）: タイル、前回・先生カード、戻る／タブ出し分け、再生、速さ3択、トグル、現在カウント、くわしく、iOS 解除、WakeLock、警告バナー、`ui:check` 移植 | 1 | 6 と並列可 | **Opus**（音声・iOS） | G1・G2、`ui:check` で S1/S2 の U1〜U15 通過（S1=3・S2=5・U12）、**iPhone 実機でマナーモード時に鳴る** |
| 3 | ルーティン（S3・S4・S5）: IndexedDB v2 と移行、編集、試聴、名前補完、範囲 | 2 | 6 と並列可 | Sonnet | 作成→保存→再読み込みで残る、不正カウントの赤枠、`ui:check` 通過 |
| 4 | 声（S7・S8）: 一覧、録音ウィザード、正規化再利用、試聴・聞き比べ、声のタイミング | 2（3 の後に着手） | 6 と並列可 | **Opus**（録音・音声） | iPhone/Chrome で12語録音→ワルツが自分の声で鳴る、無音判定、`ui:check` 通過 |
| 5 | 配る・受け取る（S9・S10）: bundle、share／download、share_target、取り込み検証、案内文 | 3・4 | — | Sonnet | G6、壊れた／大きすぎ／新しすぎるファイルの画面 |
| 6 | 日本語標準音声: 生成・onset 実測・聴感ゲート・同梱 | 1 | 2〜5 と並列可（`tools/`・`public/audio/` のみ） | Sonnet ＋ ひとみうさ試聴 | Ruling 5 のゲート3点 |
| 7 | PWA: SW precache、更新バナー、S12、オフライン再生、`persist()`、manifest | 2・6（実際は 5 の後） | — | Sonnet | G7、更新バナー、インストール可能（§14） |
| 8 | 仕上げ: 日英文言の監修、S11・S13、エラー全件、禁止語テスト、アクセシビリティ最終 | 2〜7 | — | Sonnet ＋ 別エージェントのレビュー | G3・G8、実機チェックリスト全項目 |

**全体の統合レビュー**（段8の後）: Opus 総合レビュー → 修正便1回 → 差分再レビュー1回（仕様 §13）。

### 仕様 §13 からの読み替え（正直な注記）
- 仕様は「段2・3・6 は別ディレクトリなので並列可」とするが、**段2と段3は同じ `src/app/` の `App.tsx`（画面の登録表）・`i18n/messages.ts`・`router` を必ず触る**。仕様自身の規則「並列は別ディレクトリの段だけ。同じアプリ内の画面同士は逐次」に従い、**2 → 3 → 4 → 5 は逐次**、並列は段6（`tools/` と `public/audio/default-ja-female-v1/` だけ）に限る。Fable／ひとみうさが並列を望む場合は、段3の詳細計画で `App.tsx` と `messages.ts` の競合を先に設計すること。
- 段4は依存表では「2」だが、IndexedDB v2 の器（`platform/storage.ts`）を段3が作るため、**3 の後**に着手する（声パックは既存 `voice-packs` ストアを使い続けるが、DB の版上げは1か所でやる）。
- 段7は依存「2・6」だが、share_target（段5）と同じ Service Worker を触るため **5 の後**。

---

## 並列運用（worktree）

- 主線は `agent/app-v1`。段ごとの作業ブランチ `agent/app-v1-stageN` を `agent/app-v1` から切り、段の完了とレビュー通過後に `agent/app-v1` へ統合（fast-forward か merge commit、rebase で履歴を書き換えない）。
- **worktree を使うのは段6だけ**（別ディレクトリ）。段6の作業は `tools/`・`public/audio/default-ja-female-v1/`・`docs/` に限る。`src/app/` に触る必要が出たら（標準の声の一覧に日本語を出す等）、その変更は段6ではなく次の app 段で行う。
- 同じ worktree で2つのサブエージェントを同時に走らせない。
- 段6は Google Cloud TTS を使う（開発時のみ）。**課金が発生しうるので、生成を始める前にひとみうさに確認**（AGENTS.md「material billing impact」）。認証情報を `public/` やブラウザ側ファイルに置かない。

---

## 担当モデルの決め方

- **Sonnet**: 詳細計画に完全なコードが書けている段（3・5・6・7・8）。
- **Opus**: 既存の資産を壊すと戻せない段・実機の挙動が読みにくい段（1 エンジン移設、2 iOS 音声、4 録音）と、段ごとの統合判断・最終の総合レビュー。
- 各タスクの実装者は「そのタスクの節だけ」を見て作業する前提で書く（詳細計画の Interfaces 欄が隣のタスクとの契約）。

---

## レビュー関門

1. **タスクごと**（subagent-driven-development の流儀）: 実装者 → 仕様準拠レビュー → コード品質レビュー。レビュー指摘が残っている間は次のタスクに進まない。
2. **段の終わり**: 別エージェント（その段の実装に関わっていないもの）が、詳細計画の完了条件を**自分で再実行**して数値を報告する（AGENTS.md「Re-run gates locally」）。最低限:
   - `npm test`（件数を報告）、`npm run typecheck`、`npm run build`
   - `npm run timing:audit && npm run timing:compare`（エンジンに触れた段は必須）
   - UI を触った段: `npm run ui:check`（段2で移植後）と Playwright で 375×667・1280×900 の**スクロール領域ごと**のスクリーンショット目視。撮影後は自動操作ブラウザを閉じる。
3. **統合**: レビュー通過 → `agent/app-v1` へ統合 → 統合後にもう一度 `npm test` と `npm run build`。
4. **全段の後**: Opus 総合レビュー → 修正便1回 → 差分再レビュー1回。

---

## 詳細計画は直前に書く（Just-in-time）

- 段N（2〜8）の詳細計画 `docs/superpowers/plans/2026-10-11-app-v1-stageN.md` は、**段N−1 が `agent/app-v1` に統合された後に**書く（ファイル名の日付は書いた日に合わせてよい）。前の段で決まった実際の関数名・ファイル・テスト件数を読んでから書くため。
- 書く人: Opus（計画担当）。superpowers:writing-plans に従い、完全なコード・正確なコマンドと期待出力・Review Focus を入れる。外部ライブラリの API を使う段は Context7 で現行版を確認し、採用バージョンを計画に記録（CLAUDE.md）。危ない手順はスクラッチのコピーで先に実証する。
- 詳細計画が仕様と食い違う判断を必要としたら、計画を止めて Fable／ひとみうさに上げる（計画者は新しい製品判断をしない）。

---

## 人が必要な確認点（ひとみうさ）

| いつ | 何を | 根拠 |
|---|---|---|
| 段1の終わり（任意） | 375/1280 の空画面スクショ（`output/playwright/stage1-*.png`）を見る。器だけなので見た目の判断は段2 | — |
| **段2の終わり** | iPhone 実機: マナーモードで ▶ が鳴る／2秒判定バナーが本当に鳴らない時だけ出る／ロック復帰で「もう一度 ▶」／WakeLock／AirPods でずれない（§14 の上5項目）。G1・G2 のタップ数を体感で | §14・Ruling 6 |
| 段2の終わり | 見た目（B Studio Navy）がモックどおりか。審美判断はひとみうさ | CLAUDE.md |
| **段4の終わり** | iPhone で12語録音（マイク許可の前に説明が出る）→ 自分の声でワルツ | §14 |
| **段5の終わり** | G6: iPhone→iPhone、iPhone→Android（入手できれば）。LINE 経由で受け取り「ファイルを選ぶ」が開く | §14・G6 |
| **段6の開始前** | Google Cloud TTS の生成を始めてよいか（課金） | AGENTS.md |
| **段6の聴感ゲート** | 12語を試聴して「数え言葉として自然」か。不自然なら再生成か人の録音に切替の判断 | Ruling 5 |
| 段7の終わり | ホーム画面に追加→起動して鳴る、機内モードで鳴る（G7） | §14 |
| 段8の終わり | §14 の実機チェックリスト全項目、可能なら 60〜70代の方の初見テスト（G9） | §14・G9 |
| **push の前（毎回）** | `agent/app-v1` 系ブランチの push 許可 | AGENTS.md |
| **公開の前** | 公開URL（サブドメイン名）・配信基盤・DNS の許可、`PUBLIC_APP_URL` の確定 | D4・§16-1 |

---

## 段をまたぐ持ち越し（各段の詳細計画で必ず拾う）

| 持ち越し | 拾う段 | 内容 |
|---|---|---|
| 練習セッション状態の `track: null` | 2 | Ruling 20 の席の予約。セッション状態の型に `track: TrackProfile \| null`（初期 null）を置く。`TrackProfile` の JSDoc 型は段1で `src/engine/tempo-map.js` に定義済み |
| `ui:check` の移植 | 2 | 段1では `tools/check-ui-accessibility.js` の対象を `legacy/` に向け直しただけ（旧画面用のまま）。段2で新アプリ向けに移植・拡張（§6 U1〜U15・`?ui-state=no-sound`） |
| 書体の同梱 | 2（Inter）・7（precache） | `@fontsource/inter`・`@fontsource/noto-sans-jp`。段1はシステム書体のまま |
| アイコン | 2 | モックの `<symbol>` を `src/app/components/icons.svg` へ。段1の下タブは文字だけ（アイコン単独は禁止、文字は必須） |
| 「戻る」の動き | 2 | 段1の `routes.ts` に親画面の表（`parentScreen`）と `platform/hash.ts` の `setHash(…, {replace:true})` は用意済み。履歴の有無で親へ置き換える処理は段2 |
| エンジンの日本語固定文言の i18n 化 | 3（「（コピー）」）・4（recorded-voice-store/pack のエラー） | 仕様 §10 で `src/engine` を変えてよい数少ない例外 |
| IndexedDB の版上げ（v1→v2） | 3 | **注意**: 版を上げると、同じオリジンで開いた `legacy/` の旧画面（`recorded-voice-store.js` は version 1 を指定）が `VersionError` になる。開発用の旧画面だけの問題だが、段3の計画で「旧画面は別ポート（`npm run legacy` = 4173、新アプリ = 5173）なのでオリジンが別」であることを確認し、同一オリジンで開かない運用を明記する |
| 標準音声 URL の `?v=<revision>` | 7 | `voice-pack-loader.js` は manifest の `revision` を音声 URL の `?v=` に付ける（差し替え時のキャッシュ対策。段1では残した）。Workbox の precache は既定でこのクエリを無視しないため、**オフライン再生でキャッシュに当たらない恐れ**。段7で `ignoreURLParametersMatching` に `/^v$/` を足すか、precache 側の URL に revision を合わせるかを決める |
| `fetch` のキャッシュ方針 | 2・7 | 段1で `cache:'no-store'` を外した。新アプリは `fetchImpl` を platform から渡す。旧画面は既定の HTTP キャッシュになる（旧画面の保守は止める方針: Ruling 10） |
| 案内文の `PUBLIC_APP_URL` | 5 | ビルド時定数。空なら行ごと出さない（§16-1） |
| 速さ3択の定数 | 2 | `SPEED_SLOW_RATIO=0.8`・`SPEED_FAST_RATIO=1.1` と10種目の単体テスト（Ruling 24） |
| 禁止語テスト | 段1で土台 | `src/app/i18n/forbidden-words.ts` と `test/app/i18n.test.ts`。以後の段は文言を `messages.ts` に足すだけで自動的に検査される |

---

## リスク（地図レベル）

1. **iOS の音**（段2）: マナーモード・ロック復帰・中断はシミュレータで再現できない。段2の完了は実機確認が必須。だめなら Ruling 6 の代償（無音 `<audio>` ループ併用）。
2. **ファイル受け取り（段5）**: iOS は share_target 不可。ホーム画面アプリでファイル選択が開かない報告（F3）→「Safari で開いて受け取る」導線。実機で詰まる可能性が最も高い。
3. **日本語 TTS の聴感（段6）**: ゲート不通過なら人の録音に切替。段7（precache 一覧）に影響するので、段6は早めに始める。
4. **Preact 11**: 2026-09-30 公開と新しすぎるため段1は 10.29.8 を採用（理由は段1計画）。11 への上げは v1 公開後に別作業で。
5. **TypeScript 6/7**: 段1は 6.0.3（JS 製の tsc。7 は Go 製で別系統）。型チェックだけに使い、ビルドは Vite（oxc）なので、上げ下げの影響は `npm run typecheck` に限られる。
