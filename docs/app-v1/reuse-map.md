# src/v2 再利用マップ（2026-10-11 調査・読み取りのみ）

ビルド工程なし（`python3 -m http.server`）。`npm test` = `node --test test/v2/*.test.js`（22ファイル・test約89個）。

## 純粋モジュール（DOM・ストレージ・音声APIに触れない）
- `dance-profiles.js`: TICKS_PER_BEAT=960、DANCE_PROFILES(10種目)。**種目名が日本語固定**
- `rhythm-parser.js` / `rhythm-compiler.js`（整数tickタイムライン）/ `practice-range.js` / `timeline-view-model.js`
- `onset-detector.js`（AudioBufferは読むだけ）/ `localization.js`（Intlのみ）/ `count-vocabularies.js`（en, ja-JP）/ `ui-messages.js`
- `routine-draft.js`（storage注入式）/ `routine-editor-state.js`（undo/redo）/ `routine-editor-order.js`
- `figure-catalog.js` / `figure-terminology.js` / `routine-provenance.js` / `routine-review-workspace.js` / `legacy-routine-migration.js` / `dance-timing-audit.js`

## ブラウザ依存（再利用可）
- `audio-engine.js`: PracticeAudioEngine。AudioContextは注入
- `voice-pack-loader.js`: fetch注入可・decodeAudioData
- `recording-normalizer.js`: 録音の正規化・WAVエンコード
- `recorded-voice-pack.js`: 作成・検証・書き出し・読み込み。**書き出しJSONは音声をbase64埋め込み**（各語 mimeType, onsetMs, gainDb, normalized, sourceOnsetMs, durationMs, dataBase64）
- `recorded-voice-store.js`: IndexedDB（DB `dance-count-v2` / store `voice-packs`）。エラー文言日本語固定

## 画面（作り直し対象）
- `public/practice.html` 619行（inline module 約465）/ `routine-editor.html` 1042行（約790）/ `voice-recorder.html` 437行（約350）
- practice.html にジャイブとチャチャチャの特定カウント文字列のハードコードあり（約490行付近）

## 音声
- 同梱は英語1パックのみ: `public/audio/default-en-female-v1/`（12語wav＋manifest schemaVersion 2、words.<key>.onsetMs 等、en-US-Neural2-F）
- **日本語の標準音声は無い**（日本語は録音パック `user-recorded-ja-v1` のみ）
- 録音パック形式: `{schemaVersion:1, type:"dance-count-recorded-voice-pack", id, name, locale, vocabularyId, updatedAt, words:{key:{blob,onsetMs,gainDb,normalized,sourceOnsetMs,durationMs}}}` 12語必須

## ルーティン
- `{id, danceId, name, bpm|null, countInBars, source, status, figures:[{id,name,counts}]}`、counts は文字列（例 "123a45a6"）
- 下書きは localStorage `dance-count-v2-routine-draft:<routineId>`
- provenance: sourceKind(legacy-import/reviewed-preset/user-created), authority, authorityClaimStatus, reviewStatus
- **フィガー候補カタログは未検証の旧データ由来**（legacy-routines-report.json: 25ルーティン/317フィガー、全件 unverified/unreviewed）。terminology の verified は日英名対応だけでカウント列の検証ではない

## テストのHTML依存
- `html-module-syntax.test.js`（7ページのinline module構文チェック）、`ui-assets.test.js`（ui.css・icons.svg・?v=一致）

## 移設時の罠
- 相対パス固定（`./audio/...`、`../src/v2/data/...`）
- **src/v2内部のimportにも `?v=` キャッシュバスター**（二重インスタンス化の恐れ）
- fetch が全て `cache:'no-store'`（Service Workerと衝突）
- iOS音声アンロック専用処理なし（再生ハンドラ内でAudioContext生成＋resumeのみ）
- window / navigator.language / localStorage を各HTMLが直接参照
- 日本語固定文言: recorded-voice-store/pack のError、routine-editor-state の「（コピー）」、dance-profiles の種目名
