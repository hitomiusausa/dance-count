# 「フィガー／ルーティン／音楽」の3入口

2026-10-23 ひちゃんの「いいね、そうしよう！」で承認された構成。準備した曲を使い、利用者には波形を出さない運用を継続。

## 利用者の動き

- 「使う」のタブを **フィガー／ルーティン／音楽** にする。「音楽」は曲から練習を始める入口。従来のフィガー内だけの音楽リンクは取り除く。
- フィガー・基本カウント・ルーティンの再生画面では、既存の詳細を **音楽・練習の設定** と表示。先頭の **音楽をつける** から同じ種目の曲を選ぶ。閉じた画面に新しい操作行を増やさない。
- フィガーは監修済みの名前とカウントを引き継ぎ、曲の練習区間内で丸ごとくり返す。途中で切れたフィガーを足さない。基本カウントから来た場合も、現在選んだ型を引き継ぐ。
- ルーティンは同じ保存済みデータと、元で選んだフィガー範囲を引き継ぐ。音楽画面で別のルーティンへ勝手に変えない。区間に入りきらない時は説明を出し、明示的に範囲を選んでもらう。
- 合う曲がない種目には「この種目の曲を準備しています」。違う種目の曲へ代替しない。
- 曲を選んだ時・再読み込み・戻った時に自動で再生しない。元で鳴っていた音と未消費の自動再生の印は、曲選択へ移る時に止める。

## 画面と経路

- `U3 #/use/music`: 第3のroot。3タブを表示、トップへ1回で戻る。
- `U5 #/use/music/for/figure/:danceId/:figureSlug`／`for/dance/:danceId`／`for/routine/:routineId`: 選択を持って曲を選ぶ画面。タブは出さず、元の練習画面へ戻る。
- `U4 #/use/music/:trackId/figure/:danceId/:figureSlug`／`dance/:danceId`／`routine/:routineId`: 選択を持った音楽再生。従来の `#/use/music/:trackId` も維持。
- ルーティン範囲は音楽用URLの `?from=N&to=N`（0始まり）だけに保存。数値・順序を検査する。音声／カウント文字列や元曲パスはURLに入れない。通常の練習同様、音楽画面内で後から変えた範囲はその訪問中だけ。
- 履歴がある時は戻る。再読み込みなどでアプリ内の履歴がない場合も、選んだ曲の一覧→元の同じフィガー／ルーティンへ戻れる。元のS5の一時的な範囲は従来どおり開き直しで全体になる。
- 削除されたルーティンは一覧へ、未監修slugは従来の基本カウント画面へ。違う種目のtrackを直接指定しても選んだ内容を失わず曲の選択へ戻す。

## 共通の時間と保存

フィガーの反復は `compileMusicFigurePlan`。既存の `compileMusicRoutinePlan` から1回の長さ・小節位相・準備の位置を得て、入る回数のフィガー列を作り、同じcompilerに渡す。新しいBPM時計や別の秒換算は作らない。再生と書出しは `compileMusicProgram`／`tempo-map`／voice schedulerを共有する。

ルーティンの保存内容・解析結果・原本は変更しない。実験例を端末へ挿入しない。現在は開発プレビューで3タブと音楽追加を表示する。本番用カタログ・課金・公開は未実施で、通常の公開buildでは音楽の入口を解放しない。

## 再現

- `npm run typecheck`, `npm test`, `npm run timing:compare`, `npm run build`
- `npm run ui:check:music`, `npm run smoke:music`
- `npm run smoke:music:navigation`: 3タブ、元の選択と範囲、同種目への絞り込み、実再生・2WAV、戻る／再読込／不正経路／曲未準備、日英・小画面・拡大相当・PC・WCAG。
- `/tmp/dc-music-analysis-venv/bin/python tools/music-probe/verify-exports.py output/music-probe/navigation-browser-evidence.json`

証拠は `output/music-probe/navigation-browser-evidence.json`、`navigation-export-verification.json`。元の音楽練習の証拠ファイルと別に残す。

## 最終検証と監査

- 自動テスト735 PASS、型検査PASS、timing golden差なし、公開build1079ファイルPASS。公開buildに制作API／原曲を含めないことも既存のdist gateで確認。
- 3タブの移動とトップへの1回の戻り、フィガーとルーティンからの同種目への絞込み、元の選択・範囲の引継ぎ、実再生と2WAV保存、再読込と戻る時の停止状態を実Chromeで確認。
- 実保存2WAV・26語の配置を標準声の波形で照合。最大差は0.001ms未満（48kHzの1sample未満）。フィガーの「12&3」は4回を丸ごと反復し、半拍を維持。音楽の推定正解の評価とは区別する。
- 違う種目のtrack、削除済みroutine、曲がない種目、不正slug・範囲queryを検査。保存済みルーティンの前後の値は一致。
- 3つのroot・曲選択・フィガーの音楽再生の日英×3サイズ＝30画面で横はみ出しなし。10ページのWCAG2A/AA PASS。375×548・250×445・1280×900を確認。
- 既存の音楽練習も9再生・16実WAV・13lifecycle、日英30 UIケース・10ページWCAG PASS。16WAV・408語も波形照合PASS。
- 監査修正: 標準のフィガー名は既存のアプリ用名称表を使い、日本語に英語名が残らないよう修正。曲選びへ移動するときは未消費のautoplay印も破棄し、戻った際の誤再生を防ぐ。ルーティン・フィガーは種目の一致を経路と再生前の両方で確認。
- 自動生成の文言監修シートは再生成し、既存274行の手書きレビューを保持。ユーザーの未追跡フィガー資料・監修xlsxは変更しない。

作業前backupは `../_backups/dance-count-before-music-navigation-20261023-183321.tar.gz`。最終コード・文書・証拠を別名でbackupし、GitHubの `agent/music-practice-20261023` へコードと文書だけを保存する。原曲・解析結果・modelはGitHubへ送らない。
