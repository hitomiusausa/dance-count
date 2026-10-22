# 「使う」内の音楽練習 — 実装設計図

更新: 2026-10-23 / 設計: Astra / 実装: うさこ

正本仕様: [有料「音楽＋カウント」](../specs/2026-10-23-paid-music-count-design.md)。この文書はコード着手・再開の手順。記載した新規ファイル名は責務の割当案であり、実装完了の記録ではない。

## 1. 今回の完成形

ひちゃんが「設計図を作って、コーディングをはじめて。最終的に『使う』セクション内に組み込む」と許可。独立labで確かめた拍地図方式を、現行アプリの「使う」から触れるところまで進める。今回の縦通しはPaper Umbrellaの短区間・元速度・既存の声で行う。

提供側準備曲のみ、各種目約3曲が準備目標。音程を保つ速度調整と書き出しも希望範囲に含む。初段の元速度実装で希望全体の完了とはしない。出力の音声／動画／両方、価格と販売方式は未決。追加提案への好意的反応だけで全候補を実装必須にはしない。

続いて、ひちゃんが就寝中の作業継続を委任し、高齢の利用者にも分かるシンプルさを最優先するよう指定。任意質問に返答がない出力形式は、**最初にレビューできる実装として短区間の音声WAVを仮選択**する。動画は後段。これは永久的な形式決定でも、返答があった扱いでもない。許可を取り直さず、ローカルの実装・検証・UX修正を進める。

公開・課金・外部送信は行わない。未審査曲はDownloads原本とGit対象外の解析結果を使う開発経路だけ。既存の汚れ・監修xlsx・`フィガー/`を保全する。

## 2. 画面とルート

```text
表紙 → 使う（S1 / #/use）
          ├ 既存の種目タイル → フィガー／基本カウント
          ├ 既存下タブ → ルーティン
          └ 音楽と練習 → 曲一覧（U3）→ 曲の練習（U4）
                                          └ くわしく → 書き出し（次段）
```

| 画面案 | route / 親 | 役割 |
|---|---|---|
| U3: 曲一覧 | `#/use/music` / S1 | 種目で絞る。曲名・長さ・利用可能状態。開発中は試作表示、実際に準備できる1曲だけ |
| U4: 曲の練習 | `#/use/music/:trackId` / U3 | 曲名、区間、現在カウント、▶/■、選択済み声、音楽／声の音量。設定は段階表示 |

両方`side:'use'`、下タブを出さない`kind:'focus'`。一覧を別のrootにしない。既存`ScreenId`・`RouteParams.trackId`・`SCREENS`・`IMPLEMENTED_SCREENS`・App描画分岐・親fallbackを一緒に追加する。ID文字制約は既存と共通。

Homeの音楽入口は既存種目選択の邪魔にならない罫線付きの1行にし、375×548で既存の最初の操作を確認する。URL直打ちで未知の曲は一覧へ、機能無効時はS1へ**hashも置換**する。戻るは再生→一覧→使う。ブラウザ戻る・直接URLからの戻るもアプリ外へ飛ばさない。

初段は20／140／280秒付近の32秒比較区間を選べるが、小節境界監修済みとは表示しない。曲の1拍目候補変更や機械解析の詳細は通常UIに常設せず、開発だけの詳細に閉じる。正式版の区間は確認済み整数tick境界に差し替える。

曲の練習は明示タップで開始。再読み込み・曲一覧からの遷移では自動再生しない。既存「前回」カードは`lastDanceId/lastFigure`専用なので、初段では音楽練習で上書きしない。次段で専用`lastMusicPractice`を検証付きで追加し、旧保存データを移行する。

### 2.1 シンプルさを数値で守る

根拠は[既存アプリ仕様§5〜6](../specs/2026-10-11-app-v1-design.md)のU1〜U16と、[役割分けの利用確認・§5bの修正](../../app-v1/role-split-usability-walk.md)。現在のCSS token・共通controls・禁止語・日本語句分割を再利用する。

| 制約 | 音楽画面での適用 |
|---|---|
| U1 | 本文18px以上・補助16px以上。小さい説明文へ情報を押し込まない |
| U2・U3 | 主ボタン56px以上、▶/■は高さ72px以上・画面幅60%以上。タップ48×48px以上・間隔8px以上。44pxを満たすだけでは既存基準未達 |
| U4 | 初期表示5操作以下、画面全体9以下。戻る等の既存除外・data-groupの数え方をそのまま使い、検査回避の偽groupを付けない |
| U5・U6 | 1群10択以内、「くわしく」は1つ。曲一覧はdata-list、種目選択10択、速度は検証後も3択程度 |
| U7〜U10 | 文字4.5:1（大きな太字3:1）、UI境界3:1。色だけで状態を示さない。reduced-motion、200%相当、320pxと既存250px周で切れ・横スクロールなし |
| U11・U13・U16 | 集中画面に下タブなし、文字付きの戻る、固定再生バー、h1は1つ、遷移時の見出しfocus。戻る時は一覧の位置を保持 |

通常画面の目標: 曲名と区間の短い説明→大きな現在カウント→速さ（初段は「元の速さ」の表示のみ）→声→大きな▶/■。繰り返しを追加しても通常は再生・声・速度・繰り返しの4操作群以内。小さい高さでは再生と速さを優先し、声の既存スクロール許容を適用する。

「くわしく」の中は**音楽と声の大きさ**を1群、**練習するところ**を1群、**はじめの合図／カチカチ音／声の調整**は既存controlsに合わせて整理する。出力は「ファイルに保存」の1操作から別の短い手順へ移し、詳細を開いたまま操作数9を超えないよう調整する。試作用の位相／offset／解析表示は初期画面に出さない。

UI語彙は「音楽と練習」「はじめの合図」「声」「ファイルに保存」。BPM・同期・キャッシュ・エクスポート等を利用者向けに出さない。アイコンには文字を添える。新しい装飾カードや点滅を追加せず、紺／白と現在カウントの琥珀を既存用途で使う。

手動確認は「初めて使う人が説明を読まず、入口1つ→曲を選ぶ→大きな再生に到達できるか」。失敗時は何が起きたかと次に押すものを短く示す。準備中も停止・戻るは押せる。日英・375×548/667・1280×900、320×568・250×445で確認する。

## 3. 責務と接続先

| 担当 | 新規／既存の場所案 | 持つもの・持たないもの |
|---|---|---|
| 曲画面 | `screens/MusicListScreen.tsx`, `MusicPracticeScreen.tsx` | 表示・入力・Session呼出。fetch・AudioContext・時刻換算は持たない |
| catalog契約 | `music/catalog.ts`, `music/types.ts` | ID/revision、種目、section、coverage、review、権利能力の検証。具体URLや決済secretは持たない |
| 音楽provider | `platform/music.ts` と開発専用provider | catalog・clipの取得、上限、hash対応、Abort、decode、エラー分類。初段はdev、後段は認証APIに差替え |
| 時間変換 | `engine/tempo-map.js` | offset付き曲map、区間の位置差、反復・逆写像。既存constant式は維持 |
| 再生計画 | `engine/music-transport.js`等 | 整数tickのイベント配置、count anchor、区間と有限反復plan。DOM・fetch・端末保存を持たない |
| 音の予約 | `engine/music-audio-engine.js`等 | 同じAudioContextで音楽・声・clickを予約、gain、停止、frame。既存voice schedulerを再利用 |
| lifecycle | 既存`practice/session.ts`・deps/hookの拡張または同じ契約を使う音楽Session | unlock、声の解決、準備、世代管理、WakeLock、中断、dispose。画面内へコピーしない |
| 出力 | `music/render-plan.ts`＋`platform/music-export.ts`等 | 同じ有限planをOfflineAudioContextへ予約し、File生成・保存。音声計算を再実装しない |

既存`PracticeSession`に曲分岐を足す場合、`track:null`の呼出とconstant engineの予約値を変えない。別Sessionに分ける場合も既存のvoice解決と端末depsを再利用し、generation・stop・WakeLockの契約を同じ試験にかける。どちらも画面に音声プレイヤーを直書きしない。

## 4. 開発providerと公開ビルドの分離

候補接続はViteの開発専用proxyからloopbackのmusic-probe serverへ。同一originの専用path（例`/__dev_music/`）を通し、`import.meta.env.DEV`がtrueの時だけproviderをimportする。URL・原本path・曲名を共通のproduction定数へ埋め込まない。serverは`127.0.0.1`のみ、任意ファイル名は受けず起動時に指定した原本だけを切り出す。

providerの戻り契約案:

```text
listTracks(signal) -> TrackSummary[]
loadTrack(trackId, revision, signal) -> TrackManifest
loadClip(audioContext, manifest, section, signal)
  -> { buffer, sourceStartSeconds, sourceEndSeconds, sourceHash, revision }
```

manifestの原本hashと解析hashをserverで照合。revision違い・NaN・範囲外・長すぎ・大きすぎを拒否する。clipには元曲の秒原点を含め、`buffer0秒 = track0tick`と決めつけない。decode後の実長も予定区間に足りるか確認する。

production buildでは開発provider、曲名、原本hash、原本path、loopback port、解析JSON、音源がdist／precacheに存在しないことを検査する。Homeのカードを隠すだけで済ませない。機能無効時のhash直接入力と通信ゼロも確認。将来の製品providerは§8へ接続する。

## 5. 音と表示の契約

`T(q)`を元音源先頭からの秒、整数tick区間を`[s,e)`、開始を`a`とする。初段は倍率1。

```text
D = T(e) - T(s)
event time(q,n) = a + n*D + T(q) - T(s)
buffer offset = T(s) - clip.sourceStartSeconds
display tick = T⁻¹(T(s) + (context.currentTime - a - n*D - displayLatency))
```

これらの演算は共通transportへ集約。一定BPMをUIで算出して声を鳴らさない。loop境界は半開区間、時刻は開始基準から計算。voice `onsetMs`・全体／語別offsetは既存schedulerに渡す。小節1拍目とルンバ`2341`の「2」のanchorは別フィールドにする。

初段の秒指定clipではsourceの頭／終端とカウント可能な整数tick範囲を区別する。clip頭0.12秒以内の語をlab同様に単に捨てる実装を正式仕様にせず、カウント開始を次の承認済み境界に置き、必要onset分を予約できるよう開始の余白を取る。拍coverageを越える語は作らない。

共通planは`track/revision, tempo, section, patternAnchorTick, events, voiceOffsets, gains, countIn, finiteRepeatCount, totalDuration`を固定する。音楽のassetとmapを一組にする。voice/count-inの開始・終了と表示が同じplanから導かれる。

必須のlifecycle: タップ同期unlock→世代を更新→選択声／clip準備→世代を再確認→同時計に予約。stopは準備中fetch・予約node・timer/RAF・WakeLockをすべて片付ける。完了後の遅いPromiseは音を出さない。電話・lock後は停止して案内、勝手に再開しない。

第一段は単発32秒を最低到達点とする。ループ／合図を同時に実装するなら、完全小節sectionとphaseが確認できる範囲だけ有効化し、未確認の秒区間に自然ループの表示を付けない。音量は別bus、ノイズを避ける短いrampを使う。既存無料経路の音量は変えない。

## 6. 速度と書き出しの次段

速度変更は音程維持が希望。単純なplaybackRateを「音程そのまま」と表示しない。最初の方式候補は提供側で生成した速度別素材と対応map。WASM/AudioWorklet等の実時間処理は遅延・CPU・音質・ライセンスを別途評価する。候補倍率・範囲は未決。初段は元速度表示だけで、有効な速度操作を偽装しない。

最初のレビュー可能な書き出しを短区間の音声WAVとして実装する（§1の仮選択）。ユーザーへの提供形式を音声だけに確定しない。再生と同じ有限plan・voice schedulerをOfflineAudioContextへ予約する。無限ループを出力へ渡さない。count-in、反復回数、音量、声、offsetは生成開始時のsnapshot。

流れ: 「素材を作る」→長さ・容量確認→生成中（中止可）→**別タップで「保存する／共有する」**。既存`platform/files.ts`のshareはユーザー操作の先頭で必要なため、renderのawait直後に共有を自動発火しない。中止でrender自体を止められない環境でも結果を破棄し、並列jobを増やさない。ブラウザ終了／画面離脱時は再生と出力を別に管理する。

受け取った先生の声は初段の出力対象にしない。標準／自分の声でも素材出力の許諾を検証する。ローカルの技術出力と販売機能の公開を区別。端末外へ出たファイルは課金leaseで回収できない条件を商品仕様に反映する。

## 7. 実装順と受入

| 段 | 実装 | 完了の証拠 |
|---|---|---|
| 1 | 純粋transport、dev provider、共通Session接続 | 不規則map・非ゼロ開始・anchor・onset・終端のunit。constant golden無変更 |
| 2 | Home→一覧→再生、音量、声、停止／戻る | Chrome実音、日英・375px・直接hash・準備中停止・声切替競合。公開buildへ開発曲が出ない |
| 3 | 短区間Offline出力の基盤 | 同じplanの予約一致、出力の語別onset・peak・長さ、保存後に別プレイヤーで再読込。書出中止と有限長 |
| 4 | 音程維持の速度、審査済み小節区間、loop/count-in | 速度別拍・音程・継ぎ目、10分ループ、停止／中断、iPhone/Android実機 |
| 5 | 各種目のcatalog・保存・全曲chunk・書き出し形式拡張 | 曲ごとの拍／権利レビュー、全体メモリ、動画なら音と数字の一致、offline復元 |
| 6 | 商品決定後の認証・課金・有料配信 | sandbox購入／返金／復元、未購入配信拒否、offline lease、公開前の明示許可 |

各段で`npm test`・`npm run typecheck`・`npm run build`を通す。時間変換を触る段は`npm run timing:compare`、画面の段は既存practice導線＋追加music smokeとUI検査。SWを触る段はproduction相当の`smoke:pwa`。テストのためにgoldenを書き換えない。

音の受入は「予約値」「Offline render」「実際に鳴るブラウザ」「スマートフォン」「音楽拍の監修」を分ける。既存の5ms窓で0msという測定をサンプル精度や曲の拍正解へ読み替えない。未審査の約14秒の末尾に外挿カウントを足さない。

開発の1clipは32秒、元曲全体decodeを禁止する。製品案のdecode済み音楽32MiB予算は一時コピー・出力bufferを含む総メモリ予算とは別。Offline出力を並行させる際は一時メモリも測り、長さ／反復回数を制限してから公開する。

## 8. 製品APIへの差替え

画面→provider契約を維持し、dev providerを認証済APIへ交換する。`GET /api/music/catalog`で公開revisionと権利能力、`POST /api/music/access`でclip取得許可、`GET /api/me/entitlements`で利用権・offline leaseを得る。購入は別billing adapter。UIのpaidフラグだけで配信しない。

曲の再生・端末保存・ファイル出力は能力を分ける（例`canPlay/canCache/canExport`）。既存共有bundleに音楽を混ぜず、署名URL・tokenを保存形式へ漏らさない。7日offline案など未決条件はspecを参照し、開発中の任意値を本番商品の契約へ昇格させない。

## 9. 再開の最短順

1. `git status`と本書を読み、うさこの実装差分・テスト記録を確認する。新規ファイル名が案と違っても責務と実コードを照合する。
2. 原本hashと`output/music-probe/analysis.json`一致、loopback server稼働、Vite dev providerの有効条件を確認する。
3. 使う→音楽→短区間で、選択声・表示・音量・停止／戻るを触る。
4. buildで開発音源・メタデータ・URLが出ていないことと既存constant経路を確認する。
5. 次は同transportの短区間出力と音程維持方式の検証。価格未決を理由にローカル技術実装を止めず、価格を代わりに決めて課金もしない。

実装の完了段・実機の未確認項目・起動コマンドは、作業後に`docs/app-v1/HANDOVER.md`へ要点と本書リンクを記録する。
