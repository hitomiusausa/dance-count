# Dance Count アプリ化 v1 — 仕様書（確定版・レビュー待ち）

作成: 2026-10-11 / ブランチ `agent/app-v1` / 清書: Opus（Fable の裁定を清書。新しい製品判断はしていない）
根拠資料（この仕様書と矛盾したら、下の優先順位で解く）:

1. ひとみうさの決定 D1〜D8（`docs/app-v1/rulings.md` 末尾）
2. 裁定 Ruling 1〜20（同ファイル。番号の大きい方が後勝ち）
3. 設計の骨子 `docs/app-v1/design-skeleton.md`
4. 見た目の正: `docs/app-v1/mockups/b-studio-navy.html`（Ruling 16〜19 反映済み）
5. 既存コードの棚卸し `docs/app-v1/reuse-map.md`、前提 `docs/app-v1/plan.md`

実装者はこの文書と上のリンク先だけ読めば作業できる。決まっていないことは §16「未決事項」に集め、本文では決めていない。

---

## 1. 目的・対象ユーザー・成功の条件

### 目的
社交ダンスのカウント練習アプリ「Dance Count」（副題 for Ballroom、D2）を、**60〜70代の初見の人でも説明なしで使え、海外でもプロの道具に見える**品質で作り直し、まず PWA として公開する。目玉は「**先生が自分の声を録音して生徒に配る**」（ファイル渡し・サーバーなし）。

### 対象ユーザー
| 人 | やりたいこと | 端末の想定 |
|---|---|---|
| 生徒（主に60〜70代・初見） | 種目を選んでカウントを鳴らす／先生の声で練習／先生から受け取ったルーティンを鳴らす | iPhone（基準 375px）・Android |
| 先生 | 自分の声を12語録音 → 生徒に配る／ルーティンを作って配る | iPhone・Android・PC |

### 成功の条件（測れる形）
| # | 条件 | 測り方 |
|---|---|---|
| G1 | 初回は **2タップで音が出る**（種目タイル → ▶） | Playwright で S1 → S2 → ▶ のクリック数＝2、AudioContext が `running` |
| G2 | 2回目以降は **1タップで音が出る**（「前回」カード） | 同上、クリック数＝1 |
| G3 | 高齢者向け数値基準（§6）の違反ゼロ | `npm run ui:check` が全画面・375×667 と 1280×900 で終了コード0 |
| G4 | エンジンのテスト全件成功、タイミング数値が移設前と一致 | `npm test` 全緑（移設前 95件＋新規）、`timing:audit` の出力 JSON が `generatedAt` を除き diff ゼロ |
| G5 | iPhone 実機でマナーモードでも鳴る・ホーム画面起動で鳴る・ファイル受け取りができる | §14 の実機チェックリスト全項目 ✓（ひとみうさの iPhone） |
| G6 | 先生の声：12語録音 → 配る → 別端末で受け取り → ワルツが先生の声で鳴る | 実機で iPhone→iPhone、iPhone→Android の2経路 |
| G7 | オフラインで標準音声のカウントが鳴る | 機内モードでホーム画面アプリを起動し S2 で ▶ |
| G8 | UI 文言に禁止語（§6 表の「言葉」）が無い | 禁止語テスト（`node --test`）が緑 |
| G9（可能なら） | 60〜70代の方が説明なしで「種目を選んで再生」できる | 初見テスト1名以上・観察記録 |

---

## 2. 決定事項の要約表

| 参照 | 決定 | この仕様での反映先 |
|---|---|---|
| D1 | ホームに「先生の声で練習」カード。設定内の「先生の方へ」も残す | §3・§4 S1/S6（位置は Ruling 16 で上に変更） |
| D2 | 名前「Dance Count」＋副題「for Ballroom」 | §4 S1・§10 manifest |
| D3 | カウント音声の初期値は UI 言語に関わらず **英語**。設定で日本語に切替可 | §4 S2/S7・§7 設定 |
| D4 | 公開先は dancemap.jp のサブドメイン（例 count.dancemap.jp）。DNS・配信基盤は公開直前に許可を取る | §10・§16 |
| D5 | 運営者名義 くうが株式会社 | §12 |
| D6 / D8 | 見た目は **B「Studio Navy」** | §5 |
| D7 | 曲＋カウントは二段構え。**v1 は口だけ**、曲の同梱は第2弾 | §10 tempo-map・§15 |
| Ruling 1 | Vite＋TS（UI層）＋Preact。エンジンは JS のまま `src/engine/` へ移設 | §10 |
| Ruling 2 | 下タブ3つ（練習・ルーティン・設定）、最短2タップ／1タップ | §3 |
| Ruling 3 | ルーティン作成でカウント候補は出さない。種目テンプレートとフィガー**名**（verified）だけ | §4 S4 |
| Ruling 4 | 配布は1ファイル JSON（`.dancecount.json`）、share／download、受け取りはファイル選択（Android は share_target も） | §7・§8 |
| Ruling 5 | 日本語標準音声は開発時 TTS 生成＋onset 実測＋聴感ゲート | §9 |
| Ruling 6 | iOS 対策（audioSession・タップ内解除・2秒判定バナー・WakeLock・Bluetooth は表示のみ補正） | §9・§11 |
| Ruling 7 | 高齢者向け数値基準と言い換え規則 | §6 |
| Ruling 8 | 法務（端末内保存・解析なし・マイク事前説明・声の配布同意） | §12 |
| Ruling 10 | 旧ルーティン24本・開発用ページは公開ビルドに含めず `legacy/` へ | §10 |
| Ruling 11 | 保存は IndexedDB、`persist()`、バックアップの勧め | §7 |
| Ruling 12 | UI 言語と声の言語は独立 | §4 S6/S7 |
| Ruling 13 | 練習画面の初期値と「くわしく」 | §4 S2 |
| Ruling 14 | 基準端末は iPhone 375px。Android は share_target・インストール案内、PC は 1280px で崩れない（専用設計なし） | §4・§8 |
| Ruling 15 | 録音は MediaRecorder → WAV 化して保存・配布 | §7・§9 |
| Ruling 21 | PC（1024px 以上）: S2/S5 だけ同じ DOM を CSS で2領域配置、他は1カラム最大 640px。タブは上部横並び | §4 S2・§5・§6 |
| Ruling 22 | 拍子は表示しない。副題は `templates[0]` のカウント表示（「1 2 3」等） | §4 |
| Ruling 23 | ui:check は S2/S5 をバナー表示状態でも検査。バナーの操作は U4 から除外 | §4 S2・§6 |
| Ruling 24 | 速さ3択＝標準×0.8／標準／min(標準×1.1, 競技上限)。ワルツ 67/84/90 | §4 S2 |
| Ruling 25 | 録音する言語は S8 ステップ0で2択（初期値 英語）。1パック1言語。パック選択で `voiceLocale` が決まる | §4 S7/S8・§7 |
| Ruling 16 | 「先生の声」カードは種目タイルの**上**、375×667 にカード＋10種目が入る | §4 S1・§6 |
| Ruling 17 | ルート・一覧画面は下タブ表示、集中画面は下タブを隠し「‹ 戻る」 | §3 |
| Ruling 18 | 主要操作数の数え方（data 属性で宣言・グループ＝1） | §6 |
| Ruling 19 | S2 の表トグルは **メトロノーム・はじめの合図**。繰り返しは「くわしく」 | §4 S2 |
| Ruling 20 | `tempo-map.js`（constant / beatMap）で tick→ms を1箇所に集約。曲は第2弾 | §10 |

---

## 3. 画面一覧と導線

### 画面一覧
| ID | 画面 | 種別（Ruling 17） | 下タブ | 左上「‹ 戻る」 | 到達 | ハッシュ |
|---|---|---|---|---|---|---|
| S1 | ホーム（種目を選ぶ） | ルート | 表示 | なし | 起動直後・「練習」タブ | `#/` |
| S2 | 再生（基本カウント） | 集中 | 隠す | あり | S1 の種目タイル・「前回」カード | `#/practice/<danceId>` |
| S3 | ルーティン一覧 | ルート | 表示 | なし | 「ルーティン」タブ | `#/routines` |
| S4 | ルーティン編集 | 集中 | 隠す | あり | S3「＋ 新しいルーティン」・カードの「編集」 | `#/routines/new`・`#/routines/<id>/edit` |
| S5 | ルーティン再生 | 集中 | 隠す | あり | S3 のカードの ▶ | `#/routines/<id>/play` |
| S6 | 設定 | ルート | 表示 | なし | 「設定」タブ | `#/settings` |
| S7 | 声（一覧） | 一覧 | 表示 | あり | S1「先生の声で練習」・S2「声」チップ・S6「声」 | `#/voices` |
| S8 | 自分の声を録音（12語） | 集中 | 隠す | あり | S7「自分の声を録音する」・S6「先生の方へ」 | `#/voices/record` |
| S9 | 配る（ファイルを作る） | 集中 | 隠す | あり | S7 の声の「配る」・S8 完成画面・S3 カードの「配る」・S6「ルーティンを配る」 | `#/share` |
| S10 | 受け取る（ファイルから） | 集中 | 隠す | あり | S7「ファイルから受け取る」・Android share_target | `#/receive` |
| S11 | 音が鳴らない時 | 集中 | 隠す | あり | S6・S2 の警告バナー | `#/help/sound` |
| S12 | ホーム画面に追加する方法 | 一覧 | 表示 | あり | S6・S1 の初回案内カード | `#/help/install` |
| S13 | プライバシー・アプリについて | 一覧 | 表示 | あり | S6 | `#/about` |
| E* | エラー・例外（§11） | 発生した画面の中に出す | — | — | 発生時 | — |

ハッシュは「画面ごとに履歴1件」を積むための実装（Ruling 17）。ディープリンクとしての外部共有はしない（Ruling 1 補足・§10）。

### 下タブと戻るの規則（Ruling 17）
- 下タブ（`[data-nav]`）は3つ「練習 / Practice」「ルーティン / Routines」「設定 / Settings」。アイコン＋文字、アイコン単独禁止。
- 集中画面では下タブを**描画しない**（`display:none`）。下固定の主ボタン（▶・全体を試聴・録音する・次へ・ファイルを作る）はタブと同居させない。
- 「‹ 戻る」（`[data-back]`）は左上、48×48px 以上、山形アイコン＋文字ラベル「戻る / Back」必須。
- 戻るの動き: 履歴を1つ戻る。履歴が無い（直接開いた）場合は種別の親（S2→S1、S4/S5→S3、S8〜S10→S7、S11→S6、S7/S12/S13→S6）へ置き換え遷移。
- 再生中に戻る: 音を止めて戻る（確認なし）。S8 で戻る: 録音済みの語を保存して戻る（確認なし、次回は続きから）。
- 端末・ブラウザの戻る操作も同じ動き。

### タップ数
| 目的 | 経路 | タップ数 |
|---|---|---|
| 初回、カウントを鳴らす | S1 種目タイル → S2 ▶ | 2 |
| 2回目以降 | S1「前回: ワルツ」カード（遷移して即再生。iOS の音声解除はこのタップ内） | 1 |
| ルーティンを鳴らす | 「ルーティン」タブ → カード → ▶ | 3 |
| 先生が録音を始める | S1「先生の声で練習」→ S7「自分の声を録音する」→ S8 説明「録音をはじめる」 | 3（＋OS のマイク許可） |
| 生徒が声を受け取る | S1「先生の声で練習」→ S7「ファイルから受け取る」→ S10「ファイルを選ぶ」 | 3（＋ファイル選択＋「使う」） |
| 録音から配るまで | S8 完成画面「配る」→ S9 | 一本道 |

### 初回起動
1. UI 言語は端末言語から `resolveUiLocale` で決定（日本語以外は英語）。S1 右上の言語ボタン（`[data-utility]`）で即切替、S6 にも同じ項目。
2. チュートリアルは出さない。S1 見出し「種目を選んでください」が説明を兼ねる。
3. 初めて再生に成功した後、S1 の最下段に1回だけ「ホーム画面に追加すると、アプリのように使えます →」カード（× で閉じたら二度と出さない。S12 はいつでも S6 から読める）。ホーム画面アプリとして起動中（`display-mode: standalone`）なら出さない。
4. マイク・保存の許可は起動時に求めない（録音・保存の直前だけ）。

---

## 4. 画面ごとの仕様

共通: 全画面の文言は `src/app/i18n/` の日英キーで持つ（下の英語は初版。段8で監修）。種目名は `DANCE_NAMES`（`ui-messages.js`）を使い、`dance-profiles.js` の `name` は表示に使わない。種目の副題は **拍子ではなく** `templates[0]` を表示用に整形したカウント（ワルツ「1 2 3」・タンゴ「S S Q Q S」・スローフォックス「S Q Q」・サンバ「1 a 2」・パソドブレ「1 2 3 4」・ジャイブ「1 2 3 a 4 5 a 6」。整形関数は現在カウント表示と共通、日英共通）。拍子（2/4・3/4・4/4）はどこにも表示しない（Ruling 22）。

PC（1024px 以上、Ruling 21）: 画面は1カラム・最大幅 640px 中央寄せ。例外は S2/S5 だけで、同じ DOM を CSS グリッドで2領域（左: 現在カウント＋拍インジケータ／右: 速さ・トグル・声チップ・くわしく）に並べ、内容幅は最大 960px。▶／■ の下固定帯は PC でも内容幅いっぱい。下タブは 1024px 以上で上部の横並び（実装は段2。段1は下タブのみ。2026-10-11 注）（同じ `[data-nav]` 要素、集中画面で隠す規則は同じ）。

### S1 ホーム（ルート）
- 上から: アプリ名（「Dance Count」22px 太字＋副題「for Ballroom」16px）と右上の言語ボタン（地球アイコン＋「日本語」/「English」）→「前回」カード（2回目以降のみ）→「先生の声で練習」カード → 見出し「種目を選んでください」→ 種目タイル 10個（2列×5行）。初回案内カード（§3）は最下段。
- 「前回」カード: ネイビー塗り、左に「前回 / Last time」16px と種目名 24px、右に白地の「▶ 続きから / Resume」。高さ 60px（主ボタン基準 56px 以上）。タップで S2 へ遷移し即再生（前回の速さ・型・トグルを復元）。`lastDanceId` が無ければ描画しない。
- 「先生の声で練習」カード（Ruling 16）: 横幅いっぱい、高さ 56〜64px、1行（マイクのアイコン（濃紺の円に白線）＋「先生の声で練習 / Practice with your teacher's voice」＋右向き山形）。上下を罫線で区切る。タップで S7。
- 種目タイル（`[data-group="dance"]`）: 1行 64〜72px（タイル間の縦の間隔 8px 以上）、種目名 18px 太字＋副題（最初に鳴るカウント、Ruling 22）16px・1行・はみ出し禁止（U10）。カード枠なし・下罫線1本。
- 機械判定: 375×667（タブ込み）の初期表示に「先生の声」カードと 10 タイルの rect がすべて完全に入る。主要操作数＝3（前回・先生の声・種目群）、初回は 2。
- 縦の寸法（モックで実測、余裕は 3px しかないので変えない）: 上余白 12・アプリ名の行 48＋下 8・前回カード 60・先生カード 56（上 4）・見出し 22px（上 8／下 4）・タイル 64×5 行（行間 8）→ 最終タイルの下端 596px ≤ 上限 599px（667 − タブ 68）。
- 載せない: ルーティン、声の選択、速さ、注意書き、録音ボタンそのもの。
- 文言: 種目を選んでください / Choose a dance。前回 / Last time。続きから / Resume。先生の声で練習 / Practice with your teacher's voice。ホーム画面に追加すると、アプリのように使えます / Add to Home Screen to use it like an app。

### S2 再生（集中）
- 初期表示（上から）: 「‹ 戻る」→ 種目名見出し 28px ＋副題 16px（選択中のカウントの型を同じ整形で表示。Ruling 22）→ 現在カウント（鳴っている語をそのまま表示。スマホ 96px／PC 200px、琥珀色）と小節内の拍インジケータ（操作ではない。現在拍だけ琥珀色の下線 6px＋太字、他は灰の下線 3px）→ 速さ3択（`[data-group="speed"]`）→ トグル2つ（メトロノーム・はじめの合図、Ruling 19）→ 声チップ「声: 標準（英語）」→「くわしく」（`summary[data-more]`）。画面下固定に ▶ 再生／■ 停止（72px 以上・幅は画面の60%以上）。
- 主要操作数（Ruling 18）: 速さ(1)＋メトロノーム(1)＋はじめの合図(1)＋声チップ(1)＋▶(1)＝5。375×667 の初期表示に5つとも完全に入ること。
- 初期値（Ruling 13・18・D3）: 繰り返しオン、メトロノームオン、はじめの合図オン（1小節）、速さ「標準」＝`practiceBpm`、カウントの型＝`templates[0]`（種目ごとに記憶）、声＝英語の標準音声。
- 速さ3択（Ruling 24）: 「ゆっくり / Slower」＝`round(practiceBpm × 0.8)`、「標準 / Standard」＝`practiceBpm`、「速め / Faster」＝`min(round(practiceBpm × 1.1), competitionBpm.max)`。定数 `SPEED_SLOW_RATIO=0.8`・`SPEED_FAST_RATIO=1.1` を1か所で持つ。ワルツは 67 / 84 / 90。単体テストで10種目すべて「ゆっくり < 標準 < 速め ≤ 競技上限」を固定。選択中のボタンに「♩=84」の形で数値を小さく併記（「BPM」の語は出さない）。選択はネイビー塗り＋チェックのアイコン＋文字（色だけに頼らない）。種目ごとに記憶（`speedPresetByDance`）。
- トグル: アイコン＋ラベル＋スイッチ形＋「オン / On」「オフ / Off」の文字。`role="switch"`。
- 声チップ: タップで S7。表示は選択中の声の名前（「標準（英語）」「標準（日本語）」「○○さんの声」「自分の声」）。
- 「くわしく / More options」（開いた状態でも画面全体の主要操作 9 以下になるようグループ化）:
  1. カウントの型（`[data-group="pattern"]`。テンプレートが2つ以上の種目のみ。ワルツ `1 2 3`／`1 2 & 3`、クイックステップ `S Q Q`／`Q Q S`、サンバ `1 a 2`／`S Q Q`、パソドブレ `1 2 3 4`／`1〜8`）
  2. 速さの細かい調整（`[data-group="speed-fine"]`: スライダー 40〜220 と「競技の速さ（♩=84〜90）」ボタン。競技の速さは `competitionBpm` の範囲内の値に合わせる）
  3. 繰り返す（初期オン）
  4. 声のタイミング（±200ms・1つまみ。§7 の保存先）
  5. Bluetooth 補正（±200ms。Ruling 6-4 で v1 必須ではない。入れる場合も同じ「くわしく」内）
  - 第2弾で「曲に合わせる」が入る（Ruling 20）。v1 では出さない。
- 再生中の操作: 速さ・メトロノーム・声・型の変更は内部で停止→適用→再開。「反映されました」等の文言は出さない。
- 警告バナー（§11・Ruling 23）: 見出し直下に出す。中の操作は「音が出ない時は ›」リンク1つだけ（`[data-alert-action]`、U4 から除外・U1/U3/U7 は適用）。375 幅で高さ 120px 以下・本文3行以内。バナー表示中も `[data-group="speed"]` と `[data-play]` は初期ビューポートに完全に入ること（ui:check は `?ui-state=no-sound` で強制表示して検査）。
- 載せない: ルーティン切替、録音、ファイル操作、監修に関する注意文。
- WakeLock が取れない端末: 初回再生時に一度だけ「練習中は画面が暗くなることがあります。自動ロックを長めにすると便利です」。

### S3 ルーティン一覧（ルート）
- 「＋ 新しいルーティン / New routine」（横幅いっぱい・56px 以上、0件でも同じ位置）→ ルーティンの行（名前・種目・フィガー数・▶）。受け取ったものには副題「○○さんから / From ○○」。
- 行をタップで展開: ▶ 再生・「編集」・「配る」・「削除」。削除は確認ダイアログ（質問1つ・ボタン2つ・取り消しが左）。
- 0件の時: 「まだルーティンはありません」の1行。
- 載せない: 旧24本、provenance・レビュー状態の表示。

### S4 ルーティン編集（集中）
- 名前、種目（フィガー0件の時だけ変更可）、フィガーの行（番号・名前・カウント・▶ 試聴）、行の並べ替えは ↑↓ ボタン（ドラッグは補助）、末尾「＋ フィガーを追加」、元に戻す／やり直す、下固定「全体を試聴」。
- フィガー名の入力補助: `figure-terminology` の verified 名（日英）だけを候補に出す。カウントは付けない（Ruling 3）。
- カウントの入力: その種目の `templates` を「よく使うカウント」ボタンで出す＋手入力。`rhythm-parser` で即検証し、不正なら行を赤枠＋警告アイコン＋「使える記号: 1〜8, S, Q, &, a」の1行。
- 「くわしく」: はじめの合図の小節数、速さ指定（空なら種目の標準）、声のタイミング。
- 保存: 端末内（§7）。初回保存時に1回だけ「ファイルに保存（バックアップ）しておくと安心です」の1行。
- 載せない: 旧カタログ由来の候補カウント、reviewStatus の編集。

### S5 ルーティン再生（集中）
- S2 と同じ骨格（主要操作も同じ5つ）。見出し下に注意文1行「このルーティンはあなたが作ったものです」／受け取ったものは「このルーティンは○○さんが作ったものです」（監修済みと誤認させない。Ruling 8）。
- フィガー一覧: 鳴っている行をハイライト（琥珀の左線＋太字）、自動スクロール（reduced-motion 時は瞬時）。
- 「くわしく」: 範囲（開始・終了フィガー）、繰り返す、速さの細かい調整、声のタイミング。

### S6 設定（ルート）
- 項目（上から）: 言語（日本語 / English）、声（→ S7）、ホーム画面に追加する方法（→ S12）、音が鳴らない時（→ S11）、見出し「先生の方へ / For teachers」の下に「自分の声を録音する」（→ S8）「ルーティンを配る」（→ S9）、プライバシー・アプリについて（→ S13、版番号を併記）。
- 載せない: 開発者向け項目、キャッシュ操作。「データを全て消す」は S13 の最下部。

### S7 声（一覧）
- 大きなラジオ形のリスト（`[data-group="voice"]`）: 「標準の声（英語）」「標準の声（日本語）」（Ruling 5 のゲート通過後のみ）「○○さんの声」（受け取った）「自分の声」（録音途中なら「7/12」）。選択中の行に ▶ 試聴（ワルツ1小節）。
- 下に2ボタン: 「ファイルから受け取る / Receive from a file」（→ S10）「自分の声を録音する / Record your voice」（→ S8）。
- 受け取った声・自分の声の行を展開: 「配る」（→ S9、この声を入れた状態）「ファイルに保存」「削除」（確認ダイアログ）。
- 声の言語の選択（Ruling 12）はこの画面の選択そのもの（英語の声を選べば英語カウント）。

### S8 自分の声を録音（集中・ウィザード）
- 0 説明: 何を録るか（12語）、録音は端末内にだけ保存、いつでも削除できる → **録音する言語**の大型2択（`[data-group="record-language"]`、Ruling 25）「英語で数える（One, Two, Slow…）/ Count in English」「日本語で数える（いち、に、スロー…）/ Count in Japanese」、初期値は英語 →「録音をはじめる」のタップで初めて `getUserMedia`（Ruling 8）。主要操作数＝2。選んだ言語でパックの `locale`／`vocabularyId`（`en`／`ja-JP`）と既定名「○○の声（英語）／（日本語）」が決まる。1パック1言語（両方録る先生は2回録る）。
- 1〜12（1画面1語、順番は `REQUIRED_VOICE_KEYS`: スロー・クイック・1〜8・アンド・ア）: 進み具合「3 / 12 語」と12マスの棒、語（56px・選んだ言語の語）ともう一方の言語の表記（20px）、「ボタンを押すと 1.5 秒だけ録音します」、大きな録音ボタン（直径 144px。押す→1.5秒録る→自動停止、もう一度押すと録り直し）、自動頭出し後の波形ミニ表示と「▶ 聞く」、下固定「次へ」。
- 13 完成: ワルツで試聴（標準の声と聞き比べ）、名前（既定「○○の声」）、「配る」（→ S9）「あとで」。完成時に1回だけ「ファイルに保存（バックアップ）」を勧める1行（Ruling 11）。
- 載せない: ゲイン・onset の数値、mimeType、正規化のオン／オフ。

### S9 配る（集中）
- 「一緒に配るもの」チェックリスト: 声（S7・S8 から来た時はその声にチェック済み。それ以外はチェックなしで、完成した声から選べる）、ルーティン（S3 から来た時はそのルーティンにチェック済み。0件可）。声もルーティンも0件なら「ファイルを作る」は押せない。
- 名前（配る人＝先生名）。
- 同意チェック（声を入れる時だけ表示・必須）: 「自分の声をこのファイルに入れて配ることに同意します。配り先は自分で管理します」。
- 下固定「ファイルを作る / Create file」→ `navigator.share({files})` が使えれば共有シート、使えなければダウンロード（ファイル名を表示）。
- 同じ画面に「生徒への案内文をコピー / Copy instructions for students」（§8 の定型文）。

### S10 受け取る（集中）
- 「ファイルを選ぶ / Choose a file」大ボタン（`<input type=file accept=".json,application/json">`）、iPhone 向け図解（LINE → 共有 → "ファイル"に保存 → ここで選ぶ）、「最近の項目」から探す案内、ファイル選択が開かない時の「Safari で開いて受け取る」リンク（F3）。
- 選んだ後: 中身の確認（「○○さんの声・日本語・12/12」「ルーティン 2本」）→「使う / Use」。同名の声があれば「置き換える／両方残す」。
- Android の share_target から来た時は、確認画面から始まる。

### S11 音が鳴らない時（集中）
- 3項目以内: 本体横のスイッチ（マナーモード）を確認／音量を上げる／イヤホン・Bluetooth の接続を確認 → 最後に「もう一度 ▶ を押してください」。技術用語なし。

### S12 ホーム画面に追加する方法（一覧）
- iPhone（Safari の共有 → ホーム画面に追加）、Android（Chrome のメニュー → アプリをインストール。`beforeinstallprompt` が取れればボタンを出す）、PC（アドレスバーのインストール）。図は SVG。

### S13 プライバシー・アプリについて（一覧）
- §12 の内容、運営者 くうが株式会社、版番号、「公式・監修済みのものではありません」の明記、最下部に「データを全て消す」（確認ダイアログ）。

---

## 5. デザインシステム（B Studio Navy）

値の正は `docs/app-v1/mockups/b-studio-navy.html` の `:root` と B 用の上書き。CSS 変数名はそのまま使う。

### 色
| トークン | HEX | 用途 | 白地とのコントラスト |
|---|---|---|---|
| `--bg` / `--surface` / `--dockbg` | #FFFFFF | 画面・面・下固定帯 | — |
| `--ink` | #14213D | 本文・見出し | 15.97 |
| `--ink2` | #4A5670 | 補助文・非選択の拍 | 7.35 |
| `--primary` | #1B2A4A | 主ボタン・選択中・リンク | 14.22 |
| `--on-primary` | #FFFFFF | 主ボタン上の文字 | — |
| `--soft` | #EEF0F5 | PC のタブ選択背景・進捗の現在マス | （ネイビー文字 12.47） |
| `--line` | #8790A3 | 罫線・枠・未選択スイッチ | 3.21（3:1 以上） |
| `--sel` / `--sel-line` / `--sel-ink` | #1B2A4A / #1B2A4A / #FFFFFF | 選択中の選択肢 | — |
| `--count-ink` / `--beat-on` | #A54D06 | **現在の拍だけ**（琥珀）。他の用途に使わない | 5.73 |
| `--focus` | #B45309 | フォーカス枠 3px・offset 2px | 5.02 |
| `--warn-bg` / `--warn-ink` / `--warn-line` | #FFFFFF / #7A3A05 / #A54D06 | 警告バナー（左線 4px） | 8.62 |
| `--rec` / `--rec-ring` | #1B2A4A / #E4E7EE | 録音ボタン（輪の外側に `--line` 1px） | — |
| アイコン円 | #14213D | 「先生の声」カードのマイク円（白線） | — |
| `--page` / `--frame` | #F2F3F6 / #1B2A4A | モックの台紙専用。アプリでは使わない | — |

金色は使わない。v1 はライト表示のみ（§15）。

### 書体
- `font-family: "Inter", "Noto Sans JP", sans-serif`。太さ 400/600/700/800。
- 外部送信をしない（§12）ため Google Fonts の CDN は使わず、**アプリに同梱**する（例 `@fontsource/inter`・`@fontsource/noto-sans-jp` の unicode-range 分割ファイル）。Inter は precache、Noto Sans JP の分割ファイルは初回使用時に runtime cache。読めない間はシステム書体で表示（`font-display: swap`）。
- 見出しの字間 `--track: -0.015em`。数字は `font-variant-numeric: tabular-nums`。

### サイズ（px）
| 要素 | スマホ | PC |
|---|---|---|
| 本文 | 18 | 18 |
| 補助文（最小） | 16 | 16 |
| アプリ名 / 副題 | 22（800）/ 16 | 同 |
| 画面見出し（S1） | 22（700） | 同 |
| 種目名見出し（S2） | 28 | 28 |
| 前回カードの種目名 | 24 | 24 |
| 現在カウント | 96（700・字間 -0.04em） | 200 |
| 拍インジケータ | 52×40・18 | 72×56・24 |
| 録音の語 / 英語表記 | 56（800）/ 20 | 同 |
| ▶ 再生ボタン | 高さ 72・文字 24（800）・アイコン 32 | 高さ 80・幅 64% |
| 次へ・主ボタン | 高さ 56・文字 20 | 同 |
| 下タブ | 高さ 68・文字 16 | 1024px 以上で上部横並び・高さ 56 以上（Ruling 21） |

### 余白・角丸・境界
- 画面の左右余白 16px、上 16px。見出しの上 24／下 12。要素間 8〜12px、区切りの上 24px。
- タップ対象同士の間隔 8px 以上（Ruling 7）。2列の横の間隔 12〜20px。
- 角丸: 主ボタン・前回カード `--r: 6px`、選択肢・バナー・言語ボタン `--r-s: 4px`。録音ボタンは円。
- 境界: 線 1px（`--bw`・`--hair`）。**カードを使わず罫線で区切る**（種目タイル・トグル・声チップは下罫線、先生カードは上下罫線）。

### 現在拍の琥珀
- 現在カウントの数字と、拍インジケータの現在拍（下線 6px＋太字 800）、S5 の現在フィガーの左線にだけ #A54D06 を使う。点滅させない。拍の移り変わりのハイライト以外は自動で動かさない。

### アイコン
- SVG 線画、24px、`stroke-width: 2`、角・端は丸、`stroke: currentColor`（再生・停止のみ塗り）。モックの `<symbol>`（play・stop・globe・chevron・chev-r・chev-l・repeat・metronome・gauge・voice・check・mic・alert・home・list・gear）を `src/app/components/icons.svg` に移す。
- 絵文字禁止。アイコン単独のボタン禁止（必ず文字を添える）。装飾アイコンは `aria-hidden="true"`。

---

## 6. 高齢者向け数値基準（機械チェック）

`tools/check-ui-accessibility.js` を新アプリ向けに移植・拡張し `npm run ui:check` で実行する。全画面（S1〜S13 と E* の代表）を **375×667** と **1280×900** で開き、S2/S4/S5 は「くわしく」を閉じた状態と開いた状態の両方、S2/S5 はさらに警告バナー表示状態（`?ui-state=no-sound`、Ruling 23）を検査する。1280 では S2 の `[data-group="speed"]` と `[data-play]` が初期ビューポートに完全に入ること（Ruling 21）。1件でも違反があれば終了コード1。

| # | 項目（根拠） | 基準 | 判定方法 |
|---|---|---|---|
| U1 | 本文文字（R7） | 本文 18px 以上、補助文 16px 以上、14px 未満禁止 | 可視テキストを持つ要素の computed `font-size`。16px 未満は違反（例外は `[data-fineprint]` を付けた法務の注記だけで、それも 14px 未満は違反）。本文（`p`, `li`, `[data-body]`）は 18px 未満で違反 |
| U2 | 主要ボタン（R7） | `.dc-primary` は高さ 56px 以上。▶／■は 72px 以上かつ幅が画面幅の 60% 以上 | `.dc-primary` と `[data-play]` の rect |
| U3 | タップ対象（R7） | 48×48px 以上、隣接するタップ対象との間隔 8px 以上 | `button, a, select, summary, input, label[for], [role=button], [role=switch], [role=radio]` の rect。隣接距離は rect 同士の最短距離 |
| U4 | 主要操作数（R18） | 初期ビューポート 5 以下、画面全体 9 以下 | 下の数え方 |
| U5 | 選択肢の数（R7・R18） | 1つの `[data-group]`・`.dc-choice` の選択肢は 10 以下、`<select>` は使わない（使うなら option 10 以下） | 子の数 |
| U6 | 「くわしく」（R18） | `summary[data-more]` は1画面に1個まで | 個数 |
| U7 | コントラスト（R7） | 文字 4.5:1 以上（24px 以上の太字は 3:1）、アイコン・枠線・無効状態 3:1 以上 | 既存の相対輝度計算を、文字色/背景色とボーダー色/背景色に適用 |
| U8 | 動き（R7） | `transition-duration`・`animation-duration` 300ms 以下。reduced-motion 時は 0 | 全要素の computed style。`emulateMedia({reducedMotion:'reduce'})` で再検査 |
| U9 | 拡大（R7） | viewport meta に `user-scalable=no`・`maximum-scale` が無い。200%拡大相当で横スクロールなし | meta の文字列検査。1280×900 の半分＝640×450 で `scrollWidth <= clientWidth` |
| U10 | はみ出し（R7） | 文字の切れ・はみ出しなし、ボタン文言は最大2行 | `scrollWidth > clientWidth`（既存）＋ボタン内テキストの行数（高さ÷line-height） |
| U11 | 下タブと戻る（R17） | 集中画面に `[data-nav]` が可視で無いこと、`[data-back]` が可視で 48px 以上・文字を含むこと。ルート画面に `[data-back]` が無いこと | 画面種別の表（§3）と照合 |
| U12 | 先生カードと10種目（R16） | S1 で 375×667 の初期ビューポートに `[data-teacher-card]` と `[data-group="dance"]` の子10個の rect が完全に入る | rect.bottom ≤ (innerHeight − タブ高さ) |
| U13 | 固定バー（既存） | 下固定の帯が画面下端に接していること | 既存 BAR-POSITION 判定 |
| U14 | 言葉（R7） | 禁止語ゼロ | `node --test` の禁止語テスト（`src/app/i18n` の全文字列を走査） |
| U15 | コンソール（既存） | console error・pageerror ゼロ | 既存 |

### 主要操作の数え方（U4・Ruling 18）
1. 対象: 可視の `button, a, [role=button], [role=switch], [role=radio], input, select, summary, label[for]`。
2. 初期ビューポート判定は rect がビューポートに**完全に**入るものだけ（スクロール0の状態）。
3. 除外: `[data-nav]`（下タブ）、`[data-back]`（戻る）、`[data-utility]`（言語切替など右上の補助）、`summary[data-more]`（くわしく）、`[data-alert-action]`（警告バナー内の唯一のリンク。Ruling 23）。
4. 同じ `[data-group]` 祖先を持つ要素は合わせて **1**。
5. 当てはめ（期待値）: S1＝3（初回2）、S2＝5、S5＝5、S8 ステップ0＝2。

### 手動レビュー項目（チェックリスト）
- 状態を色だけで示していない（色＋形＋文字）。
- 確認ダイアログは質問1つ・ボタン2つ・取り消しが左。
- 「〜してください」で終わる依頼は1画面に1つまで。エラー文は「何が起きたか」＋「次に押すもの」の2文。
- 本文の行の長さ: 全角35字（英70字）以内で折り返す（PC では本文の最大幅で担保）。

### 言い換え規則（禁止語 → 使う語。テストで禁止語を検出）
| 禁止 | 日本語で使う語 | 英語で使う語 |
|---|---|---|
| BPM | 速さ（数値は「♩=84」） | Speed |
| インポート・エクスポート・読み込み・書き出し / Import・Export | 受け取る・配る・ファイルに保存 | Receive・Share・Save file |
| カウントイン | はじめの合図 | Lead-in（Count-in も可） |
| 音声パック・ボイスパック / Voice pack | 声 | Voice |
| 設定を保存・ストレージ・キャッシュ・同期・エラーコード / Storage・Cache・Sync・Error code | 使わない | 使わない |

「ルーティン」「フィガー」「メトロノーム」はそのまま使ってよい（メトロノームの説明は「カチカチ音」）。

---

## 7. データモデルと保存

### 保存先（Ruling 11）
- IndexedDB `dance-count-v2` を version 1 → 2 に上げる。既存 `voice-packs` ストアを維持し、`routines`・`settings` を追加。
- 移行: localStorage の `dance-count-v2-routine-draft:*` と `dance-count-v2-ui-locale` は初回起動時に読み取って IndexedDB へ移し、移せたものだけ消す（読み取り互換のみ）。
- 初回の保存成功時に `navigator.storage.persist()` を要求（結果は画面に出さない）。
- 消失対策: 先生の録音完成時とルーティンの初回保存時に「ファイルに保存（バックアップ）」を勧める1行を各1回だけ出す。「ファイルに保存」は配布ファイルと同じ形式（§7 配布ファイル）で、同意欄は付けない。
- Service Worker のキャッシュにユーザーデータは入れない。

### ルーティン（既存形式を拡張。既存キーは変えない）
```
{ id, danceId, name, bpm|null, countInBars, source, status,
  figures:[{ id, name, counts }],                // counts は既存の文字列（例 "123a45a6"）。パーサのトークンは変えない
  provenance:{ sourceKind:'user-created'|'received', authority:null,
               authorityClaimStatus:'none', reviewStatus:'unreviewed' },
  receivedFrom?:{ distributor, receivedAt },
  createdWith:{ app:'dance-count', version },
  updatedAt }
```
- `source:'legacy-import'` は受理しない（旧24本は開発用ツールだけで扱う。Ruling 3・10）。
- 「（コピー）」等の日本語固定文言は i18n キーに置き換える。

### 声のパック
- 端末内: 既存 `recorded-voice-pack` schemaVersion 1（語ごとに Blob・onsetMs・gainDb・normalized・sourceOnsetMs・durationMs、`wordOffsetsMs`）。追加フィールド `origin:'recorded'|'received'`、`distributor?`、`consent?`。録音は MediaRecorder（iOS `audio/mp4`、Chrome `audio/webm;codecs=opus`）→ `recording-normalizer` で WAV 化して保存（Ruling 15）。
- 標準音声: `public/audio/<packId>/manifest.json`（schemaVersion 2・words.<key>.onsetMs 実測済み）。英語 `default-en-female-v1`（既存）、日本語 `default-ja-female-v1`（Ruling 5 のゲート通過後）。

### 設定
```
{ uiLocale, voiceLocale:'en', selectedVoiceId, lastDanceId,
  lastTemplateByDance:{}, speedPresetByDance:{}, customBpmByDance:{},
  metronome:true, countInBars:1, loop:true,
  voiceOffsetMsByVoiceId:{},                     // 標準音声の「声のタイミング」（読み取り専用パックのため設定側に持つ）
  hints:{ homeScreenCardDismissed, wakeLockTipShown, backupTipShownForRecording, backupTipShownForRoutine } }
```
- `voiceLocale` の初期値は UI 言語に関わらず `'en'`（D3）。録音・受け取ったパックを選ぶと `voiceLocale` はそのパックの `locale` に従う（Ruling 25）。言語を別に選べるのは標準音声だけ。
- 録音・受け取った声の「声のタイミング」はそのパックの `wordOffsetsMs` に12語同じ値で保存（既存の範囲検査 ±1000ms の内側、UI は ±200ms）。

### 配布ファイル（Ruling 4）
```
{ schemaVersion:1, type:'dance-count-bundle',
  createdAt, createdWith:{ app:'dance-count', version },
  distributor:{ name },
  consent?:{ voiceDistribution:true, consentedAt },   // voicePack を含む時は必須
  voicePack?: <exportRecordedVoicePack() の出力（schemaVersion 1, type 'dance-count-recorded-voice-pack', words.*.dataBase64）>,
  routines?: [ <ルーティン> ] }
```
- 拡張子 `.json`。ファイル名 日本語UI: `声-<先生名>-<YYYY-MM-DD>.dancecount.json`、英語UI: `voice-<name>-<YYYY-MM-DD>.dancecount.json`（ファイル名に使えない文字は `_` に置換）。
- サイズ目安 0.5〜1MB（WAV 12語）。**20MB を超えるファイルは受理しない**。
- 互換（受理するもの）: `dance-count-bundle` schemaVersion 1、既存の単体 `dance-count-recorded-voice-pack`（schemaVersion 1）。
- 検証: 声は既存 `validateRecordedVoicePack`、ルーティンは `rhythm-parser`＋`rhythm-compiler` でコンパイル。1フィガーでも不正ならそのルーティンだけ除外して名前を表示し、声と他のルーティンは取り込む。`schemaVersion` が知らない値なら取り込まず §11 の「新しいアプリで作られたファイル」。
- 受け取った声には `origin:'received'`・`distributor`・`consent` を記録し、S7 で「○○さんの声」と表示。削除ボタンを常設。

### 曲の口（Ruling 20・型だけ）
- `TrackProfile { id, danceId, title, file, durationMs, beatsPerBar, tempo:{kind:'constant', bpm, firstBeatMs}|{kind:'beatMap', beatsMs:number[]}, license:{kind:'CC0'|'PD-recording'|'CC-BY', source, url, note}, measuredAt }`。v1 は実データなし。練習セッション状態に `track:null` を予約。

---

## 8. 配る・受け取る

### 先生（どの端末でも）
1. S8 で12語を録音 →「配る」（または S7 の自分の声 →「配る」、S3 のルーティン →「配る」）。
2. S9 で配るものを選び、名前と同意 →「ファイルを作る」。
3. iPhone・Android: 共有シートで LINE／メール／AirDrop を選ぶ。PC・共有できないブラウザ: ダウンロードされたファイルを LINE／メールに添付。
4. 「生徒への案内文をコピー」を押し、メッセージに貼って送る。

### 生徒
| 端末 | 手順 | 詰まりどころと対策 |
|---|---|---|
| iPhone | LINE の添付をタップ → 右上の共有 →「"ファイル"に保存」→ Dance Count を開く →「先生の声で練習」→「ファイルから受け取る」→「ファイルを選ぶ」→「最近の項目」から選ぶ →「使う」 | LINE から直接アプリへ渡せない（iOS に共有ターゲットなし）→ アプリ内図解。ホーム画面アプリでファイル選択が開かない報告（F3）→「Safari で開いて受け取る」リンク。保存先を忘れる →「最近の項目」を最初に案内 |
| Android | LINE の添付 → 共有 →「Dance Count」を選ぶ → 確認画面 →「使う」 | ホーム画面に追加していないと共有先に出ない → iPhone と同じ「保存 → ファイルを選ぶ」 |
| PC | メールの添付を保存 → ブラウザで Dance Count →「先生の声で練習」→「ファイルから受け取る」→ 選ぶ →「使う」 | PC で練習する人は少ない →「スマホで受け取るのが便利です」と案内文に入れる |

### 生徒への案内文（S9 でコピーされる定型文）
日本語:
```
Dance Count で、私の声のカウントを使えます。
【iPhone】1. このファイルを開き、右上の共有ボタン →「"ファイル"に保存」
2. Dance Count を開き「先生の声で練習」→「ファイルから受け取る」
3. 「最近の項目」からこのファイルを選び「使う」
【Android】このファイルを長押し → 共有 →「Dance Count」→「使う」
（スマホで受け取るのが便利です）
アプリ: <公開URL>
```
English:
```
You can practise with my voice in Dance Count.
[iPhone] 1. Open this file, tap Share (top right) → "Save to Files"
2. Open Dance Count → "Practice with your teacher's voice" → "Receive from a file"
3. Choose this file from "Recents" and tap "Use"
[Android] Long-press this file → Share → "Dance Count" → "Use"
(It's easiest on your phone.)
App: <public URL>
```
`<公開URL>` はビルド時の定数（§16-1 で確定）。

### 技術
- 書き出し: `navigator.canShare({files:[file]})` が真なら `navigator.share`、偽なら `<a download>`。
- Android の受け取り: manifest に `share_target`（`method:'POST'`, `enctype:'multipart/form-data'`, `params.files:[{name:'bundle', accept:['application/json','.json']}]`）。Service Worker が POST を受けてファイルを一時保存し `#/receive` へリダイレクト。
- iOS は share_target 不可（F6）。ファイル選択が全端末共通の正。

---

## 9. 音声

### 標準音声
- 英語 `default-en-female-v1`（既存・en-US-Neural2-F・onset 実測済み）。
- 日本語 `default-ja-female-v1`（Ruling 5）: **開発時だけ** Google Cloud TTS（`ja-JP-Neural2-B` 第一候補、`-C`/`-D` 比較）で `count-vocabularies` の ja-JP 12語を生成 → `tools/generate-google-voices.js` → `tools/measure-voice-onsets.js` で onset 実測 → manifest schemaVersion 2 で同梱。
  - 採用ゲート: (1) 12語すべて onset 実測済み (2) ひとみうさが試聴して「数え言葉として自然」 (3) `timing:audit` 相当の鳴り合わせ確認。不自然な語は speakingRate／SSML で再生成。それでも駄目なら人の録音（ひとみうさ）を録音パック形式で同梱。
- **実行時に TTS・外部 API を呼ばない**。
- 声の言語は UI 言語と独立（Ruling 12）。初期値は英語（D3）。

### タイムライン（第2の時間計算を作らない）
- メトロノーム・声・ハイライトは `rhythm-compiler` の整数 tick（`TICKS_PER_BEAT=960`）から導く。tick → ms は `tempo-map.js` の1箇所（v1 は `constantTempo` のみ稼働）。
- 表示は `audioContext.currentTime`（＋取れれば `outputLatency`）から tick を読む。

### iOS 対策（Ruling 6）
1. 起動時に `if ('audioSession' in navigator) navigator.audioSession.type = 'playback'`。
2. ▶（と「前回」カード）の**同じタップ内**で AudioContext を生成・`resume()`・無音バッファを1回再生。
3. 再生開始から 2 秒以内に `state !== 'running'` または `currentTime` が進まない → S2 上部に警告バナー（§11）。
4. `statechange` で `suspended`/`interrupted` を検知したら再生を止め「もう一度 ▶ を押してください」。
5. これらは `src/app/platform/audio-context.ts` に閉じる。

### スリープ防止
- ▶ のタップ内で `navigator.wakeLock.request('screen')`、`visibilitychange` で再取得。停止時に解放。取れない端末は S2 の1回だけの案内（§4）。
- 画面が暗くなっても音が続くかは前提にせず、実機で確認（§14）。続かない場合の次善策は無音 `<audio>` ループの併用（Ruling 6 の代償）。

### Bluetooth
- 自動補正しない。メトロノームと声は同じ音声クロックなので互いにずれない。画面のハイライトにだけ `outputLatency`（Safari 18.4 以降）を足す。取れなければ 0。手動つまみは「くわしく」に ±200ms（v1 必須ではない）。

---

## 10. 技術構成

### 構成（Ruling 1）
- Vite ＋ Preact ＋ TypeScript（UI 層のみ）。エンジンは JS のまま（`allowJs` で型を拾う。TS 化しない）。
- PWA: `vite-plugin-pwa`（Workbox）。実装前に Context7 で `vite-plugin-pwa`・`preact`・`vite` の現行 API を確認する（CLAUDE.md）。
- ディレクトリ:
  - `src/engine/` … 旧 `src/v2/` の全 .js（`data/` を含む）を**無改変で移動**。変えてよいのは `?v=` の除去と i18n 化が必要な日本語固定文言（エラーメッセージ・「（コピー）」）だけ。新規 `tempo-map.js`。
  - `test/engine/` … 旧 `test/v2/`。import パスだけ追従。新規 `tempo-map.test.js`。
  - `src/app/` … `screens/` `components/` `state/` `platform/` `i18n/`。
  - `src/app/platform/` … `audio-context.ts` `recorder.ts` `storage.ts`（IndexedDB）`files.ts`（share／download／pick）`wake-lock.ts`。`window`・`navigator` の直接参照はここだけ（lint で禁止）。Capacitor 化で差し替えるのはこの面。
  - `public/audio/` … 標準音声。`legacy/` … 旧 `public/`（開発用ページ・旧ルーティン関連。そのまま動く状態で残す。Ruling 10）。
  - `tools/` … 既存ツールは `src/engine` を参照するようにパスだけ追従。

### エンジン移設の手順と既存テスト維持
1. 移設前に `npm test`（95件緑）を確認し、`npm run timing:audit` の `output/all-dance-timing-audit.json` を `output/timing-audit-before.json` として保存。
2. `git mv src/v2 src/engine`、`git mv test/v2 test/engine`、`git mv public legacy`（音声は `public/audio/` に戻す）。
3. import パスと `package.json` の `test` を `node --test test/engine/*.test.js` に。`html-module-syntax.test.js`・`ui-assets.test.js` は `legacy/` を見るよう修正。
4. `npm test` 全緑、`timing:audit` を再実行し `generatedAt` を除いて diff ゼロ。
5. `tempo-map.js` を追加し、`audio-engine.js`・`rhythm-compiler.js`・`dance-timing-audit.js` の tick→秒をここへ集約（constant を既定で注入。`timeline-view-model.js` に該当計算はない。2026-10-11 訂正）。再び `npm test`・`timing:audit` diff ゼロ。

### `?v=` と `no-store` の撤去
- `audio-engine.js` の `import ... from './voice-pack-loader.js?v=…'` を含め、`src/engine` 内の `?v=` を全て除去（Vite がハッシュ名を付ける。二重インスタンス化の防止）。
- `voice-pack-loader.js` の `fetch(..., { cache:'no-store' })` を外し、既存の `fetchImpl` 注入口で呼び出し側がキャッシュ方針を決める。

### Service Worker
- アプリ本体（HTML・JS・CSS・アイコン・Inter）と標準音声の wav・manifest を precache（合計が数MBを超える場合、音声は初回再生時に runtime cache・CacheFirst）。
- 新しい版を検出したら「新しい版があります」バナー＋「再読み込み」ボタン（自動で再読み込みしない）。
- share_target の POST を処理（§8）。
- ユーザーデータは対象外（IndexedDB）。

### Capacitor 前提
- `base:'./'`（相対パス）、ハッシュルーティング、サーバー API ゼロ、端末依存は `platform/` のみ。manifest: `name:"Dance Count"`、`short_name:"Dance Count"`、副題「for Ballroom」は画面の見出しのみ（D2）、`display:"standalone"`、`share_target`。

### tempo-map の口（Ruling 20）
- `src/engine/tempo-map.js`（純粋）: `constantTempo(bpm)` と `beatMapTempo(beatsMs[], beatsPerBar)`。どちらも `tickToMs(tick)`・`msToTick(ms)`。constant は `tick × 60000 / (bpm × 960)` と同値。beatMap は拍時刻の区分線形補間、範囲外の外挿は、最初の拍より前は最初の拍間隔、最後の拍より後は最後の拍間隔（2026-10-11 訂正）。
- テスト: (a) constant が現行計算と全 tick で一致 (b) beatMap が拍時刻をちょうど返す (c) 単調増加。
- 曲の音の再生・選択 UI・同梱・計測ツールは作らない（§15）。

### 言語
- `ui-messages.js` の en／ja-JP を `src/app/i18n/` に移し、既存のキー一致テストと禁止語テスト（U14）を掛ける。言語追加できる作り（キー一致テストが新言語にも効く）は維持。

### 公開
- 公開先は dancemap.jp のサブドメイン（D4）。配信基盤・DNS の設定、push・デプロイは**ひとみうさの明示許可の後**だけ。

---

## 11. エラー・例外

共通: 何が起きたか1文＋次に押すボタン1〜2個。技術用語・コード番号なし。

| 状況 | 出す場所 | 日本語 | 英語 | ボタン |
|---|---|---|---|---|
| 音が鳴らない（2秒判定） | S2/S5 上部バナー | 音が出ていません。本体の消音スイッチを確かめて、もう一度 ▶ を押してください。 | No sound is playing. Check the silent switch and press ▶ again. | 音が出ない時は（→ S11） |
| 再生が中断（電話・ロック復帰） | S2/S5 の1行 | 再生が止まりました。もう一度 ▶ を押してください。 | Playback stopped. Press ▶ again. | ▶（点滅させない） |
| マイク拒否 | S8 | マイクが使えない設定になっています。 | The microphone is turned off for this app. | 設定の開き方／あとで |
| マイク非対応 | S8 | このブラウザでは録音できません。Safari（iPhone）か Chrome で開いてください。 | This browser can't record. Please open in Safari (iPhone) or Chrome. | 戻る |
| 録音が無音・短すぎ | S8 の語の画面 | 声が入っていませんでした。もう一度録音してください。 | We couldn't hear your voice. Please record again. | 録音する |
| 保存失敗・容量不足 | 発生画面 | 保存できませんでした。空き容量を確かめてください。 | Couldn't save. Please check free space. | ファイルに保存 |
| 壊れたファイル・別の種類 | S10 | このファイルは読めませんでした。先生に送り直してもらってください。（ファイル名） | This file couldn't be read. Ask your teacher to send it again. | ファイルを選ぶ |
| 20MB 超 | S10 | このファイルは大きすぎて受け取れません。 | This file is too large. | ファイルを選ぶ |
| 新しすぎる schemaVersion | S10 | 新しいアプリで作られたファイルです。アプリを更新してください。 | This file was made by a newer version. Please update the app. | 更新する（再読み込み） |
| 一部のルーティンが不正 | S10 取り込み結果 | ルーティン「○○」は読めませんでした。（列挙。声は取り込む） | Routine "○○" couldn't be read. | 使う |
| オフラインで音声未キャッシュ | S2/S7 | この声はまだ端末に入っていません。インターネットにつないで一度再生してください。 | This voice isn't on your device yet. Connect to the internet and play once. | 戻る |
| 共有シート不可 | S9 | （案内なし。ダウンロードに切替えてファイル名を表示） | — | — |
| WakeLock 不可 | S2 | 1回だけの案内（§4 S2） | Your screen may dim during practice. A longer Auto-Lock helps. | 閉じる |

---

## 12. 法務（Ruling 8・D5）

- 運営者: **くうが株式会社**。S13・プライバシーポリシー・ストア情報に表記。
- プライバシーポリシー（日英、S13 に同梱する静的ページ）の芯:
  - 録音・ルーティン・設定は端末内にだけ保存。運営者はデータを受け取らない。
  - 解析ツールなし（v1 は入れない）。外部送信なし（フォントも同梱、§5）。
  - ファイルの受け渡しは利用者自身が行う（LINE・メール等の各サービスの規約に従う）。
  - データは S13「データを全て消す」かブラウザのサイトデータ削除で消せる。
- マイク: OS の許可ダイアログの**前**に S8 の説明画面（何を録るか・端末内にだけ保存・いつでも削除）→「録音をはじめる」のタップで初めて `getUserMedia`。
- 先生の声の配布: S9 の同意チェック（声を入れる時だけ・必須）。ファイルに `consent:{voiceDistribution:true, consentedAt}` と `distributor.name` を記録。受け取り側は「○○さんの声」と表示し、削除ボタンを常設。
- 表現: 「公式・監修済みとは名乗らない」。S13 に「このアプリのカウントは公式のもの・監修を受けたものではありません」を明記。団体名・級は出さない。S5 の作成者の1行（§4）。
- 問い合わせ先は **info@kugainc.com**（D9）。

---

## 13. 実装の段

| 段 | 内容 | 依存 | 並列 | 担当目安 | 完了条件 |
|---|---|---|---|---|---|
| 0 | 見た目の決定 | — | — | — | **完了**（D8・モック更新済み） |
| 1 | 器: Vite＋Preact＋TS、`src/engine` 移設（§10 の手順）、`legacy/` 退避、platform アダプタの空実装、i18n 基盤、ハッシュルーター（§3）、`tempo-map.js`＋テスト＋tick→秒の集約 | — | — | Opus | `npm test` 全緑（95＋新規）、`timing:audit` が `generatedAt` 以外 diff ゼロ、`npm run dev` で下タブ3つの空画面 |
| 2 | 生徒の再生（S1・S2）: タイル、前回・先生カード、戻る／タブ出し分け、再生、速さ3択、トグル、現在カウント、くわしく、iOS 解除、WakeLock、警告バナー、`ui:check` 移植 | 1 | 3・6 と並列可（別ディレクトリ） | Opus | G1・G2、`ui:check` で S1/S2 の U1〜U15 通過（S1=3・S2=5・U12）、iPhone 実機でマナーモード時に鳴る |
| 3 | ルーティン（S3・S4・S5）: IndexedDB v2 と移行、編集、試聴、名前補完、範囲 | 1 | 2・6 と並列可 | Sonnet | 作成→保存→再起動で残る、不正カウントの赤枠、`ui:check` 通過 |
| 4 | 声（S7・S8）: 一覧、録音ウィザード、正規化再利用、試聴・聞き比べ、声のタイミング | 2 | 6 と並列可 | Opus | iPhone/Chrome で12語録音→ワルツが自分の声で鳴る、無音判定、`ui:check` 通過 |
| 5 | 配る・受け取る（S9・S10）: bundle、share／download、share_target、取り込み検証、案内文 | 3・4 | — | Sonnet | G6、壊れた／大きすぎ／新しすぎるファイルの画面 |
| 6 | 日本語標準音声: 生成・onset 実測・聴感ゲート・同梱 | 1 | 2〜5 と並列可（tools のみ） | Sonnet＋ひとみうさ試聴 | Ruling 5 のゲート3点 |
| 7 | PWA: SW precache、更新バナー、S12、オフライン再生、`persist()`、manifest | 2・6 | — | Sonnet | G7、更新バナー、インストール可能（§14） |
| 8 | 仕上げ: 日英文言の監修、S11・S13、エラー全件、禁止語テスト、アクセシビリティ最終 | 2〜7 | — | Sonnet＋別エージェントのレビュー | G3・G8、実機チェックリスト全項目 |

- 並列は別ディレクトリの段だけ（worktree 運用）。同じアプリ内の画面同士は逐次。
- 各段の終わりに別エージェントのレビュー → 最後に Opus 総合レビュー → 修正便1回 → 差分再レビュー1回。
- push・デプロイ・DNS はひとみうさの明示許可の後だけ。

---

## 14. 検証方法

### 自動
- `npm test`: エンジン（移設前 95件）＋新規（tempo-map、i18n キー一致・禁止語、bundle の書き出し／読み込み／互換／拒否、設定の移行）。
- `npm run timing:audit`: 移設前の `output/timing-audit-before.json` と、`generatedAt` を除いて diff ゼロ（例 `jq 'del(.generatedAt)'` で両方を整形して `diff`）。段1の移設直後と tempo-map 集約直後の2回。
- `npm run ui:check`: §6 の U1〜U15、全画面、375×667 と 1280×900、くわしく開閉の両方。
- Playwright（MCP または `playwright-core`）で 375 と 1280 の両方を開き、スクロール領域ごと上から下まで撮って目視。撮影ファイルは `~/.playwright-mcp/` に。検収後は自動操作ブラウザを必ず閉じる。
- インストール可能性: Lighthouse の PWA 区分は現行版で廃止されているため、Chrome DevTools の Application → Manifest でインストール可能（エラーなし）と、SW の precache 一覧に標準音声が入っていることで確認する。

### iPhone 実機（ひとみうさの iPhone）
- [ ] マナーモードのまま ▶ で声とメトロノームが鳴る
- [ ] 2秒判定のバナーが、音量0でなく本当に鳴らない時だけ出る
- [ ] ロック → 復帰で「もう一度 ▶」の案内が出て、▶ で再開できる
- [ ] 電話着信など中断の後に案内が出る
- [ ] 再生中に画面が暗くならない（WakeLock）。暗くなる場合でも音が続くか記録
- [ ] AirPods で声とメトロノームがずれない、ハイライトの遅れが気にならない
- [ ] ホーム画面に追加 → そこから起動して鳴る
- [ ] 機内モードでホーム画面アプリから鳴る（G7）
- [ ] 12語の録音（マイク許可の前に説明画面が出る）→ 自分の声でワルツ
- [ ] 配る → 共有シートに LINE が出る
- [ ] LINE で受け取ったファイル →「"ファイル"に保存」→ S10「ファイルを選ぶ」が開き、取り込める
- [ ] 375px 相当で文字の切れ・はみ出しがない、拡大しても横スクロールが出ない
- Android 実機（入手できれば）: share_target で LINE から直接 S10 に届く。

---

## 15. 範囲外（v1 ではやらない）

- 曲の同梱と再生、曲の選択 UI、拍位置の計測ツール、ライセンス台帳（第2弾。D7・Ruling 20。候補調査は `docs/app-v1/music-sources.md`）。ユーザー自身の曲の読み込み（範囲外、D7）。
- リンクでの共有（サーバー）。iOS の受け取り脱落が多ければ次版で前倒し（Ruling 4 の代償）。
- App Store / Google Play の申請、課金。
- 3言語目以降（作りは言語追加できるまま）。
- 旧ルーティン24本の監修・公開、カウント候補の提示（Ruling 3）。
- 解析ツール（Ruling 8）。
- ダーク表示（3案とも明るい背景が前提。§5）。
- PC 向けの専用設計（Ruling 14・21。S2/S5 の2領域配置は同じ DOM の CSS 並べ替えに限る）。
- 拍子（2/4・3/4・4/4）の表示（Ruling 22）。

---

## 16. 未決事項

裁定台帳・PO 決定で決まっていない点。実装は下の「それまでの扱い」で進め、決まり次第この節を更新する。（旧 1・2・3・6・7 は Ruling 21〜25 で裁定済み。本文に反映し、ここから削除した。）

1. **公開URL（サブドメイン名）と配信基盤**（ひとみうさ判断）: D4 は「例 count.dancemap.jp」。確定名と基盤は公開直前にひとみうさの許可を取る。それまでの扱い: 案内文の URL はビルド時定数 `PUBLIC_APP_URL` にし、開発中は空なら行ごと出さない。
2. ~~プライバシーポリシーの問い合わせ先~~ → **決定（D9）: info@kugainc.com**（2026-10-11 ひとみうさ）。法務ページ・アプリについて画面に表示する。
