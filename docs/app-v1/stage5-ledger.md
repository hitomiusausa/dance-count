# 段5 作業台帳（配る・受け取る S9・S10）

計画: `docs/superpowers/plans/2026-10-12-app-v1-stage5.md`（`85888e3`）。仕様 `docs/superpowers/specs/2026-10-11-app-v1-design.md` ＋ Ruling 79〜87・D36〜D39（と、それより前の全裁定）。計画の未決への答えは D40（`ee3be55`）。
枝 `agent/app-v1`（worktree なし・逐次）。裁定のコミット **`4771d0f`** の上に計画 `85888e3` → 実装の最後 **`555056c`**（Task 10b）。この文書は Task 11（締め）のコミットで入る。**push なし・main 未マージ**。
進め方: ひとみうさは就寝中で委任（PO の確認はその場では取らず、未決は Fable が裁定。PO 判断級は「代理決定」D36〜D40）。SDD の台帳（`.superpowers/sdd/2026-10-12-app-v1-stage5/progress.md`）の写しが末尾にある。

## 前置き（コントローラーの裁定）

- 起点: 計画のスクラッチの起点（`npm test` 476・`ui:check` 197）を本物の木で再生し、同じ木になることを確かめてから始めた（計画の「スクラッチでの実証」6）。
- まとめ方: Task 1〜3（純粋なデータ・形式・受け取りの計画。計画に検証済みのコードがある）は Sonnet 1 便でタスクごとにコミット・レビューは 3 つまとめて 1 回。Task 4〜5（設定・文言・端末の面）も同じ型で Opus。Task 6・7・8（画面）は Opus で 1 便ずつ、レビューも 1 回ずつ。Task 9（スモーク）は Sonnet。Task 10（使いやすさの通し確認）は段5の実装に関わっていない Opus。Task 11 は締め。
- 計画の Open questions 1〜10 はすぐ Fable へ（Task 6〜8 の文言・配置にしか効かない）。答えは `ee3be55`（`rulings.md` の末尾）。
- テスト件数: 計画の数（476 → 515・+39）に対し、**実際は 476 → 525（+49）**。Fable の答え 2（拒まれた時）・Task 4〜5 の安い守り・Task 7 の追加・Task 10 の M2/M3・Task 10b の並びで増えた。`ui:check` は計画どおり **197 → 262**。

## タスクごとの結果

| Task | コミット | テスト | ui:check | レビュー | 直し |
|---|---|---|---|---|---|
| 1 受け取った物の保存の形（`received`・`sourceId`・`v-` の ID・エンジン 1 行） | `14e94c8` | — | — | 1〜3 まとめて 0C/0I/6M | 安い守り 3 つを Task 4〜5 の便へ |
| 2 配布ファイル（上限・束を作る／読む・ファイル名・公開 URL） | `c0a3d6f` | — | — | 同上 | 同上 |
| 3 受け取りの計画と書く順（ID の付け直し・置き換え・上限） | `5a4708c` | 500 | — | 同上 | — |
| （Fable の答え・D40） | `ee3be55` | — | — | — | — |
| 4 設定・文言・案内文・S9 への印 | `5b21b7f` | — | — | 4〜5 まとめて 0C/1I/9M | I1 は「最近使った項目」（Task 7 の追加で直した） |
| 5 端末の面（共有・保存・コピー・読む・受け口・LINE の判定） | `9727ec8` | — | — | 同上 | — |
| 4〜5 の安い守り（Task 1〜3 の持ち越し） | `569e33c` | 519 | — | 同上 | — |
| 6 S9 配る | `8dacd97` | 519 | 212 | 0C/0I/5M | 通し確認へ持ち越し |
| 7 S10 受け取る・固定の配布ファイル | `8d43323` | — | 252 | 0C/0I/8M | M2・M3 は Task 10 で直した |
| 7 の追加（Task 4〜5 のレビューから） | `2f4fe24` | 522 | 252 | 同上 | — |
| 8 入口とバックアップの 1 行（S7・S8 完成・S3・S6・S4） | `c1e0f52` | 522 | **262** | 0C/1I/2M | I は Task 10 → 10b |
| 9 段5のスモーク（`smoke:share`） | `8e876a6` | 522 | 262 | 0C/1I/3M | I1 は Task 10b |
| 10 使いやすさの通し確認・iOS シミュレーターの往復 | `e089f2c`・`add3c13` | 523 | 262 | （確認そのもの） | M2・M3 の直し＋段5の文を句の切れ目で折る（Chrome） |
| 10b 通し確認の後の直し | `555056c` | **525** | 262 | 0C/0I/4M | なし |
| 11 締め（この文書） | — | 525 | 262 | 最終レビューは別便 | — |

ui:check の数え方: 段4の終わり 197 → Task 6 で S9 の状態（212）→ Task 7 で S10 の状態（252）→ Task 8 で S3・S6・S7・S8 の段5の状態（**262**）。Task 10b は数を変えず、「S9 声あり」を実経路（S7 の行 →「配る」。`via`）で開き、「S7 3 本」に 548 の初期表示の検査、「S9 録音なし」に `[data-list]` の初期表示の検査を足した。

### 直しの中身

- **Task 4〜5 の安い守り（`569e33c`。Task 1〜3 のレビューの持ち越し）**: 受け取った声の記録に知らない欄を残さない（`receivedPack` で許す欄だけ）・`createdWith.version` の長さ・受け取ったファイル名の向きの文字と制御文字を除く。
- **Fable の答え 2（Task 4・6）**: 共有を拒まれたら自動では保存しない。結果の 1 行 `shareRefused`「共有できませんでした。下の「ファイルを保存する」で保存できます。」＋「ファイルを保存する」→ 次のタップで保存し 1 行が「保存しました」に替わる。
- **Task 7 の追加（`2f4fe24`。Task 4〜5 のレビューから）**: I1「最近の項目」→「最近使った項目」（`instructionsStep3`・`receiveHelpRecents`。iOS 26.3 の SE シミュレーターの Files で確認）・M1 端末の境界の検査に `caches`・`URL.createObjectURL`・`clipboard`・M5 `practise` → `practice`・M4/M9 受け取った名前と選んだファイルの名前から向きの文字を除く（`clean-text.ts`）。
- **Task 10（`e089f2c`）**: Task 7 M2（置き換えの途中でルーティンの保存に失敗すると、古い声は消えて新しい声は選ばれていない）→ 声は書けたその場で選ぶ（`ImportWriter.voiceSaved`）・M3 `commitImport` が投げても「保存できませんでした」。単体 1 件。
- **Task 10（`add3c13`）**: 段5の文に `word-break: auto-phrase`（`.dc-dock-note`・`.dc-backup-tip`・`.dc-result`・S10 の枠・行・注記・本文）。Chrome（Android）は句の切れ目で折れる。iOS Safari は変わらない。
- **Task 10b（`555056c`）**: 通し確認の Open question 1・2・4・6 のコントローラーの裁定と Task 9 I1（下の「通し確認の後の裁定」）。単体 2 件（`test/app/share/layout.test.ts`）。

## 計画者の発見 1〜18（要約。全文は計画）

1. 同じ先生の声は 名前＋端末の ID＋言葉 で見分ける（→ Open question 1・**D40**）。
2. 受け取った声は `normalizeVoicePackRecord` を通してから計画に入れる。
3. `sourceUpdatedAt` は `importRecordedVoicePack` の前に読む（import が `updatedAt` を今に書き換える）。
4. 同意の文はボタンの外（U10）。四角だけがボタン。
5. S8 完成の 1 行は `div.dc-hint`（U1）。
6. S7「ファイルから受け取る」の上 24px・間 12px（U3）。
7. S3 の開いた行のボタンは `nowrap`、入らない幅では 2 段。
8. S10 の LINE の枠は文だけ `line-height: 1.3`（120px 以下）。
9. ui:check の `audit` に `steps` を渡さない（20MB のファイルでメモリ不足）。
10. `smoke-voice.js` の「完了」は文字で探す（S8 完成の主ボタンが「配る ›」に）。
11. 「"ファイル"」の内側に U+2060（→ Open question 9）。
12. 受け取ったルーティンを編集しても `source`・`receivedFrom` は残る。
13. Node 24 には `File`・`Blob`・`btoa`・`atob` がある・`caches`・`document` は無い。
14. 共有を拒まれた時のダウンロードはタップの外（→ Open question 2）。
15. `distributor.name` の無い束は「読めない」（→ Open question 3）。
16. 受け口の契約に `X-File-Name`（→ Open question 8）。
17. ui:check「S10 確認」はルーティン 2 本。
18. ui:check「S9 録音なし」は 3（ルーティン 1 本）。

## Open questions とその答え

計画の 10 問（Fable・`rulings.md` の「段5の計画の未決 10 点への答え」。転記は同じ文書の末尾）:

| # | 問い | 答え |
|---|---|---|
| 1 | 同じ先生の声の鍵に名前を入れる | 採用・**D40**（代償: 同じ姓の別の先生の声は置き換わる。根本の解 `distributor.id` は段7以降） |
| 2 | 共有を拒まれた時 | **変更**: 自動では保存しない・「ファイルを保存する」ボタンだけ |
| 3 | 名前の無い束は「読めない」 | 採用（Ruling 80-5 に注記） |
| 4 | 同意の文はボタンの外 | 採用 |
| 5 | 結果とコピーは画面の上 | 採用 |
| 6 | 「あなたの名前」・補助の 1 行は無し | 採用（「山田先生さんの声」はひとみうさの好み） |
| 7 | 「（名前なし）」は画面が出す | 採用 |
| 8 | 受け口の `X-File-Name` | 採用（Ruling 79-2 に注記） |
| 9 | U+2060 | 採用（画面の文だけ） |
| 10 | 「やめる」「ファイルを選ぶ」にアイコン無し | 採用 |

使いやすさの通し確認の 6 問（`docs/app-v1/stage5-usability-walk.md` §5。既定が明快で危険が小さいので Fable に回さず、コントローラーが採った。ひとみうさに後で見てもらう）:

| # | 問い | 答え（Task 10b `555056c`） |
|---|---|---|
| 1 | S7 で声が 2 本以上の時、548 で「自分の声を録音する」がタブの下 | 600px 未満では 2 つのボタンを横 1 行（16px・マイクの絵なし・320 では縦）。ui:check「S7 3 本」に 548 の初期表示 |
| 2 | S6 から来た時、ルーティンが 548 の下 | 声の指定なしは 名前 → ルーティン → 声（`shareSectionOrder`） |
| 3 | iOS Safari の「す。」だけの行・句の中の改行 | 据え置き（CSS で直せない。文言を短くするかはひとみうさ） |
| 4 | 録音もルーティンも無い S9 の「…選ぶと…」 | 出さない（`showChooseNote`） |
| 5 | S10「受け取りました」の出口 2 つ | このまま |
| 6 | 声をファイルにできなかった時が黙る | 「この声はファイルにできませんでした。」（`shareVoicePrepFailed`） |

## iOS シミュレーターの往復（Task 10・iPhone SE 第3世代・iOS 26.3）

a 共有シートが出る・b「"ファイル"に保存」→ ピッカーの「最近使った項目」の先頭に灰色でなく出る・c 使う → S2 のチップ「声: やまださんの声」→ ▶ で拍が進む・e 保存の後にもう一度共有シート・f 案内文のコピー、すべて PASS。d は S8 完成だけマイクの許可のダイアログで入れない（段4と同じ）。共有シート・保存先・ピッカーは AX の木に出ないが、スクリーンショットの座標で押せた（AXe はマイクの許可だけ押せない）。記録 `docs/app-v1/stage5-usability-walk.md` §3。

## 揺れ（flaky）

- `smoke:routines`: Task 10 で 1 回、seed 直後の `[data-screen="S4"]` 待ちで 30 秒切れ（並行のテストで重かった時）。再実行で OK（段3からの揺れ）。
- `smoke:share`: Task 9 で 3 回連続 OK・Task 10b・Task 11（dev・公開ビルド）でも OK。揺れは見ていない。
- `ui:check`（公開ビルド 5198）: Task 11 で 1 回、「S4 不正カウント」の 375×667 reduced-motion の後、次の状態の `[data-screen="S4"]:not([data-loading])` 待ちで 30 秒切れ（72 PASS の所で止まった）。続けての再実行で 262 PASS。`smoke:routines` の S4 待ちの揺れと同じ形（段3から）。続くなら S4 を開いた時の読み込み（IndexedDB の seed の直後）を疑う。

## 置いておいた Minor（段6以降・触る時に）

- Task 1〜3: 語の `__proto__`（エンジン側）・途中の保存の失敗のテスト（→ Task 10 で 1 件足した）・旧単体パックの 2 人の先生の声は置き換わる（Ruling 84-4 で許容）・`BUNDLE_VOICE_MAX` の定数が無い（害なし）。
- Task 4〜5: M2 iOS Safari の `<a download>` の確認を 60 秒以上置くと blob の revoke 後で失敗しうる（未実測・拒まれた時だけの経路）・M3 `inFlight` はモジュールの変数で、iOS 15.x で promise が解決しないと再読み込みまで共有できない（Ruling 81 の代償の範囲）・M6 ルーティンだけでも案内文は「先生の声で練習」から（→ 実機確認表 C）・M7 二度目のタップは同じ promise（Task 10 で「直さない」）・M8 受け口の鍵は相対（→ Ruling 79-2 の注記）。
- Task 6: 名前の 1 打鍵ごとの束の作り直し（Task 10 で計測 1.2ms・直さない）・「す。」の 1 字落ち（好み）。
- Task 7: M4 `stripInvisible` が U+200B・U+FEFF・U+2028/2029 などを残す・M5 `BIDI_CONTROLS`・`CONTROLS` が `/g` のまま export・M6 `voiceLimitReached` の日本語「20 を超えるため」（英語の方が正確）・LINE の枠の「Safari で開く」は Android では Chrome（→ 実機確認表 A-12）。
- Task 8: 548 で S7 の声 3 本以上（→ Task 10b）・S8 のバックアップの 1 行が 320 で 3 行（最後の行が 1 語）。
- Task 9: 指紋は「何か鳴った」で、先生の WAV そのものとの比較ではない（本当の証明はネットワーク 0 とチップ）・ネットワーク 0 は SW が無い前提（段7で見直す）・clipboard は欄の退避でも通す。
- Task 10b: 横向きのスマホにも詰めた S7 の行が当たる・再読み込みした `#/share`（印なし）は声を配りに来てもルーティンが先・声をファイルにできなかった経路は手で確かめただけ（自動の検査なし）・詰めた行の主ボタンが 16px でマイクの絵なし（好み）。

## 段5の完了条件（Task 11 で再実行・2026-10-12）

（下の「完了条件の再実行」の表。最終レビュー（段5の実装に関わっていない別エージェント）は、コントローラーが別便で出す。結果と直しはこの文書の末尾に足す）

| 検査 | 結果 |
|---|---|
| `npm test` | **525 pass / 0 fail**（476 ＋ 49。計画の見込み 515 より +10＝上の「前置き」） |
| `npm run typecheck` | OK |
| `npm run build` | `dist OK: 1064 files, no legacy pages or unreviewed data, voices: default-en-female-v1` |
| `timing:audit` → `timing:compare` | `timing audit identical (generatedAt excluded)`（後で `git checkout -- output`） |
| `git diff --stat 4771d0f -- src/engine test/engine/fixtures output/timing-audit-before.json legacy public` | **`src/engine/routine-provenance.js` の 1 行だけ**（1 insertion・1 deletion）（ゴールデン・基準・legacy・public は 0） |
| `ui:check`（dev 5199） | **262 PASS**・違反 0・exit 0 |
| `ui:check`（公開ビルド `vite preview` 5198） | **262 PASS**・違反 0・exit 0（1 回目は「S4 不正カウント」の後の S4 待ちで 30 秒切れ＝下の「揺れ」。再実行で通った） |
| `smoke:share`（dev 5199／公開ビルド 5198） | OK／OK |
| `smoke:voice`・`smoke:routines`・`smoke:practice`（dev 5199） | OK・OK・OK |
| `PUBLIC_APP_URL=https://count.example.jp/ npm run build` | URL が `dist/assets/index-*.js` に入る。付けずに作り直したビルドには入らない（最後に付けずに作り直して戻した） |

主要操作数（`tools/check-app-ui.js` の期待値）: S3 1 本開＝3 ／ S4 最初の保存の案内＝3 ／ S6＝4 ／ S7＝3（標準だけ）・3（3 本）・4（録音の声を開）・4（受け取った声を開）／ S8 完成＝5 ／ S9＝5（声あり）・3（録音なし）・6（作った後）／ S10＝1（選ぶ）・2（確認）・1（受け取った）。320×568 で全状態に横スクロール無し。375×548 で主要操作が入る。

---

## 原本の写し（`.superpowers/sdd/2026-10-12-app-v1-stage5/progress.md`・Task 11 の時点）

```
# SDD ledger — plan: docs/superpowers/plans/2026-10-12-app-v1-stage5.md
Spec + Ruling 79–87, D36–D39 (and all prior rulings). PO delegated (asleep). Start HEAD 85888e3 (plan) on top of 4771d0f; real baseline = plan's scratch baseline (476 tests, ui:check 197) — plan verified by replay to an identical tree.
## Preflight
- Ruling: Tasks 1–3 (pure data/format/receive logic, verbatim code from verified scratch) batched into one Sonnet dispatch with one commit per task and one review covering the three; Tasks 4–5 likewise (settings/messages + platform files) with an Opus implementer; Tasks 6, 7, 8 (screens) one Opus dispatch each with its own review; 9 smoke (Sonnet); 10 usability walk (fresh Opus); 11 closing. — verified code makes per-task dispatch overhead poor value; reviews still per unit — if wrong, a review misses a cross-task issue that the final review should catch.
- Ruling: the plan's 10 open questions go to Fable in parallel; they affect Tasks 6–8 copy/layout at most.
- Tasks 1–3: implemented 14e94c8, c0a3d6f, 5a4708c (500 tests).
- Tasks 1–3: complete (review clean 0C/0I/6M). Carry into Tasks 4–5 dispatch as hardening extras: allow-list fields in receivedPack (plan-import.ts:48-64), cap createdWith.version length, strip bidi/control chars from received file names. Parked: words __proto__ (engine), no mid-save failure test, legacy single-voice files of two teachers replace (Ruling 84-4 accepted), BUNDLE_VOICE_MAX absent (harmless).
- Fable answered stage-5 plan questions (appended to rulings.md): only #2 changes code (no auto-download on refused share; shareRefused line + 保存 button; Tasks 4+6). D40 same-teacher key.
- Tasks 4–5 + hardening: 5b21b7f, 9727ec8, 569e33c (519 tests). Carry to Task 7: S10 File.name through cleanReceivedFileName; strip bidi/control from received distributor/voice/routine names on import. Carry to Task 6: Fable #2 refused branch.
- Tasks 4–5: complete (review spec ✅ approved, 0C/1I/9M).
- Ruling (I1, verified in iOS 26.3 SE Simulator Files app: tab is 「最近使った項目」): change ja copy 「最近の項目」→「最近使った項目」 in instructionsStep3 / receiveHelpRecents (Ruling 82-6/83-1 text corrected in Task 11) — done as a Task 7 extra (messages.ts) since Task 6 is mid-flight. Also Task 7 extras: M1 add caches/URL.createObjectURL/clipboard to the platform-boundary test BARE list; M5 'practise'→'practice'; M4/M9 bidi strip for received names + picked File.name via cleanReceivedFileName. M7 (second tap same promise) → tell Task 6 reviewer to check. M2/M3/M6/M8 parked (M6 to PO list; M8 into contract note in Task 11).
- Task 6: implemented 8dacd97 (ui:check 212). Carry to walk: routine list below the fold at 548 for routine-only sharing; 「す。」 orphan at 375.
- Task 6: complete (8dacd97, review clean 0C/0I/5M). Carry to Task 10 walk/fix: pending-flag guard in create(); debounce bundle rebuild on name keystrokes; show reason when voice prep fails; routine-only from S6 below fold at 548; 「す。」 orphan (PO wording).
- Task 7 + extras: 8d43323, 2f4fe24 (522 tests, ui:check 252). Carry to walk: mid-word breaks (ルーティ／ン, ず／っと, 押す／と); done screen has 戻る + ホームへ (two exits).
- Task 7: complete (review clean 0C/0I/8M). Ruling: M2 (replace + routine save fails → old voice gone, new not selected; やめる leaves selection on a deleted voice) — fix in the Task 10 fix round: select the new voice immediately after it is saved, and add catch to commitImport().then (M3). M1 mid-word breaks → PO taste; M7 English S10 screenshots in Task 10.
- Task 8: implemented c1e0f52 (ui:check 262). Carry to walk: S7 with ≥3 voices at 548 — 自分の声を録音する half under tab bar; S8 backup line 「す。」 at 320.
- Task 8: complete (review spec ✅ approved, 0C/1I/2M). Ruling (I: S7 ≥3 voices at 548, 自分の声を録音する half under tab bar): send to the Task 10 walk + Fable for a layout decision (e.g. both S7 actions in one row/dock at ≤599px) — not blocking now because a user with ≥3 voices has already found recording; add a first-view visibility check for S7 3本 at 548 in the same fix. Minor: confirm smoke:share covers pre-selection.
- Task 9: implemented 8e876a6 (smoke:share 3× OK; break check fails as expected).
- Task 9: complete (review spec ✅ approved, 0C/1I/3M). Carry I1 into the post-walk fix round: add smoke steps for S8 完成「配る ›」 and S3 row「配る」 → S9 with pre-selection. Minor: fingerprint compares 'something recorded', not teacher's exact WAV — parked.
- Task 10: walk done (e089f2c M2/M3 fix + test; add3c13 walk doc + auto-phrase CSS). 523 tests, ui:check 262. iOS 26.3 SE Simulator round trip PASS: S9 share sheet → 「"ファイル"に保存」 → S10 picker (最近使った項目, file selectable) → confirm 「やまださんの声（英語）· 12 語」 → 使う → S2 chip 「声: やまださんの声」 → ▶ advances.
- Ruling (controller, walk open questions — defaults are clear and low-risk; listed for PO review): (1) at ≤599px height S7 shows 「ファイルから受け取る」 and 「自分の声を録音する」 side by side in one row + 548 first-view check for 「S7 3 本」; (2) S9 without a voice intent (from S6 「ルーティンを配る」 / S3) orders name → routines → voice; (4) hide 「声かルーティンを選ぶと…」 when there is nothing to choose (show the existing empty-state guidance instead); (6) add hint line 「この声はファイルにできませんでした。」/ "This voice couldn't be put in a file." when voice prep fails; (3) iOS orphans = PO taste; (5) keep both exits. Plus Task 9 I1: smoke steps for S8 完成「配る ›」 and S3 row「配る」 pre-selection. → Task 10b.
- Task 10b: implemented 555056c (525 tests, ui:check 262). Notes for PO list: compact S7 record button 16px no icon; with ≥4 voices at 548 (or ≥3 at 320) the record button can still slip under the tab bar — longer-term option: S7 actions in a fixed dock (PO/Fable decision later).
- Task 10b: complete (review clean 0C/0I/4M; parked: landscape compact, reloaded #/share w/o intent puts routines first, prep-failure path not auto-tested, compact S7 taste).
```

## 最終レビューの直し（2026-10-12・`439eed8`）

最終レビュー（4771d0f..ba785c5）の判定は「直せば可」（0 Critical / 1 Important / 5 Minor）。直した物:

- **I1**: 受け取った声の語の `gainDb` はファイルの値を捨てて 0（`gainDb: 120` のファイルで耳元に爆音、`"loud"` で再生が壊れる、を防ぐ）。`mimeType` は文字列で、録音が作る音声の形（`audio/wav`・`x-wav`・`wave`・`webm`・`mp4`・`ogg`、`;codecs=…` 可・64 字以内）だけ。それ以外は「読めない」。`onsetMs`・`sourceOnsetMs` は 0〜10000ms、`durationMs` は 0 より大きく 10000ms 以下で、外れたら「読めない」（旧画面の未整形の語は後の 2 つが無くてよい）。語ごとのずれ（`wordOffsetsMs`）は ±300ms に収める。上限は `src/app/share/limits.ts`。エンジンは触っていない。
- **M1**: 1 ファイルの中の同じルーティン ID は 1 度だけ読む。
- **M2**: 保存した声の配る人の名前を文字（コードポイント）で切る（受け取る時と同じ。絵文字の名前でも同じ先生の声が置き換わる）。
- **M4**: `consentedAt`・`sourceUpdatedAt`・`adjustedAt` は 40 字以内の ISO 時刻だけ保存する。
- 直さなかった物: **M3**（置き換えると生徒が合わせた「−40ms」が 0 に戻る）は PO／Fable の判断（PO の一覧へ）。**M5**（ルーティンの置き換えの鍵に配る人を含めない）は段7の `distributor.id` の作業で声と同じ鍵にする（覚え書き）。

検査: `npm test` 532 pass・typecheck OK・build OK（1064 files）・`ui:check`（dev 5199）PASS・違反 0・`smoke:share`／`voice`／`routines`／`practice`（5199）OK。
