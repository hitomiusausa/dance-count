# ローカル音楽同期試作（2026-10-23）

本番アプリに組み込む前の技術検証。課金機能は含まない。
曲・解析結果・試聴WAV・スクリーンショットは `output/music-probe/`（Git対象外）。
原本を書き換えず、外部に送信しない。`public/` へ楽曲を置かない。

## 再開

前提: Python 3.13、ffmpeg/ffprobe、Node、既存npm依存。

```sh
python3 -m venv /tmp/dc-music-analysis-venv
/tmp/dc-music-analysis-venv/bin/pip install -r tools/music-probe/requirements.txt
/tmp/dc-music-analysis-venv/bin/python tools/music-probe/analyze.py '/Users/usausagi/Downloads/Paper Umbrella.wav'
python3 tools/music-probe/server.py '/Users/usausagi/Downloads/Paper Umbrella.wav'
```

`http://127.0.0.1:5194/` を開く。既定は20秒から32秒。
140秒・280秒の区間、一定BPMと推定拍時刻、小節の仮位相、±200ms、音楽/声の音量を比較できる。
「試聴WAVを作る」で同じ予約処理をOfflineAudioContextへ出力し、声のみも語別チャンネルで別レンダーして発声位置を5ms窓で測る（前の語の余韻を誤検出しないため）。
「保存する」で曲と声を重ねたWAVを保存できる。利用権確認前はローカル試聴用とする。

```sh
node --test tools/music-probe/timeline.test.js
npm test
```

## 境界

- サーバーは127.0.0.1だけで待受、指定原本のSHA256を解析結果と照合。
- WAVは最大40秒ずつffmpegで切り出す。ブラウザは32秒だけdecodeする。
- 既存の `compileRhythm`・`beatMapTempo`・`scheduleVoiceEvent`・標準音声を使う。
- `timeline.js`/`lab.js` は実験用adapter。既存 `PracticeAudioEngine` のbeatMap非対応を解除していない。
- 一定BPM比較にも同じtempo-mapを使用。音楽は伸縮せず、声と表示だけを拍時刻へ合わせる。
- 拍位置は機械推定、小節頭は仮。beat-mapを使っても誤検出を正解にはできない。
- 拍表の外へ音声を外挿しない。今回末尾約14秒は拍未検出のため全曲再生の完成検証には使えない。
- 課金、購入復元、先生の声、ルーティン、速度変更、iPhone実機、全曲・ループは未実装/未検証。

設計: `docs/superpowers/specs/2026-10-23-paid-music-count-design.md`。
測定と試聴評価: `docs/app-v1/music-probe-2026-10-23.md`。

## 波形から拍・小節頭を解析する制作工程（2026-10-23追加）

上のlibrosa比較labは履歴として保持。現在の音楽アプリは、偶数点を拾う方式から以下へ変更。

```sh
python3 -m venv /tmp/dc-waveform-bars-venv
/tmp/dc-waveform-bars-venv/bin/pip install -r tools/music-probe/requirements-bars.txt
/tmp/dc-waveform-bars-venv/bin/python tools/music-probe/analyze-bars.py '/Users/usausagi/Downloads/Paper Umbrella.wav'
VITE_MUSIC_PREVIEW=1 npm run dev -- --host 127.0.0.1 --port 5195
```

- 確認画面: `http://127.0.0.1:5195/__music/review`。全体波形と要確認区間、2小節ずつの拍・小節頭・1〜4・現在位置を見ながら同じ再生エンジンで聞ける。
- 解析はFFmpegでdecoded先頭を時刻0として読み、log-melスペクトログラムを[Beat This!](https://github.com/CPJKU/beat_this)へ渡す。拍と小節頭を同時推定し、4拍ずつ・間隔・モデル活性の弱さを検査。4拍でないところを自動的に間引いて帳尻を合わせない。
- 原曲は外部へ送らない。初回だけMIT配布モデルを取得し、SHA256を固定検証する。公式hostが503の場合は同一hashのmirrorを使う。MPS対応MacではローカルGPU、`--device cpu`でCPUも選べる。
- 出力は`output/music-probe/bar-analysis.json`（波形min/max、拍、小節頭、候補／要確認、モデルversion・hash）。旧結果は`bar-analysis-history/`へ保全。元WAV・従来`analysis.json`は上書きしない。
- producer更新をdev serverが検出すると、新しい拍地図へ再読込する。使える6小節がない場合は曲の再生を開放せず、波形確認画面で理由を示す。
- 練習アプリとWAVは同じ拍地図・区間ごとの小節anchorを使用。未検出の末尾は外挿しない。モデル活性は正解確率ではなく、人の音楽審査を済ませた扱いにはしない。

別の曲は`--output output/music-probe/<別名>`で別の場所へ解析する。`--checkpoint output/music-probe/models/final0.ckpt`を指定すれば既存の検証済みモデルを共有できる。音源が改名中なら、内容hashで命名したローカルcopyを解析すると原本を変えずに再現できる。曲名・種目・販売カタログの登録は別工程。

```sh
/tmp/dc-waveform-bars-venv/bin/python -m unittest discover -s tools/music-probe -p 'test_bar_analysis.py'
npm run smoke:music:waveform
npm run smoke:music
/tmp/dc-music-analysis-venv/bin/python tools/music-probe/verify-exports.py
```

Python／Torchの実行環境は`requirements-bars.txt`。現在の実測・バックアップ・残る確認は`docs/app-v1/music-waveform-bars-2026-10-23.md`。

3拍子の曲を調べる場合は`--beats-per-bar 3`を指定する（既定は4拍子）。期待した拍数と違う区間は、拍を増減させず要確認へ回す。現在のPaper Umbrella用preview adapterは4拍子候補だけを受け取る。

## 提供曲をまとめて実験する

```sh
/tmp/dc-waveform-bars-venv/bin/python tools/music-probe/analyze-library.py music
```

`Waltz_`・`Rumba_`・`chacha_`・`Tango_`で始まる提供ファイルを読み、ワルツは3拍子、残りは4拍子として解析。名前はひちゃんの指定の識別に使い、ジャンルを音楽的に認定した扱いにはしない。内容hashのsnapshotと解析を作り、最後に`library-index.json`をatomic更新する。原本の改名に影響されず、失敗途中のcatalogを公開しない。

開発serverは、このindexの更新で実験用カタログを再読込する。現在はPaper Umbrellaと提供曲。波形画面上部の「曲を選ぶ」で切替でき、通常の「使う→音楽に合わせて練習」からも試せる。波形の2小節表示はワルツなら6拍、タンゴ／ルンバ／チャチャチャなら8拍。「&」はチャチャチャの拍の間に置く。安定区間は曲の長さの10%・45%・75%付近から選び、6小節続かない曲を無理に登録しない。

```sh
npm run smoke:music:library
```
