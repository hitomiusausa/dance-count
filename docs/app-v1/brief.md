# アプリ化 v1 設計ブリーフ（Fable 裁定用）

作成: 2026-10-11 / ブランチ agent/app-v1 / 事実のみ。推奨・結論は含まない。
出典: `docs/app-v1/plan.md`、`docs/app-v1/reuse-map.md`、`HANDOFF.md`、`AGENTS.md`、`globalization-architecture.md`、`docs/superpowers/specs/2026-07-15-practice-ui-redesign-design.md`、`src/v2/dance-profiles.js`、`src/v2/count-vocabularies.js`、`public/practice.html`、`public/voice-recorder.html`

## 1. 目的と合意済み前提

目的（plan.md Context）: 社交ダンスのカウント練習アプリを、60〜70代の初見の人でも迷わず使え、海外でも通用するプロ品質のアプリに作り直す。まずPWAとして公開し、反応を見てストア配信する。現状は375px幅で再生ボタンが一覧に重なる、日英混在で文字が切れる、設定が1画面に詰まる、という状態。

ひとみうさの回答（plan.md 表の要約）:

| 論点 | 決定 |
|---|---|
| アプリの形 | まずPWA（ホーム画面追加・オフライン可）→後でApp Store / Google Play（Capacitor等） |
| 初回公開の中身 | 10種目の基本カウント＋自分で入れるルーティン。公式・監修済みとは名乗らない |
| 目玉 | 先生が自分の声を録音→生徒に配る。初期はファイル渡し（LINE・メール添付）、サーバー不要。リンク共有は後 |
| 表示言語 | 日本語＋英語（言語追加できる作りは維持） |
| 収益 | 無料公開。課金はストア版で検討 |
| 進め方 | 仕様はFableが中心で固める→完成までOpus（く！ちゃん）が采配しサブエージェントで進める |

推測扱い（Fableの裁定で確定させる、と plan.md に明記）: 生徒画面と先生画面（録音・ルーティン作成）は入口を分ける／未監修の旧ルーティン24本は公開版から外し開発用に残す／運営はくうが株式会社名義。

今回やらないこと（plan.md）: ストア申請、課金、リンク共有（サーバー）、3言語目以降、旧ルーティンの監修作業。

## 2. ユーザー像と利用場面

- 主ユーザー: 年配の方を含む一般の練習者、日本語が読めない外国人（前回設計書 §1）。本計画の目標は「60〜70代の初見の人」（plan.md Context）。
- 先生・作り手: 自分の声で12語を録音して生徒に配る人、ルーティンを組む人（plan.md 目玉・段階5-3〜5）。編集画面は「練習する人」と「組む人」が同じくらい使う想定（前回設計書 §1）。
- 場面: 練習場で使う、スマホ最優先、PCも対応、タブレットはその中間（前回設計書 §1）。
- 確認方法として計画に含まれるもの: ひとみうさのiPhone実機（マナーモード時の音、ロック解除後の復帰、Bluetooth、ホーム画面起動、ファイル受け取り）、可能なら60〜70代の方に説明なしで「種目を選んで再生」できるか（plan.md 確認方法）。

## 3. 10種目の一覧

出典: `src/v2/dance-profiles.js`。拍子は beatsPerBar（beatUnit=4）、標準BPMは practiceBpm、競技BPMは competitionBpm。TICKS_PER_BEAT=960。種目名はコード上は日本語固定（英名は本表で補記）。

| ID | 日本語名 / 英名 | 拍子 | 標準BPM（競技BPM） | 基本カウントのパターン（templates） |
|---|---|---|---|---|
| waltz | ワルツ / Waltz | 3/4 | 84（84〜90） | `123`、`12&3` |
| tango | タンゴ / Tango | 4/4 | 112（124〜136） | `SSQQS` |
| vwaltz | ヴィエニーズワルツ / Viennese Waltz | 3/4 | 150（168〜180） | `123` |
| slowfox | スローフォックス / Slow Foxtrot | 4/4 | 80（112〜120） | `SQQ` |
| quickstep | クイックステップ / Quickstep | 4/4 | 160（192〜208） | `SQQ`、`QQS` |
| rumba | ルンバ / Rumba | 4/4 | 80（100〜108） | `2341` |
| chacha | チャチャチャ / Cha-cha-cha | 4/4 | 96（112〜128） | `234&1` |
| samba | サンバ / Samba | 2/4（sambaSQ有） | 80（100〜104） | `1a2`、`SQQ` |
| pasodoble | パソドブレ / Paso Doble | 4/4 | 96（112〜124） | `1234`、`12345678` |
| jive | ジャイブ / Jive | 4/4 | 136（168〜176） | `123a45a6` |

声の12語（`src/v2/count-vocabularies.js`）: slow, quick, one〜eight, and, ah。語彙は en と ja-JP の2つ（ja は「いち・に・さん・よん（しも可）…アンド・ア」）。標準BPMは練習用、競技BPMは競技範囲という区別で、両方コード上に存在する。

## 4. 現行の機能一覧と問題点

### 生徒向け
- `public/practice.html`（シンプル再生）: 練習内容（基本カウント／ルーティン）、種目、カウント、ルーティン選択、開始・終了フィガー範囲、フィガー一覧、カウント表示とハイライト、進行バー、BPMスライダー（40〜220）、繰り返し、メトロノーム、カウントイン（なし／1／2小節）、音声選択、言語切替（日本語/English）、下固定の再生ボタン。
- 問題点: plan.md Context が挙げる375px幅での再生ボタンと一覧の重なり・日英混在での文字切れ。1画面に選択肢（練習内容・種目・カウント・範囲2つ・BPM・トグル2つ・カウントイン・音声）が並ぶ。ルーティン選択時は「機械的な拍計算のみ確認済みで、ダンス内容は未監修」の注意文が出る（practice.html）。インラインの配線ロジックが約465行、ジャイブ／チャチャチャのカウント文字列のハードコードあり（reuse-map）。

### 先生・作り手向け
- `public/voice-recorder.html`: 英語・日本語の12語録音、自動頭出し・クリック除去・長さ正規化、試聴、パック名、進捗（n/12）、書き出し／読み込み、音声セット調整。
- `public/routine-editor.html`: 並べ替え、追加、複製、削除、フィガー単体試聴、全体試聴、音声タイミング調整、Undo/Redo、下書き自動保存。
- 問題点: 書き出し／読み込みがページ最下部で見つけにくい（HANDOFF §8、PO実体験）。録音は端末内（IndexedDB）のみでブラウザデータ削除で消える（HANDOFF §10）。録音画面は共通UI基盤（ui.css）未適用で、前回UI刷新の対象外（前回設計書 §8）。「一覧で練習・編集」「シンプル再生」への導線が開発者向けの文言。録音画面は動作前提がマイク許可（「画面を開いただけではマイクは使用しません」の表示あり）。

### 開発者向け
- `routine-migration-review.html`（旧ルーティンの機械監査・人間レビュー）、`voice-calibration.html`（標準音声のタイミング確認）、`subdivision-audio-review.html`、`six-comparison.html`。
- 問題点: これらは公開対象の画面ではなく、`public/` に同居している（ファイル構成は `public/` 直下）。

## 5. 使えるエンジン資産と移設の罠（reuse-map.md）

- そのまま移せる純粋モジュール: `rhythm-parser`、`rhythm-compiler`（整数tickタイムライン）、`dance-profiles`、`timeline-view-model`、`practice-range`、`count-vocabularies`、`localization`、`ui-messages`、`routine-draft`（storage注入式）、`routine-editor-state`（undo/redo）、`figure-terminology` ほか。
- ブラウザ依存だが再利用可: `audio-engine.js`（AudioContext注入）、`voice-pack-loader.js`、`recording-normalizer.js`、`recorded-voice-pack.js`（書き出しJSONは音声をbase64埋め込み）、`recorded-voice-store.js`（IndexedDB `dance-count-v2` / `voice-packs`）。
- 作り直し対象: `public/*.html`（practice 619行、routine-editor 1042行、voice-recorder 437行）。
- 音声: 同梱は英語1パック `public/audio/default-en-female-v1/`（12語wav、manifest schemaVersion 2、onsetMs実測済み）のみ。日本語の標準音声は無い（日本語は録音パック `user-recorded-ja-v1` のみ）。
- 録音パック形式: schemaVersion 1、type `dance-count-recorded-voice-pack`、12語必須。
- ルーティン: `{id, danceId, name, bpm|null, countInBars, source, status, figures:[{id,name,counts}]}`。下書きは localStorage `dance-count-v2-routine-draft:<routineId>`。
- テスト: `npm test` = `node --test test/v2/*.test.js`（22ファイル・約89件）。HTML依存のテストは `html-module-syntax.test.js`、`ui-assets.test.js`。
- 移設の罠: 相対パス固定／src/v2内部importに `?v=` があり二重インスタンス化の恐れ／fetchが全て `cache:'no-store'`でService Workerと衝突／iOS音声アンロック専用処理なし（再生ハンドラ内でAudioContext生成＋resumeのみ）／window・navigator.language・localStorageを各HTMLが直接参照／日本語固定文言（recorded-voice-store/packのError、routine-editor-stateの「（コピー）」、dance-profilesの種目名）。
- 旧データの扱い: フィガー候補カタログは未検証の旧データ由来（25ルーティン/317フィガー、全件 unverified/unreviewed）。terminologyのverifiedは日英名対応のみでカウント列の検証ではない（reuse-map）。HANDOFF §5: 英語化可能179/317、構文エラー7件（サンバ「ボルタ」`&&&&`、ジャイブ6件`12&3&4`）は専門家確認待ち、小節途中で終わるルーティンが複数。

## 6. 守るべき制約

- 同一tickタイムライン: メトロノーム・音声スケジュール・ハイライトは同じ整数tickから導く。第二のタイミング計算を作らない（AGENTS.md）。
- Google Cloud TTSは開発時の素材生成のみ。実行時依存にしない。認証情報をpublic/ブラウザ側ファイルに出さない（AGENTS.md）。
- 生成音声は語ごとの実測onsetメタデータが揃うまで練習再生に使わない（AGENTS.md）。
- 旧ルーティンを直接移行しない。v2リズムモデルでコンパイル・検証し、先頭の分割拍が曖昧なものはレビューに回す（AGENTS.md）。
- 未監修データを公式・準拠済みと扱わない。団体名・級の表示から推定しない。初心者向け公開条件は「内容レビュー済み・根拠あり・出典状態が未確認でない」（HANDOFF §2、§4）。
- 公開・デプロイ・push・外部送信・課金影響・破壊的操作は事前許可制（AGENTS.md）。プロジェクト内の調査・実装・テストは確認不要。
- 初心者の練習経路は単純に保ち、高度なタイミング・録音・編集は段階表示の奥へ（AGENTS.md）。
- 機械可読形式と厳密なパーサトークンは、移行とテストを同時に更新しない限り変更しない（AGENTS.md）。構造変更はテスト全緑、UI/音声変更は実ブラウザ確認が必要。
- 多言語: UIロケール、カウント語彙／音声ロケール、権威・地域慣習、表示名は別概念で相互推測しない。ランタイムのリズムイベントは言語非依存の声キー（12語）を使い、翻訳でtick・フィガーID・リズムトークンを変えない。UIロケールの初期提供は en, ja-JP。フォールバックは完全一致→基底言語→英語。プライバシー・マイク同意・規約・声の配布条件は公開地域ごとに用意（globalization-architecture.md）。
- 検証手順（plan.md）: `npm test`、`npm run timing:audit`、PC幅と375pxのPlaywright全域目視＋機械チェック、検収後は自動操作ブラウザを閉じる。

## 7. 未決事項（plan.md R1〜R9。結論なし）

- R1 技術構成: plan.md 記載の「く！ちゃん推奨」案はVite＋TypeScript＋軽量UIフレームワーク、エンジンは `src/engine` へ移設して既存テスト維持、Service Workerでオフライン、後でCapacitor。現行はビルド工程なし（`python3 -m http.server`）、src/v2はプレーンJS、テストは `node --test`。
- R2 画面構成と導線: 案は「生徒: 種目を選ぶ→再生の最短2タップ／先生: 録音・ルーティン作成・配る」。現行practiceは選択肢が1画面に集中し、入口は生徒／先生で分かれていない（`public/practice.html`、`voice-recorder.html` のナビ）。
- R3 ルーティン作成時のフィガー候補: 候補は未検証の旧データ由来（317フィガー全件 unverified）。選択肢は「候補に出す（参考扱い）／出さない（手入力のみ）」。編集画面は現状、フィガー名選択でカウント自動入力の設計（前回設計書 §5）。
- R4 配布ファイルの形式: 声のパックは既にbase64埋め込みJSONで書き出し・読み込み済み（recorded-voice-pack.js）。ルーティンは別形式（localStorage下書き）で、声＋ルーティンの束ね形式は未定義。iPhoneのPWAは「共有から開く」が使えない、と plan.md に記載。
- R5 日本語の標準音声: 英語は Google Cloud TTS（en-US-Neural2-F）で生成・onset実測済み。日本語は無い。実行時API依存は禁止、生成は開発時のみ（AGENTS.md）。日本語12語は count-vocabularies.js に定義済み。
- R6 iPhone特有の落とし穴: マナーモード時にWeb Audioが鳴らない、画面スリープ、Bluetooth遅れ。現行はiOS音声アンロック専用処理なし。長時間ループ・スリープ復帰・Bluetoothの実機確認はHANDOFF §8の未了項目。
- R7 高齢者向け基準: 前回設計書の数値は基本18px、タッチ44px（主要48px）、コントラスト4.5:1、機械チェックは `tools/check-ui-accessibility.js`（npm run ui:check、390px/1280px）。1画面の選択肢数と言葉づかいの数値基準は、既存文書に定義がない。
- R8 法務: プライバシーポリシー、マイク利用説明、先生の声を配る際の同意。globalization-architecture.md に「地域ごとに用意」と記載。録音は端末内保存で、サーバー送信は現状ない。
- R9 アプリ名・公開先ドメイン: ひとみうさが決める。現行名称は "Dance Count for Ballroom"。ドメイン情報はリポジトリ内資料に記載なし。

## 8. 過去に却下された案・既に決まっているUI方針（前回設計書 2026-07-15）

決定者はひとみうさ（ブラウザモックで選択）。

| 論点 | 決定 | 却下 |
|---|---|---|
| 見た目 | 現行の青×白を継承し大型化・アイコン化（案B） | クリーム地の温かい系(A)、黒×金ダーク(C) |
| 編集導線 | 再生バーを下固定＋タップしたカードだけ編集ボタン展開（B） | 編集ボタン常時表示(A、一度選択後Bへ変更)、上固定＋⋮メニュー(C) |
| アイコン | SVG線画（Lucide系）のみ。絵文字禁止 | 絵文字 |
| ラベル | 主要操作は必ずアイコン＋短いラベル併記、日英UI切替に連動 | アイコン単独、文字単独 |
| フィガー追加 | 一覧末尾に横幅いっぱいの「＋ フィガーを追加」（空でも同位置） | ヘッダー右上の小さな追加ボタン |

その他の確定方針:
- 配色: 背景は淡青グレー、カード白、主要アクション青、文字濃紺。全組で コントラスト比 4.5:1 以上。基本文字18px。
- タッチ: 最小44px、主要ボタン（再生・追加・削除確認）48px。radius・shadow・spacingは単一トークンで統一。
- アイコン語彙: play/stop/repeat/metronome（スピーカー型の音声と描き分け）/gauge/voice/plus/copy/trash/pencil/grip/globe/chevron/undo/redo/check/arrow-up/arrow-down。stroke・currentColor。
- シンプル再生: 1画面維持、セレクト高48px・18px以上、トグルはアイコン＋ラベルの大型ボタン、再生ボタンは画面下部固定、言語切替は右上にglobe＋「日本語/English」。
- 編集画面: 再生中は鳴っているフィガーのカードが自動展開。浮いてカードを隠すバーは廃止。音声タイミング微調整・元データに戻す・録音管理リンクは「詳細設定」折りたたみへ（progressive disclosure）。Undo/Redoはヘッダー近くに残す。削除は確認ダイアログ＋Undo。
- 対象外とされたもの: ダークモード、新機能追加（範囲再生仕様変更など）、録音・レビュー・比較画面のUI変更。
- 機械ゲート: 44px以上、コントラスト4.5:1以上、コンソールエラー0、390px/1280px。
