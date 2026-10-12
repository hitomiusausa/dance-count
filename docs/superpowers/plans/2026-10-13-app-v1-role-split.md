# Dance Count アプリ化 v1 — 「使う／作る」（D56）・カウントの帯（D55）・「フィガー」タブ（D57）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 起動すると表紙が出て、生徒は「使う」（下タブ「フィガー」「ルーティン」＝種目のカウントと先生のルーティンを鳴らすだけ・ファイルの受け取り）、指導者は「作る」（自分の声の録音・ルーティンを作る／直す・配る）に分かれる。再生画面の拍の丸は「カウントの型の帯」（型 1 周の語を 1 つずつ・鳴っている語が琥珀）に替わり、ジャイブの 6 拍・チャチャチャの「2 から」・タンゴの S/Q が語と 1 対 1 になる。監修済みのカウント（3d2f51e で 20 件: ワルツ 14・スローフォックス 2・タンゴ 4）がある種目は、タイルから「種目のフィガー」（F1）へ行き、行を押すとそのフィガーのカウントで鳴る。前回の練習は「ワルツ · ウィスク」まで覚える。保存の形・DB の版・`src/engine` は変えない。

**Architecture:** 経路表（`src/app/router/routes.ts` の `SCREENS`）に表紙 S0（`#/`）・U2（`#/use/routines`）・M0（`#/make`）・M1（`#/make/routines`）・F1（`#/figures/:danceId`）を足し、S1 は ID のまま `#/use` に、S3 は廃止（古い `#/routines` は `alias` で U2 に読み替えてハッシュを置き換え）。下タブは「使う」の U1・U2 だけ（`showsTabs`）、表紙が親の画面の「戻る」は「‹ 表紙」（`BackButton` が親で文字を選ぶ）。`RoutinesScreen` は `mode: 'use' | 'make'` で U2／M1 の 2 画面。帯は `SessionView.program`（セッションがエンジンに渡した `compiled` の写し）から `beat-indicator.ts` の純粋関数 `stripCells`／`stripView` が作り、点灯はエンジンの `originalTick` だけ（第 2 の時間計算・第 2 のコンパイルを作らない）。F1 と S2 のフィガーの形は `reviewed-counts.ts` の `reviewedFigures`／`reviewedFigureBySlug`（監修表から作る・登録簿の順）と `figure-names.ts` の `figureSlug` だけを使い、S2 のカウントは `preferences.ts` の `practiceCounts` の 1 本で決める。

**Tech Stack:** Node ≥22.18（検証は v24.13.0）、Vite 8.3.4、Preact 10.29.8、TypeScript 6.0.3、node:test、playwright-core 1.61.1、@axe-core/playwright 4.13.0、budoux 0.9.3、vite-plugin-pwa 2.0.0・Workbox 7.4.1（すべて既存。**新しい依存は無い**）。

**Spec / 裁定:** `docs/app-v1/rulings.md` の末尾 3 節が正（D55＝Ruling 114・D56＝Ruling 115〜118（2026-10-13 合意: 全部おすすめ・「（指導者の方）」・タブ「フィガー」）・D57＝Ruling 119〜122）。**Ruling 113（D54）は置き換え済み＝実装しない**。仕様 `docs/superpowers/specs/2026-10-11-app-v1-design.md`（Task 6 で読み替えの節を足す）・比較モック `docs/app-v1/mockups/role-split-compare.html`・監修表 `src/app/routines/reviewed-counts.ts`（3d2f51e）。書き方の手本は段8の計画 `docs/superpowers/plans/2026-10-12-app-v1-stage8.md`。

---

## 前提（着手の条件）

- 作業ツリー `/Users/usausagi/Documents/AI_Playground/Dance Count auto-counts`（枝 `agent/auto-counts`）。HEAD が **`3d2f51e`**（「監修済みのカウント 20 件」）で、この計画のコミット（`docs: 「使う／作る」・フィガータブ・カウントの帯（D55〜D57）の詳細計画`）が乗っていること。`git status` は空。
- **実機確認中のツリー `/Users/usausagi/Documents/AI_Playground/Dance Count for Ballroom`（5173 番の dev サーバー）には一切触らない**（Ruling 112-1）。
- 開始時の値（計画を書いた時点の実測。台帳に N0 として書く）: `npm test` **655**・`npm run ui:check` **678 PASS**（96 状態 × 7 周＋6）。Task 1〜6 で **655 → 657 → 657 → 660 → 671 → 671 → 671**、ui:check **678 → 755 → 748 → 769 → 769 → 839 → 839**。開始時の値が違えば、差の分だけ以下の期待値をずらす。
- 監修表が 3d2f51e より増えていたら（転記のコミットが先に入った）、`requires: 'reviewed'` の状態の期待値（F1 の行数）は表から自動で作られるので直さなくてよい。ui:check の数は変わらない（状態の数は表に依らない）。
- push・デプロイ・DNS・配信基盤・課金は禁止のまま。

## Global Constraints

- 主要操作数（Ruling 18・35）: 初期表示 5 以下・画面全体 9 以下。`[data-group]` は 1 操作、`[data-nav]`・`[data-back]`・`[data-utility]`・`summary[data-more]`・`[data-alert-action]` は数えない。一覧 `[data-list]` は閉じた行をまとめて 1 つ。この計画の期待値: **S0 4（初回 3）・U1 1（前回 2）・U2 2（0 件 1）・M0 3・M1 1（行を開 3）・F1 2・S6 3・S7 2（行を開 3）**・S2 のフィガーの形の「くわしく」開 8・ほかは今のまま（Ruling 118-3）。
- 文字: 本文（`p`・`li`・`[data-body]`）18px 以上、それ以外 16px 以上（`[data-fineprint]` は 14px まで）。主ボタン 56px 以上。タップ対象 48×48px 以上・間隔 8px 以上。ボタン・行の文言は 1 つの文字列 2 行まで（U10。例外は Task 1 の `[data-description]`＝扉の説明・M0 の状態の 1 行は 4 行まで、と `[data-ellipsis]`＝2 行で「…」）。
- **`messages.ts` を変えたら必ず `npm run i18n:phrases && npm run copy:sheet`** を回し、生成物（`src/app/i18n/ja-phrases.json`・`docs/app-v1/stage8-copy-review.md`）も同じコミットに入れる（古いと `npm test` が落ちる）。**生成物は差分に入れていない**（各 Task の手順のコマンドで作る。計画者が作り直してスクラッチとバイト一致を確かめた）。
- **`src/engine/` は 0 行変更**。ゴールデン（`test/engine/fixtures/*`）・`output/timing-audit-before.json`・`legacy/*`・`public/audio/*`・`src/app/styles/fonts.css` は書き換え禁止。`npm run timing:audit` は `output/all-dance-timing-audit.json` を書き換えるので、確かめたら必ず `git checkout -- output`。
- **第 2 の時間計算を作らない**（AGENTS.md）: 帯の点灯はエンジンの `originalTick` だけ。止まっている間の `compileRhythm` は表示のためだけ（`idleProgram`）。
- `window`・`navigator`・`location`・`history`・`document` などの端末の口は `src/app/platform/` からだけ（`test/app/platform-boundary.test.ts`）。識別子 `history` は使わない。この計画は platform に何も足さない（下タブの置き換えは `state/route.ts` の `replaceRoute`）。
- `.tsx` のテストは書かない（`test/meta/test-glob.test.js`）。画面は `ui:check`・スモーク・目視で確かめる。
- **`git add -A` / `git add .` 禁止**。必ずパスを指定して add。**push しない**。コミットの末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`（担当が Sonnet でも、この枝の慣習どおり実装者のモデル名に読み替えてよい）。
- コマンドはすべて作業ツリー直下: `cd "/Users/usausagi/Documents/AI_Playground/Dance Count auto-counts"`。`sed -i ''` は macOS。**zsh では `$t:t` が修飾子になる**ので `git show "${t}:path"` と波かっこで書く。
- **番号**: 開発サーバーは **5185**（`npx vite --port 5185 --strictPort`）、公開ビルドの確認は **`npx vite preview --port 5184 --strictPort`**、`smoke:pwa` は **`DC_PWA_PORT=4185`**。**5173 はひとみうさ**・ほかの番号は使わない。
- ui:check は 1 回約 13〜14 分（839 状態周）。直しながらは `DC_ONLY=S0,U2` のように状態名の頭で絞ってよい（完了の判定は絞らずに全部）。
- 使いやすさ（ひとみうさの常設要件）: 60〜70代の初めての人が「次に何を押すか」分かる。**iPhone SE（375×548 の Safari・375×667 のホーム画面のアプリ）が基準**・**320 幅で横スクロールなし**（日英）。依頼（「〜してください」）は 1 画面に 1 つまで。

## スクラッチでの実証（2026-10-13、計画者が実施）

作業ツリーを `scratchpad/rs` → `scratchpad/work` に複製し（`rsync -a --exclude dist --exclude .git --exclude node_modules`・`node_modules` は `cp -R`・`git init`）、途中で届いた 3d2f51e（監修表 20 件）を基点に載せ替えてから、**この計画のコードをそのまま入れて** Task ごとにコミットし、各コミットでゲートを回した（本物の作業ツリーはこの計画のファイル以外触っていない）。下の差分は**スクラッチの各 Task のコミットから `git diff` で機械的に取り出して**埋め込んだ（生成物 2 つは除く）。

1. **件数**: `npm test` **655 → 657 → 657 → 660 → 671 → 671 → 671**（Task 1〜6）すべて緑・`typecheck` 0。
2. **ui:check**（dev 5185）: **678 → 755 → 748 → 769 → 769 → 839 → 839**、違反 0（axe 違反 0・英語の 2 周込み）。最終の木（下の 6. の複製の Task 6 の後）では**公開ビルド（`vite preview` 5184）でも 839 PASS**。**Task ごとの数（755・748・769・769・839）も 6. の複製の上で各 Task のコミットを開いて実測**（スクラッチの開発中の数ではない）。スキップ 0（ワルツに監修済みがあるので `requires: 'reviewed'` の 7 状態も本当に走った）。
3. **スモーク**: `smoke:practice`（G1 3 タップ・G2 表紙と U1・タブは履歴を積まない・F1 → フィガーが鳴る・ジャイブの帯が 1 2 3 a 4 5 a 6 の順に琥珀）・`smoke:routines`・`smoke:voice`（表紙 → 作る → 録音・M0 の「英語 · 3 / 12 語 · 続きから」）・`smoke:share`（生徒は 表紙 → 使う → ルーティン → 受け取る・「ホームへ」で `#/use`・U2 の行を押すと S5）すべて OK（dev・**6. の複製の Task 1〜4・6 の各コミットで**）。公開ビルドで `smoke:share`・`smoke:practice` OK。`DC_PWA_PORT=4185 smoke:pwa` OK（**precache 172 件**・オフラインで表紙 → 使う → ワルツ（F1 の「基本のカウント」）が鳴る）。
4. **build**: `dist OK: 1078 files, no legacy pages or unreviewed data, voices: default-en-female-v1, precache 172 entries 2.94 MB`（起点 2.92 MB。+0.02 MB は新しい画面のコードと字）。
5. **不変**: `git diff base2 HEAD -- src/engine test/engine/fixtures output legacy public/audio src/app/styles/fonts.css` は空。`timing:audit && timing:compare` は `timing audit identical (generatedAt excluded)`。
6. **計画の差分そのものを確かめた**: 3d2f51e の新しい複製（`git archive` を展開＋`node_modules`）に、この計画の diff のコードブロック 11 個を Task の順に `git apply --whitespace=nowarn` し、各 Task の手順のコマンド（`i18n:phrases`・`copy:sheet`）を回した。**6 つの Task の後の木がスクラッチの各コミットと 1 ファイルも違わない**（`git ls-tree -r` の照合）。各 Task の Step 2 の失敗の件数・Step 4 の件数・typecheck がこの計画の数どおり（`scratchpad/replay.sh`）。Task ごとの ui:check とスモークも複製の上で回した（`scratchpad/pertask.sh`。結果は下の各 Task の Expected）。
7. **画面の撮影**（目視・375×548／375×667／320×568／1280×900 × 日英）: `~/.playwright-mcp/rs-<画面>-<幅>[-en].png`（表紙・U1・U2・M0・M1・F1 ワルツ・S2 ウィスク・S2 ジャイブ・S6・S7 の 80 枚）。途中の `t1-*`・`t3-*`・`t5-*` も同じ所。

## 計画者の発見（裁定の範囲で解決済み。Task 8 で台帳と `rulings.md` の注記に転記する）

1. **【裁定の穴】Ruling 116-2「‹ 表紙＝`goBack`（履歴があれば戻る）」と下タブのリンクが履歴を積むことが両立しない**: 表紙 → 使う（U1）→ タブ「ルーティン」（U2）→「‹ 表紙」が U1 に戻ってしまう（iPhone の戻るスワイプも同じ）。→ **タブの切替を履歴の置き換え（`replaceRoute`）にした**（`TabBar` の `onClick` で `preventDefault`）。これで「‹ 表紙」も戻るスワイプもどちらのタブからでも表紙に着き、Ruling 118-4 (5)「‹ 表紙と戻るスワイプが同じ所に戻る」が成り立つ（`smoke:practice` で固定）。代償: タブを行き来してもブラウザの履歴に残らない（タブは「同じ側の棚」なので害は無いと見た。Open question 1）。
2. **Ruling 116-1 の「`parseHash` は `#/routines` を U2 へ redirect」**は `Route` に `alias: true` を足して実装（`resolveScreen` がハッシュを `#/use/routines` に置き換える）。置き換えは描いた後の effect なので、ui:check が次のハッシュへ急ぐと遅れた置き換えが上書きした（`#/make` が U2 に戻された）→ ui:check に `landsOn`（置き換えが届くまで待つ）を足した。
3. **U16（h1 はちょうど 1 つ）**: U1 はアプリ名を表紙へ渡したので、見出し「種目を選んでください」を **h1** にした（画面が替わった時のフォーカス先＝Ruling 102-2 もここ）。`smoke-app-shell.js` の見出しの検査も h1 に。
4. **U10（ボタンの文言は 2 行まで）と扉の説明**: 日本語は句ごとの `<span>`（`phrased`）で 1 句ずつ数えられて通るが、英語の説明は 1 つの文字列で 375×548 で 3 行・320 で 4 行になる（モックの日本語も 3〜4 行）。扉の説明は名前ではなく説明なので、**`[data-description]` を U10 から外し、代わりに R115「4 行まで」**を当てた（M0 の行の状態の 1 行も同じ）。扉の名前「使う」「作る」・行の名前は U10 のまま（Open question 2）。
5. **U2 の 40 字の名前**: 右端の「▶ 再生」の札の分だけ幅が減り、全角 40 字が 3 行になった（U10）→ 名前は 2 行で「…」（`[data-ellipsis]`・`-webkit-line-clamp: 2`。S5 の見出しと同じ扱い＝Ruling 47）。M1 は今までどおり全部見える（直す側）。
6. **U3（間隔 8px）**: モックの「扉にくっついた続きから」は間が 0px → 枠の中を `--soft` の 8px の帯にした（見た目は 1 つの枠のまま）。M0 の行同士も 8px、表紙の更新の帯は設定の行から 16px。
7. **Ruling 114-6 の文字の大きさ（a・& は 14px・9 個以上は 15px）は U1（16px 以上・`li` は本文 18px）に当たる** → 帯の `li` に `data-fineprint`（14px まで許す既存の印）を付け、U1 の本文の規則から `.dc-beats` を外した（丸の中の 1 字・`aria-hidden`）。
8. **Ruling 114-9 は帯の再生中の点灯を `smoke:app-shell` に置くとしたが**、`smoke:app-shell` は旧画面のサーバー（4173 番）が要り 5 本のゲートに入っていない → **`smoke:practice` に置いた**（ジャイブ 9 秒を 40ms ごとに見て、琥珀の丸が戻らない・1〜6 を通る・6 → 1 で 1 周・大きな語と 90% 以上一致）。`smoke-app-shell.js` は表紙と 2 タブの形に直した（アプリの部分は dev で通ることを確かめた。旧画面の部分はここでは走らせていない）。
9. `stripCells` の引数は Ruling 114-6 の `(events, endTick, figureIndex?)` ではなく **`(program, figureIndex?)`**（`program` は `{ events, figures?, endTick }`＝同じ中身）。フィガーの終わりを呼ぶ側が探さなくて済む。
10. **Ruling 122 の前提「表が空」は 3d2f51e で外れた**: 監修表は 20 件（ワルツ 14・スローフォックス 2・タンゴ 4）。ワルツ・スローフォックス・タンゴのタイルは F1 へ、クイックステップとラテン 5 種目・ヴィエニーズワルツは今までどおり S2 へ（`router-resolve.test.ts` で固定）。`requires: 'reviewed'` の状態（7 つ）は**本当に走る**（表が空に戻れば「スキップ」と 1 行出して飛ばす作りも残した）。空の表の検査は作り物の表（`buildReviewedFigures([])`）を `resolveScreen` の第 3 引数に渡して固定。
11. **G1 のタップ数**: ワルツのタイルが F1 に着いても、一番上の「基本のカウント」を押すとすぐ鳴るので **3 タップのまま**（Ruling 119-7 のとおり）。`smoke:practice` と `smoke:pwa` は F1 を通る時は「基本のカウント」を押す（通らない種目なら ▶）。
12. **D52 の「自動入力なし」の ui:check の状態は 3d2f51e で消えていた**（ワルツの 17 件の 13〜16 番が全部監修済みになった）→ **0 件のタンゴの追加の行で、監修していない照合済みのフィガー（一覧の 5 番目「ナチュラルツイストターン」）を選ぶ状態**で戻した（欄は空・形 8 つで押されない・自動入力の行なし）。
13. **2 小節のフィガーの長い名前**（「ヘジテーションチェンジ · 1 2 3 1 2 3」）は見出しの下で 1 行増え、375×667 で声チップが ▶ の帯の下に入る（スクロールで届く。速さと ▶ は初期表示のまま＝Ruling 120 の「外れた時」の想定どおり）。その状態は ops を固定しない（S5 の Ruling 71-6 と同じ扱い。Open question 3）。
14. **U1 の前回カード「Waltz · Closed Changes」は 320 幅の英語で 2 行**になり、最後の 2 タイルが下タブの下へ（Ruling 121 の「外れた時」の想定どおり）。320 は「横スクロール無し」の幅（段8 発見 20）なので、その状態だけ U12 を 320 で当てない（`tilesMayScrollAt320`）。375×548 では入る。
15. **「ホームへ」「ホームで種目を選んで ▶ を押すと…」（S10 の出口・`goHome`）**は、表紙ができて「ホーム」という名前の場所が無くなった。Ruling 115-6 は行き先だけを U1 に替えたので**文言は変えていない**（Open question 4）。
16. **M0 の 1 行の「先生の方へ。」を「指導者の方へ。」にした**（D56 §1 (a) の合意は扉の副題の言い換えだが、同じ画面の流れで呼び方を揃えた。Open question 5）。
17. **M0 の録音の状態で 2 つの言葉がある時**は「英語 · 12 / 12 語 · 日本語 · 7 / 12 語」（鍵 `voiceStatusPack` を ` · ` で並べる。Ruling 115-3 の「英語 12 / 12 · 日本語 7 / 12」より語が多いが鍵が 1 つで済む）。1 つの時は後ろに「録音済み」／「続きから」。受け取った声は数えない。
18. **F1 の見出し「フィガー」はタブの鍵 `tabFigures` を共用**（Ruling 122-2 の `figuresHeading` は作らない。同じ語で、変える時に 1 か所）。
19. BudouX は扉の説明を「（生徒の｜方）」「・生徒に」と切った → `tools/i18n/segment-ja.js` の `OVERRIDES` に 2 つ足した（「方）」だけの行・行頭の「・」を作らない）。
20. 消えた鍵: `tabPractice`（→ `tabFigures` に改名・値「フィガー / Figures」）・`tabSettings`・`teacherVoice`・`forTeachers`。英語の `routinesCount` は 320 で 3 行になったので “{count} routines (received ones too)” に縮めた。
21. `docs/app-v1/stage8-error-matrix.md` の 7 行目（保存失敗）が「S3 更新あり・消せなかった」を名指ししていた（`error-matrix.test.ts` が落ちる）→ M1 に読み替え。監修シートの道具の画面の対応に S0・M0・F1・U2 を足した。
22. 1024px 以上: 下タブの無い画面にも上部タブの余白（64px）が付いていた → `.dc-shell[data-tabs]` の有無で余白を分けた（タブの無い画面は上 16px・下 16px）。
23. U11 の種別の判定は `routes.ts` の `SCREENS` から作る（`tabsExpected`・`backExpected`）。状態の `kind` が表と違えば落ちる（S7・S12・S13 は focus に、S6・M1 は list に）。
24. `settings.lastFigure` は `lastDanceId` が正しい時だけ残す（種目の無いフィガーは null）。表から消えた slug は表示の時点で種目だけにする（`state/resume.ts` の `lastPractice`。Ruling 121-4）。

## Review Focus

仕様が黙っているが、60〜70代の利用者が踏みやすい入力・状態のうち、Task のテストが固めた物（上から順に起きやすい）。

1. **「使う」で下のタブを行き来してから「‹ 表紙」や iPhone の戻るスワイプ** → どちらからでも表紙（発見 1・`smoke:practice`）。
2. **古い案内文・ブックマークの `#/routines`** → U2 に着き、ハッシュは `#/use/routines`（ui:check「U2 古い経路から」・`router-resolve.test.ts`）。
3. **生徒が U2 の鳴らせない行（0 フィガー）を押す** → ボタンではないので何も起きず、注意の 1 行が「作る」を指す（ui:check「U2 3本」・`playRows`）。
4. **監修表から外れたフィガーの前回・古いリンク** → カードは種目名だけ・押すと基本が鳴る・`#/practice/waltz/<消えた slug>` は基本へ置き換え（ui:check「S1 前回のフィガーが表に無い」「S2 表に無いフィガー」）。
5. **ジャイブ・チャチャチャ・タンゴで丸と語が食い違う**（D55 の元の報告）→ 帯の語は大きな語と同じ・1 対 1（`beat-indicator.test.ts`・ui:check の 3 状態・`smoke:practice`）。

（自動で固めきれない物は Task 7 の通し確認と Task 8 の実機確認表へ: iPhone の戻るスワイプ・本物の iOS の書体での扉の説明の折れ・帯の a・& の丸の見やすさ・表紙を毎回見る煩わしさ）

## 裁定と Task の対応

| 裁定 | 中身 | Task |
|---|---|---|
| Ruling 115-1・116・117 | 表紙 S0（C 案）・経路表・下タブ 2 つ・「‹ 表紙」・起動は毎回表紙・深いリンクは直接 | 1 |
| Ruling 115-2・115-3・115-6・115-7・118 | U1（先生カードを外す）・U2（押すとすぐ鳴る・受け取る）・M0・M1・S10 の出口・案内文の 2 行目・検査 | 1 |
| Ruling 115-4・115-5 | S6 を 3 つに・S7 の録音ボタンを 1 行に | 2 |
| Ruling 114 | カウントの型の帯（全種目・S5 はフィガーごと・12 語ずつ） | 3 |
| Ruling 119-6・120-1〜120-4・121-1・122-3 の node 分 | `figureSlug`・`reviewedFigures`・経路 F1／S2 のフィガーの形・`resolve`・`lastFigure`・`practiceCounts` | 4 |
| Ruling 119・120-5〜120-8・121-2〜121-5・122 | F1 の画面・タイルの振り分け・S2 のフィガーの形・前回「ワルツ · ウィスク」・ui:check・スモーク | 5 |
| Ruling 118-5・122-5 | 仕様と設計の骨子の読み替え | 6 |
| 常設要件 | 使いやすさの通し確認（新しい Opus・iOS Simulator） | 7 |
| Ruling 118-4・122-3 の実機の行・台帳 | 実機確認表・po-checklist・HANDOVER §0・台帳・裁定の注記 | 8 |

## ファイル構成（この計画で作る・変えるもの）

```
src/app/router/{routes,resolve}.ts・src/app/state/{route,resume}.ts                      … 経路表・alias・親・下タブ・前回（Task 1・4・5）
src/app/components/{TabBar,BackButton}.tsx・src/app/App.tsx                                … タブ 2 つ（置き換え）・「‹ 表紙」・画面の振り分け（Task 1・5）
src/app/screens/{Cover,Make}Screen.tsx（新）・{Home,Routines,Settings,Receive,Voices}Screen.tsx … 表紙・作る・U1・U2／M1・S6・S10・S7（Task 1・2）
src/app/practice/{beat-indicator,session,controls}.ts(x)・screens/{Practice,RoutinePlay}Screen.tsx … 帯（Task 3）
src/app/routines/{figure-names,reviewed-counts}.ts・practice/preferences.ts・settings/settings.ts … フィガーの印・表の引き方・counts の 1 本・lastFigure（Task 4）
src/app/screens/FigureListScreen.tsx（新）・src/app/i18n/LastPracticeName.tsx（新）         … F1・「ワルツ · ウィスク」（Task 5）
src/app/i18n/messages.ts・src/app/styles/base.css                                          … 文言・見た目（Task 1・2・3・5）
tools/i18n/{copy-review-sheet,segment-ja}.js・生成物 2 つ                                    … 監修シートの画面・句の上書き（Task 1・5）
tools/check-app-ui.js・tools/ui-check-routines.js・tools/smoke-{practice,routines,voice,share,pwa,app-shell}.js … 検査（各 Task）
test/app/{routes,router-resolve,i18n,update-banner-placement}.test.ts・test/app/share/instructions.test.ts … Task 1・4
test/app/practice/{beat-indicator,preferences}.test.ts・test/app/routines/{figure-names,reviewed-counts}.test.ts・test/app/settings/settings.test.ts … Task 3・4
docs/app-v1/stage8-error-matrix.md（7 行目）・docs/superpowers/specs/2026-10-11-app-v1-design.md・docs/app-v1/design-skeleton.md … Task 1・6
docs/app-v1/role-split-usability-walk.md（新）… Task 7
docs/app-v1/{device-check-master,po-checklist,HANDOVER,rulings}.md・docs/app-v1/role-split-ledger.md（新）… Task 8
```

**並べ方と担当**: 全部 `agent/auto-counts` で**逐次**（同じ木で 2 つの実装者を同時に走らせない。どの Task も `check-app-ui.js` を触る）。依存は 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8（3 は 1・2 の ui:check の上・5 は 3 の帯と 4 の経路の上）。担当: **Task 1・3・5 は Opus**（経路と戻るの意味・セッションと時間の境界・F1 と ui:check の `requires` の作り）、**Task 2・4・6・8 は Sonnet**（完全な差分とテストがある・文書）、**Task 7 はこの計画の実装に関わっていない新しい Opus**。各 Task の終わりに別エージェントのレビュー（SDD の流儀）。

**差分の当て方**: 計画の diff のコードブロック（Task 1〜5 に「テスト」と「実装」の 2 つ・Task 6 は「実装」だけ＝全部で 11）は、着手の時に 1 回で切り出しておく。各 Task の手順では `git apply --whitespace=nowarn .superpowers/sdd/role-split/t<N>-<test|impl>.diff` で当てる（計画者が 3d2f51e の新しい複製で同じ順に当たり、木がスクラッチと一致することを確かめた。当たらない時は前の Task の取りこぼし）。生成物 2 つは差分の外（手順のコマンドで作る）。`.superpowers/` は `.gitignore` にある。

```bash
cd "/Users/usausagi/Documents/AI_Playground/Dance Count auto-counts"
mkdir -p .superpowers/sdd/role-split && python3 - <<'EOF'
import re
s = open('docs/superpowers/plans/2026-10-13-app-v1-role-split.md', encoding='utf-8').read()
for name, block in re.findall(r'^<!-- diff: (\S+) -->\n```diff\n(.*?)^```$', s, flags=re.S | re.M):
    open(f'.superpowers/sdd/role-split/{name}.diff', 'w', encoding='utf-8').write(block)
EOF
ls .superpowers/sdd/role-split | wc -l   # → 11
```

各 Task の共通の確かめ方（Step 4。数は各 Task の Expected）:

```bash
npm test 2>&1 | grep -E "^ℹ (tests|fail)"; npm run -s typecheck && echo typecheck-ok
npx vite --port 5185 --strictPort   # 別の端末で（Task の間は立てたままでよい）
DC_BASE_URL=http://localhost:5185/ npm run -s ui:check | grep -cE ": PASS"
for s in smoke:practice smoke:routines smoke:voice smoke:share; do DC_BASE_URL=http://localhost:5185/ npm run -s $s | tail -1 | cut -c1-90; done
```

---
### Task 1: 表紙 S0 と「使う／作る」の骨組み — 経路表・下タブ 2 つ（置き換え）・「‹ 表紙」・U1・U2・M0・M1・S10 の出口・案内文の 2 行目

**担当:** Opus。**Ruling 115-1〜115-3・115-6・115-7・116・117・118（S6／S7 の中身は Task 2）。**

**Files:**
- Create: `src/app/screens/CoverScreen.tsx`・`src/app/screens/MakeScreen.tsx`・`src/app/state/resume.ts`
- Modify: `src/app/router/{routes,resolve}.ts`・`src/app/state/route.ts`・`src/app/components/{TabBar,BackButton}.tsx`・`src/app/App.tsx`・`src/app/screens/{Home,Routines,Settings,Receive}Screen.tsx`・`src/app/i18n/messages.ts`・`src/app/styles/base.css`・`tools/i18n/{copy-review-sheet,segment-ja}.js`・`docs/app-v1/stage8-error-matrix.md`・生成物 2 つ
- Test: `test/app/{routes,router-resolve,i18n,update-banner-placement}.test.ts`・`test/app/share/instructions.test.ts`・`tools/check-app-ui.js`・`tools/smoke-{practice,routines,voice,share,pwa,app-shell}.js`

**Interfaces:**
- Produces: `ScreenId` に `S0`・`U2`・`M0`・`M1`（`S3` は消える）。`ScreenKind` に `'cover'`。`SCREENS[x].side`（`'use' | 'make' | null`）・`tab`（`'practice' | 'routines' | null`）。`Route.alias?: true`。`showsTabs(screen)`＝`side==='use' && kind==='root'`。`tabOf` は `TabId | null`。`goBack` の行き先が無い時は `S0`。`resolveScreen` の置き換え先は S4 → M1・S5 → U2。`state/resume.ts` の `resumePractice(danceId)`（Task 5 で引数が `LastPractice` に替わる）。`RoutinesScreen({ mode: 'use' | 'make' })`（data-screen は `U2`／`M1`）。表紙の `[data-door="use"]`・`[data-door="make"]`・`[data-resume]`（C 案）・`.dc-cover-settings`。M0 の `a.dc-hub`（3 つ）。U2 の `button.dc-row--play`（＋`.dc-play-tag`）・`[data-row-off]`（＋`.dc-row-warn`）・`.dc-edit-in-make`。鍵 `tabFigures`（`tabPractice` の改名）・`backToCover`・`coverUse`・`coverUseSub`・`coverMake`・`coverMakeSub`・`coverSettingsSub`・`continueLast`・`makeIntro`・`makeRoutines`・`makeShare`・`makeShareSub`・`voiceStatusNone`・`voiceStatusPack`・`voiceStatusDone`・`routinesCount`・`routinesCountOne`・`routinesNone`・`editFromMake`・`cannotPlayEmpty`・`cannotPlayFix`。消える鍵 `tabSettings`・`teacherVoice`。ui:check の `tilesInView`（`teacherAndTiles` の後継）・`playRows`・`landsOn`・`[data-description]`（R115）。
- Consumes: 既存の `listVoicePacks`・`packProgress`・`useRoutines`・`phrased`・`UpdateBanner`・`unlockAudioInsideTap`・`requestAutoplay`。

**決まり**: 深い画面（S2・S4・S5・S7〜S13）の `path` は変えない。S1 の ID は残す（`#/use`）。下タブの切替は置き換え（発見 1）。表紙は側を保存しない（`settings`・`hints`・`sessionStorage` に書かない）。保存の移行は無い。表紙の「続きから」は `hints.firstPlaybackDone` の後だけ。U2 には編集・削除・配る・録音を置かない。M1 の開いた行の主ボタンは「試聴」（`previewVoice` の鍵を共用）。案内文の 2 行目は声あり・ルーティンだけとも 1 通り（`instructionsStep2Routines` は作らない）。

- [ ] **Step 1: 失敗するテストと検査を書く**

`git apply --whitespace=nowarn .superpowers/sdd/role-split/t1-test.diff`（中身は下のとおり）:

<!-- diff: t1-test -->
```diff
diff --git a/test/app/i18n.test.ts b/test/app/i18n.test.ts
index cbe600b..3f848a5 100644
--- a/test/app/i18n.test.ts
+++ b/test/app/i18n.test.ts
@@ -47,9 +47,9 @@ test('device languages resolve to ja-JP only for Japanese, English otherwise', (
 });
 
 test('translator returns the locale string and falls back to English then the key', () => {
-  assert.equal(createAppTranslator('ja-JP').t('tabPractice'), '練習');
-  assert.equal(createAppTranslator('en').t('tabPractice'), 'Practice');
-  assert.equal(createAppTranslator('de').t('tabPractice'), 'Practice');
+  assert.equal(createAppTranslator('ja-JP').t('tabFigures'), 'フィガー');
+  assert.equal(createAppTranslator('en').t('tabFigures'), 'Figures');
+  assert.equal(createAppTranslator('de').t('tabFigures'), 'Figures');
 });
 
 test('every dance has a display name in both locales (dance-profiles name is not used for display)', () => {
diff --git a/test/app/router-resolve.test.ts b/test/app/router-resolve.test.ts
index bb757cf..5f5d516 100644
--- a/test/app/router-resolve.test.ts
+++ b/test/app/router-resolve.test.ts
@@ -15,7 +15,8 @@ const EMPTY = make('r-empty001', []);
 const BROKEN = make('r-broken01', ['12a3']);
 const ALL = [READY, EMPTY, BROKEN];
 const resolve = (hash: string) => resolveScreen(parseHash(hash), ALL);
-const toRoutines = { screen: 'S3', redirect: { screen: 'S3', params: {} } };
+const toMake = { screen: 'M1', redirect: { screen: 'M1', params: {} } };   // S4（作る側）が開けない時（D56）
+const toUse = { screen: 'U2', redirect: { screen: 'U2', params: {} } };     // S5（使う側）が開けない時
 
 test('new routine and existing routines open the editor', () => {
   assert.deepEqual(resolve('#/routines/new'), { screen: 'S4', redirect: null });
@@ -24,29 +25,35 @@ test('new routine and existing routines open the editor', () => {
 
 test('only a playable routine opens the player (Ruling 40)', () => {
   assert.deepEqual(resolve(`#/routines/${READY.id}/play`), { screen: 'S5', redirect: null });
-  assert.deepEqual(resolve(`#/routines/${EMPTY.id}/play`), toRoutines);
-  assert.deepEqual(resolve(`#/routines/${BROKEN.id}/play`), toRoutines);
+  assert.deepEqual(resolve(`#/routines/${EMPTY.id}/play`), toUse);
+  assert.deepEqual(resolve(`#/routines/${BROKEN.id}/play`), toUse);
 });
 
 test('unknown ids and the reserved word "new" go back to the list (Ruling 37)', () => {
-  for (const hash of ['#/routines/new/edit', '#/routines/new/play', '#/routines/r-missing1/edit', '#/routines/r-missing1/play', '#/routines/x/play']) {
-    assert.deepEqual(resolve(hash), toRoutines, hash);
-  }
+  for (const hash of ['#/routines/new/edit', '#/routines/r-missing1/edit']) assert.deepEqual(resolve(hash), toMake, hash);
+  for (const hash of ['#/routines/new/play', '#/routines/r-missing1/play', '#/routines/x/play']) assert.deepEqual(resolve(hash), toUse, hash);
 });
 
-test('the practice screen needs a known dance; unbuilt screens show home', () => {
+test('the old #/routines lands on U2 and the hash is replaced (D56・Ruling 116-1)', () => {
+  assert.deepEqual(resolve('#/routines'), { screen: 'U2', redirect: { screen: 'U2', params: {} } });
+  assert.deepEqual(resolve('#/use/routines'), { screen: 'U2', redirect: null });
+  assert.deepEqual(resolve('#/'), { screen: 'S0', redirect: null });
+  assert.deepEqual(resolve('#/nope'), { screen: 'S0', redirect: null });
+});
+
+test('the practice screen needs a known dance (else U1); unbuilt screens show the cover', () => {
   assert.deepEqual(resolve('#/practice/waltz'), { screen: 'S2', redirect: null });
   assert.deepEqual(resolve('#/practice/hiphop'), { screen: 'S1', redirect: null });
   assert.deepEqual(resolve('#/about'), { screen: 'S13', redirect: null }, 'S13 is built in stage 8');
   assert.deepEqual(resolve('#/share'), { screen: 'S9', redirect: null }, 'S9 is built in stage 5');
   assert.deepEqual(resolve('#/receive'), { screen: 'S10', redirect: null }, 'S10 is built in stage 5');
-  for (const hash of ['#/', '#/routines', '#/settings', '#/voices', '#/help/sound']) assert.equal(resolve(hash).redirect, null, hash);
+  for (const hash of ['#/', '#/use', '#/use/routines', '#/make', '#/make/routines', '#/settings', '#/voices', '#/help/sound']) assert.equal(resolve(hash).redirect, null, hash);
   assert.deepEqual(resolve('#/voices/record'), { screen: 'S8', redirect: null }, 'S8 is built in stage 4');
 });
 
 test('a new routine is refused by hash too once the list is full (Ruling 37)', () => {
   const full = Array.from({ length: ROUTINES_MAX }, (_, i) => createRoutine({ id: `r-limit${String(i).padStart(4, '0')}`, danceId: 'waltz', name: `R${i}`, now: NOW }));
-  assert.deepEqual(resolveScreen(parseHash('#/routines/new'), full), toRoutines);
+  assert.deepEqual(resolveScreen(parseHash('#/routines/new'), full), toMake);
   assert.deepEqual(resolveScreen(parseHash('#/routines/new'), full.slice(1)), { screen: 'S4', redirect: null });
   assert.deepEqual(resolveScreen(parseHash(`#/routines/${full[0]!.id}/edit`), full), { screen: 'S4', redirect: null });
 });
diff --git a/test/app/routes.test.ts b/test/app/routes.test.ts
index 675d320..d084b24 100644
--- a/test/app/routes.test.ts
+++ b/test/app/routes.test.ts
@@ -4,9 +4,12 @@ import { parseHash, buildHash, SCREENS, showsTabs, parentScreen, tabOf, type Scr
 
 test('every screen hash from spec §3 parses to its screen and params', () => {
   const cases: Array<[string, ScreenId, Record<string, string>]> = [
-    ['#/', 'S1', {}],
+    ['#/', 'S0', {}],
+    ['#/use', 'S1', {}],
+    ['#/use/routines', 'U2', {}],
+    ['#/make', 'M0', {}],
+    ['#/make/routines', 'M1', {}],
     ['#/practice/waltz', 'S2', { danceId: 'waltz' }],
-    ['#/routines', 'S3', {}],
     ['#/routines/new', 'S4', {}],
     ['#/routines/r-123/edit', 'S4', { routineId: 'r-123' }],
     ['#/routines/r-123/play', 'S5', { routineId: 'r-123' }],
@@ -25,12 +28,19 @@ test('every screen hash from spec §3 parses to its screen and params', () => {
   }
 });
 
-test('empty, malformed and unknown hashes fall back to home instead of throwing', () => {
-  for (const hash of ['', '#', '#/nope', '#/practice', '#/practice/', '#/practice/a/b', '#/routines/x/delete', 'garbage', '#/practice/%E3%81%82', '#/practice/<script>']) {
-    assert.deepEqual(parseHash(hash), { screen: 'S1', params: {}, query: {} }, JSON.stringify(hash));
+test('empty, malformed and unknown hashes fall back to the cover instead of throwing (D56)', () => {
+  for (const hash of ['', '#', '#/nope', '#/practice', '#/practice/', '#/practice/a/b', '#/routines/x/delete', 'garbage', '#/practice/%E3%81%82', '#/practice/<script>', '#/use/x', '#/make/x']) {
+    assert.deepEqual(parseHash(hash), { screen: 'S0', params: {}, query: {} }, JSON.stringify(hash));
   }
 });
 
+test('the old #/routines is read as U2 and marked as an alias; building U2 gives the new path (D56・Ruling 116-1)', () => {
+  assert.deepEqual(parseHash('#/routines'), { screen: 'U2', params: {}, query: {}, alias: true });
+  assert.deepEqual(parseHash('#/routines?ui-state=update-ready'), { screen: 'U2', params: {}, query: { uiState: 'update-ready' }, alias: true });
+  assert.equal(buildHash({ screen: 'U2', params: {} }), '#/use/routines');
+  assert.equal(parseHash('#/use/routines').alias, undefined);
+});
+
 test('trailing slash is ignored', () => {
   assert.deepEqual(parseHash('#/settings/'), { screen: 'S6', params: {}, query: {} });
 });
@@ -38,7 +48,7 @@ test('trailing slash is ignored', () => {
 test('known ui-state values are read from the hash query (Ruling 33)', () => {
   assert.deepEqual(parseHash('#/practice/jive?ui-state=no-sound'), { screen: 'S2', params: { danceId: 'jive' }, query: { uiState: 'no-sound' } });
   assert.deepEqual(parseHash('#/practice/waltz?x=1&ui-state=wakelock-tip').query, { uiState: 'wakelock-tip' });
-  assert.deepEqual(parseHash('#/routines?ui-state=confirm-delete'), { screen: 'S3', params: {}, query: { uiState: 'confirm-delete' } });
+  assert.deepEqual(parseHash('#/make/routines?ui-state=confirm-delete'), { screen: 'M1', params: {}, query: { uiState: 'confirm-delete' } });
 });
 
 test('the three S8 display states are read too (Ruling 63-3)', () => {
@@ -46,8 +56,8 @@ test('the three S8 display states are read too (Ruling 63-3)', () => {
     assert.deepEqual(parseHash(`#/voices/record?ui-state=${uiState}`), { screen: 'S8', params: {}, query: { uiState } });
   }
   assert.deepEqual(parseHash('#/voices?ui-state=confirm-delete').query, { uiState: 'confirm-delete' });
-  // 段7（Ruling 90-7）: 更新の帯は S1・S3・S6・S7 で見た目だけ強制できる
-  for (const hash of ['#/', '#/routines', '#/settings', '#/voices']) assert.deepEqual(parseHash(`${hash}?ui-state=update-ready`).query, { uiState: 'update-ready' });
+  // 段7（Ruling 90-7）: 更新の帯は見た目だけ強制できる（D56: 表紙・U1・U2・M1・S6・S7）
+  for (const hash of ['#/', '#/use', '#/use/routines', '#/make/routines', '#/settings', '#/voices']) assert.deepEqual(parseHash(`${hash}?ui-state=update-ready`).query, { uiState: 'update-ready' });
   assert.deepEqual(parseHash('#/voices/record?ui-state=MIC-DENIED').query, {});
 });
 
@@ -74,23 +84,24 @@ test('buildHash never writes the query, so navigating clears ui-state', () => {
   assert.equal(buildHash(route), '#/practice/waltz');
 });
 
-test('tabs show on root and list screens only (Ruling 17)', () => {
+test('tabs show on the two "Use" roots only (D56・Ruling 116-1)', () => {
   const visible = (Object.keys(SCREENS) as ScreenId[]).filter(showsTabs).sort();
-  assert.deepEqual(visible, ['S1', 'S12', 'S13', 'S3', 'S6', 'S7']);
+  assert.deepEqual(visible, ['S1', 'U2']);
+  assert.equal(tabOf('S1'), 'practice');
+  assert.equal(tabOf('U2'), 'routines');
+  assert.equal(tabOf('M0'), null);
 });
 
-test('back without history goes to the parent from spec §3', () => {
+test('back without history goes to the parent from the D56 route table (Ruling 116-1)', () => {
   const expected: Record<ScreenId, ScreenId | null> = {
-    S1: null, S2: 'S1', S3: null, S4: 'S3', S5: 'S3', S6: null, S7: 'S6',
-    S8: 'S7', S9: 'S7', S10: 'S7', S11: 'S6', S12: 'S6', S13: 'S6'
+    S0: null, S1: 'S0', U2: 'S0', M0: 'S0', M1: 'M0', S2: 'S1', S4: 'M1', S5: 'U2', S6: 'S0', S7: 'S1',
+    S8: 'M0', S9: 'M0', S10: 'U2', S11: 'S6', S12: 'S6', S13: 'S6'
   };
   for (const screen of Object.keys(expected) as ScreenId[]) assert.equal(parentScreen(screen), expected[screen], screen);
 });
 
-test('each screen belongs to exactly one of the three tabs', () => {
-  assert.equal(tabOf('S1'), 'practice');
-  assert.equal(tabOf('S2'), 'practice');
-  assert.equal(tabOf('S5'), 'routines');
-  assert.equal(tabOf('S7'), 'settings');
-  assert.equal(tabOf('S13'), 'settings');
+test('only the cover has no back button; the screens under the cover say "Cover" (D56・Ruling 116-2・116-3)', () => {
+  const kinds = Object.fromEntries((Object.keys(SCREENS) as ScreenId[]).map(screen => [screen, SCREENS[screen].kind]));
+  assert.deepEqual(Object.entries(kinds).filter(([, kind]) => kind === 'cover').map(([screen]) => screen), ['S0']);
+  assert.deepEqual((Object.keys(SCREENS) as ScreenId[]).filter(screen => parentScreen(screen) === 'S0').sort(), ['M0', 'S1', 'S6', 'U2']);
 });
diff --git a/test/app/share/instructions.test.ts b/test/app/share/instructions.test.ts
index 6145edf..403907c 100644
--- a/test/app/share/instructions.test.ts
+++ b/test/app/share/instructions.test.ts
@@ -11,7 +11,7 @@ test('the Japanese instructions are the spec §8 text with the stage-7 Android l
   assert.equal(studentInstructions(ja, { hasVoice: true, appUrl: 'https://count.dancemap.jp/' }), [
     'Dance Count で、私の声のカウントを使えます。',
     '【iPhone】1. このファイルを開き、右上の共有ボタン →「"ファイル"に保存」',
-    '2. Dance Count を開き「先生の声で練習」→「ファイルから受け取る」→「ファイルを選ぶ」',
+    '2. Dance Count を開き「使う」→ 下の「ルーティン」→「ファイルから受け取る」→「ファイルを選ぶ」',   // D56（Ruling 115-7）: 声あり・ルーティンだけとも同じ 1 通り
     '3. 「最近使った項目」からこのファイルを選び「使う」',
     '【Android】このファイルを開き、共有 →「Dance Count」→「使う」（「Dance Count」が出てこない時は、保存してから 2・3 の手順で「ファイルを選ぶ」）',
     '（スマホで受け取るのが便利です）',
@@ -24,7 +24,9 @@ test('English mirrors it; routines-only files change the first line; no URL mean
   const lines = text.split('\n');
   assert.equal(lines[0], 'You can use my routines in Dance Count.');
   assert.equal(lines[4], '[Android] Open this file, tap Share → “Dance Count” → “Use” (if “Dance Count” is not listed, save the file and follow steps 2–3 to “Choose a file”)');
+  assert.equal(lines[2], '2. Open Dance Count → “Use” → “Routines” (bottom tab) → “Receive from a file” → “Choose a file”');
   assert.equal(lines.length, 6);
+  assert.equal(studentInstructions(ja, { hasVoice: false, appUrl: '' }).split('\n')[2], studentInstructions(ja, { hasVoice: true, appUrl: '' }).split('\n')[2], 'step 2 is the same for routines-only files (D56)');
   assert.ok(!text.includes('App:'));
   assert.equal(studentInstructions(ja, { hasVoice: false, appUrl: '' }).split('\n')[0], 'Dance Count で、私のルーティンを使えます。');
   assert.equal(studentInstructions(en, { hasVoice: true, appUrl: 'not a url' }).split('\n').length, 6);
diff --git a/test/app/update-banner-placement.test.ts b/test/app/update-banner-placement.test.ts
index d6f4842..ea40965 100644
--- a/test/app/update-banner-placement.test.ts
+++ b/test/app/update-banner-placement.test.ts
@@ -1,4 +1,4 @@
-// 段7（Ruling 90-3・D45）: 更新の帯はルート・一覧の画面（S1・S3・S6・S7）だけ。集中画面（再生・録音・編集・配る・受け取る）には置かない
+// 段7（Ruling 90-3・D45）: 更新の帯はルート・一覧の画面（D56 からは 表紙 S0・U1・U2／M1・S6・S7）だけ。集中画面（再生・録音・編集・配る・受け取る）には置かない
 // ＝練習中に帯が出て再生を乱すことがない。画面のファイルの import で固定する（.tsx のテストは書かない方針なのでソースを読む）。
 import test from 'node:test';
 import assert from 'node:assert/strict';
@@ -7,7 +7,7 @@ import path from 'node:path';
 
 const screens = path.resolve(import.meta.dirname, '../../src/app/screens');
 
-test('only S1, S3, S6 and S7 show the update banner (never a focus screen)', () => {
+test('only the cover, U1, U2/M1, S6 and S7 show the update banner (never a playing or editing screen; D56 Ruling 115-1)', () => {
   const withBanner = fs.readdirSync(screens).filter(file => fs.readFileSync(path.join(screens, file), 'utf8').includes('<UpdateBanner />')).sort();
-  assert.deepEqual(withBanner, ['HomeScreen.tsx', 'RoutinesScreen.tsx', 'SettingsScreen.tsx', 'VoicesScreen.tsx']);
+  assert.deepEqual(withBanner, ['CoverScreen.tsx', 'HomeScreen.tsx', 'RoutinesScreen.tsx', 'SettingsScreen.tsx', 'VoicesScreen.tsx']);
 });
diff --git a/tools/check-app-ui.js b/tools/check-app-ui.js
index 14463a3..00dad00 100644
--- a/tools/check-app-ui.js
+++ b/tools/check-app-ui.js
@@ -8,6 +8,7 @@ import { AxeBuilder } from '@axe-core/playwright';
 import { chromium } from 'playwright-core';
 import { ABOUT_TEXT } from '../src/app/i18n/about.ts';
 import { APP_MESSAGES } from '../src/app/i18n/messages.ts';
+import { SCREENS, showsTabs } from '../src/app/router/routes.ts';
 import { UI_CHECK_ROUTINES as R, manyRoutines, openAfterSeed, seedRoutinesInPage } from './ui-check-routines.js';
 import { UI_CHECK_VOICES as V, seedVoicePacksInPage } from './ui-check-voices.js';
 
@@ -56,16 +57,25 @@ const PLAYED = { lastDanceId: 'waltz', hints: { firstPlaybackDone: true } };   /
 const S4_13 = `#/routines/${R.waltz13.id}/edit`;
 const S5_13 = `#/routines/${R.waltz13.id}/play`;
 const STATES = [
-  { name: 'S1 初回', hash: '#/', screen: 'S1', kind: 'root', ops: 2, teacherAndTiles: true },
-  { name: 'S1 前回あり', hash: '#/', screen: 'S1', kind: 'root', ops: 3, teacherAndTiles: true, prepare: '#/practice/waltz' },
+  // D56（Ruling 115-1・118-3）: 表紙 S0。扉「使う」「作る」＋行「設定」＝3。初めて鳴った後は「使う」の扉にくっついた「前回の練習 ▶ 続きから」で 4（C 案）。
+  // 言語は [data-utility]、更新の帯の「更新する」は [data-alert-action]（数えない）。戻る・下タブは無い（U11）
+  { name: 'S0 初回', hash: '#/', screen: 'S0', kind: 'cover', ops: 3, total: 3, absent: ['[data-resume]'], textKeys: ['coverUse', 'coverMake', 'coverUseSub', 'coverMakeSub'] },
+  { name: 'S0 前回あり', hash: '#/', screen: 'S0', kind: 'cover', settingsSeed: PLAYED, ops: 4, total: 4, firstView: ['[data-door="use"]', '[data-resume]', '[data-door="make"]', '.dc-cover-settings'],
+    placed: [['[data-resume]', '[data-door="use"]']], textKeys: ['continueLast'] },
+  // S2 を開いただけ（まだ鳴らしていない）では「続きから」は出さない（hints.firstPlaybackDone が立ってから。Ruling 115-1）
+  { name: 'S0 開いただけ', hash: '#/', screen: 'S0', kind: 'cover', prepare: '#/practice/waltz', ops: 3, total: 3, absent: ['[data-resume]'] },
+  { name: 'S0 更新あり', hash: '#/?ui-state=update-ready', screen: 'S0', kind: 'cover', ops: 3, total: 3, alert: true, texts: ['新しい版があります。'], bannerAfter: '.dc-cover-settings' },
+  // U1（S1 の ID のまま #/use。D56 Ruling 115-2）: 「先生の声で練習」カードを外した。主要操作は 種目群 1（前回カードがあれば 2）。左上「‹ 表紙」・下タブ 2 つ
+  { name: 'S1 初回', hash: '#/use', screen: 'S1', kind: 'root', ops: 1, total: 1, tilesInView: true, absent: ['[data-teacher-card]'], textKeys: ['backToCover', 'tabFigures'] },
+  { name: 'S1 前回あり', hash: '#/use', screen: 'S1', kind: 'root', ops: 2, tilesInView: true, prepare: '#/practice/waltz' },
   // 段7（Ruling 90-3・90-7）: 更新の帯は S1 の最下段（種目タイルの下）。「更新する」は [data-alert-action]＝数えない。375×548 の初期表示（U12）は崩れない
-  { name: 'S1 更新あり', hash: '#/?ui-state=update-ready', screen: 'S1', kind: 'root', ops: 2, total: 2, teacherAndTiles: true, alert: true,
+  { name: 'S1 更新あり', hash: '#/use?ui-state=update-ready', screen: 'S1', kind: 'root', ops: 1, total: 1, tilesInView: true, alert: true,
     texts: ['新しい版があります。', '更新する'], bannerAfter: '.dc-tiles' },
   // 段7（Ruling 92-7・D42）: 初めて鳴った後の iPhone の Safari に、種目タイルの下の案内カード（行＋「閉じる」＝2）。PC には出さない。
-  // 初期表示は 375 幅では 3 のまま（カードは下）・1280×900 ではカードまで見えて 5（上限内）なので ops は固定しない
-  { name: 'S1 案内カード', hash: '#/', screen: 'S1', kind: 'root', settingsSeed: PLAYED, userAgent: IOS_SAFARI_UA, total: 5, teacherAndTiles: true,
+  // 初期表示は 375 幅では 2 のまま（カードは下）・1280×900 ではカードまで見えて 4（上限内）なので ops は固定しない
+  { name: 'S1 案内カード', hash: '#/use', screen: 'S1', kind: 'root', settingsSeed: PLAYED, userAgent: IOS_SAFARI_UA, total: 4, tilesInView: true,
     texts: ['ホーム画面に追加すると、アプリのように使えます', '閉じる'], placed: [['[data-install-card]', '.dc-tiles']] },
-  { name: 'S1 案内カード（PC では出ない）', hash: '#/', screen: 'S1', kind: 'root', settingsSeed: PLAYED, ops: 3, total: 3, teacherAndTiles: true, absent: ['[data-install-card]'] },
+  { name: 'S1 案内カード（PC では出ない）', hash: '#/use', screen: 'S1', kind: 'root', settingsSeed: PLAYED, ops: 2, total: 2, tilesInView: true, absent: ['[data-install-card]'] },
   { name: 'S2 くわしく閉', hash: '#/practice/waltz', screen: 'S2', kind: 'focus', ops: 5, speedAndPlay: true },
   { name: 'S2 くわしく開', hash: '#/practice/waltz', screen: 'S2', kind: 'focus', openMore: true, total: 9, voiceOffset: '±0 ms' },
   { name: 'S2 音が出ない', hash: '#/practice/waltz?ui-state=no-sound', screen: 'S2', kind: 'focus', speedAndPlay: true, alert: true },
@@ -80,14 +90,29 @@ const STATES = [
   // Ruling 103-3（段4 Task 5）: 保存失敗の枠は「閉じる」で閉じる（ほかの案内を隠したままにしない）
   { name: 'S2 保存できなかった・閉じた', hash: '#/practice/waltz?ui-state=save-failed', screen: 'S2', kind: 'focus', total: 5,
     steps: [{ click: '[data-alert="save-failed"] [data-alert-action]' }], absent: ['[data-alert]'] },
-  { name: 'S3 0件', hash: '#/routines', screen: 'S3', kind: 'root', ops: 1, total: 1 },
-  { name: 'S3 更新あり', hash: '#/routines?ui-state=update-ready', screen: 'S3', kind: 'root', ops: 1, total: 1, alert: true, texts: ['新しい版があります。'], bannerAfter: 'h1' },
+  // D56（Ruling 115-2・118-3）: U2「使う › ルーティン」。「ファイルから受け取る」1・一覧 [data-list] 1。行を押すとすぐ鳴る（鳴らせない行は操作ではない）。
+  // 一覧の下に「直す・消す時は表紙の「作る」から」の 1 行。編集・削除・配るは無い
+  { name: 'U2 0件', hash: '#/use/routines', screen: 'U2', kind: 'root', ops: 1, total: 1, textKeys: ['receiveFromFile', 'editFromMake'], absent: ['[data-row-body]'] },
+  { name: 'U2 3本（鳴らせない行あり）', hash: '#/use/routines', screen: 'U2', kind: 'root', seed: [R.waltz13, R.empty, R.longJa], ops: 2, total: 2,
+    playRows: { play: 2, off: 1 }, textKeys: ['cannotPlayEmpty', 'editFromMake'], absent: ['[data-group="routine-actions"]', '.dc-primary'] },
+  { name: 'U2 更新あり', hash: '#/use/routines?ui-state=update-ready', screen: 'U2', kind: 'root', ops: 1, total: 1, alert: true, texts: ['新しい版があります。'], bannerAfter: 'h1' },
+  // 古い #/routines（D56 より前の案内・ブックマーク）は U2 に着き、ハッシュは #/use/routines に置き換わる（Ruling 116-1）
+  { name: 'U2 古い経路から', hash: '#/routines', screen: 'U2', kind: 'root', ops: 1, total: 1, landsOn: '#/use/routines' },
+  // D56（Ruling 115-3）: M0「作る」。行 3 つ（録音・ルーティン・配る。束にしない）＝3。行の下に「今どこまでできたか」の 1 行。左上「‹ 表紙」・下タブ無し
+  { name: 'M0 未録音', hash: '#/make', screen: 'M0', kind: 'root', ops: 3, total: 3, texts: ['まだ録音していません', 'まだありません'], textKeys: ['makeIntro', 'makeShareSub'] },
+  { name: 'M0 途中', hash: '#/make', screen: 'M0', kind: 'root', voiceSeed: [V.partialJa], seed: [R.waltz13], ops: 3, total: 3,
+    texts: ['日本語 · 7 / 12 語 · 続きから', '1 本（受け取った物も直せます）'] },
+  { name: 'M0 完成', hash: '#/make', screen: 'M0', kind: 'root', voiceSeed: [V.completeEn, V.receivedJa], seed: [R.waltz13, R.empty], ops: 3, total: 3,
+    texts: ['英語 · 12 / 12 語 · 録音済み', '2 本（受け取った物も直せます）'] },
+  // M1「作る › ルーティン」（今までの S3。D56 Ruling 115-3）: 「＋ 新しいルーティン」1・一覧 1。開いた行は「試聴」・編集・配る・削除（群は 1）。左上「‹ 戻る」（M0 へ）・下タブ無し
+  { name: 'M1 0件', hash: '#/make/routines', screen: 'M1', kind: 'list', ops: 1, total: 1 },
+  { name: 'M1 更新あり', hash: '#/make/routines?ui-state=update-ready', screen: 'M1', kind: 'list', ops: 1, total: 1, alert: true, texts: ['新しい版があります。'], bannerAfter: 'h1' },
   // 段5（Ruling 86-4）: 鳴らせる行には「配る」が編集と削除の間に（群は 1 つなので 3 のまま）
-  { name: 'S3 2本・1本開', hash: '#/routines', screen: 'S3', kind: 'root', seed: [R.waltz13, R.empty], steps: [{ click: '.dc-row-head >> nth=0' }], total: 3,
-    actions: { group: 'routine-actions', labels: ['再生', '編集', '配る', '削除'] } },
-  { name: 'S3 削除の確認', hash: '#/routines?ui-state=confirm-delete', screen: 'S3', kind: 'root', seed: [R.waltz13, R.empty], confirm: true },
+  { name: 'M1 2本・1本開', hash: '#/make/routines', screen: 'M1', kind: 'list', seed: [R.waltz13, R.empty], steps: [{ click: '.dc-row-head >> nth=0' }], total: 3,
+    actions: { group: 'routine-actions', labels: ['試聴', '編集', '配る', '削除'] } },
+  { name: 'M1 削除の確認', hash: '#/make/routines?ui-state=confirm-delete', screen: 'M1', kind: 'list', seed: [R.waltz13, R.empty], confirm: true },
   // 段7 最終レビュー m2（Ruling 30 の枠は 1 つ）: 新しい版があっても、消せなかった知らせが出ている間は更新の帯を出さない
-  { name: 'S3 更新あり・消せなかった', hash: '#/routines?ui-state=update-ready', screen: 'S3', kind: 'root', seed: [R.waltz13, R.empty], failDeletes: true, alert: true,
+  { name: 'M1 更新あり・消せなかった', hash: '#/make/routines?ui-state=update-ready', screen: 'M1', kind: 'list', seed: [R.waltz13, R.empty], failDeletes: true, alert: true,
     steps: [{ click: '.dc-row-head >> nth=0' }, { click: '[data-group="routine-actions"] button >> nth=3' }, { click: 'dialog[open] .dc-primary' }, { wait: '[data-alert="save-failed"]' }],
     absent: ['[data-alert="update"]'] },
   { name: 'S4 新規・種目選択', hash: '#/routines/new', screen: 'S4', kind: 'focus', ops: 1, total: 1 },
@@ -143,39 +168,40 @@ const STATES = [
   // 段8（Ruling 98）: 言語・声・「困った時は」の束（追加の方法・音が鳴らない時）・「先生の方へ」の束（録音・配る）・「プライバシー・アプリについて」＝5（上限ちょうど）。
   // ops は固定しない（「S1 案内カード」と同じ扱い）: 1280×900 は 5 つとも初期表示・375×667 は「プライバシー・アプリについて」が下で 4・
   // 375×548 は「先生の方へ」も下で 3（opsSmall）。生徒が使う 言語・声・「困った時は」の 2 行は 548 でも初期表示に入る（firstView）
-  { name: 'S6', hash: '#/settings', screen: 'S6', kind: 'root', opsSmall: 3, total: 5,
+  { name: 'S6', hash: '#/settings', screen: 'S6', kind: 'list', opsSmall: 3, total: 5,
     linkGroups: { help: ['ホーム画面に追加する方法', '音が鳴らない時'], teacher: ['自分の声を録音する', 'ルーティンを配る'] },
     textKeys: ['settingsHelpHeading', 'forTeachers', 'settingsAbout'],
     firstView: ['[data-group="language"]', 'a[href="#/voices"]', 'a[href="#/help/install"]', 'a[href="#/help/sound"]'] },
   // Fable 答え 2: 生徒が使う 3 つ（言語・声・「ホーム画面に追加する方法」）は帯があっても 375×548 の初期表示に入る
   // 段8: 帯があると 375×548 では「音が鳴らない時」の行も下（S11 は S2/S5 の枠からも行ける）。言語・声・「ホーム画面に追加する方法」は入ったまま（Ruling 98-1）
-  { name: 'S6 更新あり', hash: '#/settings?ui-state=update-ready', screen: 'S6', kind: 'root', opsSmall: 3, total: 5, alert: true, texts: ['新しい版があります。'], bannerAfter: 'h1',
+  { name: 'S6 更新あり', hash: '#/settings?ui-state=update-ready', screen: 'S6', kind: 'list', opsSmall: 3, total: 5, alert: true, texts: ['新しい版があります。'], bannerAfter: 'h1',
     firstView: ['[data-group="language"]', 'a[href="#/voices"]', 'a[href="#/help/install"]'] },
   // 段4（Ruling 60・63）＋段5（Ruling 86-1）: S7 は 一覧 1＋「ファイルから受け取る」1＋「自分の声を録音する」1。行を開くと voice-actions が足される。
-  { name: 'S7 標準だけ', hash: '#/voices', screen: 'S7', kind: 'list', ops: 3, total: 3, voiceRows: ['標準の声（英語）'] },
-  // 段8 Task 6 fix 1（レビュー I-1・Ruling 102-2）: S7 は読み込み中の形を通る。S6「声」・S1「先生の声で練習」から入っても、フォーカスは見出し（main に落ちない）
-  { name: 'S7（設定から）', hash: '#/voices', via: { hash: '#/settings', screen: 'S6' }, screen: 'S7', kind: 'list', ops: 3, total: 3, focusHeading: true,
+  { name: 'S7 標準だけ', hash: '#/voices', screen: 'S7', kind: 'focus', ops: 3, total: 3, voiceRows: ['標準の声（英語）'] },
+  // 段8 Task 6 fix 1（レビュー I-1・Ruling 102-2）: S7 は読み込み中の形を通る。S6「声」・S2 の声チップから入っても、フォーカスは見出し（main に落ちない）
+  { name: 'S7（設定から）', hash: '#/voices', via: { hash: '#/settings', screen: 'S6' }, screen: 'S7', kind: 'focus', ops: 3, total: 3, focusHeading: true,
     steps: [{ click: 'a[href="#/voices"]' }, { wait: '[data-screen="S7"]:not([data-loading])' }] },
-  { name: 'S7（ホームから）', hash: '#/voices', via: { hash: '#/', screen: 'S1' }, screen: 'S7', kind: 'list', ops: 3, total: 3, focusHeading: true,
-    steps: [{ click: 'a[data-teacher-card]' }, { wait: '[data-screen="S7"]:not([data-loading])' }] },
-  { name: 'S7 更新あり', hash: '#/voices?ui-state=update-ready', screen: 'S7', kind: 'list', ops: 3, total: 3, alert: true, texts: ['新しい版があります。'], bannerAfter: 'h1' },
+  // D56: S7 への入口は S2／S5 の声チップ（S1 の先生カードは無くなった。Ruling 115-5）
+  { name: 'S7（再生画面から）', hash: '#/voices', via: { hash: '#/practice/waltz', screen: 'S2' }, screen: 'S7', kind: 'focus', ops: 3, total: 3, focusHeading: true,
+    steps: [{ click: 'a.dc-chip-row' }, { wait: '[data-screen="S7"]:not([data-loading])' }] },
+  { name: 'S7 更新あり', hash: '#/voices?ui-state=update-ready', screen: 'S7', kind: 'focus', ops: 3, total: 3, alert: true, texts: ['新しい版があります。'], bannerAfter: 'h1' },
   // 段8（Ruling 103-2）: 声が多い生徒（受け取った 20＋自分の声 2＝標準と合わせて 23 行）。一覧は data-choices-max=24 まで。下の 2 つのボタンはスクロールで届く（初期表示は固定しない）
-  { name: 'S7 声が多い（受け取った 20 本）', hash: '#/voices', screen: 'S7', kind: 'list', voiceSeed: [V.completeEn, V.partialJa, ...V.received20], total: 3, rows: 23 },
+  { name: 'S7 声が多い（受け取った 20 本）', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, ...V.received20], total: 3, rows: 23 },
   // 段8（Ruling 100-3）: 試聴で声が読めなかった時の枠（更新の帯はその間は出ない＝枠は 1 つ）
-  { name: 'S7 声が端末に無い', hash: '#/voices?ui-state=voice-missing', screen: 'S7', kind: 'list', ops: 3, total: 3, alert: true,
+  { name: 'S7 声が端末に無い', hash: '#/voices?ui-state=voice-missing', screen: 'S7', kind: 'focus', ops: 3, total: 3, alert: true,
     texts: ['この声はまだ端末に入っていません。'] },
   // 段5 Task 10b: 600px 未満の高さでは「ファイルから受け取る」「自分の声を録音する」を横 1 行に並べ、声が 3 本でも 375×548 の初期表示に入る
-  { name: 'S7 3 本', hash: '#/voices', screen: 'S7', kind: 'list', voiceSeed: [V.completeEn, V.partialJa, V.receivedJa], total: 3,
+  { name: 'S7 3 本', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, V.receivedJa], total: 3,
     voiceRows: ['標準の声（英語）', '自分の声（英語）', '山田さんの声', '自分の声（日本語） · 7 / 12 語'], firstView: ['.dc-receive-link', '.dc-record-link'] },
-  { name: 'S7 行を開', hash: '#/voices', screen: 'S7', kind: 'list', voiceSeed: [V.completeEn, V.partialJa, V.receivedJa], total: 4,
+  { name: 'S7 行を開', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, V.receivedJa], total: 4,
     actions: { group: 'voice-actions', labels: ['配る', '削除'] },
     steps: [{ click: '[data-group="voice"] [role="radio"] >> nth=1' }, { click: '[data-group="voice"] [role="radio"] >> nth=1' }] },
   // D37: 受け取った声は配れない（開いた行は「削除」だけ）
-  { name: 'S7 受け取った声を開', hash: '#/voices', screen: 'S7', kind: 'list', voiceSeed: [V.completeEn, V.partialJa, V.receivedJa], total: 4,
+  { name: 'S7 受け取った声を開', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, V.receivedJa], total: 4,
     actions: { group: 'voice-actions', labels: ['削除'] },
     steps: [{ click: '[data-group="voice"] [role="radio"] >> nth=2' }, { click: '[data-group="voice"] [role="radio"] >> nth=2' }] },
-  { name: 'S7 削除の確認', hash: '#/voices?ui-state=confirm-delete', screen: 'S7', kind: 'list', voiceSeed: [V.completeEn], confirm: true },
-  { name: 'S7 更新あり・消せなかった', hash: '#/voices?ui-state=update-ready', screen: 'S7', kind: 'list', voiceSeed: [V.completeEn], failDeletes: true, alert: true,
+  { name: 'S7 削除の確認', hash: '#/voices?ui-state=confirm-delete', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn], confirm: true },
+  { name: 'S7 更新あり・消せなかった', hash: '#/voices?ui-state=update-ready', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn], failDeletes: true, alert: true,
     steps: [{ click: '[data-group="voice"] [role="radio"] >> nth=1' }, { click: '[data-group="voice"] [role="radio"] >> nth=1' },
       { click: '[data-group="voice-actions"] button >> nth=-1' }, { click: 'dialog[open] .dc-primary' }, { wait: '[data-alert="save-failed"]' }],
     absent: ['[data-alert="update"]'] },
@@ -279,30 +305,31 @@ const STATES = [
   { name: 'S11（設定から）', hash: '#/help/sound', via: { hash: '#/settings', screen: 'S6' }, screen: 'S11', kind: 'focus', focusHeading: true,
     steps: [{ click: 'a[href="#/help/sound"]' }, { wait: '[data-screen="S11"]' }] },
   // 段8 S13（Ruling 99-3）: 主要操作は mailto と「データを全て消す」の 2（375 幅の初期表示は文が長いので固定しない）。確認ダイアログは見た目だけ（消さない）
-  { name: 'S13', hash: '#/about', screen: 'S13', kind: 'list', total: 2,
+  { name: 'S13', hash: '#/about', screen: 'S13', kind: 'focus', total: 2,
     textKeys: ['aboutOperator', 'aboutNotOfficial', 'deleteAllData'], texts: ['info@kugainc.com'],
     firstView: ['.dc-about-contact'] },
-  { name: 'S13 全て消す確認', hash: '#/about?ui-state=confirm-delete-all', screen: 'S13', kind: 'list', confirm: true,
+  { name: 'S13 全て消す確認', hash: '#/about?ui-state=confirm-delete-all', screen: 'S13', kind: 'focus', confirm: true,
     texts: ['このアプリのデータを全て消しますか？', '録音した声・受け取った声・ルーティン・設定が消えます。'] },
   // 消せなかった（IndexedDB の clear が投げる）: 実経路で「データを全て消す」→「消す」→ 枠（ボタン無し）。S13 のまま
-  { name: 'S13 消せなかった', hash: '#/about', screen: 'S13', kind: 'list', failClears: true, alert: true, total: 2,
+  { name: 'S13 消せなかった', hash: '#/about', screen: 'S13', kind: 'focus', failClears: true, alert: true, total: 2,
     steps: [{ click: '.dc-about-delete' }, { click: 'dialog[open] .dc-primary' }, { wait: '[data-alert="clear-failed"]' }],
     texts: ['消せませんでした。ブラウザの設定からサイトのデータを消すこともできます。'] },
   // 段7 S12（Ruling 92・95-3）: 端末ごとに 1 通りだけ。iPhone の Safari は手順 4 行（iOS 26.3 の実物どおり）と「引き継がれません」の 1 行（D43）
-  { name: 'S12 iPhone Safari', hash: '#/help/install', screen: 'S12', kind: 'list', userAgent: IOS_SAFARI_UA, ops: 0, total: 0,
+  { name: 'S12 iPhone Safari', hash: '#/help/install', screen: 'S12', kind: 'focus', userAgent: IOS_SAFARI_UA, ops: 0, total: 0,
     texts: ['画面の下の「…」を押します。', '「共有」を押します。', '「もっと見る」を押し、「ホーム画面に追加」を押します。', '右上の「追加」を押します。',
       '録音した声・受け取った声・ルーティンは、追加したアプリには引き継がれません。'], textKeys: ['installNotCarried'],
     firstView: ['.dc-install-steps li:last-child', '.dc-install-note'] },
-  { name: 'S12 iPhone 他ブラウザ', hash: '#/help/install', screen: 'S12', kind: 'list', userAgent: IOS_CHROME_UA, ops: 1, total: 1,
+  { name: 'S12 iPhone 他ブラウザ', hash: '#/help/install', screen: 'S12', kind: 'focus', userAgent: IOS_CHROME_UA, ops: 1, total: 1,
     texts: ['Safari で開くと、ホーム画面に追加できます。', 'アドレスをコピー'] },
-  { name: 'S12 Android', hash: '#/help/install', screen: 'S12', kind: 'list', userAgent: ANDROID_UA, installPrompt: true, ops: 1, total: 1, firstView: ['.dc-install .dc-primary'] },
-  { name: 'S12 Android ボタンなし', hash: '#/help/install', screen: 'S12', kind: 'list', userAgent: ANDROID_UA, ops: 0, total: 0, texts: ['右上の「⋮」を押します。', '「インストール」を押します。'] },
-  { name: 'S12 PC', hash: '#/help/install', screen: 'S12', kind: 'list', ops: 1, total: 1, texts: ['iPhone や Android で開くと、ホーム画面に追加できます。'] },
+  { name: 'S12 Android', hash: '#/help/install', screen: 'S12', kind: 'focus', userAgent: ANDROID_UA, installPrompt: true, ops: 1, total: 1, firstView: ['.dc-install .dc-primary'] },
+  { name: 'S12 Android ボタンなし', hash: '#/help/install', screen: 'S12', kind: 'focus', userAgent: ANDROID_UA, ops: 0, total: 0, texts: ['右上の「⋮」を押します。', '「インストール」を押します。'] },
+  { name: 'S12 PC', hash: '#/help/install', screen: 'S12', kind: 'focus', ops: 1, total: 1, texts: ['iPhone や Android で開くと、ホーム画面に追加できます。'] },
   // ホーム画面のアプリでは S6 の行から入る（S12 のアドレスで起動すると練習へ置き換える。段7 fix 1・レビュー I2 ＝下の状態）
-  { name: 'S12 追加済み', hash: '#/help/install', via: { hash: '#/settings', screen: 'S6' }, screen: 'S12', kind: 'list', userAgent: IOS_SAFARI_UA, standalone: true, ops: 0, total: 0,
+  { name: 'S12 追加済み', hash: '#/help/install', via: { hash: '#/settings', screen: 'S6' }, screen: 'S12', kind: 'focus', userAgent: IOS_SAFARI_UA, standalone: true, ops: 0, total: 0,
     steps: [{ click: 'a[href="#/help/install"]' }, { wait: '[data-screen="S12"]' }], focusHeading: true,
     texts: ['このアプリはホーム画面から開いています。追加は済んでいます。'], absent: ['.dc-install-steps'] },
-  { name: 'ホーム画面のアプリを S12 のアドレスで起動', hash: '#/help/install', screen: 'S1', kind: 'root', userAgent: IOS_SAFARI_UA, standalone: true, launchOnly: true, ops: 2, total: 2, teacherAndTiles: true }
+  // D56（Ruling 117-1）: ホーム画面のアプリの起動は表紙（S12 のアドレスで起動しても表紙へ置き換える）
+  { name: 'ホーム画面のアプリを S12 のアドレスで起動', hash: '#/help/install', screen: 'S0', kind: 'cover', userAgent: IOS_SAFARI_UA, standalone: true, launchOnly: true, ops: 3, total: 3 }
 ];
 
 // U9・320 の周で全画面を回る前に入れるルーティン（S4・S5 が開けるように）。199 本の状態（bulkSeed）は入れない（S4 新規が上限で S3 へ置き換わる）
@@ -400,14 +427,17 @@ try {
       // 開いたままの状態（OQ11 の番人）: 別の画面を経ていない・操作していない・確認ダイアログでない
       const firstLoad = !(state.via || state.steps || state.openMore || state.confirm || state.prepare);
       const shown = english ? { ...state, ...JAPANESE_ONLY_CHECKS, texts: undefined } : state;
-      const problems = await page.evaluate(audit, { state: { ...shown, textKeys, firstLoad, steps: undefined, compact, english, narrow: viewport === NARROW_VIEWPORT, afterAction: Boolean(state.openMore || state.steps) }, LIMITS, reducedMotion: reducedMotion === 'reduce' });
+      // D56（Ruling 116-3）: 下タブは「使う」の U1・U2 だけ・「戻る」は表紙 S0 以外の全画面（種別の表は routes.ts の SCREENS が正）
+      const layout = { tabsExpected: showsTabs(state.screen), backExpected: SCREENS[state.screen].kind !== 'cover', kindExpected: SCREENS[state.screen].kind };
+      const landed = state.landsOn && !(await landOn(page, state.landsOn)) ? [`R116 the hash is ${await page.evaluate(() => location.hash)}, expected ${state.landsOn}`] : [];
+      const problems = await page.evaluate(audit, { state: { ...shown, ...layout, textKeys, firstLoad, steps: undefined, compact, english, narrow: viewport === NARROW_VIEWPORT, afterAction: Boolean(state.openMore || state.steps) }, LIMITS, reducedMotion: reducedMotion === 'reduce' });
       // 段8（Ruling 102-1）: axe の違反（規則・重さ・最初の要素）
       if (axe) {
         const { violations: found } = await new AxeBuilder({ page }).withTags(AXE_TAGS).disableRules(AXE_DISABLED_RULES).analyze();
         for (const item of found) problems.push(`AXE ${item.id} (${item.impact}) ${item.nodes.length} × ${item.nodes[0]?.target.join(' ')}`);
       }
       const openFail = state.openMore && opened === 0 ? ['U4 "more" did not open'] : [];
-      report(label, [...openFail, ...problems, ...consoleErrors]);
+      report(label, [...openFail, ...landed, ...problems, ...consoleErrors]);
       await context.close();
     }
   }
@@ -426,6 +456,7 @@ try {
   for (const state of CHECKED.filter(item => !item.launchOnly)) {
     await page.goto(BASE + state.hash);
     await page.waitForSelector(`[data-screen="${state.screen}"]:not([data-loading])`);
+    if (state.landsOn) await landOn(page, state.landsOn);   // 置き換えが済んでから次の状態へ（済む前に次のハッシュへ行くと、遅れた置き換えが上書きする）
     const { scrollWidth, clientWidth, meta } = await page.evaluate(() => ({
       scrollWidth: document.documentElement.scrollWidth,
       clientWidth: document.documentElement.clientWidth,
@@ -449,6 +480,7 @@ try {
   for (const state of CHECKED.filter(item => !item.launchOnly)) {
     await narrowPage.goto(BASE + state.hash);
     await narrowPage.waitForSelector(`[data-screen="${state.screen}"]:not([data-loading])`);
+    if (state.landsOn) await landOn(narrowPage, state.landsOn);
     const { scrollWidth, clientWidth } = await narrowPage.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
     if (scrollWidth > clientWidth) narrowProblems.push(`320 ${state.name}: horizontal scroll ${scrollWidth} > ${clientWidth}`);
   }
@@ -465,11 +497,11 @@ try {
       // 前回カード（最も長い名前のヴィエニーズワルツを前回にする）の種目名と「続きから」も同じ目で見る（修正便の追加裁定）
       await tilePage.goto(BASE + '#/practice/vwaltz');
       await tilePage.waitForSelector('[data-screen="S2"]:not([data-loading])');
-      for (const hash of ['#/', '#/routines/new']) {
+      for (const hash of ['#/use', '#/routines/new']) {
         await tilePage.goto(BASE + hash);
         await tilePage.waitForSelector('[data-screen]:not([data-loading]) .dc-tile b');
         await tilePage.evaluate(() => document.fonts.ready);
-        if (hash === '#/' && !(await tilePage.locator('[data-resume]').count())) tileProblems.push('I1 #/ the last-session card is not shown');
+        if (hash === '#/use' && !(await tilePage.locator('[data-resume]').count())) tileProblems.push('I1 #/use the last-session card is not shown');
         tileProblems.push(...(await tilePage.evaluate(tileNameBreaks)).map(problem => `I1 ${hash} ${problem}`));
       }
       report(`種目名の折れ ${viewport.width}x${viewport.height} ${locale}`, tileProblems);
@@ -482,6 +514,11 @@ try {
 
 process.exit(violations ? 1 : 0);
 
+// D56（Ruling 116-1）: 古い経路の置き換え（replaceRoute）がハッシュに届くのを待つ。届いたら true
+async function landOn(page, hash) {
+  return page.waitForFunction(expected => location.hash.startsWith(expected), hash, { timeout: 5000 }).then(() => true, () => false);
+}
+
 // 段7: 設定（settings ストアの 'app'）を書く。ブラウザの中で動く（page.evaluate に渡す）。アプリが版上げした DB に書く
 async function seedSettingsInPage(settings) {
   const db = await new Promise((resolve, reject) => {
@@ -730,6 +767,8 @@ function audit({ state, LIMITS, reducedMotion }) {
     let reported = false;
     while (texts.nextNode()) {
       if (!texts.currentNode.textContent.trim()) continue;
+      // [data-ellipsis]（2 行で「…」に切る名前）と、表紙の扉の説明 [data-description]（扉の名前ではなく説明。下の R115 が行数を見る）は数えない
+      if (texts.currentNode.parentElement?.closest('[data-ellipsis], [data-description]')) continue;
       const range = document.createRange();
       range.selectNodeContents(texts.currentNode);
       const lines = new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top))).size;
@@ -810,15 +849,16 @@ function audit({ state, LIMITS, reducedMotion }) {
   // 段8（Ruling 101）: 起動の殻は最初の画面を描いたら消えている
   if (document.querySelector('.dc-boot')) issues.push('R101 the boot shell is still on the page');
 
-  // U11 下タブと戻る（種別の表と照合）
+  // U11 下タブと戻る（D56・Ruling 116-3: 下タブは U1・U2 だけ、戻るは表紙 S0 以外のすべて。種別の表 routes.ts と照合）
   const nav = document.querySelector('[data-nav]');
   const back = document.querySelector('[data-back]');
   const navVisible = Boolean(nav && visible(nav));
   const backVisible = Boolean(back && visible(back));
-  if (state.kind === 'focus' && navVisible) issues.push('U11 tabs are visible on a focus screen');
-  if (state.kind !== 'focus' && !navVisible) issues.push('U11 tabs are missing on a root/list screen');
-  if (state.kind === 'root' && backVisible) issues.push('U11 back button on a root screen');
-  if (state.kind !== 'root') {
+  if (state.kind !== state.kindExpected) issues.push(`U11 the state says kind "${state.kind}", routes.ts says "${state.kindExpected}"`);
+  if (!state.tabsExpected && navVisible) issues.push('U11 tabs are visible on a screen without tabs');
+  if (state.tabsExpected && !navVisible) issues.push('U11 tabs are missing on a "Use" root screen');
+  if (!state.backExpected && backVisible) issues.push('U11 back button on the cover');
+  if (state.backExpected) {
     if (!backVisible) issues.push('U11 back button missing');
     else {
       const rect = back.getBoundingClientRect();
@@ -827,10 +867,8 @@ function audit({ state, LIMITS, reducedMotion }) {
     }
   }
 
-  // U12 S1: 先生カードと10種目が初期表示に入る（Ruling 16）
-  if (state.teacherAndTiles) {
-    const teacher = document.querySelector('[data-teacher-card]');
-    if (!teacher || !fullyInView(teacher)) issues.push('U12 teacher card is not fully in the first view');
+  // U12 S1（U1）: 10種目が初期表示に入る（Ruling 16・D56 Ruling 118-3 の tilesInView）
+  if (state.tilesInView) {
     const tiles = [...document.querySelectorAll('[data-group="dance"] > *')];
     if (tiles.length !== 10) issues.push(`U12 expected 10 dance tiles, found ${tiles.length}`);
     tiles.forEach((tile, index) => { if (!fullyInView(tile)) issues.push(`U12 dance tile ${index + 1} is not fully in the first view (bottom ${Math.round(tile.getBoundingClientRect().bottom)} > ${Math.round(usableBottom)})`); });
@@ -974,6 +1012,21 @@ function audit({ state, LIMITS, reducedMotion }) {
     }
     if (form?.querySelector('.dc-primary')?.disabled) issues.push('D52 "Add" is not pressable after the counts were filled in');
   }
+  // D56（Ruling 115-1・115-3）: 表紙の扉の説明・M0 の行の状態の 1 行は 4 行まで（320 幅の日本語で 4 行。名前「使う」「作る」・行の名前は U10 の 2 行の規則のまま）
+  for (const description of document.querySelectorAll('[data-description]')) {
+    if (!visible(description)) continue;
+    const lines = Math.round(description.getBoundingClientRect().height / parseFloat(getComputedStyle(description).lineHeight));
+    if (lines > 4) issues.push(`R115 a door description is ${lines} lines > 4 ${describe(description)}`);
+  }
+  // D56（Ruling 115-2）: U2 の行は鳴らせる行だけがボタン（右端に「▶ 再生」の札）。鳴らせない行はボタンでなく、注意の 1 行を持つ
+  if (state.playRows) {
+    const play = [...document.querySelectorAll('[data-list] button.dc-row--play')].filter(visible);
+    const off = [...document.querySelectorAll('[data-list] [data-row-off]')].filter(visible);
+    if (play.length !== state.playRows.play) issues.push(`R115 ${play.length} playable rows, expected ${state.playRows.play}`);
+    if (off.length !== state.playRows.off) issues.push(`R115 ${off.length} rows that cannot play, expected ${state.playRows.off}`);
+    if (play.some(row => !row.querySelector('.dc-play-tag'))) issues.push('R115 a playable row has no "Play" tag');
+    if (off.some(row => row.matches('button, a') || row.querySelector('button, a') || !row.querySelector('.dc-row-warn'))) issues.push('R115 a row that cannot play is pressable or has no note');
+  }
   // Ruling 52・D16: 行の注意は 2 つで、依頼（「してください」）はちょうど 1 つ（Ruling 7 の機械判定）。全体の注意は一覧の下に 1 つ
   if (state.barNote) {
     const notes = [...document.querySelectorAll('.dc-row-note')].filter(visible);
diff --git a/tools/smoke-app-shell.js b/tools/smoke-app-shell.js
index 7615609..f97437b 100644
--- a/tools/smoke-app-shell.js
+++ b/tools/smoke-app-shell.js
@@ -1,4 +1,4 @@
-// 段1の器の目視前チェック: 新アプリ（下タブ3つ・S1/S3/S6・言語）と legacy/ の旧画面（標準音声の読み込み）を
+// 段1の器の目視前チェック: 新アプリ（D56: 表紙 S0・下タブ 2 つの U1/U2・S6・言語）と legacy/ の旧画面（標準音声の読み込み）を
 // 375×667 と 1280×900 で開き、スクリーンショットを保存する。console error・pageerror があれば終了コード1。
 // 前提: `npm run dev`（5173）と `npm run legacy`（4173）を別ターミナルで起動しておく。
 // 保存先は DC_SHOT_DIR（既定 output/playwright）。ファイル名は ${DC_SHOT_PREFIX:-stage1}-*.png。
@@ -24,18 +24,23 @@ const expectEqual = (label, actual, expected) => {
 
 try {
   for (const [width, height] of [[375, 667], [1280, 900]]) {
-    for (const [locale, tabs, heading] of [
-      ['ja-JP', ['練習', 'ルーティン', '設定'], '種目を選んでください'],
-      ['en-US', ['Practice', 'Routines', 'Settings'], 'Choose a dance']
+    for (const [locale, tabs, heading, door] of [
+      ['ja-JP', ['フィガー', 'ルーティン'], '種目を選んでください', '使う'],
+      ['en-US', ['Figures', 'Routines'], 'Choose a dance', 'Use']
     ]) {
       const label = `${width} ${locale}`;
       const context = await browser.newContext({ viewport: { width, height }, locale });
       const page = await context.newPage();
       watch(page, label);
+      // D56: 起動は表紙 S0（下タブ無し）→「使う」→ U1（下タブ 2 つ・見出し h1）
       await page.goto(APP_URL);
+      await page.waitForSelector('[data-screen="S0"]');
+      expectEqual(`${label} no tabs on the cover`, await page.locator('[data-nav]').count(), 0);
+      await page.screenshot({ path: path.join(outDir, `${prefix}-s0-${width}-${locale}.png`), fullPage: true });
+      await page.locator('[data-door="use"]').click();
       await page.waitForSelector('[data-screen="S1"]');
       expectEqual(`${label} tabs`, await page.locator('[data-nav] a').allTextContents(), tabs);
-      expectEqual(`${label} S1 heading`, await page.locator('[data-screen="S1"] h2').textContent(), heading);
+      expectEqual(`${label} S1 heading`, await page.locator('[data-screen="S1"] h1').textContent(), heading);
       expectEqual(`${label} active tab aria-current`, await page.locator('[data-nav] a[aria-current="page"]').allTextContents(), [tabs[0]]);
       for (const [index, tabLink] of (await page.locator('[data-nav] a').all()).entries()) {
         const box = await tabLink.boundingBox();
@@ -43,16 +48,17 @@ try {
       }
       await page.screenshot({ path: path.join(outDir, `${prefix}-s1-${width}-${locale}.png`), fullPage: true });
       await page.locator('[data-nav] a').nth(1).click();
-      await page.waitForSelector('[data-screen="S3"]');
-      await page.locator('[data-nav] a').nth(2).click();
+      await page.waitForSelector('[data-screen="U2"]');
+      await page.goto(`${APP_URL}#/settings`);
       await page.waitForSelector('[data-screen="S6"]');
       await page.screenshot({ path: path.join(outDir, `${prefix}-s6-${width}-${locale}.png`), fullPage: true });
       await page.goBack();
-      await page.waitForSelector('[data-screen="S3"]');
+      await page.waitForSelector('[data-screen="U2"]');
       await page.goto(`${APP_URL}#/nope/nope`);
-      await page.waitForSelector('[data-screen="S1"]');
+      await page.waitForSelector('[data-screen="S0"]');
+      expectEqual(`${label} cover door`, (await page.locator('[data-door="use"] b').textContent())?.trim(), door);
       await page.locator('[data-utility]').click();
-      expectEqual(`${label} language toggled`, await page.locator('[data-nav] a').first().textContent(), locale === 'ja-JP' ? 'Practice' : '練習');
+      expectEqual(`${label} language toggled`, (await page.locator('[data-door="use"] b').textContent())?.trim(), locale === 'ja-JP' ? 'Use' : '使う');
       await context.close();
     }
   }
diff --git a/tools/smoke-practice.js b/tools/smoke-practice.js
index 8e2a2be..8845ae1 100644
--- a/tools/smoke-practice.js
+++ b/tools/smoke-practice.js
@@ -1,6 +1,6 @@
 #!/usr/bin/env node
 // 段2の完了条件 G1・G2（仕様 §1）と「戻る」（Ruling 17）を本物の Chrome で確かめる。
-// G1: 初回は 種目タイル → ▶ の2タップで鳴る。G2: 2回目以降は「前回」カードの1タップで鳴る。
+// G1: 初回は 表紙の「使う」→ 種目タイル → ▶ の3タップで鳴る（D56・Ruling 118-5）。G2: 2回目以降は表紙の「続きから」・U1 の「前回」カードの1タップで鳴る。
 // 「鳴っている」の判定: 2秒判定の警告が出ず、大きなカウント表示が音声の時計に沿って3種類以上変わる
 // （表示はエンジンの frame が AudioContext.currentTime から作るので、時計が止まっていれば変わらない）。
 // 前提: `npm run dev`（既定 http://localhost:5173/）。DC_BASE_URL で変更可。失敗があれば終了コード1。
@@ -31,13 +31,16 @@ try {
   page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
   page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
 
-  // G1: 新しい端末（保存なし）。前回カードは出ない → タイル → ▶ の2タップ。
+  // G1: 新しい端末（保存なし）。表紙にも U1 にも前回は出ない → 「使う」→ タイル → ▶ の3タップ。
   await page.goto(BASE);
+  await page.waitForSelector('[data-screen="S0"]');
+  if (await page.locator('[data-resume]').count()) errors.push('G1: resume shown on the cover on first visit');
+  await page.locator('[data-door="use"]').click(); // 1
   await page.waitForSelector('[data-screen="S1"]');
   if (await page.locator('[data-resume]').count()) errors.push('G1: resume card shown on first visit');
-  await page.locator('[data-group="dance"] a').first().click(); // 1
+  await page.locator('[data-group="dance"] a').first().click(); // 2
   await page.waitForSelector('[data-screen="S2"]');
-  await page.locator('[data-play]').click(); // 2
+  await page.locator('[data-play]').click(); // 3
   await expectSounding(page, 'G1');
 
   // 戻る（履歴あり）: S1 へ戻り、前回カードが出る。
@@ -52,14 +55,36 @@ try {
   await page.waitForSelector('[data-screen="S2"]');
   await expectSounding(page, 'G2');
 
-  // 再読み込みした S2 は勝手に鳴らない（Ruling 32）。戻るは履歴が無いので親（S1）へ置き換え。
+  // G2（表紙・D56 Ruling 115-1 の C 案）: 起動（#/）の表紙で「前回の練習 ▶ 続きから」の1タップで鳴る。戻るは履歴で表紙へ。
+  await page.goto(BASE);
+  await page.waitForSelector('[data-screen="S0"] [data-resume]');
+  await page.locator('[data-resume]').click(); // 1
+  await page.waitForSelector('[data-screen="S2"]');
+  await expectSounding(page, 'G2 from the cover');
+  await page.locator('[data-back]').click();
+  await page.waitForSelector('[data-screen="S0"]');
+
+  // 下タブの切替は履歴を積まない（D56）: 表紙 → 使う → ルーティン（タブ）→「‹ 表紙」で表紙に着く（U1 に戻らない）
+  await page.locator('[data-door="use"]').click();
+  await page.waitForSelector('[data-screen="S1"]');
+  await page.locator('[data-nav] a').nth(1).click();
+  await page.waitForSelector('[data-screen="U2"]');
+  await page.locator('[data-back]').click();
+  await page.waitForSelector('[data-screen="S0"]');
+  await page.goto(`${BASE}#/practice/waltz`);
+  await page.waitForSelector('[data-screen="S2"]');
+
+  // 再読み込みした S2 は勝手に鳴らない（Ruling 32）。戻るは履歴が無いので親（U1）へ置き換え、U1 の「‹ 表紙」も親（表紙）へ置き換え。
   await page.reload();
   await page.waitForSelector('[data-screen="S2"]');
   await page.waitForTimeout(1500);
   if ((await page.locator('[data-screen="S2"]').getAttribute('data-playing')) !== 'false') errors.push('reload of S2 started playing by itself');
   await page.locator('[data-back]').click();
   await page.waitForSelector('[data-screen="S1"]');
-  if (!page.url().endsWith('#/')) errors.push(`back without history should replace with #/ (url ${page.url()})`);
+  if (!page.url().endsWith('#/use')) errors.push(`back without history should replace with #/use (url ${page.url()})`);
+  await page.locator('[data-back]').click();
+  await page.waitForSelector('[data-screen="S0"]');
+  if (!page.url().endsWith('#/')) errors.push(`"‹ Cover" without history should replace with #/ (url ${page.url()})`);
   await context.close();
 } finally {
   await browser.close();
@@ -69,4 +94,4 @@ if (errors.length) {
   console.error(errors.join('\n'));
   process.exit(1);
 }
-console.log('practice smoke OK: G1 (2 taps) and G2 (1 tap) play, reload does not autoplay, back falls back to the parent');
+console.log('practice smoke OK: G1 (3 taps from the cover) and G2 (1 tap: the U1 card and the cover) play, tabs do not stack history, reload does not autoplay, back falls back to the parent');
diff --git a/tools/smoke-pwa.js b/tools/smoke-pwa.js
index 66bf2e9..4da1fd1 100644
--- a/tools/smoke-pwa.js
+++ b/tools/smoke-pwa.js
@@ -72,9 +72,9 @@ try {
   page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
   page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
 
-  // 1. 初めて開く: SW が入り、precache が sw.js の一覧と同じ数になる
+  // 1. 初めて開く: SW が入り、precache が sw.js の一覧と同じ数になる（D56: 起動は表紙 S0）
   await page.goto(BASE);
-  await page.waitForSelector('[data-screen="S1"]');
+  await page.waitForSelector('[data-screen="S0"]');
   const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
   if (scope !== BASE) errors.push(`service worker scope ${scope}, expected ${BASE}`);
   const cached = await page.waitForFunction(async expected => {
@@ -84,7 +84,7 @@ try {
   }, precacheUrls.length, { timeout: PRECACHE_TIMEOUT_MS, polling: 200 }).then(() => true, () => false);
   if (!cached) errors.push(`precache did not reach ${precacheUrls.length} entries`);
   await page.reload();   // ここから SW がこのページを受け持つ（clients.claim はしない＝初回は網から読んだまま）
-  await page.waitForSelector('[data-screen="S1"]');
+  await page.waitForSelector('[data-screen="S0"]');
   if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) errors.push('the page is not controlled by the service worker after a reload');
   // アプリの入口（scope の直下・index.html）以外の深いパスには index.html を返さない（段7 レビュー M2）。サーバーの 404 がそのまま見える
   // （別のタブで見る: 404 の「Failed to load resource」をこのタブのコンソールの失敗に数えない）
@@ -95,13 +95,15 @@ try {
   if (!entry?.fromServiceWorker()) errors.push('index.html?… was not answered by the service worker');
   await probe.close();
 
-  // 2. 網を切る（機内モードの代わり）。開き直しても S1 が描け、ワルツとパソドブレが鳴り、網へ出る要求が 0
+  // 2. 網を切る（機内モードの代わり）。開き直しても表紙と S1 が描け、ワルツとパソドブレが鳴り、網へ出る要求が 0
   const failed = [];
   const audio = [];
   page.on('requestfailed', request => failed.push(request.url()));
   page.on('response', response => { if (/\/audio\//.test(response.url())) audio.push({ url: response.url(), sw: response.fromServiceWorker() }); });
   await context.setOffline(true);
   await page.reload();
+  await page.waitForSelector('[data-screen="S0"]');
+  await page.locator('[data-door="use"]').click();
   await page.waitForSelector('[data-screen="S1"]');
   await page.locator('[data-group="dance"] a').first().click();
   await page.waitForSelector('[data-screen="S2"]');
diff --git a/tools/smoke-routines.js b/tools/smoke-routines.js
index f82868b..38bb669 100644
--- a/tools/smoke-routines.js
+++ b/tools/smoke-routines.js
@@ -69,20 +69,21 @@ try {
   page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
   page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
 
-  await page.goto(`${BASE}#/routines`);
-  await page.waitForSelector('[data-screen="S3"]');
-  if (await page.locator('[data-row]').count()) errors.push('S3 should start empty');
+  // D56: 作る側の一覧は M1（#/make/routines）
+  await page.goto(`${BASE}#/make/routines`);
+  await page.waitForSelector('[data-screen="M1"]');
+  if (await page.locator('[data-row]').count()) errors.push('M1 should start empty');
 
-  // 名前だけ打って端末の戻る（iPhone の端からのスワイプも同じ）: 離れる時の保存でハッシュを置き換えず S3 に着く・名前は残る
-  await page.locator('[data-screen="S3"] .dc-primary').click();
+  // 名前だけ打って端末の戻る（iPhone の端からのスワイプも同じ）: 離れる時の保存でハッシュを置き換えず M1 に着く・名前は残る
+  await page.locator('[data-screen="M1"] .dc-primary').click();
   await page.locator('[data-group="dance"] button').first().click();
   await page.locator('[data-screen="S4"] .dc-field input').fill('金曜クラス');
   await page.goBack();
-  await page.waitForSelector('[data-screen="S3"]');
-  if (!page.url().endsWith('#/routines')) errors.push(`back after typing a name should land on the list (url ${page.url()})`);
+  await page.waitForSelector('[data-screen="M1"]');
+  if (!page.url().endsWith('#/make/routines')) errors.push(`back after typing a name should land on the list (url ${page.url()})`);
   await page.waitForTimeout(WRITE_SETTLE_MS);
   await page.reload();
-  await page.waitForSelector('[data-screen="S3"] [data-row]');
+  await page.waitForSelector('[data-screen="M1"] [data-row]');
   const typed = await page.locator('[data-row] .dc-row-head').allTextContents();
   if (typed.length !== 1 || !typed[0]?.includes('金曜クラス')) errors.push(`a name typed before going back was not kept: ${JSON.stringify(typed)}`);
   await page.locator('[data-row] .dc-row-head').first().click();
@@ -91,7 +92,7 @@ try {
   await page.waitForSelector('.dc-empty');
 
   // 作る: 新しいルーティン → 種目（ワルツ）→ 0件の下固定「＋ フィガーを追加」
-  await page.locator('[data-screen="S3"] .dc-primary').click();
+  await page.locator('[data-screen="M1"] .dc-primary').click();
   await page.waitForSelector('[data-screen="S4"] [data-group="dance"]');
   await page.locator('[data-group="dance"] button').first().click();
   if (!page.url().endsWith('#/routines/new')) errors.push(`choosing a dance must not save yet (url ${page.url()})`);
@@ -159,10 +160,10 @@ try {
 
   // 戻る → 一覧 → 再読み込みしても残る
   await page.locator('[data-back]').click();
-  await page.waitForSelector('[data-screen="S3"] [data-row]');
+  await page.waitForSelector('[data-screen="M1"] [data-row]');
   await page.waitForTimeout(WRITE_SETTLE_MS);
   await page.reload();
-  await page.waitForSelector('[data-screen="S3"] [data-row]');
+  await page.waitForSelector('[data-screen="M1"] [data-row]');
   const rows = await page.locator('[data-row] .dc-row-head').allTextContents();
   if (rows.length !== 1 || !rows[0]?.includes('3 フィガー')) errors.push(`after reload the list shows ${JSON.stringify(rows)}`);
   await page.locator('[data-row] .dc-row-head').first().click();
@@ -171,9 +172,9 @@ try {
   const firstCounts = (await page.locator('.dc-figure-head small').first().textContent())?.trim();
   if (firstCounts !== '1 2 3 1 2 3') errors.push(`back with a valid open row should commit it (first figure shows "${firstCounts}")`);
   await page.locator('[data-back]').click();
-  await page.waitForSelector('[data-screen="S3"]');
+  await page.waitForSelector('[data-screen="M1"]');
 
-  // 鳴らす: 行を開いて ▶（タブ → 行 → ▶ の3タップ目）→ S5 ですぐ鳴る
+  // 鳴らす（作る側の試聴）: 行を開いて ▶ 試聴 → S5 ですぐ鳴る
   await page.locator('[data-row] .dc-row-head').first().click();
   await page.locator('[data-row-body] .dc-primary').click();
   await page.waitForSelector('[data-screen="S5"]');
@@ -181,18 +182,18 @@ try {
 
   // 消す: 戻る → 行を開いて削除 → 確認の「削除する」→ 0件
   await page.locator('[data-back]').click();
-  await page.waitForSelector('[data-screen="S3"]');
+  await page.waitForSelector('[data-screen="M1"]');
   await page.locator('[data-row] .dc-row-head').first().click();
   await page.locator('[data-row-body] .dc-button--secondary').last().click();
   await page.locator('dialog[open] .dc-primary').click();
   await page.waitForSelector('.dc-empty');
   await page.waitForTimeout(WRITE_SETTLE_MS);
   await page.reload();
-  await page.waitForSelector('[data-screen="S3"]');
+  await page.waitForSelector('[data-screen="M1"]');
   if (await page.locator('[data-row]').count()) errors.push('the deleted routine came back after reload');
 
   // 使える文字はいつも見える（Ruling 50 D14）: 空欄でも「使える文字：1・2・3・&」。12a3 はその行が赤く理由の行は無し。&123 は灰のまま下に理由。
-  await page.locator('[data-screen="S3"] .dc-primary').click();
+  await page.locator('[data-screen="M1"] .dc-primary').click();
   await page.locator('[data-group="dance"] button').first().click();
   await page.locator('.dc-dock .dc-primary').click();
   await addFigure(page, 'ウィスク', '123');
@@ -503,7 +504,7 @@ try {
   await clearPage.waitForSelector('[data-screen="S13"]');
   await clearPage.locator('.dc-about-delete').click();
   await clearPage.locator('dialog[open] .dc-primary').click();
-  await clearPage.waitForFunction(() => location.hash === '#/' && document.querySelector('[data-screen="S1"]'));
+  await clearPage.waitForFunction(() => location.hash === '#/' && document.querySelector('[data-screen="S0"]'));
   const left = await clearPage.evaluate(() => new Promise(resolve => {
     const request = indexedDB.open('dance-count-v2');
     request.onsuccess = () => {
@@ -515,7 +516,7 @@ try {
     };
   }));
   if (Object.values(left).some(count => count !== 0)) errors.push(`Ruling 99-4: data left after "Delete all data" ${JSON.stringify(left)}`);
-  if (await clearPage.locator('[data-resume]').count()) errors.push('Ruling 99-4: S1 still shows "Last time" after "Delete all data"');
+  if (await clearPage.locator('[data-resume]').count()) errors.push('Ruling 99-4: the cover still shows "Last practice" after "Delete all data"');
   await clearContext.close();
 } finally {
   await browser.close();
diff --git a/tools/smoke-share.js b/tools/smoke-share.js
index bda07ed..f867346 100644
--- a/tools/smoke-share.js
+++ b/tools/smoke-share.js
@@ -2,11 +2,11 @@
 // 段5の完了条件（全体地図・Ruling 87-4）を本物の Chrome と本物のファイルで確かめる。2 つのコンテキスト＝2 台の端末（IndexedDB が別）。
 // 先生: 録音の声とルーティンを入れた端末 → S7 で声を開いて「配る」→ S9（声が選ばれている）→ 名前・同意・ルーティン →「ファイルを作る」
 //       （共有できない端末として canShare を false に＝ダウンロード）→ ファイル名・結果の 1 行・「案内文をコピー」→ 名前が次回も入っている。
-// 生徒: 何も無い端末 → S1「先生の声で練習」→ S7「ファイルから受け取る」→ S10「ファイルを選ぶ」に先生のファイル → 確認 →「使う」→「ホームへ」→
-//       ワルツ ▶ が受け取った声で鳴る（標準の声の音声を 1 本も取りに行かない）・チップ「声: 山田さんの声」→ S3「山田さんから」→ S5 で鳴る。
+// 生徒: 何も無い端末 → 表紙「使う」→ 下の「ルーティン」→「ファイルから受け取る」→ S10「ファイルを選ぶ」に先生のファイル → 確認 →「使う」→「ホームへ」（U1）→
+//       ワルツ ▶ が受け取った声で鳴る（標準の声の音声を 1 本も取りに行かない）・チップ「声: 山田さんの声」→ U2「山田さんから」→ 行を押すと S5 で鳴る。
 //       同じファイルをもう一度 → 置き換えの 1 行 → 声もルーティンも増えない。旧画面の単体パック・読めない・新しすぎ・大きすぎ・1 本だけ読めない。
 //       Android の受け口（Cache の inbox）から確認で始まり、受け取ったら消える。受け取った声は「配る」が無く、消すと標準に戻る。
-// ほかの入口（段5 Task 10b）: S8 完成「配る ›」→ S9 はその声が選ばれ 声 → ルーティン の並び。S3 の行の「配る」→ S9 はそのルーティンが選ばれ
+// ほかの入口（段5 Task 10b）: S8 完成「配る ›」→ S9 はその声が選ばれ 声 → ルーティン の並び。M1 の行の「配る」→ S9 はそのルーティンが選ばれ
 //       声は「入れない」・ルーティン → 声 の並び（S8 は偽のマイク＝起動引数。録音の声が完成している端末で「録音をはじめる」→ 完成の画面）。
 // 前提: `npm run dev`（既定 http://localhost:5173/）。DC_BASE_URL で変更可。固定ファイルは `node tools/make-share-fixtures.js` で作って commit 済み。
 import fs from 'node:fs';
@@ -179,22 +179,25 @@ try {
   await e.waitForSelector('[data-group="share-voice"] [role="radio"][aria-checked="true"]');
   const fromS8 = await shareState(e);
   if (fromS8.voice !== '自分の声（英語）' || fromS8.routines.length !== 0 || JSON.stringify(fromS8.order) !== '["voice","routines"]') errors.push(`S9 from S8 "Share": ${JSON.stringify(fromS8)}`);
-  await e.goto(`${BASE}#/routines`);
-  await e.waitForSelector('[data-screen="S3"]');
+  await e.goto(`${BASE}#/make/routines`);
+  await e.waitForSelector('[data-screen="M1"]');
   await e.locator('.dc-row-head', { hasText: 'ワルツの練習' }).click();
   await e.locator('[data-group="routine-actions"] button', { hasText: '配る' }).click();
   await e.waitForSelector('[data-screen="S9"]:not([data-loading])');
-  const fromS3 = await shareState(e);
-  if (fromS3.voice !== '入れない' || JSON.stringify(fromS3.routines) !== '["ワルツの練習"]' || JSON.stringify(fromS3.order) !== '["routines","voice"]') errors.push(`S9 from the S3 row "Share": ${JSON.stringify(fromS3)}`);
+  const fromM1 = await shareState(e);
+  if (fromM1.voice !== '入れない' || JSON.stringify(fromM1.routines) !== '["ワルツの練習"]' || JSON.stringify(fromM1.order) !== '["routines","voice"]') errors.push(`S9 from the M1 row "Share": ${JSON.stringify(fromM1)}`);
   await entry.context.close();
 
   // ---- 生徒（別の端末） ----
   const student = await openPage(browser);
   const s = student.page;
+  // D56（Ruling 115-7・117-4）: 案内文の 2 行目と同じ道（表紙「使う」→ 下の「ルーティン」→「ファイルから受け取る」）
   await s.goto(BASE);
+  await s.waitForSelector('[data-screen="S0"]');
+  await s.locator('[data-door="use"]').click();
   await s.waitForSelector('[data-screen="S1"]');
-  await s.locator('[data-teacher-card]').click();
-  await s.waitForSelector('[data-screen="S7"]:not([data-loading])');
+  await s.locator('[data-nav] a').nth(1).click();
+  await s.waitForSelector('[data-screen="U2"]');
   await s.locator('.dc-receive-link').click();
   await pickFile(s, teacherFile);
   await s.waitForSelector('[data-step="confirm"]');
@@ -205,6 +208,7 @@ try {
   await expectText(s, 'ホームで種目を選んで ▶ を押すと、山田さんの声で鳴ります。', 'S10 done');
   await s.locator('.dc-dock .dc-primary').click();
   await s.waitForSelector('[data-screen="S1"]');
+  if (!s.url().endsWith('#/use')) errors.push(`S10 "Go to Home" should land on U1 (url ${s.url()})`);
   await s.waitForTimeout(WRITE_SETTLE_MS);
 
   // ワルツ ▶ が受け取った声で鳴る: 読み直した S2 で ▶ の間、標準の声の音声は 1 本も要求されない（smoke-voice.js と同じ証明）
@@ -225,13 +229,12 @@ try {
   if (hits.length) errors.push(`S2 with the received voice: standard audio requested (${hits.length})`);
   if (!(await s.evaluate(() => window.__played.length))) errors.push('S2 with the received voice: no voice buffer was played');
 
-  // S3「山田さんから」→ ▶ 再生で S5 が鳴る
-  await s.goto(`${BASE}#/routines`);
-  await s.waitForSelector('[data-screen="S3"]');
+  // U2「山田さんから」→ 行を押すとすぐ S5 で鳴る（D56 Ruling 115-2）
+  await s.goto(`${BASE}#/use/routines`);
+  await s.waitForSelector('[data-screen="U2"]');
   const row = await text(s, '.dc-row-head');
-  if (!row.includes('ワルツの練習') || !row.includes('山田さんから')) errors.push(`S3 row: "${row}"`);
-  await s.locator('.dc-row-head').first().click();
-  await s.locator('[data-group="routine-actions"] .dc-primary').click();
+  if (!row.includes('ワルツの練習') || !row.includes('山田さんから')) errors.push(`U2 row: "${row}"`);
+  await s.locator('.dc-row--play').first().click();
   await s.waitForSelector('[data-screen="S5"]');
   await expectSounding(s, 'S5 received routine');
   await s.locator('[data-play]').click();
@@ -278,7 +281,7 @@ try {
     await cache.put('./inbox/bundle', new Response(text, { headers: { 'Content-Type': 'text/plain', 'X-File-Name': encodeURIComponent('ルーティン-山田-2026-10-12.dancecount.txt') } }));
   }, inboxText);
   await s.goto(`${BASE}#/`);
-  await s.waitForSelector('[data-screen="S1"]');
+  await s.waitForSelector('[data-screen="S0"]');
   await s.goto(`${BASE}#/receive`);
   await s.waitForSelector('[data-step="confirm"]', { timeout: 5000 }).catch(() => errors.push('inbox: S10 did not start on the confirm step'));
   await expectText(s, 'ルーティン 1 本: ワルツのルーティン', 'inbox confirm');
@@ -292,7 +295,7 @@ try {
     await (await caches.open('dance-count-inbox')).put('./inbox/bundle', new Response(text, { headers: { 'Content-Type': 'text/plain', 'X-File-Name': encodeURIComponent('too-new.txt') } }));
   }, tooNewText);
   await s.goto(`${BASE}#/`);
-  await s.waitForSelector('[data-screen="S1"]');
+  await s.waitForSelector('[data-screen="S0"]');
   await s.goto(`${BASE}#/receive`);
   await s.waitForSelector('[data-alert="too-new"]', { timeout: 5000 }).catch(() => errors.push('m1: the shared too-new file did not show "too new"'));
   await Promise.all([s.waitForEvent('load', { timeout: 10000 }).catch(() => errors.push('m1: 「更新する」 did not reload')), s.locator('[data-alert="too-new"] [data-alert-action]').click()]);
@@ -321,4 +324,4 @@ if (errors.length) {
   console.error(errors.join('\n'));
   process.exit(1);
 }
-console.log('share smoke OK: S8 "Share" and the S3 row "Share" open S9 with that voice / routine chosen; teacher file made (download) → student received it → S2 played the received voice, S3/S5 the routine; same file replaced, legacy file received, broken / too new / too large / one broken routine handled, inbox taken once, a too-new shared file survives 「更新する」, received voice not shareable and deleted');
+console.log('share smoke OK: S8 "Share" and the M1 row "Share" open S9 with that voice / routine chosen; teacher file made (download) → student received it → S2 played the received voice, U2/S5 the routine; same file replaced, legacy file received, broken / too new / too large / one broken routine handled, inbox taken once, a too-new shared file survives 「更新する」, received voice not shareable and deleted');
diff --git a/tools/smoke-voice.js b/tools/smoke-voice.js
index 8642dec..395104f 100644
--- a/tools/smoke-voice.js
+++ b/tools/smoke-voice.js
@@ -1,6 +1,6 @@
 #!/usr/bin/env node
 // 段4の完了条件（全体地図・Ruling 63-5）を本物の Chrome と偽マイク（WAV ファイル）で確かめる。
-// S1「先生の声で練習」→ S7「自分の声を録音する」→ S8 英語 →「録音をはじめる」→ 3 語録って「戻る」→ S7 に「· 3 / 12 語」→
+// 表紙「作る」→ M0「自分の声を録音する」→ S8 英語 →「録音をはじめる」→ 3 語録って「戻る」→ M0 に「英語 · 3 / 12 語 · 続きから」→ S7 に「· 3 / 12 語」→
 // 開いて「続きを録音する」→ 4 語目から 12 語目まで（録るたびに波形と「聞く」）→ 完成 → 聞き比べ（自分の声・標準の声が鳴って止まる）→
 // 「完了」→ S7 で選ばれている → S2 ワルツが自分の声で鳴る・チップ「声: 自分の声（英語）」→ 再読み込みでも同じ →
 // くわしくの「早く」×2 で「−20 ms」→ 再読み込みでも残る → S7 で削除 → チップ「声: 標準（英語）」。
@@ -123,11 +123,12 @@ async function wordNumber(page) {
 const browser = await launch('fake-mic.wav');
 try {
   const { page } = await openPage(browser);
+  // D56（Ruling 115-3）: 録音の入口は表紙の「作る」→ M0 の行
   await page.goto(BASE);
-  await page.waitForSelector('[data-screen="S1"]');
-  await page.locator('[data-teacher-card]').click();
-  await page.waitForSelector('[data-screen="S7"]:not([data-loading])');
-  await page.locator('.dc-record-link').click();
+  await page.waitForSelector('[data-screen="S0"]');
+  await page.locator('[data-door="make"]').click();
+  await page.waitForSelector('[data-screen="M0"]:not([data-loading])');
+  await page.locator('a.dc-hub[href="#/voices/record"]').click();
   await page.waitForSelector('[data-step="intro"]');
   if ((await page.locator('[data-group="record-language"] [role="radio"]').first().getAttribute('aria-checked')) !== 'true') errors.push('S8: English is not the first choice');
   await page.locator('.dc-dock .dc-primary').click();
@@ -142,6 +143,10 @@ try {
   }
   await page.waitForTimeout(WRITE_SETTLE_MS);
   await page.locator('[data-back]').click();
+  await page.waitForSelector('[data-screen="M0"]:not([data-loading])');
+  const status = (await page.locator('a.dc-hub[href="#/voices/record"] small').textContent())?.trim();
+  if (status !== '英語 · 3 / 12 語 · 続きから') errors.push(`M0: the recording row reads "${status}"`);
+  await page.goto(`${BASE}#/voices`);
   await page.waitForSelector('[data-screen="S7"]:not([data-loading])');
   const partial = (await page.locator('.dc-voice-partial').textContent())?.replace(/\u00a0/g, ' ').trim(); // 「3 / 12 語」は改行しない空白（U+00A0）でつないである
   if (partial !== '自分の声（英語） · 3 / 12 語') errors.push(`S7: partial row reads "${partial}"`);
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npm test 2>&1 | grep -E "^ℹ (tests|fail)"`
Expected: `tests 657`・**`fail 16`**（経路表・置き換え先・タブ・案内文・更新の帯の画面・`tabFigures`）。

- [ ] **Step 3: 実装する**

`git apply --whitespace=nowarn .superpowers/sdd/role-split/t1-impl.diff`（中身は下のとおり）の後、生成物を作り直す:

<!-- diff: t1-impl -->
```diff
diff --git a/docs/app-v1/stage8-error-matrix.md b/docs/app-v1/stage8-error-matrix.md
index b8b66c3..10fd4d4 100644
--- a/docs/app-v1/stage8-error-matrix.md
+++ b/docs/app-v1/stage8-error-matrix.md
@@ -12,7 +12,7 @@
 | 4 | マイクが使えない（通話中・ほかのアプリ・見つからない） | `micFailed` | S8 説明の画面の枠 `[data-alert="mic-failed"]` | なし（同じ「録音をはじめる」） | `?ui-state=mic-failed`（段8） | ui:check「S8 マイクを使えない」 | 通話中に「録音をはじめる」 |
 | 5 | マイク非対応 | `noRecorder` | S8 の枠 `[data-alert="no-recorder"]` | なし（左上の「‹ 戻る」） | `?ui-state=no-recorder` | ui:check「S8 非対応」 | 古いブラウザ |
 | 6 | 録音が無音・短すぎ | `noVoiceHeard` | S8 語の画面の枠（説明の 1 行と同じ 60px の箱） | なし（同じ「録音する」） | `?ui-state=no-voice` | ui:check「S8 声が入っていない」「S8 録れた語で声が入っていない」・`smoke:voice`（無音・小さすぎの WAV） | — |
-| 7 | 保存失敗・容量不足 | `saveFailed` | 発生した画面の枠 `[data-alert="save-failed"]`: S2・S5（声のタイミング）・S4（ルーティン）・S8（語・完成）・S10 確認・S3／S7（削除） | 「閉じる」（段8・Ruling 103-3。閉じると元の案内に戻る。S8・S10 は枠だけ） | `?ui-state=save-failed`（S2・S4・S5・S8・S10。段8）・IndexedDB の delete が投げる（S3・S7） | ui:check「S2 保存できなかった」「S2 保存できなかった・閉じた」「S4 保存できなかった」「S5 保存できなかった」「S8 保存できなかった」「S10 確認・保存できなかった」「S3 更新あり・消せなかった」「S7 更新あり・消せなかった」 | 本当に空き容量が無い端末 |
+| 7 | 保存失敗・容量不足 | `saveFailed` | 発生した画面の枠 `[data-alert="save-failed"]`: S2・S5（声のタイミング）・S4（ルーティン）・S8（語・完成）・S10 確認・M1／S7（削除。D56 で S3 → M1） | 「閉じる」（段8・Ruling 103-3。閉じると元の案内に戻る。S8・S10 は枠だけ） | `?ui-state=save-failed`（S2・S4・S5・S8・S10。段8）・IndexedDB の delete が投げる（M1・S7） | ui:check「S2 保存できなかった」「S2 保存できなかった・閉じた」「S4 保存できなかった」「S5 保存できなかった」「S8 保存できなかった」「S10 確認・保存できなかった」「M1 更新あり・消せなかった」「S7 更新あり・消せなかった」 | 本当に空き容量が無い端末 |
 | 8 | 壊れたファイル・別の種類 | `fileBroken` | S10 選ぶ画面の枠 `[data-alert="broken"]`（ファイル名つき） | なし（同じ「ファイルを選ぶ」） | 壊れたファイルを選ぶ（`test/fixtures/share/broken.txt`） | ui:check「S10 読めない」・`smoke:share` | LINE から保存したファイル |
 | 9 | 20MB 超 | `fileTooLarge` | S10 選ぶ画面の枠 `[data-alert="too-large"]` | なし（同じ「ファイルを選ぶ」） | 20MB＋1 バイトのファイルを選ぶ・Android の共有で大きすぎ（SW の印） | ui:check「S10 大きすぎ」・`smoke:pwa`（受け口の大きすぎ） | — |
 | 10 | 新しすぎる schemaVersion | `fileTooNew`・`updateApp` | S10 選ぶ画面の枠 `[data-alert="too-new"]` | 「更新する」（再読み込み。選んだファイルは受け口へ戻す） | 新しすぎるファイルを選ぶ（`too-new.txt`） | ui:check「S10 新しすぎ」・`smoke:share` | — |
diff --git a/src/app/App.tsx b/src/app/App.tsx
index 1071c6e..b922792 100644
--- a/src/app/App.tsx
+++ b/src/app/App.tsx
@@ -11,8 +11,10 @@ import { openAppStorage, requestPersistentStorage, type AppStorage } from './pla
 import { resolveScreen } from './router/resolve.ts';
 import { buildHash, showsTabs, tabOf, type ScreenId } from './router/routes.ts';
 import { AboutScreen } from './screens/AboutScreen.tsx';
+import { CoverScreen } from './screens/CoverScreen.tsx';
 import { HomeScreen } from './screens/HomeScreen.tsx';
 import { InstallHelpScreen } from './screens/InstallHelpScreen.tsx';
+import { MakeScreen } from './screens/MakeScreen.tsx';
 import { PracticeScreen } from './screens/PracticeScreen.tsx';
 import { RoutineEditScreen } from './screens/RoutineEditScreen.tsx';
 import { RoutinePlayScreen } from './screens/RoutinePlayScreen.tsx';
@@ -47,9 +49,11 @@ function openStorageWithin(ms: number): Promise<AppStorage | null> {
   });
 }
 
-// 中身だけで描ける画面（引数の要る S2〜S5・S7・S8・S10・S13 は下で個別に描く）。S9 は印（share-intent）・S10 は受け口（inbox）をマウント時に 1 回だけ読む。どの画面を出すかは router/resolve.ts が決める。
+// 中身だけで描ける画面（引数の要る S2・S4・S5・U2・M1・S7・S8・S10・S13 は下で個別に描く）。S9 は印（share-intent）・S10 は受け口（inbox）をマウント時に 1 回だけ読む。どの画面を出すかは router/resolve.ts が決める。
 const SIMPLE_SCREENS: Partial<Record<ScreenId, ComponentType>> = {
+  S0: CoverScreen,
   S1: HomeScreen,
+  M0: MakeScreen,
   S6: SettingsScreen,
   S9: ShareScreen,
   S11: SoundHelpScreen,
@@ -112,7 +116,7 @@ export function App() {
   const i18n = useMemo(() => ({ translator, setLocale: (next: AppLocale) => update({ uiLocale: next }) }), [translator, update]);
   useEffect(() => applyDocumentLanguage(locale, translator.t('documentTitle')), [locale, translator]);
 
-  // 見つからない・鳴らせないルーティンは S3 へ置き換え（Ruling 37・40）。ルーティンを読み終える前は判断しない。
+  // 見つからない・鳴らせないルーティンは一覧（M1／U2）へ置き換え（Ruling 37・40・116）。ルーティンを読み終える前は判断しない。
   // 段8（Ruling 101）: 設定を読み終えて最初の画面を DOM に入れたら、起動の殻を外す（画面を入れる前に外すと白い時間ができる）。
   // useLayoutEffect は DOM に入れた後・ブラウザが描く前に走るので、殻だけ・画面だけの間に白いフレームも、殻と画面が重なるフレームも無い
   useLayoutEffect(() => { if (settings) removeBootShell(); }, [settings !== null]);
@@ -136,16 +140,18 @@ export function App() {
 
   if (!settings) return null;
   const { screen } = resolved;
-  const Simple = SIMPLE_SCREENS[screen] ?? HomeScreen;
+  const Simple = SIMPLE_SCREENS[screen] ?? CoverScreen;
+  const tabs = showsTabs(screen) ? tabOf(screen) : null;
   return (
     <I18nContext.Provider value={i18n}>
       <SettingsContext.Provider value={{ settings, update }}>
         <RoutinesContext.Provider value={routinesValue}>
           <StorageContext.Provider value={storage.current}>
-            <div class="dc-shell" lang={locale} ref={shell}>
+            <div class="dc-shell" lang={locale} ref={shell} data-tabs={tabs ? '' : undefined}>
               <IconSprite />
               {screen === 'S2' ? <PracticeScreen key={route.params.danceId} danceId={route.params.danceId!} uiState={route.query.uiState} />
-                : screen === 'S3' ? <RoutinesScreen uiState={route.query.uiState} />
+                : screen === 'U2' ? <RoutinesScreen key="use" mode="use" uiState={route.query.uiState} />
+                : screen === 'M1' ? <RoutinesScreen key="make" mode="make" uiState={route.query.uiState} />
                 : screen === 'S4' ? <RoutineEditScreen routineId={route.params.routineId} uiState={route.query.uiState} />
                 : screen === 'S5' ? <RoutinePlayScreen key={route.params.routineId} routineId={route.params.routineId!} uiState={route.query.uiState} />
                 : screen === 'S7' ? <VoicesScreen uiState={route.query.uiState} />
@@ -153,7 +159,7 @@ export function App() {
                 : screen === 'S10' ? <ReceiveScreen uiState={route.query.uiState} />
                 : screen === 'S13' ? <AboutScreen uiState={route.query.uiState} />
                 : <Simple />}
-              {showsTabs(screen) && <TabBar current={tabOf(screen)} />}
+              {tabs && <TabBar current={tabs} />}
             </div>
           </StorageContext.Provider>
         </RoutinesContext.Provider>
diff --git a/src/app/components/BackButton.tsx b/src/app/components/BackButton.tsx
index 55cdfcb..4befec8 100644
--- a/src/app/components/BackButton.tsx
+++ b/src/app/components/BackButton.tsx
@@ -1,15 +1,16 @@
-import type { ScreenId } from '../router/routes.ts';
+import { parentScreen, type ScreenId } from '../router/routes.ts';
 import { useI18n } from '../state/i18n.ts';
 import { goBack } from '../state/route.ts';
 import { Icon } from './Icon.tsx';
 
 // 左上の「‹ 戻る」（Ruling 17）。止める処理は各画面のアンマウントで行う（Ruling 32）。
+// D56（Ruling 116-2）: 親が表紙の画面（U1・U2・M0・S6）は「‹ 表紙」。動きは同じ goBack（履歴があれば戻る・無ければ親へ置き換え）
 export function BackButton({ screen }: { screen: ScreenId }) {
   const { translator } = useI18n();
   return (
     <button type="button" class="dc-back" data-back onClick={() => goBack(screen)}>
       <Icon name="chev-l" />
-      <span>{translator.t('back')}</span>
+      <span>{translator.t(parentScreen(screen) === 'S0' ? 'backToCover' : 'back')}</span>
     </button>
   );
 }
diff --git a/src/app/components/TabBar.tsx b/src/app/components/TabBar.tsx
index 03ccd37..1bfa19c 100644
--- a/src/app/components/TabBar.tsx
+++ b/src/app/components/TabBar.tsx
@@ -1,15 +1,18 @@
 import { buildHash, type ScreenId, type TabId } from '../router/routes.ts';
 import { useI18n } from '../state/i18n.ts';
+import { replaceRoute } from '../state/route.ts';
 import type { IconName } from './icon-names.ts';
 import { Icon } from './Icon.tsx';
 
-const TABS: Array<{ id: TabId; screen: ScreenId; icon: IconName; label: 'tabPractice' | 'tabRoutines' | 'tabSettings' }> = [
-  { id: 'practice', screen: 'S1', icon: 'home', label: 'tabPractice' },
-  { id: 'routines', screen: 'S3', icon: 'list', label: 'tabRoutines' },
-  { id: 'settings', screen: 'S6', icon: 'gear', label: 'tabSettings' }
+// D56（Ruling 116-1）: 下タブは「使う」の 2 つ（フィガー＝U1・ルーティン＝U2）だけ。「フィガー」の語は D56 §1 (b)。
+const TABS: Array<{ id: TabId; screen: ScreenId; icon: IconName; label: 'tabFigures' | 'tabRoutines' }> = [
+  { id: 'practice', screen: 'S1', icon: 'home', label: 'tabFigures' },
+  { id: 'routines', screen: 'U2', icon: 'list', label: 'tabRoutines' }
 ];
 
 // 下タブ（仕様 §3・Ruling 17）。アイコン＋文字。1024px 以上は CSS だけで上部に移る（Ruling 21）。
+// タブの切替は履歴を積まない（置き換え）: 「‹ 表紙」（履歴があれば 1 つ戻る）と iPhone の戻るスワイプが、どちらのタブからでも表紙に着く
+// （積むと U1 → U2 の後の「‹ 表紙」が U1 に戻ってしまう。Ruling 116-2 の読み替え＝計画者の発見）。
 export function TabBar({ current }: { current: TabId }) {
   const { translator } = useI18n();
   return (
@@ -20,6 +23,7 @@ export function TabBar({ current }: { current: TabId }) {
           class="dc-tab"
           href={buildHash({ screen: tab.screen, params: {} })}
           aria-current={tab.id === current ? 'page' : undefined}
+          onClick={event => { event.preventDefault(); if (tab.id !== current) replaceRoute({ screen: tab.screen, params: {} }); }}
         >
           <Icon name={tab.icon} />
           <span>{translator.t(tab.label)}</span>
diff --git a/src/app/i18n/messages.ts b/src/app/i18n/messages.ts
index a1422cc..5f872eb 100644
--- a/src/app/i18n/messages.ts
+++ b/src/app/i18n/messages.ts
@@ -6,16 +6,34 @@ export const APP_MESSAGES = {
     appSubtitle: 'for Ballroom',
     documentTitle: 'Dance Count — for Ballroom',
     switchLanguage: '日本語',
-    tabPractice: 'Practice',
+    tabFigures: 'Figures',
     tabRoutines: 'Routines',
-    tabSettings: 'Settings',
     navLabel: 'Main',
     back: 'Back',
+    backToCover: 'Cover',
+    coverUse: 'Use',
+    coverUseSub: "Practice a dance's count · Play your teacher's routines (for students)",
+    coverMake: 'Make',
+    coverMakeSub: 'Record your voice · Make routines · Share with students (for instructors)',
+    coverSettingsSub: 'Language · Help · About',
+    continueLast: 'Last practice',
+    makeIntro: 'For instructors. Use “Share” to turn what you make into a file for your students.',
+    makeRoutines: 'Make and edit routines',
+    makeShare: 'Share (make a file)',
+    makeShareSub: 'Your voice and routines in one file',
+    voiceStatusNone: 'Not recorded yet',
+    voiceStatusPack: '{language} · {count} / {total} words',
+    voiceStatusDone: 'Recorded',
+    routinesCount: '{count} routines (received ones too)',
+    routinesCountOne: '1 routine (received ones too)',
+    routinesNone: 'None yet',
+    editFromMake: 'To edit or delete a routine, go to “Make” on the cover.',
+    cannotPlayEmpty: 'No figures yet. You can fix this in “Make”.',
+    cannotPlayFix: 'Some counts need fixing. You can fix this in “Make”.',
     chooseDance: 'Choose a dance',
     danceGroup: 'Dances',
     lastTime: 'Last time',
     resume: 'Resume',
-    teacherVoice: "Practice with your teacher's voice",
     speed: 'Speed',
     speedSlow: 'Slower',
     speedStandard: 'Standard',
@@ -232,7 +250,7 @@ export const APP_MESSAGES = {
     instructionsVoiceLead: 'You can practice with my voice in Dance Count.',
     instructionsRoutinesLead: 'You can use my routines in Dance Count.',
     instructionsIphone: '[iPhone] 1. Open this file, tap Share (top right) → “Save to Files”',
-    instructionsStep2: '2. Open Dance Count → “Practice with your teacher\'s voice” → “Receive from a file” → “Choose a file”',
+    instructionsStep2: '2. Open Dance Count → “Use” → “Routines” (bottom tab) → “Receive from a file” → “Choose a file”',
     instructionsStep3: '3. Choose this file from “Recents” and tap “Use”',
     instructionsAndroid: '[Android] Open this file, tap Share → “Dance Count” → “Use” (if “Dance Count” is not listed, save the file and follow steps 2–3 to “Choose a file”)',
     instructionsPhone: '(It\'s easiest on your phone.)',
@@ -279,16 +297,34 @@ export const APP_MESSAGES = {
     appSubtitle: 'for Ballroom',
     documentTitle: 'Dance Count — for Ballroom',
     switchLanguage: 'English',
-    tabPractice: '練習',
+    tabFigures: 'フィガー',
     tabRoutines: 'ルーティン',
-    tabSettings: '設定',
     navLabel: 'メイン',
     back: '戻る',
+    backToCover: '表紙',
+    coverUse: '使う',
+    coverUseSub: '種目のカウントで練習する・先生のルーティンを鳴らす（生徒の方）',
+    coverMake: '作る',
+    coverMakeSub: '自分の声を録音する・ルーティンを作る・生徒に配る（指導者の方）',
+    coverSettingsSub: '言語・困った時は・アプリについて',
+    continueLast: '前回の練習',
+    makeIntro: '指導者の方へ。作った物は「配る」でファイルにして生徒に送れます。',
+    makeRoutines: 'ルーティンを作る・直す',
+    makeShare: '配る（ファイルを作る）',
+    makeShareSub: '声とルーティンを 1 つのファイルに',
+    voiceStatusNone: 'まだ録音していません',
+    voiceStatusPack: '{language} · {count} / {total} 語',
+    voiceStatusDone: '録音済み',
+    routinesCount: '{count} 本（受け取った物も直せます）',
+    routinesCountOne: '1 本（受け取った物も直せます）',
+    routinesNone: 'まだありません',
+    editFromMake: 'ルーティンを直す・消す時は、表紙の「作る」から。',
+    cannotPlayEmpty: 'フィガーがありません。「作る」で直せます。',
+    cannotPlayFix: 'カウントに直す所があります。「作る」で直せます。',
     chooseDance: '種目を選んでください',
     danceGroup: '種目',
     lastTime: '前回',
     resume: '続きから',
-    teacherVoice: '先生の声で練習',
     speed: '速さ',
     speedSlow: 'ゆっくり',
     speedStandard: '標準',
@@ -500,7 +536,7 @@ export const APP_MESSAGES = {
     instructionsVoiceLead: 'Dance Count で、私の声のカウントを使えます。',
     instructionsRoutinesLead: 'Dance Count で、私のルーティンを使えます。',
     instructionsIphone: '【iPhone】1. このファイルを開き、右上の共有ボタン →「"ファイル"に保存」',
-    instructionsStep2: '2. Dance Count を開き「先生の声で練習」→「ファイルから受け取る」→「ファイルを選ぶ」',
+    instructionsStep2: '2. Dance Count を開き「使う」→ 下の「ルーティン」→「ファイルから受け取る」→「ファイルを選ぶ」',
     instructionsStep3: '3. 「最近使った項目」からこのファイルを選び「使う」',
     instructionsAndroid: '【Android】このファイルを開き、共有 →「Dance Count」→「使う」（「Dance Count」が出てこない時は、保存してから 2・3 の手順で「ファイルを選ぶ」）',
     instructionsPhone: '（スマホで受け取るのが便利です）',
diff --git a/src/app/router/resolve.ts b/src/app/router/resolve.ts
index cf6b229..71fca5c 100644
--- a/src/app/router/resolve.ts
+++ b/src/app/router/resolve.ts
@@ -4,25 +4,29 @@ import { ROUTINES_MAX } from '../routines/limits.ts';
 import { routinePlayability, type Routine } from '../routines/routine.ts';
 import type { Route, RouteTarget, ScreenId } from './routes.ts';
 
-// ハッシュから「実際に出す画面」を決める（純粋関数）。中身のある画面だけを出し、未実装の画面はホーム。
-// S4 新規はルーティンが上限（ROUTINES_MAX）未満の時だけ（S3 のボタンの無効をハッシュ直打ちで越えさせない）。
+// ハッシュから「実際に出す画面」を決める（純粋関数）。中身のある画面だけを出し、未実装の画面は表紙。
+// S4 新規はルーティンが上限（ROUTINES_MAX）未満の時だけ（M1 のボタンの無効をハッシュ直打ちで越えさせない）。
 // S4 編集・S5 は ID が正しく、そのルーティンがある時だけ。S5 はさらに鳴らせる時だけ（Ruling 37・40）。
-// 外れたら S3 を出し、redirect でハッシュも S3 に置き換える（履歴を積まない）。
-export const IMPLEMENTED_SCREENS: readonly ScreenId[] = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13'];
+// 外れたら一覧を出し、redirect でハッシュも置き換える（履歴を積まない）。S4（作る側）は M1、S5（使う側）は U2（D56・Ruling 116）。
+// 古い経路（#/routines＝alias）は U2 を出し、ハッシュを #/use/routines に置き換える。
+export const IMPLEMENTED_SCREENS: readonly ScreenId[] = ['S0', 'S1', 'U2', 'M0', 'M1', 'S2', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13'];
 
 export interface Resolved { screen: ScreenId; redirect: RouteTarget | null }
 
-const TO_ROUTINES: Resolved = { screen: 'S3', redirect: { screen: 'S3', params: {} } };
+const TO_MAKE_ROUTINES: Resolved = { screen: 'M1', redirect: { screen: 'M1', params: {} } };
+const TO_USE_ROUTINES: Resolved = { screen: 'U2', redirect: { screen: 'U2', params: {} } };
 
 export function resolveScreen(route: Route, routines: readonly Routine[]): Resolved {
   const { screen, params } = route;
+  if (route.alias) return { screen, redirect: { screen, params } };
   if (screen === 'S2') return { screen: params.danceId && Object.hasOwn(DANCE_PROFILES, params.danceId) ? 'S2' : 'S1', redirect: null };
   if (screen === 'S4' || screen === 'S5') {
-    if (screen === 'S4' && params.routineId === undefined) return routines.length >= ROUTINES_MAX ? TO_ROUTINES : { screen: 'S4', redirect: null };
+    const back = screen === 'S4' ? TO_MAKE_ROUTINES : TO_USE_ROUTINES;
+    if (screen === 'S4' && params.routineId === undefined) return routines.length >= ROUTINES_MAX ? back : { screen: 'S4', redirect: null };
     const routine = isRoutineId(params.routineId) ? routines.find(item => item.id === params.routineId) : undefined;
-    if (!routine) return TO_ROUTINES;
-    if (screen === 'S5' && routinePlayability(routine) !== 'ok') return TO_ROUTINES;
+    if (!routine) return back;
+    if (screen === 'S5' && routinePlayability(routine) !== 'ok') return back;
     return { screen, redirect: null };
   }
-  return { screen: IMPLEMENTED_SCREENS.includes(screen) ? screen : 'S1', redirect: null };
+  return { screen: IMPLEMENTED_SCREENS.includes(screen) ? screen : 'S0', redirect: null };
 }
diff --git a/src/app/router/routes.ts b/src/app/router/routes.ts
index a508efd..f26edab 100644
--- a/src/app/router/routes.ts
+++ b/src/app/router/routes.ts
@@ -1,7 +1,11 @@
 // ハッシュ ↔ 画面の対応表（仕様 §3）。純粋関数だけ。window には触らない（platform/hash.ts の役目）。
-export type ScreenId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10' | 'S11' | 'S12' | 'S13';
-export type ScreenKind = 'root' | 'focus' | 'list';
-export type TabId = 'practice' | 'routines' | 'settings';
+// D56（Ruling 116）: 表紙 S0（#/）・「使う」の U1（今の S1 の ID のまま #/use）と U2（#/use/routines）・「作る」の M0（#/make）と M1（#/make/routines）。
+// S3 は廃止（古い #/routines は U2 へ置き換え）。深い画面（S2・S4・S5・S7〜S13）の path は変えない。
+export type ScreenId = 'S0' | 'S1' | 'U2' | 'M0' | 'M1' | 'S2' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10' | 'S11' | 'S12' | 'S13';
+// cover＝表紙（戻る無し・下タブ無し）。root＝側の入口（U1・U2・M0）。list＝一覧（M1・S6）。focus＝集中画面
+export type ScreenKind = 'cover' | 'root' | 'focus' | 'list';
+export type Side = 'use' | 'make';
+export type TabId = 'practice' | 'routines';
 export type RouteParams = { danceId?: string; routineId?: string };
 // 画面の見た目だけを強制するテスト用クエリ（Ruling 23・33。confirm-delete は S3・S7 の削除確認・Ruling 43・60-4。
 // mic-denied・no-voice・no-recorder は S8 の枠・Ruling 63-3（no-https は http で開いた時の非対応の枠・D53）。update-ready は S1・S3・S6・S7 の更新の帯・段7 Ruling 90-7）。
@@ -12,45 +16,55 @@ export type RouteParams = { danceId?: string; routineId?: string };
 export type UiState = 'no-sound' | 'wakelock-tip' | 'confirm-delete' | 'mic-denied' | 'no-voice' | 'no-recorder' | 'update-ready' | 'confirm-delete-all'
   | 'save-failed' | 'stopped' | 'voice-missing' | 'mic-failed' | 'no-https';
 export type RouteQuery = { uiState?: UiState };
-export interface Route { screen: ScreenId; params: RouteParams; query: RouteQuery }
+// alias: 古い経路（#/routines）で来た。resolve.ts がハッシュを今の経路へ置き換える（Ruling 116-1）
+export interface Route { screen: ScreenId; params: RouteParams; query: RouteQuery; alias?: true }
 export type RouteTarget = Pick<Route, 'screen' | 'params'>;
 
-interface ScreenSpec { kind: ScreenKind; parent: ScreenId | null; tab: TabId; path: string }
+// side は表紙の「使う／作る」のどちら側か（下タブは「使う」の root だけ＝showsTabs）。tab は下タブの「今の位置」（U1・U2 だけ）。
+// parent は履歴が無い時の「戻る」の行き先（Ruling 17・116-2。表紙が親の画面の「戻る」は「‹ 表紙」）。
+interface ScreenSpec { kind: ScreenKind; parent: ScreenId | null; side: Side | null; tab: TabId | null; path: string }
 
 // path の ":name" は ID 1区切り（英数字・ハイフン・下線のみ）。
 export const SCREENS: Record<ScreenId, ScreenSpec> = {
-  S1: { kind: 'root', parent: null, tab: 'practice', path: '/' },
-  S2: { kind: 'focus', parent: 'S1', tab: 'practice', path: '/practice/:danceId' },
-  S3: { kind: 'root', parent: null, tab: 'routines', path: '/routines' },
-  S4: { kind: 'focus', parent: 'S3', tab: 'routines', path: '/routines/new' },
-  S5: { kind: 'focus', parent: 'S3', tab: 'routines', path: '/routines/:routineId/play' },
-  S6: { kind: 'root', parent: null, tab: 'settings', path: '/settings' },
-  S7: { kind: 'list', parent: 'S6', tab: 'settings', path: '/voices' },
-  S8: { kind: 'focus', parent: 'S7', tab: 'settings', path: '/voices/record' },
-  S9: { kind: 'focus', parent: 'S7', tab: 'settings', path: '/share' },
-  S10: { kind: 'focus', parent: 'S7', tab: 'settings', path: '/receive' },
-  S11: { kind: 'focus', parent: 'S6', tab: 'settings', path: '/help/sound' },
-  S12: { kind: 'list', parent: 'S6', tab: 'settings', path: '/help/install' },
-  S13: { kind: 'list', parent: 'S6', tab: 'settings', path: '/about' }
+  S0: { kind: 'cover', parent: null, side: null, tab: null, path: '/' },
+  S1: { kind: 'root', parent: 'S0', side: 'use', tab: 'practice', path: '/use' },
+  U2: { kind: 'root', parent: 'S0', side: 'use', tab: 'routines', path: '/use/routines' },
+  M0: { kind: 'root', parent: 'S0', side: 'make', tab: null, path: '/make' },
+  M1: { kind: 'list', parent: 'M0', side: 'make', tab: null, path: '/make/routines' },
+  S2: { kind: 'focus', parent: 'S1', side: 'use', tab: null, path: '/practice/:danceId' },
+  S4: { kind: 'focus', parent: 'M1', side: 'make', tab: null, path: '/routines/new' },
+  S5: { kind: 'focus', parent: 'U2', side: 'use', tab: null, path: '/routines/:routineId/play' },
+  S6: { kind: 'list', parent: 'S0', side: null, tab: null, path: '/settings' },
+  S7: { kind: 'focus', parent: 'S1', side: null, tab: null, path: '/voices' },
+  S8: { kind: 'focus', parent: 'M0', side: 'make', tab: null, path: '/voices/record' },
+  S9: { kind: 'focus', parent: 'M0', side: 'make', tab: null, path: '/share' },
+  S10: { kind: 'focus', parent: 'U2', side: 'use', tab: null, path: '/receive' },
+  S11: { kind: 'focus', parent: 'S6', side: null, tab: null, path: '/help/sound' },
+  S12: { kind: 'focus', parent: 'S6', side: null, tab: null, path: '/help/install' },
+  S13: { kind: 'focus', parent: 'S6', side: null, tab: null, path: '/about' }
 };
 
 // S4 は「新規」と「編集」の2つの形を持つので、編集の形をここで足す。
 const EXTRA_PATHS: Array<{ screen: ScreenId; path: string }> = [{ screen: 'S4', path: '/routines/:routineId/edit' }];
+// 古い経路（D56 より前の案内・ブックマーク）。今の画面に読み替え、resolve.ts がハッシュを置き換える
+const ALIAS_PATHS: Array<{ screen: ScreenId; path: string }> = [{ screen: 'U2', path: '/routines' }];
 
 const ID_SEGMENT = /^[A-Za-z0-9_-]+$/;
 const UI_STATES: readonly UiState[] = ['no-sound', 'wakelock-tip', 'confirm-delete', 'mic-denied', 'no-voice', 'no-recorder', 'update-ready', 'confirm-delete-all',
   'save-failed', 'stopped', 'voice-missing', 'mic-failed', 'no-https'];
 
+const toPattern = ({ screen, path }: { screen: ScreenId; path: string }) => ({ screen, segments: path.split('/').filter(Boolean) });
 const PATTERNS = [
   ...(Object.entries(SCREENS) as Array<[ScreenId, ScreenSpec]>).map(([screen, spec]) => ({ screen, path: spec.path })),
   ...EXTRA_PATHS
-].map(({ screen, path }) => ({ screen, segments: path.split('/').filter(Boolean) }));
+].map(toPattern);
+const ALIASES = ALIAS_PATHS.map(toPattern);
 
 export function parseHash(hash: string): Route {
   const [rawPath = '', rawQuery = ''] = hash.replace(/^#/, '').split('?');
   const query = parseQuery(rawQuery);
   const segments = rawPath.split('/').filter(Boolean);
-  for (const pattern of PATTERNS) {
+  for (const pattern of [...PATTERNS, ...ALIASES]) {
     if (pattern.segments.length !== segments.length) continue;
     const params: Record<string, string> = {};
     const matched = pattern.segments.every((expected, index) => {
@@ -62,9 +76,9 @@ export function parseHash(hash: string): Route {
       }
       return expected === actual;
     });
-    if (matched) return { screen: pattern.screen, params, query };
+    if (matched) return ALIASES.includes(pattern) ? { screen: pattern.screen, params, query, alias: true } : { screen: pattern.screen, params, query };
   }
-  return { screen: 'S1', params: {}, query };
+  return { screen: 'S0', params: {}, query };
 }
 
 // 知らないキー・値は捨てる。
@@ -88,14 +102,15 @@ export function buildHash(route: RouteTarget): string {
   throw new Error(`No hash for ${route.screen} with params ${JSON.stringify(route.params)}`);
 }
 
+// 下タブは「使う」の 2 つの入口（U1・U2）だけ（Ruling 116-1）
 export function showsTabs(screen: ScreenId): boolean {
-  return SCREENS[screen].kind !== 'focus';
+  return SCREENS[screen].side === 'use' && SCREENS[screen].kind === 'root';
 }
 
 export function parentScreen(screen: ScreenId): ScreenId | null {
   return SCREENS[screen].parent;
 }
 
-export function tabOf(screen: ScreenId): TabId {
+export function tabOf(screen: ScreenId): TabId | null {
   return SCREENS[screen].tab;
 }
diff --git a/src/app/screens/CoverScreen.tsx b/src/app/screens/CoverScreen.tsx
new file mode 100644
index 0000000..77ef058
--- /dev/null
+++ b/src/app/screens/CoverScreen.tsx
@@ -0,0 +1,60 @@
+import { Icon } from '../components/Icon.tsx';
+import { UpdateBanner } from '../components/UpdateBanner.tsx';
+import { DanceName } from '../i18n/DanceName.tsx';
+import { phrased } from '../i18n/phrased.tsx';
+import { buildHash } from '../router/routes.ts';
+import { useI18n } from '../state/i18n.ts';
+import { resumePractice } from '../state/resume.ts';
+import { useSettings } from '../state/settings.ts';
+
+// S0 表紙（D56・Ruling 115-1・117）。起動のたびに出る（側は覚えない）。上から: アプリ名と言語 → 扉「使う」（主・紺）＋その下にくっついた
+// 「前回の練習 ▶ 続きから」（C 案。初めて鳴った後だけ＝G2 の 1 タップ）→ 扉「作る」（副・枠線）→ 行「設定」→ 更新の帯（ルート画面と同じ帯）。
+// 主要操作は 扉 2・続きから 1・設定 1 ＝ 4（初回 3）。言語は [data-utility]。
+export function CoverScreen() {
+  const { translator, setLocale } = useI18n();
+  const { settings } = useSettings();
+  const locale = translator.locale;
+  const lastDanceId = settings.hints.firstPlaybackDone ? settings.lastDanceId : null;
+  return (
+    <main class="dc-screen dc-cover" data-screen="S0">
+      <header class="dc-appbar">
+        <div class="dc-brand">
+          <h1 class="dc-appname">{translator.t('appName')}</h1>
+          <div class="dc-appsub">{translator.t('appSubtitle')}</div>
+        </div>
+        <button type="button" class="dc-utility" data-utility lang={locale === 'ja-JP' ? 'en' : 'ja'}
+          onClick={() => setLocale(locale === 'ja-JP' ? 'en' : 'ja-JP')}>
+          <Icon name="globe" />
+          <span>{translator.t('switchLanguage')}</span>
+        </button>
+      </header>
+      <div class="dc-doorset">
+        <a class="dc-door dc-door--main" data-door="use" href={buildHash({ screen: 'S1', params: {} })}>
+          <span class="dc-door-icon"><Icon name="play" /></span>
+          <span class="dc-door-text"><b>{translator.t('coverUse')}</b><small data-description>{phrased(translator, 'coverUseSub')}</small></span>
+          <Icon name="chev-r" />
+        </a>
+        {lastDanceId && (
+          <button type="button" class="dc-door-resume" data-resume onClick={() => resumePractice(lastDanceId)}>
+            <span class="dc-resume-text">
+              <small>{translator.t('continueLast')}</small>
+              <b><DanceName danceId={lastDanceId} locale={locale} /></b>
+            </span>
+            <span class="dc-resume-go"><Icon name="play" /><span>{translator.t('resume')}</span></span>
+          </button>
+        )}
+      </div>
+      <a class="dc-door" data-door="make" href={buildHash({ screen: 'M0', params: {} })}>
+        <span class="dc-door-icon"><Icon name="mic" /></span>
+        <span class="dc-door-text"><b>{translator.t('coverMake')}</b><small data-description>{phrased(translator, 'coverMakeSub')}</small></span>
+        <Icon name="chev-r" />
+      </a>
+      <a class="dc-link-row dc-cover-settings" href={buildHash({ screen: 'S6', params: {} })}>
+        <Icon name="gear" />
+        <span class="dc-link-label dc-link-stack"><span>{translator.t('settingsTitle')}</span><small>{translator.t('coverSettingsSub')}</small></span>
+        <Icon name="chev-r" />
+      </a>
+      <UpdateBanner />
+    </main>
+  );
+}
diff --git a/src/app/screens/HomeScreen.tsx b/src/app/screens/HomeScreen.tsx
index 453c9d2..34e77a9 100644
--- a/src/app/screens/HomeScreen.tsx
+++ b/src/app/screens/HomeScreen.tsx
@@ -1,20 +1,20 @@
 import { DANCE_PROFILES } from '../../engine/dance-profiles.js';
+import { BackButton } from '../components/BackButton.tsx';
 import { Icon } from '../components/Icon.tsx';
 import { UpdateBanner } from '../components/UpdateBanner.tsx';
 import { DanceName } from '../i18n/DanceName.tsx';
 import { formatCounts } from '../lib/count-display.ts';
 import { showsInstallCard } from '../lib/install-card.ts';
-import { unlockAudioInsideTap } from '../platform/audio-context.ts';
 import { isStandalone, platformKind } from '../platform/pwa.ts';
 import { buildHash } from '../router/routes.ts';
-import { requestAutoplay } from '../state/autoplay.ts';
 import { useI18n } from '../state/i18n.ts';
-import { navigate } from '../state/route.ts';
+import { resumePractice } from '../state/resume.ts';
 import { useSettings } from '../state/settings.ts';
 
 const DANCE_IDS = Object.keys(DANCE_PROFILES);
 
-// S1（仕様 §4・Ruling 16）。上から: アプリ名と言語 → 前回カード → 先生の声カード → 見出し → 種目タイル10個 → 更新の帯 → ホーム画面に追加の案内カード（段7。最下段＝375×548 の初期表示を崩さない。Ruling 90-3・92-7）。
+// S1＝U1「使う › フィガー」（仕様 §4・Ruling 16・D56 Ruling 115-2）。上から: 「‹ 表紙」と言語 → 前回カード → 見出し → 種目タイル10個 → 更新の帯 →
+// ホーム画面に追加の案内カード（段7。最下段＝375×548 の初期表示を崩さない。Ruling 90-3・92-7）。「先生の声で練習」カードは外した（声は S2／S5 の声チップから。D56-(3)）。
 export function HomeScreen() {
   const { translator, setLocale } = useI18n();
   const { settings, update } = useSettings();
@@ -23,21 +23,10 @@ export function HomeScreen() {
   const installCard = showsInstallCard({ hints: settings.hints, kind: platformKind(), standalone: isStandalone() });
   const lastDanceId = settings.lastDanceId;
 
-  // 前回カード: このタップの中で音を解除し、一回限りの印を付けてから S2 へ（Ruling 32）。
-  const resume = () => {
-    if (!lastDanceId) return;
-    try { unlockAudioInsideTap(); } catch { /* 音が使えない端末は S2 の2秒判定で案内する */ }
-    requestAutoplay({ kind: 'dance', id: lastDanceId });
-    navigate({ screen: 'S2', params: { danceId: lastDanceId } });
-  };
-
   return (
     <main class="dc-screen dc-home" data-screen="S1">
       <header class="dc-appbar">
-        <div class="dc-brand">
-          <h1 class="dc-appname">{translator.t('appName')}</h1>
-          <div class="dc-appsub">{translator.t('appSubtitle')}</div>
-        </div>
+        <BackButton screen="S1" />
         <button type="button" class="dc-utility" data-utility lang={locale === 'ja-JP' ? 'en' : 'ja'}
           onClick={() => setLocale(locale === 'ja-JP' ? 'en' : 'ja-JP')}>
           <Icon name="globe" />
@@ -45,7 +34,7 @@ export function HomeScreen() {
         </button>
       </header>
       {lastDanceId && (
-        <button type="button" class="dc-resume" data-resume onClick={resume}>
+        <button type="button" class="dc-resume" data-resume onClick={() => resumePractice(lastDanceId)}>
           <span class="dc-resume-text">
             <small>{translator.t('lastTime')}</small>
             <b><DanceName danceId={lastDanceId} locale={locale} /></b>
@@ -53,12 +42,7 @@ export function HomeScreen() {
           <span class="dc-resume-go"><Icon name="play" /><span>{translator.t('resume')}</span></span>
         </button>
       )}
-      <a class="dc-teacher" data-teacher-card href={buildHash({ screen: 'S7', params: {} })}>
-        <span class="dc-teacher-icon"><Icon name="mic" /></span>
-        <b>{translator.t('teacherVoice')}</b>
-        <Icon name="chev-r" />
-      </a>
-      <h2 class="dc-heading">{translator.t('chooseDance')}</h2>
+      <h1 class="dc-heading">{translator.t('chooseDance')}</h1>
       <div class="dc-tiles" role="group" aria-label={translator.t('danceGroup')} data-group="dance">
         {DANCE_IDS.map(danceId => (
           <a key={danceId} class="dc-tile" href={buildHash({ screen: 'S2', params: { danceId } })}>
diff --git a/src/app/screens/MakeScreen.tsx b/src/app/screens/MakeScreen.tsx
new file mode 100644
index 0000000..9eaf073
--- /dev/null
+++ b/src/app/screens/MakeScreen.tsx
@@ -0,0 +1,61 @@
+import type { ComponentChildren } from 'preact';
+import { useEffect, useState } from 'preact/hooks';
+import { BackButton } from '../components/BackButton.tsx';
+import { Icon } from '../components/Icon.tsx';
+import type { IconName } from '../components/icon-names.ts';
+import type { AppTranslator } from '../i18n/index.ts';
+import { phrased } from '../i18n/phrased.tsx';
+import { buildHash, type ScreenId } from '../router/routes.ts';
+import { useI18n } from '../state/i18n.ts';
+import { useRoutines } from '../state/routines.ts';
+import { useStorage } from '../state/storage.ts';
+import { listVoicePacks, packProgress, type VoicePackRecord } from '../voices/store.ts';
+
+// M0「作る」（D56・Ruling 115-3）。指導者の 3 つの仕事を 1 枚の入口に並べる（束にしない＝主要操作 3）。下タブ無し・左上「‹ 表紙」。
+// 行の下の 1 行は「今どこまでできているか」: 自分の声の録音（言葉ごとの語数）・ルーティンの本数・配るの説明。中身（S8・M1・S9）は変えない。
+export function MakeScreen() {
+  const { translator } = useI18n();
+  const { routines } = useRoutines();
+  const storage = useStorage();
+  const [packs, setPacks] = useState<VoicePackRecord[] | null>(null);
+  useEffect(() => {
+    let alive = true;
+    void listVoicePacks(storage).then(list => { if (alive) setPacks(list); });
+    return () => { alive = false; };
+  }, [storage]);
+
+  const rows: Array<{ screen: ScreenId; icon: IconName; title: string; status: ComponentChildren | null }> = [
+    { screen: 'S8', icon: 'mic', title: translator.t('recordVoice'), status: packs === null ? null : recordingStatus(translator, packs) },
+    { screen: 'M1', icon: 'edit', title: translator.t('makeRoutines'),
+      status: routines.length === 0 ? translator.t('routinesNone') : routines.length === 1 ? translator.t('routinesCountOne') : translator.t('routinesCount', { count: routines.length }) },
+    { screen: 'S9', icon: 'share', title: translator.t('makeShare'), status: phrased(translator, 'makeShareSub') }
+  ];
+  return (
+    <main class="dc-screen dc-make" data-screen="M0" data-loading={packs === null ? '' : undefined}>
+      <BackButton screen="M0" />
+      <h1 class="dc-heading">{translator.t('coverMake')}</h1>
+      <p class="dc-body dc-make-intro">{phrased(translator, 'makeIntro')}</p>
+      <div class="dc-hublist">
+        {rows.map(row => (
+          <a key={row.screen} class="dc-hub" href={buildHash({ screen: row.screen, params: {} })}>
+            <span class="dc-door-icon"><Icon name={row.icon} /></span>
+            <span class="dc-hub-text"><b>{row.title}</b>{row.status !== null && <small data-description>{row.status}</small>}</span>
+            <Icon name="chev-r" />
+          </a>
+        ))}
+      </div>
+    </main>
+  );
+}
+
+// 録音の状態の 1 行（純粋。自分で録った声だけ。受け取った声は数えない）。2 つの言葉があれば「英語 · 12 / 12 語 · 日本語 · 7 / 12 語」と並べる
+function recordingStatus(translator: AppTranslator, packs: readonly VoicePackRecord[]): string {
+  const recorded = packs.filter(pack => pack.origin === 'recorded');
+  if (recorded.length === 0) return translator.t('voiceStatusNone');
+  const parts = recorded.map(pack => {
+    const { recorded: count, total } = packProgress(pack);
+    return translator.t('voiceStatusPack', { language: translator.t(pack.locale === 'ja-JP' ? 'languageJapanese' : 'languageEnglish'), count, total });
+  });
+  if (recorded.length === 1) parts.push(translator.t(packProgress(recorded[0]!).complete ? 'voiceStatusDone' : 'resume'));
+  return parts.join(' · ');
+}
diff --git a/src/app/screens/ReceiveScreen.tsx b/src/app/screens/ReceiveScreen.tsx
index ee20d4e..683aa26 100644
--- a/src/app/screens/ReceiveScreen.tsx
+++ b/src/app/screens/ReceiveScreen.tsx
@@ -133,7 +133,7 @@ export function ReceiveScreen({ uiState }: { uiState?: UiState }) {
         </p>
         <div class="dc-dock">
           <button type="button" class="dc-button dc-primary dc-dock-button"
-            onClick={() => replaceRoute({ screen: voice ? 'S1' : 'S3', params: {} })}>
+            onClick={() => replaceRoute({ screen: voice ? 'S1' : 'U2', params: {} })}>
             <span>{translator.t(voice ? 'goHome' : 'seeRoutines')}</span><Icon name="chev-r" />
           </button>
         </div>
diff --git a/src/app/screens/RoutinesScreen.tsx b/src/app/screens/RoutinesScreen.tsx
index 2c51762..700e2a2 100644
--- a/src/app/screens/RoutinesScreen.tsx
+++ b/src/app/screens/RoutinesScreen.tsx
@@ -1,4 +1,5 @@
 import { useEffect, useState } from 'preact/hooks';
+import { BackButton } from '../components/BackButton.tsx';
 import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
 import { Icon } from '../components/Icon.tsx';
 import { UpdateBanner } from '../components/UpdateBanner.tsx';
@@ -7,7 +8,7 @@ import { danceName } from '../i18n/index.ts';
 import { phrased } from '../i18n/phrased.tsx';
 import { honorific } from '../lib/honorific.ts';
 import { unlockAudioInsideTap } from '../platform/audio-context.ts';
-import type { UiState } from '../router/routes.ts';
+import { buildHash, type UiState } from '../router/routes.ts';
 import { ROUTINES_MAX } from '../routines/limits.ts';
 import { routinePlayability, type Routine } from '../routines/routine.ts';
 import { requestAutoplay } from '../state/autoplay.ts';
@@ -16,17 +17,20 @@ import { useI18n } from '../state/i18n.ts';
 import { navigate } from '../state/route.ts';
 import { useRoutines } from '../state/routines.ts';
 
-// S3 ルーティン一覧（仕様 §4・Ruling 35・40・41・44）。上から「＋ 新しいルーティン」→ 一覧（作った順）。
-// 行をタップで開く（同時に1つ）。開いた行: 鳴らせる時は ▶ 再生（S5 で即再生）・編集・削除。
-// 鳴らせる時は編集と削除の間に「配る」（→ S9 にこのルーティンを選んだ状態で。Ruling 86-4）。ui-state=confirm-delete は最初の行の削除確認を見た目だけ出す（Ruling 43）。
-export function RoutinesScreen({ uiState }: { uiState?: UiState }) {
+// ルーティン一覧（仕様 §4・Ruling 35・40・41・44）。D56（Ruling 115-2・115-3）で 2 つの形に分けた（一覧の中身・並びは同じ＝作った順）:
+// - mode 'use'＝U2「使う › ルーティン」: 「ファイルから受け取る」→ 一覧。行を押すとすぐ鳴る（行全体が 1 つのボタン・右端に「▶ 再生」の札）。
+//   鳴らせない行はボタンにせず、注意 1 行（「作る」で直せます）。一覧の下に「直す・消す時は表紙の「作る」から」の 1 行。編集・削除・配るは置かない。
+// - mode 'make'＝M1「作る › ルーティン」（今までの S3）: 「＋ 新しいルーティン」→ 一覧。行をタップで開く（同時に1つ）。開いた行: 鳴らせる時は ▶ 試聴（S5 で即再生）・編集・
+//   配る（→ S9 にこのルーティンを選んだ状態で。Ruling 86-4）・削除。受け取ったルーティンも並び、直せる（Ruling 84-3）。
+// ui-state=confirm-delete は M1 の最初の行の削除確認を見た目だけ出す（Ruling 43）。
+export function RoutinesScreen({ mode, uiState }: { mode: 'use' | 'make'; uiState?: UiState }) {
   const { translator } = useI18n();
   const { routines, remove } = useRoutines();
   const [openId, setOpenId] = useState<string | null>(null);
   const [deleting, setDeleting] = useState<Routine | null>(null);
   const [deleteFailed, setDeleteFailed] = useState(false);   // 端末から消せなかった（画面を離れるまで出す）
   const locale = translator.locale;
-  useEffect(() => { if (uiState === 'confirm-delete' && routines[0]) setDeleting(routines[0]); }, [uiState]);
+  useEffect(() => { if (mode === 'make' && uiState === 'confirm-delete' && routines[0]) setDeleting(routines[0]); }, [uiState]);
 
   // ▶: このタップの中で音を解除し、一回限りの印を付けて S5 へ（Ruling 32・40）。
   const play = (routine: Routine) => {
@@ -35,9 +39,57 @@ export function RoutinesScreen({ uiState }: { uiState?: UiState }) {
     navigate({ screen: 'S5', params: { routineId: routine.id } });
   };
 
-  return (
-    <main class="dc-screen" data-screen="S3">
+  const summaryOf = (routine: Routine) => {
+    const dance = danceName(routine.danceId, locale);
+    const count = routine.figures.length;
+    const summary = count === 1 ? translator.t('routineSummaryOne', { dance }) : translator.t('routineSummary', { dance, count });
+    return `${summary}${routine.receivedFrom ? ` · ${translator.t('receivedFrom', { name: honorific(routine.receivedFrom.distributor, translator.locale) })}` : ''}`;
+  };
+
+  if (mode === 'use') return (
+    <main class="dc-screen dc-routines-use" data-screen="U2">
+      <BackButton screen="U2" />
       <h1 class="dc-heading">{translator.t('routinesTitle')}</h1>
+      <UpdateBanner />
+      <a class="dc-button dc-button--secondary dc-wide dc-receive-link" href={buildHash({ screen: 'S10', params: {} })}>
+        <span>{translator.t('receiveFromFile')}</span>
+      </a>
+      {routines.length === 0
+        ? <p class="dc-empty" data-body>{phrased(translator, 'routinesEmpty')}</p>
+        : (
+          <div class="dc-list" role="list" data-list>
+            {routines.map(routine => {
+              const playability = routinePlayability(routine);
+              const text = (
+                <span class="dc-row-text">
+                  <b data-ellipsis>{routine.name}</b>
+                  <small>{summaryOf(routine)}</small>
+                  {playability !== 'ok' && (
+                    <small class="dc-row-warn"><Icon name="alert" />{phrased(translator, playability === 'empty' ? 'cannotPlayEmpty' : 'cannotPlayFix')}</small>
+                  )}
+                </span>
+              );
+              return (
+                <div key={routine.id} role="listitem" class="dc-row" data-row>
+                  {playability === 'ok'
+                    ? <button type="button" class="dc-row-head dc-row--play" onClick={() => play(routine)}>
+                        {text}
+                        <span class="dc-play-tag"><Icon name="play" /><span>{translator.t('play')}</span></span>
+                      </button>
+                    : <div class="dc-row-head dc-row--off" data-row-off>{text}</div>}
+                </div>
+              );
+            })}
+          </div>
+        )}
+      <div class="dc-hint dc-edit-in-make">{phrased(translator, 'editFromMake')}</div>
+    </main>
+  );
+
+  return (
+    <main class="dc-screen" data-screen="M1">
+      <BackButton screen="M1" />
+      <h1 class="dc-heading">{translator.t('makeRoutines')}</h1>
       {/* 枠は同時に 1 つ（Ruling 30）: 知らせが出ている間は更新の帯を引っ込め、閉じたら戻す（段7 最終レビュー m2） */}
       {!deleteFailed && <UpdateBanner />}
       <NoticeBox notice={deleteFailed ? 'save-failed' : 'none'} onClose={() => setDeleteFailed(false)} />
@@ -52,15 +104,12 @@ export function RoutinesScreen({ uiState }: { uiState?: UiState }) {
             {routines.map(routine => {
               const open = routine.id === openId;
               const playability = routinePlayability(routine);
-              const dance = danceName(routine.danceId, locale);
-              const count = routine.figures.length;
-              const summary = count === 1 ? translator.t('routineSummaryOne', { dance }) : translator.t('routineSummary', { dance, count });
               return (
                 <div key={routine.id} role="listitem" class="dc-row" data-row data-open={open ? '' : undefined}>
                   <button type="button" class="dc-row-head" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpenId(open ? null : routine.id)}>
                     <span class="dc-row-text">
                       <b>{routine.name}</b>
-                      <small>{summary}{routine.receivedFrom ? ` · ${translator.t('receivedFrom', { name: honorific(routine.receivedFrom.distributor, translator.locale) })}` : ''}</small>
+                      <small>{summaryOf(routine)}</small>
                     </span>
                     <Icon name="chevron" class="dc-row-chev" />
                   </button>
@@ -70,7 +119,7 @@ export function RoutinesScreen({ uiState }: { uiState?: UiState }) {
                       <div class="dc-row-actions" data-group="routine-actions">
                         {playability === 'ok' && (
                           <button type="button" class="dc-button dc-primary dc-wide" onClick={() => play(routine)}>
-                            <Icon name="play" /><span>{translator.t('play')}</span>
+                            <Icon name="play" /><span>{translator.t('previewVoice')}</span>
                           </button>
                         )}
                         <button type="button" class="dc-button dc-button--secondary" onClick={() => navigate({ screen: 'S4', params: { routineId: routine.id } })}>
diff --git a/src/app/screens/SettingsScreen.tsx b/src/app/screens/SettingsScreen.tsx
index b80f91e..56421b3 100644
--- a/src/app/screens/SettingsScreen.tsx
+++ b/src/app/screens/SettingsScreen.tsx
@@ -1,4 +1,5 @@
 import { APP_VERSION } from '../app-version.ts';
+import { BackButton } from '../components/BackButton.tsx';
 import { Icon } from '../components/Icon.tsx';
 import type { IconName } from '../components/icon-names.ts';
 import { UpdateBanner } from '../components/UpdateBanner.tsx';
@@ -34,6 +35,7 @@ export function SettingsScreen() {
   const { voice } = usePlaybackVoice();
   return (
     <main class="dc-screen" data-screen="S6">
+      <BackButton screen="S6" />
       <h1 class="dc-heading">{translator.t('settingsTitle')}</h1>
       <UpdateBanner />
       <h2 class="dc-field-label">{translator.t('settingsLanguage')}</h2>
diff --git a/src/app/state/resume.ts b/src/app/state/resume.ts
new file mode 100644
index 0000000..2e941a8
--- /dev/null
+++ b/src/app/state/resume.ts
@@ -0,0 +1,10 @@
+import { unlockAudioInsideTap } from '../platform/audio-context.ts';
+import { requestAutoplay } from './autoplay.ts';
+import { navigate } from './route.ts';
+
+// 「前回」の 1 タップ（U1 の前回カード・表紙 C の「続きから」。G2・Ruling 32・115-1）。このタップの中で音を解除し、一回限りの印を付けてから S2 へ。
+export function resumePractice(danceId: string): void {
+  try { unlockAudioInsideTap(); } catch { /* 音が使えない端末は S2 の2秒判定で案内する */ }
+  requestAutoplay({ kind: 'dance', id: danceId });
+  navigate({ screen: 'S2', params: { danceId } });
+}
diff --git a/src/app/state/route.ts b/src/app/state/route.ts
index b2c86fd..b7e0943 100644
--- a/src/app/state/route.ts
+++ b/src/app/state/route.ts
@@ -19,7 +19,7 @@ export function navigate(target: RouteTarget): void {
   setHash(buildHash(target));
 }
 
-// 履歴を積まずに画面を替える（新規ルーティンの ID 発行・見つからないルーティンから S3 へ。Ruling 37・40）。
+// 履歴を積まずに画面を替える（新規ルーティンの ID 発行・見つからないルーティンから一覧へ・下タブの切替。Ruling 37・40・116）。
 // 見てきた列の末尾も置き換えて、幻の履歴を残さない。
 export function replaceRoute(target: RouteTarget): void {
   const hash = buildHash(target);
@@ -33,5 +33,5 @@ export function goBack(current: ScreenId): void {
     historyBack();
     return;
   }
-  replaceRoute({ screen: parentScreen(current) ?? 'S1', params: {} });
+  replaceRoute({ screen: parentScreen(current) ?? 'S0', params: {} });
 }
diff --git a/src/app/styles/base.css b/src/app/styles/base.css
index 469724c..7740079 100644
--- a/src/app/styles/base.css
+++ b/src/app/styles/base.css
@@ -29,6 +29,8 @@ button { cursor: pointer; }
 .dc-screen { flex: 1; width: 100%; max-width: 640px; margin: 0 auto; padding: 16px 16px calc(var(--tabh) + 16px + env(safe-area-inset-bottom)); }
 .dc-screen--focus { padding-bottom: 16px; }
 .dc-screen--dock { padding-bottom: calc(var(--dockh) + 16px + env(safe-area-inset-bottom)); }
+/* D56: 下タブは「使う」の U1・U2 だけ。タブの無い画面（表紙・作る・設定・一覧）は下の余白をタブのぶん取らない */
+.dc-shell:not([data-tabs]) .dc-screen:not(.dc-screen--dock) { padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
 .dc-heading { font-size: 22px; font-weight: 700; line-height: 1.3; margin: 24px 0 12px; letter-spacing: var(--track); }
 .dc-body { font-size: 18px; margin: 0 0 12px; }
 
@@ -60,12 +62,55 @@ button { cursor: pointer; }
 .dc-resume-go > span { white-space: nowrap; }
 .dc-resume-go { display: inline-flex; align-items: center; gap: 6px; min-height: 48px; padding: 0 16px; border-radius: var(--r-s);
   background: var(--on-primary); color: var(--primary); font-size: 18px; font-weight: 800; }
-.dc-teacher { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 56px; margin-top: 8px; padding: 4px; text-decoration: none;
-  border-top: var(--bw) solid var(--line); border-bottom: var(--bw) solid var(--line); }
-.dc-teacher-icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 999px; background: var(--icon-circle); color: #FFFFFF; }
-.dc-teacher b { flex: 1; font-size: 18px; }
-.dc-teacher > .dc-ic, .dc-chip-row > .dc-ic:last-child { color: var(--ink2); }
-.dc-home .dc-heading { margin: 8px 0 4px; }
+.dc-chip-row > .dc-ic:last-child { color: var(--ink2); }
+.dc-home .dc-heading { margin: 16px 0 8px; }   /* D56: 見出しが h1 になり、上の先生カードが無くなった */
+
+/* S0 表紙（D56・Ruling 115-1）: 扉は 104px 以上・アイコン円 48px・見出し 26px 800・説明 16px。「使う」は紺塗り、「作る」は枠線。
+   C 案: 「使う」の扉の下に「前回の練習 ▶ 続きから」（--soft の帯）を 1 つの枠でくっつける */
+.dc-cover { padding-top: 12px; }
+.dc-door { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 104px; margin-top: 12px; padding: 10px 12px 10px 16px; text-decoration: none;
+  border: var(--bw) solid var(--primary); border-radius: var(--r); background: var(--surface); color: var(--primary); }
+.dc-door--main { background: var(--primary); color: var(--on-primary); }
+.dc-door-icon { display: grid; place-items: center; flex: none; width: 48px; height: 48px; border-radius: 999px; background: var(--icon-circle); color: #FFFFFF; }
+.dc-door--main .dc-door-icon { background: var(--on-primary); color: var(--primary); }
+.dc-door-text { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
+.dc-door-text b { font-size: 26px; font-weight: 800; letter-spacing: var(--track); }
+.dc-door-text small { margin-top: 2px; font-size: 16px; font-weight: 400; line-height: 1.3; color: var(--ink2); }
+.dc-door--main .dc-door-text small { color: #E4E7EE; }
+.dc-doorset { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; border: var(--bw) solid var(--primary); border-radius: var(--r); overflow: hidden;
+  background: var(--soft); }   /* 扉と「続きから」の間 8px（U3）は --soft の帯に見える */
+.dc-doorset .dc-door { margin: 0; border: none; border-radius: 0; }
+.dc-door-resume { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; min-height: 56px; padding: 4px 12px 4px 16px; border: none;
+  background: var(--soft); color: var(--ink); text-align: left; }
+.dc-door-resume .dc-resume-text small { color: var(--ink2); }
+.dc-door-resume .dc-resume-text b { font-size: 20px; }
+.dc-door-resume .dc-resume-go { background: var(--primary); color: var(--on-primary); padding: 0 14px; }
+.dc-cover-settings { margin-top: 20px; }
+.dc-cover .dc-update { margin-top: 16px; }
+.dc-link-stack { display: flex; flex-direction: column; line-height: 1.3; }
+.dc-link-stack small { font-size: 16px; font-weight: 400; color: var(--ink2); }
+
+/* M0 作る（D56・Ruling 115-3）: 行 80px・アイコン円・見出し 18px・状態の 1 行 16px */
+.dc-make-intro { margin: 0 0 8px; }
+.dc-hublist { margin-top: 4px; border-top: var(--bw) solid var(--line); }
+.dc-hub { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 80px; padding: 8px 2px; text-decoration: none; color: var(--ink);
+  border-bottom: var(--bw) solid var(--line); }
+.dc-hub + .dc-hub { margin-top: 8px; }   /* 行と行の間 8px（U3） */
+.dc-hub-text { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
+.dc-hub-text b { font-size: 18px; }
+.dc-hub-text small { font-size: 16px; color: var(--ink2); }
+.dc-hub > .dc-ic:last-child { color: var(--ink2); }
+
+/* U2 使う › ルーティン（D56・Ruling 115-2）: 行を押すとすぐ鳴る。右端の「▶ 再生」は札（装飾。行全体が 1 つのボタン）。鳴らせない行はボタンにしない */
+.dc-routines-use .dc-receive-link { margin-top: 0; }
+/* 長いルーティン名（40 字）は 2 行で「…」（S5 の見出しと同じ扱い。Ruling 47。札「▶ 再生」の幅を残す） */
+.dc-row--play .dc-row-text b, .dc-row--off .dc-row-text b { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
+.dc-play-tag { display: inline-flex; align-items: center; gap: 4px; flex: none; min-height: 48px; padding: 0 10px 0 8px; border-radius: var(--r-s);
+  background: var(--primary); color: var(--on-primary); font-size: 16px; font-weight: 800; white-space: nowrap; }
+.dc-row--off { color: var(--ink2); cursor: default; }
+.dc-row-text .dc-row-warn { display: flex; align-items: center; gap: 6px; margin-top: 2px; color: var(--warn-ink); }
+.dc-row-warn .dc-ic { width: 20px; height: 20px; }
+.dc-edit-in-make { margin-top: 12px; }
 .dc-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
 .dc-tile { display: flex; flex-direction: column; justify-content: center; gap: 2px; min-height: 64px; padding: 6px 2px; text-decoration: none;
   border-bottom: var(--bw) solid var(--line); }
@@ -349,6 +394,7 @@ button { cursor: pointer; }
   .dc-tab { flex: none; flex-direction: row; gap: 8px; padding: 0 16px; font-size: 18px; }
   .dc-tab[aria-current="page"] { background: var(--soft); border-radius: 999px; }
   .dc-screen { padding-top: calc(var(--tabh-top) + 16px); padding-bottom: 32px; }
+  .dc-shell:not([data-tabs]) .dc-screen { padding-top: 16px; }
   .dc-screen--focus { padding-top: 16px; }
   .dc-screen--dock { padding-bottom: calc(var(--dockh) + 24px); }
   .dc-practice { max-width: 960px; }
@@ -380,8 +426,8 @@ button { cursor: pointer; }
   /* 「English」・前回カード・先生カードの間は 8px のまま（U3 の下限。ui:check の 375×548 で確認）。そのぶん上の余白と見出しの行の高さで詰める */
   .dc-home { padding-top: 4px; }
   .dc-resume { min-height: 56px; padding: 4px 12px 4px 20px; }   /* 60 → 56（主ボタン基準 56 は守る） */
-  .dc-teacher { padding: 2px 4px; }                                /* 58 → 56 */
-  .dc-home .dc-heading { margin: 0; font-size: 20px; line-height: 1.2; }   /* 22 → 20（Ruling 71 の「外れた時」の候補を先に使う） */
+  .dc-cover { padding-top: 4px; }
+  .dc-home .dc-heading { margin: 12px 0 4px; font-size: 20px; line-height: 1.2; }   /* 22 → 20（Ruling 71）。D56 で先生カードが無くなったぶん上を 12px 空ける */
   .dc-tiles { gap: 8px 14px; }                                     /* 行間 8 は U3 の下限 */
   .dc-tile { min-height: 48px; padding: 2px; gap: 0; }             /* 64 → 48（U3 の下限） */
   .dc-tile b, .dc-tile small { line-height: 1.15; }
diff --git a/tools/i18n/copy-review-sheet.js b/tools/i18n/copy-review-sheet.js
index 636612c..77cdff3 100644
--- a/tools/i18n/copy-review-sheet.js
+++ b/tools/i18n/copy-review-sheet.js
@@ -12,9 +12,11 @@ export const SHEET_PATH = 'docs/app-v1/stage8-copy-review.md';
 
 // 鍵を参照するファイル → 画面（Ruling 96-1。画面の部品はその画面に数える）
 export const SCREEN_FILES = Object.freeze({
+  'src/app/screens/CoverScreen.tsx': 'S0',
   'src/app/screens/HomeScreen.tsx': 'S1',
+  'src/app/screens/MakeScreen.tsx': 'M0',
   'src/app/screens/PracticeScreen.tsx': 'S2',
-  'src/app/screens/RoutinesScreen.tsx': 'S3',
+  'src/app/screens/RoutinesScreen.tsx': 'U2',
   'src/app/screens/RoutineEditScreen.tsx': 'S4',
   'src/app/routines/FigureForm.tsx': 'S4',
   'src/app/screens/RoutinePlayScreen.tsx': 'S5',
@@ -30,7 +32,7 @@ export const SCREEN_FILES = Object.freeze({
 export const INSTRUCTION_FILES = Object.freeze(['src/app/share/instructions.ts']);
 
 export const GROUPS = Object.freeze([
-  ['S1', 'S1 ホーム'], ['S2', 'S2 再生'], ['S3', 'S3 ルーティン一覧'], ['S4', 'S4 ルーティン編集'], ['S5', 'S5 ルーティン再生'],
+  ['S0', 'S0 表紙'], ['S1', 'S1 使う › フィガー（種目）'], ['S2', 'S2 再生'], ['U2', 'U2・M1 ルーティン（使う・作る）'], ['M0', 'M0 作る'], ['S4', 'S4 ルーティン編集'], ['S5', 'S5 ルーティン再生'],
   ['S6', 'S6 設定'], ['S7', 'S7 声'], ['S8', 'S8 自分の声を録音'], ['S9', 'S9 配る'], ['S10', 'S10 受け取る'],
   ['S11', 'S11 音が鳴らない時'], ['S12', 'S12 ホーム画面に追加する方法'], ['S13', 'S13 プライバシー・アプリについて'],
   ['common', '共通（複数の画面・部品）'], ['instructions', '生徒への案内文（S9 でコピーされる）'], ['errors', 'エラー・知らせ（仕様 §11）']
diff --git a/tools/i18n/segment-ja.js b/tools/i18n/segment-ja.js
index f1a76cb..2963da0 100644
--- a/tools/i18n/segment-ja.js
+++ b/tools/i18n/segment-ja.js
@@ -34,7 +34,10 @@ function openPlaceholder(text) {
 // BudouX の切りが語を壊す所だけ、句を手で決める（鍵ごと。結ぶと元の文に戻ること＝下の join の検査が守る）。
 // 「プライバシー・アプリについて」は BudouX だと「プライバシー・アプリに｜ついて」（段8 Task 3 レビュー I1）
 export const OVERRIDES = {
-  settingsAbout: ['プライバシー・', 'アプリについて']
+  settingsAbout: ['プライバシー・', 'アプリについて'],
+  // D56: 表紙の扉の説明。BudouX は「（生徒の｜方）」「・生徒に」と切る（「方）」だけの行・行頭の「・」を作らない）
+  coverUseSub: ['種目の', 'カウントで', '練習する・', '先生の', 'ルーティンを', '鳴らす', '（生徒の方）'],
+  coverMakeSub: ['自分の', '声を', '録音する・', 'ルーティンを', '作る・', '生徒に', '配る', '（指導者の方）']
 };
 
 // { 鍵: 句の配列 }。1 句の文は載せない（画面はそのまま描く）
```

```bash
npm run i18n:phrases && npm run copy:sheet
```

- [ ] **Step 4: 通ることを確かめる**（上の「共通の確かめ方」）

Expected: `tests 657`・`fail 0`、`typecheck-ok`、ui:check **755 PASS**（107 状態 × 7 周＋6・違反 0）、スモーク 4 本 OK（`practice smoke OK: G1 (3 taps from the cover) and G2 (1 tap: the U1 card and the cover) play, tabs do not stack history …`・`routines smoke OK …`・`voice smoke OK …`・`share smoke OK: S8 "Share" and the M1 row "Share" …`）。目で: 375×548・320×568・1280×900 の表紙（扉 2 つ・「続きから」は `--soft` の帯で 8px 離れて同じ枠）・U1（「‹ 表紙」と言語・先生カードが無い・10 タイル）・U2（「ファイルから受け取る」・行の右に「▶ 再生」・0 フィガーの行は灰色で注意 1 行・一番下に「直す・消す時は…」）・M0（3 行・状態の 1 行）・M1（「‹ 戻る」・見出し「ルーティンを作る・直す」）を撮る（`~/.playwright-mcp/role-t1-<画面>-<幅>.png`）。

- [ ] **Step 5: コミット**

```bash
git add src/app/router/routes.ts src/app/router/resolve.ts src/app/state/route.ts src/app/state/resume.ts \
  src/app/components/TabBar.tsx src/app/components/BackButton.tsx src/app/App.tsx \
  src/app/screens/CoverScreen.tsx src/app/screens/MakeScreen.tsx src/app/screens/HomeScreen.tsx src/app/screens/RoutinesScreen.tsx \
  src/app/screens/SettingsScreen.tsx src/app/screens/ReceiveScreen.tsx src/app/i18n/messages.ts src/app/styles/base.css \
  tools/i18n/copy-review-sheet.js tools/i18n/segment-ja.js docs/app-v1/stage8-error-matrix.md \
  src/app/i18n/ja-phrases.json docs/app-v1/stage8-copy-review.md \
  test/app/routes.test.ts test/app/router-resolve.test.ts test/app/i18n.test.ts test/app/update-banner-placement.test.ts test/app/share/instructions.test.ts \
  tools/check-app-ui.js tools/smoke-practice.js tools/smoke-routines.js tools/smoke-voice.js tools/smoke-share.js tools/smoke-pwa.js tools/smoke-app-shell.js
git commit -m "feat(app): 表紙で「使う／作る」に分ける（D56・Ruling 115〜118）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 2: 設定を 3 つに・声の一覧の「自分の声を録音する」を 1 行の案内に

**担当:** Sonnet。**Ruling 115-4・115-5・118-3。**

**Files:**
- Modify: `src/app/screens/SettingsScreen.tsx`・`src/app/screens/VoicesScreen.tsx`・`src/app/i18n/messages.ts`（`recordFromMake` を足す・`forTeachers` を消す）・`src/app/styles/base.css`（S7 の 548 の横並びを外す）・生成物 2 つ
- Test: `tools/check-app-ui.js`（S6 の 2 状態・S7 の 8 状態・「S7（設定から）」を消す・「S9（設定から）」→「S9（作るから）」）

**Interfaces:**
- Produces: S6 は `[data-group="language"]`・`[data-group="help"]`（S12・S11）・`.dc-settings-about` だけ。S7 の下は `.dc-receive-link` と `.dc-record-in-make`（`div.dc-hint`・`phrased`）。`.dc-record-link` は無くなる。
- Consumes: Task 1 の M0（「S9（作るから）」は `a.dc-hub[href="#/share"]` から入る）。

**決まり**: S6 は 375×548 でも 3 つとも初期表示に入る（帯がある時は「プライバシー・アプリについて」が下でもよい＝ops を固定しない）。S7 の途中の声の「続きを録音する」は残す。

- [ ] **Step 1: 失敗する ui:check の状態を書く**

`git apply --whitespace=nowarn .superpowers/sdd/role-split/t2-test.diff`:

<!-- diff: t2-test -->
```diff
diff --git a/tools/check-app-ui.js b/tools/check-app-ui.js
index 00dad00..4b4b8a6 100644
--- a/tools/check-app-ui.js
+++ b/tools/check-app-ui.js
@@ -165,39 +165,36 @@ const STATES = [
     texts: ['保存できませんでした。'] },
   { name: 'S5 40字の名前（全角）', hash: `#/routines/${R.longJa.id}/play`, screen: 'S5', kind: 'focus', seed: SEEDED, ops: 5, opsSmall: 4, speedAndPlay: true, chipToDock: true, singleLineHeading: true },
   { name: 'S5 40字の名前（英数字）', hash: `#/routines/${R.longEn.id}/play`, screen: 'S5', kind: 'focus', seed: SEEDED, ops: 5, opsSmall: 4, speedAndPlay: true, chipToDock: true, singleLineHeading: true },
-  // 段8（Ruling 98）: 言語・声・「困った時は」の束（追加の方法・音が鳴らない時）・「先生の方へ」の束（録音・配る）・「プライバシー・アプリについて」＝5（上限ちょうど）。
-  // ops は固定しない（「S1 案内カード」と同じ扱い）: 1280×900 は 5 つとも初期表示・375×667 は「プライバシー・アプリについて」が下で 4・
-  // 375×548 は「先生の方へ」も下で 3（opsSmall）。生徒が使う 言語・声・「困った時は」の 2 行は 548 でも初期表示に入る（firstView）
-  { name: 'S6', hash: '#/settings', screen: 'S6', kind: 'list', opsSmall: 3, total: 5,
-    linkGroups: { help: ['ホーム画面に追加する方法', '音が鳴らない時'], teacher: ['自分の声を録音する', 'ルーティンを配る'] },
-    textKeys: ['settingsHelpHeading', 'forTeachers', 'settingsAbout'],
-    firstView: ['[data-group="language"]', 'a[href="#/voices"]', 'a[href="#/help/install"]', 'a[href="#/help/sound"]'] },
-  // Fable 答え 2: 生徒が使う 3 つ（言語・声・「ホーム画面に追加する方法」）は帯があっても 375×548 の初期表示に入る
-  // 段8: 帯があると 375×548 では「音が鳴らない時」の行も下（S11 は S2/S5 の枠からも行ける）。言語・声・「ホーム画面に追加する方法」は入ったまま（Ruling 98-1）
-  { name: 'S6 更新あり', hash: '#/settings?ui-state=update-ready', screen: 'S6', kind: 'list', opsSmall: 3, total: 5, alert: true, texts: ['新しい版があります。'], bannerAfter: 'h1',
-    firstView: ['[data-group="language"]', 'a[href="#/voices"]', 'a[href="#/help/install"]'] },
-  // 段4（Ruling 60・63）＋段5（Ruling 86-1）: S7 は 一覧 1＋「ファイルから受け取る」1＋「自分の声を録音する」1。行を開くと voice-actions が足される。
-  { name: 'S7 標準だけ', hash: '#/voices', screen: 'S7', kind: 'focus', ops: 3, total: 3, voiceRows: ['標準の声（英語）'] },
-  // 段8 Task 6 fix 1（レビュー I-1・Ruling 102-2）: S7 は読み込み中の形を通る。S6「声」・S2 の声チップから入っても、フォーカスは見出し（main に落ちない）
-  { name: 'S7（設定から）', hash: '#/voices', via: { hash: '#/settings', screen: 'S6' }, screen: 'S7', kind: 'focus', ops: 3, total: 3, focusHeading: true,
-    steps: [{ click: 'a[href="#/voices"]' }, { wait: '[data-screen="S7"]:not([data-loading])' }] },
-  // D56: S7 への入口は S2／S5 の声チップ（S1 の先生カードは無くなった。Ruling 115-5）
-  { name: 'S7（再生画面から）', hash: '#/voices', via: { hash: '#/practice/waltz', screen: 'S2' }, screen: 'S7', kind: 'focus', ops: 3, total: 3, focusHeading: true,
+  // D56（Ruling 115-4・118-3）: S6 は 言語・「困った時は」の束（追加の方法・音が鳴らない時）・「プライバシー・アプリについて」＝3（「声」は再生画面の声チップへ・
+  // 「先生の方へ」は表紙の「作る」へ）。375×548 でも 3 つとも初期表示に入る。左上「‹ 表紙」・下タブ無し
+  { name: 'S6', hash: '#/settings', screen: 'S6', kind: 'list', ops: 3, total: 3,
+    linkGroups: { help: ['ホーム画面に追加する方法', '音が鳴らない時'] },
+    textKeys: ['settingsHelpHeading', 'settingsAbout', 'backToCover'], absent: ['a[href="#/voices"]', '[data-group="teacher"]', 'a[href="#/voices/record"]', 'a[href="#/share"]'],
+    firstView: ['[data-group="language"]', 'a[href="#/help/install"]', 'a[href="#/help/sound"]', '.dc-settings-about'] },
+  // 帯があっても 375×548 で言語と「困った時は」は初期表示に入る（「プライバシー・アプリについて」は下でもよい＝ops は固定しない）
+  { name: 'S6 更新あり', hash: '#/settings?ui-state=update-ready', screen: 'S6', kind: 'list', total: 3, alert: true, texts: ['新しい版があります。'], bannerAfter: 'h1',
+    firstView: ['[data-group="language"]', 'a[href="#/help/install"]', 'a[href="#/help/sound"]'] },
+  // 段4（Ruling 60・63）＋段5（Ruling 86-1）＋D56（Ruling 115-5）: S7 は 一覧 1＋「ファイルから受け取る」1＝2。「自分の声を録音する」は表紙の「作る」へ移し、1 行の案内に。
+  // 行を開くと voice-actions が足される。
+  { name: 'S7 標準だけ', hash: '#/voices', screen: 'S7', kind: 'focus', ops: 2, total: 2, voiceRows: ['標準の声（英語）'], textKeys: ['recordFromMake'], absent: ['.dc-record-link'] },
+  // 段8 Task 6 fix 1（レビュー I-1・Ruling 102-2）: S7 は読み込み中の形を通る。D56: S7 への入口は S2／S5 の声チップ（S1 の先生カード・S6 の「声」は無くなった。Ruling 115-5）。
+  // フォーカスは見出し（main に落ちない）
+  { name: 'S7（再生画面から）', hash: '#/voices', via: { hash: '#/practice/waltz', screen: 'S2' }, screen: 'S7', kind: 'focus', ops: 2, total: 2, focusHeading: true,
     steps: [{ click: 'a.dc-chip-row' }, { wait: '[data-screen="S7"]:not([data-loading])' }] },
-  { name: 'S7 更新あり', hash: '#/voices?ui-state=update-ready', screen: 'S7', kind: 'focus', ops: 3, total: 3, alert: true, texts: ['新しい版があります。'], bannerAfter: 'h1' },
-  // 段8（Ruling 103-2）: 声が多い生徒（受け取った 20＋自分の声 2＝標準と合わせて 23 行）。一覧は data-choices-max=24 まで。下の 2 つのボタンはスクロールで届く（初期表示は固定しない）
-  { name: 'S7 声が多い（受け取った 20 本）', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, ...V.received20], total: 3, rows: 23 },
+  { name: 'S7 更新あり', hash: '#/voices?ui-state=update-ready', screen: 'S7', kind: 'focus', ops: 2, total: 2, alert: true, texts: ['新しい版があります。'], bannerAfter: 'h1' },
+  // 段8（Ruling 103-2）: 声が多い生徒（受け取った 20＋自分の声 2＝標準と合わせて 23 行）。一覧は data-choices-max=24 まで。下のボタンはスクロールで届く（初期表示は固定しない）
+  { name: 'S7 声が多い（受け取った 20 本）', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, ...V.received20], total: 2, rows: 23 },
   // 段8（Ruling 100-3）: 試聴で声が読めなかった時の枠（更新の帯はその間は出ない＝枠は 1 つ）
-  { name: 'S7 声が端末に無い', hash: '#/voices?ui-state=voice-missing', screen: 'S7', kind: 'focus', ops: 3, total: 3, alert: true,
+  { name: 'S7 声が端末に無い', hash: '#/voices?ui-state=voice-missing', screen: 'S7', kind: 'focus', ops: 2, total: 2, alert: true,
     texts: ['この声はまだ端末に入っていません。'] },
-  // 段5 Task 10b: 600px 未満の高さでは「ファイルから受け取る」「自分の声を録音する」を横 1 行に並べ、声が 3 本でも 375×548 の初期表示に入る
-  { name: 'S7 3 本', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, V.receivedJa], total: 3,
-    voiceRows: ['標準の声（英語）', '自分の声（英語）', '山田さんの声', '自分の声（日本語） · 7 / 12 語'], firstView: ['.dc-receive-link', '.dc-record-link'] },
-  { name: 'S7 行を開', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, V.receivedJa], total: 4,
+  // 段5 Task 10b・D56: 声が 3 本でも「ファイルから受け取る」は 375×548 の初期表示に入る
+  { name: 'S7 3 本', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, V.receivedJa], total: 2,
+    voiceRows: ['標準の声（英語）', '自分の声（英語）', '山田さんの声', '自分の声（日本語） · 7 / 12 語'], firstView: ['.dc-receive-link'] },
+  { name: 'S7 行を開', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, V.receivedJa], total: 3,
     actions: { group: 'voice-actions', labels: ['配る', '削除'] },
     steps: [{ click: '[data-group="voice"] [role="radio"] >> nth=1' }, { click: '[data-group="voice"] [role="radio"] >> nth=1' }] },
   // D37: 受け取った声は配れない（開いた行は「削除」だけ）
-  { name: 'S7 受け取った声を開', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, V.receivedJa], total: 4,
+  { name: 'S7 受け取った声を開', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, V.receivedJa], total: 3,
     actions: { group: 'voice-actions', labels: ['削除'] },
     steps: [{ click: '[data-group="voice"] [role="radio"] >> nth=2' }, { click: '[data-group="voice"] [role="radio"] >> nth=2' }] },
   { name: 'S7 削除の確認', hash: '#/voices?ui-state=confirm-delete', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn], confirm: true },
@@ -249,9 +246,9 @@ const STATES = [
   // 段8 Task 12（D51・final-review m2）: 録音もルーティンも無い時は帯に「先に…と配れます。」の 1 行（操作は増やさない＝名前と主ボタン（押せない）の 2）
   { name: 'S9 何も無い', hash: '#/share', screen: 'S9', kind: 'focus', ops: 2, total: 2, primaryDisabled: true, textKeys: ['shareNothingYet'], firstView: ['.dc-dock-note'] },
   { name: 'S9 録音なし', hash: '#/share', screen: 'S9', kind: 'focus', seed: [R.waltz13], ops: 3, total: 3, primaryDisabled: true, texts: ['録音した声はまだありません。'], firstView: ['[data-list]'] },
-  // 段8 Task 6 fix 1（レビュー I-1）: S6「ルーティンを配る」から（S9 も読み込み中の形を通る）。フォーカスは上の行の名前（h1）
-  { name: 'S9（設定から）', hash: '#/share', via: { hash: '#/settings', screen: 'S6' }, screen: 'S9', kind: 'focus', seed: [R.waltz13], ops: 3, total: 3, primaryDisabled: true,
-    focusHeading: true, steps: [{ click: 'a[href="#/share"]' }, { wait: '[data-screen="S9"]:not([data-loading])' }] },
+  // 段8 Task 6 fix 1（レビュー I-1）・D56: M0「配る（ファイルを作る）」から（S9 も読み込み中の形を通る）。フォーカスは上の行の名前（h1）
+  { name: 'S9（作るから）', hash: '#/share', via: { hash: '#/make', screen: 'M0' }, screen: 'S9', kind: 'focus', seed: [R.waltz13], ops: 3, total: 3, primaryDisabled: true,
+    focusHeading: true, steps: [{ click: 'a.dc-hub[href="#/share"]' }, { wait: '[data-screen="S9"]:not([data-loading])' }] },
   { name: 'S9 作った後', hash: '#/share', screen: 'S9', kind: 'focus', seed: [R.waltz13], voiceSeed: [V.completeEn], fakeShare: true, total: 6,
     texts: ['ファイルを送ったら、下の案内文も送ってください。', '生徒への案内文をコピー'], firstView: ['.dc-result', '.dc-share-done .dc-button'],
     steps: [{ fill: ['[data-group="distributor"] input', '山田'] }, { click: '[data-group="share-voice"] [role="radio"] >> nth=1' },
```

- [ ] **Step 2: 失敗を確かめる**

Run: `DC_BASE_URL=http://localhost:5185/ DC_ONLY="S6,S7" npm run -s ui:check | grep -E "件の違反" | wc -l`
Expected: 0 より大きい（S6 の total 5 ≠ 3・S7 の ops 3 ≠ 2・`.dc-record-link` が出ている）。`npm test` は `657`・`fail 0` のまま。

- [ ] **Step 3: 実装する**

`git apply --whitespace=nowarn .superpowers/sdd/role-split/t2-impl.diff` の後:

<!-- diff: t2-impl -->
```diff
diff --git a/src/app/i18n/messages.ts b/src/app/i18n/messages.ts
index 5f872eb..08b6129 100644
--- a/src/app/i18n/messages.ts
+++ b/src/app/i18n/messages.ts
@@ -30,6 +30,7 @@ export const APP_MESSAGES = {
     editFromMake: 'To edit or delete a routine, go to “Make” on the cover.',
     cannotPlayEmpty: 'No figures yet. You can fix this in “Make”.',
     cannotPlayFix: 'Some counts need fixing. You can fix this in “Make”.',
+    recordFromMake: 'To record your own voice, go to “Make” on the cover.',
     chooseDance: 'Choose a dance',
     danceGroup: 'Dances',
     lastTime: 'Last time',
@@ -180,7 +181,6 @@ export const APP_MESSAGES = {
     previewVoice: 'Preview',
     recordVoice: 'Record your voice',
     confirmDeleteVoiceTitle: 'Delete this voice?',
-    forTeachers: 'For teachers',
     recordTitle: 'Record your voice',
     recordIntro1: 'You will record 12 words, one at a time.',
     recordIntro2: 'Recordings stay on this device only.',
@@ -321,6 +321,7 @@ export const APP_MESSAGES = {
     editFromMake: 'ルーティンを直す・消す時は、表紙の「作る」から。',
     cannotPlayEmpty: 'フィガーがありません。「作る」で直せます。',
     cannotPlayFix: 'カウントに直す所があります。「作る」で直せます。',
+    recordFromMake: '自分の声の録音は、表紙の「作る」から。',
     chooseDance: '種目を選んでください',
     danceGroup: '種目',
     lastTime: '前回',
@@ -467,7 +468,6 @@ export const APP_MESSAGES = {
     previewVoice: '試聴',
     recordVoice: '自分の声を録音する',
     confirmDeleteVoiceTitle: 'この声を削除しますか？',
-    forTeachers: '先生の方へ',
     recordTitle: '自分の声を録音',
     recordIntro1: '12 語を、1 語ずつ録音します。',   // 12 の項目は「語」に統一（進み具合・「前の語」と同じ）
     recordIntro2: '録音は、この端末の中にだけ残ります。',
diff --git a/src/app/screens/SettingsScreen.tsx b/src/app/screens/SettingsScreen.tsx
index 56421b3..d448cd0 100644
--- a/src/app/screens/SettingsScreen.tsx
+++ b/src/app/screens/SettingsScreen.tsx
@@ -7,8 +7,6 @@ import type { AppLocale, MessageKey } from '../i18n/index.ts';
 import { phrased } from '../i18n/phrased.tsx';
 import { buildHash, type ScreenId } from '../router/routes.ts';
 import { useI18n } from '../state/i18n.ts';
-import { DEFAULT_VOICE, voiceDisplayName } from '../voices/selection.ts';
-import { usePlaybackVoice } from '../voices/use-playback-voice.ts';
 
 const LANGUAGES: Array<{ locale: AppLocale; label: string; lang: string }> = [
   { locale: 'ja-JP', label: '日本語', lang: 'ja' },
@@ -21,18 +19,14 @@ const GROUPS: Array<{ group: string; heading: MessageKey; rows: Array<{ screen:
   { group: 'help', heading: 'settingsHelpHeading', rows: [
     { screen: 'S12', icon: 'plus-square', label: 'settingsInstall' },
     { screen: 'S11', icon: 'alert', label: 'soundHelpTitle' }
-  ] },
-  { group: 'teacher', heading: 'forTeachers', rows: [
-    { screen: 'S8', icon: 'mic', label: 'recordVoice' },
-    { screen: 'S9', icon: 'share', label: 'shareRoutines' }
   ] }
 ];
 
-// S6 設定（仕様 §4 S6・Ruling 60-8・98）。上から: 言語（切替は即保存。Ruling 26）・声（→ S7。今の声の名前を右に）・
-// 「困った時は」（S12・S11）・「先生の方へ」（S8・S9）・「プライバシー・アプリについて」（→ S13。版を右に）＝主要操作 5（上限ちょうど。v1 ではもう足さない）
+// S6 設定（仕様 §4 S6・Ruling 60-8・98・D56 Ruling 115-4）。表紙の行から来る（左上「‹ 表紙」・下タブ無し）。上から: 言語（切替は即保存。Ruling 26）・
+// 「困った時は」（S12・S11）・「プライバシー・アプリについて」（→ S13。版を右に）＝主要操作 3。
+// 「声」は再生画面の声チップから（D56-(3)）、「先生の方へ」（録音・配る）は表紙の「作る」へ移した（Ruling 115-4）
 export function SettingsScreen() {
   const { translator, setLocale } = useI18n();
-  const { voice } = usePlaybackVoice();
   return (
     <main class="dc-screen" data-screen="S6">
       <BackButton screen="S6" />
@@ -51,12 +45,6 @@ export function SettingsScreen() {
           );
         })}
       </div>
-      <a class="dc-link-row" href={buildHash({ screen: 'S7', params: {} })}>
-        <Icon name="voice" />
-        <span class="dc-link-label">{translator.t('voicesTitle')}</span>
-        <small class="dc-link-value">{voiceDisplayName(translator, voice ?? DEFAULT_VOICE, 'chip')}</small>
-        <Icon name="chev-r" />
-      </a>
       {GROUPS.map(({ group, heading, rows }) => (
         <div key={group} class="dc-settings-group" role="group" aria-labelledby={`dc-s6-${group}`} data-group={group}>
           <h2 class="dc-field-label dc-settings-section" id={`dc-s6-${group}`}>{translator.t(heading)}</h2>
diff --git a/src/app/screens/VoicesScreen.tsx b/src/app/screens/VoicesScreen.tsx
index 420166d..61b1194 100644
--- a/src/app/screens/VoicesScreen.tsx
+++ b/src/app/screens/VoicesScreen.tsx
@@ -3,6 +3,7 @@ import { BackButton } from '../components/BackButton.tsx';
 import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
 import { Icon } from '../components/Icon.tsx';
 import { UpdateBanner } from '../components/UpdateBanner.tsx';
+import { phrased } from '../i18n/phrased.tsx';
 import { NoticeBox } from '../practice/controls.tsx';
 import { usePracticeSession } from '../practice/use-session.ts';
 import { voiceOffsetFor } from '../practice/voice-offset.ts';
@@ -21,7 +22,7 @@ import { VOICE_LIMITS, isCompletePack, listVoicePacks, packProgress, removeVoice
 // S7 声（仕様 §4 S7・Ruling 60・61）。一覧 [data-group="voice"]（role="radiogroup"）: 標準 → 自分の声（完成）→ 受け取った声 → 途中の声。
 // 1 回目のタップで選ぶ（selectedVoiceId と voiceLocale を一緒に書く）。選んだ行には「▶ 試聴」（ワルツ 1 小節）。
 // 選んでいる自分の声・受け取った声をもう一度タップすると行が開き「削除」（同時に 1 つ）。途中の声は選べない行（role="button"）で、
-// タップすると開いて「続きを録音する」と「削除」（計画 Open question 1）。下に「自分の声を録音する」（→ S8）。
+// タップすると開いて「続きを録音する」と「削除」（計画 Open question 1）。D56（Ruling 115-5）: 「自分の声を録音する」のボタンは表紙の「作る」へ移し、1 行の案内に。
 // 段5（Ruling 86-1・D37）: 下に「ファイルから受け取る」（→ S10）。開いた録音の声に「配る」（→ S9 にこの声を選んだ状態で）。受け取った声は「削除」だけ。
 // 「ファイルに保存」は作らない（Ruling 82-3）。ui-state=confirm-delete は最初の録音の声の削除確認を見た目だけ出す。
 // 段8（Ruling 100-3）: 試聴で声が読めなかった（オフラインでまだ端末に入っていない）時は §11 の「この声はまだ端末に入っていません。…」の枠。
@@ -144,15 +145,12 @@ export function VoicesScreen({ uiState }: { uiState?: UiState }) {
           );
         })}
       </div>
-      {/* 600px 未満の高さでは 2 つを横 1 行に並べる（段5 Task 10b・CSS の .dc-voice-entry）。600px 以上は縦のまま */}
       <div class="dc-voice-entry">
         <a class="dc-button dc-button--secondary dc-wide dc-receive-link" href={buildHash({ screen: 'S10', params: {} })}>
           <span>{translator.t('receiveFromFile')}</span>
         </a>
-        <a class="dc-button dc-primary dc-wide dc-record-link" href={buildHash({ screen: 'S8', params: {} })}>
-          <Icon name="mic" /><span>{translator.t('recordVoice')}</span>
-        </a>
       </div>
+      <div class="dc-hint dc-record-in-make">{phrased(translator, 'recordFromMake')}</div>
       {deleting && (
         <ConfirmDialog title={translator.t('confirmDeleteVoiceTitle')} detail={packDisplayName(translator, deleting)} confirmLabel={translator.t('confirmDelete')}
           onCancel={() => setDeleting(null)} onConfirm={() => confirmDelete(deleting)} />
diff --git a/src/app/styles/base.css b/src/app/styles/base.css
index 7740079..f4f421c 100644
--- a/src/app/styles/base.css
+++ b/src/app/styles/base.css
@@ -335,7 +335,6 @@ button { cursor: pointer; }
 .dc-voice-actions { padding: 8px 10px 12px; }  /* 行のボタンとの間隔 8px（U3） */
 /* 「続きを録音する」を語の途中で折らない（375 で 2 行・320 で 3 行に割れた）。入らない幅では 2 つのボタンが縦に並ぶ */
 .dc-voice-actions .dc-button--secondary { flex: 1 0 auto; white-space: nowrap; }
-.dc-record-link { margin-top: 24px; }
 
 /* S8 録音（Ruling 59・モック b-studio-navy の S8）。375×667 で 1 語の画面が初期表示に収まる寸法 */
 :root { --rec: #1B2A4A; --rec-ring: #E4E7EE; }
@@ -492,13 +491,10 @@ button { cursor: pointer; }
 .dc-receive .dc-alert-text { line-height: 1.3; }
 /* S7 の下の 2 ボタン（Ruling 86-1）: 「ファイルから受け取る」（上・白）→「自分の声を録音する」（下・紺） */
 .dc-receive-link { margin-top: 24px; }
-.dc-receive-link + .dc-record-link { margin-top: 12px; }
-/* 見える高さ 600px 未満（375×548）では 2 つを横 1 行に並べ、声が 3 本でも両方が初期表示に入る（段5 Task 10b）。
-   文言は語の途中で折らない（nowrap・16px・アイコンなし）。入らない幅（320）では折り返して縦に積む（flex-wrap） */
+.dc-record-in-make { margin-top: 12px; }
+/* D56（Ruling 115-5）: S7 の下は「ファイルから受け取る」1 つ＋案内の 1 行（録音のボタンは「作る」へ）。548 では詰める */
 @media (max-height: 599px) and (max-width: 1023px) {
-  .dc-voice-entry { display: flex; flex-wrap: wrap; gap: 12px 8px; margin-top: 24px; }
-  .dc-voice-entry .dc-button { flex: 1 1 auto; width: auto; margin-top: 0; padding: 0 6px; font-size: 16px; white-space: nowrap; }
-  .dc-voice-entry .dc-button .dc-ic { display: none; }
+  .dc-voice-entry .dc-receive-link { margin-top: 16px; }
 }
 /* S8 完成のバックアップの 1 行（Ruling 86-2。操作ではない・16px） */
 .dc-backup-tip { margin-top: 12px; }
```

```bash
npm run i18n:phrases && npm run copy:sheet
```

- [ ] **Step 4: 通ることを確かめる**

Expected: `tests 657`・`fail 0`、`typecheck-ok`、ui:check **748 PASS**（106 状態）、スモーク 4 本 OK。目で: S6（「‹ 表紙」・言語・「困った時は」の 2 行・「プライバシー・アプリについて 版 0.3.0」）と S7（「ファイルから受け取る」の下に「自分の声の録音は、表紙の「作る」から。」）を 375×548・320×568 で。

- [ ] **Step 5: コミット**

```bash
git add src/app/screens/SettingsScreen.tsx src/app/screens/VoicesScreen.tsx src/app/i18n/messages.ts src/app/styles/base.css \
  src/app/i18n/ja-phrases.json docs/app-v1/stage8-copy-review.md tools/check-app-ui.js
git commit -m "feat(app): 設定は 3 つ・声の一覧の録音は「作る」へ（D56・Ruling 115-4・115-5）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: カウントの型の帯 — 丸は型 1 周の語（S2 は型・S5 は鳴っているフィガー）・幅は語の長さ・12 語ずつ

**担当:** Opus。**Ruling 114（1〜10）。**

**Files:**
- Modify: `src/app/practice/beat-indicator.ts`（`beatIndexInBar` を廃止し `stripCells`・`stripView`・`idleProgram`・`MAX_STRIP_CELLS`）・`src/app/practice/session.ts`（`SessionView.program`・`programView`。`compileProgram` は 1 回だけ呼んでエンジンと帯に同じ物を渡す）・`src/app/practice/controls.tsx`（`CountBox` の props を `strip` に）・`src/app/screens/{Practice,RoutinePlay}Screen.tsx`・`src/app/styles/base.css`
- Test: `test/app/practice/beat-indicator.test.ts`（差し替え）・`tools/check-app-ui.js`（帯の 4 状態・全状態の 1 行／12 個まで・U1 の本文の規則から帯を外す）・`tools/ui-check-routines.js`（15 語のフィガー `waltzLongFigure`）・`tools/smoke-practice.js`（ジャイブの点灯の順）

**Interfaces:**
- Produces: `StripProgram { events; figures?; endTick }`・`StripCell { label; kind: 'beat'|'sub'|'rest'; beats; tick }`・`StripView { cells; lit }`。`SessionView.program: StripProgram | null`（`IDLE_VIEW` は null・▶ で入り、■・戻る・自然な終わりで null）。`CountBox({ …, strip })`。`li[data-cell]`・`style="--beats: n"`・`[data-fineprint]`（a・& と 9 個以上）・`ol[data-dense]`。
- Consumes: エンジンの `compileRhythm`／`compileRoutine` の戻り値（`events[].absoluteTick`・`voiceKey`・`token`・`figureIndex`・`figures[].endTick`・`durationTicks`）。**`src/engine` は変えない**。

**決まり**: 点く丸は `absoluteTick ≤ originalTick` の最後の語。`originalTick` が null（停止・はじめの合図）なら点けない。S5 は `view.figureIndex` のフィガーだけ・ルーティン全体の tick で。止まっている間は S2 が今の型・S5 が始めのフィガーを `idleProgram`（表示のためだけ）で。`profile.beatsPerBar` は帯に使わない。S2 の見出しの下の型の文字は残す（Ruling 114-8）。

- [ ] **Step 1: 失敗するテストと検査を書く**

`git apply --whitespace=nowarn .superpowers/sdd/role-split/t3-test.diff`:

<!-- diff: t3-test -->
```diff
diff --git a/test/app/practice/beat-indicator.test.ts b/test/app/practice/beat-indicator.test.ts
index 232ddb1..c5d7a37 100644
--- a/test/app/practice/beat-indicator.test.ts
+++ b/test/app/practice/beat-indicator.test.ts
@@ -1,22 +1,59 @@
 import test from 'node:test';
 import assert from 'node:assert/strict';
-import { beatIndexInBar } from '../../../src/app/practice/beat-indicator.ts';
+import { compileRoutine } from '../../../src/engine/rhythm-compiler.js';
+import { MAX_STRIP_CELLS, idleProgram, stripCells, stripView } from '../../../src/app/practice/beat-indicator.ts';
+import { programView } from '../../../src/app/practice/session.ts';
 
-test('beat index follows the tick within the bar', () => {
-  assert.equal(beatIndexInBar(0, 3), 0);
-  assert.equal(beatIndexInBar(959, 3), 0);
-  assert.equal(beatIndexInBar(960, 3), 1);
-  assert.equal(beatIndexInBar(2 * 960 + 480, 3), 2);
-  assert.equal(beatIndexInBar(3 * 960, 3), 0);
-  assert.equal(beatIndexInBar(7 * 960, 4), 3);
-  assert.equal(beatIndexInBar(960, 2), 1);
+// D55・Ruling 114: 丸は型 1 周の語。幅（beats）は語の長さ。点く丸は tick が originalTick 以下の最後の語（エンジンの tick だけ）
+const labels = (danceId: string, counts: string) => stripCells(idleProgram(danceId, counts)).map(cell => cell.label);
+const beats = (danceId: string, counts: string) => stripCells(idleProgram(danceId, counts)).map(cell => cell.beats);
+
+test('jive 123a45a6 is 8 cells with the a cells a quarter beat long (Ruling 114-1・114-2)', () => {
+  assert.deepEqual(labels('jive', '123a45a6'), ['1', '2', '3', 'a', '4', '5', 'a', '6']);
+  assert.deepEqual(beats('jive', '123a45a6'), [1, 1, 0.75, 0.25, 1, 0.75, 0.25, 1]);
+  assert.deepEqual(stripCells(idleProgram('jive', '123a45a6')).map(cell => cell.kind), ['beat', 'beat', 'beat', 'sub', 'beat', 'beat', 'sub', 'beat']);
+});
+
+test('cha cha starts on 2, tango S is twice Q, samba SQQ halves, waltz 123 is 3 cells', () => {
+  assert.deepEqual(labels('chacha', '234&1'), ['2', '3', '4', '&', '1']);
+  assert.deepEqual(beats('tango', 'SSQQS'), [2, 2, 1, 1, 2]);
+  assert.deepEqual(beats('samba', 'SQQ'), [1, 0.5, 0.5]);
+  assert.deepEqual(labels('waltz', '123'), ['1', '2', '3']);
+});
+
+test('a silent @ is a cell without a label (time still moves)', () => {
+  const cells = stripCells(idleProgram('waltz', '12@3'));
+  assert.deepEqual(cells.map(cell => [cell.label, cell.kind]), [['1', 'beat'], ['2', 'beat'], ['', 'rest'], ['3', 'beat']]);
+});
+
+test('the lit cell follows the engine tick only; no tick or a tick before the first word lights nothing (Ruling 114-4)', () => {
+  const cells = stripCells(idleProgram('jive', '123a45a6'));
+  assert.equal(stripView(cells, 0).lit, 0);
+  assert.equal(stripView(cells, 2640).lit, 3);   // a
+  assert.equal(stripView(cells, 2879).lit, 3);
+  assert.equal(stripView(cells, 5759).lit, 7);   // 6
+  for (const tick of [null, undefined, Number.NaN]) assert.equal(stripView(cells, tick).lit, null);
+  const routine = compileRoutine({ danceId: 'waltz', figures: [{ id: 'a', name: 'A', counts: '123' }, { id: 'b', name: 'B', counts: '123' }] });
+  assert.equal(stripView(stripCells(programView(routine), 1), 100).lit, null, 'before the first word of the figure');
 });
 
-test('no tick (stopped or lead-in) means no lit beat', () => {
-  for (const tick of [null, undefined, Number.NaN, Infinity]) assert.equal(beatIndexInBar(tick, 3), null);
-  assert.equal(beatIndexInBar(0, 0), null);
+test('more than 12 words are shown 12 at a time; the page follows the lit word, stopped shows page 1 (Ruling 114-3)', () => {
+  const counts = '1231231231231';   // 13 語（S5 の長いフィガー）
+  const cells = stripCells(idleProgram('waltz', counts));
+  assert.equal(cells.length, 13);
+  assert.equal(stripView(cells, null).cells.length, MAX_STRIP_CELLS);
+  const last = stripView(cells, cells[12]!.tick);
+  assert.deepEqual([last.cells.length, last.lit], [1, 0]);
+  assert.deepEqual([stripView(cells, cells[11]!.tick).cells.length, stripView(cells, cells[11]!.tick).lit], [12, 11]);
 });
 
-test('a negative tick (pickup) still lands inside the bar', () => {
-  assert.equal(beatIndexInBar(-240, 4), 3);
+test('S5: the cells are the sounding figure only and light on the absolute routine tick', () => {
+  const routine = compileRoutine({ danceId: 'waltz', figures: [{ id: 'a', name: 'A', counts: '123' }, { id: 'b', name: 'B', counts: '123123' }] });
+  const program = programView(routine);
+  const second = stripCells(program, 1);
+  assert.deepEqual(second.map(cell => cell.label), ['1', '2', '3', '1', '2', '3']);
+  assert.equal(second[0]!.tick, 2880);
+  assert.equal(second.at(-1)!.beats, 1, 'the last word runs to the end of the figure');
+  assert.equal(stripView(second, 2880 + 960).lit, 1);
+  assert.deepEqual(program.figures, [{ startTick: 0, endTick: 2880 }, { startTick: 2880, endTick: 8640 }]);
 });
diff --git a/tools/check-app-ui.js b/tools/check-app-ui.js
index 4b4b8a6..1e3b5cf 100644
--- a/tools/check-app-ui.js
+++ b/tools/check-app-ui.js
@@ -76,7 +76,10 @@ const STATES = [
   { name: 'S1 案内カード', hash: '#/use', screen: 'S1', kind: 'root', settingsSeed: PLAYED, userAgent: IOS_SAFARI_UA, total: 4, tilesInView: true,
     texts: ['ホーム画面に追加すると、アプリのように使えます', '閉じる'], placed: [['[data-install-card]', '.dc-tiles']] },
   { name: 'S1 案内カード（PC では出ない）', hash: '#/use', screen: 'S1', kind: 'root', settingsSeed: PLAYED, ops: 2, total: 2, tilesInView: true, absent: ['[data-install-card]'] },
-  { name: 'S2 くわしく閉', hash: '#/practice/waltz', screen: 'S2', kind: 'focus', ops: 5, speedAndPlay: true },
+  { name: 'S2 くわしく閉', hash: '#/practice/waltz', screen: 'S2', kind: 'focus', ops: 5, speedAndPlay: true, strip: { labels: '1 2 3' } },
+  // D55（Ruling 114）: カウントの型の帯。ジャイブは 6 拍の型の 8 語（a も丸）・タンゴは S が Q の 2 倍の幅・320 でも 1 行
+  { name: 'S2 ジャイブの帯', hash: '#/practice/jive', screen: 'S2', kind: 'focus', ops: 5, speedAndPlay: true, strip: { labels: '1 2 3 a 4 5 a 6' } },
+  { name: 'S2 タンゴの帯', hash: '#/practice/tango', screen: 'S2', kind: 'focus', ops: 5, speedAndPlay: true, strip: { labels: 'S S Q Q S', wide: [0, 2] } },
   { name: 'S2 くわしく開', hash: '#/practice/waltz', screen: 'S2', kind: 'focus', openMore: true, total: 9, voiceOffset: '±0 ms' },
   { name: 'S2 音が出ない', hash: '#/practice/waltz?ui-state=no-sound', screen: 'S2', kind: 'focus', speedAndPlay: true, alert: true },
   { name: 'S2 画面が暗くなる案内', hash: '#/practice/jive?ui-state=wakelock-tip', screen: 'S2', kind: 'focus', speedAndPlay: true, alert: true },
@@ -154,7 +157,10 @@ const STATES = [
   { name: 'S4 小節の注意', hash: `#/routines/${R.waltzOffBar.id}/edit`, screen: 'S4', kind: 'focus', seed: [...SEEDED, R.waltzOffBar], total: 5, barNote: true },
   // ↑ ops は固定しない: 375×667 では注意の行のぶん「＋ フィガーを追加」が下の帯の下に隠れて初期表示 4、1280 幅では 5（「S4 13件・閉」と同じ扱い。U4 の上限 5 は当たる）
   // opsSmall: 375×548（Safari SE）では声チップが帯の下＝初期表示 4（Ruling 71-6）
-  { name: 'S5 くわしく閉', hash: S5_13, screen: 'S5', kind: 'focus', seed: SEEDED, ops: 5, opsSmall: 4, speedAndPlay: true, chipToDock: true, singleLineHeading: true },
+  { name: 'S5 くわしく閉', hash: S5_13, screen: 'S5', kind: 'focus', seed: SEEDED, ops: 5, opsSmall: 4, speedAndPlay: true, chipToDock: true, singleLineHeading: true, strip: { labels: '1 2 3' } },
+  // D55（Ruling 114-3）: 15 語のフィガーは 12 語ずつ（止まっている間は 1 頁目）
+  { name: 'S5 長いフィガーの帯', hash: `#/routines/${R.waltzLongFigure.id}/play`, screen: 'S5', kind: 'focus', seed: [R.waltzLongFigure], ops: 5, opsSmall: 4, speedAndPlay: true,
+    strip: { labels: '1 2 3 1 2 3 1 2 3 1 2 3' } },
   { name: 'S5 くわしく開', hash: S5_13, screen: 'S5', kind: 'focus', seed: SEEDED, openMore: true, total: 9 },
   { name: 'S5 音が出ない', hash: `${S5_13}?ui-state=no-sound`, screen: 'S5', kind: 'focus', seed: SEEDED, speedAndPlay: true, alert: true },
   { name: 'S5 再生が止まった', hash: `${S5_13}?ui-state=stopped`, screen: 'S5', kind: 'focus', seed: SEEDED, speedAndPlay: true, alert: true,
@@ -624,7 +630,8 @@ function audit({ state, LIMITS, reducedMotion }) {
     const fineprint = element.closest('[data-fineprint]');
     if (size < LIMITS.fineprintFont - 0.01) issues.push(`U1 font ${size}px < ${LIMITS.fineprintFont} ${describe(element)}`);
     else if (!fineprint && size < LIMITS.minFont - 0.01) issues.push(`U1 font ${size}px < ${LIMITS.minFont} ${describe(element)}`);
-    else if (element.closest('p, li, [data-body]') && size < LIMITS.bodyFont - 0.01) issues.push(`U1 body font ${size}px < ${LIMITS.bodyFont} ${describe(element)}`);
+    // D55: カウントの型の帯（ol.dc-beats の li）は本文ではなく丸の中の 1 字（aria-hidden。a・& と 9 個以上は 14・15px の data-fineprint）
+    else if (element.closest('p, li, [data-body]') && !element.closest('.dc-beats') && size < LIMITS.bodyFont - 0.01) issues.push(`U1 body font ${size}px < ${LIMITS.bodyFont} ${describe(element)}`);
   }
 
   // U2 主要ボタン
@@ -1009,6 +1016,22 @@ function audit({ state, LIMITS, reducedMotion }) {
     }
     if (form?.querySelector('.dc-primary')?.disabled) issues.push('D52 "Add" is not pressable after the counts were filled in');
   }
+  // D55（Ruling 114-2・114-3）: 帯は 1 行で枠からはみ出さない（320 でも）・丸は 12 まで・状態の期待（語の並び・S が Q の 2 倍）
+  for (const strip of document.querySelectorAll('.dc-beats')) {
+    if (!visible(strip)) continue;
+    const cells = [...strip.children];
+    if (strip.scrollWidth > strip.clientWidth + 1) issues.push(`R114 the count strip overflows ${strip.scrollWidth} > ${strip.clientWidth}`);
+    if (cells.length > 12) issues.push(`R114 the count strip has ${cells.length} cells > 12`);
+    if (new Set(cells.map(cell => Math.round(cell.getBoundingClientRect().top))).size > 1) issues.push('R114 the count strip wraps to a second line');
+    if (state.strip) {
+      const labels = cells.map(cell => cell.textContent.trim()).join(' ');
+      if (labels !== state.strip.labels) issues.push(`R114 the strip reads "${labels}", expected "${state.strip.labels}"`);
+      if (state.strip.wide) {
+        const [wide, narrow] = state.strip.wide.map(index => cells[index]?.getBoundingClientRect().width ?? 0);
+        if (!(wide > narrow * 1.6)) issues.push(`R114 a slow cell (${Math.round(wide)}px) is not about twice a quick cell (${Math.round(narrow)}px)`);
+      }
+    }
+  }
   // D56（Ruling 115-1・115-3）: 表紙の扉の説明・M0 の行の状態の 1 行は 4 行まで（320 幅の日本語で 4 行。名前「使う」「作る」・行の名前は U10 の 2 行の規則のまま）
   for (const description of document.querySelectorAll('[data-description]')) {
     if (!visible(description)) continue;
diff --git a/tools/smoke-practice.js b/tools/smoke-practice.js
index 8845ae1..8f4c576 100644
--- a/tools/smoke-practice.js
+++ b/tools/smoke-practice.js
@@ -7,7 +7,8 @@
 import { chromium } from 'playwright-core';
 
 const BASE = process.env.DC_BASE_URL ?? 'http://localhost:5173/';
-const SOUND_TIMEOUT_MS = 10000;   // はじめの合図（2小節。ワルツ♩=84で約4.3秒、D17）＋声の読み込みを待っても、この間にカウントが3種類変わること
+const SOUND_TIMEOUT_MS = 10000;
+const STRIP_WATCH_MS = 9000;      // ジャイブ（はじめの合図 2 小節＋型 1 周以上）を見る長さ   // はじめの合図（2小節。ワルツ♩=84で約4.3秒、D17）＋声の読み込みを待っても、この間にカウントが3種類変わること
 const errors = [];
 const browser = await chromium.launch({ channel: 'chrome' });
 
@@ -85,6 +86,31 @@ try {
   await page.locator('[data-back]').click();
   await page.waitForSelector('[data-screen="S0"]');
   if (!page.url().endsWith('#/')) errors.push(`"‹ Cover" without history should replace with #/ (url ${page.url()})`);
+
+  // D55（Ruling 114-9）: ジャイブを鳴らすと、帯の琥珀の丸（aria-current）が 1 2 3 a 4 5 a 6 の順に進み、大きな語と同じ文字。時間は実再生・判定は順序だけ
+  await page.goto(`${BASE}#/practice/jive`);
+  await page.waitForSelector('[data-screen="S2"]');
+  await page.locator('[data-play]').click();
+  const strip = [];
+  const stripEnd = Date.now() + STRIP_WATCH_MS;
+  while (Date.now() < stripEnd) {
+    strip.push(await page.evaluate(() => {
+      const cells = [...document.querySelectorAll('.dc-beats li')];
+      const lit = cells.findIndex(cell => cell.getAttribute('aria-current') === 'true');
+      return { lit, label: lit >= 0 ? cells[lit].textContent.trim() : null, now: document.querySelector('.dc-now')?.textContent.trim() ?? '', cells: cells.length };
+    }));
+    await page.waitForTimeout(40);
+  }
+  await page.locator('[data-play]').click();
+  const lit = strip.filter(sample => sample.lit >= 0);
+  if (strip.some(sample => sample.cells !== 8)) errors.push(`D55: the jive strip should have 8 cells (${[...new Set(strip.map(sample => sample.cells))].join(', ')})`);
+  const steps = lit.map(sample => sample.lit).filter((index, i, all) => i === 0 || index !== all[i - 1]);
+  const backwards = steps.filter((index, i) => i > 0 && index < steps[i - 1] && !(index === 0 && steps[i - 1] >= 6));
+  if (backwards.length) errors.push(`D55: the lit cell moved backwards ${JSON.stringify(steps)}`);
+  if (!['1', '2', '3', '4', '5', '6'].every(label => lit.some(sample => sample.label === label))) errors.push(`D55: the lit cell did not visit 1–6 (${[...new Set(lit.map(sample => sample.label))].join(' ')})`);
+  if (!steps.some((index, i) => i > 0 && index === 0 && steps[i - 1] >= 6)) errors.push(`D55: the strip did not wrap from 6 back to 1 (${JSON.stringify(steps)})`);
+  const disagree = lit.filter(sample => sample.now && sample.label !== sample.now).length;
+  if (disagree > lit.length * 0.1) errors.push(`D55: the lit cell and the big count disagree in ${disagree} of ${lit.length} samples`);
   await context.close();
 } finally {
   await browser.close();
@@ -94,4 +120,4 @@ if (errors.length) {
   console.error(errors.join('\n'));
   process.exit(1);
 }
-console.log('practice smoke OK: G1 (3 taps from the cover) and G2 (1 tap: the U1 card and the cover) play, tabs do not stack history, reload does not autoplay, back falls back to the parent');
+console.log('practice smoke OK: the jive strip lights 1 2 3 a 4 5 a 6 in order with the big count; G1 (3 taps from the cover) and G2 (1 tap: the U1 card and the cover) play, tabs do not stack history, reload does not autoplay, back falls back to the parent');
diff --git a/tools/ui-check-routines.js b/tools/ui-check-routines.js
index a4e4411..0444d3b 100644
--- a/tools/ui-check-routines.js
+++ b/tools/ui-check-routines.js
@@ -43,9 +43,16 @@ export const UI_CHECK_ROUTINES = {
   longJa: routine('r-uicheck-longja40', 'waltz', LONG_JA, 3, 2, LONG_FIGURE),
   longEn: routine('r-uicheck-longen40', 'jive', LONG_EN, 3, 3),
   waltzOffBar: offBarRoutine(),
-  waltzAuto: autoCountsRoutine()
+  waltzAuto: autoCountsRoutine(),
+  waltzLongFigure: longFigureRoutine()
 };
 
+// D55・Ruling 114-3: 13 語以上のフィガー（15 語）を持つワルツ。S5 の帯は 12 語ずつの頁（li は 12 まで）。名前は照合済みの語、カウントは型 123 の 5 回（打った値の見本・正しいカウントを名乗らない）
+function longFigureRoutine() {
+  const base = routine('r-uicheck-waltzlong', 'waltz', 'ワルツの長いフィガー', 0, 6);
+  return { ...base, figures: [{ id: 'f-uicheck-0000', name: 'ナチュラルターン', counts: '123123123123123' }, { id: 'f-uicheck-0001', name: 'リバースターン', counts: '123' }] };
+}
+
 // D52・Ruling 112-3: 「前に使ったカウント」の検査用の 2 本目のワルツ。waltz13 に無い一覧の 17 番目のフィガーを templates[1]（12&3）で持つ。
 // S4 の waltz13 の追加の行でこの名前をタップすると、欄に 12&3 が入り、形のチップが 1 つ押され、「前に使ったカウントです」の行が出る。
 function autoCountsRoutine() {
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npm test 2>&1 | grep -E "^ℹ (tests|fail)"`
Expected: `tests 655`・**`fail 1`**（`beat-indicator.test.ts` が `stripCells` などを読めずに落ちる）。

- [ ] **Step 3: 実装する**

`git apply --whitespace=nowarn .superpowers/sdd/role-split/t3-impl.diff`:

<!-- diff: t3-impl -->
```diff
diff --git a/src/app/practice/beat-indicator.ts b/src/app/practice/beat-indicator.ts
index da4fa60..f9d6249 100644
--- a/src/app/practice/beat-indicator.ts
+++ b/src/app/practice/beat-indicator.ts
@@ -1,10 +1,48 @@
 import { TICKS_PER_BEAT } from '../../engine/dance-profiles.js';
+import { compileRhythm } from '../../engine/rhythm-compiler.js';
+import { displayForVoiceKey } from '../lib/count-display.ts';
 
-// 拍インジケータの「いま何拍目か」（0 始まり）。tick はエンジンの onFrame が返す originalTick だけを使う
-// （時刻から拍を計算し直さない: 第2の時間計算を作らない）。tick が無い（停止中・はじめの合図の間）は null。
-export function beatIndexInBar(originalTick: number | null | undefined, beatsPerBar: number): number | null {
-  if (typeof originalTick !== 'number' || !Number.isFinite(originalTick) || !(beatsPerBar > 0)) return null;
-  const barTicks = beatsPerBar * TICKS_PER_BEAT;
-  const inBar = ((originalTick % barTicks) + barTicks) % barTicks;
-  return Math.floor(inBar / TICKS_PER_BEAT);
+// カウントの型の帯（D55・Ruling 114）。丸は小節の拍でなく「型 1 周の語」を 1 つずつ並べ、鳴っている語の丸が琥珀。
+// 時間はエンジンの tick（onFrame の originalTick）だけを使う（時刻から拍を計算し直さない・setTimeout で進めない＝第2の時間計算を作らない）。
+// 型はセッションがエンジンに渡した compiled（SessionView.program）をそのまま読む。止まっている間だけ、表示のために compileRhythm を呼ぶ（idleProgram）。
+export const MAX_STRIP_CELLS = 12;   // 13 語以上のフィガーは 12 語ずつの頁（Ruling 114-3。COUNTS_MAX 32 文字なので最大 3 頁）
+const SUB_TOKENS = new Set(['a', '&', 'e']);
+
+export interface StripEvent { token?: string; voiceKey?: string | null; absoluteTick: number; figureIndex?: number }
+export interface StripProgram { events: readonly StripEvent[]; figures?: readonly { startTick: number; endTick: number }[]; endTick: number }
+export interface StripCell { label: string; kind: 'beat' | 'sub' | 'rest'; beats: number; tick: number }
+export interface StripView { cells: StripCell[]; lit: number | null }
+
+// 型（S2）またはルーティンの 1 フィガー（S5。figureIndex で絞る）の語を 1 語 1 丸に。beats＝次の語までの拍数（最後は型・フィガーの終わりまで）
+export function stripCells(program: StripProgram, figureIndex: number | null = null): StripCell[] {
+  const events = figureIndex === null ? program.events : program.events.filter(event => event.figureIndex === figureIndex);
+  const end = figureIndex === null ? program.endTick : program.figures?.[figureIndex]?.endTick ?? program.endTick;
+  return events.map((event, index) => {
+    const next = events[index + 1]?.absoluteTick ?? end;
+    const rest = !event.voiceKey;
+    return {
+      label: rest ? '' : displayForVoiceKey(event.voiceKey),
+      kind: rest ? 'rest' : SUB_TOKENS.has(event.token ?? '') ? 'sub' : 'beat',
+      beats: (next - event.absoluteTick) / TICKS_PER_BEAT,
+      tick: event.absoluteTick
+    };
+  });
+}
+
+// 点く丸＝tick が originalTick 以下の最後の語（エンジンの activeEvent と同じ決め方）。tick が無い（停止・はじめの合図）・最初の語より前は点けない。
+// 12 語を超える時は、点く語の頁（止まっている間は 1 頁目）の 12 語だけを返す
+export function stripView(cells: readonly StripCell[], originalTick: number | null | undefined): StripView {
+  let index: number | null = null;
+  if (typeof originalTick === 'number' && Number.isFinite(originalTick)) {
+    for (let i = 0; i < cells.length; i += 1) if (cells[i]!.tick <= originalTick) index = i;
+  }
+  const page = index === null ? 0 : Math.floor(index / MAX_STRIP_CELLS);
+  const start = page * MAX_STRIP_CELLS;
+  return { cells: cells.slice(start, start + MAX_STRIP_CELLS), lit: index === null ? null : index - start };
+}
+
+// 止まっている間の帯（表示のためだけ。時間の計算ではない）: カウントの文字列を compileRhythm で語にする
+export function idleProgram(danceId: string, counts: string): StripProgram {
+  const compiled = compileRhythm({ danceId, counts }) as { events: StripEvent[]; durationTicks: number };
+  return { events: compiled.events, endTick: compiled.durationTicks };
 }
diff --git a/src/app/practice/controls.tsx b/src/app/practice/controls.tsx
index 7d7b333..61d9b9f 100644
--- a/src/app/practice/controls.tsx
+++ b/src/app/practice/controls.tsx
@@ -3,6 +3,7 @@ import { Icon } from '../components/Icon.tsx';
 import type { MessageKey } from '../i18n/index.ts';
 import { phrased } from '../i18n/phrased.tsx';
 import { buildHash, type UiState } from '../router/routes.ts';
+import type { StripView } from './beat-indicator.ts';
 import { useI18n } from '../state/i18n.ts';
 import type { SessionNotice } from './session.ts';
 import { BPM_MAX, BPM_MIN, SPEED_PRESETS, type SpeedChoice, type SpeedPreset } from './speed.ts';
@@ -11,9 +12,11 @@ import { canStep, formatVoiceOffset } from './voice-offset.ts';
 // S2・S5 が共通で組む部品（Ruling 42）。記憶の単位（種目ごと・ルーティンごと）は各画面が持ち、部品は値と操作だけを受け取る。
 const SPEED_LABEL: Record<SpeedPreset, MessageKey> = { slow: 'speedSlow', standard: 'speedStandard', fast: 'speedFast' };
 
-// 大きな現在カウント＋拍インジケータ（操作ではない）。children は拍の下に置く（S5 の「3 / 13 …」の1行）。
-export function CountBox({ playing, countIn, nowText, idleText, beatsPerBar, beat, children }: {
-  playing: boolean; countIn: boolean; nowText: string; idleText: string; beatsPerBar: number; beat: number | null; children?: ComponentChildren;
+// 大きな現在カウント＋カウントの型の帯（操作ではない。D55・Ruling 114）。children は帯の下に置く（S5 の「3 / 13 …」の1行）。
+// 帯は型 1 周の語を 1 語 1 丸（幅は語の長さに比例＝flex-grow に拍数）。鳴っている語の丸だけ琥珀（aria-current）。読み上げは「いま {count}」で足りる（aria-hidden）
+const DENSE_STRIP = 9;   // 丸が 9 個以上は文字を 15px に（data-dense）
+export function CountBox({ playing, countIn, nowText, idleText, strip, children }: {
+  playing: boolean; countIn: boolean; nowText: string; idleText: string; strip: StripView; children?: ComponentChildren;
 }) {
   const { translator } = useI18n();
   return (
@@ -21,9 +24,10 @@ export function CountBox({ playing, countIn, nowText, idleText, beatsPerBar, bea
       {playing && countIn
         ? <div class="dc-now dc-now--lead">{translator.t('leadInNow')}</div>
         : <div class={`dc-now${playing ? '' : ' dc-now--idle'}`} aria-hidden="true">{playing ? nowText : idleText}</div>}
-      <ol class="dc-beats" aria-hidden="true">
-        {Array.from({ length: beatsPerBar }, (_, index) => (
-          <li key={index} aria-current={beat === index ? 'true' : undefined}>{index + 1}</li>
+      <ol class="dc-beats" aria-hidden="true" data-dense={strip.cells.length >= DENSE_STRIP ? '' : undefined}>
+        {strip.cells.map((cell, index) => (
+          <li key={`${index}-${cell.tick}`} data-cell={cell.kind} style={{ '--beats': cell.beats }}
+            data-fineprint={cell.kind === 'sub' || strip.cells.length >= DENSE_STRIP ? '' : undefined} aria-current={strip.lit === index ? 'true' : undefined}>{cell.label}</li>
         ))}
       </ol>
       {children}
diff --git a/src/app/practice/session.ts b/src/app/practice/session.ts
index e95e80d..2571d0c 100644
--- a/src/app/practice/session.ts
+++ b/src/app/practice/session.ts
@@ -2,6 +2,7 @@ import { figureRangeTicks } from '../../engine/practice-range.js';
 import { compileRhythm, compileRoutine } from '../../engine/rhythm-compiler.js';
 import type { TrackProfile } from '../../engine/tempo-map.js';
 import { wordOffsetsFor, type VoiceSelection } from '../voices/selection.ts';
+import type { StripEvent, StripProgram } from './beat-indicator.ts';
 
 // 再生セッション（S2）。音・WakeLock・2秒判定・中断の検知をまとめ、画面には SessionView だけを渡す。
 // 端末に触る処理は deps で受け取る（本物は practice/session-deps.ts、テストは偽物）。
@@ -28,6 +29,16 @@ export type PracticeOptions =
 
 export interface CompiledProgram { compiled: unknown; rangeStartTick?: number; rangeEndTick?: number }
 
+// エンジンに渡した compiled を、画面の帯（D55・Ruling 114-5）に見せる形にする（写すだけ。第 2 のコンパイルはしない）
+export function programView(compiled: unknown): StripProgram {
+  const source = compiled as { events: readonly StripEvent[]; figures?: readonly { startTick: number; endTick: number }[]; durationTicks: number };
+  return {
+    events: source.events,
+    ...(source.figures ? { figures: source.figures.map(({ startTick, endTick }) => ({ startTick, endTick })) } : {}),
+    endTick: source.durationTicks
+  };
+}
+
 // カウントをエンジンに渡す形にする。範囲は小節の位相を保つため、ルーティン全体をコンパイルしてから切り出す。
 export function compileProgram(options: PracticeOptions): CompiledProgram {
   if (options.kind === 'counts') return { compiled: compileRhythm({ danceId: options.danceId, counts: options.counts }) };
@@ -48,6 +59,7 @@ export interface SessionView {
   originalTick: number | null;
   figureIndex: number | null;  // 鳴っているフィガー（ルーティンの時だけ。はじめの合図の間は null）
   notice: SessionNotice;
+  program: StripProgram | null; // 鳴らしている型（エンジンに渡した compiled の写し。止まっている間は null。D55・Ruling 114-5）
 }
 
 export interface AudioLike { state: string; currentTime: number }
@@ -85,7 +97,7 @@ export interface SessionHints {
 }
 
 export const IDLE_VIEW: SessionView = Object.freeze({
-  playing: false, starting: false, countIn: false, voiceKey: null, originalTick: null, figureIndex: null, notice: 'none'
+  playing: false, starting: false, countIn: false, voiceKey: null, originalTick: null, figureIndex: null, notice: 'none', program: null
 }) as SessionView;
 
 export class PracticeSession<A extends AudioLike, V> {
@@ -170,11 +182,14 @@ export class PracticeSession<A extends AudioLike, V> {
       return;
     }
     const startedAt = audio.currentTime;
+    let program: StripProgram;
     try {
       this.engine ??= this.deps.createEngine(audio, voicePack, frame => this.onFrame(frame));
       this.engine.setVoicePack(voicePack);
+      const compiled = compileProgram(options);
+      program = programView(compiled.compiled);
       this.engine.start({
-        ...compileProgram(options),
+        ...compiled,
         bpm: options.bpm,
         loop: options.loop,
         metronome: options.metronome,
@@ -187,7 +202,7 @@ export class PracticeSession<A extends AudioLike, V> {
       if (generation === this.generation) this.update({ ...IDLE_VIEW, notice: 'stopped' });
       return;
     }
-    this.update({ ...IDLE_VIEW, playing: true, countIn: options.countInBars > 0 });
+    this.update({ ...IDLE_VIEW, playing: true, countIn: options.countInBars > 0, program });
     if (!this.hints.firstPlaybackDone()) this.hints.markFirstPlayback();
     let lockOutcome: 'pending' | 'held' | 'unavailable' = 'pending';
     this.cancelSoundCheck = this.deps.setTimer(() => this.checkSound(generation, audio, startedAt, lockOutcome === 'unavailable'), SOUND_CHECK_DELAY_MS);
diff --git a/src/app/screens/PracticeScreen.tsx b/src/app/screens/PracticeScreen.tsx
index 5d2b97f..a6b242d 100644
--- a/src/app/screens/PracticeScreen.tsx
+++ b/src/app/screens/PracticeScreen.tsx
@@ -4,7 +4,7 @@ import { getDanceProfile } from '../../engine/dance-profiles.js';
 import { BackButton } from '../components/BackButton.tsx';
 import { danceName } from '../i18n/index.ts';
 import { displayForVoiceKey, formatCounts } from '../lib/count-display.ts';
-import { beatIndexInBar } from '../practice/beat-indicator.ts';
+import { idleProgram, stripCells, stripView } from '../practice/beat-indicator.ts';
 import { CountBox, FORCED_NOTICE, type AlertNotice, FineSpeed, MoreOptions, NoticeBox, PlayDock, PracticeToggles, RepeatRow, SpeedChoices, VoiceChip, VoiceOffsetRow } from '../practice/controls.tsx';
 import { chooseCustomBpm, choosePreset, chooseTemplate, practiceChoice, practiceLeadInBars, type DanceProfileLike } from '../practice/preferences.ts';
 import type { PracticeOptions } from '../practice/session.ts';
@@ -19,13 +19,11 @@ import { useSettings } from '../state/settings.ts';
 import { DEFAULT_VOICE, voiceDisplayName, type VoiceSelection } from '../voices/selection.ts';
 import { usePlaybackVoice } from '../voices/use-playback-voice.ts';
 
-type Profile = DanceProfileLike & { beatsPerBar: number };
-
 // S2 再生（仕様 §4・Ruling 13・18・19・21・23・28〜32・42）。部品は practice/controls.tsx（S5 と共通）。
 export function PracticeScreen({ danceId, uiState }: { danceId: string; uiState?: UiState }) {
   const { translator } = useI18n();
   const { settings, update } = useSettings();
-  const profile = getDanceProfile(danceId) as Profile;
+  const profile = getDanceProfile(danceId) as DanceProfileLike;
   const choice = practiceChoice(profile, settings);
   const { session, view } = usePracticeSession(danceId);
   const playback = usePlaybackVoice();
@@ -87,7 +85,8 @@ export function PracticeScreen({ danceId, uiState }: { danceId: string; uiState?
   const current = () => latest.current.settings;
   const forced = uiState ? FORCED_NOTICE[uiState] : undefined;
   const notice: AlertNotice = forced && !forcedDismissed ? forced : playback.saveFailed ? 'save-failed' : view.notice;
-  const beat = view.playing && !view.countIn ? beatIndexInBar(view.originalTick, profile.beatsPerBar) : null;
+  // D55: 帯は鳴っている型（セッションの program）。止まっている間は今の型を表示のためだけに語にする。はじめの合図の間は点けない
+  const strip = stripView(stripCells(view.program ?? idleProgram(danceId, choice.counts)), view.playing && !view.countIn ? view.originalTick : null);
   const nowText = view.playing && !view.countIn ? displayForVoiceKey(view.voiceKey) : '';
   // 止まっている間は「最初に鳴るカウント」を灰色で出す（空白にしない。琥珀は鳴っている時だけ）。
   const idleText = view.playing ? '' : formatCounts(danceId, choice.counts).split(' ')[0] ?? '';
@@ -103,7 +102,7 @@ export function PracticeScreen({ danceId, uiState }: { danceId: string; uiState?
             <small>{formatCounts(danceId, choice.counts)}</small>
           </header>
           <NoticeBox notice={notice} onClose={() => { setForcedDismissed(true); if (closeTarget(notice) === 'save-failed') playback.dismissSaveFailed(); else session.dismissNotice(); }} />
-          <CountBox playing={view.playing} countIn={view.countIn} nowText={nowText} idleText={idleText} beatsPerBar={profile.beatsPerBar} beat={beat} />
+          <CountBox playing={view.playing} countIn={view.countIn} nowText={nowText} idleText={idleText} strip={strip} />
         </div>
         <div>
           <SpeedChoices presets={speedPresetBpms(profile)} selected={choice.speed} onChoose={preset => change(choosePreset(current(), danceId, preset))} />
diff --git a/src/app/screens/RoutinePlayScreen.tsx b/src/app/screens/RoutinePlayScreen.tsx
index 9534d65..36c2b1d 100644
--- a/src/app/screens/RoutinePlayScreen.tsx
+++ b/src/app/screens/RoutinePlayScreen.tsx
@@ -7,7 +7,7 @@ import { Icon } from '../components/Icon.tsx';
 import { danceName } from '../i18n/index.ts';
 import { displayForVoiceKey, formatCounts } from '../lib/count-display.ts';
 import { honorific } from '../lib/honorific.ts';
-import { beatIndexInBar } from '../practice/beat-indicator.ts';
+import { idleProgram, stripCells, stripView } from '../practice/beat-indicator.ts';
 import { CountBox, FORCED_NOTICE, type AlertNotice, FineSpeed, MoreOptions, NoticeBox, PlayDock, PracticeToggles, RepeatRow, SpeedChoices, VoiceChip, VoiceOffsetRow } from '../practice/controls.tsx';
 import { chooseRoutineCustomBpm, chooseRoutinePreset, routineLeadInBars, routinePracticeChoice } from '../practice/routine-preferences.ts';
 import type { PracticeOptions } from '../practice/session.ts';
@@ -25,7 +25,7 @@ import { useSettings } from '../state/settings.ts';
 import { DEFAULT_VOICE, voiceDisplayName, type VoiceSelection } from '../voices/selection.ts';
 import { usePlaybackVoice } from '../voices/use-playback-voice.ts';
 
-type Profile = SpeedProfile & { beatsPerBar: number };
+type Profile = SpeedProfile;
 interface Range { startIndex: number; endIndex: number }
 
 // S5 ルーティン再生（仕様 §4・Ruling 40・42・46〜48・D10）。S2 と同じ骨格（主要操作も同じ5つ）を practice/controls.tsx で組む。
@@ -122,12 +122,16 @@ function RoutinePlayer({ routine, uiState }: { routine: Routine; uiState?: UiSta
 
   const forced = uiState ? FORCED_NOTICE[uiState] : undefined;
   const notice: AlertNotice = forced && !forcedDismissed ? forced : playback.saveFailed ? 'save-failed' : view.notice;
-  const beat = view.playing && !view.countIn ? beatIndexInBar(view.originalTick, profile.beatsPerBar) : null;
+
   const nowText = view.playing && !view.countIn ? displayForVoiceKey(view.voiceKey) : '';
   const sounding = view.playing && !view.countIn && view.figureIndex !== null ? view.figureIndex : null;
   const shownIndex = sounding ?? range.startIndex;
   const shownFigure = routine.figures[shownIndex]!;
   const idleText = view.playing ? '' : formatCounts(routine.danceId, routine.figures[range.startIndex]!.counts).split(' ')[0] ?? '';
+  // D55: 帯は鳴っているフィガーの型（figureIndex で絞り、ルーティン全体の tick で点ける）。止まっている間・はじめの合図の間は始めのフィガーの型を表示だけ
+  const strip = view.program && sounding !== null
+    ? stripView(stripCells(view.program, sounding), view.originalTick)
+    : stripView(stripCells(idleProgram(routine.danceId, routine.figures[range.startIndex]!.counts)), null);
   const playing = view.playing || view.starting;
   const dance = danceName(routine.danceId, locale);
   const subtitle = routine.receivedFrom
@@ -145,7 +149,7 @@ function RoutinePlayer({ routine, uiState }: { routine: Routine; uiState?: UiSta
             <small data-ellipsis>{subtitle}</small>
           </header>
           <NoticeBox notice={notice} onClose={() => { setForcedDismissed(true); if (closeTarget(notice) === 'save-failed') playback.dismissSaveFailed(); else session.dismissNotice(); }} />
-          <CountBox playing={view.playing} countIn={view.countIn} nowText={nowText} idleText={idleText} beatsPerBar={profile.beatsPerBar} beat={beat}>
+          <CountBox playing={view.playing} countIn={view.countIn} nowText={nowText} idleText={idleText} strip={strip}>
             <div class={`dc-figure-now${sounding !== null ? ' dc-figure-now--on' : ''}`} data-figure-now data-ellipsis>
               <span class="dc-figure-now-pos">{shownIndex + 1} / {routine.figures.length}</span> {figureName(shownFigure.name)}
             </div>
diff --git a/src/app/styles/base.css b/src/app/styles/base.css
index f4f421c..2e8c632 100644
--- a/src/app/styles/base.css
+++ b/src/app/styles/base.css
@@ -131,9 +131,14 @@ button { cursor: pointer; }
 .dc-now { min-height: 96px; font-size: 96px; font-weight: 700; line-height: 1; letter-spacing: -0.04em; color: var(--count-ink); font-variant-numeric: tabular-nums; }
 .dc-now--idle { color: var(--ink2); }
 .dc-now--lead { display: flex; align-items: center; font-size: 32px; letter-spacing: var(--track); color: var(--ink2); }
-.dc-beats { display: flex; gap: 10px; margin: 8px 0 0; padding: 0; list-style: none; }
-.dc-beats li { display: grid; place-items: center; width: 52px; height: 40px; font-size: 18px; font-weight: 700; color: var(--ink2);
-  border-bottom: 3px solid var(--line); }
+/* カウントの型の帯（D55・Ruling 114-2・114-6）: 1 語 1 丸。幅は語の長さ（--beats＝拍数）に比例し、1 拍あたり --beat-w まで。
+   a・&（sub）は 20〜24px に留まり 14px。丸が 9 個以上（data-dense）は 15px。320 幅でも 1 行（overflow を出さない）。高さと色は D8 のまま */
+.dc-beats { --beat-w: 56px; display: flex; justify-content: center; gap: 6px; width: 100%; margin: 8px 0 0; padding: 0; list-style: none; overflow: hidden; }
+.dc-beats li { display: grid; place-items: center; flex: var(--beats, 1) 1 0; min-width: 20px; max-width: calc(var(--beats, 1) * var(--beat-w)); height: 40px;
+  font-size: 18px; font-weight: 700; color: var(--ink2); border-bottom: 3px solid var(--line); }
+.dc-beats li[data-cell="sub"] { font-size: 14px; }
+.dc-beats[data-dense] li:not([data-cell="sub"]) { font-size: 15px; }
+@media (max-width: 359px) { .dc-beats { gap: 4px; } }
 .dc-beats li[aria-current="true"] { color: var(--beat-on); border-bottom: 6px solid var(--beat-on); font-weight: 800; }
 .dc-field-label { display: flex; align-items: center; gap: 8px; margin: 8px 0; font-size: 16px; font-weight: 700; color: var(--ink2); }
 .dc-seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
@@ -402,7 +407,8 @@ button { cursor: pointer; }
   .dc-now { min-height: 200px; font-size: 200px; }
   .dc-now--idle { color: var(--ink2); }
 .dc-now--lead { font-size: 32px; }
-  .dc-beats li { width: 72px; height: 56px; font-size: 24px; }
+  .dc-beats { --beat-w: 72px; }
+  .dc-beats li { height: 56px; font-size: 24px; }
   .dc-dock { padding: 12px 16px; }
   .dc-play { max-width: 928px; min-height: 80px; }
   .dc-dock-button { max-width: 608px; }
```

- [ ] **Step 4: 通ることを確かめる**

Expected: `tests 660`・`fail 0`、`typecheck-ok`、ui:check **769 PASS**（109 状態）、スモーク 4 本 OK（`practice smoke OK: the jive strip lights 1 2 3 a 4 5 a 6 in order with the big count; …`）。`git diff 3d2f51e -- src/engine` が空。目で: S2 ジャイブ（8 丸・a は細い）・タンゴ（S が Q の 2 倍）・S5 の 15 語のフィガー（12 丸）を 320×568・375×548・1280×900 で。▶ で琥珀の丸が大きな語と同じ所を進む（dev で 1 回聞く）。

- [ ] **Step 5: コミット**

```bash
git add src/app/practice/beat-indicator.ts src/app/practice/session.ts src/app/practice/controls.tsx \
  src/app/screens/PracticeScreen.tsx src/app/screens/RoutinePlayScreen.tsx src/app/styles/base.css \
  test/app/practice/beat-indicator.test.ts tools/check-app-ui.js tools/ui-check-routines.js tools/smoke-practice.js
git commit -m "feat(app): 拍の丸をカウントの型の帯に（D55・Ruling 114）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 4: 「フィガー」タブのデータと経路 — `figureSlug`・`reviewedFigures`・F1／S2 のフィガーの経路・`lastFigure`・`practiceCounts`

**担当:** Sonnet。**Ruling 119-6・120-1〜120-4・121-1・122-3（node の分）。**

**Files:**
- Modify: `src/app/routines/figure-names.ts`（`figureSlug`・`isFigureSlug`・`verifiedFigure`・`figureDisplayName`）・`src/app/routines/reviewed-counts.ts`（`ReviewedFigure`・`buildReviewedFigures`・`REVIEWED_FIGURES`・`reviewedFigures`・`reviewedFigureBySlug`。`REVIEWED_COUNTS` と `reviewedCounts` と番人は不変）・`src/app/router/{routes,resolve}.ts`（F1・S2 の `/:figureSlug`・`resolveScreen` の第 3 引数）・`src/app/settings/settings.ts`（`lastFigure`）・`src/app/practice/preferences.ts`（`practiceCounts`）
- Test: `test/app/{routes,router-resolve}.test.ts`・`test/app/routines/{figure-names,reviewed-counts}.test.ts`・`test/app/settings/settings.test.ts`・`test/app/practice/preferences.test.ts`

**Interfaces:**
- Produces: `ScreenId` に `F1`（`/figures/:danceId`・focus・親 S1）。`RouteParams.figureSlug`。`resolveScreen(route, routines, figures = REVIEWED_FIGURES)`: F1 は監修済み 1 件以上で F1・0 件は S2（基本）へ置き換え・知らない種目は S1。S2 の知らない slug は基本へ置き換え。`AppSettings.lastFigure: string | null`。`practiceCounts(profile, settings, figure)`。
- Consumes: 3d2f51e の `REVIEWED_COUNTS`（20 件）。

**決まり**: この Task の間、F1 の画面はまだ無い（`App` は知らない画面として表紙を描く）。タイルはまだ S2 へ行くので、利用者から F1 への道は無い（Task 5 で繋ぐ）。`reviewed-counts.ts` の本文に `figure-catalog`・`legacy`・`imported-routine` の文字を入れない（Ruling 110-2 (e)）。

- [ ] **Step 1: 失敗するテストを書く**

`git apply --whitespace=nowarn .superpowers/sdd/role-split/t4-test.diff`:

<!-- diff: t4-test -->
```diff
diff --git a/test/app/practice/preferences.test.ts b/test/app/practice/preferences.test.ts
index c0685e4..75333ef 100644
--- a/test/app/practice/preferences.test.ts
+++ b/test/app/practice/preferences.test.ts
@@ -2,7 +2,7 @@ import test from 'node:test';
 import assert from 'node:assert/strict';
 import { DANCE_PROFILES } from '../../../src/engine/dance-profiles.js';
 import { DEFAULT_SETTINGS, type AppSettings } from '../../../src/app/settings/settings.ts';
-import { LEAD_IN_BARS, chooseCustomBpm, choosePreset, chooseTemplate, practiceChoice, practiceLeadInBars } from '../../../src/app/practice/preferences.ts';
+import { LEAD_IN_BARS, chooseCustomBpm, choosePreset, chooseTemplate, practiceChoice, practiceCounts, practiceLeadInBars } from '../../../src/app/practice/preferences.ts';
 
 const waltz = DANCE_PROFILES.waltz;
 const apply = (settings: AppSettings, patch: Partial<AppSettings>): AppSettings => ({ ...settings, ...patch });
@@ -54,3 +54,10 @@ test('lead-in switch: off = 0, on = LEAD_IN_BARS (2 bars, D17); stored 0|1 needs
   assert.equal(practiceLeadInBars({ ...DEFAULT_SETTINGS, countInBars: 0 }), 0);
   assert.equal(practiceLeadInBars(DEFAULT_SETTINGS), 2);
 });
+
+test('a reviewed figure decides the counts; without one the remembered pattern does (D57・Ruling 120-3)', () => {
+  const remembered = apply(DEFAULT_SETTINGS, { lastTemplateByDance: { waltz: '12&3' } });
+  assert.equal(practiceCounts(waltz, remembered, { counts: '123123' }), '123123', 'two-bar figures are counts too');
+  assert.equal(practiceCounts(waltz, remembered, null), '12&3');
+  assert.equal(practiceCounts(waltz, DEFAULT_SETTINGS, null), waltz.templates[0]);
+});
diff --git a/test/app/router-resolve.test.ts b/test/app/router-resolve.test.ts
index 5f5d516..5e6459a 100644
--- a/test/app/router-resolve.test.ts
+++ b/test/app/router-resolve.test.ts
@@ -3,6 +3,7 @@ import assert from 'node:assert/strict';
 import { IMPLEMENTED_SCREENS, resolveScreen } from '../../src/app/router/resolve.ts';
 import { SCREENS, parseHash } from '../../src/app/router/routes.ts';
 import { ROUTINES_MAX } from '../../src/app/routines/limits.ts';
+import { buildReviewedFigures } from '../../src/app/routines/reviewed-counts.ts';
 import { createRoutine, type Routine } from '../../src/app/routines/routine.ts';
 
 const NOW = '2026-10-11T09:00:00.000Z';
@@ -63,3 +64,29 @@ test('S12 opens from stage 7 and S13 from stage 8: every screen of the spec is b
   assert.deepEqual(resolve('#/about?ui-state=confirm-delete-all'), { screen: 'S13', redirect: null });
   assert.deepEqual([...IMPLEMENTED_SCREENS], Object.keys(SCREENS));
 });
+
+// D57（Ruling 119-6・120-4・122-3）: F1 は監修済みのフィガーが 1 件以上の種目だけ。表の中身に頼らない検査は作り物の表を渡す
+const EMPTY_TABLE = buildReviewedFigures([]);
+const WHISK_ONLY = buildReviewedFigures([{ danceId: 'waltz', englishName: 'Whisk', counts: '123', basis: 'テスト', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' }]);
+const basic = (danceId: string) => ({ screen: 'S2', redirect: { screen: 'S2', params: { danceId } } });
+
+test('F1 opens only for a dance with reviewed figures; otherwise the basic count, unknown dances go to U1 (Ruling 119-6)', () => {
+  assert.deepEqual(resolveScreen(parseHash('#/figures/waltz'), ALL, WHISK_ONLY), { screen: 'F1', redirect: null });
+  assert.deepEqual(resolveScreen(parseHash('#/figures/waltz'), ALL, EMPTY_TABLE), basic('waltz'), 'an empty table never shows F1');
+  assert.deepEqual(resolveScreen(parseHash('#/figures/tango'), ALL, WHISK_ONLY), basic('tango'));
+  assert.deepEqual(resolveScreen(parseHash('#/figures/hiphop'), ALL, WHISK_ONLY), { screen: 'S1', redirect: null });
+});
+
+test('S2 with a figure needs that figure in the table; an unknown slug falls back to the basic count (Ruling 120-4)', () => {
+  assert.deepEqual(resolveScreen(parseHash('#/practice/waltz/whisk'), ALL, WHISK_ONLY), { screen: 'S2', redirect: null });
+  assert.deepEqual(resolveScreen(parseHash('#/practice/waltz/natural-turn'), ALL, WHISK_ONLY), basic('waltz'));
+  assert.deepEqual(resolveScreen(parseHash('#/practice/waltz/whisk'), ALL, EMPTY_TABLE), basic('waltz'));
+  assert.deepEqual(resolveScreen(parseHash('#/practice/hiphop/whisk'), ALL, WHISK_ONLY), { screen: 'S1', redirect: null });
+  assert.deepEqual(resolveScreen(parseHash('#/practice/waltz'), ALL, EMPTY_TABLE), { screen: 'S2', redirect: null });
+});
+
+test('the shipped table: waltz, slow foxtrot and tango have F1; quickstep and the Latin dances go straight to S2 (2026-10-13 の 20 件)', () => {
+  for (const danceId of ['waltz', 'slowfox', 'tango']) assert.deepEqual(resolve(`#/figures/${danceId}`), { screen: 'F1', redirect: null }, danceId);
+  for (const danceId of ['quickstep', 'vwaltz', 'rumba', 'chacha', 'samba', 'pasodoble', 'jive']) assert.deepEqual(resolve(`#/figures/${danceId}`), basic(danceId), danceId);
+  assert.deepEqual(resolve('#/practice/waltz/whisk'), { screen: 'S2', redirect: null });
+});
diff --git a/test/app/routes.test.ts b/test/app/routes.test.ts
index d084b24..a4a8361 100644
--- a/test/app/routes.test.ts
+++ b/test/app/routes.test.ts
@@ -29,7 +29,7 @@ test('every screen hash from spec §3 parses to its screen and params', () => {
 });
 
 test('empty, malformed and unknown hashes fall back to the cover instead of throwing (D56)', () => {
-  for (const hash of ['', '#', '#/nope', '#/practice', '#/practice/', '#/practice/a/b', '#/routines/x/delete', 'garbage', '#/practice/%E3%81%82', '#/practice/<script>', '#/use/x', '#/make/x']) {
+  for (const hash of ['', '#', '#/nope', '#/practice', '#/practice/', '#/practice/a/b/c', '#/routines/x/delete', 'garbage', '#/practice/%E3%81%82', '#/practice/<script>', '#/use/x', '#/make/x']) {
     assert.deepEqual(parseHash(hash), { screen: 'S0', params: {}, query: {} }, JSON.stringify(hash));
   }
 });
@@ -94,7 +94,7 @@ test('tabs show on the two "Use" roots only (D56・Ruling 116-1)', () => {
 
 test('back without history goes to the parent from the D56 route table (Ruling 116-1)', () => {
   const expected: Record<ScreenId, ScreenId | null> = {
-    S0: null, S1: 'S0', U2: 'S0', M0: 'S0', M1: 'M0', S2: 'S1', S4: 'M1', S5: 'U2', S6: 'S0', S7: 'S1',
+    S0: null, S1: 'S0', U2: 'S0', M0: 'S0', M1: 'M0', F1: 'S1', S2: 'S1', S4: 'M1', S5: 'U2', S6: 'S0', S7: 'S1',
     S8: 'M0', S9: 'M0', S10: 'U2', S11: 'S6', S12: 'S6', S13: 'S6'
   };
   for (const screen of Object.keys(expected) as ScreenId[]) assert.equal(parentScreen(screen), expected[screen], screen);
@@ -105,3 +105,15 @@ test('only the cover has no back button; the screens under the cover say "Cover"
   assert.deepEqual(Object.entries(kinds).filter(([, kind]) => kind === 'cover').map(([screen]) => screen), ['S0']);
   assert.deepEqual((Object.keys(SCREENS) as ScreenId[]).filter(screen => parentScreen(screen) === 'S0').sort(), ['M0', 'S1', 'S6', 'U2']);
 });
+
+test('D57: F1 is #/figures/:danceId and S2 has a figure form #/practice/:danceId/:figureSlug (Ruling 119-1・120-1)', () => {
+  assert.deepEqual(parseHash('#/figures/waltz'), { screen: 'F1', params: { danceId: 'waltz' }, query: {} });
+  assert.equal(buildHash({ screen: 'F1', params: { danceId: 'waltz' } }), '#/figures/waltz');
+  assert.deepEqual(parseHash('#/practice/waltz/whisk'), { screen: 'S2', params: { danceId: 'waltz', figureSlug: 'whisk' }, query: {} });
+  assert.equal(buildHash({ screen: 'S2', params: { danceId: 'waltz', figureSlug: 'chasse-from-pp' } }), '#/practice/waltz/chasse-from-pp');
+  assert.equal(buildHash({ screen: 'S2', params: { danceId: 'waltz' } }), '#/practice/waltz');
+  assert.equal(parseHash('#/figures/bad id').screen, 'S0');
+  assert.equal(parseHash('#/practice/waltz/a/b').screen, 'S0');
+  assert.equal(SCREENS.F1.kind, 'focus');
+  assert.equal(showsTabs('F1'), false);
+});
diff --git a/test/app/routines/figure-names.test.ts b/test/app/routines/figure-names.test.ts
index 06a57d2..48e3878 100644
--- a/test/app/routines/figure-names.test.ts
+++ b/test/app/routines/figure-names.test.ts
@@ -1,8 +1,10 @@
 import test from 'node:test';
 import assert from 'node:assert/strict';
 import {
-  FIGURE_CHOICES_MAX, FIGURE_SUGGESTIONS_MAX, buildFigureIdentity, figureIdentity, figureNameChoices, figureNameSuggestions, foldFigureName, hasFigureNameSuggestions, hiraganaToKatakana, spellingKey
+  FIGURE_CHOICES_MAX, FIGURE_SUGGESTIONS_MAX, buildFigureIdentity, figureDisplayName, figureIdentity, figureNameChoices, figureNameSuggestions, figureSlug,
+  foldFigureName, hasFigureNameSuggestions, hiraganaToKatakana, isFigureSlug, spellingKey
 } from '../../../src/app/routines/figure-names.ts';
+import { DANCE_PROFILES } from '../../../src/engine/dance-profiles.js';
 
 test('suggestions match Japanese aliases and English names, shown in the UI language', () => {
   assert.deepEqual(figureNameSuggestions('waltz', 'ウィ', 'ja-JP'), ['ウィスク', 'バックウィスク', 'ウィーブ フロム PP']);
@@ -141,3 +143,30 @@ test('the real registry has no name shared by two figures in one dance (D22)', (
     }
   }
 });
+
+// D57（Ruling 120-1・120-2・122-3）: 経路のフィガーの印と表示名
+test('figureSlug folds an English name into a path segment', () => {
+  assert.equal(figureSlug('Chasse from PP'), 'chasse-from-pp');
+  assert.equal(figureSlug('Natural Turn'), 'natural-turn');
+  assert.equal(figureSlug('Fallaway Reverse and Slip Pivot'), 'fallaway-reverse-and-slip-pivot');
+  assert.equal(figureSlug(' Back  Lock! '), 'back-lock');
+  assert.ok(isFigureSlug('whisk') && !isFigureSlug('Whisk') && !isFigureSlug('a b') && !isFigureSlug('') && !isFigureSlug('-x') && !isFigureSlug(3));
+});
+
+test('every verified figure has a slug that fits a route segment and is unique within its dance (Ruling 120-1)', () => {
+  let count = 0;
+  for (const danceId of Object.keys(DANCE_PROFILES)) {
+    const slugs = figureNameChoices(danceId, 'en').map(figureSlug);
+    count += slugs.length;
+    for (const slug of slugs) assert.ok(isFigureSlug(slug) && /^[A-Za-z0-9_-]+$/.test(slug), `${danceId} ${slug}`);
+    assert.equal(new Set(slugs).size, slugs.length, `${danceId} has a duplicate slug`);
+  }
+  assert.ok(count > 0);
+});
+
+test('figureDisplayName shows the verified name in the UI language (the same spelling as the S4 list)', () => {
+  assert.equal(figureDisplayName('waltz', 'Whisk', 'ja-JP'), 'ウィスク');
+  assert.equal(figureDisplayName('waltz', 'Whisk', 'en'), 'Whisk');
+  assert.equal(figureDisplayName('waltz', 'Chasse from PP', 'ja-JP'), 'シャッセ フロム PP');
+  assert.equal(figureDisplayName('waltz', 'Not A Figure', 'ja-JP'), 'Not A Figure');
+});
diff --git a/test/app/routines/reviewed-counts.test.ts b/test/app/routines/reviewed-counts.test.ts
index e3089d7..fc8c1bd 100644
--- a/test/app/routines/reviewed-counts.test.ts
+++ b/test/app/routines/reviewed-counts.test.ts
@@ -5,7 +5,8 @@ import path from 'node:path';
 import { DANCE_NAMES } from '../../../src/engine/ui-messages.js';
 import { checkCounts, normalizeCounts } from '../../../src/app/routines/counts.ts';
 import { figureIdentity } from '../../../src/app/routines/figure-names.ts';
-import { REVIEWED_COUNTS, reviewedCounts } from '../../../src/app/routines/reviewed-counts.ts';
+import { REVIEWED_COUNTS, buildReviewedFigures, reviewedCounts, reviewedFigureBySlug, reviewedFigures, type ReviewedCount } from '../../../src/app/routines/reviewed-counts.ts';
+import { figureNameChoices, figureSlug } from '../../../src/app/routines/figure-names.ts';
 
 // 監修済みのカウント表の番人（D52・Ruling 110-2）。「ひとみうさが OK を付けた行だけ出荷」を人の注意でなくテストで守る。
 const root = path.resolve(import.meta.dirname, '../../..');
@@ -122,3 +123,28 @@ test('(e) the table and autoCounts do not read the unreviewed data', async () =>
     }
   }
 });
+
+// D57（Ruling 120-2・122-3）: 「フィガー」タブの並び（登録簿の定義順）と slug での引き方。作り物の表で順を固定し、出荷の表は件数の和で見る
+const fake = (danceId: string, englishName: string, counts: string): ReviewedCount => ({ danceId, englishName, counts, basis: 'テスト', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' });
+
+test('reviewedFigures lists a dance in the registry order, not the table order', () => {
+  const table = buildReviewedFigures([fake('waltz', 'Whisk', '123'), fake('waltz', 'Closed Changes', '123'), fake('tango', 'Progressive Link', 'QQ')]);
+  assert.deepEqual(table.reviewedFigures('waltz').map(figure => figure.englishName), ['Closed Changes', 'Whisk']);
+  assert.deepEqual(table.reviewedFigures('waltz')[1], { slug: 'whisk', englishName: 'Whisk', counts: '123' });
+  assert.deepEqual(table.reviewedFigures('quickstep'), []);
+  assert.equal(table.reviewedFigureBySlug('waltz', 'whisk')?.counts, '123');
+  for (const slug of ['natural-turn', 'Whisk', undefined]) assert.equal(table.reviewedFigureBySlug('waltz', slug), null, String(slug));
+  assert.equal(table.reviewedFigureBySlug('tango', 'whisk'), null, 'the slug is looked up within the dance');
+  assert.deepEqual(buildReviewedFigures([]).reviewedFigures('waltz'), [], 'an empty table has no figures');
+});
+
+test('the shipped table: every entry is listed once under its dance, in registry order, and found by its slug', () => {
+  const dances = [...new Set(REVIEWED_COUNTS.map(entry => entry.danceId))];
+  assert.equal(dances.reduce((sum, danceId) => sum + reviewedFigures(danceId).length, 0), REVIEWED_COUNTS.length);
+  for (const danceId of dances) {
+    const order = figureNameChoices(danceId, 'en');
+    const listed = reviewedFigures(danceId).map(figure => order.indexOf(figure.englishName));
+    assert.deepEqual(listed, [...listed].sort((a, b) => a - b), danceId);
+  }
+  for (const entry of REVIEWED_COUNTS) assert.equal(reviewedFigureBySlug(entry.danceId, figureSlug(entry.englishName))?.counts, entry.counts, entry.englishName);
+});
diff --git a/test/app/settings/settings.test.ts b/test/app/settings/settings.test.ts
index 9ef719a..88fb786 100644
--- a/test/app/settings/settings.test.ts
+++ b/test/app/settings/settings.test.ts
@@ -102,3 +102,11 @@ test('the first-playback and Home Screen card hints start false and only true co
   assert.equal(broken.hints.firstPlaybackDone, false);
   assert.equal(broken.hints.homeScreenCardDismissed, false);
 });
+
+test('the last figure is a slug kept with the last dance; anything else is null (D57・Ruling 121-1)', () => {
+  assert.equal(DEFAULT_SETTINGS.lastFigure, null);
+  assert.equal(normalizeSettings({ lastDanceId: 'waltz', lastFigure: 'chasse-from-pp' }).lastFigure, 'chasse-from-pp');
+  for (const lastFigure of ['Whisk', 'a b', '', 3, null, '../x']) assert.equal(normalizeSettings({ lastDanceId: 'waltz', lastFigure }).lastFigure, null, String(lastFigure));
+  assert.equal(normalizeSettings({ lastDanceId: 'hiphop', lastFigure: 'whisk' }).lastFigure, null, 'no dance, no figure');
+  assert.equal(normalizeSettings({ lastFigure: 'whisk' }).lastFigure, null);
+});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npm test 2>&1 | grep -E "^ℹ (tests|fail)"`
Expected: `tests 630`・**`fail 7`**（6 つのテストファイルが新しい名前を読めずに落ちる＋経路の 1 件）。

- [ ] **Step 3: 実装する**

`git apply --whitespace=nowarn .superpowers/sdd/role-split/t4-impl.diff`:

<!-- diff: t4-impl -->
```diff
diff --git a/src/app/practice/preferences.ts b/src/app/practice/preferences.ts
index 6819d8d..fb9b969 100644
--- a/src/app/practice/preferences.ts
+++ b/src/app/practice/preferences.ts
@@ -24,6 +24,12 @@ export function practiceChoice(profile: DanceProfileLike, settings: AppSettings)
   return { counts, speed: effective, bpm, customBpm: effective === 'custom' ? bpm : null };
 }
 
+// D57（Ruling 120-3）: S2 が鳴らすカウントは 1 か所で決める。フィガー（監修済み）の時はそのカウント、無ければ種目の型（practiceChoice）。
+// 鳴らす・止まっている間の 1 語目・帯・見出し下の型の文字はすべてこの 1 本を使う（フィガーの時は lastTemplateByDance を読まない）
+export function practiceCounts(profile: DanceProfileLike, settings: AppSettings, figure: { counts: string } | null): string {
+  return figure?.counts ?? practiceChoice(profile, settings).counts;
+}
+
 // S2 の設定をエンジンへ渡す小節数にする（オフ=0、オン=LEAD_IN_BARS）。
 export function practiceLeadInBars(settings: Pick<AppSettings, 'countInBars'>): 0 | 2 {
   return settings.countInBars === 1 ? LEAD_IN_BARS : 0;
diff --git a/src/app/router/resolve.ts b/src/app/router/resolve.ts
index 71fca5c..a1dc52d 100644
--- a/src/app/router/resolve.ts
+++ b/src/app/router/resolve.ts
@@ -1,6 +1,7 @@
 import { DANCE_PROFILES } from '../../engine/dance-profiles.js';
 import { isRoutineId } from '../routines/ids.ts';
 import { ROUTINES_MAX } from '../routines/limits.ts';
+import { REVIEWED_FIGURES, type ReviewedFigureTable } from '../routines/reviewed-counts.ts';
 import { routinePlayability, type Routine } from '../routines/routine.ts';
 import type { Route, RouteTarget, ScreenId } from './routes.ts';
 
@@ -9,17 +10,26 @@ import type { Route, RouteTarget, ScreenId } from './routes.ts';
 // S4 編集・S5 は ID が正しく、そのルーティンがある時だけ。S5 はさらに鳴らせる時だけ（Ruling 37・40）。
 // 外れたら一覧を出し、redirect でハッシュも置き換える（履歴を積まない）。S4（作る側）は M1、S5（使う側）は U2（D56・Ruling 116）。
 // 古い経路（#/routines＝alias）は U2 を出し、ハッシュを #/use/routines に置き換える。
-export const IMPLEMENTED_SCREENS: readonly ScreenId[] = ['S0', 'S1', 'U2', 'M0', 'M1', 'S2', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13'];
+// D57（Ruling 119-6・120-4）: F1 は監修済みのフィガーが 1 件以上の種目だけ（0 件なら S2 の基本へ置き換え・知らない種目は U1）。
+// S2 のフィガーの形は、監修表に無い slug（訂正で消えた・打ち間違い）なら S2 の基本へ置き換える（エラーは出さない）。
+export const IMPLEMENTED_SCREENS: readonly ScreenId[] = ['S0', 'S1', 'U2', 'M0', 'M1', 'F1', 'S2', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13'];
 
 export interface Resolved { screen: ScreenId; redirect: RouteTarget | null }
 
 const TO_MAKE_ROUTINES: Resolved = { screen: 'M1', redirect: { screen: 'M1', params: {} } };
 const TO_USE_ROUTINES: Resolved = { screen: 'U2', redirect: { screen: 'U2', params: {} } };
 
-export function resolveScreen(route: Route, routines: readonly Routine[]): Resolved {
+export function resolveScreen(route: Route, routines: readonly Routine[], figures: ReviewedFigureTable = REVIEWED_FIGURES): Resolved {
   const { screen, params } = route;
   if (route.alias) return { screen, redirect: { screen, params } };
-  if (screen === 'S2') return { screen: params.danceId && Object.hasOwn(DANCE_PROFILES, params.danceId) ? 'S2' : 'S1', redirect: null };
+  if (screen === 'S2' || screen === 'F1') {
+    const danceId = params.danceId;
+    if (!danceId || !Object.hasOwn(DANCE_PROFILES, danceId)) return { screen: 'S1', redirect: null };
+    const basic: Resolved = { screen: 'S2', redirect: { screen: 'S2', params: { danceId } } };
+    if (screen === 'F1') return figures.reviewedFigures(danceId).length > 0 ? { screen: 'F1', redirect: null } : basic;
+    if (params.figureSlug !== undefined && !figures.reviewedFigureBySlug(danceId, params.figureSlug)) return basic;
+    return { screen: 'S2', redirect: null };
+  }
   if (screen === 'S4' || screen === 'S5') {
     const back = screen === 'S4' ? TO_MAKE_ROUTINES : TO_USE_ROUTINES;
     if (screen === 'S4' && params.routineId === undefined) return routines.length >= ROUTINES_MAX ? back : { screen: 'S4', redirect: null };
diff --git a/src/app/router/routes.ts b/src/app/router/routes.ts
index f26edab..08d2d78 100644
--- a/src/app/router/routes.ts
+++ b/src/app/router/routes.ts
@@ -1,12 +1,13 @@
 // ハッシュ ↔ 画面の対応表（仕様 §3）。純粋関数だけ。window には触らない（platform/hash.ts の役目）。
 // D56（Ruling 116）: 表紙 S0（#/）・「使う」の U1（今の S1 の ID のまま #/use）と U2（#/use/routines）・「作る」の M0（#/make）と M1（#/make/routines）。
 // S3 は廃止（古い #/routines は U2 へ置き換え）。深い画面（S2・S4・S5・S7〜S13）の path は変えない。
-export type ScreenId = 'S0' | 'S1' | 'U2' | 'M0' | 'M1' | 'S2' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10' | 'S11' | 'S12' | 'S13';
+// D57（Ruling 119-1）: F1「種目のフィガー」（#/figures/:danceId）。監修済みのフィガーが 1 件以上ある種目だけ（resolve.ts）。
+export type ScreenId = 'S0' | 'S1' | 'U2' | 'M0' | 'M1' | 'F1' | 'S2' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10' | 'S11' | 'S12' | 'S13';
 // cover＝表紙（戻る無し・下タブ無し）。root＝側の入口（U1・U2・M0）。list＝一覧（M1・S6）。focus＝集中画面
 export type ScreenKind = 'cover' | 'root' | 'focus' | 'list';
 export type Side = 'use' | 'make';
 export type TabId = 'practice' | 'routines';
-export type RouteParams = { danceId?: string; routineId?: string };
+export type RouteParams = { danceId?: string; routineId?: string; figureSlug?: string };
 // 画面の見た目だけを強制するテスト用クエリ（Ruling 23・33。confirm-delete は S3・S7 の削除確認・Ruling 43・60-4。
 // mic-denied・no-voice・no-recorder は S8 の枠・Ruling 63-3（no-https は http で開いた時の非対応の枠・D53）。update-ready は S1・S3・S6・S7 の更新の帯・段7 Ruling 90-7）。
 // confirm-delete-all は S13 の「データを全て消す」の確認（段8・Ruling 99-3・100-2。見た目だけで、消さない）。
@@ -31,6 +32,7 @@ export const SCREENS: Record<ScreenId, ScreenSpec> = {
   U2: { kind: 'root', parent: 'S0', side: 'use', tab: 'routines', path: '/use/routines' },
   M0: { kind: 'root', parent: 'S0', side: 'make', tab: null, path: '/make' },
   M1: { kind: 'list', parent: 'M0', side: 'make', tab: null, path: '/make/routines' },
+  F1: { kind: 'focus', parent: 'S1', side: 'use', tab: null, path: '/figures/:danceId' },
   S2: { kind: 'focus', parent: 'S1', side: 'use', tab: null, path: '/practice/:danceId' },
   S4: { kind: 'focus', parent: 'M1', side: 'make', tab: null, path: '/routines/new' },
   S5: { kind: 'focus', parent: 'U2', side: 'use', tab: null, path: '/routines/:routineId/play' },
@@ -44,8 +46,11 @@ export const SCREENS: Record<ScreenId, ScreenSpec> = {
   S13: { kind: 'focus', parent: 'S6', side: null, tab: null, path: '/about' }
 };
 
-// S4 は「新規」と「編集」の2つの形を持つので、編集の形をここで足す。
-const EXTRA_PATHS: Array<{ screen: ScreenId; path: string }> = [{ screen: 'S4', path: '/routines/:routineId/edit' }];
+// S4 は「新規」と「編集」の2つの形を持つので、編集の形をここで足す。S2 はフィガーを鳴らす形（D57・Ruling 120-1）。
+const EXTRA_PATHS: Array<{ screen: ScreenId; path: string }> = [
+  { screen: 'S4', path: '/routines/:routineId/edit' },
+  { screen: 'S2', path: '/practice/:danceId/:figureSlug' }
+];
 // 古い経路（D56 より前の案内・ブックマーク）。今の画面に読み替え、resolve.ts がハッシュを置き換える
 const ALIAS_PATHS: Array<{ screen: ScreenId; path: string }> = [{ screen: 'U2', path: '/routines' }];
 
diff --git a/src/app/routines/figure-names.ts b/src/app/routines/figure-names.ts
index 7de4de7..6cd3378 100644
--- a/src/app/routines/figure-names.ts
+++ b/src/app/routines/figure-names.ts
@@ -109,3 +109,24 @@ export function figureNameSuggestions(danceId: string, query: string, locale: 'e
     .map(figure => figure.display[shown])
     .slice(0, limit);
 }
+
+// D57（Ruling 120-1）: 経路に入れるフィガーの印（英語名の小文字化・英数以外を「-」に畳み、前後の「-」を落とす）。
+// “Chasse from PP” → chasse-from-pp。照合済みの全フィガーで種目内に重複が無く、経路の 1 区切りに合うことをテストで固定する
+const FIGURE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
+export function figureSlug(englishName: string): string {
+  return englishName.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
+}
+export function isFigureSlug(value: unknown): value is string {
+  return typeof value === 'string' && FIGURE_SLUG.test(value);
+}
+
+// D57（Ruling 120-2）: 照合済みのフィガーの表示名（表示の言語の表記＝figureNameChoices と同じ）。登録簿の定義順の番号も返す（並べ替え用）。
+// 照合済みでない英語名は null（監修表は照合済みの名前だけ＝Ruling 110-2 (c)）
+export function verifiedFigure(danceId: string, englishName: string): { order: number; display: { ja: string; en: string } } | null {
+  const figures = FIGURES.filter(figure => figure.danceId === danceId);
+  const order = figures.findIndex(figure => figure.display.en === englishName);
+  return order < 0 ? null : { order, display: figures[order]!.display };
+}
+export function figureDisplayName(danceId: string, englishName: string, locale: 'en' | 'ja-JP'): string {
+  return verifiedFigure(danceId, englishName)?.display[shownIn(locale)] ?? englishName;
+}
diff --git a/src/app/routines/reviewed-counts.ts b/src/app/routines/reviewed-counts.ts
index 621a23f..d931dc6 100644
--- a/src/app/routines/reviewed-counts.ts
+++ b/src/app/routines/reviewed-counts.ts
@@ -1,4 +1,4 @@
-import { figureIdentity } from './figure-names.ts';
+import { figureIdentity, figureSlug, verifiedFigure } from './figure-names.ts';
 
 // 監修済みのカウント表（D52・Ruling 109・110）。ひとみうさが監修シート（docs/app-v1/figure-counts-review.md）で
 // 「判定」に OK か訂正を書いた行だけをここへ写す。判定が空の行（未監修の案）は 1 件も書かない（Ruling 3 はそのまま有効）。
@@ -45,3 +45,28 @@ export function reviewedCounts(danceId: string, name: string): ReviewedCount | n
   if (!identity.startsWith('figure:')) return null;
   return REVIEWED_COUNTS.find(entry => entry.danceId === danceId && figureIdentity(danceId, entry.englishName) === identity) ?? null;
 }
+
+// D57（Ruling 119・120-2）: 「フィガー」タブ（F1）が並べる、種目ごとの監修済みのフィガー（登録簿の定義順＝D20 の一覧と同じ順）。
+// slug は経路の印（figure-names.ts の figureSlug）。表が変わっても関数は同じ（テストは buildReviewedFigures に作り物の表を渡す）
+export interface ReviewedFigure { slug: string; englishName: string; counts: string }
+export interface ReviewedFigureTable {
+  reviewedFigures(danceId: string): readonly ReviewedFigure[];
+  reviewedFigureBySlug(danceId: string, slug: string | undefined): ReviewedFigure | null;
+}
+export function buildReviewedFigures(entries: readonly ReviewedCount[]): ReviewedFigureTable {
+  const byDance = new Map<string, ReviewedFigure[]>();
+  const sorted = entries
+    .map(entry => ({ entry, order: verifiedFigure(entry.danceId, entry.englishName)?.order ?? Number.MAX_SAFE_INTEGER }))
+    .sort((a, b) => a.order - b.order);
+  for (const { entry } of sorted) {
+    const list = byDance.get(entry.danceId) ?? [];
+    list.push(Object.freeze({ slug: figureSlug(entry.englishName), englishName: entry.englishName, counts: entry.counts }));
+    byDance.set(entry.danceId, list);
+  }
+  return {
+    reviewedFigures: danceId => byDance.get(danceId) ?? [],
+    reviewedFigureBySlug: (danceId, slug) => (slug === undefined ? null : byDance.get(danceId)?.find(figure => figure.slug === slug) ?? null)
+  };
+}
+export const REVIEWED_FIGURES: ReviewedFigureTable = buildReviewedFigures(REVIEWED_COUNTS);
+export const { reviewedFigures, reviewedFigureBySlug } = REVIEWED_FIGURES;
diff --git a/src/app/settings/settings.ts b/src/app/settings/settings.ts
index 2dc551e..e3690bc 100644
--- a/src/app/settings/settings.ts
+++ b/src/app/settings/settings.ts
@@ -1,6 +1,7 @@
 import { DANCE_PROFILES } from '../../engine/dance-profiles.js';
 import type { AppLocale } from '../i18n/index.ts';
 import { clampBpm, type SpeedChoice } from '../practice/speed.ts';
+import { isFigureSlug } from '../routines/figure-names.ts';
 import { isRoutineId } from '../routines/ids.ts';
 import { normalizeVoiceOffset } from '../practice/voice-offset.ts';
 import { DISTRIBUTOR_NAME_MAX } from '../share/limits.ts';
@@ -20,6 +21,7 @@ export interface AppSettings {
   selectedVoiceId: string;                  // 声の ID（標準・録音・受け取り）。見つからない・未完成なら再生時に標準（英語）へ落とす（Ruling 61-2）
   voiceOffsetMsByVoiceId: Record<string, number>;   // 標準の声のタイミング（ms・±200・0 は持たない）
   lastDanceId: string | null;               // 「前回」カード（無ければ出さない）
+  lastFigure: string | null;                // 前回のフィガー（D57・Ruling 121。監修表の slug。基本のカウントなら null。lastDanceId と組）
   lastTemplateByDance: Record<string, string>;
   speedPresetByDance: Record<string, SpeedChoice>;
   customBpmByDance: Record<string, number>;
@@ -41,6 +43,7 @@ export const DEFAULT_SETTINGS: AppSettings = Object.freeze({
   selectedVoiceId: STANDARD_VOICE_ID,
   voiceOffsetMsByVoiceId: {},
   lastDanceId: null,
+  lastFigure: null,
   lastTemplateByDance: {},
   speedPresetByDance: {},
   customBpmByDance: {},
@@ -66,6 +69,7 @@ export function normalizeSettings(raw: unknown): AppSettings {
     selectedVoiceId: isVoiceId(source.selectedVoiceId) ? source.selectedVoiceId : STANDARD_VOICE_ID,
     voiceOffsetMsByVoiceId: pickVoiceOffsets(source.voiceOffsetMsByVoiceId),
     lastDanceId: typeof source.lastDanceId === 'string' && Object.hasOwn(DANCES, source.lastDanceId) ? source.lastDanceId : null,
+    lastFigure: typeof source.lastDanceId === 'string' && Object.hasOwn(DANCES, source.lastDanceId) && isFigureSlug(source.lastFigure) ? source.lastFigure : null,
     lastTemplateByDance: pickByDance(source.lastTemplateByDance, (danceId, value) =>
       typeof value === 'string' && DANCES[danceId]!.templates.includes(value) ? value : undefined),
     speedPresetByDance: pickByDance(source.speedPresetByDance, (_danceId, value) =>
```

- [ ] **Step 4: 通ることを確かめる**

Expected: `tests 671`・`fail 0`、`typecheck-ok`、ui:check **769 PASS**（状態は増えない＝画面は同じ）、スモーク 4 本 OK。

- [ ] **Step 5: コミット**

```bash
git add src/app/routines/figure-names.ts src/app/routines/reviewed-counts.ts src/app/router/routes.ts src/app/router/resolve.ts \
  src/app/settings/settings.ts src/app/practice/preferences.ts \
  test/app/routes.test.ts test/app/router-resolve.test.ts test/app/routines/figure-names.test.ts test/app/routines/reviewed-counts.test.ts \
  test/app/settings/settings.test.ts test/app/practice/preferences.test.ts
git commit -m "feat(app): フィガーの印・監修表の一覧・F1 と S2 のフィガーの経路・前回のフィガー（D57・Ruling 119〜121）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: 「種目のフィガー」F1 の画面・タイルの振り分け・S2 のフィガーの形・前回「ワルツ · ウィスク」

**担当:** Opus。**Ruling 119・120-5〜120-8・121-2〜121-5・122。D52 の「自動入力なし」の ui:check の状態を戻す（発見 12）。**

**Files:**
- Create: `src/app/screens/FigureListScreen.tsx`・`src/app/i18n/LastPracticeName.tsx`
- Modify: `src/app/App.tsx`（F1・S2 の `key` に slug）・`src/app/screens/{Home,Cover,Practice}Screen.tsx`・`src/app/state/resume.ts`（`lastPractice`・`resumePractice(last)`）・`src/app/i18n/messages.ts`（`basicCount`）・`src/app/styles/base.css`・`tools/i18n/copy-review-sheet.js`・生成物 2 つ
- Test: `tools/check-app-ui.js`（F1・S2 のフィガー・前回・タイルの行き先・`requires: 'reviewed'`・D52 の状態）・`tools/smoke-practice.js`（U1 → F1 → 鳴る → 戻る・G1 が F1 を通る時）・`tools/smoke-pwa.js`（オフラインのワルツが F1 を通る時）

**Interfaces:**
- Produces: F1 の `[data-basic]`（基本のカウント・押すとすぐ鳴る）・`[data-list] [data-figure="<slug>"]`。S2 の見出しの下「ウィスク · 1 2 3」・フィガーの時 `[data-group="pattern"]` は無い。`settings.lastFigure` を S2 を開いた時に `lastDanceId` と 1 回で書く。U1 の前回カード・表紙の「続きから」は `LastPracticeName`。ui:check の `tileHrefs`・`figureRows`・`heading`・`resumeName`・`requires: 'reviewed'`（ワルツに監修済みが無ければ「スキップ」）・`tilesMayScrollAt320`。
- Consumes: Task 4 の `reviewedFigures`・`reviewedFigureBySlug`・`figureDisplayName`・`practiceCounts`・経路。Task 3 の帯（フィガーの語で並ぶ）。

**決まり**: 行を押すとすぐ鳴る（`unlockAudioInsideTap` → `requestAutoplay({ kind:'dance', id })` → `navigate`。印は種目だけ・フィガーは経路が運ぶ）。F1 の一覧の下に文は置かない。フィガーの名前は読み上げない。S5・S4 は触らない。`lastTemplateByDance` はフィガーの時は読まない・書かない（チップが無い）。

- [ ] **Step 1: 失敗する検査を書く**

`git apply --whitespace=nowarn .superpowers/sdd/role-split/t5-test.diff`:

<!-- diff: t5-test -->
```diff
diff --git a/tools/check-app-ui.js b/tools/check-app-ui.js
index 1e3b5cf..4197464 100644
--- a/tools/check-app-ui.js
+++ b/tools/check-app-ui.js
@@ -8,7 +8,11 @@ import { AxeBuilder } from '@axe-core/playwright';
 import { chromium } from 'playwright-core';
 import { ABOUT_TEXT } from '../src/app/i18n/about.ts';
 import { APP_MESSAGES } from '../src/app/i18n/messages.ts';
-import { SCREENS, showsTabs } from '../src/app/router/routes.ts';
+import { SCREENS, buildHash, showsTabs } from '../src/app/router/routes.ts';
+import { reviewedFigures } from '../src/app/routines/reviewed-counts.ts';
+import { figureDisplayName } from '../src/app/routines/figure-names.ts';
+import { formatCounts } from '../src/app/lib/count-display.ts';
+import { DANCE_PROFILES } from '../src/engine/dance-profiles.js';
 import { UI_CHECK_ROUTINES as R, manyRoutines, openAfterSeed, seedRoutinesInPage } from './ui-check-routines.js';
 import { UI_CHECK_VOICES as V, seedVoicePacksInPage } from './ui-check-voices.js';
 
@@ -55,6 +59,16 @@ const IOS_CHROME_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_3 like Mac OS X) Ap
 const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
 const PLAYED = { lastDanceId: 'waltz', hints: { firstPlaybackDone: true } };   // 初めて鳴った後（S1 の案内カードの条件）
 const S4_13 = `#/routines/${R.waltz13.id}/edit`;
+// D57（Ruling 119-2）: U1 のタイルの行き先（監修済みのフィガーが 1 件以上なら F1、0 件なら S2）。表が空なら全部 S2＝今までと同じ
+const figureNameJa = (danceId, englishName) => figureDisplayName(danceId, englishName, 'ja-JP');
+const spaced = counts => formatCounts('waltz', counts);
+const TILE_HREFS = Object.keys(DANCE_PROFILES).map(danceId => buildHash({ screen: reviewedFigures(danceId).length > 0 ? 'F1' : 'S2', params: { danceId } }));
+// D57（Ruling 122-3）: requires: 'reviewed' の状態はワルツに監修済みのフィガーがある時だけ走る（無ければ「スキップ」と 1 行出して飛ばす）。
+// 期待値はワルツの表から作る（1 行目＝基本・2 行目＝表の 1 件目）
+const WALTZ_FIGURES = reviewedFigures('waltz');
+const REVIEWED = WALTZ_FIGURES.length > 0;
+const W1 = WALTZ_FIGURES[0];
+const W_TWO_BARS = WALTZ_FIGURES.find(figure => figure.counts.length > 4) ?? W1;
 const S5_13 = `#/routines/${R.waltz13.id}/play`;
 const STATES = [
   // D56（Ruling 115-1・118-3）: 表紙 S0。扉「使う」「作る」＋行「設定」＝3。初めて鳴った後は「使う」の扉にくっついた「前回の練習 ▶ 続きから」で 4（C 案）。
@@ -63,11 +77,18 @@ const STATES = [
   { name: 'S0 前回あり', hash: '#/', screen: 'S0', kind: 'cover', settingsSeed: PLAYED, ops: 4, total: 4, firstView: ['[data-door="use"]', '[data-resume]', '[data-door="make"]', '.dc-cover-settings'],
     placed: [['[data-resume]', '[data-door="use"]']], textKeys: ['continueLast'] },
   // S2 を開いただけ（まだ鳴らしていない）では「続きから」は出さない（hints.firstPlaybackDone が立ってから。Ruling 115-1）
+  { name: 'S0 前回あり・フィガー', hash: '#/', screen: 'S0', kind: 'cover', requires: 'reviewed', ops: 4, total: 4,
+    settingsSeed: REVIEWED ? { lastDanceId: 'waltz', lastFigure: W1.slug, hints: { firstPlaybackDone: true } } : undefined, resumeName: REVIEWED ? `ワルツ · ${figureNameJa('waltz', W1.englishName)}` : undefined },
   { name: 'S0 開いただけ', hash: '#/', screen: 'S0', kind: 'cover', prepare: '#/practice/waltz', ops: 3, total: 3, absent: ['[data-resume]'] },
   { name: 'S0 更新あり', hash: '#/?ui-state=update-ready', screen: 'S0', kind: 'cover', ops: 3, total: 3, alert: true, texts: ['新しい版があります。'], bannerAfter: '.dc-cover-settings' },
   // U1（S1 の ID のまま #/use。D56 Ruling 115-2）: 「先生の声で練習」カードを外した。主要操作は 種目群 1（前回カードがあれば 2）。左上「‹ 表紙」・下タブ 2 つ
-  { name: 'S1 初回', hash: '#/use', screen: 'S1', kind: 'root', ops: 1, total: 1, tilesInView: true, absent: ['[data-teacher-card]'], textKeys: ['backToCover', 'tabFigures'] },
+  { name: 'S1 初回', hash: '#/use', screen: 'S1', kind: 'root', ops: 1, total: 1, tilesInView: true, absent: ['[data-teacher-card]'], textKeys: ['backToCover', 'tabFigures'], tileHrefs: TILE_HREFS },
   { name: 'S1 前回あり', hash: '#/use', screen: 'S1', kind: 'root', ops: 2, tilesInView: true, prepare: '#/practice/waltz' },
+  // D57（Ruling 121-2・121-4）: 前回がフィガーなら「ワルツ · ウィスク」。表に無い slug（訂正で外れた）は種目名だけ
+  // 320 幅の英語では「Waltz · Closed Changes」が 2 行になり、最後の 2 タイルが下へ（320 は「横スクロール無し」の幅＝段8 発見 20。375×548 では入る）
+  { name: 'S1 前回あり・フィガー', hash: '#/use', screen: 'S1', kind: 'root', ops: 2, tilesInView: true, tilesMayScrollAt320: true, requires: 'reviewed', prepare: REVIEWED ? `#/practice/waltz/${W1.slug}` : undefined,
+    resumeName: REVIEWED ? `ワルツ · ${figureNameJa('waltz', W1.englishName)}` : undefined },
+  { name: 'S1 前回のフィガーが表に無い', hash: '#/use', screen: 'S1', kind: 'root', ops: 2, tilesInView: true, settingsSeed: { lastDanceId: 'waltz', lastFigure: 'no-such-figure' }, resumeName: 'ワルツ' },
   // 段7（Ruling 90-3・90-7）: 更新の帯は S1 の最下段（種目タイルの下）。「更新する」は [data-alert-action]＝数えない。375×548 の初期表示（U12）は崩れない
   { name: 'S1 更新あり', hash: '#/use?ui-state=update-ready', screen: 'S1', kind: 'root', ops: 1, total: 1, tilesInView: true, alert: true,
     texts: ['新しい版があります。', '更新する'], bannerAfter: '.dc-tiles' },
@@ -76,6 +97,23 @@ const STATES = [
   { name: 'S1 案内カード', hash: '#/use', screen: 'S1', kind: 'root', settingsSeed: PLAYED, userAgent: IOS_SAFARI_UA, total: 4, tilesInView: true,
     texts: ['ホーム画面に追加すると、アプリのように使えます', '閉じる'], placed: [['[data-install-card]', '.dc-tiles']] },
   { name: 'S1 案内カード（PC では出ない）', hash: '#/use', screen: 'S1', kind: 'root', settingsSeed: PLAYED, ops: 2, total: 2, tilesInView: true, absent: ['[data-install-card]'] },
+  // D57（Ruling 119・120）: F1 ワルツ（監修済みが 1 件以上の時だけ）。基本の行 1・一覧 1＝2。見出しは種目名、基本の行は初期表示、行は表の件数
+  { name: 'F1 ワルツ', hash: '#/figures/waltz', screen: 'F1', kind: 'focus', requires: 'reviewed', ops: 2, total: 2, textKeys: ['basicCount', 'tabFigures'],
+    firstView: ['[data-basic]', '[data-list] [data-figure]'], figureRows: WALTZ_FIGURES.length, heading: 'ワルツ' },
+  // U1 のタイルから（実経路）: 画面が替わると見出し h1 にフォーカス
+  { name: 'F1（タイルから）', hash: '#/figures/waltz', via: { hash: '#/use', screen: 'S1' }, screen: 'F1', kind: 'focus', requires: 'reviewed', ops: 2, total: 2, focusHeading: true,
+    steps: [{ click: '[data-group="dance"] a >> nth=0' }, { wait: '[data-screen="F1"]' }] },
+  // S2 のフィガーの形: 見出しの下に「名前 · 型」・帯はフィガーの語・くわしくの「カウントの型」は無い（開くと 8＝ワルツは 1 減る）
+  { name: 'S2 フィガー', hash: REVIEWED ? `#/practice/waltz/${W1.slug}` : '#/practice/waltz', screen: 'S2', kind: 'focus', requires: 'reviewed', ops: 5, speedAndPlay: true,
+    texts: REVIEWED ? [`${figureNameJa('waltz', W1.englishName)} · ${spaced(W1.counts)}`] : [], strip: REVIEWED ? { labels: spaced(W1.counts) } : undefined },
+  { name: 'S2 フィガー・くわしく開', hash: REVIEWED ? `#/practice/waltz/${W1.slug}` : '#/practice/waltz', screen: 'S2', kind: 'focus', requires: 'reviewed', openMore: true, total: 8,
+    absent: ['[data-group="pattern"]'] },
+  // 長い名前（「ヘジテーションチェンジ · 1 2 3 1 2 3」）は見出しの下で 1 行増え、375 幅では声チップが ▶ の帯の下に入る（スクロールで届く。S5 と同じ扱い＝Ruling 71-6）。
+  // 速さと ▶ は初期表示のまま（speedAndPlay）なので ops は固定しない
+  { name: 'S2 2 小節のフィガー', hash: REVIEWED ? `#/practice/waltz/${W_TWO_BARS.slug}` : '#/practice/waltz', screen: 'S2', kind: 'focus', requires: 'reviewed', speedAndPlay: true,
+    strip: REVIEWED ? { labels: spaced(W_TWO_BARS.counts) } : undefined },
+  // 表に無い slug は S2 の基本へ置き換え（Ruling 120-4）
+  { name: 'S2 表に無いフィガー', hash: '#/practice/waltz/no-such-figure', screen: 'S2', kind: 'focus', ops: 5, speedAndPlay: true, landsOn: '#/practice/waltz', strip: { labels: '1 2 3' } },
   { name: 'S2 くわしく閉', hash: '#/practice/waltz', screen: 'S2', kind: 'focus', ops: 5, speedAndPlay: true, strip: { labels: '1 2 3' } },
   // D55（Ruling 114）: カウントの型の帯。ジャイブは 6 拍の型の 8 語（a も丸）・タンゴは S が Q の 2 倍の幅・320 でも 1 行
   { name: 'S2 ジャイブの帯', hash: '#/practice/jive', screen: 'S2', kind: 'focus', ops: 5, speedAndPlay: true, strip: { labels: '1 2 3 a 4 5 a 6' } },
@@ -143,6 +181,11 @@ const STATES = [
   { name: 'S4 追加の行・名前を選んだ後', hash: S4_13, screen: 'S4', kind: 'focus', seed: SEEDED, total: 6, patterns: 8, pressed: 1,
     autoFilled: { from: 'reviewed', counts: '12&3', name: 'フォーラウェイリバース＆スリップピボット' }, textKeys: ['countsFromReviewed'],
     steps: [{ click: '.dc-add-tail' }, { click: '[data-group="figure-names"] .dc-chip >> nth=16' }] },
+  // D52（3d2f51e で監修表が 20 件になった後も「自動入力なし」を 1 つ持つ）: 0 件のタンゴの追加の行で、監修していない照合済みのフィガー（一覧の 5 番目
+  // 「ナチュラルツイストターン」）を選ぶ → 欄は空・形は押されない・自動入力の行なし・「追加する」は押せない
+  { name: 'S4 追加の行・監修していない名前', hash: `#/routines/${R.empty.id}/edit`, screen: 'S4', kind: 'focus', seed: SEEDED, total: 4, patterns: 8, pressed: 0,
+    nameChosen: 'ナチュラルツイストターン', absent: ['[data-auto-counts]'],
+    steps: [{ click: '.dc-dock-button' }, { click: '[data-group="figure-names"] .dc-chip >> nth=4' }] },
   // D52・Ruling 107・108: 2 本目のワルツ（waltzAuto）がこの名前を 12&3 で持つ → タップで欄に 12&3・形が 1 つ押され・「前に使ったカウントです」・
   // 「追加する」が押せる（名前をタップ → 追加するの 2 タップ）。操作の数は不変（6）。印の行は欄の aria-describedby に入る
   { name: 'S4 追加の行・前に使ったカウント', hash: S4_13, screen: 'S4', kind: 'focus', seed: [...SEEDED, R.waltzAuto], total: 6, patterns: 8, pressed: 1,
@@ -341,7 +384,8 @@ const sharedSeed = () => [...new Map(STATES.filter(state => !state.bulkSeed).fla
 const JAPANESE_ONLY_CHECKS = { voiceRows: undefined, actions: undefined, nameChoices: undefined, nameChosen: undefined, sameNameCopy: undefined,
   doneName: undefined, linkGroups: undefined, barNote: undefined };
 const ONLY = (process.env.DC_ONLY ?? '').split(',').map(item => item.trim()).filter(Boolean);
-const CHECKED = ONLY.length ? STATES.filter(state => ONLY.some(prefix => state.name.startsWith(prefix))) : STATES;
+const SKIPPED = STATES.filter(state => state.requires === 'reviewed' && !REVIEWED);
+const CHECKED = (ONLY.length ? STATES.filter(state => ONLY.some(prefix => state.name.startsWith(prefix))) : STATES).filter(state => !SKIPPED.includes(state));
 
 // 偽マイク（ファイル指定なし＝既定のビープ。S8 に「録音をはじめる」で入るため。既存の状態には無害。Ruling 63-4）
 const browser = await chromium.launch({ channel: 'chrome', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] }).catch(error => {
@@ -351,6 +395,7 @@ const browser = await chromium.launch({ channel: 'chrome', args: ['--use-fake-de
 });
 
 let violations = 0;
+for (const state of SKIPPED) console.log(`\n== ${state.name} : スキップ（監修表にワルツが無い。Ruling 122-3）`);
 const report = (label, problems) => {
   console.log(`\n== ${label} : ${problems.length ? `${problems.length} 件の違反` : 'PASS'}`);
   for (const problem of problems) console.log(`  ${problem}`);
@@ -872,7 +917,7 @@ function audit({ state, LIMITS, reducedMotion }) {
   }
 
   // U12 S1（U1）: 10種目が初期表示に入る（Ruling 16・D56 Ruling 118-3 の tilesInView）
-  if (state.tilesInView) {
+  if (state.tilesInView && !(state.narrow && state.tilesMayScrollAt320)) {
     const tiles = [...document.querySelectorAll('[data-group="dance"] > *')];
     if (tiles.length !== 10) issues.push(`U12 expected 10 dance tiles, found ${tiles.length}`);
     tiles.forEach((tile, index) => { if (!fullyInView(tile)) issues.push(`U12 dance tile ${index + 1} is not fully in the first view (bottom ${Math.round(tile.getBoundingClientRect().bottom)} > ${Math.round(usableBottom)})`); });
@@ -1016,6 +1061,23 @@ function audit({ state, LIMITS, reducedMotion }) {
     }
     if (form?.querySelector('.dc-primary')?.disabled) issues.push('D52 "Add" is not pressable after the counts were filled in');
   }
+  // D57（Ruling 119-2）: U1 のタイルの行き先
+  if (state.tileHrefs) {
+    const hrefs = [...document.querySelectorAll('[data-group="dance"] a')].map(tile => tile.getAttribute('href'));
+    if (JSON.stringify(hrefs) !== JSON.stringify(state.tileHrefs)) issues.push(`R119 tile links ${JSON.stringify(hrefs)}, expected ${JSON.stringify(state.tileHrefs)}`);
+  }
+  // D57（Ruling 119-3・121-2）: F1 の行の数・見出し、前回の名前
+  if (state.figureRows !== undefined) {
+    const rows = [...document.querySelectorAll('[data-list] [data-figure]')].filter(visible);
+    if (rows.length !== state.figureRows) issues.push(`R119 ${rows.length} figure rows, expected ${state.figureRows}`);
+    const basic = document.querySelector('[data-basic]');
+    if (basic?.parentElement?.closest('[data-list]')) issues.push('R119 the basic count row is inside the list');
+  }
+  if (state.heading && !state.english && document.querySelector('main h1')?.textContent.trim() !== state.heading) issues.push(`R119 the heading reads "${document.querySelector('main h1')?.textContent.trim()}", expected "${state.heading}"`);
+  if (state.resumeName && !state.english) {
+    const name = document.querySelector('[data-resume] .dc-resume-text b')?.textContent.trim();
+    if (name !== state.resumeName) issues.push(`R121 the last practice reads "${name}", expected "${state.resumeName}"`);
+  }
   // D55（Ruling 114-2・114-3）: 帯は 1 行で枠からはみ出さない（320 でも）・丸は 12 まで・状態の期待（語の並び・S が Q の 2 倍）
   for (const strip of document.querySelectorAll('.dc-beats')) {
     if (!visible(strip)) continue;
diff --git a/tools/smoke-practice.js b/tools/smoke-practice.js
index 8f4c576..59fc541 100644
--- a/tools/smoke-practice.js
+++ b/tools/smoke-practice.js
@@ -5,11 +5,14 @@
 // （表示はエンジンの frame が AudioContext.currentTime から作るので、時計が止まっていれば変わらない）。
 // 前提: `npm run dev`（既定 http://localhost:5173/）。DC_BASE_URL で変更可。失敗があれば終了コード1。
 import { chromium } from 'playwright-core';
+import { figureDisplayName } from '../src/app/routines/figure-names.ts';
+import { reviewedFigures } from '../src/app/routines/reviewed-counts.ts';
 
 const BASE = process.env.DC_BASE_URL ?? 'http://localhost:5173/';
 const SOUND_TIMEOUT_MS = 10000;
 const STRIP_WATCH_MS = 9000;      // ジャイブ（はじめの合図 2 小節＋型 1 周以上）を見る長さ   // はじめの合図（2小節。ワルツ♩=84で約4.3秒、D17）＋声の読み込みを待っても、この間にカウントが3種類変わること
 const errors = [];
+let figureNote = '';
 const browser = await chromium.launch({ channel: 'chrome' });
 
 async function expectSounding(page, label) {
@@ -40,12 +43,19 @@ try {
   await page.waitForSelector('[data-screen="S1"]');
   if (await page.locator('[data-resume]').count()) errors.push('G1: resume card shown on first visit');
   await page.locator('[data-group="dance"] a').first().click(); // 2
+  // D57（Ruling 119-7）: 監修済みのフィガーがある種目（ワルツ）は F1 に着き、一番上の「基本のカウント」を押すとすぐ鳴る（3 タップのまま）。無ければ S2 の ▶
+  await page.waitForSelector('[data-screen="S2"], [data-screen="F1"]');
+  const viaFigures = await page.locator('[data-screen="F1"]').count() > 0;
+  await page.locator(viaFigures ? '[data-basic]' : '[data-play]').click(); // 3
   await page.waitForSelector('[data-screen="S2"]');
-  await page.locator('[data-play]').click(); // 3
   await expectSounding(page, 'G1');
 
-  // 戻る（履歴あり）: S1 へ戻り、前回カードが出る。
+  // 戻る（履歴あり）: S1 へ戻り（F1 を通ったら F1 → S1）、前回カードが出る。
   await page.locator('[data-back]').click();
+  if (viaFigures) {
+    await page.waitForSelector('[data-screen="F1"]');
+    await page.locator('[data-back]').click();
+  }
   await page.waitForSelector('[data-screen="S1"]');
   if (!(await page.locator('[data-resume]').count())) errors.push('G2: resume card missing after a visit');
 
@@ -87,6 +97,31 @@ try {
   await page.waitForSelector('[data-screen="S0"]');
   if (!page.url().endsWith('#/')) errors.push(`"‹ Cover" without history should replace with #/ (url ${page.url()})`);
 
+  // D57（Ruling 122-3）: U1 → ワルツ → F1 → 2 行目（表の 1 件目のフィガー）を押すとすぐ鳴る → 見出しの下に名前 →「‹ 戻る」で F1 →「‹ 戻る」で U1。
+  // 監修表にワルツが無い間は「スキップ」
+  const waltzFigures = reviewedFigures('waltz');
+  if (waltzFigures.length === 0) figureNote = 'F1 skipped (no reviewed waltz figures)';
+  else {
+    await page.goto(`${BASE}#/use`);
+    await page.waitForSelector('[data-screen="S1"]');
+    await page.locator('[data-group="dance"] a').first().click();
+    await page.waitForSelector('[data-screen="F1"]');
+    await page.locator('[data-list] [data-figure]').first().click();
+    await page.waitForSelector('[data-screen="S2"]');
+    await expectSounding(page, 'F1 figure');
+    const name = figureDisplayName('waltz', waltzFigures[0].englishName, 'ja-JP');
+    const heading = (await page.locator('.dc-playhead small').textContent())?.trim() ?? '';
+    if (!heading.startsWith(`${name} · `)) errors.push(`D57: the S2 heading reads "${heading}", expected "${name} · …"`);
+    if (!page.url().endsWith(`#/practice/waltz/${waltzFigures[0].slug}`)) errors.push(`D57: S2 url ${page.url()}`);
+    await page.locator('[data-back]').click();
+    await page.waitForSelector('[data-screen="F1"]');
+    await page.locator('[data-back]').click();
+    await page.waitForSelector('[data-screen="S1"]');
+    const resume = (await page.locator('[data-resume] .dc-resume-text b').textContent())?.trim();
+    if (resume !== `ワルツ · ${name}`) errors.push(`D57: the last-time card reads "${resume}"`);
+    figureNote = `F1 → ${waltzFigures[0].slug} played`;
+  }
+
   // D55（Ruling 114-9）: ジャイブを鳴らすと、帯の琥珀の丸（aria-current）が 1 2 3 a 4 5 a 6 の順に進み、大きな語と同じ文字。時間は実再生・判定は順序だけ
   await page.goto(`${BASE}#/practice/jive`);
   await page.waitForSelector('[data-screen="S2"]');
@@ -120,4 +155,4 @@ if (errors.length) {
   console.error(errors.join('\n'));
   process.exit(1);
 }
-console.log('practice smoke OK: the jive strip lights 1 2 3 a 4 5 a 6 in order with the big count; G1 (3 taps from the cover) and G2 (1 tap: the U1 card and the cover) play, tabs do not stack history, reload does not autoplay, back falls back to the parent');
+console.log(`practice smoke OK: ${figureNote}; the jive strip lights 1 2 3 a 4 5 a 6 in order with the big count; G1 (3 taps from the cover) and G2 (1 tap: the U1 card and the cover) play, tabs do not stack history, reload does not autoplay, back falls back to the parent`);
diff --git a/tools/smoke-pwa.js b/tools/smoke-pwa.js
index 4da1fd1..dbfcec1 100644
--- a/tools/smoke-pwa.js
+++ b/tools/smoke-pwa.js
@@ -106,8 +106,11 @@ try {
   await page.locator('[data-door="use"]').click();
   await page.waitForSelector('[data-screen="S1"]');
   await page.locator('[data-group="dance"] a').first().click();
+  // D57: ワルツに監修済みのフィガーがあれば F1 を通る（網なしでも一覧が描け、「基本のカウント」を押すとすぐ鳴る）
+  await page.waitForSelector('[data-screen="S2"], [data-screen="F1"]');
+  const viaFigures = await page.locator('[data-screen="F1"]').count() > 0;
+  await page.locator(viaFigures ? '[data-basic]' : '[data-play]').click();
   await page.waitForSelector('[data-screen="S2"]');
-  await page.locator('[data-play]').click();
   await expectSounding(page, 'offline waltz');
   await page.locator('[data-play]').click();   // 止める
   if (!audio.some(item => /six\.wav\?v=/.test(item.url) && item.sw)) errors.push('six.wav?v=… was not answered by the service worker (ignoreURLParametersMatching)');
```

- [ ] **Step 2: 失敗を確かめる**

Run: `DC_BASE_URL=http://localhost:5185/ DC_ONLY="F1,S2 フィガー,S1 初回" npm run -s ui:check | grep -cE "件の違反"`
Expected: 0 より大きい（F1 がまだ表紙・タイルの `href` が全部 `#/practice/…`）。`npm test` は `671`・`fail 0` のまま。

- [ ] **Step 3: 実装する**

`git apply --whitespace=nowarn .superpowers/sdd/role-split/t5-impl.diff` の後:

<!-- diff: t5-impl -->
```diff
diff --git a/src/app/App.tsx b/src/app/App.tsx
index b922792..886a800 100644
--- a/src/app/App.tsx
+++ b/src/app/App.tsx
@@ -12,6 +12,7 @@ import { resolveScreen } from './router/resolve.ts';
 import { buildHash, showsTabs, tabOf, type ScreenId } from './router/routes.ts';
 import { AboutScreen } from './screens/AboutScreen.tsx';
 import { CoverScreen } from './screens/CoverScreen.tsx';
+import { FigureListScreen } from './screens/FigureListScreen.tsx';
 import { HomeScreen } from './screens/HomeScreen.tsx';
 import { InstallHelpScreen } from './screens/InstallHelpScreen.tsx';
 import { MakeScreen } from './screens/MakeScreen.tsx';
@@ -49,7 +50,7 @@ function openStorageWithin(ms: number): Promise<AppStorage | null> {
   });
 }
 
-// 中身だけで描ける画面（引数の要る S2・S4・S5・U2・M1・S7・S8・S10・S13 は下で個別に描く）。S9 は印（share-intent）・S10 は受け口（inbox）をマウント時に 1 回だけ読む。どの画面を出すかは router/resolve.ts が決める。
+// 中身だけで描ける画面（引数の要る F1・S2・S4・S5・U2・M1・S7・S8・S10・S13 は下で個別に描く）。S9 は印（share-intent）・S10 は受け口（inbox）をマウント時に 1 回だけ読む。どの画面を出すかは router/resolve.ts が決める。
 const SIMPLE_SCREENS: Partial<Record<ScreenId, ComponentType>> = {
   S0: CoverScreen,
   S1: HomeScreen,
@@ -149,7 +150,8 @@ export function App() {
           <StorageContext.Provider value={storage.current}>
             <div class="dc-shell" lang={locale} ref={shell} data-tabs={tabs ? '' : undefined}>
               <IconSprite />
-              {screen === 'S2' ? <PracticeScreen key={route.params.danceId} danceId={route.params.danceId!} uiState={route.query.uiState} />
+              {screen === 'S2' ? <PracticeScreen key={`${route.params.danceId}/${route.params.figureSlug ?? ''}`} danceId={route.params.danceId!} figureSlug={route.params.figureSlug} uiState={route.query.uiState} />
+                : screen === 'F1' ? <FigureListScreen key={route.params.danceId} danceId={route.params.danceId!} />
                 : screen === 'U2' ? <RoutinesScreen key="use" mode="use" uiState={route.query.uiState} />
                 : screen === 'M1' ? <RoutinesScreen key="make" mode="make" uiState={route.query.uiState} />
                 : screen === 'S4' ? <RoutineEditScreen routineId={route.params.routineId} uiState={route.query.uiState} />
diff --git a/src/app/i18n/LastPracticeName.tsx b/src/app/i18n/LastPracticeName.tsx
new file mode 100644
index 0000000..ae1805a
--- /dev/null
+++ b/src/app/i18n/LastPracticeName.tsx
@@ -0,0 +1,15 @@
+import { figureDisplayName } from '../routines/figure-names.ts';
+import type { LastPractice } from '../state/resume.ts';
+import { DanceName } from './DanceName.tsx';
+import type { AppLocale } from './index.ts';
+
+// 前回の練習の名前（D57・Ruling 121-2）: 「ワルツ · ウィスク」（種目名 ＋ ` · ` ＋ 表示言語のフィガー名）。基本のカウントなら種目名だけ。
+// フィガー名の前で折れてよい（375 で 1 行に入らない長い名前がある）
+export function LastPracticeName({ last, locale }: { last: LastPractice; locale: AppLocale }) {
+  return (
+    <>
+      <DanceName danceId={last.danceId} locale={locale} />
+      {last.figure && <> · <wbr />{figureDisplayName(last.danceId, last.figure.englishName, locale)}</>}
+    </>
+  );
+}
diff --git a/src/app/i18n/messages.ts b/src/app/i18n/messages.ts
index 08b6129..e4910bd 100644
--- a/src/app/i18n/messages.ts
+++ b/src/app/i18n/messages.ts
@@ -31,6 +31,7 @@ export const APP_MESSAGES = {
     cannotPlayEmpty: 'No figures yet. You can fix this in “Make”.',
     cannotPlayFix: 'Some counts need fixing. You can fix this in “Make”.',
     recordFromMake: 'To record your own voice, go to “Make” on the cover.',
+    basicCount: 'Basic count',
     chooseDance: 'Choose a dance',
     danceGroup: 'Dances',
     lastTime: 'Last time',
@@ -322,6 +323,7 @@ export const APP_MESSAGES = {
     cannotPlayEmpty: 'フィガーがありません。「作る」で直せます。',
     cannotPlayFix: 'カウントに直す所があります。「作る」で直せます。',
     recordFromMake: '自分の声の録音は、表紙の「作る」から。',
+    basicCount: '基本のカウント',
     chooseDance: '種目を選んでください',
     danceGroup: '種目',
     lastTime: '前回',
diff --git a/src/app/screens/CoverScreen.tsx b/src/app/screens/CoverScreen.tsx
index 77ef058..d149399 100644
--- a/src/app/screens/CoverScreen.tsx
+++ b/src/app/screens/CoverScreen.tsx
@@ -1,10 +1,10 @@
 import { Icon } from '../components/Icon.tsx';
 import { UpdateBanner } from '../components/UpdateBanner.tsx';
-import { DanceName } from '../i18n/DanceName.tsx';
+import { LastPracticeName } from '../i18n/LastPracticeName.tsx';
 import { phrased } from '../i18n/phrased.tsx';
 import { buildHash } from '../router/routes.ts';
 import { useI18n } from '../state/i18n.ts';
-import { resumePractice } from '../state/resume.ts';
+import { lastPractice, resumePractice } from '../state/resume.ts';
 import { useSettings } from '../state/settings.ts';
 
 // S0 表紙（D56・Ruling 115-1・117）。起動のたびに出る（側は覚えない）。上から: アプリ名と言語 → 扉「使う」（主・紺）＋その下にくっついた
@@ -14,7 +14,7 @@ export function CoverScreen() {
   const { translator, setLocale } = useI18n();
   const { settings } = useSettings();
   const locale = translator.locale;
-  const lastDanceId = settings.hints.firstPlaybackDone ? settings.lastDanceId : null;
+  const last = settings.hints.firstPlaybackDone ? lastPractice(settings) : null;
   return (
     <main class="dc-screen dc-cover" data-screen="S0">
       <header class="dc-appbar">
@@ -34,11 +34,11 @@ export function CoverScreen() {
           <span class="dc-door-text"><b>{translator.t('coverUse')}</b><small data-description>{phrased(translator, 'coverUseSub')}</small></span>
           <Icon name="chev-r" />
         </a>
-        {lastDanceId && (
-          <button type="button" class="dc-door-resume" data-resume onClick={() => resumePractice(lastDanceId)}>
+        {last && (
+          <button type="button" class="dc-door-resume" data-resume onClick={() => resumePractice(last)}>
             <span class="dc-resume-text">
               <small>{translator.t('continueLast')}</small>
-              <b><DanceName danceId={lastDanceId} locale={locale} /></b>
+              <b><LastPracticeName last={last} locale={locale} /></b>
             </span>
             <span class="dc-resume-go"><Icon name="play" /><span>{translator.t('resume')}</span></span>
           </button>
diff --git a/src/app/screens/FigureListScreen.tsx b/src/app/screens/FigureListScreen.tsx
new file mode 100644
index 0000000..69bb9d0
--- /dev/null
+++ b/src/app/screens/FigureListScreen.tsx
@@ -0,0 +1,50 @@
+import { getDanceProfile } from '../../engine/dance-profiles.js';
+import { BackButton } from '../components/BackButton.tsx';
+import { Icon } from '../components/Icon.tsx';
+import { danceName } from '../i18n/index.ts';
+import { formatCounts } from '../lib/count-display.ts';
+import { unlockAudioInsideTap } from '../platform/audio-context.ts';
+import { practiceChoice, type DanceProfileLike } from '../practice/preferences.ts';
+import { figureDisplayName } from '../routines/figure-names.ts';
+import { reviewedFigures } from '../routines/reviewed-counts.ts';
+import { requestAutoplay } from '../state/autoplay.ts';
+import { useI18n } from '../state/i18n.ts';
+import { navigate } from '../state/route.ts';
+import { useSettings } from '../state/settings.ts';
+
+// F1「種目のフィガー」（D57・Ruling 119）。集中画面（下タブ無し・左上「‹ 戻る」）。上から: 見出し＝種目名 → 「基本のカウント」の行（主・紺。
+// 今の型＝practiceChoice）→ 見出し「フィガー」→ 監修済みのフィガーの一覧（登録簿の順。名前の下に型の文字）。行を押すとすぐ鳴って S2（U2 の行と同じ型）。
+// 主要操作は 基本の行 1・一覧 [data-list] 1 ＝ 2。一覧の下に文は置かない（未監修は無い物＝Ruling 3）。空の F1 は resolve.ts が出さない
+export function FigureListScreen({ danceId }: { danceId: string }) {
+  const { translator } = useI18n();
+  const { settings } = useSettings();
+  const locale = translator.locale;
+  const basic = practiceChoice(getDanceProfile(danceId) as DanceProfileLike, settings).counts;
+  const play = (figureSlug: string | null) => {
+    try { unlockAudioInsideTap(); } catch { /* 音が使えない端末は S2 の2秒判定で案内する */ }
+    requestAutoplay({ kind: 'dance', id: danceId });
+    navigate({ screen: 'S2', params: figureSlug ? { danceId, figureSlug } : { danceId } });
+  };
+  const tag = <span class="dc-play-tag"><Icon name="play" /><span>{translator.t('play')}</span></span>;
+  return (
+    <main class="dc-screen dc-screen--focus dc-figures" data-screen="F1">
+      <BackButton screen="F1" />
+      <h1 class="dc-heading">{danceName(danceId, locale)}</h1>
+      <button type="button" class="dc-row-head dc-row--play dc-basic-row" data-basic onClick={() => play(null)}>
+        <span class="dc-row-text"><b>{translator.t('basicCount')}</b><small>{formatCounts(danceId, basic)}</small></span>
+        {tag}
+      </button>
+      <h2 class="dc-field-label dc-figures-heading" id="dc-f1-figures">{translator.t('tabFigures')}</h2>
+      <div class="dc-list" role="list" aria-labelledby="dc-f1-figures" data-list>
+        {reviewedFigures(danceId).map(figure => (
+          <div key={figure.slug} role="listitem" class="dc-row" data-row>
+            <button type="button" class="dc-row-head dc-row--play" data-figure={figure.slug} onClick={() => play(figure.slug)}>
+              <span class="dc-row-text"><b>{figureDisplayName(danceId, figure.englishName, locale)}</b><small>{formatCounts(danceId, figure.counts)}</small></span>
+              {tag}
+            </button>
+          </div>
+        ))}
+      </div>
+    </main>
+  );
+}
diff --git a/src/app/screens/HomeScreen.tsx b/src/app/screens/HomeScreen.tsx
index 34e77a9..533542c 100644
--- a/src/app/screens/HomeScreen.tsx
+++ b/src/app/screens/HomeScreen.tsx
@@ -3,12 +3,14 @@ import { BackButton } from '../components/BackButton.tsx';
 import { Icon } from '../components/Icon.tsx';
 import { UpdateBanner } from '../components/UpdateBanner.tsx';
 import { DanceName } from '../i18n/DanceName.tsx';
+import { LastPracticeName } from '../i18n/LastPracticeName.tsx';
 import { formatCounts } from '../lib/count-display.ts';
 import { showsInstallCard } from '../lib/install-card.ts';
 import { isStandalone, platformKind } from '../platform/pwa.ts';
 import { buildHash } from '../router/routes.ts';
+import { reviewedFigures } from '../routines/reviewed-counts.ts';
 import { useI18n } from '../state/i18n.ts';
-import { resumePractice } from '../state/resume.ts';
+import { lastPractice, resumePractice } from '../state/resume.ts';
 import { useSettings } from '../state/settings.ts';
 
 const DANCE_IDS = Object.keys(DANCE_PROFILES);
@@ -21,7 +23,7 @@ export function HomeScreen() {
   const locale = translator.locale;
   // 初めて鳴った後の 1 回だけのカード（段7・Ruling 92-7・D42）。× で閉じたら二度と出さない
   const installCard = showsInstallCard({ hints: settings.hints, kind: platformKind(), standalone: isStandalone() });
-  const lastDanceId = settings.lastDanceId;
+  const last = lastPractice(settings);
 
   return (
     <main class="dc-screen dc-home" data-screen="S1">
@@ -33,11 +35,11 @@ export function HomeScreen() {
           <span>{translator.t('switchLanguage')}</span>
         </button>
       </header>
-      {lastDanceId && (
-        <button type="button" class="dc-resume" data-resume onClick={() => resumePractice(lastDanceId)}>
+      {last && (
+        <button type="button" class="dc-resume" data-resume onClick={() => resumePractice(last)}>
           <span class="dc-resume-text">
             <small>{translator.t('lastTime')}</small>
-            <b><DanceName danceId={lastDanceId} locale={locale} /></b>
+            <b><LastPracticeName last={last} locale={locale} /></b>
           </span>
           <span class="dc-resume-go"><Icon name="play" /><span>{translator.t('resume')}</span></span>
         </button>
@@ -45,7 +47,8 @@ export function HomeScreen() {
       <h1 class="dc-heading">{translator.t('chooseDance')}</h1>
       <div class="dc-tiles" role="group" aria-label={translator.t('danceGroup')} data-group="dance">
         {DANCE_IDS.map(danceId => (
-          <a key={danceId} class="dc-tile" href={buildHash({ screen: 'S2', params: { danceId } })}>
+          // D57（Ruling 119-2）: 監修済みのフィガーが 1 件以上の種目は F1（一覧）、0 件は今までどおり S2
+          <a key={danceId} class="dc-tile" href={buildHash({ screen: reviewedFigures(danceId).length > 0 ? 'F1' : 'S2', params: { danceId } })}>
             <b><DanceName danceId={danceId} locale={locale} /></b>
             <small>{formatCounts(danceId, (DANCE_PROFILES as Record<string, { templates: readonly string[] }>)[danceId]!.templates[0]!)}</small>
           </a>
diff --git a/src/app/screens/PracticeScreen.tsx b/src/app/screens/PracticeScreen.tsx
index a6b242d..2df3ad2 100644
--- a/src/app/screens/PracticeScreen.tsx
+++ b/src/app/screens/PracticeScreen.tsx
@@ -6,12 +6,14 @@ import { danceName } from '../i18n/index.ts';
 import { displayForVoiceKey, formatCounts } from '../lib/count-display.ts';
 import { idleProgram, stripCells, stripView } from '../practice/beat-indicator.ts';
 import { CountBox, FORCED_NOTICE, type AlertNotice, FineSpeed, MoreOptions, NoticeBox, PlayDock, PracticeToggles, RepeatRow, SpeedChoices, VoiceChip, VoiceOffsetRow } from '../practice/controls.tsx';
-import { chooseCustomBpm, choosePreset, chooseTemplate, practiceChoice, practiceLeadInBars, type DanceProfileLike } from '../practice/preferences.ts';
+import { chooseCustomBpm, choosePreset, chooseTemplate, practiceChoice, practiceCounts, practiceLeadInBars, type DanceProfileLike } from '../practice/preferences.ts';
 import type { PracticeOptions } from '../practice/session.ts';
 import { speedPresetBpms } from '../practice/speed.ts';
 import { usePracticeSession } from '../practice/use-session.ts';
 import { voiceOffsetFor } from '../practice/voice-offset.ts';
 import type { UiState } from '../router/routes.ts';
+import { figureDisplayName } from '../routines/figure-names.ts';
+import { reviewedFigureBySlug } from '../routines/reviewed-counts.ts';
 import type { AppSettings } from '../settings/settings.ts';
 import { takeAutoplay } from '../state/autoplay.ts';
 import { useI18n } from '../state/i18n.ts';
@@ -20,11 +22,15 @@ import { DEFAULT_VOICE, voiceDisplayName, type VoiceSelection } from '../voices/
 import { usePlaybackVoice } from '../voices/use-playback-voice.ts';
 
 // S2 再生（仕様 §4・Ruling 13・18・19・21・23・28〜32・42）。部品は practice/controls.tsx（S5 と共通）。
-export function PracticeScreen({ danceId, uiState }: { danceId: string; uiState?: UiState }) {
+// D57（Ruling 120）: figureSlug があれば監修済みのフィガーのカウントを鳴らす（S2 の counts は practiceCounts の 1 本だけ。エンジン・セッションは同じ経路）。
+// その時は見出しの下に「ウィスク · 1 2 3」、くわしくの「カウントの型」は出さない（型はフィガーが決めている）。速さ・メトロノーム・合図・繰り返しは種目ごとの記憶のまま
+export function PracticeScreen({ danceId, figureSlug, uiState }: { danceId: string; figureSlug?: string; uiState?: UiState }) {
   const { translator } = useI18n();
   const { settings, update } = useSettings();
   const profile = getDanceProfile(danceId) as DanceProfileLike;
   const choice = practiceChoice(profile, settings);
+  const figure = reviewedFigureBySlug(danceId, figureSlug);   // resolve.ts が表に無い slug を基本へ置き換えるので、figureSlug があれば必ずある
+  const counts = practiceCounts(profile, settings, figure);
   const { session, view } = usePracticeSession(danceId);
   const playback = usePlaybackVoice();
   // クリック処理は描画を待たずに続けて来ることがある（連打）。常に最新の設定・再生状態・声を読む（Ruling 42）。
@@ -38,13 +44,13 @@ export function PracticeScreen({ danceId, uiState }: { danceId: string; uiState?
   const optionsFrom = (next: AppSettings, voice: VoiceSelection = latest.current.voice ?? DEFAULT_VOICE): PracticeOptions => {
     const nextChoice = practiceChoice(profile, next);
     return {
-      kind: 'counts', danceId, counts: nextChoice.counts, bpm: nextChoice.bpm, metronome: next.metronome, countInBars: practiceLeadInBars(next), loop: next.loop, track: null,
+      kind: 'counts', danceId, counts: practiceCounts(profile, next, figure), bpm: nextChoice.bpm, metronome: next.metronome, countInBars: practiceLeadInBars(next), loop: next.loop, track: null,
       voice, voiceOffsetMs: voiceOffsetFor(next, voice)
     };
   };
 
-  // 開いた時点で「前回」を書く（Ruling 26）。
-  useEffect(() => { update({ lastDanceId: danceId }); }, [session]);
+  // 開いた時点で「前回」を書く（Ruling 26）。フィガーも同じ 1 回で（D57・Ruling 121-1。基本なら null）
+  useEffect(() => { update({ lastDanceId: danceId, lastFigure: figure?.slug ?? null }); }, [session]);
   // 前回カードの印があれば、声が決まった時点ですぐ鳴らす（Ruling 32・61-6）。止めるのは usePracticeSession。
   useEffect(() => {
     if (autoplayChecked.current || !playback.voice) return;
@@ -86,10 +92,10 @@ export function PracticeScreen({ danceId, uiState }: { danceId: string; uiState?
   const forced = uiState ? FORCED_NOTICE[uiState] : undefined;
   const notice: AlertNotice = forced && !forcedDismissed ? forced : playback.saveFailed ? 'save-failed' : view.notice;
   // D55: 帯は鳴っている型（セッションの program）。止まっている間は今の型を表示のためだけに語にする。はじめの合図の間は点けない
-  const strip = stripView(stripCells(view.program ?? idleProgram(danceId, choice.counts)), view.playing && !view.countIn ? view.originalTick : null);
+  const strip = stripView(stripCells(view.program ?? idleProgram(danceId, counts)), view.playing && !view.countIn ? view.originalTick : null);
   const nowText = view.playing && !view.countIn ? displayForVoiceKey(view.voiceKey) : '';
   // 止まっている間は「最初に鳴るカウント」を灰色で出す（空白にしない。琥珀は鳴っている時だけ）。
-  const idleText = view.playing ? '' : formatCounts(danceId, choice.counts).split(' ')[0] ?? '';
+  const idleText = view.playing ? '' : formatCounts(danceId, counts).split(' ')[0] ?? '';
   const playing = view.playing || view.starting;
 
   return (
@@ -99,7 +105,7 @@ export function PracticeScreen({ danceId, uiState }: { danceId: string; uiState?
         <div>
           <header class="dc-playhead">
             <h1>{danceName(danceId, translator.locale)}</h1>
-            <small>{formatCounts(danceId, choice.counts)}</small>
+            <small>{figure ? `${figureDisplayName(danceId, figure.englishName, translator.locale)} · ${formatCounts(danceId, counts)}` : formatCounts(danceId, counts)}</small>
           </header>
           <NoticeBox notice={notice} onClose={() => { setForcedDismissed(true); if (closeTarget(notice) === 'save-failed') playback.dismissSaveFailed(); else session.dismissNotice(); }} />
           <CountBox playing={view.playing} countIn={view.countIn} nowText={nowText} idleText={idleText} strip={strip} />
@@ -111,7 +117,7 @@ export function PracticeScreen({ danceId, uiState }: { danceId: string; uiState?
             onLeadIn={() => change({ countInBars: current().countInBars === 1 ? 0 : 1 })} />
           <VoiceChip name={voiceDisplayName(translator, playback.voice ?? DEFAULT_VOICE, 'chip')} />
           <MoreOptions label={choice.customBpm !== null ? translator.t('moreOptionsWithTempo', { tempo: choice.customBpm }) : translator.t('moreOptions')}>
-            {profile.templates.length > 1 && (
+            {!figure && profile.templates.length > 1 && (
               <div>
                 <div class="dc-field-label"><span>{translator.t('countPattern')}</span></div>
                 <div class="dc-chips" role="radiogroup" aria-label={translator.t('countPattern')} data-group="pattern">
diff --git a/src/app/state/resume.ts b/src/app/state/resume.ts
index 2e941a8..e403a33 100644
--- a/src/app/state/resume.ts
+++ b/src/app/state/resume.ts
@@ -1,10 +1,20 @@
 import { unlockAudioInsideTap } from '../platform/audio-context.ts';
+import { reviewedFigureBySlug, type ReviewedFigure } from '../routines/reviewed-counts.ts';
+import type { AppSettings } from '../settings/settings.ts';
 import { requestAutoplay } from './autoplay.ts';
 import { navigate } from './route.ts';
 
-// 「前回」の 1 タップ（U1 の前回カード・表紙 C の「続きから」。G2・Ruling 32・115-1）。このタップの中で音を解除し、一回限りの印を付けてから S2 へ。
-export function resumePractice(danceId: string): void {
+// 「前回」（U1 の前回カード・表紙 C の「続きから」。G2・Ruling 32・115-1・121）。
+// 前回のフィガーは監修表にある時だけ（訂正で外れた・別の端末の設定なら種目だけ＝「ウィスク」と書いて基本が鳴る食い違いを作らない。Ruling 121-4）
+export interface LastPractice { danceId: string; figure: ReviewedFigure | null }
+export function lastPractice(settings: Pick<AppSettings, 'lastDanceId' | 'lastFigure'>): LastPractice | null {
+  if (!settings.lastDanceId) return null;
+  return { danceId: settings.lastDanceId, figure: settings.lastFigure ? reviewedFigureBySlug(settings.lastDanceId, settings.lastFigure) : null };
+}
+
+// このタップの中で音を解除し、一回限りの印（種目だけ）を付けてから S2 へ。フィガーは経路が運ぶ（Ruling 121-3）
+export function resumePractice({ danceId, figure }: LastPractice): void {
   try { unlockAudioInsideTap(); } catch { /* 音が使えない端末は S2 の2秒判定で案内する */ }
   requestAutoplay({ kind: 'dance', id: danceId });
-  navigate({ screen: 'S2', params: { danceId } });
+  navigate({ screen: 'S2', params: figure ? { danceId, figureSlug: figure.slug } : { danceId } });
 }
diff --git a/src/app/styles/base.css b/src/app/styles/base.css
index 2e8c632..cb723b1 100644
--- a/src/app/styles/base.css
+++ b/src/app/styles/base.css
@@ -111,6 +111,13 @@ button { cursor: pointer; }
 .dc-row-text .dc-row-warn { display: flex; align-items: center; gap: 6px; margin-top: 2px; color: var(--warn-ink); }
 .dc-row-warn .dc-ic { width: 20px; height: 20px; }
 .dc-edit-in-make { margin-top: 12px; }
+
+/* F1 種目のフィガー（D57・Ruling 119-3）: 一番上の「基本のカウント」は主（紺塗り・56px 以上）。一覧の行は U2 の「押すとすぐ鳴る」行と同じ型 */
+.dc-row-head.dc-basic-row { min-height: 64px; padding: 8px 12px; border-radius: var(--r); background: var(--primary); color: var(--on-primary); }
+.dc-row-head.dc-basic-row .dc-row-text small { color: #E4E7EE; }
+.dc-basic-row .dc-play-tag { background: var(--on-primary); color: var(--primary); }
+.dc-figures-heading { margin-top: 20px; }
+.dc-figures .dc-list { margin-top: 4px; }
 .dc-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
 .dc-tile { display: flex; flex-direction: column; justify-content: center; gap: 2px; min-height: 64px; padding: 6px 2px; text-decoration: none;
   border-bottom: var(--bw) solid var(--line); }
diff --git a/tools/i18n/copy-review-sheet.js b/tools/i18n/copy-review-sheet.js
index 77cdff3..fbe9525 100644
--- a/tools/i18n/copy-review-sheet.js
+++ b/tools/i18n/copy-review-sheet.js
@@ -15,6 +15,7 @@ export const SCREEN_FILES = Object.freeze({
   'src/app/screens/CoverScreen.tsx': 'S0',
   'src/app/screens/HomeScreen.tsx': 'S1',
   'src/app/screens/MakeScreen.tsx': 'M0',
+  'src/app/screens/FigureListScreen.tsx': 'F1',
   'src/app/screens/PracticeScreen.tsx': 'S2',
   'src/app/screens/RoutinesScreen.tsx': 'U2',
   'src/app/screens/RoutineEditScreen.tsx': 'S4',
@@ -32,7 +33,7 @@ export const SCREEN_FILES = Object.freeze({
 export const INSTRUCTION_FILES = Object.freeze(['src/app/share/instructions.ts']);
 
 export const GROUPS = Object.freeze([
-  ['S0', 'S0 表紙'], ['S1', 'S1 使う › フィガー（種目）'], ['S2', 'S2 再生'], ['U2', 'U2・M1 ルーティン（使う・作る）'], ['M0', 'M0 作る'], ['S4', 'S4 ルーティン編集'], ['S5', 'S5 ルーティン再生'],
+  ['S0', 'S0 表紙'], ['S1', 'S1 使う › フィガー（種目）'], ['F1', 'F1 種目のフィガー'], ['S2', 'S2 再生'], ['U2', 'U2・M1 ルーティン（使う・作る）'], ['M0', 'M0 作る'], ['S4', 'S4 ルーティン編集'], ['S5', 'S5 ルーティン再生'],
   ['S6', 'S6 設定'], ['S7', 'S7 声'], ['S8', 'S8 自分の声を録音'], ['S9', 'S9 配る'], ['S10', 'S10 受け取る'],
   ['S11', 'S11 音が鳴らない時'], ['S12', 'S12 ホーム画面に追加する方法'], ['S13', 'S13 プライバシー・アプリについて'],
   ['common', '共通（複数の画面・部品）'], ['instructions', '生徒への案内文（S9 でコピーされる）'], ['errors', 'エラー・知らせ（仕様 §11）']
```

```bash
npm run i18n:phrases && npm run copy:sheet
```

- [ ] **Step 4: 通ることを確かめる**

Expected: `tests 671`・`fail 0`、`typecheck-ok`、ui:check **839 PASS**（119 状態・**スキップ 0**）、スモーク 4 本 OK（`practice smoke OK: F1 → closed-changes played; the jive strip …`）。目で: F1 ワルツ（一番上が紺の「基本のカウント」・「フィガー」の下に 14 行）・S2 ウィスク（「ウィスク · 1 2 3」）・S2 ヘジテーションチェンジ（帯 6 丸）・U1 と表紙の「ワルツ · ウィスク」を 375×548・320×568（英語も）・1280×900 で。

- [ ] **Step 5: コミット**

```bash
git add src/app/screens/FigureListScreen.tsx src/app/i18n/LastPracticeName.tsx src/app/App.tsx src/app/screens/HomeScreen.tsx \
  src/app/screens/CoverScreen.tsx src/app/screens/PracticeScreen.tsx src/app/state/resume.ts src/app/i18n/messages.ts src/app/styles/base.css \
  tools/i18n/copy-review-sheet.js src/app/i18n/ja-phrases.json docs/app-v1/stage8-copy-review.md \
  tools/check-app-ui.js tools/smoke-practice.js tools/smoke-pwa.js
git commit -m "feat(app): 「フィガー」タブ — 種目のフィガーの一覧から監修済みのカウントで鳴らす（D57・Ruling 119〜122）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 6: 仕様と設計の骨子の読み替え（D55〜D57）

**担当:** Sonnet（文書だけ）。**Ruling 114-10・118-5・122-5。**

**Files:**
- Modify: `docs/superpowers/specs/2026-10-11-app-v1-design.md`（§1 G1・G2・§3 の画面一覧の読み替えの表・タップ数・§4 S1／S0／M0／F1／S2／S3／S6／S7／S10・§7 設定・§8 案内文）・`docs/app-v1/design-skeleton.md`（§1 の頭に 1 段落）

**決まり**: 元の文は消さずに「**D56・D57 の読み替え**」の段落を足す（段4〜8 と同じ書き方。過去の記録として元の文を残す）。

- [ ] **Step 1: 当てる**

`git apply --whitespace=nowarn .superpowers/sdd/role-split/t6-impl.diff`:

<!-- diff: t6-impl -->
```diff
diff --git a/docs/app-v1/design-skeleton.md b/docs/app-v1/design-skeleton.md
index 861aa37..d3cd511 100644
--- a/docs/app-v1/design-skeleton.md
+++ b/docs/app-v1/design-skeleton.md
@@ -7,6 +7,8 @@
 
 ## 1. 画面一覧と導線
 
+> **D56・D57（2026-10-13）の読み替え**: 起動は表紙 S0（「使う」「作る」「設定」）。生徒の側は U1（今の S1・`#/use`・下タブ「フィガー」）と U2（ルーティンを鳴らすだけ・受け取る）、先生の側は M0（録音・ルーティン・配る）と M1（今の S3）。S6 は 3 項目。F1「種目のフィガー（監修済みのカウント）」は U1 のタイルから（監修済みが 1 件以上の種目だけ）。S2 は帯（D55）とフィガーの形（`#/practice/<dance>/<figure>`）。正は仕様 §3・§4 の読み替えの節と `docs/app-v1/rulings.md` の Ruling 114〜122。
+
 ### 画面 ID と役割
 
 | ID | 画面 | 誰が | 到達 |
diff --git a/docs/superpowers/specs/2026-10-11-app-v1-design.md b/docs/superpowers/specs/2026-10-11-app-v1-design.md
index 241b7fb..5ee9605 100644
--- a/docs/superpowers/specs/2026-10-11-app-v1-design.md
+++ b/docs/superpowers/specs/2026-10-11-app-v1-design.md
@@ -37,6 +37,8 @@
 | G8 | UI 文言に禁止語（§6 表の「言葉」）が無い | 禁止語テスト（`node --test`）が緑 |
 | G9（可能なら） | 60〜70代の方が説明なしで「種目を選んで再生」できる | 初見テスト1名以上・観察記録 |
 
+- **D56・D57 の読み替え（Ruling 118-5・119-7・2026-10-13）**: G1 は「初回は **3 タップ**（表紙「使う」→ 種目タイル → ▶）」。監修済みのフィガーがある種目はタイルが F1 に着き、一番上の「基本のカウント」を押すとすぐ鳴る（▶ を兼ねる）ので 3 のまま。G2 は「表紙の『前回の練習 ▶ 続きから』か U1 の前回カードの **1 タップ**」（前回がフィガーならそのフィガー）。測り方は `smoke:practice`。
+
 ---
 
 ## 2. 決定事項の要約表
@@ -99,6 +101,25 @@
 
 ハッシュは「画面ごとに履歴1件」を積むための実装（Ruling 17）。ディープリンクとしての外部共有はしない（Ruling 1 補足・§10）。
 
+**D56・D57 の読み替え（Ruling 115〜122・2026-10-13 合意）**: 起動は表紙 S0。「使う」（生徒）と「作る」（指導者）に分ける。上の表のうち S1・S3・S6・S7・S12・S13 の行は次の表が正（S2・S4・S5・S8〜S11 の `#/…` は変えない）。
+
+| ID | 画面 | 種別 | 下タブ | 左上 | 到達 | ハッシュ |
+|---|---|---|---|---|---|---|
+| S0 | 表紙 | 表紙（`cover`） | なし | なし | 起動（ホーム画面のアプリも毎回）・「‹ 表紙」 | `#/` |
+| S1（U1） | 使う › フィガー（種目を選ぶ） | ルート | 「フィガー」「ルーティン」 | ‹ 表紙 | 表紙「使う」・下タブ | `#/use` |
+| U2 | 使う › ルーティン（鳴らすだけ・受け取る） | ルート | 同上 | ‹ 表紙 | 下タブ「ルーティン」・古い `#/routines` | `#/use/routines` |
+| M0 | 作る（録音・ルーティン・配る） | ルート | なし | ‹ 表紙 | 表紙「作る」 | `#/make` |
+| M1 | 作る › ルーティン（今までの S3） | 一覧 | なし | ‹ 戻る（M0） | M0 | `#/make/routines` |
+| F1 | 種目のフィガー（監修済みのカウント） | 集中 | なし | ‹ 戻る（U1） | U1 のタイル（監修済みが 1 件以上の種目だけ） | `#/figures/<danceId>` |
+| S2 | 再生（フィガーの形を足す） | 集中 | なし | ‹ 戻る（U1） | U1 のタイル・F1 の行・前回 | `#/practice/<danceId>`・`#/practice/<danceId>/<figureSlug>` |
+| S6 | 設定（言語・困った時は・アプリについて） | 一覧 | なし | ‹ 表紙 | 表紙の「設定」の行 | `#/settings` |
+| S7 | 声（一覧） | 集中 | なし | ‹ 戻る（U1） | S2／S5 の声チップ | `#/voices` |
+| S12・S13 | （中身は同じ） | 集中 | なし | ‹ 戻る（S6） | S6 | `#/help/install`・`#/about` |
+
+- 親（履歴が無い時の戻り先）: S4 → M1、S5・S10 → U2、S8・S9 → M0、F1・S2・S7 → U1、S11〜S13 → S6、U1・U2・M0・S6 → S0。古い `#/routines` は U2 を出してハッシュを `#/use/routines` に置き換える。知らないハッシュは表紙。
+- 下タブは U1・U2 の 2 つだけ（「フィガー / Figures」「ルーティン / Routines」）。タブの切替は履歴を積まない（置き換え）＝「‹ 表紙」と端末の戻るがどちらのタブからでも表紙に着く（計画者の発見）。「‹ 表紙 / ‹ Cover」は「‹ 戻る」と同じ型・同じ動き（`goBack`）。
+- 表紙・作る側・設定には下タブが無い。1024px 以上でも U1・U2 だけ上部のタブ。
+
 ### 下タブと戻るの規則（Ruling 17）
 - 下タブ（`[data-nav]`）は3つ「練習 / Practice」「ルーティン / Routines」「設定 / Settings」。アイコン＋文字、アイコン単独禁止。
 - 集中画面では下タブを**描画しない**（`display:none`）。下固定の主ボタン（▶・全体を試聴・録音する・次へ・ファイルを作る）はタブと同居させない。
@@ -117,6 +138,8 @@
 | 生徒が声を受け取る | S1「先生の声で練習」→ S7「ファイルから受け取る」→ S10「ファイルを選ぶ」 | 3（＋ファイル選択＋「使う」） |
 | 録音から配るまで | S8 完成画面「配る」→ S9 | 一本道 |
 
+**D56・D57 の読み替え**: 初回のカウント＝表紙「使う」→ タイル → ▶（F1 なら「基本のカウント」）＝3。2 回目以降＝表紙「続きから」1。ルーティンを鳴らす＝表紙「使う」→ 下の「ルーティン」→ 行（押すとすぐ鳴る）＝3。先生が録音を始める＝表紙「作る」→「自分の声を録音する」→「録音をはじめる」＝3。生徒が受け取る＝表紙「使う」→ 下の「ルーティン」→「ファイルから受け取る」→「ファイルを選ぶ」＝4（声チップ → S7 の「ファイルから受け取る」も残る）。
+
 ### 初回起動
 1. UI 言語は端末言語から `resolveUiLocale` で決定（日本語以外は英語）。S1 右上の言語ボタン（`[data-utility]`）で即切替、S6 にも同じ項目。
 2. チュートリアルは出さない。S1 見出し「種目を選んでください」が説明を兼ねる。
@@ -133,6 +156,17 @@
 PC（1024px 以上、Ruling 21）: 画面は1カラム・最大幅 640px 中央寄せ。例外は S2/S5 だけで、同じ DOM を CSS グリッドで2領域（左: 現在カウント＋拍インジケータ／右: 速さ・トグル・声チップ・くわしく）に並べ、内容幅は最大 960px。▶／■ の下固定帯は PC でも内容幅いっぱい。下タブは 1024px 以上で上部の横並び（実装は段2。段1は下タブのみ。2026-10-11 注）（同じ `[data-nav]` 要素、集中画面で隠す規則は同じ）。
 
 ### S1 ホーム（ルート）
+- **D56・D57 の読み替え（Ruling 115-2・119-2・121）**: S1 は「使う › フィガー」（U1・`#/use`）。上の行は「‹ 表紙」と言語、アプリ名は表紙へ。「先生の声で練習」カードは**外した**（声は S2／S5 の声チップ → S7。Ruling 16 は廃止）。見出し「種目を選んでください」が h1。主要操作は 種目群 1（前回があれば 2）。タイルの行き先は **監修済みのフィガーが 1 件以上なら F1、0 件なら S2**。前回カードは前回がフィガーなら「ワルツ · ウィスク」（表に無くなっていれば種目名だけ）。下の箇条の「先生の声」カードの寸法・判定は過去の記録。
+
+### S0 表紙（D56・Ruling 115-1・117）
+- 上から: アプリ名（「Dance Count」＋「for Ballroom」）と右上の言語 → 扉「**使う**」（紺塗り・104px 以上・説明「種目のカウントで練習する・先生のルーティンを鳴らす（生徒の方）」）＋その下にくっついた「**前回の練習 ▶ 続きから**」（初めて鳴った後だけ・1 タップで S2 が鳴る＝G2）→ 扉「**作る**」（枠線・「自分の声を録音する・ルーティンを作る・生徒に配る（指導者の方）」）→ 行「設定 ›（言語・困った時は・アプリについて）」→ 更新の帯。
+- 起動のたびに出す（側を覚えない）。深いリンク（`#/practice/waltz` など）は表紙を経ずにその画面。主要操作 4（初回 3）。保存の移行は無い。
+
+### M0 作る（D56・Ruling 115-3）
+- 「‹ 表紙」→ 見出し「作る」→ 1 行「指導者の方へ。作った物は「配る」でファイルにして生徒に送れます。」→ 行 3 つ（80px・アイコン円）: 「自分の声を録音する」（状態: まだ録音していません／英語 · 7 / 12 語 · 続きから／英語 · 12 / 12 語 · 録音済み）・「ルーティンを作る・直す」（○ 本（受け取った物も直せます）／まだありません）→ M1・「配る（ファイルを作る）」（声とルーティンを 1 つのファイルに）→ S9。主要操作 3（束にしない）。
+
+### F1 種目のフィガー（D57・Ruling 119〜122）
+- 集中画面（下タブ無し・「‹ 戻る」）。見出し＝種目名 →「**基本のカウント**」の行（主・紺・今の型の文字・押すとすぐ鳴る）→ 見出し「フィガー」→ 監修済みのフィガーの一覧（`docs/app-v1/figure-counts-review.md` でひとみうさが OK した行だけ＝`reviewed-counts.ts`。登録簿の定義順・名前の下に型の文字・行を押すとすぐ鳴って S2）。主要操作 2。未監修の行・「準備中」の文は出さない（Ruling 3）。空の F1 は出さない（0 件の種目は S2 へ置き換え）。
 - 上から: アプリ名（「Dance Count」22px 太字＋副題「for Ballroom」16px）と右上の言語ボタン（地球アイコン＋「日本語」/「English」）→「前回」カード（2回目以降のみ）→「先生の声で練習」カード → 見出し「種目を選んでください」→ 種目タイル 10個（2列×5行）。初回案内カード（§3）は最下段。
 - 「前回」カード: ネイビー塗り、左に「前回 / Last time」16px と種目名 24px、右に白地の「▶ 続きから / Resume」。高さ 60px（主ボタン基準 56px 以上）。タップで S2 へ遷移し即再生（前回の速さ・型・トグルを復元）。`lastDanceId` が無ければ描画しない。
 - 「先生の声で練習」カード（Ruling 16）: 横幅いっぱい、高さ 56〜64px、1行（マイクのアイコン（濃紺の円に白線）＋「先生の声で練習 / Practice with your teacher's voice」＋右向き山形）。上下を罫線で区切る。タップで S7。
@@ -144,6 +178,7 @@ PC（1024px 以上、Ruling 21）: 画面は1カラム・最大幅 640px 中央
 - **段7の読み替え（Ruling 90-3・92-7）**: 最下段は 種目タイル → 更新の帯（「新しい版があります。」＋「更新する」）→ 案内カード（「ホーム画面に追加すると、アプリのように使えます ›」＋「× 閉じる」）。帯の「更新する」は `[data-alert-action]` で数えない（S1 更新あり 2／2・案内カードあり 全体 5、375 の初期は 3 のまま）。
 
 ### S2 再生（集中）
+- **D55・D57 の読み替え（Ruling 114・120）**: 「小節内の拍インジケータ」→「**カウントの型の帯**」（型 1 周の語を 1 語 1 丸で並べ、鳴っている語の丸が琥珀。a・& も丸・幅は語の長さに比例・320 でも 1 行・13 語以上は 12 ずつ。時間はエンジンの tick だけ・型はセッションがエンジンに渡した物の写し）。フィガーの形（`#/practice/<danceId>/<figureSlug>`）では見出しの下が「ウィスク · 1 2 3」、帯はフィガーの語、「くわしく」の「カウントの型」は出さない（開くと 8）。速さ・トグル・繰り返し・声のタイミングは種目ごとの記憶のまま。フィガーの名前は読み上げない。
 - 初期表示（上から）: 「‹ 戻る」→ 種目名見出し 28px ＋副題 16px（選択中のカウントの型を同じ整形で表示。Ruling 22）→ 現在カウント（鳴っている語をそのまま表示。スマホ 96px／PC 200px、琥珀色）と小節内の拍インジケータ（操作ではない。現在拍だけ琥珀色の下線 6px＋太字、他は灰の下線 3px）→ 速さ3択（`[data-group="speed"]`）→ トグル2つ（メトロノーム・はじめの合図、Ruling 19）→ 声チップ「声: 標準（英語）」→「くわしく」（`summary[data-more]`）。画面下固定に ▶ 再生／■ 停止（72px 以上・幅は画面の60%以上）。
 - 主要操作数（Ruling 18）: 速さ(1)＋メトロノーム(1)＋はじめの合図(1)＋声チップ(1)＋▶(1)＝5。375×667 の初期表示に5つとも完全に入ること。**iPhone SE の Safari（375×548）でも 5 つとも入る**（見える高さ 600px 未満の詰めた配置。§5・D33・Ruling 71）。
 - 初期値（Ruling 13・18・D3）: 繰り返しオン、メトロノームオン、はじめの合図オン（2小節。D17）、速さ「標準」＝`practiceBpm`、カウントの型＝`templates[0]`（種目ごとに記憶）、声＝英語の標準音声。
@@ -163,6 +198,7 @@ PC（1024px 以上、Ruling 21）: 画面は1カラム・最大幅 640px 中央
 - WakeLock が取れない端末: 初回再生時に一度だけ「練習中は画面が暗くなることがあります。自動ロックを長めにすると便利です」。
 
 ### S3 ルーティン一覧（ルート）
+- **D56 の読み替え（Ruling 115-2・115-3）**: S3 は 2 つに分けた。**U2「使う › ルーティン」**（`#/use/routines`）: 「ファイルから受け取る」→ 一覧。行は押すとすぐ鳴る（右端に「▶ 再生」の札）。鳴らせない行はボタンにせず「フィガーがありません。「作る」で直せます。」／「カウントに直す所があります。「作る」で直せます。」。一覧の下に「ルーティンを直す・消す時は、表紙の「作る」から。」。主要操作 2（0 件 1）。編集・削除・配るは置かない。**M1「作る › ルーティン」**（`#/make/routines`）: 下の箇条のとおり（開いた行の ▶ は「試聴」）。「‹ 戻る」で M0。受け取ったルーティンも並び、直せる。
 - 「＋ 新しいルーティン / New routine」（横幅いっぱい・56px 以上、0件でも同じ位置）→ ルーティンの行（名前・種目・フィガー数・▶）。受け取ったものには副題「○○さんから / From ○○」。並び順は作った順（新しいものが下。Ruling 44）。
 - 行をタップで展開（同時に1つ）: ▶ 再生（S5 へ遷移してすぐ鳴る。Ruling 40）・「編集」・「配る」（**段5で足した**。鳴らせる行だけ・編集と削除の間。Ruling 86-4）・「削除」。削除は確認ダイアログ（`<dialog>`・質問1つ・ボタン2つ・取り消しが左。Ruling 44）。フィガー0件・保存されていたカウントが通らないルーティンは ▶ の代わりに説明の1行（「フィガーを追加すると再生できます。」「カウントに直す所があります。」）。
 - 0件の時: 「まだルーティンはありません」の1行。
@@ -193,6 +229,7 @@ PC（1024px 以上、Ruling 21）: 画面は1カラム・最大幅 640px 中央
 - 「くわしく」: 範囲（「はじめ」「おわり」を「‹ 前」「次 ›」で段送り・1グループ。記憶しない）、速さの細かい調整、繰り返す、声のタイミング（段4）。
 
 ### S6 設定（ルート）
+- **D56 の読み替え（Ruling 115-4）**: 表紙の行から来る一覧（「‹ 表紙」・下タブ無し）。言語・「困った時は」（S12・S11）・「プライバシー・アプリについて」の **3**。「声」（→ 再生画面の声チップ）と「先生の方へ」（→ 表紙の「作る」）は外した（Ruling 98 の 5 束 → 3）。
 - 項目（上から）: 言語（日本語 / English）、声（→ S7）、ホーム画面に追加する方法（→ S12）、音が鳴らない時（→ S11）、見出し「先生の方へ / For teachers」の下に「自分の声を録音する」（→ S8）「ルーティンを配る」（→ S9。**段5で足した**。期待値 4。Ruling 86-5）、プライバシー・アプリについて（→ S13、版番号を併記）。
 - 載せない: 開発者向け項目、キャッシュ操作。「データを全て消す」は S13 の最下部。
 - **段7の読み替え（Ruling 92-8・90-3）**: 「ホーム画面に追加する方法」（→ S12）を「音が鳴らない時」の上に足した。主要操作 **5**（上限ちょうど。375×548 は 4＝「ルーティンを配る」が下）。見出しの下に更新の帯（帯があっても言語・声・「ホーム画面に追加する方法」は 548 の初期表示に入る）。**段8で S13 の行が入ると 6 になるので、段8で S6 の並びを裁定し直す**（候補: 「先生の方へ」の 2 行を 1 行に）。
@@ -200,6 +237,7 @@ PC（1024px 以上、Ruling 21）: 画面は1カラム・最大幅 640px 中央
 - **段8の読み替え（Ruling 98・発見 6）**: 見出しつきの 3 つの束で並ぶ。言語・声／**「困った時は」**（ホーム画面に追加する方法＝S12・音が鳴らない時＝S11）／**「先生の方へ」**（自分の声を録音する＝S8・ルーティンを配る＝S9）／「プライバシー・アプリについて」（S13。版を併記・束には入れない）。主要操作は **5**（上限ちょうど）。束は S1 の種目タイルと同じく 1 つの判断として数える（Ruling 98-2）。375×667 の初期表示は 4・375×548 は 3・1280×900 は 5（Fable 答え 2）。行の名前は `phrased()` で描く。
 
 ### S7 声（一覧）
+- **D56 の読み替え（Ruling 115-5）**: 入口は S2／S5 の声チップだけ（集中画面・「‹ 戻る」）。「自分の声を録音する」のボタンは外し、1 行「自分の声の録音は、表紙の「作る」から。」。途中の声の「続きを録音する」は残す。主要操作 2（行を開 3）。
 - 大きなラジオ形のリスト（`[data-group="voice"]`）: 「標準の声（英語）」「標準の声（日本語）」（Ruling 5 のゲート通過後のみ＝段6c）「○○さんの声」（受け取った）「自分の声」（録音途中なら「7/12」）。選択中の行に ▶ 試聴（ワルツ1小節）。並びは 標準 → 自分 → 受け取った → 途中（Ruling 60-1）。
 - **途中の声の行（段4・D32・Ruling 60-2 の読み替え・Ruling 73）**: 「自分の声（日本語） · 7 / 12 語」（名前は黒、数だけ灰色）。選べない（`role="button"`）。タップで開き「続きを録音する / Continue recording」（→ S8 の説明の画面をその言語で）→「削除」。
 - 下に2ボタン: 「ファイルから受け取る / Receive from a file」（→ S10。**段5で足す**。Ruling 55-3）「自分の声を録音する / Record your voice」（→ S8）。段4の主要操作は 閉 2・行を開 3。
@@ -225,6 +263,7 @@ PC（1024px 以上、Ruling 21）: 画面は1カラム・最大幅 640px 中央
 - **段5の読み替え（Ruling 82・Fable の答え 2・4〜6・Task 10b）**: 上から 見出し「配る」→ 名前（見出し「あなたの名前」・40 字・`settings.distributorName` に記憶・空なら主ボタンが押せず「名前を入れると、ファイルを作れます。」）→ 声（「入れない」＋完成した録音の声だけ。受け取った声は出ない＝D37。録音が無ければ「録音した声はまだありません。」・ファイルにできなかった時は「この声はファイルにできませんでした。」）→ 同意（声を選んだ時だけ。四角だけが `role="checkbox"`・文を押しても切り替わる・未チェックなら「同意すると、ファイルを作れます。」）→ ルーティン（鳴らせる物だけ・作った順・0 件は「配れるルーティンはまだありません。」）→ 下固定「ファイルを作る」（何も選んでいない時は押せず上に「声かルーティンを選ぶと、ファイルを作れます。」。録音もルーティンも無い時はこの 1 行を出さない）。**声の指定なしで来た時（S6・S3・直接）は 名前 → ルーティン → 声 の順**。ファイルはタップの前に作っておき、タップの最初の文で同期に共有（Ruling 81-2）。結果は画面の上の `.dc-result` 1 行（共有＝「ファイルを送ったら、下の案内文も送ってください。」・保存＝「「{file}」を保存しました。…」・拒まれた＝「共有できませんでした。下の「ファイルを保存する」で保存できます。」＋「ファイルを保存する」ボタン。自動では保存しない）。**案内文のコピーは作った後に**結果の下へ（初期表示の 5 を超えないため。clipboard が無ければ読み取り専用の欄と「長押しで選んでコピーできます。」）。「ファイルに保存」は無い。主要操作 声あり 5・録音なし（ルーティン 1 本）3・作った後 6。S9 は鳴らさない。
 
 ### S10 受け取る（集中）
+- **D56 の読み替え（Ruling 115-6・117-3）**: 入口は U2 の「ファイルから受け取る」（案内文の 2 行目）・S7 の同じボタン・Android の共有。「受け取りました」の出口は 声あり →「ホームへ」＝U1（`#/use`）、ルーティンだけ →「ルーティンを見る」＝U2。親は U2。
 - 「ファイルを選ぶ / Choose a file」大ボタン（`<input type=file accept=".json,application/json">`）、iPhone 向け図解（LINE → 共有 → "ファイル"に保存 → ここで選ぶ）、「最近の項目」から探す案内、ファイル選択が開かない時の「Safari で開いて受け取る」リンク（F3）。
 - 選んだ後: 中身の確認（「○○さんの声・日本語・12/12」「ルーティン 2本」）→「使う / Use」。同名の声があれば「置き換える／両方残す」。
 - Android の share_target から来た時は、確認画面から始まる。
@@ -411,7 +450,8 @@ PC（1024px 以上、Ruling 21）: 画面は1カラム・最大幅 640px 中央
 - 録音・受け取った声の「声のタイミング」はそのパックの `wordOffsetsMs` に12語同じ値で保存（既存の範囲検査 ±1000ms の内側、UI は ±200ms）。**[仕様差] 段4**: `timingAdjustments.globalOffsetMs` に 1 つの値で持つ（Ruling 62-3。`wordOffsetsMs` は使わない。受け取った声の `wordOffsetsMs` の扱いは段5）。
 - **段4**: `selectedVoiceId` は録音・受け取った声の ID も残す（`normalizeSettings` は標準へ戻さない。パックが無い・途中なら再生時に黙って標準（英語）。Ruling 61）。`voiceLocale` は選んだ声から導いて同時に書く（Ruling 60-3）。
 - **段5**: `distributorName`（S9 の名前・既定 `''`・40 字）と `hints.backupTipShownForRecording`・`hints.backupTipShownForRoutine` が入った（Ruling 86-6）。
-- **段7**: `hints.firstPlaybackDone`（初めて鳴った印。S1 の案内カードの条件）と `hints.homeScreenCardDismissed`（「× 閉じる」）が入った（Ruling 92-7）。保存されていた語の `gainDb` は −24〜0 dB に収める（Fable の答え 7）。
+- **段7**: `hints.firstPlaybackDone`（初めて鳴った印。S1 の案内カードの条件）と `hints.homeScreenCardDismissed`（「× 閉じる」）が入った（Ruling 92-7）。
+- **D57**: `lastFigure`（前回のフィガーの slug・基本なら `null`。`lastDanceId` と同じ 1 回で書く。Ruling 121-1）が入った。表紙は側（使う／作る）を保存しない（D56・Ruling 117-1）。DB の版は上げない。保存されていた語の `gainDb` は −24〜0 dB に収める（Fable の答え 7）。
 
 ### 配布ファイル（Ruling 4）
 ```
@@ -450,6 +490,7 @@ PC（1024px 以上、Ruling 21）: 画面は1カラム・最大幅 640px 中央
 | PC | メールの添付を保存 → ブラウザで Dance Count →「先生の声で練習」→「ファイルから受け取る」→ 選ぶ →「使う」 | PC で練習する人は少ない →「スマホで受け取るのが便利です」と案内文に入れる |
 
 ### 生徒への案内文（S9 でコピーされる定型文）
+- **D56 の読み替え（Ruling 115-7）**: 2 行目は声あり・ルーティンだけとも「2. Dance Count を開き「使う」→ 下の「ルーティン」→「ファイルから受け取る」→「ファイルを選ぶ」」／“2. Open Dance Count → “Use” → “Routines” (bottom tab) → “Receive from a file” → “Choose a file””。下の版の 2 行目と表の「先生の声で練習」の経路は過去の記録。
 日本語:
 ```
 Dance Count で、私の声のカウントを使えます。
```

- [ ] **Step 2: 確かめる**

Run: `npm test 2>&1 | grep -E "^ℹ (tests|fail)"` → `tests 671`・`fail 0`（文書を読むテストは無いが、念のため）。

- [ ] **Step 3: コミット**

```bash
git add docs/superpowers/specs/2026-10-11-app-v1-design.md docs/app-v1/design-skeleton.md
git commit -m "docs: 仕様と骨子に「使う／作る」・帯・フィガータブの読み替え（D55〜D57）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 7: 使いやすさの通し確認（60〜70代の初めての人の目で・日英）と iOS シミュレーター

**誰が:** この計画の実装（Task 1〜6）に関わっていない**新しい Opus**（コントローラーが別に立てる）。直しは同じ Task の中で、**裁定の範囲の物だけ**（折り返し・余白・押せる範囲・文言の句の切り方）。裁定に無い製品の判断が要る物は直さず「Open question」に推奨の既定つきで集める。**常設要件・Ruling 118-4・122-3。**

**Files:**
- Create: `docs/app-v1/role-split-usability-walk.md`
- 直しが出たら: 該当の `src/app/**`・`tools/check-app-ui.js`（直しに検査を足す時）・`messages.ts`＋生成物 2 つ

- [ ] **Step 1: 撮る**（5185 の dev と 5184 の公開ビルド（`npm run build && npx vite preview --port 5184 --strictPort`）。撮影は `~/.playwright-mcp/role-walk-<言語>-<幅>-<状態>.png`。**スクロール領域ごと上から下まで**（`fullPage`）＋初期表示の 1 枚。終わったら自動操作ブラウザを閉じる）

幅は **375×548（主）**・**375×667**・**320×568**・**1280×900**。**日本語と英語の両方**。UA・seed は `tools/check-app-ui.js` の `IOS_SAFARI_UA`・`settingsSeed`・`seedRoutinesInPage`・`seedVoicePacksInPage` と同じ作り方:

| # | 状態 | 作り方 |
|---|---|---|
| 1 | 表紙（初回・前回あり・前回がフィガー・更新あり） | `#/`・`settingsSeed: { lastDanceId: 'waltz', lastFigure: 'whisk', hints: { firstPlaybackDone: true } }`・`?ui-state=update-ready` |
| 2 | 使う › フィガー → ワルツ（F1）→ ウィスク → 戻る → 戻る | 実経路（F1・S2 の見出しにフォーカス・スクロール 0） |
| 3 | 使う › フィガー → ルンバ（S2 直行） | 監修済みが無い種目は一覧を通らない |
| 4 | 使う › ルーティン（0 件・3 本＋鳴らせない行・40 字の名前） | `seed: [R.waltz13, R.empty, R.longJa]` |
| 5 | 下タブ「ルーティン」→「フィガー」→「‹ 表紙」・ブラウザの戻る | どちらも表紙に着く（発見 1） |
| 6 | 作る（未録音・途中・完成）→ 各行の先（S8・M1・S9）→ 戻る | `voiceSeed: [V.partialJa]` など |
| 7 | 設定（3 つ）→ 困った時は → 戻る → ‹ 表紙 | |
| 8 | 再生画面の帯: ジャイブ・チャチャチャ・タンゴ・サンバ・パソドブレ（8 拍）を ▶ して 1 周見る | 鳴っている語と琥珀の丸が同じか・a・& の細い丸が見えるか |
| 9 | S5 で 15 語のフィガー（`R.waltzLongFigure`）を ▶ | 13 語目で丸の列が入れ替わる瞬間が分かるか |
| 10 | 受け取る（生徒）: 表紙 → 使う → ルーティン → ファイルから受け取る → 使う → ルーティンを見る | 案内文の 2 行目の道 |

- [ ] **Step 2: 1 枚ずつ「次に何を押すか」を書く**

各画像について、**初めて触る 60〜70代の生徒（iPhone SE の Safari で先生から届いた URL を開いた人）と、指導者（自分の声を録って配りたい先生）**のつもりで答える:
1. この画面で何ができると分かるか（1 文）。表紙で「自分は使う／作るのどちらか」迷わないか。
2. 次に押す物はどれか。U2 の行を押すとすぐ鳴るのが怖くないか（Ruling 115-2 の U2'）。F1 の一番上の「基本のカウント」が今までの使い方だと分かるか。
3. 字が小さい・詰まっている・切れている・句の途中で折れている・「す。」だけの行が無いか（扉の説明・M0 の状態の 1 行・帯の a・&）。
4. 「‹ 表紙」と「‹ 戻る」の違いで迷わないか。
5. 548 で主要操作が初期表示に入っているか・320 で崩れていないか・1280 で間延びしていないか。

`docs/app-v1/role-split-usability-walk.md` に表で書く: `# | 画面 | 言語 | 幅 | 次に押す物（見た人の答え） | 引っかかり | 重さ（止める／直したい／好み） | 直し方（裁定の範囲か・Open question か）`。最後に「直した物」「Open question に回した物」「好み（ひとみうさへ）」を列挙。

- [ ] **Step 3: iOS シミュレーターで確かめる**（HANDOVER §8 の手順・**iPhone SE 第3世代・UDID `0E53FFB2-C56B-43E9-B055-EAE45DDCE641`**。**公開ビルドを `npx vite preview --port 5184 --strictPort` で配る**。撮影は `xcrun simctl io booted screenshot ~/.playwright-mcp/role-sim-<#>.png`）

| # | やること | 期待 |
|---|---|---|
| a | Safari で `http://localhost:5184/?r=<時刻>` → 表紙 → 使う → ワルツ → ウィスク | 本物の iOS 26 の書体で扉の説明が句の境で折れる（「（生徒の方）」が割れない）・F1 の行がすぐ鳴る |
| b | **戻るスワイプ**: 表紙 → 使う → 下の「ルーティン」→ 画面の左端から右へスワイプ | 表紙に戻る（U1 に戻らない＝発見 1） |
| c | 表紙 → 使う → ジャイブ → ▶ | 帯の琥珀の丸が大きな語と同じに進む（Simulator の音は遅れることがある。見た目だけ見る） |
| d | ホーム画面に追加したアプリ（段7で追加した物。無ければ S12 の手順で追加）を完全に閉じて起動 | 毎回表紙（Ruling 117-1）。前回が残っていれば「前回の練習 ▶ 続きから」 |
| e | Safari の「ページの拡大 150%」で表紙・U2・F1 | 横スクロールが出ない・扉が押せる |

**シミュレーターで確かめられないこと**（Task 8 の実機確認表へ）: 実機の戻るスワイプの手触り・本物の音と帯のずれ・VoiceOver で表紙と F1 を辿る。

- [ ] **Step 4: 直す・記録する・コミット**

裁定の範囲の直しは小さく直し、`npm test`・`typecheck`・`ui:check`（839 PASS。足した検査があれば数を直す）・スモーク 5 本を再実行。製品の判断が要る物は「Open question」に推奨の既定つきで書き、コントローラー（Fable）に渡す。

```bash
git add docs/app-v1/role-split-usability-walk.md   # 直したファイルもパスを指定して
git commit -m "docs: 「使う／作る」・帯・フィガータブの使いやすさの通し確認（日英・548・667・320・1280・iOS シミュレーター）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 8: 締め — 実機確認表の行・ひとみうさの残り 1 枚・HANDOVER §0・台帳・裁定の注記

**担当:** Sonnet（文書だけ。コードは触らない）。**Ruling 118-4・122-3・122-4。**

**Files:**
- Create: `docs/app-v1/role-split-ledger.md`（`.superpowers/sdd/role-split/progress.md` を保存した物＋N0 と各 Task の数＋計画者の発見 1〜24＋Task 7 の結果）
- Modify: `docs/app-v1/device-check-master.md`・`docs/app-v1/po-checklist.md`・`docs/app-v1/HANDOVER.md`（**先頭の §0 を書き直す**）・`docs/app-v1/rulings.md`（末尾に「D55〜D57 計画者の発見と Open questions の答え」・Ruling 114〜122 の頭に注記）

- [ ] **Step 1: 完了条件を自分で再実行し、数値を記録する**

```bash
cd "/Users/usausagi/Documents/AI_Playground/Dance Count auto-counts"
npm test 2>&1 | grep -E "^ℹ (tests|fail)"; npm run -s typecheck && echo typecheck-ok; npm run -s build | tail -1
npm run -s timing:audit >/dev/null && npm run -s timing:compare; git checkout -- output
git diff --stat 3d2f51e -- src/engine test/engine/fixtures output/timing-audit-before.json legacy public/audio src/app/styles/fonts.css | tail -3
npm run -s i18n:phrases && npm run -s copy:sheet && git status --short src/app/i18n/ja-phrases.json docs/app-v1/stage8-copy-review.md
DC_BASE_URL=http://localhost:5185/ npm run -s ui:check | grep -cE ": PASS"
for s in smoke:practice smoke:routines smoke:voice smoke:share; do DC_BASE_URL=http://localhost:5185/ npm run -s $s | tail -1 | cut -c1-80; done
DC_PWA_PORT=4185 npm run -s smoke:pwa | tail -1 | cut -c1-80
# 公開ビルド（SW つき）: 別の端末で `npx vite preview --port 5184 --strictPort` を起動してから
DC_BASE_URL=http://localhost:5184/ npm run -s ui:check | grep -cE ": PASS"; DC_BASE_URL=http://localhost:5184/ npm run -s smoke:share | tail -1 | cut -c1-60
```
Expected: `tests 671`・`fail 0`、`typecheck-ok`、`dist OK: 1078 files, no legacy pages or unreviewed data, voices: default-en-female-v1, precache 172 entries 2.94 MB`、`timing audit identical (generatedAt excluded)`、差分は**何も出ない**、生成物 2 つは変わらない、ui:check **839 PASS**（dev と公開ビルドの両方・スキップ 0）、スモーク 5 本 OK（Task 7 で検査を足していれば、その数に読み替える）。

- [ ] **Step 2: 実機確認表に 3 節を足す**（`docs/app-v1/device-check-master.md` の「1b」の後。番号は 1c〜1e。**1b-4 の手順「設定 → 声 →「自分の声を録音する」」は D56 で無くなった**ので「表紙 →「作る」→「自分の声を録音する」」に直す）

- **1c 表紙で「使う／作る」（D56・Ruling 118-4）**: (1) ホーム画面から開くと毎回表紙（Safari の新しいタブで `?r=` を開いた時も）(2) 表紙 → 使う → 下の「ルーティン」→ 行を押すとすぐ鳴る（怖くないか＝U2' に替えるかの判断材料）(3) 受け取り（ルーティンだけのファイル）→「ルーティンを見る」で「使う › ルーティン」に「○○さんから」が付いて並ぶ (4) 表紙 → 作る →「ルーティンを作る・直す」に受け取った本が並び、編集できる (5) 「‹ 表紙」と iPhone の戻るスワイプが同じ所（表紙）に戻る（下のタブを行き来した後も）(6) 表紙の「前回の練習 ▶ 続きから」1 タップで鳴る (7) 設定は 3 つ・声は再生画面の「声:」から選ぶ (8) 生徒への案内文の 2 行目「「使う」→ 下の「ルーティン」→「ファイルから受け取る」」のとおりに辿れる。
- **1d カウントの帯（D55・Ruling 114-9）**: (1) ジャイブで ▶: 丸が 1 2 3 a 4 5 a 6 と進み、大きな語と同じ丸が琥珀 (2) タンゴは S の丸が Q の 2 倍の幅 (3) S5 でフィガーが替わると丸の列が替わる (4) a・& の細い丸が見えるか・見づらいか（好み＝Ruling 114 §3-4）。
- **1e フィガータブ（D57・Ruling 122-3）**: (1) ワルツのタイル → 一覧・一番上が「基本のカウント」(2) 行を押すとすぐ鳴り、見出しの下に「ウィスク · 1 2 3」(3) 表紙と「使う」の前回が「ワルツ · ウィスク」→ 続きから で同じフィガー (4) 監修済みの無い種目（ルンバなど）はタイル → 再生のまま (5) タンゴ・スローフォックスも一覧になる（3d2f51e の 20 件）。

- [ ] **Step 3: ひとみうさの残り 1 枚に足す**（`docs/app-v1/po-checklist.md` の A の表の末尾。**ひとみうさが決めることだけ**）

| # | 何を | 今の形（く！ちゃんの既定） | どこで見る |
|---|---|---|---|
| 15 | D56 の合意の後に残った小さな判断（Open questions 1〜5 の Fable の答え） | 計画者の既定（タブの切替は履歴を積まない・扉の説明は 4 行まで・長いフィガー名は声チップがスクロール・「ホームへ」の文言は今のまま・M0 は「指導者の方へ。」） | `rulings.md` 末尾 |
| 16 | Ruling 115 §3・119〜121 §3 の好み（U2 の行がすぐ鳴る・帯の a・& の丸・F1 の行がすぐ鳴る・「基本のカウント」の語・前回カードの書き方） | おすすめのまま | 実機確認表 1c〜1e |

- [ ] **Step 4: HANDOVER の §0 を書き直す**（`docs/app-v1/HANDOVER.md`。古い §0 は §0c の下へ移す）: 枝 `agent/auto-counts` に D52（自動カウント・監修表 20 件）・D53・D55〜D57 が載っていること・数（671・839・precache 172）・マージの条件（Ruling 112-4: ひとみうさの実機確認 `device-check-master.md` 1b〜1e の後に `agent/app-v1` へ `--no-ff`。push はひとみうさ）・監修シートの転記のたびに `requires: 'reviewed'` の状態が新しい表で走ることを確かめる（Ruling 122-4）・次の一手。

- [ ] **Step 5: 台帳・裁定の注記を書いてコミット**

```bash
git add docs/app-v1/role-split-ledger.md docs/app-v1/device-check-master.md docs/app-v1/po-checklist.md docs/app-v1/HANDOVER.md docs/app-v1/rulings.md
git commit -m "docs: D55〜D57 の締め（実機確認表 1c〜1e・po-checklist・HANDOVER §0・台帳・裁定の注記）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 完了条件

- `npm test` **671**・fail 0・`typecheck` 0・`build` の `dist OK … precache 172 entries`。
- `ui:check` **839 PASS**（dev 5185 と公開ビルド 5184 の両方・違反 0・axe 0・スキップ 0）。
- スモーク 5 本（`smoke:practice`・`smoke:routines`・`smoke:voice`・`smoke:share`・`DC_PWA_PORT=4185 smoke:pwa`）OK。
- `timing:audit && timing:compare` 一致・`src/engine`・ゴールデン・`legacy`・`public/audio`・`fonts.css` の差分 0。
- 使いやすさの通し確認（Task 7）の「止める」が 0、残りは Open question に。
- 実機確認表 1c〜1e・po-checklist・HANDOVER §0・台帳。**マージ・push はしない**（Ruling 112-4）。

## Open questions for Fable（計画者は既定で進めた。答えが違えば小さな直し）

1. **下タブの切替を履歴の置き換えにした**（発見 1）。既定: 置き換え（「‹ 表紙」とスワイプが必ず表紙に着く）。代案: タブは積み、「‹ 表紙」だけ `replaceRoute(S0)` で表紙へ飛ぶ（スワイプはタブを 1 つ戻る＝Ruling 118-4 (5) が崩れる）。
2. **扉の説明と M0 の状態の 1 行は U10 の 2 行の規則から外し「4 行まで」**（発見 4）。既定: 外す（説明は名前ではない）。代案: 英語を短くして 2 行に収める（例 “For students: dance counts, routines”。320 では 2 行に入らない文が残る）。
3. **長いフィガー名で S2 の声チップが 375×667 の帯の下に入る**（発見 13）。既定: 許す（速さと ▶ は入る・S5 と同じ）。代案: 見出しの下の文字を 1 行で「…」にする（名前が切れる）。
4. **S10 の「ホームへ」「ホームで種目を選んで ▶ を押すと…」**（発見 15）。既定: 文言は今のまま・行き先は U1。代案: 「種目を選ぶ」／「「使う」で種目を選んで ▶ を押すと…」（監修シートで直す）。
5. **M0 の 1 行を「指導者の方へ。」にした**（発見 16）。既定: 「指導者の方へ。」。代案: 裁定の「先生の方へ。」。
6. **2 小節以上のフィガーで「基本のカウント」の型を記憶しない**のは Ruling 120-6 のとおり。F1 の「基本のカウント」の行に出る型は、S2 のくわしくで最後に選んだ型（`lastTemplateByDance`）。既定: そのまま。

## ひとみうさに後で見てもらうこと（判断でなく確認。実機確認表 1c〜1e と po-checklist 16）

- 表紙の扉の言葉・「（生徒の方）」「（指導者の方）」の見た目、毎回表紙が出ることの煩わしさ。
- U2 と F1 の「押すとすぐ鳴る」行。
- 帯の a・& の細い丸と、丸の幅の比例（タンゴの S が Q の 2 倍）。
- 「ワルツ · ウィスク」の前回の書き方・「基本のカウント」の語。
