# 波形から拍・小節頭を推定する制作プログラム — 引き継ぎ

2026-10-23 / うさこ。ひちゃんの「音とカウントが合わない」「波形を見て小節を把握しカウントを合わせるプログラムを組んで」に対応。

## 現在の方式

`波形 → FFmpegで共通の時刻0へdecode → log-melスペクトログラム → 拍・小節頭の同時推定 → 小節の構造検査 → 安定した区間の選択 → 既存エンジンとWAVへ接続`。

従来の「librosa候補をすべて1拍」「偶数点だけを1拍」は履歴として保持し、現在のpreviewでは使わない。一定BPMへ固定していない。解析された各拍の実時刻と区間ごとの小節頭を使う。

- 解析: `tools/music-probe/analyze-bars.py` / 数値検査: `bar_analysis.py`。Mac内のMPS／CPUで動く。3拍子は`--beats-per-bar 3`、既定は4。波形min/max・モデル活性・拍・小節頭・要確認区間をJSONへ出力。
- モデル: [Beat This! 公式実装](https://github.com/CPJKU/beat_this) `1.1.0`, `final0`。コード・配布weightsはMIT。model SHA256は`8c328b45f59d8dd3dff219253ff6a8d6482be57d0133a29140e2febbf8eb8331`固定。公式hostがHTTP503だったため、同じhashの再配布を取得した。学習元や楽曲の権利の確認が済んだという意味にはしない。
- 原本も解析データも外部へ送らない。モデルのdownloadだけがネット通信。モデルはweight-onlyで読込み、source hash／model hash／decoder設定をcacheの識別に使用。
- 解析結果は`output/music-probe/bar-analysis.json`、旧版を`bar-analysis-history/`へ保全。波形を変えたら元SHA違いとして拒否。途中で原本が変わる場合も出力しない。
- preview adapter: `tools/music-preview-track.ts`。4拍ずつ6小節連続した候補を選ぶ。4拍でない／拍間隔が極端／活性が弱い場所を間引きや補間で修復したふりをしない。使える連続区間がなければその曲のカウント再生を開放せず、波形確認を促す。
- `MusicSection.anchorTick`を追加。ワルツは「123」、ルンバは「2341」、チャチャチャは「234&1」の既存compilerを使い、ワルツの3拍とチャチャチャの半拍を保つ。`music-plan.js`は区間の小節頭を基準に数字を置く。前の区間で拍が欠けたり増えたりしても、後の数字がindex%4でずれない。
- asset revisionはsource SHA＋実際の拍地図・区間・種目とカウント内容から算出。同じreport IDが残っても拍内容が変わればcacheを更新する。
- FFmpegの切出し前にも`asetpts=PTS-STARTPTS`を追加。MP3のencoder delay／開始timestampで解析と切出しの原点を食い違わせない。切出し後のresetと音程維持処理も継続。

## 試す

```sh
/tmp/dc-waveform-bars-venv/bin/python tools/music-probe/analyze-bars.py '/Users/usausagi/Downloads/Paper Umbrella.wav'
VITE_MUSIC_PREVIEW=1 npm run dev -- --host 127.0.0.1 --port 5195
```

- **波形と小節の確認**: `http://127.0.0.1:5195/__music/review`
- **普段の練習**: `http://127.0.0.1:5195/#/use/music/paper-umbrella`

確認画面は制作側の日本語の道具（普段の練習画面は日英のまま）。上部で6曲を切替でき、全体波形と要確認部分、2小節ずつの波形・1〜3／1〜4・太い小節頭の線・再生位置を表示。同じ`MusicAudioEngine`／`tempo-map`／voice schedulerを使って鳴らす。速さ、音楽だけ、停止、前後の2小節、背景化・準備中止に対応。普段の練習画面へ解析設定を増やしていない。

解析JSON・library index・指定原本をdev serverが監視し、更新時に検証して再読込する。中断後に勝手に再生しない。候補区間が選べない場合も解析が原本に対応していれば全体波形と理由を表示する。

## Paper Umbrella の今回の推定結果

- 約329.96秒、拍候補345個、小節頭候補96個。
- 区切りの拍数: 4拍77区間、その他18区間。構造・活性の検査後、候補76／要確認19区間。
- 中央値約65.22 BPM。速度だけなら前回の半分候補に近いが、**はじめの部分は旧候補と新候補の位置が約0.42秒異なる**。これはモデル同士の比較であり、人手の音楽正解に対する誤差とは呼ばない。
- 選んだ6小節: はじめ **20.02〜41.54秒**、まん中 **139.66〜161.52秒**、おわり **257.20〜280.88秒**。
- 後半280秒以降には短い偽拍らしい推定や4拍でない区切りが多く、末尾9.42秒は拍未検出。「おわり」は安定区間へ前倒しした。全曲へ外挿カウントを足していない。
- 機械の活性は正解確率ではない。`review.humanReviewed=false`。ルンバ適性・拍の最終監修・販売権利は引き続き人の確認が必要。

## 追加された原本と再利用

ひちゃんが実験用と指定した`music/`の5つのMP3も、名前の変更に影響されないよう内容hashでローカルcopyを作り、同じ解析器で処理した。原本は変更していない。

- Waltz High: 142拍、45候補区間／3要確認、中央値約83.33 BPM。3拍子として解析。
- Rumba High: 181拍、43候補区間／5要確認、中央値約103.45 BPM。
- Rumba Low: 153拍、35候補区間／5要確認、中央値約81.08 BPM。
- chacha High: 269拍、36候補区間／29要確認、中央値120 BPM。
- chacha Low: 173拍、34候補区間／16要確認、中央値約111.11 BPM。

名前は提供ファイルの識別用で、ジャンルの認定ではない。この5曲を開発用カタログへ接続し、通常の練習画面と波形画面で切替・試聴できる。結果は`output/music-probe/library-index.json`と`library/<sourceHash>/bar-analysis.json`。販売カタログへの登録ではない。`music/`・生成結果・モデル・原曲はGit対象外。追加曲を販売準備へ進めるときは、この候補／要確認をもとに短区間を聴いて選ぶ。

## 再現と受入

手順・Python環境は`tools/music-probe/README.md`と`requirements-bars.txt`。5曲の準備は`analyze-library.py music`。重い処理は開発／制作時だけで、アプリ利用時にモデルやPythonは要らない。

実行する検査:
- `npm test`, `npm run typecheck`, `npm run timing:compare`, `npm run build`
- Python `test_bar_analysis.py`: 可変テンポ、3／4拍子、誤拍子、短い偽拍、弱い活性、coverage、波形transient。
- `npm run smoke:music:waveform`: 制作画面の再生／小節頭／2小節追従／停止／速度／音楽のみ／背景化／準備取消／小画面／WCAG。
- `npm run ui:check:music`, `npm run smoke:music`と実保存WAVの`verify-exports.py`。

配置精度の検算は「推定された拍へ声が正しく置かれた」証拠で、音楽上の推定正解を代替しない。ひちゃんの再試聴と実機受入を残す。最終結果・backupは以下に追記する。

## 最終検証とバックアップ

- `npm test` **725 PASS**、Pythonの解析検査 **6 PASS**、型検査PASS、既存timing golden差なし。公開build **1079ファイルPASS**。実Chromeのproduction guardでも音楽入口なし・直接URLをUseへ置換することを確認。公開deployはしていない。
- 元曲の音楽smoke **9速度素材・16保存WAV・13確認PASS**。追加5曲もそれぞれ再生・WAV保存、ワルツ3拍とチャチャチャの半拍、全曲の250px／375pxの横はみ出しなし、波形画面での種目切替を確認。
- 波形画面 **3区間・6lifecycle・3画面幅・WCAG2A/AA PASS**。実再生中に2小節表示が追従し、停止・音楽のみ・速度・背景化・準備中止を確認。要確認一覧はkeyboard focusでscrollできる。
- 普段の音楽画面は**日英30ケース・90開始順選択・10ページのWCAG PASS**。初期4／詳細8操作群を維持。
- 実保存**21WAV・534語**を標準声の波形と照合。最大絶対配置差 **約0.02084ms（48kHzの1sample程度）**、長さ1sample以内、clipなし。推定された拍へ配置できた証拠で、推定の音楽的正解の証明ではない。
- 速度9素材の原曲envelope比較はp95最大約15.9ms。440Hz基準音は3速度とも440Hz。WAV／MP3のdecoded先頭原点で切出した波形と、全decode後の該当samplesの差は0。
- 証拠JSON: `app-browser-evidence.json`, `library-browser-evidence.json`, `waveform-review-evidence.json`, `music-ui-evidence.json`, `export-verification.json`, `speed-verification.json`, `decoder-origin-verification.json`（すべて`output/music-probe/`）。
- 最終ローカルbackup: `../_backups/dance-count-waveform-library-20261023-165621.tar.gz`。コード・文書・元のユーザー資料・5曲の原本・Paper Umbrella・検証済みmodel・解析／検証を保存。依存・dist・再生成可能な試聴WAV・秘密ファイルは除外。隣のJSONにdigest・Git HEAD・remote確認結果を記録する。
- GitHubは`agent/music-practice-20261023`へコードと文書だけをbackup。音源・解析JSON・model・既存の未追跡フィガー／監修xlsxは送らない。

次は波形画面で5曲を切替え、音楽の区切りと「1」が合うかひちゃんと確認する。制作側の自動推定と、人の音楽監修・実機受入・権利審査を区別して進める。
