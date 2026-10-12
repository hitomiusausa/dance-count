# v1 全体の統合レビュー（段8 Task 11・Ruling 104）

> **文言は監修前**（ひとみうさの監修シート `stage8-copy-review.md` は 2026-10-12 時点で未返却。法務確認（D47・D48）も待ち）。この報告書の文言への指摘は「今の文」に対するもので、監修で変わりうる。

- 対象: `agent/app-v1` の `e1b0d7d`（`e1b0d7dc7d1fb6e257be14221cbbc84647d11aec`）
- レビュー役: どの段の実装にも関わっていない Opus（新しい文脈）。2026-10-12。
- やり方: `git archive` を `/private/tmp/dc-final-review-e1b0d7d…` に展開（`node_modules` は複写）し、ゲートを自分で再実行。dev は 5195・公開ビルドは 5194・`smoke:pwa` は 4195（5173／5198／5199 は使っていない）。画面は Chrome（playwright-core・`channel: 'chrome'`）で自分のサーバーに当てて撮影・測定した（`/private/tmp/claude-501/…/scratchpad/walk/`）。コードは直していない。終わりにサーバーとブラウザは止めた。
- 判定（先に結論）: **Critical 0・Important 2・Minor 11**。公開を止める物は無い。Important の 2 つ（種目名の語の途中の折れ・公開 URL の番人）は修正便で直せる大きさ。製品判断の要る物は 8 節の最後に「Fable／ひとみうさへ」。

---

## 1. ゲートの再実行

| 検査 | 期待（Task 10 Step 1） | 実測（この木） | 判定 |
|---|---|---|---|
| `npm test` | tests 619 / fail 0 | **tests 619 / fail 0** | 一致 |
| `npm run typecheck` | OK | **typecheck-ok** | 一致 |
| `npm run build`（check-dist の最後の行） | `dist OK: 1078 files, no legacy pages or unreviewed data, voices: default-en-female-v1, precache 172 entries 2.92 MB` | **同じ文字列** | 一致 |
| `timing:audit` → `timing:compare` | identical | **`timing audit identical (generatedAt excluded)`** | 一致 |
| `git diff --stat 955462e e1b0d7d -- src/engine`（本物の木） | 何も出ない | **何も出ない** | 一致 |
| `ui:check`（dev 5195） | 653 PASS | **653 PASS・FAIL 0** | 一致 |
| `ui:check`（公開ビルド `vite preview` 5194・SW つき） | 653 PASS | **653 PASS・FAIL 0・終了コード 0** | 一致 |
| `smoke:practice`（5195） | OK | **OK**（G1 2 タップ・G2 1 タップ・再読み込みで自動再生しない・戻るは親へ） | 一致 |
| `smoke:routines`（5195） | OK | **OK** | 一致 |
| `smoke:voice`（5195） | OK | **OK**（12 語・聞き比べ・S2 で鳴る・無音／小さすぎを拒む） | 一致 |
| `smoke:share`（5195） | OK | **OK** | 一致 |
| `smoke:pwa`（4195） | OK | **OK**（precache 172・オフラインでワルツ／パソドブレ・Noto・深いパスは奪わない・POST `./receive`・20MB 超） | 一致 |
| `du -sh dist`・`find dist -type f \| wc -l` | 29M・1078 | **29M・1078** | 一致 |
| `dist/licenses` | 5 ファイル | **5**（Inter-OFL・NotoSansJP-OFL・Preact-MIT・Workbox-MIT・Lucide-ISC） | 一致 |

揺れ: 1 度も出なかった（全部 1 回目で通った）。数値は Task 10 と全部一致＝Critical の候補なし。

---

## 2. 仕様準拠の表（S1〜S13。仕様 §4 の箇条＋各段の読み替え）

凡例: **済**＝実装どおり（確かめ方を括弧に）／**違う**＝仕様と違い裁定も無い／**未実装（裁定済み）**。「自分で見た」は 375×667・375×548（英）・320×568・360×740・1280×900 の撮影と DOM の読み取り。

| 画面 | 箇条（要約） | 判定 | 確かめ方・注記 |
|---|---|---|---|
| S1 | アプリ名 22／副題 16＋右上の言語ボタン（地球＋言語名） | 済 | 自分で見た。ボタンは**切り替え先**の言語名（日本語表示で「English」）。仕様の「日本語/English」と矛盾しない |
| S1 | 前回カード（ネイビー・▶ 続きから・即再生・`lastDanceId` 無しで描かない） | 済 | `HomeScreen.tsx:47-55`・`smoke:practice` G2 |
| S1 | 先生の声カード（種目タイルの上・1 行・→ S7） | 済 | 自分で見た |
| S1 | 種目タイル 10・副題＝`templates[0]` の整形・拍子を出さない | 済（**ただし 360 幅以下で名前が語の途中で折れる＝I1**） | 375 は 1 行。360 で「ヴィエニーズワル／ツ」、320 で 3 つ（8 節 I1） |
| S1 | 375×667 に先生カード＋10 タイル（U12）・主要操作 3（初回 2） | 済 | ui:check |
| S1 | 段7: 最下段 タイル → 更新の帯 → 案内カード（初めて鳴った後・iPhone/Android のブラウザだけ・「× 閉じる」） | 済 | `HomeScreen.tsx:23,70-83`・`lib/install-card.ts`・ui:check |
| S2 | 戻る → 見出し 28＋副題 → 現在カウント → 拍インジケータ → 速さ 3 択（♩=84 併記・チェック＋塗り）→ トグル 2（オン/オフの文字・switch）→ 声チップ → くわしく → 下固定 ▶ | 済 | 自分で見た（ja 667・en 548） |
| S2 | 主要操作 5・375×548 でも 5 | 済 | ui:check・自分で見た（en 548 で 5 つとも入る） |
| S2 | 速さ 67/84/90（Ruling 24） | 済 | 単体テスト |
| S2 | くわしく: 型（2 つ以上の種目だけ）・細かい速さ（スライダー＋競技の速さ）・繰り返す・声のタイミング（‹ 早く／遅く ›・補助文） | 済 | 自分で開いた（ワルツ・サンバは型あり、ヴィエニーズは型なし） |
| S2 | Bluetooth 補正のつまみ | 未実装（裁定済み） | Ruling 6-4「v1 必須ではない」。§9 のハイライトの `outputLatency` は `audio-context.ts:41-44` |
| S2 | 警告の枠（見出し直下・操作は 1 つ・120px 以下）・WakeLock の 1 回の案内 | 済 | `?ui-state=no-sound`・`wakelock-tip` を自分で開いた・ui:check |
| S2 | 再生中に戻ると止まる | 済 | `practice/use-session.ts:20-23`（離れたら `dispose()`→`stop()`） |
| S3 | ＋新しいルーティン・行（名前・種目・数・▶）・「○○さんから」・作った順・1 つだけ開く・▶／編集／配る／削除・確認ダイアログ・鳴らせない行の説明・0 件の 1 行 | 済 | 自分で見た（0 件）・ui:check・`smoke:routines`／`smoke:share` |
| S4 | 種目選び → 既定名 → 行を開いて決定・試聴・上下・複製・削除・ドラッグ・候補・一覧・カウントの形・常設の「使える文字」・同じ名前・小節の注意・くわしく・自動保存・バックアップの 1 行（段5の読み替え） | 済 | `smoke:routines`（最後の行に全場面）・ui:check。段3 追加便〜段7 の台帳どおり |
| S5 | S2 と同じ骨格・見出し 1 行省略・作成者の副題・現在カウント 72・今のフィガーの 1 行・一覧・速さの基準・くわしく（範囲） | 済 | ui:check の S5 の状態・`smoke:routines`（S5 で鳴る） |
| S6 | 段8の読み替え: 言語・声／「困った時は」（S12・S11）／「先生の方へ」（S8・S9）／「プライバシー・アプリについて」（版）＝5（667 は 4・548 は 3） | 済 | 自分で見た（ja・en）・ui:check |
| S7 | 標準 → 自分 → 受け取った → 途中・選んだ行に試聴・途中の行は開いて「続きを録音する」・受け取る／録音の 2 つのボタン・開いた行（録音＝配る・削除／受け取った＝削除）・`data-choices-max=24` | 済 | 自分で見た（標準だけ）・ui:check（S7 24 本を含む） |
| S7 | 「標準の声（日本語）」 | 未実装（裁定済み） | 段6 の分割（Ruling 64〜70）。6b の決定待ち（`po-checklist.md` A-2）。8 節 Fable-5 |
| S8 | 説明 3 行 → 言葉の 2 択 → 「録音をはじめる」で初めて `getUserMedia` | 済 | 自分で見た・`recorder.ts:41-47` |
| S8 | 1 語 1 画面・進み具合・144px のボタン・1.5 秒・波形と聞く・前の語・完成（完了／配る ›・1 語目から見直す・バックアップの 1 行）・マイク拒否／使えない／非対応の枠 | 済 | `smoke:voice`・`?ui-state=mic-denied`／`mic-failed`／`no-recorder` を自分で開いた |
| S9 | 段5の読み替え: 名前（40 字・記憶）→ 声 → 同意 → ルーティン（声の指定なしは 名前 → ルーティン → 声）・下固定「ファイルを作る」・結果の 1 行・案内文のコピーは作った後 | 済（**何も無い時の行き止まり＝Minor m2・Fable-4**） | 自分で見た（S6 から・名前を入れても押せる物が無く、次に押す物の案内も無い） |
| S10 | 段5・段7の読み替え: 選ぶ（文字の 2 行・LINE の枠）→ 確認（同じ物は置き換え）→ 受け取った（その場で選ぶ）・share_target は確認から | 済 | 自分で見た（選ぶ）・`smoke:share`・`smoke:pwa` |
| S10 | 「Safari で開いて受け取る」リンク（F3）・図解 SVG・「両方残す」 | 未実装（裁定済み） | Ruling 83・D38・F25 |
| S11 | 3 項目＋「もう一度 ▶」・技術用語なし | 済 | 自分で見た（ja・en） |
| S12 | 段7の読み替え: 端末ごとに 1 通り・図なし | 済 | 自分で見た（PC の分岐）・ui:check（iPhone Safari／他のブラウザ／Android あり・なし／PC／追加済みの 6 状態） |
| S13 | 段8の読み替え: このアプリについて（版・運営・mailto と文字・公式でない旨）＋プライバシー 6 段落＋使っているもの（Lucide を含む）＋「データを全て消す」（確認ダイアログ・3 ストア 1 回・受け口・旧鍵・`reloadAtHome`） | 済 | 自分で見た・`AboutScreen.tsx`・`storage.ts:134-139`・ui:check・`smoke:routines`（消せた時） |
| 共通 | 下タブと戻る（Ruling 17）・ハッシュ・直接開いた時の親・端末の戻る | 済 | ui:check U11・`smoke:practice`（戻るは親へ） |
| 共通 | 起動の殻（段8）・書体の CSS を描画を止めずに | 済 | `dist/index.html`（殻＋`media="print"`→`all`）・check-dist／check-pwa の番人 |

**違うのに裁定が無い物: 0**。

---

## 3. §11 のエラー全件・§12 の法務

### 3-1. §11（`stage8-error-matrix.md` の 19 行）

| # | 状況 | 自分の確かめ | 結果 |
|---|---|---|---|
| 1 | 音が鳴らない | `#/practice/waltz?ui-state=no-sound` を開いた。文＋「音が鳴らない時は ›」1 つ | 表どおり |
| 2 | 再生が中断 | `?ui-state=stopped`。文のみ（下の ▶） | 表どおり |
| 3 | マイク拒否 | `#/voices/record?ui-state=mic-denied`。「設定の開き方」＋言葉の 2 択＋「録音をはじめる」が残る | 表どおり |
| 4 | マイクが使えない | `?ui-state=mic-failed`。枠の中は文だけ | 表どおり |
| 5 | マイク非対応 | `?ui-state=no-recorder`。枠だけ（戻る） | 表どおり |
| 6 | 録音が無音・短すぎ | `smoke:voice`（無音・小さすぎ）・ui:check | 表どおり |
| 7 | 保存失敗 | `#/practice/waltz?ui-state=save-failed`。文＋「閉じる」 | 表どおり |
| 8 | 壊れたファイル | `smoke:share`・ui:check「S10 読めない」（`(broken.txt)` つき） | 表どおり |
| 9 | 20MB 超 | ui:check・`smoke:pwa`（受け口の大きすぎ） | 表どおり |
| 10 | 新しすぎる | `smoke:share`（受け口へ戻してから更新） | 表どおり |
| 11 | 一部のルーティンが不正 | ui:check「S10 一部読めない」 | 表どおり |
| 12 | 声が未キャッシュ | `?ui-state=voice-missing`（S2・S7）を開いた | 表どおり |
| 13 | 共有シート不可 | ui:check「S9 共有できない端末」 | 表どおり |
| 14 | 共有を拒まれた | ui:check「S9 共有を拒まれた」（実経路） | 表どおり |
| 15 | 声が 20 | ui:check「S10 声が 20」（実経路） | 表どおり |
| 16 | ルーティン 200 超 | ui:check「S10 ルーティン 200 超」（実経路） | 表どおり |
| 17 | LINE の中 | ui:check「S10 LINE の中」。リンクは自分の URL に `openExternalBrowser=1`（`page.ts:37`）＝外へ飛ばす口ではない | 表どおり |
| 18 | WakeLock 不可 | `?ui-state=wakelock-tip`。文＋「閉じる」 | 表どおり |
| 19 | データを消せなかった | ui:check「S13 消せなかった」 | 表どおり |

- 空欄の行: 無し。19 行とも「何が起きたか＋次に押す物」の型。エンジンのエラー文（`ui-messages.js` の「カウントイン」など禁止語を含む旧文）が画面に漏れる経路は無い（`src/app` に `.message`／`String(error)` の描画が 0 件）。
- 文言の気づき（監修シートへ）: 1 の枠の本文は「音が**出て**いません」、リンクは「音が**鳴らない**時は」（Task 8 で S11 の見出しにそろえた結果、同じ枠の中で動詞が 2 つ）。「本体の消音スイッチ」と S11「本体横のスイッチ（マナーモード）」は既知（`po-checklist.md` C）。

### 3-2. §12 の法務（網の棚卸しのやり直し）

ソース（`src/`・`index.html`・`vite.config.ts`）と公開ビルド（`dist/assets/*.js`・`dist/sw.js`・`dist/index.html`・`manifest.webmanifest`）の両方を検索した。

| 項目 | ソース | dist | 文（`about.ts`）との一致 |
|---|---|---|---|
| `fetch` | `platform/assets.ts:17`（同じオリジンの `audio/<pack>/manifest.json` と wav） | index の 2 か所＝上の 1 つ＋Vite の modulepreload（同じオリジンの JS）。`sw.js` の 5 か所は Workbox（precache・書体の CacheFirst＝同じオリジン） | 一致（P2「外部に送ったりする仕組みを持っていません」） |
| `XMLHttpRequest`・`sendBeacon`・`WebSocket`・`EventSource`・cookie | 0 | 0 | 一致 |
| 外部 URL | `figure-terminology.js:1-2` の ISTD の 2 つ（出典のデータ。画面にリンクとして出ない＝`src/app` の `href` は全部ハッシュ・`mailto:`・自分の URL） | 同じ 2 つの文字列＋SVG／XHTML の名前空間＋Workbox のコメントの `bit.ly` | 一致（取りに行かない） |
| `localStorage` | `platform/legacy-locale.ts:6,10`（旧画面の言語の鍵を 1 回読んで消すだけ） | 2 か所（同じ物） | 一致（P1「設定は端末の中」。P6「データを全て消す」が鍵も消す） |
| `getUserMedia` | `platform/recorder.ts:68`（許可の時＝`requestMicrophone` はすぐ閉じる・1 語＝`TAKE_MS` 1500 の後 `stopStream`） | — | 一致（P4。「録り直す」の鍵は `recordAgain` で実在） |
| `navigator.share`・`canShare` | `platform/files.ts:17-41`（利用者が押した時だけ・OS の共有シート） | — | 一致（P5「誰に渡すかは、あなた自身」） |
| 環境変数 | `PUBLIC_APP_URL` だけ（`vite.config.ts:84`・`define`） | 秘密の形（`AIza…`・`sk-…`・`API_KEY`・`private_key`・`/Users/usausagi`）0 件・`.map` 0 件 | — |
| 書体 | `@fontsource` の同梱（外部 CDN なし） | `assets/*.woff2` | 一致（P2） |
| 配布ファイルの中身 | `share/bundle.ts:40-58`（名前・同意・声＝エンジンの export の `{...pack}`＋`exportedAt`・ルーティン） | — | 概ね一致（P5「名前と、入れた声・ルーティン、作った日時」）。厳密には声のパックの作成・更新の時刻と「自分の声（英語）」の名前も入る（個人情報ではない） |

**法務で気づいた 1 点（判断は Fable／ひとみうさ・Fable-2）**: 公開ビルドの `dist/audio/default-en-female-v1/manifest.json` に `"name": "Google en-US-Neural2-F"`・`"source": "google-cloud-tts"`・`"voiceName"` が入っていて、誰でも読める。D48 は「標準の声を TTS で作ったとは**画面に**書かない（法務の判断待ち）」で、これと矛盾はしないが、法務が「出どころを伏せる」方を選ぶなら、このファイルも対象になる（エンジンは `id`・`words` しか使わない見込み＝直すなら公開ビルドで落とす作業。判断の後）。

---

## 4. §6 の手動項目とアクセシビリティ

| 項目 | 結果 | 根拠 |
|---|---|---|
| 色だけに頼らない | 概ね済 | 速さの選択＝塗り＋チェック＋文字・トグル＝スイッチ形＋「オン/オフ」・拍＝下線の太さ 6/3＋太字・鳴っている行＝左線＋太字＋塗り・不正なカウント＝赤枠＋警告アイコン＋文。**S5 の範囲の外の行は灰色だけ**（仕様 §4 S5 の設計どおり。範囲そのものは「くわしく」の「はじめ／おわり」に文字で出る）＝Minor m7。再生中のグレースケールは実機の行（`device-check-master.md` 2-27） |
| 確認ダイアログの型 | 済 | `ConfirmDialog.tsx:17-26`: 質問 1 つ＋補足・ボタン 2 つ・取り消しが左（`showModal` の最初のフォーカスも取り消し）・Esc＝やめる。使う所は S3・S7・S13 の 3 つ |
| 依頼（〜してください）は 1 画面 1 つ | 済 | `messages.ts` の 19 件を 1 つずつ画面に当てた。重なる組（S8 の語の 1 行と「声が入っていませんでした」）は同じ箱の差し替え。S4 は ui:check（`check-app-ui.js:836`）が数える |
| 本文の行の長さ（全角 35・英 70） | 済 | 1280 で S13・S12 の段落の幅を測った: 最大 **34em**（ja／en とも）。スマホは画面幅が上限 |
| axe 0 | 済 | ui:check の axe（WCAG 2.1 A/AA・375×667・日本語の周）が dev・公開ビルドとも違反 0 |
| 見出しへのフォーカス | 済 | `App.tsx:118-129`（画面が替わった時だけ・`preventScroll`）・ui:check の 26 経路 |
| 名前 | 済 | U16＋axe の `button-name`／`link-name`／`label`。U16 単独の判定が粗いのは既知（段8 Task 6 M-3） |

---

## 5. 安全

| 項目 | 結果 | 根拠 |
|---|---|---|
| 受け取るファイルの上限 | 済 | 選んだファイル: `platform/files.ts:74-77`（20MB 超は読まない）。共有: `sw.ts:52-56`（Content-Length があれば読む前・無ければ `readBodyWithin` で上限＋64KB を超えた所で取り消し）・`share-inbox-contract.ts:61-63`（書く前に再判定） |
| 型 | 済 | `share/bundle.ts:88-142`: JSON → 種類と版（新しすぎ／壊れた）→ 名前必須 → 声（同意必須・エンジンの import・12 語・語の mime は許可一覧・ms は 0〜10000・`gainDb` は捨てて 0）→ ルーティン（1 本ずつ `normalizeRoutine`＋コンパイル・同じ ID の 2 回目は読まない・50 本まで）。端末に書く項目は決まった物だけ（`plan-import.ts:52-92`） |
| 名前の不可視文字 | **一部**（既知） | `share/clean-text.ts:4-9` は向きの制御と C0／C1 だけ。**U+200B・U+2060・U+FEFF（先頭以外）・タグ文字は残る**: `cleanDistributorName('​')` は長さ 1 の名前として通る（空扱いにならない）＝受け取った声が「さんの声」に見える。作ったファイルでしか起きない。段5 Task 7 M4 の既知＝Minor m3 |
| 受け取った名前の描画 | 済 | `dangerouslySetInnerHTML` は `components/Icon.tsx:16`（同梱の `icons.svg` を import した定数）の 1 つだけ。`innerHTML`・`insertAdjacentHTML`・`eval`・`new Function` は `src` に 0。名前・ファイル名は Preact の文字列として描かれる |
| SW が受ける POST の上限 | 済 | 上の 1 行目 |
| `share_target` の 303 | 済 | `sw.ts:23-25,50,67`（成功・大きすぎ・例外のどれでも `Response.redirect('./#/receive', 303)`）・`smoke:pwa` |
| precache に秘密が無い | 済 | 3-2 の表（`PUBLIC_APP_URL` 以外の環境変数なし・秘密の形 0・`.map` 0）。precache は 172 件（殻・JS／CSS・アイコン・標準の声・書体サブセット）＝利用者のデータなし |
| 第三者のコード（Fable 答え OQ8） | 済 | 実行時に dist に入るのは Preact・workbox-window（client）・Workbox（SW）・@fontsource の書体・Lucide 由来のアイコン 2 つ・Vite の小さな前置き。BudouX は道具だけ（`ja-phrases.json` は出力）。ライセンス 5 ファイルで覆われている |

---

## 6. 常設要件（60〜70代が止まらないか・375×548・320）

- **各画面の「次に押す物」**: S1（タイル）・S2（▶）・S3（＋新しいルーティン／行）・S6（行）・S7（2 つのボタン）・S8（録音をはじめる／録音する／次へ）・S10（ファイルを選ぶ→使う）・S11・S12・S13 は 1 つに見える。**例外は S9 を「何も持っていない」状態で開いた時**（設定 →「ルーティンを配る」）: 名前を入れても「ファイルを作る」は押せず、押せない理由の 1 行も、録音／ルーティン作りへの道も無い（仕様の段5の読み替え「録音もルーティンも無い時はこの 1 行を出さない」どおり）。先生が最初に設定から入ると止まりうる＝Minor m2／Fable-4。
- **375×548**: ui:check の周（日・英）は全 PASS。自分で英語 548 の S1・S2・S6・S8・S10・S11 を見た: S2 は 5 つとも初期表示・S8 の英語の見出し「Count in」（言葉の 2 択の見出し）が「Count-in（はじめの合図）」と同じ綴りに読める＝文言の Minor m6（監修シートへ）。
- **320（日本語）と 360**: 横スクロールは無い（ui:check）。**種目タイルの名前が語の途中で折れる**（I1）。320 は iPhone SE 第1世代だけでなく、**SE 第2・3世代を「拡大表示」にした時の幅**でもあり、文字を大きくして使う 60〜70代にはむしろ当たりやすい。360 は Android の最も多い幅。
- **据え置きになった「問い」の再評価**:
  - 段4・5: S7 の 2 つのボタンを下に固定する案（段5 §0b-2）→ Ruling 103-2 の「採らない」に賛成（声 4 本以上は稀・スクロールで届く・Ruling 17 と衝突）。
  - 段5 §0b-6: ルーティンだけ受け取る生徒も「先生の声で練習」から入る → 公開前に直す物ではない（案内文に手順が書いてある）。初見テストか最初の生徒の反応で決める（ひとみうさ）。
  - 段7 C-2: S1 の案内カードの「× 閉じる」の置き場 → 据え置きでよい（閉じなくても害が無い・押し間違えても S12 へ行くだけ）。
  - 段7 M5（iOS 26 のバーが縮んで「…」が隠れる）→ 実機 A-1 の後（Ruling 103-3 のとおり）。
  - 段8 walk: S1 の見出しが 548 で先生カードの線に近い・S4 の注意の 320 の折れ・S6 の帯で 548 の「音が鳴らない時」が下・S8 のバックアップの行 → どれも「止まる」物ではない。好み（`po-checklist.md` C）のまま。

---

## 7. 残った持ち越しの一覧と仕分けの提案

「公開前」＝修正便（Task 12）で直す提案。「公開後」＝最初の修正便か触る時。

| 出どころ | 物 | 提案 | 理由 |
|---|---|---|---|
| 段8 Task 7 m1（既存） | 設定・ルーティンの読み込みが reject すると起動の殻のまま（`App.tsx:69-82` に `catch` が無い） | **公開前**（Minor m1・5 分） | 今の連鎖は全部の await が中で受けている（`settings/store.ts:12`・`routines/store.ts:9`・`openStorageWithin` は reject しない）ので実際には届かないが、届いた時の姿が「白い画面のまま」で最悪。`.catch` で既定値に落とすだけ |
| 段8 Task 4 O-1 | `tools/fonts/needed-subsets.js:59-61` の `stripComments` が文字列の中の ` // `・`/*` で字を落としうる | 公開後 | 今の木で確かめた: エンジン 4 ファイルの全字のサブセットは、コメントを除いた選択に全部入っている（差 0）。落ちても端末の書体で出るだけ。番人を `DANCE_NAMES`・フィガー名にも広げると根本で塞がる |
| 段8 Task 4 O-2 | `third_party/lucide/LICENSE` の横に版（1.17.0）の記録 | 公開後 | 表示に影響なし |
| 既存 | `ui-messages.js` の「↳」に書体のグリフが無い | 対応なし | 確かめた: 新アプリが使うのは `DANCE_NAMES` だけ（`i18n/index.ts:2`）。「↳」は旧画面の文で v1 の画面に出ない |
| 段7 n1 | 共有の POST を `chunks` → 連結 → `formData()` で一瞬 2〜3×20MB | 公開後 | 上限があり短時間。`new Blob(chunks)` にすると連結が減る |
| 段7 n2 | 待っている SW が消えると、受け口に戻したファイルが次の S10 で再び出る | 公開後 | とても稀・「新しすぎ」がもう一度出るだけでデータに害なし |
| 段8 Task 1 | `keptColumns` が壊れた行を黙って落とす・`fs.globSync` は Node 22 | 公開後 | 道具だけ。engines は ≥22.18 |
| 段8 Task 2 M2・M3 | 英語にも `overflow-wrap:anywhere`・使わない鍵も `ja-phrases.json` に | 公開後 | 実害なし（英語の周は ui:check が見ている） |
| 段8 Task 2 | 長い名前で「 が行末に 1 つ残りうる | 公開後（好み） | 見た目だけ |
| 段8 Task 3 | `ja-phrases.json` の使わない `settingsHelpHeading` | 公開後 | 無害 |
| 段8 Task 5 m-2・m-3 | `ui-state` の URL で S4／S10 は本当に書く・強制の枠は ▶ で消えない | 公開後 | 打たなければ届かない URL（`parseHash` は完全一致だけ） |
| 段8 Task 6 M-3〜M-6 | U16 の判定が粗い・axe の incomplete を捨てる・`main` の `tabindex=-1` が残る・英語 320 の S7 の「Preview」 | 公開後 | axe が厳密に見ている。M-6 は監修で短い英語にすれば消える |
| 段8 Task 7 m2〜m4 | `VoicesScreen` のコメントの数字・`check-pwa` の正規表現が属性の順に依存・`App.tsx:113` のコメント | 公開後（コメントだけ）。ただし m4 と同種の `index.html:12-13` は Minor m4 | — |
| 段7 置いておいた | M4 複数タブの「更新する」・M5 5 秒待ち・M6 Chrome からの追加・境界テストの正規表現 | 公開後 | Ruling 103-3 の「拾わない物」 |
| 段5 置いておいた | M2 blob の revoke（60 秒）・M3 iOS 15 の `inFlight`・**M4 不可視文字**（＝Minor m3）・M5 `/g` の export・Task 10b の横向き | 公開後 | m3 は作ったファイルでしか起きない |
| 段4 置いておいた | テストの穴・波形の見本・320 の S8 の縦スクロール | 公開後 | — |
| 段3 追加便の小さな残り | S5 の自動スクロールの下端・`data-catalog` の例外の範囲・Simulator のハードウェアキーボード・位置補正の自動検査・コメント | 公開後 | — |
| D40 | `distributor.id`（同じ姓の先生の声が置き換わる） | **公開後の最初の修正便**（Ruling 103-3 のまま） | 配布ファイルの形が動く |
| HANDOVER §5（段8） | アイコンの絵（D44）・Android の文言の実機確認・`.woff` を落とす／最初に要る CSS をインライン・マナーモードの呼び方 | ひとみうさの判断・実機（公開前に決める物は D44 とマナーモードの文） | 製品判断 |
| 段2 | 「くわしく」は 9（上限ちょうど）・前回カードの即再生の実機 | 実機（`stage7-device-check.md` A-5） | — |
| 第2弾 | beatMap の再生エンジン（`start()` が constant 以外を拒否） | 第2弾 | 今は守られている |

---

## 8. 指摘

### Critical（公開を止める）

なし。

### Important（修正便で直す）

#### I1. 360 幅（Android の標準）・320 幅（iPhone の拡大表示）で、S1／S4 の種目タイルの名前が語の途中で折れる

- 再現: dev を開き、Chrome の 360×740・日本語で `#/`。「ヴィエニーズワル／ツ」（「ツ」1 字の行）。320×568 では「ヴィエニーズワ／ルツ」「スローフォック／ス」「クイックステッ／プ」、英語 320 で “Viennese／Waltz”（英語は語の境で正常）。375 以上は 1 行。S4 の種目選び（`#/routines/new`）も同じタイル。
  - 測定: `.dc-tile b` の高さが行の高さの 1.5 倍を超える物（320 ja 3・340 ja 1・360 ja 1・375 ja 0・英語は 320 だけ 1）。撮影 `scratchpad/walk/360x740-ja-JP__.png`・`320x568-ja-JP__.png`。
- 該当: `src/app/screens/HomeScreen.tsx:65`・`src/app/screens/RoutineEditScreen.tsx:194`（`<b>{danceName(...)}</b>`）・`src/app/styles/base.css:70`（`.dc-tile b`）。`tools/check-app-ui.js:17` の狭い周は 320 の「横スクロール無し」だけで、語の途中の折れは見ていない（360 の周は無い）。
- なぜ Important: アプリの最初の画面で、Android の多数派の幅と、文字を大きくした iPhone で必ず見える。Ruling 97（句の境で折る）は本文に当てたが、種目名はその外にある。止まりはしないが「プロの道具に見える」（仕様 §1）を最初の画面で損なう。
- 提案（新しい製品判断は不要＝Ruling 97 の仕組みの適用）: 種目名の表示を語の境でだけ折れるようにする（例: 「ヴィエニーズ｜ワルツ」「スロー｜フォックス」「クイック｜ステップ」に `<wbr>`＋`word-break: keep-all`。区切りの表は `DANCE_NAMES` の横に 1 か所。英語はそのまま）。番人: ui:check に 360×640 の日英の周を足すか、少なくとも S1・S4 の種目選びで「`.dc-tile b` が 2 行になる時は境で折れている」を 320／360 で見る。375×667 の U12（10 タイルが入る）が崩れないことも合わせて確かめる。

#### I2. 公開ビルドで `PUBLIC_APP_URL` が空でも何も止まらず、生徒への案内文から「アプリ: URL」の行が黙って消える

- 再現: 今の手順どおり `npm run build`（環境変数なし）→ check-dist は `dist OK: …` を出して通る。S9 で作った後の「生徒への案内文をコピー」の最後の行（`アプリ: <URL>?openExternalBrowser=1`）が出ない（`app-url.ts` の仕様どおり「空なら行ごと出さない」）。
- 該当: `vite.config.ts:84`（`process.env.PUBLIC_APP_URL ?? ''`）・`src/app/app-url.ts:4`・`tools/check-dist.js`（URL を見ていない）。HANDOVER §8 の 1 行（`PUBLIC_APP_URL=https://… npm run build`）が唯一の守り。
- なぜ Important: 先生 → 生徒の道（目玉の機能・G6）で、生徒が「Dance Count を開き」と言われてもアプリの場所が書かれていない案内文になる。開発中の既定（空）が、そのまま公開の既定になりうる。ビルドは通るので誰も気づかない。
- 提案: check-dist の最後の行に URL を出す（`app url: https://…`／`app url: (none — instructions omit the app line)`）＋公開用の入口（例 `npm run build:release`）では空なら失敗させる。HANDOVER §0 の「公開前にひとみうさがやること」と `po-checklist.md` A-6 に「公開のビルドは URL つきで」を 1 行。**URL そのもの（D4）はひとみうさ**（Fable-1）。

### Minor（記録。★は「10 分以内・ユーザーに見える」＝修正便で拾ってよい物）

- **m1 ★** 設定・ルーティンの読み込みが reject すると殻のまま白い画面（段8 Task 7 m1・既存）。`src/app/App.tsx:69-82` の `then` の連鎖に `catch` が無い。今は届かない（7 節）が、届いた時の姿が最悪。提案: 連鎖の最後に `.catch(() => { setRoutines([]); setSettings(DEFAULT_SETTINGS 相当) })`。単体テストは「`loadRoutines` が投げても `settings` が入る」1 件。
- **m2** S9 を「録音もルーティンも無い」状態で開くと行き止まり（`src/app/screens/ShareScreen.tsx`。設定 →「ルーティンを配る」で再現。名前を入れても「ファイルを作る」は `disabled`・押せない理由の行も、次に押す物も無い）。仕様（段5の読み替え）どおりなので直すなら製品判断＝Fable-4。
- **m3** 受け取った名前の不可視文字の取りこぼし（段5 Task 7 M4・既知）。`src/app/share/clean-text.ts:4-9`。再現: `cleanDistributorName('​')` が長さ 1 の名前を返す（空＝「読めない」にならない）。`'山田​'` は「山田」と同じに見えて D40 の鍵が別になる。提案（公開後）: `\p{Cf}`（U+200B〜U+200D・U+2060〜U+2064・U+FEFF・タグ文字）と U+2028／U+2029 も除く。
- **m4 ★** `index.html:12-13` のコメントが事実と逆（「Preact の render が #app の中身を置き換えるので消す処理は要らない」→ 実際は置き換えないので `removeBootShell()` で外している＝段8 計画者の発見 16）。このコメントは公開ビルドの `dist/index.html` にもそのまま出る。文を直すだけ（`App.tsx:113` の同種のコメント＝Task 7 m4 も一緒に）。
- **m5** 保存領域を開くのを 1.5 秒で諦めると、そのセッションはずっと保存なしで動く（`App.tsx:37-47`）。開くのが遅い端末では、起動直後にルーティン・声・前回カードが「消えた」ように見え、そのセッションの保存は全部失敗する（次の起動で戻る）。実測の根拠が無いので直さない。提案: `device-check-master.md` に「録音した声とルーティンが 5 本以上ある状態で、ホーム画面のアプリを完全に閉じて 5 回開き直し、毎回ルーティンが出る」の 1 行。
- **m6** 英語の S8（説明の画面）の見出し “Count in”（言葉の 2 択の見出し）が、言い換え規則の “Count-in”（はじめの合図）と同じ綴りに読める。監修シートへ（例 “Language for counting”）。
- **m7** S5 の範囲の外の行は灰色だけで示す（仕様 §4 S5 の設計どおり。範囲は「くわしく」の「はじめ／おわり」に文字で出る）。§6「色だけに頼らない」の目で見ると唯一の例外。記録だけ。
- **m8** §11 の 1 行目の枠で、本文「音が出ていません」とリンク「音が鳴らない時は」で動詞が 2 つ（Task 8 で S11 の見出しにそろえた結果）。監修シートへ。
- **m9** 書体の番人（`test/tools/fonts-coverage.test.js:19`）は `APP_MESSAGES`・`ABOUT_TEXT` だけを見ていて、種目名（`DANCE_NAMES`）・フィガー名は見ていない。今は全部覆われている（7 節で確かめた）が、O-1 と合わせて公開後に広げる。
- **m10** 版の表示は `0.3.0`（`package.json`）。公開の版を 1.0.0 にするかは Fable-3。
- **m11** `dist/audio/default-en-female-v1/manifest.json` に TTS の出どころ（`Google en-US-Neural2-F`・`google-cloud-tts`）が入っている（3-2）。判断は Fable-2。

### Fable／ひとみうさへ（製品判断が要る物）

1. **公開 URL と公開ビルドの手順**（D4・I2）: URL が決まるまで I2 の番人は「空なら失敗」の入口だけ作り、値はひとみうさ。
2. **TTS の出どころが公開ファイルに見える**（D48・m11）: 法務が「書かない」を選ぶなら、公開ビルドで標準の声の `manifest.json` から `name`・`source`・`voiceName` を落とすか。
3. **公開の版番号**（m10）: `0.3.0` のまま出すか、1.0.0 にするか（配布ファイルの `createdWith.version` にも入る）。
4. **S9 の「何も無い」時の案内**（m2）: 「先に声を録音するか、ルーティンを作ると配れます。」の 1 行（操作は増やさない）を足すか、今のまま（設定の行を「先生の方へ」の録音の下に置いているので順に押せば届く）か。
5. **日本語の標準の声（6b）が決まらないまま公開する場合**: S7 は「標準の声（英語）」だけ（仕様 §9 の日本語の標準音声は未実装のまま＝段6 の分割で裁定済み）。公開の条件に入れるか。
6. 既にひとみうさの一覧にある物（ここでは足さない）: マナーモードの呼び方・アイコンの絵（D44）・https の置き場・文言の監修・法務の確認・代理決定 D23〜D50。

---

## 付録: 再現に使った物

- 別の木: `/private/tmp/dc-final-review-e1b0d7dc7d1fb6e257be14221cbbc84647d11aec`（git なし）。
- 撮影と測定のスクリプト: `/private/tmp/claude-501/-Users-usausagi/f8f07fc2-926b-43cd-8cfe-b0c856b4749b/scratchpad/walk/`（`walk.mjs`＝全画面の撮影と本文・`tiles.mjs`＝幅ごとの種目名の折れ・`more.mjs`＝S2 のくわしく・`s9.mjs`＝S9 の行き止まり・`pc.mjs`＝1280 の行の長さ）・`scratchpad/fontcheck.mjs`（エンジンの字とサブセット）・`scratchpad/zw.test.ts`（不可視文字）。
- ui:check のログ: `/private/tmp/claude-501/uicheck-dev.log`・`uicheck-prev.log`。

---

## 修正便（段8 Task 12・2026-10-12）

コントローラーの裁定どおり I1・I2・m1・m2（D51）・m4 を直した（1 指摘＝1 コミット）。`src/engine` は 0 行。

| 指摘 | コミット | 直し | 番人 |
|---|---|---|---|
| I1 | `68ca979` | 種目名を語の境でだけ折る。区切りの表 `src/app/i18n/dance-name-words.ts`（ヴィエニーズ｜ワルツ・スロー｜フォックス・クイック｜ステップ・チャチャ｜チャ・パソ｜ドブレ）＋`DanceName`（`<wbr>`＋`keep-all`・`overflow-wrap: normal`＝1 語が入らない時も語の途中では折らない）。S1 のタイル・前回カード・S4 の種目選び。英語は空白で折れる（表なし） | ui:check「種目名の折れ」360×640・320×568 × 日英（S1・S4。修正前の木では 360 ja 2 件・320 ja 6 件で落ちることを確かめた）・`test/app/dance-name-words.test.ts` |
| I2 | `cb7b5b7` | check-dist の最後の行に `app url: …`（空なら `(none — student instructions omit the app line)`）。`RELEASE=1` で `PUBLIC_APP_URL` が空・壊れている・https でないと失敗。URL の値は選んでいない（D4） | `test/tools/release-app-url.test.js`。`RELEASE=1 npm run build` は exit 1、`RELEASE=1 PUBLIC_APP_URL=https://example.invalid/` は通る（コミットした URL は無い） |
| m1 | `83c114c` | 純粋な `bootLoad`（`src/app/settings/boot-load.ts`）: 開けない＝保存なし・設定が読めない＝既定値・ルーティンが読めない＝空。reject しない | テスト 3 件。Playwright で `loadSettings`・`loadRoutines` を強制的に投げさせ、修正前は殻のまま（画面なし）・修正後は S1（タイル 10）を確認 |
| m2 | `b975cf9` | **D51（代理決定・確認待ち）**: 録音もルーティンも無い S9 の帯に「先に声を録音するか、ルーティンを作ると配れます。」／“Record a voice or make a routine first, and then you can share it.”（`phrased()`・操作は増やさない） | ui:check「S9 何も無い」（ops 2・帯の 1 行が初期表示）・`layout.test.ts` |
| m4 | `71443f2` | `index.html` の殻のコメントを事実（render は置き換えない → `removeBootShell()`）に。`App.tsx` の同種のコメントも | — |

**ゲート（修正便の後）**: `npm test` **628 / fail 0**（619 → 628）・`typecheck` OK・`npm run build` の最後の行 `dist OK: 1078 files, no legacy pages or unreviewed data, voices: default-en-female-v1, precache 172 entries 2.92 MB, app url: (none — student instructions omit the app line)`・ui:check **dev 5199 664 PASS／公開ビルド 5198 664 PASS**（653 → 664: 「S9 何も無い」7 周＋種目名の折れ 4）・`smoke:practice`・`smoke:routines`・`smoke:voice`・`smoke:share`・`smoke:pwa` OK・`timing:audit` → `timing:compare` identical・`git diff a0d89ec -- src/engine` 空。

**残した指摘**: m3・m5〜m11 は記録のまま（公開後・監修シート・製品判断）。Fable／ひとみうさへの 1・2・3・5 は `po-checklist.md` A-6・A-12〜A-14 に、D51 は A-11 に足した。

**修正便で気づいた 1 点 → 同じ修正便で直した（コントローラーの追加裁定）**: S1 の前回カードのボタン「続きから」が 360 幅で「続きか／ら」、320 で「続き／から」と語の途中で折れていた。ボタンの文字を折らない 1 塊（`white-space: nowrap`・英語 “Resume” も）にし、320 幅（`max-width: 359px`）だけカードの左右とボタンの余白を詰めて、名前の「ヴィエニーズ」とボタンがカードの内側に並ぶようにした（ボタンの高さ 48 は変えない）。番人: ui:check「種目名の折れ」を、前回カード（ヴィエニーズワルツを前回にした状態）の名前と「続きから」にも広げ、ボタンがカードからはみ出さない・名前がボタンの下に潜らないことも見る（直す前は 360 ja・320 ja で各 1 件、余白を詰める前は 320 ja で「はみ出し 313 > 292」で落ちることを確かめた）。ゲート: `npm test` 628 / fail 0・typecheck OK・ui:check dev 5199 **664 PASS**／公開ビルド 5198 **664 PASS**（状態の数は同じ・番人の中身が増えた）・`smoke:practice` OK。
