# アプリ化 v1 — 引き継ぎ（HANDOVER）

更新: 2026-10-11（段3 完了（実装・レビュー）— ひとみうさの実機確認待ち）
ブランチ: `agent/app-v1`（段3の最終コミットは `git log` 参照）。**main 未マージ・未 push**（ひとみうさの判断で、段4〜8もこのブランチで続け、公開直前にまとめる）

---

## 0. 次のセッションで最初にやること

1. このファイルを読む
2. **段3の実機確認**（`docs/app-v1/stage3-device-check.md` の15項目。ひとみうさの iPhone・Mac の開発サーバーに同じ Wi‑Fi で。事前に見られる全スクロールの画像は表の上に一覧）→ OK なら **段4（声 S7・S8 録音）の詳細計画**を書く
   - 書き手: Opus（superpowers:writing-plans）。全体地図の「段の一覧」「段をまたぐ持ち越し」「人が必要な確認点」と、下の §5 を必ず拾う
   - 計画の手順は、スクラッチのコピーで実際に動かして確かめてから書く（段1〜3と同じやり方）
3. `docs/app-v1/stage3-ledger.md` の「持ち越し」「Ruling」を読む
4. 実機で直しが出たら小さな修正便で。ひとみうさに計画を見せて OK をもらってから superpowers:subagent-driven-development で実装

## 1. 読む順番

| 順 | ファイル | 中身 |
|---|---|---|
| 1 | `docs/app-v1/HANDOVER.md` | これ |
| 2 | `docs/app-v1/rulings.md` | 裁定台帳（Ruling 1〜49）と **ひとみうさの決定 D1〜D12** |
| 3 | `docs/superpowers/specs/2026-10-11-app-v1-design.md` | 承認済み仕様（§3 画面と導線・§4 画面ごと・§5 デザイン・§6 高齢者向け数値基準・§13 段・§14 検証） |
| 4 | `docs/superpowers/plans/2026-10-11-app-v1-master.md` | 全体地図（段1〜8・担当モデル・人の確認点・持ち越し表） |
| 5 | `docs/app-v1/stage1-ledger.md` | 段1の作業台帳（裁定・持ち越し・修正の記録） |
| 5b | `docs/app-v1/stage3-ledger.md` | 段3の作業台帳（SDD の台帳。タスクごとの結果・修正便・持ち越し） |
| 5c | `docs/superpowers/plans/2026-10-11-app-v1-stage3.md` | 段3の詳細計画（実装済み。段4の計画の見本） |
| 5d | `docs/app-v1/stage3-device-check.md` | 段3の実機確認表（15項目）と撮影済みの画像の一覧 |
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
| 3 | ルーティン（S3〜S5） | **完了（実装・レビュー）2026-10-11 — 実機確認待ち**（`stage3-device-check.md`） |
| 4 | 声（S7・S8 録音） | **次**（段3の実機確認の後。詳細計画から） |
| 5 | 配る・受け取る（S9・S10） | 未着手 |
| 6 | 日本語標準音声（TTS生成・実測・聴感ゲート） | 未着手（段2〜5と並列可） |
| 7 | PWA（オフライン・更新・インストール） | 未着手 |
| 8 | 仕上げ（文言監修・法務・エラー・アクセシビリティ） | 未着手 |

段2→3→4→5 は**逐次**（同じ `App.tsx`・`messages.ts` を触るため）。並列は段6だけ。

## 4. 段1でできたもの（現物）

- `src/engine/` … 旧 `src/v2/` を無改変で移設。tick↔時刻は **`src/engine/tempo-map.js` だけ**（例外: 検算用の `tools/audit-all-dance-timing.js` と開発用 `tools/render-subdivision-audio-review.js`）
- `src/app/` … Vite 8.3.4・Preact 10.29.8・TypeScript 6.0.3。i18n（日英）・ハッシュルーター（純粋関数）・platform アダプタ（hash/locale は実装、音声・録音・保存・ファイル・WakeLock は「未実装」を投げる空実装）・下タブ3つの空画面
- `legacy/` … 旧画面（保守停止）。標準音声は `public/audio/default-en-female-v1/` のまま
- テスト 292件（段3で 224 → 292。段3の最終レビューの修正便で +1。段2で 154 → 224。段1時点は 154件。`npm test` は `test/**/*.test.{js,ts}` を再帰で実行。`.tsx` のテストは Node の型除去で動かないので書かない — メタテストが検出して落とす）

### 番人（壊したら自動で止まるもの）

| 番人 | 守っているもの |
|---|---|
| `test/engine/engine-schedule.test.js`＋ゴールデン | 再生エンジンが予約する全時刻がビット単位で移設前と一致 |
| `npm run timing:compare` | `timing:audit` の出力が基準（`output/timing-audit-before.json`）と一致 |
| `tools/check-dist.js`（`npm run build` で実行） | 公開ビルドに legacy/・未監修ルーティンデータが入らない |
| `test/app/platform-boundary.test.ts` | window/navigator/storage/AudioContext 等は `src/app/platform/` からだけ |
| `test/meta/test-glob.test.js` | テストファイルが `npm test` から漏れない |
| `tools/smoke-app-shell.js` | 375/1280 × 日英で殻が動く・旧画面の標準音声13ファイルが 200 |
| `npm run ui:check`（`tools/check-app-ui.js`） | 新アプリの U1〜U15（文字・タップ・主要操作数・コントラスト・動き・折り返し等）を S1〜S5/S6/S7/S11 × 375/1280 で検査（dev も preview ビルドも 93項目 PASS。段2時点は 41項目） |
| `npm run smoke:practice` | G1（初回2タップで鳴る）・G2（前回カード1タップで鳴る）・再読み込みで勝手に鳴らない・戻るの置き換え |

**ゴールデンと基準は書き換え禁止**。作り直すのは rulings.md に理由と差分の要約を書いた時だけ。

## 4b. 段3でできたもの（現物）

- **S3 ルーティン一覧**（作成順・行を開いて ▶ 再生／編集／削除・削除は確認つき）・**S4 編集**（種目選択 → 0件 → フィガー追加・行を開いて「決定」・元に戻す／やり直す・「上へ」「下へ」＋**⠿ のドラッグ**・全体を試聴・不正カウントは赤枠と理由の1行で「追加する」が押せない）・**S5 ルーティン再生**（S2 と別画面。速さ・メトロノーム・はじめの合図・声・▶、「くわしく」で範囲（はじめ／おわり）・繰り返し）。保存は IndexedDB（`dance-count-v2` v2 の `routines`）。
- 決定: Ruling 35〜49、D10（鳴っている行は琥珀のうす塗り `#FBEBDD`）、D11（ドラッグを入れる）、D12（つかみは ⠿ のアイコンだけ）。正本は `rulings.md`。
- テスト **292件**（段2の 224 から。段3の Task 7 の修正便で +3・最終レビューの修正便で +1）。`npm run ui:check` は **93 PASS**（dev と公開ビルドの両方）。S3＝1/3・S4＝1/3/5/7/7・S5＝5/8、S5 の余裕 8px 以上。
- 新しい道具: `npm run smoke:routines`（名前だけ打って戻る → 一覧に戻り名前が残る → 作成 → 保存 → 再読み込みで残る → 不正カウントを止める → ドラッグ → 再生 → 削除）。`DC_ONLY=<状態名の頭>`（例 `DC_ONLY=S5`）で `ui:check` を絞れる。検査用ルーティンは `tools/ui-check-routines.js`（ui:check と smoke が共有）。
- 実行中に**レビューが見つけた本物のバグ**（すべて修正済み）:
  - Task 7: 0件で「追加」の行を開いたまま「変える」すると、前の種目でフィガーが入り種目も変わる → 先に閉じ、フィガーができたら種目は変えない。
  - Task 9: 新規で最初のフィガーを打って「追加する」を押さずに戻ると編集画面に戻される → 離れる時の保存はハッシュを置き換えない。ドラッグ中の Esc で行が開く → 開かない。
  - Task 10: 一覧を見ながら再生すると、鳴っている行が ▶ の帯に隠れる → `scroll-margin`。

## 5. 段4以降への持ち越し（段3から。段2からの残りは 5b）

段4:
- `src/engine/recorded-voice-store.js` の IndexedDB v1 直開きを `platform/storage` 経由に作り直す（Ruling 41。DB は v2 なので新アプリから呼ぶと `VersionError`）。
- 「くわしく」に声のタイミングを足す（S2・S5 とも主要操作が 9 になる。上限ちょうど）。S4 の「くわしく」にも声のタイミング（7→8）。
- `selectedVoiceId` の保存（`normalizeSettings` が標準音声へ戻す処理を緩める）。

段5:
- S3 の開いた行に「配る」。S4 の初回保存時のバックアップの1行（`hints.backupTipShownForRoutine`）。
- `provenance.sourceKind:'received'` の列挙を `routine-provenance.js` に足す。受け取ったルーティンを編集できるかの裁定。

段7:
- 書き込みの確定前にアプリを閉じると失われうる（発見 #8）。PWA 化の時に `visibilitychange: hidden` で開いている行を確定する案を検討（今は戻る・画面を離れる時だけ確定）。

## 5b. 段2から残っている持ち越し

段3で消化済み: `SIMPLE_SCREENS` と S4/S5 の ID 検査（`resolveScreen`）・`PracticeScreen` と S5 を分ける（Ruling 42）・S2 連打の穴・ルーティンIDの `'new'` 予約・check-dist の `src/engine/data/` 目印の自己検査・`dance-count-v2-routine-draft:*` の移行（不要で閉じた）。

まだ残る:
- 「くわしく」の主要操作は段4で 9（上限ちょうど）。以後の追加は裁定が要る（Ruling 31）。
- 前回カードの即再生は iPhone 実機で要確認（段2の確認は「いい感じ」。段7の https で再確認）。

第2弾（曲）で必ず: 再生エンジンは tempo を「拍の長さ」「区間の長さ」「区間ローカルtick」として使っている。beatMap では誤るので「絶対tickの位置の差」で作り直す（今は `start()` が constant 以外を拒否して守っている）。一定テンポの経路は今の式のまま残すこと（変えるとゴールデンが落ちる）。

（段1から持ち越した段2の項目 — 境界テスト強化・html lang/title・`?ui-state=no-sound`・PC 上部タブ/S2 2領域・タブアイコン・戻る・ui:check 移植 — は段2で消化済み。詳細は `stage2-ledger.md`。）

## 6. 人が必要な確認点（ひとみうさ）

- **段2の終わり（済 2026-10-11・「いい感じ」）**: `docs/app-v1/stage2-device-check.md` の表を iPhone 実機で（http 経由。WakeLock・マナーモードは段7の https で再確認）。マナーモードで ▶ が鳴る／音が出ない時だけ警告が出る／ロック復帰／画面が消えない（WakeLock）／AirPods でずれない／前回カード1タップ。あわせて見た目がモック B どおりか
- **段3の終わり（実機確認待ち）**: `docs/app-v1/stage3-device-check.md` の15項目を iPhone・Mac で（⠿ のドラッグは指でしか確かめられない 11〜15 が要。Ruling 49・D12）。あわせて S5 が iOS の書体の高さで崩れないか（7）
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
npm test           # 292件
npm run typecheck
npm run build      # check-dist まで走る
npm run timing:audit && npm run -s timing:compare
npm run ui:check          # dev 起動中に（DC_BASE_URL=http://localhost:4174/ で preview ビルドにも）
npm run ui:check:legacy   # 旧画面用（legacy を 4173 で起動してから）
npm run smoke:practice    # G1・G2（dev 起動中に）
npm run smoke:routines    # 段3の完了条件（dev 起動中に）
DC_ONLY=S5 npm run ui:check   # ui:check を状態名の頭で絞る
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
