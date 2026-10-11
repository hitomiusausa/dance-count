# アプリ化 v1 — 引き継ぎ（HANDOVER）

更新: 2026-10-11（段2完了・ひとみうさの iPhone 確認 OK）
ブランチ: `agent/app-v1`（段2の最終コミットは `git log` 参照）。**main 未マージ・未 push**（ひとみうさの判断で、段2〜8もこのブランチで続け、公開直前にまとめる）

---

## 0. 次のセッションで最初にやること

1. このファイルを読む
2. `docs/app-v1/stage2-ledger.md` の「持ち越し」と「Ruling」を読む（段3の計画に拾う項目がある）
3. （済）2026-10-11 ひとみうさが iPhone で段2を確認し「いい感じ」。確認は Mac の開発サーバー（http・同じ Wi‑Fi）経由なので、WakeLock とマナーモード（audioSession）は https で効く可能性があり、**段7（ホーム画面追加・https）で改めて確認**する
4. **段3（ルーティン S3〜S5）の詳細計画を書く** → `docs/superpowers/plans/2026-10-11-app-v1-stage3.md`
   - 書き手: Opus（superpowers:writing-plans）。全体地図 `docs/superpowers/plans/2026-10-11-app-v1-master.md` の「段の一覧」「段をまたぐ持ち越し」「人が必要な確認点」と、下の §5 を必ず拾う
   - 計画の手順は、スクラッチのコピーで実際に動かして確かめてから書く（段1・2と同じやり方）
5. ひとみうさに計画を見せて OK をもらう → superpowers:subagent-driven-development で実装

## 1. 読む順番

| 順 | ファイル | 中身 |
|---|---|---|
| 1 | `docs/app-v1/HANDOVER.md` | これ |
| 2 | `docs/app-v1/rulings.md` | 裁定台帳（Ruling 1〜25）と **ひとみうさの決定 D1〜D9** |
| 3 | `docs/superpowers/specs/2026-10-11-app-v1-design.md` | 承認済み仕様（§3 画面と導線・§4 画面ごと・§5 デザイン・§6 高齢者向け数値基準・§13 段・§14 検証） |
| 4 | `docs/superpowers/plans/2026-10-11-app-v1-master.md` | 全体地図（段1〜8・担当モデル・人の確認点・持ち越し表） |
| 5 | `docs/app-v1/stage1-ledger.md` | 段1の作業台帳（裁定・持ち越し・修正の記録） |
| 参考 | `docs/app-v1/mockups/b-studio-navy.html` | 採用した見た目（B Studio Navy）のモック |
| 参考 | `docs/app-v1/music-sources.md` | 第2弾「曲＋カウント」の音源調査 |
| 参考 | `HANDOFF.md`・`AGENTS.md` | プロジェクト全体の歴史と作業ルール |

## 2. ひとみうさの決定（要約。正本は rulings.md）

- 形: まず PWA → 後でストア（Capacitor 等）
- 中身: 10種目の**基本カウント**＋**自分で入れるルーティン**。未監修の旧ルーティンは公開しない
- 目玉: **先生が12語を録音 → ファイルで生徒へ配る**（サーバーなし。リンク共有は後で）。ホームに「先生の声で練習」カード（D1）
- 名前: **Dance Count — for Ballroom**（D2）／見た目: **B「Studio Navy」**（D8）
- 声の初期値: 日本語UIでも英語カウント（D3）。先生の録音言語は録音の最初に選ぶ（Ruling 25）
- 公開先: **dancemap.jp のサブドメイン**（例 count.dancemap.jp）。DNS・配信基盤の設定は**公開直前に改めて許可**（D4）
- 運営: くうが株式会社（D5）／問い合わせ先: **info@kugainc.com**（D9）
- 曲＋カウント: **第2弾**。v1 は tempo-map の口だけ（D7）
- 日英・無料

## 3. 段の進み具合

| 段 | 内容 | 状態 |
|---|---|---|
| 0 | 見た目の決定 | 完了（D8） |
| 1 | 器（エンジン移設・tempo-map・legacy 退避・Vite+Preact+TS の殻） | **完了 2026-10-11** |
| 2 | 生徒の再生（S1・S2）・iOS 音声解除・WakeLock・ui:check 移植 | **完了 2026-10-11（iPhone 確認 OK）** |
| 3 | ルーティン（S3〜S5） | **次**（実機確認の結果しだい） |
| 4 | 声（S7・S8 録音） | 未着手 |
| 5 | 配る・受け取る（S9・S10） | 未着手 |
| 6 | 日本語標準音声（TTS生成・実測・聴感ゲート） | 未着手（段2〜5と並列可） |
| 7 | PWA（オフライン・更新・インストール） | 未着手 |
| 8 | 仕上げ（文言監修・法務・エラー・アクセシビリティ） | 未着手 |

段2→3→4→5 は**逐次**（同じ `App.tsx`・`messages.ts` を触るため）。並列は段6だけ。

## 4. 段1でできたもの（現物）

- `src/engine/` … 旧 `src/v2/` を無改変で移設。tick↔時刻は **`src/engine/tempo-map.js` だけ**（例外: 検算用の `tools/audit-all-dance-timing.js` と開発用 `tools/render-subdivision-audio-review.js`）
- `src/app/` … Vite 8.3.4・Preact 10.29.8・TypeScript 6.0.3。i18n（日英）・ハッシュルーター（純粋関数）・platform アダプタ（hash/locale は実装、音声・録音・保存・ファイル・WakeLock は「未実装」を投げる空実装）・下タブ3つの空画面
- `legacy/` … 旧画面（保守停止）。標準音声は `public/audio/default-en-female-v1/` のまま
- テスト 224件（段2で 154 → 224。段1時点は 154件。`npm test` は `test/**/*.test.{js,ts}` を再帰で実行。`.tsx` のテストは Node の型除去で動かないので書かない — メタテストが検出して落とす）

### 番人（壊したら自動で止まるもの）

| 番人 | 守っているもの |
|---|---|
| `test/engine/engine-schedule.test.js`＋ゴールデン | 再生エンジンが予約する全時刻がビット単位で移設前と一致 |
| `npm run timing:compare` | `timing:audit` の出力が基準（`output/timing-audit-before.json`）と一致 |
| `tools/check-dist.js`（`npm run build` で実行） | 公開ビルドに legacy/・未監修ルーティンデータが入らない |
| `test/app/platform-boundary.test.ts` | window/navigator/storage/AudioContext 等は `src/app/platform/` からだけ |
| `test/meta/test-glob.test.js` | テストファイルが `npm test` から漏れない |
| `tools/smoke-app-shell.js` | 375/1280 × 日英で殻が動く・旧画面の標準音声13ファイルが 200 |
| `npm run ui:check`（`tools/check-app-ui.js`） | 新アプリの U1〜U15（文字・タップ・主要操作数・コントラスト・動き・折り返し等）を S1/S2/S3/S6/S7/S11 × 375/1280 で検査（dev も preview ビルドも 41項目 PASS） |
| `npm run smoke:practice` | G1（初回2タップで鳴る）・G2（前回カード1タップで鳴る）・再読み込みで勝手に鳴らない・戻るの置き換え |

**ゴールデンと基準は書き換え禁止**。作り直すのは rulings.md に理由と差分の要約を書いた時だけ。

## 5. 段3以降への持ち越し（段2から）

1. `src/engine/recorded-voice-store.js` の IndexedDB v1 直開きを `platform/storage`（`openAppStorage()`・`put(store, value)`）経由に作り直す（段2で DB は v2 になった。新アプリから呼ぶと `VersionError`）。
2. `dance-count-v2-routine-draft:*` の localStorage 移行（段2は表示言語だけ移行済み）。
3. App の `SIMPLE_SCREENS` に S3〜S5 を足す時は `resolveScreen` に S4/S5 の ID 検査を足す（S2 と同じ形）。
4. `PracticeScreen` を S5 で再利用するか分けるかは段3の計画で決める（`[data-alert]` の1枠・`PracticeSession` はそのまま使える。範囲再生は `start()` の `rangeStartTick/rangeEndTick` を `PracticeOptions` に足す）。
5. 「くわしく」の主要操作は段4で 9（上限ちょうど）。以後の追加は裁定が要る（Ruling 31）。
6. 段4で `selectedVoiceId` を保存する時は、`normalizeSettings` が標準音声へ戻す処理を緩める。
7. S2 の連打で change/toggle が古い settings を使う小さな穴（保存は正しい）。
8. 前回カードの即再生は iPhone 実機で要確認（解除はタップ内、再生開始はマウント後）。

段3で必ず（段1から持ち越し・未消化）: ルーティンID生成で `'new'` を予約語に。check-dist に「src/engine/data/ の全JSONに目印があるか」の自己検査。

第2弾（曲）で必ず: 再生エンジンは tempo を「拍の長さ」「区間の長さ」「区間ローカルtick」として使っている。beatMap では誤るので「絶対tickの位置の差」で作り直す（今は `start()` が constant 以外を拒否して守っている）。一定テンポの経路は今の式のまま残すこと（変えるとゴールデンが落ちる）。

（段1から持ち越した段2の項目 — 境界テスト強化・html lang/title・`?ui-state=no-sound`・PC 上部タブ/S2 2領域・タブアイコン・戻る・ui:check 移植 — は段2で消化済み。詳細は `stage2-ledger.md`。）

## 6. 人が必要な確認点（ひとみうさ）

- **段2の終わり（済 2026-10-11・「いい感じ」）**: `docs/app-v1/stage2-device-check.md` の表を iPhone 実機で（http 経由。WakeLock・マナーモードは段7の https で再確認）。マナーモードで ▶ が鳴る／音が出ない時だけ警告が出る／ロック復帰／画面が消えない（WakeLock）／AirPods でずれない／前回カード1タップ。あわせて見た目がモック B どおりか
- **段6**: 日本語標準音声の試聴（聴感ゲート）
- **公開前**: dancemap.jp のサブドメイン・配信基盤（DNS 設定）の許可
- 可能なら 60〜70代の方に説明なしで触ってもらう

## 7. 編成（このプロジェクトで回した型）

- **Fable** = 設計と裁定だけ（`rulings.md` に `Ruling N: 決定 — 理由 — 外れた時の代償`）
- **Opus（く！ちゃん）** = 采配・計画書・危険な段（エンジン・音声・統合）・最終レビュー
- **Sonnet** = 資料まとめ・完全コードのある段の実装・各タスクのレビュー
- superpowers:subagent-driven-development: タスクごとに brief → 実装 → 別エージェントのレビュー → 修正便 → 差分の再レビュー。台帳は `.superpowers/sdd/<計画名>/progress.md`（終わったら `docs/app-v1/stageN-ledger.md` に保存してから消す）
- 段1の実績: 11タスク・修正便5回（すべて1回で解決）・最終レビューで「閉じる前に直す」2点＋安い守り3点を1便で修正

## 8. 起動と確認

```bash
cd "/Users/usausagi/Documents/AI_Playground/Dance Count for Ballroom"
npm run dev        # 新アプリ http://localhost:5173
npm run legacy     # 旧画面 http://localhost:4173/legacy/practice.html
npm test           # 224件
npm run typecheck
npm run build      # check-dist まで走る
npm run timing:audit && npm run -s timing:compare
npm run ui:check          # dev 起動中に（DC_BASE_URL=http://localhost:4174/ で preview ビルドにも）
npm run ui:check:legacy   # 旧画面用（legacy を 4173 で起動してから）
npm run smoke:practice    # G1・G2（dev 起動中に）
node tools/smoke-app-shell.js   # dev と legacy を起動してから（DC_SHOT_DIR で撮影先を変更可）
git checkout -- output    # timing:audit の後は必ず
```

## 9. 落とし穴

- 未追跡の `フィガー/`（写真資料）がある。**`git add -A` / `git add .` 禁止**、パスを指定して add
- `timing:audit` は `output/all-dance-timing-audit.json` を書き換える。確認後は `git checkout -- output` で戻す
- Playwright のスクショは `~/.playwright-mcp/` に置く（スクラッチは許可外）。終わったら自動操作ブラウザを閉じる
- 冷えた開発サーバーで Preact の読み込みが途中で再最適化される問題は `vite.config.ts` の `optimizeDeps.include` で解決済み。設定を消さないこと
- 4173番には古い `python3 -m http.server` が居座っていることがある（プロジェクト直下を配信していれば `npm run legacy` の代わりにそのまま使える）
- `constantTempo` は `'84'` のような文字列も受け付けて `.bpm` が文字列のまま残る。段2の再生画面では必ず数値を渡す

## 10. このアプリとは別件（参考）

- **dancemap.jp の Cloudflare Pages への引っ越し**: 別セッションで落ち着いてやる方針。ドメインはさくらの単独契約なのでサーバー解約後も使える。メール（MX がさくら向き）と同じアカウントの別ドメインの同居を先に確認。詳細はく！ちゃんのメモ（全国ダンスマップ）
- **第2弾の音源**: Incompetech（CC BY 4.0・表記必須）が最も明快。Pixabay はアプリ同梱が規約上グレーで要問い合わせ。ウィンナワルツ・クイックステップは合う曲が少なそう
