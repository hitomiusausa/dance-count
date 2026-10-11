# Dance Count for Ballroom

初心者向けの社交ダンス・カウント練習アプリです。Google Cloud TTSで事前生成した音声を、Web Audioの共通タイムライン上でメトロノームと同期して再生します。

現在の実装状況、検証値、未解決事項、次回の作業順は [`HANDOFF.md`](./HANDOFF.md) にまとめています。

## 起動

```bash
cd "/Users/usausagi/Documents/AI_Playground/Dance Count for Ballroom"
npm install
npm run dev
```

ブラウザで <http://localhost:5173> を開きます（新アプリ。段1時点は下タブと空画面だけ）。

旧画面（開発用・公開しない）は `npm run legacy` で <http://localhost:4173/legacy/practice.html> から開けます。

## テスト

```bash
npm test
```

移設前との一致は `npm run timing:audit && npm run timing:compare` で確かめます。

## 音声素材

認証とGoogle Cloud Text-to-Speech APIの設定後、生成と発声開始位置の自動測定をまとめて実行できます。

```bash
npm run voices:build
```

個別のタイミングを耳で確認するときは `npm run legacy` のあと <http://localhost:4173/legacy/voice-calibration.html> を開きます。

10種目の全原子カウント遷移、登録テンプレート、移行済みルーティン、標準音声の実波形をまとめて監査できます。

```bash
npm run timing:audit
```

詳細結果は `output/all-dance-timing-audit.json` に保存されます。
