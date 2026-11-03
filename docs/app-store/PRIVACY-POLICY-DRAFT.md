# プライバシーポリシー・サポートのページ（下書き）

作成: 2026-11-03（く！ちゃん）　状態: **下書き・法務とひとみうさの確認待ち**（★）

App Store には「プライバシーポリシーの URL」と「サポートの URL」が要る（[`STORE-LISTING.md`](./STORE-LISTING.md) §3）。
ここに書くのは、コードと実測で確かめた事実だけ（出典を各項に書いた）。法的な約束（準拠法・免責・損害賠償・保証）は書かない（`src/app/i18n/about.ts` と同じ方針）。

## 0. 決めること ★

1. **置き場所**: 案 `https://count.dancemap.jp/privacy` と `/support`。今の Web 版はハッシュの画面（`#/about`）だけで、単独のページが無い。`check-dist` は `index.html` 以外の HTML を止めるので、作る時は番人の例外か、別の置き方を決める。
2. ~~運営者の英語の名前~~ → **KUGA K.K. に決定**（ひとみうさ 2026-11-03・`docs/app-v1/rulings.md` D82）。アプリの表示も合わせる。
3. ~~アプリの「このアプリについて」のプライバシーの文~~ → **案 A（アプリと Web で分ける）に決定・実装済み**（D83）。

## 1. 事実の棚卸し（2026-11-03）

| 事実 | iOS アプリ | Web 版 | 出典 |
|---|---|---|---|
| 録音した声・受け取った声・ルーティン・設定は端末の中だけ（IndexedDB） | ○ | ○ | `about.ts` aboutPrivacy1・`src/app/platform/storage.ts` |
| 運営者のサーバーへの送信 | なし | なし | 同上 |
| 利用状況の解析（Cloudflare Web Analytics・クッキーなし） | **なし**（同梱のアプリに入らない） | あり（配信のゾーンで自動で差し込む） | `about.ts` D79 の注記・アプリの中から外への通信 0 件（全画面＋カウントと音楽の再生で実測） |
| 配信サーバーの記録（アクセスの日時など） | **なし**（通信しない） | あり得る | aboutPrivacy3・同上の実測 |
| マイク | 声を録音する画面でだけ。許可の時と、合図と録音のあいだ（約 6 秒）だけ開く | 同じ | aboutPrivacy4・`src/app/platform/recorder.ts` |
| 「配る」で作るファイル | 名前・声・ルーティン・ひとこと・日時・見分け用の番号（利用者が自分で渡した時だけ外に出る） | 同じ | aboutPrivacy5 |
| 消し方 | 「データを全て消す」・アプリを消す | 「データを全て消す」・ブラウザのサイトのデータ | aboutPrivacy6 |
| 広告・追跡 | なし（`PrivacyInfo.xcprivacy`: 追跡なし・集めるデータなし） | なし | `ios/App/App/PrivacyInfo.xcprivacy` |
| 書体・音声の外部からの取り寄せ | なし（同梱） | なし | aboutPrivacy2 |

## 2. プライバシーポリシー（案）

### 日本語

**Dance Count プライバシーについて**

運営：くうが株式会社（KUGA K.K.）　問い合わせ：info@kugainc.com

1. **保存するもの** — 録音した声・受け取った声・ルーティン・設定は、お使いの端末の中にだけ保存されます。運営者がこれらを受け取ることはありません。
2. **マイク** — マイクは、声を録音する画面でだけ使います。許可を求める時と、「録音する」「録り直す」を押してから、合図と録音のあいだ（約 6 秒）だけ開き、すぐ閉じます。
3. **「配る」で作るファイル** — 「配る」で作ったファイルには、入力した名前と、入れた声・ルーティン・ひとこと、作った日時、見分け用の番号が入ります。ファイルは、あなたが自分で渡した相手にだけ届きます。
4. **App Store のアプリ** — アプリは、画面・声・曲をすべて中に持っていて、使っている間にインターネットへ情報を送りません。利用状況の解析・広告・追跡はありません。
5. **Web 版（count.dancemap.jp）** — どのくらい使われているかを知るために Cloudflare Web Analytics を使っています。クッキーは使わず、開いたページ・日時・ブラウザの種類・国や地域といった訪問の情報だけを数えます。アプリの中のデータは送られません。配信するサーバーには、ブラウザが通常送る情報（アクセスの日時など）が記録されることがあります。
6. **消し方** — 「設定 → プライバシー・アプリについて → データを全て消す」で消せます。アプリを削除しても消えます。Web 版はブラウザの設定（サイトのデータの削除）でも消せます。
7. **変更** — この内容を変える時は、このページでお知らせします。（最終更新日：★）

### English

**Dance Count — Privacy**

Operated by KUGA K.K.  Contact: info@kugainc.com

1. **What is stored** — Recorded voices, received voices, routines and settings are stored only on your device. The operator never receives them.
2. **Microphone** — The microphone is used only on the voice recording screen: when asking for permission, and after you tap “Record” or “Record again”, only during the countdown and the recording (about 6 seconds). It is closed right after.
3. **Files made with “Share”** — A file made with “Share” contains the name you entered, the voices, routines and note you included, the date it was made, and an ID used to recognise files from the same person. It reaches only the people you give it to.
4. **The App Store app** — The app carries all screens, voices and music inside it and sends no information over the internet while you use it. There are no analytics, ads or tracking.
5. **The web version (count.dancemap.jp)** — To learn how much it is used, we use Cloudflare Web Analytics. It uses no cookies and only counts visits: the page opened, the time, the type of browser, and the country or region. Data in the app is not sent. The server that delivers the files may record what browsers normally send, such as the time of access.
6. **Deleting data** — Use “Settings → Privacy & about this app → Delete all data”, or delete the app. On the web, you can also clear the site data in your browser settings.
7. **Changes** — We will post any change on this page. (Last updated: ★)

画面の名前（「設定 → プライバシー・アプリについて → データを全て消す」／“Settings → Privacy & about this app → Delete all data”）は `src/app/i18n/messages.ts` の `settingsAbout`・`deleteAllData` と同じ。

## 3. アプリの「このアプリについて」の文 → **案 A に決定・実装済み**（ひとみうさ 2026-11-03・`docs/app-v1/rulings.md` D83）

今の `about.ts` の `aboutPrivacy2`（Cloudflare）・`aboutPrivacy3`（配信サーバー）・`aboutPrivacy6`（ブラウザの設定）は Web 版向け。iOS アプリでは当てはまらない。

- **案 A（おすすめ）: アプリと Web で文を分ける** — アプリの中（`isNativeApp()`）では 2・3 の代わりに「このアプリは、使っている間にインターネットへ情報を送りません。利用状況の解析・広告はありません。」、6 は「アプリを削除しても消えます」に。表示を分ける所は `src/app/platform/native.ts` の判定 1 つ。
- 案 B: 両方に当てはまる 1 つの文にする（「Web 版では…・App Store のアプリでは…」）。文が長くなる。
- 案 C: そのまま（アプリにも Web 版の説明が出る）。審査で App Privacy の「データを収集しない」と食い違って見えるおそれ。

## 4. サポートのページ（案）

- 問い合わせ: info@kugainc.com（`about.ts` の `CONTACT_EMAIL`）
- よくある質問（アプリの「困った時は」と同じ中身）: 音が出ない時（消音スイッチ・音量）・録音できない時（マイクの許可）・声のファイルの受け取り方・データの消し方
- 「このアプリのカウントは、公式のもの・監修を受けたものではありません。」（`aboutNotOfficial`）
