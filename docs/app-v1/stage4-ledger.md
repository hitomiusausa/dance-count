# 段4 作業台帳（声 S7・S8 の録音）

計画: `docs/superpowers/plans/2026-10-12-app-v1-stage4.md`。仕様 `docs/superpowers/specs/2026-10-11-app-v1-design.md` ＋ Ruling 55〜63・D23〜D25（`standard-voices.json` は Ruling 64〜68）。
枝 `agent/app-v1`（worktree なし・逐次）。開始 HEAD **`5bd6e53`**（段6a の後）→ 実装の最後 **`a95bf3e`**（Task 8 の修正便）。この文書は Task 10（締め）のコミットで入る。**push なし・main 未マージ**。
進め方: ひとみうさは就寝中で委任（PO の確認はその場では取らず、未決は Fable が裁定。PO 判断級は「代理決定」として D30〜D35 に記録）。SDD の台帳（`.superpowers/sdd/2026-10-12-app-v1-stage4/progress.md`）の写しが末尾にある。

## 前置き（コントローラーの裁定）

- 実装者: Task 4・5・6・7（端末・音・画面）は Opus、Task 1・2・3・8（計画にコードがある・写しとテスト）は Sonnet（費用）。Sonnet が詰まったら上げる。
- 計画の Open questions 1〜6 はすぐ Fable へ。Task 1〜5 は答えに依らないので先に進め、Task 6・7 は答えを待つ。
- テスト件数: 計画の数（358 → 404・+46）はスクラッチの木で測った物。本物の起点は 418。**実際は 418 → 472（+54）**（Task 3 が計画より少なく、Task 4・5・7 の修正便でテストが増えた）。

## タスクごとの結果

| Task | コミット | テスト | ui:check | レビュー | 修正便 |
|---|---|---|---|---|---|
| 1 声の保存と純粋な部品（ID・標準の声・保存・波形） | `e0c3513` | 430 | — | 0C/0I/2M | なし |
| 2 1 語の無音・遅い・短いの判定とモノ WAV への正規化 | `7e1e99d` | 437 | — | 0C/0I/3M | なし |
| 3 選んだ声・声のタイミング・録音の進み方・文言 | `c9ffaf9` | 456 | — | 0C/0I/2M | なし |
| 4 マイク（1 語ごとに開閉）・録音の間の音声セッション・persist・decode | `5dab404` | 461 | — | I-1 | 1 回 `e7f69bc`（464） |
| 5 選んだ声で鳴る・声チップ・声のタイミング（くわしく 9/9/8）・320 幅の検査 | `6db5c78` | 467 | 114 | 0C/0I/6M | 1 回 `89e0951`（469） |
| 6 S7 声の一覧・S6 の声と「先生の方へ」 | `6960b99` | 467 | 126 | 0C/0I/5M | なし |
| 7 S8 自分の声を録音（説明・12 語・完成・拒否と非対応） | `7e2fc1f` | 471 | 154 | 0C/1I/6M | 1 回 `1d0d145`（472） |
| 8 偽マイクの WAV と段4のスモーク | `ac5fe4f` | 472 | 154 | 2I | 1 回 `a95bf3e` |
| 9 使いやすさの通し確認・iOS シミュレーター | `7178247` | 472 | 154 | （確認そのもの） | CSS の直し 2 つ |
| 9b 通し確認への裁定（Ruling 71〜75）の実装 | `ec36bd8` | 472 | **192** | 0C/0I/4M | なし |
| 10 締め（この文書） | — | 472 | 192 | 最終レビューは別便 | — |

ui:check の数え方: 段3の終わり 113 → Task 5 で 320×568 の横スクロールの 1 行（114）→ Task 6 で S6・S7 の状態（126）→ Task 7 で S8 の状態（154＝38 状態 × 375×667・1280×900 × reduced-motion 有無 ＋ 拡大 ＋ 320）→ Task 9b で 375×548（iPhone SE の Safari）の 1 周（**192＝154＋38**）。

### 修正便の中身

- **Task 4（`e7f69bc`）**: I-1 `capture()` で `start()` が投げると、タイマーが初期化前で `ReferenceError` になり `RecorderError('failed')` にならなかった → 直してテスト。あわせて「`mimeType` 付きの生成が投げたら既定で 1 回やり直す」「`playBuffer` の `start()` が投げても `onEnded` を呼ぶ」（どちらも実機での粘り）。持ち越し: セッションの再入の守り・アンマウントでの中断（→ Task 7 で済）・iPhone の webm／mp4 と録音後の音量（→ 実機確認表）。
- **Task 5（`89e0951`）**: M1 録音の声を選んだ直後に ▶ を急いで押すと、黙って標準の声で鳴った → タップの中で同期に解除し、決まりかけの声を待ってから選んだ声で始める（本当に失敗した時だけ標準）。M5 `saveVoicePack` の失敗は既存の「保存できませんでした」の枠。M4 S4 の `onStep` も最新の設定を読む。持ち越し: フックの pending／saveFailed の直接のテスト無し・保存失敗の枠が S2/S5 のほかの案内を隠す（→ 通し確認で「好み」）。
- **Task 7（`1d0d145`）**: I-1 録音の途中の失敗は `denied`・`unsupported` だけ説明の画面の枠へ、`failed` とそれ以外は同じ語で「声が入っていませんでした」（前の録音は残る。Ruling 57-6・58-2。Fable Q2 は「録音をはじめる」の時だけ）＝`takeErrorOutcome`。M-1 完成画面の「録り直す」を「1 語目から見直す / Review from word 1」に（何も消えないことが分かる文。PO が D25 と一緒に見直せる）。
- **Task 8（`a95bf3e`）**: I-1 スモークが「録った声で鳴っている」を証明していなかった → 再読み込み後に録った声で鳴らしている間、標準の声の音声（`/audio/default-en-female-v1/`）を 1 本も取りに行かないことをネットワークで見る＋IndexedDB に 12 語。I-2 無音の場面が `SILENCE_PEAK_RMS` を守っていなかった → 0 でない小さな音（ピーク 0.002）の `quiet.wav` を足し、「声が入っていない」になることを見る。チップの実際の文字を出力。

### Task 7 の計画からの外れ（すべて意図的。レビュー済み）

1. Fable Q4（D30）: 別の拒否画面をやめ、説明の画面の説明 3 行の場所に枠。2 択と「録音をはじめる」は残す（`data-step="denied"` は維持）。
2. Fable Q2: `Blocked` に `'failed'`（`data-alert="mic-failed"`・`micFailed`・操作なし）。
3. 枠を消すのは「語を移った時」と「次の録音が成功した時」（押した瞬間に消すと録音中にボタンが動く）。
4. Task 4 の持ち越し: `recordTake({ signal })` と、S8 のアンマウント・語の移動での中断。`withRecordingSession` を参照カウントに（やめた録音の後始末が次の録音より遅れても、セッションを壊さない）。
5. 文言: 「7 / 12 語」などを改行しない空白でつなぐ・`micHowToIphone` の括弧（ホーム画面のアプリ）・12 の項目は「語」に統一（`recordIntro1`「12 語を、1 語ずつ録音します。」）。
6. CSS: 操作の無い枠の下の余白（`.dc-alert-text--solo`）・説明と枠に `word-break: auto-phrase; text-wrap: pretty`（Chrome のみ。iOS Safari は語の途中で折れることがある＝通し確認 8'・12・14 で「好み」）。

### Task 9（使いやすさの通し確認）の直し

- S8 説明: 説明 3 行と「数える言葉」の間を 8 → 16px（見出しが説明の続きに見えた）。
- S8 完成: 聞き比べの鳴っている方を塗る（`aria-pressed` を `.dc-chip` と同じ色）。
- 10 の問いを Fable へ → Ruling 71〜78・D33〜D35（Task 9b）。記録は `docs/app-v1/stage4-usability-walk.md`。

### Task 9b（Ruling 71〜75 の実装）で裁定の値から外した所（コントローラーが受け入れ）

1. **S1（U3 の間隔 8px）**: Ruling 71-3 の `.dc-appbar { margin-bottom: 2px }`・`.dc-teacher { margin-top: 4px }` は U3 の 8px を割った → この 2 つは 8px のまま、代わりに `.dc-home { padding-top: 4px }` と見出し 22 → **20px**・行の高さ 1.2（Ruling 71 の「外れた時の代償」の候補）。10 番目のタイルの下端 476 ／帯 480（余裕 4）。
2. **見出しの余白は S2 だけ**: `.dc-practice .dc-playhead h1 { margin: 4px 0 }` が S5 にも当たって下を 4px 増やしていた → `.dc-practice:not(.dc-routine-play)`。
3. **S5 音が出ない（Ruling 23）**: 548 で速さの下端 455 ＞ 帯 451 → 2. と `.dc-routine-play .dc-figure-now { margin-top: 2px }`（600px 未満だけ）で 447。
4. **確認ダイアログの U3**: 548 ではダイアログのボタンが背景の行と重なり間隔 0 と出た。`showModal()` の背景は押せないので、検査の側で「`dialog[open]:modal` の中と外の組」は測らない（中同士・外同士は今までどおり）。
5. そのほか: `.dc-record-slot` は `flex-direction: column`（行方向だと枠が中身の幅に縮む）。`opsSmall: 4` は S5 くわしく閉の 3 状態だけ（S4 は 548 でも期待値のまま通った）。

9b レビューの Minor（直さず、実機確認表へ）: M1 S1 548 の見出しが先生カードの線に付いて窮屈 → 確認表 21 ／ M2 S4 新規の種目選びのタイルも 548 で 48px（Ruling 71-8 の「S4 は変更なし」より広い）→ 確認表 24 ／ M3 横向きのスマホ（高さ 600 未満）にも詰めた配置が当たる → 仕様 §5 に注記・確認表 24 ／ M4 548 の録れた語では説明が消えるので、録り直す時に「すぐ言う」の案内が見えない → 確認表 23。

## 計画者の発見 1〜16（計画の「計画者の発見」の要約。全文は計画）

1. WebKit は音声セッションが「再生」のままだとマイクを開けない（`InvalidStateError`）→ `withRecordingSession` は必須。`recordTake`・`requestMicrophone` の中で通す。
2. モノにするのは正規化の前（`processTake` が `createBuffer(1, …)` に写す）。
3. 波形は自分で書いた WAV のバイト列から（AudioContext はタップの中でだけ作る）。
4. 声のタイミングを変えても `updatedAt` を進めない（decode の記憶の鍵）。
5. `isCompletePack` は型の絞り込みにしない。
6. S8 は `ui-state` ごとに作り直す（`key`）。
7. 入力欄の見出しは `<label for>` にしない（U3）。
8. S7 の開いた行の操作は上に 8px。
9. 即再生は声が決まってから 1 回。
10. 聞き比べはボタンの `aria-pressed` で鳴ったことを見る。
11. `expectSounding` は `smoke-voice.js` に同じ関数を持つ（Ruling 63-5 の「共有」の読み替え）。
12. `make-fake-mic-wav.js` の直接実行の判定は `import.meta.filename`（パスに空白）。
13. 語の画面の枠は説明 1 行の場所（→ Task 9b で「同じ箱 `.dc-record-slot`」に）。
14. 320 幅の横スクロールを ui:check の検査に。
15. 録音中は「録音する」を `disabled`。「戻る」「前の語」は押せて、結果は `generation` で捨てる。
16. `standardVoiceJapanese`・`standardVoiceJapaneseShort` を段4で先に足す（→ Open question 3）。

## Open questions とその答え

計画の 6 問（Fable・`rulings.md` の「段4の計画の未決 6 点への答え」）:

| # | 問い | 答え |
|---|---|---|
| 1 | 途中の声の行（タップで S8 か、開くか） | 既定を採用＝タップで開き「続きを録音する」「削除」（**D32**）。Ruling 60-2 の読み替え |
| 2 | 「録音をはじめる」でマイクが無い・使用中 | 置き場は拒否と同じ、文言を分ける（`micFailed`「ほかのアプリや通話を終えてから…」） |
| 3 | 日本語の標準の声の文言キーを段4で足す | 既定を採用（段4で足した。6c は JSON に 1 行）。Ruling 68-4 の読み替え |
| 4 | マイク拒否の画面に「もう一度」が無い | 変更＝説明の画面に枠・「録音をはじめる」を残す（主要操作 2。**D30**）。Ruling 59-6 の読み替え |
| 5 | 語の画面の枠は説明 1 行の場所 | 既定を採用 |
| 6 | 「この iPhone（端末）」 | 変更＝「この端末」（**D31**。D23 を訂正） |

使いやすさの通し確認の 10 問（Fable・Ruling 71〜78）:

| # | 問い | 答え |
|---|---|---|
| 1 | 途中の声の行が灰色 | 名前は黒、「· 7 / 12 語」だけ灰（Ruling 73） |
| 2 | 英語 UI で既定名が日本語 | 据え置き（段5。Ruling 76-1） |
| 3 | 消すには先に選ぶ | Ruling 60-4 のまま（Ruling 76-2） |
| 4 | 語の画面の 1 行 | 「ボタンを押したら、すぐ「{語}」と言ってください。」（**D34**・Ruling 72）。説明と枠を同じ高さ 60 の箱に |
| 5 | 548 で「聞く」が帯の後ろ | 高さ 600 未満の詰めた配置（**D33**・Ruling 71） |
| 6 | 設定の道順 | 「設定 → アプリ → Safari → マイク」（Ruling 74） |
| 7 | 声のタイミングの向き | 補助文「声が遅れて聞こえたら「早く」を押します。」（**D35**・Ruling 75） |
| 8 | SE の Safari で S2 の主要操作が入らない | 段4で直す（Ruling 71 ＋ ui:check に 375×548） |
| 9 | 完成の画面のキーボード | 実機確認表に 1 行。隠れたら S4 の型（Ruling 77） |
| 10 | iOS 26 は webm で録る | そのまま（シミュレーターで webm・mp4 とも decode 可。実機の 1 行は残す。Ruling 78） |

## 揺れ（flaky）

- `smoke:routines`: 計画者のスクラッチで 4 回中 1 回、スモークを続けて回した直後に途中で落ち、再実行で OK（段3からの揺れ）。段4の本物の木では起きていない。
- `smoke:practice`: Task 5 で 1 回だけ、ui:check の直後に `G1: not playing`（続けて 6 回 OK・再現せず）。Task 5 の修正便の後は 4/4 OK。起きたら、S2 を開いた時の声の解決（非同期）と即再生の順番を疑う。
- `smoke:voice`: `expectSounding` は 100ms ごとの見本取りで、理屈の上では揺れうる（Task 8 レビュー。実際は 4 回以上すべて緑）。

## 置いておいた Minor（段5以降・触る時に）

- Task 1: 後の Task まで使われない export・20MB を超えるパックのテスト無し。
- Task 2: ちょうど境界のテスト無し・頭の検出の失敗をすべて黙って受ける・届かない `??` の受け皿。
- Task 3: ja `micHowToIphone` の「アプリ名」が置き場所の印に見える（→ Ruling 74 で文を直した）・「12 の言葉」と「語」（→ Task 7 で「語」に統一）・「アドレスバー」「ブラウザ」がやや技術語（→ Ruling 76-3 で据え置き）。
- Task 5: フックの pending／saveFailed の直接のテスト無し・保存失敗の枠が S2/S5 のほかの案内を隠し閉じる × が無い・決まらないまま終わる読み込み（理屈の上だけ）。
- Task 6: S6 の声の行が一瞬「標準」（数十 ms）・選んでいない声を消すには先に選ぶ・英語 UI でも既定名が日本語（いずれも Ruling 76 で据え置き）。
- Task 7: M-5・M-6（レビュー）・320 で録れた語の「聞く」と開いた「設定の開き方」の下の 2 択が縦スクロール（320 は横スクロール無しだけが要件）・偽マイクのビープの波形は山が 2 つ（実際の声は 1 つ）。
- Task 8: 指紋の見本の窓が別々・`quiet.wav` は Chrome の自動音量調整を頼りにしている・100ms の見本取り。
- Task 9b: 上の M1〜M4（実機確認表 21・23・24）。ツールバーが縮んだ時（スクロールの後）のメディアクエリの当たり方は未確認（確認表 20）。

## 段4の完了条件（Task 10 で再実行・2026-10-12）

| 検査 | 結果 |
|---|---|
| `npm test` | **472 pass / 0 fail**（418 ＋ 54） |
| `npm run typecheck` | OK |
| `npm run build` | `dist OK: 1064 files, no legacy pages or unreviewed data, voices: default-en-female-v1` |
| `timing:audit` → `timing:compare` | `timing audit identical (generatedAt excluded)`（後で `git checkout -- output`） |
| `git diff --stat 5bd6e53 -- src/engine test/engine/fixtures output/timing-audit-before.json legacy` | **空**（エンジン・ゴールデン・基準・legacy は段4で一度も変わっていない） |
| `ui:check`（dev 5199） | **192 PASS**・exit 0 |
| `ui:check`（公開ビルド `vite preview` 4174） | **192 PASS**・exit 0 |
| `smoke:voice`（dev 5199／公開ビルド 4174） | OK／OK |
| `smoke:practice`・`smoke:routines`（dev 5199） | OK・OK（WebKit の一本込み） |

主要操作数（`tools/check-app-ui.js` の期待値）: S6＝3 ／ S7＝2（標準だけ）・2（3 本）・3（行を開）／ S8＝2（説明）・2（1 語目）・4（8 語目から前の語）・4（完成）・2（マイク拒否。D30）・2（声が入っていない）・0（非対応）／ S2・S5 くわしく開 9 ／ S4 くわしく開 8。375×548 では S5 くわしく閉の 3 状態だけ 4（声チップがスクロールの下。Ruling 71-6）。320×568 で全状態に横スクロール無し。

最終レビュー（段の実装に関わっていない別エージェント）はコントローラーが別便で出す。

---

## 原本の写し（`.superpowers/sdd/2026-10-12-app-v1-stage4/progress.md`・Task 10 の時点）

```
# SDD ledger — plan: docs/superpowers/plans/2026-10-12-app-v1-stage4.md
Spec: docs/superpowers/specs/2026-10-11-app-v1-design.md + Ruling 55–63, D23–D25 (+ Ruling 64–68 for standard-voices.json). PO delegated (asleep): no PO checks now; Fable rules open questions.
Start HEAD: 5bd6e53 (after 6a). Plan built from a scratch copy based on 95fc319 + 6a assumptions; 6a's real standard-voices.json matches the plan's expectation ([{id:'default-en-female-v1',locale:'en'}]). Test counts in the plan are scratch-based (358→404); real base is 418 → expect +46 ≈ 464.
## Preflight
- Ruling: implementers Opus for Tasks 4,5,6,7 (device/audio/screens), Sonnet for 1,2,3,8 (code in plan, transcription + tests) — cost; if a Sonnet task struggles, escalate.
- Ruling: plan's 6 open questions go to Fable now; Tasks 1–5 don't depend on them; Tasks 6–7 wait for the answers.
- Task 1: complete (e0c3513, review clean 0C/0I/2M: unused-until-later exports / no >20MB pack test). Tests 430.
- Task 2: implemented 7e1e99d (437 tests).
- Task 2: complete (7e1e99d, review clean 0C/0I/3M: no exact-boundary tests / silent catches any onset error / unreachable ?? fallback). Tests 437.
- Fable answered the plan's 6 open questions (docs commit, appended to rulings.md): Q1 default, Q2 separate micFailed copy, Q3 default, Q4 D30 (denied box on the intro screen, keep 2 choices + 録音をはじめる), Q5 default, Q6 D31 「この端末」. Affects Tasks 3, 7, 9, 10.
- Task 3: implemented c9ffaf9 (456 tests; +19 not +38 — brief's count off; preview.ts deferred to Task 5 per brief).
- Task 3: complete (c9ffaf9, review clean 0C/0I/2M). Carried to Task 7/9 copy fixes: ja micHowToIphone 「ホーム画面のアプリは アプリ名」 reads like a placeholder → 「そのアプリの名前」-style; 「12 の言葉」 vs 「語」 consistency; アドレスバー/ブラウザ mildly technical.
- Task 4: implemented 5dab404 (461 tests).
- Task 4 review: spec ✅, changes needed — I-1 capture(): start() throwing → ReferenceError (timers in TDZ) instead of RecorderError('failed').
- Ruling (Task 4 fix round 1): fix I-1 + test; include minors 'retry without mimeType if constructor throws' and 'playBuffer calls onEnded if start() throws' (both real-device robustness); park re-entrancy guard / abort-on-unmount (Task 7 screen owns lifecycle) and iPhone webm-vs-mp4 + volume (device check). Fix runs concurrently with Task 5 implementer — recorder/playback files only, explicit paths.
- Task 4: fix round 1/5 (e7f69bc: I-1, mimeType retry, playBuffer onEnded).
- Task 4: complete (5dab404..e7f69bc, re-review all addressed). Tests 464 (committed). Parked: session re-entrancy guard, abort on unmount (Task 7), iPhone webm/mp4 + volume after switch (device check).
- Task 5: implemented 6db5c78 (464 committed tests total; ui:check 114). smoke:practice G1 flaked once after ui:check (async voice resolve on S2 open?).
- Task 6: implemented 6960b99 (467 tests — 464 earlier was the committed count before Task 5's +3; ui:check 126). Carry: 320 partial-row name wraps inside 「· 7 / 12 語」 → usability walk (nbsp/markup).
- Task 6: complete (6960b99, review clean 0C/0I/5M). Carry to Task 7 extras: M3 nbsp in voiceInProgress 「7 / 12 語」. Carry to usability walk (Task 9): M4 deleting an unselected voice requires selecting it first and falls back to standard EN; M5 default recorded names stay JA in EN UI; grey partial row may read as disabled; M2 S6 voice row flashes 標準 before recorded name. Interim S8 links land on S1 until Task 7 (no PO check meanwhile).
- Task 5 review: spec ✅ approved, 0C/0I/6M. G1 flake not reproducible/not from Task 5.
- Ruling (Task 5 fix round 1): fix M1 (▶ before the selected recorded pack resolves must not silently play standard: unlock synchronously in the tap, then await the pending resolve and start with the chosen voice; only fall back if it really fails) and M5 (saveVoicePack failure shows the existing save-failed notice). M4 make S4 onStep read latest like S2/S5. M2/M3 → Task 9 usability walk (open くわしく at 320; timing row hint/direction). Runs concurrently with Task 7 — practice/voice files only.
- Task 5: fix round 1/5 (89e0951: pending voice awaited after sync unlock; S4 latestSettings; save-failed notice). 469 tests.
- Task 5: complete (6db5c78..89e0951, re-review all addressed). Parked: hook pending/saveFailed untested directly; save-failed notice hides other notices on S2/S5 → Task 9 walk; never-resolving lookup theoretical.
- Task 7: implemented 7e2fc1f (471 tests, ui:check 154). Deviations in task-7-report.md.
- Task 7 review: spec ❌ (I-1), 0C/1I/6M.
- Ruling (Task 7 fix round 1): I-1 — during recording only 'denied' (and 'unsupported') go to the intro with the alert; 'failed' and any other RecorderError show 'no-voice' on the same word (Ruling 57-6/58-2; Fable Q2 is only for the start step). M-1 — completion screen's redo button label must say it doesn't erase: ja 「1 語目から見直す」 / en 'Review from word 1' (per-word screen keeps 録り直す) — PO can revisit with D25. M-2, M-3, M-4 → Task 9 usability walk (Fable rules wording there). M-5/M-6 parked.
- Task 7: fix round 1/5 (1d0d145: takeErrorOutcome; reviewFromFirst). 472 tests, ui:check 154.
- Task 7: complete (7e2fc1f..1d0d145, re-review all addressed). Carried to Task 9: M-2 hint doesn't say which word to say / speak right after pressing; M-3 320 scroll; M-4 no-voice pushes button 28px.
- Task 8: implemented ac5fe4f (smoke:voice 3× OK; nbsp normalized in smoke).
- Task 9 dispatch notes: carried items for the walk — Task 3 M2 (「アドレスバー」「ブラウザ」 mildly technical); Task 5 M2 (320 pass never opens くわしく), M3 (timing row: no direction hint, grey label, each tap restarts count-in), N2 (save-failed hides other notices, no close); Task 6 M2 (S6 flashes 標準 before recorded name), M4 (delete an unselected voice requires selecting it, falls back to standard EN), M5 (default recorded names JA in EN UI), grey partial row may read as disabled; Task 7 M-2 (hint doesn't say which word / speak right after pressing), M-3 (320 scroll), M-4 (no-voice pushes button). Fable rules any product-level item after the walk.
- Simulator console checks (b, c) without Web Inspector: serve a tiny probe page from scratch on the Mac and open it in the Simulator; read results from a screenshot.
- Task 8 review: spec ✅, changes needed (2 I: smoke doesn't prove playback uses the recorded pack; silent case doesn't guard SILENCE_PEAK_RMS).
- Ruling (Task 8 fix round 1): I-1 assert via network that no standard-voice audio (/audio/default-en-female-v1/) is requested during playback with the recorded voice after a fresh load (same method Task 5 fixer used), plus IndexedDB check of 12 words; I-2 add a quiet non-zero fixture (RMS < 0.01) generated by make-fake-mic-wav.js and expect the no-voice path; minor: print real chip text. Fixer uses port 5194 (usability walk owns 5199).
- Task 9: walk done 7178247 (2 CSS fixes; 10 open questions in docs/app-v1/stage4-usability-walk.md §5). Simulator SE iOS 26.3: mp4 true, webm true, audioSession 'auto' default; getUserMedia under 'playback' → InvalidStateError (confirms Ruling 57/withRecordingSession). OS mic prompt after explanation ✓. AXe can't tap the OS permission prompt → word/done screens unreachable in Simulator.
- Ruling: send the 10 open questions to Fable now; implement rulings as Task 9b before Task 10.
- Task 9b: implemented ec36bd8 (ui:check 192). Ruling: accept implementer's 4 adjustments to Fable's values (S1 keep 8px gaps, h1 rule S2-only, S5 no-sound fix, modal-gap checker exclusion) — all needed for ui:check at 548 and keep Fable's intent.
- Task 9b: complete (ec36bd8, review clean 0C/0I/4M: S1 heading cramped at 548 / S4 tiles also shrink at 548 / landscape gets compact / no re-record prompt at 548 — notes for Task 10 docs & device check). Controller saw S2 on iPhone SE Simulator Safari: all primary controls visible.
- Task 8: fix round 1/5 (a95bf3e: IndexedDB 12 words, network control, engine-reuse fingerprint, quiet.wav peak 0.002).
- Task 8: complete (ac5fe4f..a95bf3e, re-review all addressed; 3 parked minors: separate fingerprint windows / quiet.wav relies on Chrome AGC / 100ms sampling).
```
