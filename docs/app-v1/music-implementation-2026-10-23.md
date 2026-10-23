# 音楽＋カウント実装 — 再開用引き継ぎ

更新: 2026-10-23 / うさこ。設計と独立UX監査: Astra。

## 現在地

作業枝 `agent/music-practice-20261023`（元 `agent/logo` / `2db3fae`）。**ローカル開発プレビューを実装。本番公開・課金接続はしていない。** 最新コードと設計はこの枝にバックアップする。既存の未追跡 `フィガー/` と `docs/app-v1/フィガーのカウント監修シート.xlsx` は変更・Git追加していない。

入口: **使う → 音楽に合わせて練習 → Paper Umbrella**。既存のカウントだけの練習もそのまま使える。通常ビルドでは音楽入口・開発カタログ・未審査音源を出さない。

```sh
VITE_MUSIC_PREVIEW=1 npm run dev -- --host 127.0.0.1 --port 5195
```

開く: `http://127.0.0.1:5195/#/use/music/paper-umbrella`。前提: ffmpeg、Downloadsの原本WAV、`output/music-probe/analysis.json`。解析の再作成は `tools/music-probe/README.md`。Gitには原本・解析・加工音声を含めていないので、別Macではこれらを準備する。開発serverはloopbackからだけ音楽APIを受ける。

## 触れること

- 前半／中盤／後半の各12小節候補、ゆっくり0.8／元1／少し速く1.1。音程は事前加工で保ち、ブラウザのmusic playbackRateは1。
- 反復1／2／4回。音楽と声の別音量（鳴らしながら変更可）、声ON/OFF、既存の選択済み声、曲ごとの設定保存。
- **曲が先／カウントが先／一緒に**。待つ長さ1拍／2拍／1小節／2小節あと。既定は曲が先・2小節あと。曲が先は初回だけ声を待たせ、音楽を止めずにその拍の声から入る。声が先は曲へ続く型の直前カウントを鳴らす（常に「1」からとは限らない）。声OFFなら導入なし。
- 「くわしく」でWAV作成 → 完成後に「ファイルを保存する」。48kHz stereo PCM16・最大120秒。見積り秒数と容量、理由別エラー、中止あり。受け取った先生の声は出力不可、自作録音・標準声は対応。動画は未実装。
- 設定変更・声変更・戻る・背景化では古い再生／作成結果が復活しない。背景化は自動再開しない。

「2拍目」と「2拍あと」は異なるため、UIは待つ長さを明記。1拍あと＝2拍目、1小節あと＝2小節目。追加仕様の正本は[設計§1.2](../superpowers/specs/2026-10-23-paid-music-count-design.md)。

## 構造と修正理由

- `engine/music-plan.js`: compilerの型を原曲の絶対整数tickへ配置。区間・反復・先行する声／音楽を共通jobs化。再生とOffline出力で共有。
- `engine/tempo-map.js`: 非一定の時刻は区間の**位置差**、逆変換と反復もここ。人工的な声の導入は最初の拍間隔。既存constantの演算順は変更していない。
- `engine/music-audio-engine.js`: musicとvoiceを同じAudioContextへ予約。50msのlookahead、遅れた語はまとめて鳴らさず停止。表示も同じ写像とjobs。
- `practice/session.ts`: unlock、声・曲の準備、世代管理、WakeLock、中断を既存sessionへ統合。音楽失敗時に声だけへ勝手に切替しない。
- `platform/music.ts` / `tools/music-dev-plugin.ts`: dev限定provider。原本SHA検証、区間上限、decode済音楽32MiB以下・直近1区間cache。`public/audio`へ曲を置かない。
- `platform/music-export.ts`: 同じjobs／voice schedulerで実WAVを生成。最終clip・非有限サンプルを拒否。保存できるFileの準備とOSへの保存操作を区別。
- 加工の初期v1でffmpegの出力側`-ss/-t`が速度変更後の時刻を切っていた。**元曲の時刻でatrim → atempo → 出力長を整える**順に修正、revision `atempo-v2`で古いcacheを無効化。9素材の実音を測り直した。
- 初期URLが設定読込中に変わるとhash購読前の遷移を取りこぼす既存問題を再現。`useRoute`で購読後に現在hashを照合。reload直後のUse遷移もUI検査で確認。
- D62の待つコインが旧UI検査の長さ上限に抵触していた。busy中のコインだけ通常motion例外を明記。reduced-motion時は外側fadeも含め全アニメーション停止を検証。

## 検証と証拠

機械の予約時刻・保存波形・ブラウザ・曲の拍監修・実機受入は別の証拠として扱う。数値の最終結果は下記追記。

- `npm test` / `npm run typecheck` / `npm run build` / `npm run timing:compare`
- `DC_BASE_URL=http://127.0.0.1:5196/ npm run ui:check`（production preview）
- production previewで `smoke:practice` / `smoke:routines` / `smoke:voice` / `smoke:share`
- `npm run ui:check:music`: 日英×5画面幅×3速度＝30件、開閉、native scrollbar、WCAG2A/AA。初期操作4／詳細8群、48px、補助16px、短画面のHome入口・詳細を検査。
- `npm run smoke:music`: 実Chromeの使う導線、9素材、実反復、設定保持、中止・遅延・戻る、6通りの開始順序／長さ、ダウンロードしたWAV。
- `/tmp/dc-music-analysis-venv/bin/python tools/music-probe/verify-speed.py`: 9加工素材の実長、原曲との局所envelope位置、440Hz基準音の音程保持。
- 同 `verify-exports.py`: **ダウンロード済みPCM16 WAV**の声を標準音声の波形と独立照合。証拠は `output/music-probe/{app-browser-evidence,music-ui-evidence,speed-verification,export-verification}.json`。音声やスクリーンショットはGit対象外。
- 文言シートを再生成し、既存手書きの監修列を保持。新画面は専用のU3・U4節にまとめる。

## バックアップ

- 作業前全体: `../_backups/dance-count-before-music-integration-20261023-020449.tar.gz`、SHA256 `177d8353f7f9cbda5ce04b20cd7d372fec6c83a48477d233d3d239a91e0b28c3`。未追跡フィガー／監修表も含む。
- 開始順追加前: `../_backups/dance-count-before-start-options-20261023-111814.tar.gz`。
- GitHub: `https://github.com/hitomiusausa/dance-count/tree/agent/music-practice-20261023`。設計・初回比較のcheckpoint `5e9f2a4`はpush確認済み。実装の最終commitと追加ローカルbackupは末尾追記。

## 次に進める順

1. ひちゃんがMacで既定の曲先2小節を試聴し、先生と拍・小節頭／ルンバ適性を確認。原曲末尾14.038秒は未検出、外挿カウントなし。
2. 各種目約3曲を準備。原本hash、生成時の利用権根拠、拍・小節、区間、声とのバランス、速度加工の品質を曲ごとに審査。Paper Umbrellaは現時点で未審査素材。
3. 価格／販売方式／販売地域、無料試聴・オフライン条件を決めて、認証・entitlement・配信／出力権限をserverで実装。今のdev flagを有料判定へ流用しない。
4. iPhone/Androidの音声開始・native select・指の操作・VoiceOver・背景化・WAV実保存・メモリと音質を受入。Bluetoothの実音遅延は今回測っていない。
5. 公開許可後にdeploy、公開URLのブラウザ確認と実機確認。今回のGitHub backupは公開deployの代わりではない。

お気に入り、全曲、動画、任意アップロード、認証・決済・有料曲のoffline cacheは未実装。Sunoで作っただけで無条件に権利問題がなくなるとは扱わない。権利調査は[設計§7.2](../superpowers/specs/2026-10-23-paid-music-count-design.md)の一次資料と未決項目を参照。

## 最終検証（2026-10-23）

- 自動テスト **718 PASS**、型検査PASS、既存timing golden差なし。`VITE_MUSIC_PREVIEW=1`を付けてproduction buildしても1079ファイルの検査PASS、試作曲名・hash・API pathはbundle／precacheに含まれない。
- production previewの既存UI検査 **890 PASS / 失敗0**。基本練習・ルーティン・録音・共有の4smokeがすべてPASS。新しいproduction buildでも音楽入口なし・音楽deep linkはUseへhash置換されることを実Chromeで確認。
- 音楽UI **30ケースPASS**、WCAG検査10ページ、初期4／詳細8操作群。native scrollbar込み375×548の待機画面と「曲を聞きましょう」の画面を直接目視。
- 音楽smoke **9素材・16保存WAV・13確認PASS**。6通り（曲先／声先×1拍・1小節・2小節）の実AudioBufferSourceNode開始時刻を共通planと比較。音声unlock用の短い無音nodeは声の測定から除外。
- 保存済み16ファイル・**816語**の波形照合: 最大絶対位置差 **0.01574ms未満**（48kHzの1sample未満）、最低相関0.8943、長さ1sample以内、clipなし。この値は標準英語声のファイル内配置についてで、音楽の拍正解・音程の主観品質・スピーカー／Bluetooth遅延を証明しない。
- 9速度素材は実長1sample以内。原曲envelopeとの局所比較（強い窓だけ）のp95最大17.2ms。440Hz基準音は0.8／1／1.1すべて440Hz。自然な打楽器・楽器の音質は人の受入を残す。
- 文言シートの既存監修列 **274件を元HEADと照合して保持**。AstraのMUX-01〜09修正は[監査追記](music-ux-audit-2026-10-23.md)に整理。

## 最終バックアップ

- `../_backups/dance-count-music-practice-20261023-113504.tar.gz`（155,329,849 bytes / 573 entries）。SHA256: `0e9d68a7da52fc5ff9e34234aec31bf3a27daa270ad6b03b7b32c9a084e85ec9`。
- コード・文書・既存素材に加えて、**元WAVと解析／検証JSONもこのローカルarchiveだけに保存**。未追跡フィガーと監修xlsxの存在をarchive内で確認。依存・dist・出力WAV・秘密ファイルは除外。隣のJSONにbranch/baseHeadとdigest、patchに既存追跡ファイルの差分を記録。
- このメモを含む実装commitを同じGitHub作業枝へpushし、remote HEADとの一致を確認する。最終commitは`git log -1`を参照。merge・deployはしない。
- 追加のChrome確認: 取得を1.5秒遅延し、実listenerへsynthetic `pagehide`を発行。作成中止文言・遅いFileの破棄・準備中再生の停止を確認（`pagehide-evidence.json`）。OSのアプリ切替・電話割込みの実機確認とは区別。
