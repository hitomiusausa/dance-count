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
| 10 | Bundle ID | **`jp.dancemap.count.app`**（もう一つのアプリ `jp.uchikare.app` と同じ形。App Store Connect に登録した後は変えられない） |
| 11 | 音楽を Web 版にも出すか | **出す**（Web 版と iOS で同じ音楽の一式を使う） |

## 1-2. 音楽を公開版に入れる（2026-11-02 実装済み・本物の曲では未確認）

1 曲は「はじめ・まん中・おわり」の 3 区間 × 速さ 3 段階（0.8・1・1.1）＝ **9 本の音源**。Mac で前もって作り、Web 版と iOS の同じ `dist` に入れる。曲の原本と一式は GitHub に入れない（`.gitignore` の `output/music-pack/`）。

```
npm run music:pack          # output/music-probe/ の台帳から output/music-pack/ を作る（Mac・ffmpeg に rubberband が要る）
npm run ios:build           # DC_MUSIC_PACK=output/music-pack が既定。一式が無ければ失敗する（DC_REQUIRE_MUSIC=1）
npm run deploy:cf           # Web 版も同じ（公開はひとみうさの許可の後だけ）
```

- 一式の中身: `music-catalog.json`（曲の一覧）と `music/<曲>/<曲の版>/<作り方の版>/<区間>-<速さ>.flac`。置き場所に版が入るので、曲を差し替えても作り方を直しても古いキャッシュは当たらない（Web は 1 年 immutable・SW の CacheFirst、一覧だけは毎回確かめる＋precache）。
- 決まりの正本: `src/app/music/pack.ts`（道具・アプリ・公開前の番人が同じものを使う）。切り出しの正本: `tools/music-library.ts`（開発サーバーと道具が同じものを使う）。
- アプリ: 一式を入れてビルドした時だけ音楽の入口が出る（`platform/music.ts` の `musicAvailable()`）。入れないビルドは今までどおり隠れる。
- 公開前の番人（`tools/music-pack-check.ts`）: 一覧が読める・一覧の音源がそろう・余りが無い・1 ファイル 25 MiB 以下・試作曲（Paper Umbrella）が入っていない。声の番人の「音は audio/ の下だけ」の例外は、一覧に載った音源だけ。
- 形式は **FLAC**（音を落とさない）。道具は FLAC を WAV と比べて 1 サンプルも違わないことを確かめてから書く。AAC は頭に前置きの無音が入ることがあるので使わない。
- **曲の原本の mp3 と wav が混ざっていても大丈夫**: 拍の解析（`analyze-bars.py`）も切り出しも同じ ffmpeg で読み、「読み込んだ最初の音を 0 秒」とする。0.5 秒ごとのクリックを wav と mp3（192kbps）にして ffmpeg 6.1 で読み戻すと、mp3 のずれは 0.05ms（2 サンプル）・長さは同じだった。Mac の ffmpeg でも一度同じ測定をする。
- 曲ごとの権利の確認（有料の Suno で作成・確認済み）は、一覧に載せる前に台帳に残す。

## 1-3. 訂正: 音楽の音源は拍より約 21〜23ms 早く鳴っていた（2026-11-02 発見・修正）

- **何が起きていたか**: 開発サーバーの試聴（10/23〜）は、区間を切ったあと ffmpeg の `atempo` で速さを変えていた。`atempo` は **速さ 1 倍でも** 曲の頭から 1024 サンプルを落とすため、2 拍目から後ろがすべて拍の時刻より早く鳴っていた。クリック音での実測（ffmpeg 6.1）: 1 倍 −21.3ms（48kHz の曲）／−23.3ms（44.1kHz）、1.1 倍 約 −19ms、0.8 倍 平均 −21〜−25ms で拍ごとに −30〜−9ms のばらつき。
- **以前の確認への影響**: 10/23 のタンゴ（「大丈夫そう」）や 11/02 の試聴の確認は、このずれを含んだ音で行われていた。耳で気づきにくい大きさだが、カウントとの同期はこのアプリでいちばん大事なので、直した音でもう一度聴いて確かめる。
- **直し方**: `atempo` をやめて `rubberband`（拍の頭を守る設定）にし、区間の 1 秒前から読んで立ち上がりを捨て、残る一定のずれは**曲と同じサンプリング周波数のクリック音でその場で測って打ち消す**（`calibrateClipShifts`）。打ち消した後にもう一度測り、平均 1ms・最大 4ms を超えたら音源を作らずに止める。作り方の版 `rb1` を開発の保存名（`app-clips`）と公開の置き場所に入れたので、Mac に残っている古い音源は使われない。
- **直した後の実測**（テスト用のクリックのワルツ・Chromium の Web Audio で FLAC を読んで測定）: 0.8 倍 平均 −0.35ms・最大 2.0ms／1 倍 0.05ms・0.08ms／1.1 倍 0.70ms・3.1ms。長さは全部ぴったり。開発サーバーの音源も同じ（1 倍 0.05ms・0.8 倍 −0.37ms）。
- 本物の曲（音楽）はクリックほど頭がはっきりしないので、Mac で一式を作った後に耳でも確かめる。

## 2. リリースまでの全体のチェックリスト（2026-11-03 更新）

記号: ✅ 済み（ここで確かめた） ／ 🍎 Mac・実機で行う ／ ★ ひとみうさが決める ／ ⬜ まだ

### A. 決めること
- ✅ 作り方（Capacitor）・課金（最初は無料）・音楽（最初の版から Web と iOS に）・法人で登録・iPad 対応・出す国・iPhone は縦だけ・Bundle ID `jp.dancemap.count.app`
- ★ ストアの名前・サブタイトル・説明文・キーワード・カテゴリ（下書き: [`STORE-LISTING.md`](./STORE-LISTING.md)）
- ★ プライバシーポリシーとサポートの URL（案: `count.dancemap.jp/privacy`・`/support` を作る）
- ★ 「このアプリについて」のプライバシーの文が Web 版向け（Cloudflare の解析・配信サーバーの記録）で、iOS アプリでは当てはまらない（[`STORE-LISTING.md`](./STORE-LISTING.md) §5）
- ★ ガイドライン 4.2 への備え: 今のままで出すか、iOS らしい機能（画面を点けたまま・触覚など）を足すか
- ★ 版の番号（`package.json` 0.3.0 と Xcode の 1.0 (1)）の合わせ方

### B. Apple 側の手続き
- ✅ 開発者登録（KUGA K.K.・チーム `JQU8USCS8L`＝uchikare と同じ）・契約・銀行・税・Xcode（ひとみうさ: 別のアプリで済み）
- 🍎 App Store Connect にアプリを登録（Bundle ID `jp.dancemap.count.app`・SKU 案 `dance-count-ios`・主な言語）

### C. iOS アプリの中身
- ✅ Capacitor 8.5.3・`ios/`（Swift Package Manager）・iPhone と iPad・iPhone は縦だけ
- ✅ アプリの中は「ホーム画面から開いている」扱い（追加のカード・SW・設定の「ホーム画面に追加する」を出さない）
- ✅ 切り欠き・時計の下に部品が入らない（上の安全領域）・いつもライト表示
- ✅ アイコン（うさぎのワルツ・1024・透明なし。`tools/make-icons.js --only ios`）
- ✅ 起動画面（色だけ・起動の殻と同じ紺）
- ✅ マイクの使い道（英語・日本語）・暗号化の申告・プライバシーの申告（`PrivacyInfo.xcprivacy`。Capacitor 自身の申告も「追跡なし・集めるデータなし・理由の要る API なし」）
- ✅ アプリの中から外への通信 0 件（全画面と再生で実測）
- ✅ 音楽の一式の仕組み（`npm run music:pack`・`DC_MUSIC_PACK`・一式が無いリリースは失敗）
- ✅ 音楽が拍より約 21〜23ms 早く鳴っていたのを修正（§1-3）
- 🍎 消音スイッチがオンでも鳴るか（`AppDelegate` の `.playback`）
- 🍎 **音と画面のずれを実機で測る**（カウント・音楽）
- 🍎 録音（許可の画面・録って再生・`navigator.audioSession` が無い iOS の版）
- 🍎 画面が暗くならないか: アプリに組み込んだ WKWebView で `navigator.wakeLock` が動くかは公式の資料で確かめられなかった（Safari は 16.4〜、ホーム画面の PWA の不具合は 18.4 で修正。WKWebView についての記述は見つからない）。実機で確かめ、動かなければ iOS 側で再生中だけ `isIdleTimerDisabled` を立てる小さなプラグインを足す（ここでは Xcode でビルドを確かめられないので未着手）
- ✅ 外のリンクと `mailto:`: Capacitor 8.5.3 の `WebViewDelegationHandler.swift` は、アプリの外への移動を止めて `UIApplication.shared.open` に渡す（メールはメールのアプリ・Web は Safari）。🍎 実機で一度押して確かめる
- 🍎 配る・受け取る（共有シート・ファイルから開く）。`.dancecount.txt` をアプリで開けるようにするか ★
- 🍎 イヤホン・Bluetooth・電話や Siri の割り込みの後の再開
- ⬜ 使わなくなった `LaunchScreen.storyboard` と `Splash` の画像を消すか（害は無い）

### D. 音楽
- 🍎 `ffmpeg -filters | grep rubberband`（無ければ `brew install ffmpeg`）
- 🍎 `npm run music:pack` → 打ち消しの量と大きさを記録 → `npm run ios:build`
- 🍎 **直した音で聴き直す**（前に聴いたタンゴ・ワルツも）・iPhone と Safari で FLAC が鳴るか
- 🍎 全曲そろった時の大きさ（アプリの大きさとして許せるか ★）
- ⬜ 曲がそろった分から一覧に足し、最後に全種目を確かめる

### E. 品質
- ✅ `npm test`: Node 24 で 838 件すべて通過（Node 22 の 32 件の失敗は V8 の丸め＝音量の値の最後の 1 ビット・時刻の差 0。HANDOFF に訂正）
- ✅ `npm run typecheck` OK・`ios:build` OK
- ✅ 画面の再現（アプリの中・日英 40 画面ずつ）: iPhone 12 mini・SE・16 Pro Max・iPad Air 縦横で、横のはみ出し 0・切り欠きの下の部品 0
- ✅ `ui:check` 1163 件すべて通過（切り欠きの修正・設定の行の変更の後の版）
- 🍎 シミュレーター（iPhone 12 mini・iPad）と実機で全画面: `tools/ios-sim-check.sh`（端末を探す・無ければ作る → 署名なしでビルド → 起動 → ライトとダークで撮る。まだ Mac で一度も動かしていない）
- 🍎 TestFlight で、ひとみうさ・ダンス仲間に試してもらう
- ⬜ 確認されていないルーティン・フィガーの名前を、確認済みのように出していないかの最終確認

### F. ストアに載せる資料
- ✅ 下書き: 名前・説明文・キーワード・審査のメモ・App Privacy・年齢区分・暗号化（[`STORE-LISTING.md`](./STORE-LISTING.md)）
- ★ 上の下書きの確定
- ⬜ スクリーンショット（iPhone 6.9 インチ 1320×2868・iPad 13 インチ 2064×2752・日英）。本物の曲を入れてから撮る
- ⬜ プライバシーポリシー・サポートのページ（Web 版に作る。公開はひとみうさの許可の後）

### G. 出す
- 🍎 `npm run ios:build` → Xcode で Archive → App Store Connect へ（uchikare の記録: 会社のチームに端末が無いと Archive の署名で止まることがある）
- 🍎 TestFlight（輸出の質問は Info.plist で答え済み）→ 審査に出す → 公開（公開はひとみうさが決める）

## 3. Mac での手順

```
cd dance-count
git fetch origin && git checkout claude/app-store-release-prep-1s6fb9
node --version            # 24 以上（.nvmrc）
npm install
ffmpeg -filters | grep rubberband
npm run music:pack        # output/music-probe/ の台帳から output/music-pack/ を作る
npm run ios:build         # 公開ビルド → ios/ へ写す（一式が無いと止まる）
npm run ios:sim           # iPhone 12 mini のシミュレーターでビルド・起動・撮影（build/ios/screens/）
npm run ios:open          # Xcode が開く → Signing のチームを KUGA K.K. に → 実機で ▶
```

## 4. 確認した値（2026-11-02〜03、Linux のクラウド環境）

| 確認 | 結果 |
|---|---|
| `npm test` | Node 24.22.1: 838 件すべて通過／Node 22.23.4: 806 件通過・32 件失敗（engine-schedule の音量の値の最後の 1 ビット。時刻の差 0） |
| `npm run typecheck` | OK |
| `npm run ios:build`（テスト用の曲の一式入り） | OK（`dist OK`・`music 1 tracks 9 clips`）・`cap sync` で pbxproj と Info.plist は変わらない |
| 一式なしのリリース | 失敗する（`missing music-catalog.json`）＝入れ忘れを防ぐ |
| 元のコミットの `npm run build` | 失敗していた（`/__music/` が成果物に残る）→ 直した |
| アプリの中か Web か（Chromium・390×844） | Safari: 追加のカードあり・SW 1 件／アプリの中: カードなし・SW 0 件・エラー 0 |
| 音楽の通し（テスト用のクリックのワルツ） | アプリの中と Web で一覧・▶ の再生・エラー 0・拍のずれは §1-3 |
| アプリの中から外への通信 | 0 件（全 18 画面＋カウントと音楽の再生・31 件はすべて同梱のファイル） |
| 端末ごとの画面（アプリの中・日英 40 画面ずつ・安全領域を再現） | 直す前: iPhone 12 mini で全 40 画面「戻る」かアプリ名が切り欠きの下／直した後: 12 mini・SE・16 Pro Max・iPad Air 縦横で はみ出し 0・切り欠きの下 0・スクロール時の上の帯は背景色だけ |
| pbxproj | 参照切れ 0（pbxproj 4.2.1 で読み直し） |
| `ui:check` | 1163 件すべて通過（`469c126` の版。1 回目は途中で開発サーバーが再起動して止まった＝点検中に `package.json` を書き換えたため。やり直して全件） |

ここでは Xcode とシミュレーターは動かせない（Linux）。🍎 の項目は Mac で行う。iPhone 12 mini の確認は、ブラウザで同じ大きさ（375×812・3 倍）と安全領域（上 50・下 34）を再現して行った。本物のシミュレーターでの確認は 🍎。
