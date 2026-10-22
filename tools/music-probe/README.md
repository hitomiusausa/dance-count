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
