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
- 音楽を公開版に入れる仕組み（§1-2）と、音源が拍より早く鳴っていた問題の修正（§1-3）。`test/app/music-pack.test.ts`（実際の ffmpeg での切り出しの時刻の検査を含む）。

## 3. 確認した値（2026-11-02、Linux のクラウド環境）

| 確認 | 結果 |
|---|---|
| `npm test` | 834 件中 802 件が通過・32 件が失敗（32 件は前からある `engine-schedule` の浮動小数の最後の 1 桁。元のコミットでも 821 件中 32 件が失敗） |
| `npm run typecheck` | OK |
| `npm run ios:build` | OK（`dist OK`・precache 185 件 3.53 MB・`/__music` は 0 件） |
| 元のコミットの `npm run build` | **失敗**（`assets/index-*.js contains "__music/"`）→ 直した |
| ブラウザで再現（Chromium・390×844・公開ビルド） | iPhone の Safari: カードが出る・SW 1 件／アプリの中（Capacitor の通り道を再現）: カードは出ない・SW 0 件・S12 は「追加は済んでいます」・エラー 0 |
| 音楽の一式（テスト用のクリックのワルツ） | `npm run music:pack` → `ios:build`: `music 1 tracks 9 clips`・一式が無いリリースは失敗・一式なしの普通のビルドは `music: none`。アプリの中と Web 版で音楽のタブ・曲の一覧・▶ の再生が動く・エラー 0・9 本の拍のずれは §1-3 |

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
- [ ] **音楽（Mac）**: `ffmpeg -filters | grep rubberband` で rubberband があるか確かめる（無ければ `brew install ffmpeg`）→ `npm run music:pack` → 出てきた打ち消しの量と大きさを記録 → `npm run ios:build`。
- [ ] **音楽（実機・Safari）**: FLAC を WebKit（iPhone・Mac の Safari）で読めるか、曲とカウントが合って聞こえるか（§1-3 の直した音で、タンゴなど前に聴いた曲も）。大きさ（全曲そろった時の合計）を測り、アプリの大きさとして許せるか決める。
- [ ] 曲はそろった分から一覧に足し、最後に全種目を確かめる。
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
