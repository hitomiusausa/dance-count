# 社交ダンス カウント練習ツール 設計書
_dance-count-B.html_

最終更新: 2026-03-13

---

## 概要
社交ダンスのフィガー（ステップ名）とカウント（S/Q/&/a/数字）を入力し、BPMに合わせてカウント音声とメトロノームを再生する練習ツール。

---

## カウント体系

| 記号 | 名前 | 拍数（標準） | 拍数（サンバ） |
|------|------|------------|--------------|
| S | スロー | 2拍 | **1拍** |
| Q | クイック | 1拍 | **0.5拍** |
| & | アンド | 0.5拍 | 0.5拍 |
| a | ア | 0.25拍 | 0.25拍 |
| @ | 休符 | 1拍（無音） | 1拍（無音） |
| 1〜9 | 数字 | 1拍 | 1拍 |

### サンバのS/Q特例
- サンバは2/4拍子で1小節=2拍
- **S=1拍、Q=0.5拍**（他種目の半分スケール・Walter Laird公式）
- `SQQ` = 1+0.5+0.5 = **2拍（1小節）** ✓

### `&` の扱い
- `&` は前の拍から0.5拍を借りる（例：`Q&` = 合計1拍）
- 小節分割では `&` は `used` を増やさない（`toMeasures`）
- 次の文字が `&` のとき、前の拍で小節を閉じない

### `a` の扱い（ISTD/WDC正式ビート値）
- `a` は前の拍の末尾 3/4 の位置に入る（前の拍から 1/4 拍を借りる）
- `1a2` のビート値: **3/4拍, 1/4拍, 1拍**（合計2拍＝サンバ1小節）
- `1a2a3a4` のビート値: 3/4, 1/4, 3/4, 1/4, 3/4, 1/4, 1（合計4拍）
- 次の文字が `a` のとき、前の文字は `base - 0.25拍` に短縮される
- 小節分割では `a` は `&` と同様に `used` を増やさない

```
1       a  2
|--3/4--|1/4||---1拍---|
```

### `@`（休符）
- チップ表示は `·`（中点）、色はグレー破線ボーダー
- タイミングはQと同じ1拍（無音で再生）

---

## ビート値クイックリファレンス

| パターン | 種目 | ビート値 | 合計 |
|---------|------|---------|------|
| `SS` | タンゴ | 2, 2 | 4拍 |
| `SSQQ` | タンゴ | 2, 2, 1, 1 | 6拍 |
| `Q&` | タンゴ | 0.5, 0.5 | 1拍 |
| `SQQ` | サンバ | 1, 0.5, 0.5 | 2拍 |
| `1a2` | サンバ | 0.75, 0.25, 1 | 2拍 |
| `1a2a1a2` | サンバ（ボルタ） | 0.75,0.25,0.75,0.25,0.75,0.25,1 | 4拍 |
| `234&1` | チャチャ | 1, 1, 0.5, 0.5, 1 | 4拍 |
| `2a34&1` | チャチャ | 0.75, 0.25, 1, 0.5, 0.5, 1 | 4拍 |

---

## 音声システム

### 2モード
1. **TTSモード**（デフォルト）: Web Speech API、英語女声自動選択
   - 優先順位: Samantha → Karen → Moira → Google US English → en-US系
   - rate=1.4（拍に収まる速さ）
2. **録音モード**: ユーザーが単語を録音して使用

### countToWord（カウント記号 → TTS単語）
```
S → 'slow'
Q → 'quick'
& → 'and'
a → 'ah'（「ア」の発音）
@ → '(rest)'（無音）
1〜9 → 'one','two',...,'eight'（NUM_WORDS配列）
```

### 録音グループ（REC_GROUPS）
```
S/Q系:     ['slow', 'quick']
数字系:    ['one','two','three','four','five','six','seven','eight']
アンド・ア: ['and', 'ah']
```
- 未録音の単語はTTSにフォールバック

### 録音処理
- MediaRecorder（audio/webm;codecs=opus 優先）
- 100msごとにデータ収集
- `decodeAudioData` → `trimSilence()` で冒頭無音カット（閾値0.02）

---

## スケジューリング設計

### 基本方針
**`setTimeout` は使わない（精度不足）。全音を `AudioContext.currentTime` で先読みスケジュール。**

- `SCHEDULE_AHEAD = 0.15秒` 先まで先読み
- `LOOKAHEAD_MS = 25ms` ごとにスケジューラ起動

### メトロノーム（`metroScheduler`）
```
startMetroAt(startTime)
  → metroBeatIdx=0, metroNextTime=startTime
  → metroScheduler() ループ
    while metroNextTime < ctx.currentTime + 0.15:
      tickClickAt(accent, metroNextTime)
      metroBeatIdx++; metroNextTime += beatSec
    setTimeout(metroScheduler, 25ms)
```
- **カウント音声と完全独立**（`&`/`a` の影響を受けない）
- `stopMetro()` で `clearTimeout` のみ

### カウントイン（`startCountIn`）
```
startTime = ctx.currentTime + 0.05
playStartTime = startTime + total(=beats*2) * beatSec

1. startMetroAt(startTime)  ← メトロ開始
2. カウントイン表示をsetTimeoutでスケジュール（表示のみ）
3. callbackを (playStartTime - 0.05秒) に呼び出す
```

### `getBeatSec(item)` — 最新実装

```javascript
function getBeatSec(item){
  const one=60/bpm;
  const ct=currentDance.countType;

  if(item.char==='&') return one*0.5;
  if(item.char==='a') return one*0.25;       // a = 1/4拍（常に固定）
  if(item.char==='@') return item.nextIsAnd ? one-one*0.5 : one;

  if(item.char==='S'){
    const base = ct==='samba' ? one : one*2;
    return item.nextIsA ? base-one*0.25 : base;
  }
  if(item.char==='Q'){
    const base = ct==='samba' ? one*0.5 : one;
    if(item.nextIsAnd) return base-one*0.5;
    if(item.nextIsA)   return base-one*0.25;
    return base;
  }
  // 数字カウント
  if(item.nextIsAnd) return one-one*0.5;     // 数字& = 0.5拍
  if(item.nextIsA)   return one-one*0.25;    // 数字a = 3/4拍
  return one;
}
```

### `buildSeq` のフラグ
```javascript
s.push({
  figId, fi, ci, char: c, figName: f.name,
  nextIsAnd: counts[ci+1]==='&',
  nextIsA:   counts[ci+1]==='a',
  prevIsA:   counts[ci-1]==='a'   // 現在未使用（将来のため保持）
});
```

### `playSessionId`
- `stopAll()` で `playSessionId++`
- 全setTimeoutのコールバックに `playSessionId !== sid` チェック

---

## 停止処理（`stopAll`）
```
isPlaying = false
playSessionId++
clearTimeout(playTimer, countInHandle, playSchedHandle)
speechSynthesis.cancel()
stopMetro()
clearHL()
playBtn → '▶ 再生'
```

**注意**: `audioCtx.close()` は絶対に呼ばない。

---

## 小節分割（`toMeasures`）

```javascript
function countBeats(c, nextC, prevC){
  const ct=currentDance.countType;
  if(c==='S') return ct==='samba' ? 1 : 2;
  if(c==='Q') return ct==='samba' ? 0.5 : 1;
  if(c==='&') return 0.5;
  if(c==='a') return 0.25;
  if(c==='@') return 1;
  if(nextC==='a') return 0.75;  // 数字aの前は3/4拍
  return 1;
}

for each count:
  if '&' or 'a':
    cur.push(c)        // usedを変えない
    if used >= bpm: 小節閉じ
  else:
    if used + beats > bpm && cur.length > 0: 小節閉じ
    cur.push(c); used += beats
    if used >= bpm && next !== '&' && next !== 'a': 小節閉じ
```

---

## UI構造

- **コントロールバー**: DANCE選択 / ROUTINE名表示（インライン編集可） / TIME SIG / BPM
- **フィガーテーブル**: ⠿ハンドル＋行番号 / フィガー名 / 小節ブロック / カウント入力 / ⧉複製 / ✕削除
- **フィガー追加エリア**: 定番フィガー選択ドロップダウン＋「＋追加」
- **トランスポートバー**: ループ / メトロ音 / 再生 / 停止 / 現在カウント表示
- **録音パネル**: slow/quick/and/ah の録音・試聴・切り替え

---

## 種目データ（`DANCES`配列）

| 種目 | id | 拍子 | 基準BPM | countType | ボタン |
|------|----|------|---------|-----------|-------|
| ワルツ | waltz | 3/4 | 84 | waltz | 1,2,3,&,@ |
| タンゴ | tango | 4/4 | 120 | sq | S,Q,&,@ |
| ヴィエニーズワルツ | vwaltz | 3/4 | 174 | waltz | 1,2,3,&,@ |
| スローフォックス | slowfox | 4/4 | 75 | sq | S,Q,&,@ |
| クイックステップ | quickstep | 4/4 | 200 | sq | S,Q,&,@ |
| ルンバ | rumba | 4/4 | 100 | num4 | 1,2,3,4,&,@ |
| チャチャチャ | chacha | 4/4 | 128 | num4a | 1,2,3,4,&,a,@ |
| サンバ | samba | 2/4 | 100 | samba | 1,2,a,&,@ |
| パソドブレ | pasodoble | 4/4 | 120 | num8 | 1〜8,&,@ |
| ジャイブ | jive | 4/4 | 176 | num6j | 1〜6,&,@ |

---

## ルーティンデータ（`SAMPLE_ROUTINES`）

24ルーティン、302フィガー収録。くーちゃん作成ルーティン（`isGenerated:true`）はメニューに薄い点線下線で表示。
予備足（`order:0`）は先頭に 0番で表示（ワルツ1級・パソドブレ2級・スローフォックス1級に存在）。

---

## 実装済み機能一覧
- [x] S/Q/&/a/数字カウント入力・小節分割・ハイライト
- [x] AudioContextスケジューラ（メトロ・カウント音声・UI同期）
- [x] TTSモード（英語女声自動選択）
- [x] 録音モード（trimSilenceで冒頭無音カット）
- [x] カウントイン（2小節）
- [x] ループ再生
- [x] DANCE選択＋拍子・BPM自動切替
- [x] 定番フィガー選択ドロップダウン
- [x] サンプルルーティン読み込み（24件・302フィガー）
- [x] フィガー追加・削除・複製・ドラッグ並べ替え
- [x] ルーティン名のインライン編集
- [x] ユーザー定義ルーティンのlocalStorage保存・読込
- [x] テキスト/ファイルインポート
- [x] 予備足（order:0）の0番表示
- [x] `a` カウント対応（サンバ・チャチャ）
- [x] サンバのS=1拍・Q=0.5拍（ISTD正式ビート値）

## 未実装・次フェーズ
- [ ] 種目別カウント体系の追加（ジャイブ `3&4 5&6`、ルンバ `2 3 4&1` 等）
- [ ] 録音モードの種目別単語対応（数字の録音）
- [ ] 画像から未取得のルーティンデータ追加
- [ ] 要確認ルーティン（くーちゃん作成）の正確なカウント確認・修正
- [ ] スマホ向けUI最適化
- [ ] 先生の録音音声入りJSONエクスポート（Base64埋め込み）
