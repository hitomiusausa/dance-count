# App Store リリース計画

作成: 2026-11-02　枝: `claude/app-store-release-prep-1s6fb9`

App Store に iOS アプリ（iPhone・iPad）として出すための計画と進み具合をまとめる。Web 版（`count.dancemap.jp`）は今までどおり残し、**同じ `dist` をアプリに同梱する**（仕様 §10「Capacitor 前提」・Ruling 1）。

## 1. 決めたこと（ひとみうさ 2026-11-02）

| # | 項目 | 決定 |
|---|---|---|
| 1 | アプリの作り方 | Capacitor で今の Web アプリを包む（Swift で作り直さない） |
| 2 | 課金 | **案1: 最初は無料で出す**。課金は後の版で、App Store の決済の規則を確かめてから決める（Stripe の設計 `docs/superpowers/specs/2026-10-24-paid-subscription-design.md` は iOS にそのまま持ち込まない） |
| 3 | 音楽 | 入れる。曲は有料の Suno で作成し、権利は確認済み（ひとみうさ）。未完成の部分は最後に全部そろえる |
| 4 | 開発者登録 | 法人（KUGA K.K.）。D-U-N-S 番号は取得済み（番号は App Store Connect にだけ入れる） |
| 5 | iPad | 対応する |
| 6 | 出す国 | 日本・アメリカ・イギリス・オーストラリア（日本語・英語） |
| 7 | Apple 側の手続き | 開発者登録・App Store Connect・契約／銀行／税・Xcode と署名は、別のアプリで済んでいる（ひとみうさ） |
| 8 | 音楽の時期 | **最初の版から入れる**（最初の版は無料なので、音楽も無料で使える） |
| 9 | 向き | **iPhone は縦だけ**。iPad は 4 方向（画面の分割＝マルチタスクに 4 方向が要る） |

**未決（ひとみうさに確認）**
- Bundle ID は仮に `jp.dancemap.count`。候補は `jp.dancemap.count`（Web 版 `count.dancemap.jp` とそろう・おすすめ）・`jp.dancemap.dancecount`・会社のドメインを使う形（持っている場合だけ）。もう一つのアプリの形に合わせてもよい。App Store Connect に登録した後は変えられない。
- 音楽を Web 版（`count.dancemap.jp`）にも出すか。出さないなら、音源は iOS のビルドにだけ入れる（下の案）。

## 1-2. 音楽を公開版に入れる案（2026-11-02 設計案・未実装）

今は開発サーバー（`tools/music-dev-plugin.ts`）だけが、曲の原本から ffmpeg で練習用の音源をその場で作って配っている。公開ビルドの曲の一覧は空（`src/app/platform/music.ts`）。

- 1 曲は「はじめ・まん中・おわり」の 3 区間 × 速さ 3 段階（0.8・1・1.1）＝ **9 本の音源**。これを Mac で**前もって作り**、曲の一覧（今の `/__music/catalog` と同じ形）と一緒に **iOS のビルドにだけ入れる**（曲の原本と音源は GitHub に入れない＝今の方針のまま）。
- アプリは同梱した一覧と音源を読む（ネットが無くても使える）。読み込みの切り替えは `src/app/platform/music.ts` の中だけで行う。
- **大きさ（見積もり・未測定）**: 今の WAV（48kHz・16bit・ステレオ）だと 6 小節で約 2〜3MB、1 曲約 8MB。目標の「各種目およそ 3 曲」では数百 MB になるので、形式を選び直す。
- **ずれの注意**: AAC（m4a）は小さいが、音の頭に約 40ms の無音（エンコーダーの前置き）が入ることがあり、カウントとずれる恐れがある。**音を落とさない FLAC を第一候補**にし、Mac と実機で「WebKit が読めるか」「頭のずれ（0 サンプルか）」「大きさ」を測ってから決める。
- 曲ごとの権利の確認（有料の Suno で作成・確認済み）は、一覧に載せる前に台帳に残す。

## 2. 今回やったこと

- Capacitor 8.5.3 を入れた（版は固定。8.6.0 は公開から 5 日しか経っていないので避けた）。`capacitor.config.ts`・`ios/`（Swift Package Manager 方式。CocoaPods は要らない）。
- `src/app/platform/native.ts`: 「アプリの中で動いているか」の判定の正本。アプリの中は「ホーム画面から開いている」と同じ扱いにした（`pwa.ts` の `isStandalone`）。
  - 直す前の問題: WKWebView の UA には `Safari/` が無いので、アプリの中が「iPhone の Safari 以外のブラウザ」に見え、「ホーム画面に追加すると…」のカードが出る作りだった。
  - アプリの中では Service Worker を登録しない（中身は同梱され、更新は App Store が配る。「新しい版があります」の帯も出さない）。
- `ios/App/App/AppDelegate.swift`: 音声セッションを `.playback` に（消音スイッチがオンでも鳴らす）。**実機で確かめていない**（§4）。
- `ios/App/App/Info.plist`: マイクの使い道の説明（英語）・暗号化の申告（`ITSAppUsesNonExemptEncryption = false`）・対応言語（en・ja）・iPhone は縦だけ（iPad は 4 方向）。
- `npm run ios:build`（公開用のビルド → `cap sync ios`）と `npm run ios:open`（Xcode を開く）。
- **前からあったビルドの失敗を直した**: 11/02 夜の試聴ボタンから、`npm run build` が `check-dist` で落ちていた（開発用の `/__music/` が公開の成果物に残る）。原因は `musicSampleUrl` だけが関数の呼び出し `musicPreviewEnabled()` で判定していて、公開ビルドで畳まれなかったこと。判定をモジュールの定数 1 つにまとめた（`src/app/platform/music.ts`）。
- 確認: `test/app/platform-native.test.ts`（Web では「アプリの中」にならない・Bundle ID が設定と Xcode で一致・iPhone と iPad・Info.plist の必須項目）。

## 3. 確認した値（2026-11-02、Linux のクラウド環境）

| 確認 | 結果 |
|---|---|
| `npm test` | 825 件中 793 件が通過・32 件が失敗（32 件は前からある `engine-schedule` の浮動小数の最後の 1 桁。元のコミットでも 821 件中 32 件が失敗） |
| `npm run typecheck` | OK |
| `npm run ios:build` | OK（`dist OK`・precache 185 件 3.53 MB・`/__music` は 0 件） |
| 元のコミットの `npm run build` | **失敗**（`assets/index-*.js contains "__music/"`）→ 直した |
| ブラウザで再現（Chromium・390×844・公開ビルド） | iPhone の Safari: カードが出る・SW 1 件／アプリの中（Capacitor の通り道を再現）: カードは出ない・SW 0 件・S12 は「追加は済んでいます」・エラー 0 |

ここでは Xcode のビルドとシミュレーターは動かせない（Linux）。§4 は Mac で行う。

## 4. 残りの作業

### Mac と実機で確かめる（最優先）
- [ ] `npm install` → `npm run ios:build` → `npm run ios:open` → Xcode でビルドしてシミュレーターと実機で起動する。署名チームは KUGA K.K.。
- [ ] **音と表示のずれを実機で測る**（このアプリでいちばん大事。Safari の Web 版と同じであること）。
- [ ] 消音スイッチがオンでも鳴るか・イヤホンや Bluetooth・電話や Siri の割り込みの後の再開。
- [ ] 録音（マイクの許可の画面・録って再生）。WKWebView で `navigator.audioSession` を使えない iOS の版で録音できるか。
- [ ] 画面が暗くならないか（WKWebView の Wake Lock は iOS の版で違う。使えなければアプリの側で画面を点けたままにする）。
- [ ] 配る・受け取る（共有シート・ファイルから開く）。Android の受け口（SW）は iOS では使えないので、`.dancecount.txt` をアプリで開けるようにするか決める。
- [ ] iPad（縦・横・Split View）と小さい iPhone（SE）で表示を確かめる。iPhone は縦だけになっていること。

### アプリの中身
- [ ] マイクの説明の日本語訳（`ja.lproj/InfoPlist.strings`。Xcode でローカライズを足す）。
- [ ] アプリのアイコン（1024px。今の `AppIcon` は Capacitor の仮のもの）と起動画面（紺 `#1B2A4A`）。
- [ ] **音楽（最初の版に入れる）**: §1-2 の案で、音源を作る道具（Mac）・同梱した一覧と音源を読む部分・形式の測定（FLAC と AAC のずれと大きさ）。曲はそろった分から一覧に足し、最後に全種目を確かめる。
- [ ] 外へのリンク（LINE の案内・Web の URL など）がアプリの中で正しく開くか。
- [ ] 「ホーム画面に追加する」（S12）の行を、アプリでは設定から外すか。
- [ ] `engine-schedule` の 32 件の失敗の原因をはっきりさせる。

### ストアに載せる資料
- [ ] プライバシーポリシーとサポートの URL（日本語・英語）。
- [ ] App Privacy の回答（録音や設定は端末の中だけで、外へ送らないことをコードで確かめてから）。
- [ ] 年齢区分・カテゴリ・アプリ名（30 文字）・サブタイトル・説明文・キーワード（日本語・英語）。
- [ ] スクリーンショット: iPhone 6.9 インチ・iPad 13 インチ（日本語・英語）。
- [ ] 審査の人へのメモ（使い方とマイクを使う理由）。
- [ ] 出す国: 日本・アメリカ・イギリス・オーストラリア。
- [ ] 審査ガイドライン 4.2（最小限の機能）: 同梱した音声でネットが無くても練習できることを説明に書く。

### 出したあと
- [ ] TestFlight で試してもらう → 審査に出す → 公開（公開はひとみうさが決める）。
- [ ] 版の番号（`package.json` の version と Xcode の MARKETING_VERSION）の合わせ方を決める。
