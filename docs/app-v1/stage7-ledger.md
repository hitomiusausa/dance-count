# 段7 作業台帳（PWA: Service Worker・更新の帯・S12・オフライン再生・persist()・manifest・share_target・書体のサブセット）

計画: `docs/superpowers/plans/2026-10-12-app-v1-stage7.md`（`6b486b0`）。仕様 `docs/superpowers/specs/2026-10-11-app-v1-design.md` ＋ Ruling 88〜95・D41〜D45（と、その前提の Ruling 79・68 ほか全裁定）。計画の未決 8 点への答えと D46 は `dd6ee1d`（`rulings.md` の末尾）。
枝 `agent/app-v1`（worktree なし・逐次。Tasks 9〜11 と Tasks 6〜8 の直し便だけは触るファイルが重ならないのでコントローラーの裁定で同時に走らせた）。起点 **`955462e`**（段5の最終レビューの直しの台帳）→ 計画 `6b486b0` → 答え `dd6ee1d` → 実装の最後 **`12a6b83`**（Task 12）。この文書は Task 13（締め）のコミットで入る。**push なし・デプロイなし・main 未マージ**。
進め方: ひとみうさは就寝中で委任（未決は Fable が裁定。PO 判断級は「代理決定」D41〜D46）。SDD の台帳（`.superpowers/sdd/2026-10-12-app-v1-stage7/progress.md`）の写しが末尾にある。

## 前置き（コントローラーの裁定）

- 起点: 計画のスクラッチの起点（`npm test` 532・`ui:check` 262）を本物の木で再生し、同じ木になることを確かめてから始めた。
- まとめ方: Task 1〜2（検査の揺れの直し＋書体のサブセットの道具。計画に検証済みのコード）は Sonnet 1 便・レビュー 1 回。Task 3〜5（SW・manifest・check-dist・端末の面）は Opus 1 便。Task 6〜8（画面）は Opus。Task 9〜11（persist・段5の持ち越し・`smoke:pwa`）は Sonnet でまとめて。Task 12（使いやすさの通し確認と iOS シミュレーター）は段7の実装に関わっていない Opus。Task 13 は締め。
- 計画の Open questions 1〜8 はすぐ Fable へ（Task 6〜8 の文言・数にしか効かない）。答えは `dd6ee1d`。
- テスト件数: 計画の数（532 → 564・+32）に対し、**実際は 532 → 575（+43）**。Tasks 3〜5 のレビューの安い守り（M1〜M3・M6）・Tasks 6〜8 の直し便（I1・I2）・Tasks 9〜11 の直し便（serve-dist）・Task 12 の直しで増えた。
- `ui:check`: 計画の数（262 → 322）に対し、**実際は 262 → 332**。D46（S8 iPhone Safari・未録音の状態。+5）と、直し便の「ホーム画面のアプリを S12 のアドレスで起動」（+5）の 2 状態が増えた。

## タスクごとの結果

| Task | コミット | テスト | ui:check | レビュー | 直し |
|---|---|---|---|---|---|
| 1 seed の後は画面を新しく読み込む（段3からの S4 待ちの揺れ） | `0e2d6d4` | — | 262 ×3 | 1〜2 まとめて 0C/0I/3M | 揺れ 0/24（直す前 20/24） |
| 2 書体のサブセットをアプリの文字から決める（`tools/fonts/needed-subsets.js`） | `df108d8` | 538 | 262 | 同上 | M1（文字の出どころの一覧が固定）は段8へ |
| 3 SW・manifest・share_target・仮のアイコン | `849f342` | — | — | 3〜5 まとめて 0C/0I/6M | M1〜M3・M6 は 9〜11 の便へ（下） |
| 4 check-dist の番人（全パック・書体 160・上限 6MB・manifest・直下） | `3015159` | — | — | 同上 | — |
| 5 端末の面 `platform/pwa.ts`・登録 `pwa-register.ts`・`onPageHidden`・`update-ready` | `8ab2c28` | 557 | 262（dev と SW つきの公開ビルド） | 同上 | — |
| （Fable の答え・D46） | `dd6ee1d` | — | — | — | — |
| 6 初めて鳴った印・案内カードの印・段7の文言とアイコン・案内文の【Android】 | `63d328b` | — | — | 6〜8＋D46 まとめて 0C/2I/6M | I1・I2 は直し便 1 |
| 7 更新の帯（S1 最下段・S3・S6・S7）と S10 の「更新する」 | `d9bc662` | — | — | 同上 | — |
| 8 S12・S1 の案内カード・S6 の行・S8 の D46 の 1 行 | `6b752ec` | 564 | 327 | 同上 | — |
| 6〜8 直し便 1（手順の語を 1 行に・ホーム画面のアプリは S1 から） | `37cb76a` | 572（9〜11 込み） | **332** | 再レビュー: 全部 addressed | — |
| 9 `persist()` の時機と、隠れた時に S4 の開いた行を保存 | `0bfa6c8` | — | — | 9〜11＋安い守り まとめて 0C/1I/5M | I-1 は直し便 1 |
| 10 段5の持ち越し（語の音量 −24〜0 dB・名前の切った後の空白） | `eed4009` | — | — | 同上 | — |
| 11 `smoke:pwa`・`tools/serve-dist.js` | `3a896c1` | — | — | 同上 | — |
| 3〜5 の安い守り（M1 共有の上限・M2 ナビゲーションの許可リスト・M3 帯の取りこぼし・M6 `.map` 禁止） | `620bca3` | 570（6〜8 の直し便なし） | 327 | 同上 | — |
| 9〜11 直し便 1（serve-dist の空白のパス・壊れた %・smoke の後片付け・SW は src/app を読まない） | `ae97bcc` | 575 | 332 | 再レビュー: 全部 addressed | — |
| 12 使いやすさの通し確認・iOS シミュレーター | `12a6b83` | **575** | **332**（dev と公開ビルド） | （確認そのもの） | 手順の動詞「押します。」と S10 の iOS の語を折らない塊に |
| 13 締め（この文書） | — | 575 | 332 | 最終レビューは別便 | — |

ui:check の数え方: 段5の終わり 262 → Task 7 で更新の帯の状態（S1・S3・S6・S7 更新あり）→ Task 8 で S12 の 6 状態・S1 案内カード・S8 iPhone Safari（D46）（**327**）→ 直し便 1 で「ホーム画面のアプリを S12 のアドレスで起動」（**332**）。

### 直しの中身

- **Tasks 3〜5 の安い守り（`620bca3`）**: M1 share_target の POST は `BUNDLE_MAX_BYTES`（20MB）を超えたら受け口に書かない（S10 は「大きすぎ」）・M2 SW のナビゲーションはアプリの根と `index.html` だけ（深いパスを奪わない）・M3 `usePwaUpdate` は購読の直後に今の値を読み直す（最初の描画と effect の間に来た「新しい版」を落とさない）・M6 `check-dist` が `.map` を落とす。
- **Tasks 6〜8 の直し便 1（`37cb76a`）**: I1 S12 の手順 3 が WebKit（iPhone の Safari）で「「ホーム／画面に追加」」と探す語の途中で折れた → 「…」でくくった UI の語を折らない塊に（`splitQuotedLabels`・`LabeledText`・`.dc-nowrap`。S12 の手順・Android の手順・S8 の D46 の 1 行）。I2 S12 を開いたまま追加するとホーム画面のアプリが毎回 S12 から開く恐れ → ホーム画面のアプリとして起動した時に最初のハッシュが `#/help/install` なら `#/` に置き換える（`platform/launch.ts`・`main.tsx` の最初）。英語の 548 で D43 の 1 行が下タブに潜る → 600px 未満の S12 の余白を詰めた。
- **Tasks 9〜11 の直し便 1（`ae97bcc`）**: I-1 `node tools/serve-dist.js dist 4176` が空白のあるパス（このリポジトリ）で何もせず終わる → `pathToFileURL`。m-1 壊れた %エスケープで落ちる → 400。m-2 `smoke:pwa` が早く落ちた時に `dist-b/` が残る → 後片付けを `finally` に。m-5 SW が `src/app` を読む → 共有の上限の定数を `src/share-inbox-contract.ts` へ移した。
- **Task 12（`12a6b83`）**: 手順の動詞「押します。」「押し、」を折らない塊に（WebKit 375 で iOS の手順 3、Chromium でも Android の手順 2 が「押しま／す。」と折れた）・S10 の補助 2 行も同じ扱い（「"ファイ／ル"に保存」）。製品の文言は変えていない。

## 段3からの揺れの原因と直し（Task 1）

- **原因（計測で確かめた）**: 保存領域の開きの遅れではなく**検査の手順の競り合い**。seed はアプリの裏で IndexedDB に書く。続く `page.goto(<同じ文書のハッシュ>)` は読み込み直しではなくハッシュの変化なので、動いているアプリはメモリの古い一覧（seed の前＝空）で `resolveScreen` を走らせ、知らないルーティンの S4／S5 を `#/routines` に置き換える。直後の `page.reload()` は置き換わった URL を読み直すので、重い時ほど S3 が出る。アプリの作り（知らない ID は S3 へ）は正しい。
- **直し**: `tools/ui-check-routines.js` の `openAfterSeed(page, url)`（`about:blank` を挟んで目当ての URL を新しく読み込む）。seed の後に画面を開く 7 か所（`check-app-ui.js` 1・`smoke-routines.js` 3・`smoke-share.js` 2 など）を置き換えた。12 並行 × 24 回で直す前 20/24 → 直した後 0/24（計画者）・0/24（Task 1）。
- `smoke:practice` の「ui:check の直後に 1 回だけ G1 が落ちる」（段4の台帳）は seed を使わないので**別の揺れ**。再現できず、直していない。段7の間は一度も出ていない。

## 計画者の発見 1〜20（要約。全文は計画）

1. 揺れの原因は検査の手順（上の節）。アプリは触らない。
2. 登録は `virtual:pwa-register`（素の `registerSW`）を `pwa-register.ts` で 1 回、`pwa.ts` はモジュールに 1 つの更新係（`createPwaUpdater`）（→ Open question 6・Ruling 88-4 の注記）。
3. `includeManifestIcons: false`（アイコンが glob と二重に一覧に入るのを番人で落とすため）。
4. precache の JS は `assets/*.{js,css}`（`workbox-window` の別ファイルが漏れないように。Ruling 89-1 の注記）。
5. `share-inbox-contract.ts` は 4 定数（`INBOX_CACHE`・`INBOX_KEY`・`INBOX_FILE_HEADER`・`SHARE_TARGET_FIELD`。直し便で `BUNDLE_MAX_BYTES` も。Ruling 93-3 の注記）。
6. share_target の 303 はページの `fetch` から `redirected` で見えない → スモークは `redirect:'manual'` の `opaqueredirect`。
7. 更新の帯の「更新する」は `[data-alert-action]`＝数えない（→ Open question 1・Ruling 90-7 の注記）。
8. 375×548 の S6 は「ルーティンを配る」が初期表示の下（初期 4。→ Open question 2・Ruling 92-8 の注記）。
9. S1 の案内カードは 1280×900 では初期表示に入る（375 幅の初期は 3 のまま）。
10. 「×」だけの閉じるはアイコン単独のボタン → 「× 閉じる」（→ Open question 3・Ruling 92-7 の注記）。
11. D43 の 1 行は `div.dc-hint`（`p` だと U1 の 18px に当たる）。
12. S12 の手順 4（「追加」）は行頭のアイコン無し（空の 24px で並びをそろえる）。
13. S12 の「アドレスをコピー」は今の画面のアドレス（`…/#/help/install`）。コピーの後の文は Fable の答え 5 で 2 通りに。
14. `beforeinstallprompt` は `preventDefault()` で捕まえる（S12 のボタンから出す）。
15. 初めて鳴った印は S4 の試聴でも立つ（→ Open question 8）。
16. アイコンの PNG は毎回同じバイトにならない → commit した PNG が正。
17. `smoke:pwa` の静的サーバーは同じプロセスの中（Ruling 95-2 は子プロセス。注記）。
18. 案内文の【Android】の行を書き換えた（→ Open question 4 で文を直した）。
19. 段5の持ち越し 2 つ（語の `gainDb` を −24〜0 dB・`cleanDistributorName` は切った後も空白を落とす）（→ Open question 7）。
20. SW の更新の確かめは 1 時間ごと＋見えた時（Ruling 90-4。テストで固定）。

## Open questions とその答え（Fable・`dd6ee1d`）

| # | 問い | 答え |
|---|---|---|
| 1 | 更新の帯の「更新する」は主要操作に数えない | 採用。S1 2／2・S3 1／1・S6 5・S7 3 で固定（Ruling 90-7 の見込みが誤り） |
| 2 | 375×548 の S6 は最後の行が初期表示の下 | 採用（条件つき）: 生徒が使う 3 つ（言語・声・「ホーム画面に追加する方法」）は帯があっても 548 の初期表示に入る（`S6 更新あり` の `firstView`）。行を 48px に詰める案・見出しを詰める案は採らない |
| 3 | S1 の案内カードの閉じるは「× 閉じる」 | 採用。ボタンはリンクの外（兄弟） |
| 4 | 案内文の【Android】の行 | **変更**: 「【Android】このファイルを開き、共有 →「Dance Count」→「使う」（「Dance Count」が出てこない時は、保存してから 2・3 の手順で「ファイルを選ぶ」）」（英語も同じ骨） |
| 5 | 裁定に文言が無かった物 | 一部変更: コピーの後の 1 行を端末で 2 通り（iPhone の他のブラウザ＝「…Safari を開き、上のアドレス欄に貼り付けてください。」・PC＝「…LINE やメールでスマホに送ってください。」）。ほかは採用。英語の “See More” は段8の監修で見る |
| 6 | 登録は素の `registerSW` | 採用（条件: `pwa-register.ts` の import 元は `main.tsx` だけ・境界テスト） |
| 7 | 保存されていた語の音量は −24〜0 dB | 採用（`GAIN_DB_MIN`・`GAIN_DB_MAX` を `store.ts` の先頭に） |
| 8 | 初めて鳴った印は S4 の試聴でも立つ | 採用（声が読めず鳴らなかった時は立たない） |

**D46（代理決定・ひとみうさ確認待ち）**: 録音の前に「ホーム画面に追加してから録音するのがおすすめです。このブラウザで録音した声は、追加したアプリには引き継がれません。（追加の方法は、設定の「ホーム画面に追加する方法」）」の 1 行を S8 の最初の画面に（iPhone のブラウザ・追加前・まだ 1 語も録っていない時だけ）。Task 6・8 で実装（`showsRecordInstallHint`・ui:check「S8 iPhone Safari（未録音）」）。

## 使いやすさの通し確認の後の裁定（コントローラー・`docs/app-v1/stage7-usability-walk.md` §5）

| # | 問い | 答え |
|---|---|---|
| 1 | Safari で日本語の本文が語の途中で折れる（アプリ全体） | **段8で方針を決める**（候補: 句の切れ目を折らない塊にする／`<wbr>`）。段7は直さない |
| 2 | S1 カードの「× 閉じる」が行の下に離れて置かれる | このまま（ひとみうさの好みの一覧へ） |
| 3 | 「追加」の後、アイコンは空きのあるページに置かれる | 実機確認表 1b を足した。迷うのを見たら手順 5 を足す |
| 4 | Safari の「…」のメニューが手順 3・4 の文を隠す | このまま |
| 5 | ホーム画面のアプリの最初の起動が Simulator で 4〜10 秒白い | 実機確認表 3b を足した。長ければ段8で `index.html` に読み込み中の 1 行／manifest の背景色 |

## iOS シミュレーター（Task 12・iPhone SE 第3世代・iOS 26.3）

a localhost の Safari で SW が入る（F39 の推測は正しい）・b S12 の文だけで追加できた（D41。アイコン「DC」・名前「Dance Count」・追加の画面のアドレスは start_url）・c ホーム画面から S1 で開く（全画面・667・声チップが初期表示）・d サーバーを止めて完全に閉じて開いてもワルツ・パソドブレが進む・書体は Noto のまま・e `DC_BUILD_TAG=sim` で作り直すと S6 に帯 →「更新する」で新しい版・f 548 の Safari で S12 が入る・g 追加したアプリで「ファイルを選ぶ」のピッカーが開く。すべて PASS。確かめられない物は実機確認表へ。記録 `docs/app-v1/stage7-usability-walk.md` §3。

**実機の確認は https の置き場が決まるまで止まっている**（F39。`docs/app-v1/stage7-device-check.md`）。

## 置いておいた Minor（段8以降・触る時に）

- Task 1〜2: M1 書体の道具の文字の出どころが固定の 5 ファイル（段8で S13 の長文を別のファイルに書いたら漏れる → `src/app` の UI の文字を走査するか、全字が選んだサブセットに入るテストを）・M2 全字の性質のテスト無し・M3 `400.css` だけを読む（太さで範囲は同じ）。別の 2 タブで同じ ID を書くと古い一覧で S3 へ置き換わる（手で打ったハッシュ・2 タブが要る・害なし）。
- Task 3〜5: M4 複数のタブ／窓では「更新する」で再生中の別タブも再読み込みされる（ホーム画面のアプリは普通 1 窓・許容）・M5 新しすぎるファイルの「更新する」は 5 秒で新しい SW が入らないと旧版のまま再読み込み（2 回目で入る）。`applyUpdate` の戻りが `void`（88-4 は `Promise<void>`）。
- Task 6〜8: M1 S1 カードの「× 閉じる」の置き場（→ 好み）・M2「す。」だけの行（好み）・M3 英語 548 の D43 の行（直し便で詰めた）・M4 320 の S12 の D43 の行は初期表示の下（標準は「横スクロールなし」だけ）・M5 iOS 26 の Safari はスクロールでバーが縮み「…」が隠れる／バーを「上」にした人には「画面の下の「…」」が見つからない（実機で見る）・M6 iOS 16.4 以降は Chrome からも追加できるはず（「Safari で開くと」は安全側）。直し便の再レビュー: 余白の media は横向きのスマホにも効く・S12 を開いたままホーム画面のアプリを開き直すと `#/` に戻る（許容）。
- Task 9〜11: m-3 アプリを少し切り替えただけで S4 の未完成の行（名前だけ）が捨てられる（Ruling 94-2 の「戻る」と同じ扱い。60〜70代には「消えた」に見えうる）・m-4 深いパスはオフラインで開かない（M2 の意図どおり）・境界テストの正規表現が `from './app/` の形だけ（`tsconfig.sw.json` の include が本当の守り）。
- Task 12: Simulator のホーム画面 2 ページ目に、確かめに使った「Dance Count」（`http://localhost:4199/`）が残っている（別の番号で確かめる時は長押し →「削除」）。

## 段7の完了条件（Task 13 で再実行・2026-10-12・HEAD `12a6b83`）

（最終レビュー（段7の実装に関わっていない別エージェント）は、コントローラーが別便で出す。結果と直しはこの文書の末尾に足す）

| 検査 | 結果 |
|---|---|
| `npm test` | **575 pass / 0 fail**（532 ＋ 43。計画の見込み 564 より +11＝上の「前置き」） |
| `npm run typecheck`（`tsconfig.json`＋`tsconfig.sw.json`） | OK |
| `npm run build` | `dist OK: 1072 files, no legacy pages or unreviewed data, voices: default-en-female-v1, precache 183 entries 3.01 MB` |
| `timing:audit` → `timing:compare` | `timing audit identical (generatedAt excluded)`（後で `git checkout -- output`） |
| `git diff --stat 955462e -- src/engine test/engine/fixtures output/timing-audit-before.json legacy public/audio src/app/styles/fonts.css` | **何も出ない**（`src/engine`・ゴールデン・基準・legacy・`public/audio`・`fonts.css` は 0 行） |
| `ui:check`（dev 5199） | **332 PASS**・違反 0 |
| `ui:check`（公開ビルド `vite preview` 4199・SW つき） | **332 PASS**・違反 0 |
| `smoke:practice`・`smoke:routines`・`smoke:voice`・`smoke:share`（dev 5199） | OK・OK・OK・OK |
| `smoke:share`（公開ビルド 4199） | OK |
| `smoke:pwa`（4176） | OK（precache 183・オフラインでワルツ・パソドブレ（`six.wav?v=`）・Noto Sans JP・深いパスは奪わない・POST `./receive` → S10 確認・20MB 超は書かない・新しい版の帯 →「更新する」）。`dist-b/` は残らない |
| `du -sh dist`・`find dist -type f \| wc -l` | 29M・1072 |

揺れ: この再実行では 1 度も出ていない（全部 1 回目で通った）。

主要操作数（`tools/check-app-ui.js` の期待値）: S1 更新あり 2／2・S1 案内カード 全体 5（375 の初期は 3）・S3 更新あり 1／1・S6 5（375×548 は 4）・S6 更新あり 5（548 は 3）・S7 更新あり 3／3・S12 iPhone の Safari 0・iPhone の他のブラウザ 1・Android（追加の案内あり）1・Android（なし）0・PC 1・追加済み 0。320×568 で全状態に横スクロール無し。375×548 で主要操作が入る（例外は `opsSmall` の S6）。

---

## 原本の写し（`.superpowers/sdd/2026-10-12-app-v1-stage7/progress.md`・Task 13 の時点）

```
# SDD ledger — plan: docs/superpowers/plans/2026-10-12-app-v1-stage7.md
Spec + Ruling 88–95, D41–D45 (+ Ruling 79, 68). PO delegated (asleep). Plan 6b486b0 verified by replay to identical tree (base 955462e: 532 tests, ui:check 262).
## Preflight
- Ruling: batch Tasks 1–2 (harness flake fix + font subset tool; verbatim code) in one Sonnet dispatch; 3–5 one Opus dispatch (SW/manifest/check-dist/platform pwa); 6–8 screens Opus (one dispatch each or 6+7 batched if small); 9–10 Sonnet batch; 11 smoke Sonnet; 12 walk fresh Opus; 13 closing.
- Ruling: the plan's 8 open questions go to Fable in parallel; they affect Tasks 6–8 copy/ops only.
- Flake root cause (planner): harness changed only the hash after seeding; app judged S4 against its stale in-memory list → redirect to S3. Fix: about:blank then target. 0/48 failures after fix.
- Fable answered stage-7 plan questions (rulings.md): changes in Task 6 (Android line, copied-address keys), Task 8 (S6 firstView student rows, card close sibling, address-copied branch), Task 10 (GAIN_DB constants), boundary test for pwa-register; D46 S8 intro iOS-browser hint 'add to Home Screen before recording' (+ ui:check state).
- Tasks 1–2: 0e2d6d4, df108d8 (538 tests; flake 0/24 after fix; ui:check 262 ×3).
- Tasks 1–2: complete (review clean 0C/0I/3M). Carry to stage 8: font-subset tool's fixed source list should auto-scan src for UI text (or test every glyph lands in a selected subset).
- Tasks 3–5: 849f342, 3015159, 8ab2c28 (557 tests, ui:check 262 dev+preview w/ SW; precache 183 entries 3.00MB).
- Tasks 3–5: complete (review clean 0C/0I/6M; live SW check root + /app/ subpath OK, offline OK, share_target OK, update flow OK). Carry into Tasks 9–10 batch as extras: M1 cap share_target POST at BUNDLE_MAX_BYTES before cache write; M2 navigation route allowlist (only the app root/index navigations get index.html); M3 usePwaUpdate re-read updateReady on subscribe (after Task 7 lands); M6 check-dist bans .map. Parked: M4 multi-tab reload on update (document), M5 5s timeout (user can retry).
- Tasks 6–8 + D46: 63d328b, d9bc662, 6b752ec (564 tests, ui:check 327 dev+preview). Carry to walk: EN D46 hint at 548; S1 card close placement; 320 S12 D43 line below fold; unverified Android steps & 'See More'.
- Tasks 6–8 review: spec ✅, changes needed (I1 S12 step-3 label wraps mid-label in WebKit; I2 possible launch-on-S12 if iOS saves current URL).
- Ruling (fix round 1): I1 wrap every quoted UI label in S12/instructions in a nowrap span (or WJ) and verify in Playwright WebKit at 375×548 & 320×568; I2 fix preemptively — in standalone mode at boot, a first hash of #/help/install is replaced with #/ (harmless if iOS uses start_url) + Task 12 verifies; minor EN D43 at 548 under tab bar → tighten; 「す。」 orphans PO taste. Concurrent with Tasks 9–11 (different files).
- Tasks 6–8: fix round 1/5 (37cb76a: splitQuotedLabels nowrap, launchHashFor standalone → #/, compact S12 spacing; ui:check 332).
- Tasks 6–8: complete (63d328b..37cb76a, re-review all addressed). Task 12 must confirm: real ui:check 332 on preview, iOS launch from S12 lands on S1, WebKit label rendering in Simulator.
- Tasks 9–11 + extras: 0bfa6c8, eed4009, 3a896c1, 620bca3 (gates in clean worktree: 570 tests, ui:check 327 dev+preview, smoke:pwa 3×). Concurrency with the 6–8 fix round was my ruling (non-overlapping files); combined HEAD 37cb76a gates to be run in Task 12.
- Tasks 9–11 review: spec ✅, changes needed (I-1 serve-dist CLI no-op with spaces in path). Ruling (fix round 1): I-1 pathToFileURL; m-1 catch URIError → 400; m-2 smoke:pwa try/finally covers server/Chrome start; m-5 move the shared byte limit constant into the contract file (no src/app import from SW). m-3/m-4 by design.
- Tasks 9–11: fix round 1/5 (ae97bcc; 575 tests).
- Tasks 9–11: complete (0bfa6c8..ae97bcc, re-review all addressed). Parked: import-guard regex narrow (tsconfig.sw include is the real guard).
- Task 12: walk + Simulator done (12a6b83). Combined HEAD gates green (572→575 tests, ui:check 332 dev+preview, all smokes). iOS 26.3 SE Simulator: SW on localhost OK (F39), Add to Home via S12 text alone OK, start_url '/' used, standalone launch on S1, offline waltz+paso play after full close, update banner → 更新する OK, file picker opens in standalone.
- Ruling (walk open questions): (1) Safari mid-word breaks in Japanese body text app-wide → stage 8 decides a policy (e.g. BudouX-style phrase segmentation into nowrap spans, or wbr); (2)(4) keep; (3) iOS places the icon on a page with space — add a device-check row, add a step only if PO sees confusion; (5) first standalone launch 4–10 s white → device-check row (+ stage 8: consider an inline splash/background color in manifest/index.html).
```
