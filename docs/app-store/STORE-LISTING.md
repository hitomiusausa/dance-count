# App Store に載せる文と答え（下書き）

作成: 2026-11-03（く！ちゃん）　状態: **下書き。ひとみうさの確認と決定が要る**（★の所）

アプリが実際にすることだけを書く（`src/app/i18n/about.ts` と同じ方針）。「公式」「監修済み」とは書かない（`aboutNotOfficial`）。

## 1. 名前など

| 項目 | 日本語 | English | 上限 |
|---|---|---|---|
| アプリ名（ストア） | Dance Count for Ballroom | Dance Count for Ballroom | 30 文字 |
| ホーム画面の名前 | Dance Count（`CFBundleDisplayName`） | Dance Count | — |
| サブタイトル | 社交ダンスのカウントを声で練習 | Practice ballroom counts by ear | 30 文字 |
| カテゴリ ★ | 主: 教育／副: ミュージック（案） | Primary: Education / Secondary: Music | — |
| 価格 | 無料（最初の版。決定 2） | Free | — |
| 出す国 | 日本・アメリカ・イギリス・オーストラリア（決定 6） | — | — |
| Bundle ID | `jp.dancemap.count.app`（決定 10） | — | — |
| 販売者・著作権者 | KUGA K.K.（日本語の表示は「くうが株式会社」。D82） | Seller / Copyright: KUGA K.K. | App Store Connect の法人名（Apple の開発者登録）と同じにする |
| SKU ★ | `dance-count-ios`（案。uchikare は `uchikare-ios`） | — | — |

## 2. 説明文

### 日本語（案）

社交ダンスの「カウント」を、声とメトロノームと画面で練習するアプリです。

● 10 種目の基本のカウント
ワルツ・タンゴ・ヴィエニーズワルツ・スローフォックス・クイックステップ・ルンバ・チャチャチャ・サンバ・パソドブレ・ジャイブ。「1・2・3」や「スロー・クイック」を、拍ちょうどのタイミングで声が数えます。

● 曲と一緒に（音楽）
練習用の曲に、カウントの声を重ねて鳴らせます。速さは 3 段階。曲の拍にカウントを合わせてあります。

● 自分のルーティン
フィガーを並べて、自分のルーティンを作れます。区間を選んで、くり返し練習できます。

● 先生の声で
先生が自分の声でカウントを録音し、ファイルにして生徒に渡せます。生徒は受け取った声で練習できます。

● 電波が無くても
声と曲はアプリに入っているので、練習場で電波が無くても使えます。録音した声やルーティンは、この端末の中にだけ保存されます。

※ このアプリのカウントは、公式のもの・監修を受けたものではありません。

### English (draft)

Practice ballroom dance counts with a voice, a metronome and the screen.

● Basic counts for 10 dances
Waltz, Tango, Viennese Waltz, Slow Foxtrot, Quickstep, Rumba, Cha Cha Cha, Samba, Paso Doble and Jive. A voice counts “1, 2, 3” or “slow, quick” exactly on the beat.

● With music
Play practice music with the counting voice on top, at three speeds. The counts are aligned to the beats of each track.

● Your own routines
Put figures in order to build your own routine, choose a part and repeat it.

● Your teacher's voice
Teachers can record the counts in their own voice and share them as a file. Students practise with the voice they received.

● Works offline
Voices and music are inside the app, so it works in the studio without a connection. Your recordings and routines stay on this device.

Note: the counts in this app are not official and have not been reviewed by any organization.

種目名はアプリの表示（`src/engine/ui-messages.js`）と同じ。ボタンの名前（Use・Make・Play・Music・Record your voice）も `src/app/i18n/messages.ts` と同じ。
★ 確かめること: 「10 種目」と音楽の種目（今はワルツ・タンゴ・チャチャチャ・ルンバ・サンバ）の書き分け。

### キーワード（100 文字・カンマ区切り。案）
- 日本語: `社交ダンス,ボールルーム,カウント,ワルツ,タンゴ,ルンバ,チャチャチャ,サンバ,ジャイブ,ステップ,練習,メトロノーム,競技ダンス`
- English: `ballroom,dance,count,waltz,tango,rumba,cha cha,samba,jive,foxtrot,quickstep,metronome,practice`

## 3. URL ★

| 項目 | 案 | メモ |
|---|---|---|
| プライバシーポリシー | `https://count.dancemap.jp/privacy`（新しく作る） | 今は「このアプリについて」（`#/about`）の中だけ。App Store は URL が要る。下の §5 の文言の違いも直す |
| サポート | `https://count.dancemap.jp/support` か問い合わせのメール | 問い合わせ先は `src/app/i18n/about.ts` の `CONTACT_EMAIL` |
| マーケティング（任意） | `https://count.dancemap.jp` | — |

## 4. 審査の人へのメモ（English・案）

```
About the app
Dance Count is a practice tool for ballroom dancers. It counts the basic rhythm of 10 ballroom
and Latin dances with a recorded voice and a metronome, scheduled on one sample-accurate audio
timeline, and highlights the current beat on screen. It can also play practice music with the
counting voice aligned to the beats of each track.

No account is needed. All content (voices, music, screens) is bundled in the app and works
offline. Nothing the user creates leaves the device unless the user shares a file themselves.

How to try it
1. Tap "Use" → choose "Waltz" → tap ▶ Play. The voice counts "1 2 3" with the metronome.
2. Bottom tab "Music" → choose a track → ▶ Play to hear the count over the music.
3. "Make" → "Record your voice" records the 12 count words (microphone permission is asked here).

Permissions
Microphone: used only on the recording screen, while the user records their own counting voice.
Recordings are saved on the device only.

Contact: <support e-mail>
```

★ 4.2（最小限の機能）について: uchikare の記録どおり「Web を包んだ形」は 4.2 の受理が保証されない。このアプリは Web を表示するだけではなく、**画面・声・曲をすべて同梱し電波なしで動く**・**音の時刻をサンプル単位で組む練習道具**である点をメモに書いた。必要なら iOS らしい機能（画面を点けたまま・触覚の合図など）を足すかを決める。

## 5. App Privacy（データの収集）の答え ★

- **iOS アプリ: 「データを収集しない（Data Not Collected）」で答える案。**
  - 根拠（2026-11-02 実測）: アプリの中を再現して全画面を回り、カウントと音楽を鳴らしても、アプリの外への通信は 0 件（31 件はすべて同梱のファイル）。`PrivacyInfo.xcprivacy` も「追跡なし・集めるデータなし」。
  - 録音・ルーティン・設定は端末の IndexedDB だけ（`about.ts` の aboutPrivacy1 と同じ）。
- **★ 文言の食い違い**: 「このアプリについて」のプライバシーの文（`aboutPrivacy2`・`aboutPrivacy3`）は Web 版向けで、「Cloudflare Web Analytics で数えている」「配信サーバーが記録することがある」と書いている。iOS アプリではどちらも起きない（Cloudflare の解析は Web の配信の時に自動で差し込まれるもので、同梱したアプリには入らない）。アプリでは別の文にするか、両方に当てはまる書き方にするか、ひとみうさが決める（法務の確認待ちの文なので、く！ちゃんは変えていない）。

## 6. 年齢区分の答え（案）

暴力・性的な内容・ギャンブル・薬物・ホラー・成人向けの話題・ユーザー同士のやりとり・Web の自由な閲覧・位置情報: すべて「なし」。→ 一番下の区分（4+）になる見込み。★ 2025 年からの新しい質問（医療・ウェルネスの話題、アプリ内のコントロールなど）は App Store Connect の画面で答える。

## 7. 輸出（暗号化）の答え

`ITSAppUsesNonExemptEncryption = false`（Info.plist に設定済み）。アプリは通信しない・独自の暗号を使わない。TestFlight で聞かれない。

## 8. スクリーンショットの計画

| 種類 | 大きさ（必須） | 作り方 |
|---|---|---|
| iPhone 6.9 インチ | 1320×2868（縦） | iPhone 16 Pro Max のシミュレーターか、同じ大きさの再現（440×956・3 倍） |
| iPad 13 インチ | 2064×2752（縦） | iPad Pro 13 インチのシミュレーターか、同じ大きさの再現（1032×1376・2 倍） |

候補の画面（日本語・英語それぞれ 4〜5 枚）: ①種目を選ぶ（S1） ②ワルツを鳴らしている（S2・拍の表示） ③曲と一緒に（U4） ④ルーティン（S5） ⑤先生の声を録る（S8）。本物の曲を入れてから撮る（今のテスト用のクリックの曲は写さない）。
