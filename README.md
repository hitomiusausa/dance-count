# Dance Count for Ballroom

初心者向けの社交ダンス・カウント練習アプリです。Google Cloud TTSで事前生成した音声を、Web Audioの共通タイムライン上でメトロノームと同期して再生します。

現在の実装状況、検証値、未解決事項、次回の作業順は [`HANDOFF.md`](./HANDOFF.md) にまとめています。

## 起動

```bash
cd "/Users/usausagi/Documents/Playground/Dance Count for Ballroom"
npm start
```

ブラウザで <http://localhost:4173> を開きます。

## テスト

```bash
npm test
```

## 音声素材

認証とGoogle Cloud Text-to-Speech APIの設定後、生成と発声開始位置の自動測定をまとめて実行できます。

```bash
npm run voices:build
```

個別のタイミングを耳で確認するときは <http://localhost:4173/public/voice-calibration.html> を開きます。

10種目の全原子カウント遷移、登録テンプレート、移行済みルーティン、標準音声の実波形をまとめて監査できます。

```bash
npm run timing:audit
```

詳細結果は `output/all-dance-timing-audit.json` に保存されます。
