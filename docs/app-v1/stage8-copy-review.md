# 段8 文言の監修シート（自動生成）

> 作り方: `npm run copy:sheet`（正本は `src/app/i18n/messages.ts` と `src/app/i18n/about.ts`。ここを直しても画面は変わらない）。
> 手で書いてよいのは右の 2 列「AI の一次案」「ひとみうさの直し」だけ（鍵で突き合わせるので、作り直しても残る）。ほかの列は作り直すたびに上書きされる。
> ひとみうさの見方: 「直し」の列に書くか、番号と鍵で言う（例「12 `share` は『送る』に」）。決まった物だけ `messages.ts` に写す（Ruling 96-3）。
> 表の「⍽」は折らない空白（画面では普通の空白に見える）。

## 先に決めてほしいこと

1. 「配る / Share」のままか「送る / Send」にするか（段5 §0b-4）。決まったら関係する鍵をまとめて直す（鍵 `share`・`shareRoutines`・`shareTitle`）
2. S6 の見出し「困った時は / If something's wrong」（Ruling 98）（鍵 `settingsHelpHeading`）
3. S13 の「このアプリについて」「プライバシー」の文は**法務確認待ち**（D47・D48。法的な約束は書いていない）（鍵 `aboutPrivacy1`）

## 印の意味

- **依頼**: 「〜してください」／“Please”。手動基準は「1 画面に 1 つまで」（下の脚注に画面ごとの数）。
- **技術語の疑い**: 60〜70代に通じにくいかもしれない語（ブラウザ・アドレスバー・アドレス・ファイル・版・Bluetooth・インストール・データ・サーバー・マイク）。「…」“…” の中の語（画面や iOS の実物の語）は数えない。
- **長さ**: ja 35 字／en 70 字を超える（1 行に収まらない。{…} は 2 字と数える）。
- **英語の初版**: ひとみうさがまだ英語を確かめていない（確かめた鍵は道具の `REVIEWED_EN_KEYS` に足す）。
- **法務確認待ち**: S13 の文（D47・D48）。公開の前に法務／ひとみうさが確かめる。

## S0 表紙

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 1 | `appName` | Dance Count | Dance Count | 英語の初版 | OK |  |
| 2 | `appSubtitle` | for Ballroom | for Ballroom | 英語の初版 | OK |  |
| 3 | `coverUse` | 使う | Use | 英語の初版 |  |  |
| 4 | `coverUseSub` | 種目のカウントで練習する・先生のルーティンを鳴らす（生徒の方） | Practice a dance's count · Play your teacher's routines (for students) | 英語の初版 |  |  |
| 5 | `coverMakeSub` | 自分の声を録音する・ルーティンを作る・生徒に配る（指導者の方） | Record your voice · Make routines · Share with students (for instructors) | 長さ・英語の初版 |  |  |
| 6 | `coverSettingsSub` | 言語・困った時は・アプリについて | Language · Help · About | 英語の初版 |  |  |
| 7 | `continueLast` | 前回の練習 | Last practice | 英語の初版 |  |  |

## S1 使う › フィガー（種目）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 8 | `lastTime` | 前回 | Last time | 英語の初版 | OK |  |
| 9 | `installCard` | ホーム画面に追加すると、アプリのように使えます | Add to your Home Screen to use it like an app | 英語の初版 | Add it to your Home Screen to use it like an app |  |

## F1 種目のフィガー

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 10 | `basicCount` | 基本のカウント | Basic count | 英語の初版 |  |  |

## S2 再生

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 11 | `countPattern` | カウントの型 | Count pattern | 英語の初版 | OK |  |

## U2・M1 ルーティン（使う・作る）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 12 | `editFromMake` | ルーティンを直す・消す時は、表紙の「作る」から。 | To edit or delete a routine, go to “Make” on the cover. | 英語の初版 |  |  |
| 13 | `cannotPlayEmpty` | フィガーがありません。「作る」で直せます。 | No figures yet. You can fix this in “Make”. | 英語の初版 |  |  |
| 14 | `cannotPlayFix` | カウントに直す所があります。「作る」で直せます。 | Some counts need fixing. You can fix this in “Make”. | 英語の初版 |  |  |
| 15 | `routinesTitle` | ルーティン | Routines | 英語の初版 | OK |  |
| 16 | `routinesEmpty` | まだルーティンはありません | No routines yet | 英語の初版 | OK |  |
| 17 | `newRoutine` | 新しいルーティン | New routine | 英語の初版 | OK |  |
| 18 | `receivedFrom` | {name}から | From {name} | 英語の初版 | OK（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 19 | `needsFigures` | フィガーを追加すると再生できます。 | Add a figure to play this routine. | 英語の初版 | OK |  |
| 20 | `needsFix` | カウントに直す所があります。 | Some counts need fixing. | 英語の初版 | OK |  |
| 21 | `confirmDeleteTitle` | このルーティンを削除しますか？ | Delete this routine? | 英語の初版 | OK |  |

## M0 作る

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 22 | `makeIntro` | 指導者の方へ。作った物は「配る」でファイルにして生徒に送れます。 | For instructors. Use “Share” to turn what you make into a file for your students. | 技術語の疑い（ファイル・file）・長さ・英語の初版 |  |  |
| 23 | `makeShare` | 配る（ファイルを作る） | Share (make a file) | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 24 | `makeShareSub` | 声とルーティンを 1 つのファイルに | Your voice and routines in one file | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 25 | `voiceStatusNone` | まだ録音していません | Not recorded yet | 英語の初版 |  |  |
| 26 | `voiceStatusPack` | {language} · {count} / {total} 語 | {language} · {count} / {total} words | 英語の初版 |  |  |
| 27 | `voiceStatusDone` | 録音済み | Recorded | 英語の初版 |  |  |
| 28 | `routinesCount` | {count} 本（受け取った物も直せます） | {count} routines (received ones too) | 英語の初版 |  |  |
| 29 | `routinesCountOne` | 1 本（受け取った物も直せます） | 1 routine (received ones too) | 英語の初版 |  |  |
| 30 | `routinesNone` | まだありません | None yet | 英語の初版 |  |  |
| 31 | `recordVoice` | 自分の声を録音する | Record your voice | 英語の初版 | OK |  |

## S4 ルーティン編集

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 32 | `newRoutineTitle` | 新しいルーティン | New routine | 英語の初版 | OK |  |
| 33 | `editRoutineTitle` | ルーティンの編集 | Edit routine | 英語の初版 | OK |  |
| 34 | `defaultRoutineName` | {dance}のルーティン | {dance} routine | 英語の初版 | OK |  |
| 35 | `routineName` | 名前 | Name | 英語の初版 | OK |  |
| 36 | `danceLine` | 種目: {dance} | Dance: {dance} | 英語の初版 | OK |  |
| 37 | `changeDance` | 変える | Change | 英語の初版 | OK |  |
| 38 | `noFigures` | フィガーはまだありません。 | No figures yet. | 英語の初版 | OK |  |
| 39 | `addFigure` | フィガーを追加 | Add a figure | 英語の初版 | OK |  |
| 40 | `newFigure` | 新しいフィガー | New figure | 英語の初版 | OK |  |
| 41 | `figureName` | フィガーの名前 | Figure name | 英語の初版 | OK |  |
| 42 | `figureSuggestions` | 名前の候補 | Suggested names | 英語の初版 | OK |  |
| 43 | `figureChoices` | {dance}のフィガー（{count}） | {dance} figures ({count}) | 英語の初版 | OK |  |
| 44 | `commonCounts` | カウントの形 | Count patterns | 英語の初版 | OK |  |
| 45 | `allowedSymbols` | 使える文字：{symbols} | Allowed: {symbols} | 英語の初版 | You can use: {symbols} |  |
| 46 | `countsFromHistory` | 前に使ったカウントです | Count you used before | 英語の初版 |  |  |
| 47 | `countsFromReviewed` | 目安のカウントです | Typical count | 英語の初版 |  |  |
| 48 | `sameNameExists` | 同じ名前があります（{counts}） | Same name exists ({counts}) | 英語の初版 | This name is already used ({counts}) |  |
| 49 | `sameNameCopy` | 同じ名前があります：{name}（{counts}） | Same name exists: {name} ({counts}) | 英語の初版 | {name} ({counts}) already exists |  |
| 50 | `renameForOtherCount` | 名前を変えると、違うカウントにできます | Use another name for a different count | 英語の初版 | Use a different name for a different count |  |
| 51 | `offBarFigure` | {beats}拍のカウントではありません | Not a {beats}-beat count | 英語の初版 | OK |  |
| 52 | `offBarFigureEdit` | {beats}拍のカウントではありません。必要なら編集してください。 | Not a {beats}-beat count. Edit it if needed. | 依頼・英語の初版 | OK |  |
| 53 | `routineEndsMidBar` | 小節の途中で終わっています。繰り返すと頭がずれます。 | The routine ends mid-bar, so repeats start off the beat. | 英語の初版 | The routine ends mid-bar, so repeats won't start on beat 1. |  |
| 54 | `startWithBeat` | 最初は数字か S・Q から | Start with a number, S or Q | 英語の初版 | OK |  |
| 55 | `countsInvalid` | この並びでは数えられません | This count can't be played | 英語の初版 | OK |  |
| 56 | `nameNeeded` | 名前を入れると決定できます | Add a name to finish | 英語の初版 | Enter a name to finish |  |
| 57 | `previewFigure` | このフィガーを試聴 | Play this figure | 英語の初版 | OK |  |
| 58 | `moveUp` | 上へ | Up | 英語の初版 | OK |  |
| 59 | `moveDown` | 下へ | Down | 英語の初版 | OK |  |
| 60 | `duplicate` | 複製 | Duplicate | 英語の初版 | OK |  |
| 61 | `moveFigureLabel` | {name}を動かす | Move {name} | 英語の初版 | OK |  |
| 62 | `previewAll` | 全体を試聴 | Play all | 英語の初版 | OK |  |
| 63 | `leadInLength` | はじめの合図の長さ | Lead-in length | 英語の初版 | OK（製品判断: leadIn の “Count-in” 案と一緒に決める） |  |
| 64 | `oneBar` | 1小節 | 1 bar | 英語の初版 | OK |  |
| 65 | `twoBars` | 2小節 | 2 bars | 英語の初版 | OK |  |
| 66 | `routineSpeed` | 速さ | Speed | 英語の初版 | OK |  |
| 67 | `danceStandardSpeed` | 種目の標準（♩={tempo}） | Dance standard (♩={tempo}) | 英語の初版 | Standard for this dance (♩={tempo}) |  |

## S5 ルーティン再生

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 68 | `madeByYou` | {dance} · あなたが作成 | {dance} · made by you | 英語の初版 | OK |  |
| 69 | `madeBy` | {dance} · {name}が作成 | {dance} · made by {name} | 英語の初版 | OK（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 70 | `figuresHeading` | フィガー | Figures | 英語の初版 | OK |  |
| 71 | `practiceRange` | 練習する範囲 | Practice range | 英語の初版 | OK |  |
| 72 | `rangeStart` | はじめ | From | 英語の初版 | OK |  |
| 73 | `rangeEnd` | おわり | To | 英語の初版 | OK |  |
| 74 | `previous` | 前 | Prev | 英語の初版 | Previous（幅が許せば。略語 “Prev” は年配の方に読みにくい） |  |
| 75 | `next` | 次 | Next | 英語の初版 | OK |  |

## S6 設定

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 76 | `settingsInstall` | ホーム画面に追加する方法 | How to add to the Home Screen | 英語の初版 | OK |  |
| 77 | `settingsHelpHeading` | 困った時は | If something's wrong | 英語の初版 | If something goes wrong |  |
| 78 | `settingsAbout` | プライバシー・アプリについて | Privacy & about this app | 英語の初版 | OK。製品判断（Fable OQ7）: 短い語（例 “About & privacy”）にすれば 320px 幅の特別扱いが要らなくなる |  |
| 79 | `versionLabel` | 版 {version} | Version {version} | 技術語の疑い（版・version）・英語の初版 | OK |  |
| 80 | `settingsLanguage` | 言語 | Language | 英語の初版 | OK |  |

## S7 声

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 81 | `recordFromMake` | 自分の声の録音は、表紙の「作る」から。 | To record your own voice, go to “Make” on the cover. | 英語の初版 |  |  |
| 82 | `voicesTitle` | 声 | Voice | 英語の初版 | Voices |  |
| 83 | `voiceInProgressCount` | ·⍽{count}⍽/⍽12⍽語 | ·⍽{count}⍽/⍽12⍽words | 英語の初版 | OK |  |
| 84 | `confirmDeleteVoiceTitle` | この声を削除しますか？ | Delete this voice? | 英語の初版 | OK |  |
| 85 | `continueRecording` | 続きを録音する | Continue recording | 英語の初版 | OK |  |

## S8 自分の声を録音

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 86 | `recordAddFirst` | ホーム画面に追加してから録音するのがおすすめです。このブラウザで録音した声は、追加したアプリには引き継がれません。（追加の方法は、設定の「ホーム画面に追加する方法」） | We recommend adding to the Home Screen before recording. A voice recorded in this browser won't carry over to the added app. (See Settings → “How to add to the Home Screen”.) | 技術語の疑い（ブラウザ・browser）・長さ・英語の初版 | Before recording, we recommend adding this to your Home Screen. Voices recorded in this browser don't carry over to the Home Screen app. (Settings → “How to add to the Home Screen”) |  |
| 87 | `recordTitle` | 自分の声を録音 | Record your voice | 英語の初版 | OK |  |
| 88 | `recordIntro1` | 12 語を、1 語ずつ録音します。 | You will record 12 words, one at a time. | 英語の初版 | OK |  |
| 89 | `recordIntro2` | 録音は、この端末の中にだけ残ります。 | Recordings stay on this device only. | 英語の初版 | OK |  |
| 90 | `recordIntro3` | いつでも消せます。 | You can delete them at any time. | 英語の初版 | OK |  |
| 91 | `recordLanguage` | 数える言葉 | Count in | 英語の初版 | Counting language |  |
| 92 | `countInEnglish` | 英語で数える（One, Two, Slow…） | Count in English (One, Two, Slow…) | 英語の初版 | OK |  |
| 93 | `countInJapanese` | 日本語で数える（いち、に、スロー…） | Count in Japanese (いち, に, スロー…) | 英語の初版 | OK |  |
| 94 | `recordedUpTo` | {count}⍽/⍽12⍽語まで録音済み | {count}⍽/⍽12⍽words recorded | 英語の初版 | OK |  |
| 95 | `recordedAll` | 録音済み（12 語） | Recorded (12 words) | 英語の初版 | OK |  |
| 96 | `startRecording` | 録音をはじめる | Start recording | 英語の初版 | OK |  |
| 97 | `wordProgress` | {index} / 12 語 | {index} / 12 words | 英語の初版 | OK |  |
| 98 | `recordHint` | ボタンを押したら、すぐ「{word}」と言ってください。 | Tap the button, then say “{word}” right away. | 英語の初版 | OK |  |
| 99 | `recordWord` | 録音する | Record | 英語の初版 | OK |  |
| 100 | `recordAgain` | 録り直す | Record again | 英語の初版 | OK |  |
| 101 | `reviewFromFirst` | 1⍽語目から見直す | Review from word 1 | 英語の初版 | OK |  |
| 102 | `recordingNow` | 録音中… | Recording… | 英語の初版 | OK |  |
| 103 | `listenTake` | 聞く | Play | 英語の初版 | OK |  |
| 104 | `previousWord` | 前の語 | Previous | 英語の初版 | OK |  |
| 105 | `nextWord` | 次へ | Next | 英語の初版 | OK |  |
| 106 | `finishRecording` | 完成へ | Finish | 英語の初版 | OK |  |
| 107 | `micHowTo` | 設定の開き方 | How to allow it | 英語の初版 | OK |  |
| 108 | `micHowToIphone` | iPhone：設定 → アプリ → Safari → マイク（ホーム画面から開いた時は、Safari のかわりにこのアプリの名前） | iPhone: Settings → Apps → Safari → Microphone (if you opened it from the Home Screen, this app's name instead of Safari) | 技術語の疑い（マイク・microphone）・長さ・英語の初版 | iPhone: Settings → Apps → Safari → Microphone (if you opened it from your Home Screen, choose this app's name instead of Safari) |  |
| 109 | `micHowToOther` | Android・PC：アドレスバーの左のマーク → マイク | Android / PC: the icon at the left of the address bar → Microphone | 技術語の疑い（アドレスバー・アドレス・マイク・address bar・address・microphone）・英語の初版 | Android / PC: the icon at the left end of the address bar → Microphone |  |
| 110 | `micHowToThen` | 許可したら、もう一度「録音をはじめる」を押してください。 | Then tap “Start recording” again. | 依頼・英語の初版 | After allowing it, tap “Start recording” again. |  |
| 111 | `recordNeedsHttps` | 安全な接続（https）で開くと録音できます。 | Recording works only over a secure (https) connection. | 英語の初版 |  |  |
| 112 | `voiceReadyTitle` | 録音できました | Your voice is ready | 英語の初版 | OK |  |
| 113 | `voiceName` | 名前 | Name | 英語の初版 | OK |  |
| 114 | `compareTitle` | ワルツで聞き比べる | Compare with the waltz | 英語の初版 | Compare using a waltz |  |
| 115 | `yourVoice` | 自分の声 | Your voice | 英語の初版 | OK |  |
| 116 | `standardVoice` | 標準の声 | Standard voice | 英語の初版 | OK |  |
| 117 | `finishDone` | 完了 | Done | 英語の初版 | OK |  |
| 118 | `backupTipRecording` | 「配る」で作ったファイルを自分にも送っておくと、端末を替えても声を使えます。 | Send yourself the file made with “Share” and you can use this voice on another phone. | 技術語の疑い（ファイル・file）・長さ・英語の初版 | Send yourself the file from “Share” to keep this voice if you change phones. |  |

## S9 配る

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 119 | `shareTitle` | 配る | Share | 英語の初版 | OK |  |
| 120 | `shareYourName` | あなたの名前 | Your name | 英語の初版 | OK |  |
| 121 | `shareNameNeeded` | 名前を入れると、ファイルを作れます。 | Enter your name to create the file. | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 122 | `shareVoiceHeading` | 声 | Voice | 英語の初版 | OK |  |
| 123 | `shareVoiceNone` | 入れない | None | 英語の初版 | OK |  |
| 124 | `shareNoRecordedVoice` | 録音した声はまだありません。 | You haven't recorded a voice yet. | 英語の初版 | OK |  |
| 125 | `shareVoicePrepFailed` | この声はファイルにできませんでした。 | This voice couldn't be put in a file. | 技術語の疑い（ファイル・file）・英語の初版 | This voice couldn't be added to the file. |  |
| 126 | `shareConsent` | 自分の声をこのファイルに入れて配ることに同意します。配り先は自分で管理します。 | I agree to put my voice in this file and share it. I will manage who receives it. | 技術語の疑い（ファイル・file）・長さ・英語の初版 | I agree to share my voice in this file. I'll decide who receives it. |  |
| 127 | `shareConsentNeeded` | 同意すると、ファイルを作れます。 | Tick the box to create the file. | 技術語の疑い（ファイル・file）・英語の初版 | Check the box to create the file. |  |
| 128 | `shareRoutinesHeading` | ルーティン | Routines | 英語の初版 | OK |  |
| 129 | `shareNoRoutines` | 配れるルーティンはまだありません。 | No routines to share yet. | 英語の初版 | OK |  |
| 130 | `shareChooseSomething` | 声かルーティンを選ぶと、ファイルを作れます。 | Choose a voice or a routine to create the file. | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 131 | `shareNothingYet` | 先に声を録音するか、ルーティンを作ると配れます。 | Record a voice or make a routine first, and then you can share it. | 英語の初版 | OK（D51・代理決定。S9 を録音もルーティンも無いまま開いた時の帯の 1 行。final-review m2） |  |
| 132 | `createFile` | ファイルを作る | Create file | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 133 | `shareAfterSend` | ファイルを送ったら、下の案内文も送ってください。 | After sending the file, send the instructions below too. | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 134 | `shareSaved` | 「{file}」を保存しました。LINE やメールに添付できます。 | “{file}” has been saved. You can attach it to LINE or email. | 英語の初版 | Saved “{file}”. You can attach it in LINE or to an email. |  |
| 135 | `saveFileAgain` | ファイルを保存する | Save the file | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 136 | `copyInstructions` | 生徒への案内文をコピー | Copy instructions for students | 英語の初版 | OK |  |
| 137 | `instructionsCopied` | 案内文をコピーしました。LINE やメールに貼れます。 | Copied. You can paste it into LINE or email. | 英語の初版 | OK |  |
| 138 | `instructionsLabel` | 生徒への案内文 | Instructions for students | 英語の初版 | OK |  |

## S10 受け取る

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 139 | `receiveTitle` | 受け取る | Receive | 英語の初版 | OK |  |
| 140 | `chooseFile` | ファイルを選ぶ | Choose a file | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 141 | `readingFile` | 読んでいます… | Reading… | 英語の初版 | OK |  |
| 142 | `receiveHelpLine` | LINE で届いたファイルは、先に「"ファイル"に保存」しておくと、ここで選べます。 | If the file came by LINE, save it with “Save to Files” first. | 技術語の疑い（ファイル・file）・長さ・英語の初版 | OK |  |
| 143 | `receiveHelpRecents` | 選ぶ画面では「最近使った項目」にあります。 | You will find it under “Recents”. | 英語の初版 | You'll find it under “Recents”. |  |
| 144 | `openInSafari` | Safari で開く | Open in Safari | 英語の初版 | OK |  |
| 145 | `inThisFile` | このファイルの中身 | In this file | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 146 | `fileVoiceFrom` | {name}の声（{language}）· {count} 語 | {name}'s voice ({language}) · {count} words | 英語の初版 | OK（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 147 | `fileVoiceNamed` | {name}（{language}）· {count} 語 | {name} ({language}) · {count} words | 英語の初版 | OK |  |
| 148 | `fileRoutinesOne` | ルーティン 1 本: {names} | 1 routine: {names} | 英語の初版 | OK |  |
| 149 | `fileRoutines` | ルーティン {count} 本: {names} | {count} routines: {names} | 英語の初版 | OK |  |
| 150 | `namesAndMore` | {names} ほか {count} 本 | {names} and {count} more | 英語の初版 | OK |  |
| 151 | `routineNoName` | （名前なし） | (no name) | 英語の初版 | OK |  |
| 152 | `replaceVoiceFrom` | {name}の声はすでにあります。「使う」で新しい方に置き換わります。 | You already have {name}'s voice. “Use” replaces it with this one. | 英語の初版 | You already have {name}'s voice. Tap “Use” to replace it with this one.（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 153 | `replaceVoiceNamed` | 「{name}」はすでにあります。「使う」で新しい方に置き換わります。 | You already have “{name}”. “Use” replaces it with this one. | 英語の初版 | You already have “{name}”. Tap “Use” to replace it with this one. |  |
| 154 | `replaceRoutines` | 同じルーティンは新しい方に置き換わります。 | Routines you already have are replaced with the new ones. | 英語の初版 | OK |  |
| 155 | `useFile` | 使う | Use | 英語の初版 | OK |  |
| 156 | `receivedTitle` | 受け取りました | Received | 英語の初版 | OK |  |
| 157 | `receivedVoiceFrom` | 「使う」で種目を選んで ▶ を押すと、{name}の声で鳴ります。 | Choose a dance in “Use” and press ▶ to hear {name}'s voice. | 英語の初版 | 製品判断: Choose a dance on the Practice screen and press ▶ to hear {name}'s voice.（英語の “Home screen” は iPhone の「ホーム画面」と紛れる。アプリのタブは “Practice”。ja の「ホームで」「ホームへ」も同じ（画面に「ホーム」という語は無く、タブは「練習」）。goHome・receivedVoiceNamed も一緒に）（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 158 | `receivedVoiceNamed` | 「使う」で種目を選んで ▶ を押すと、「{name}」で鳴ります。 | Choose a dance in “Use” and press ▶ to hear “{name}”. | 英語の初版 | 製品判断: Choose a dance on the Practice screen and press ▶ to hear “{name}”.（receivedVoiceFrom と同じ理由。ja の「ホームで」「ホームへ」も同じ（画面に「ホーム」という語は無く、タブは「練習」）） |  |
| 159 | `receivedRoutines` | 「ルーティン」に入っています。 | They are in “Routines”. | 英語の初版 | You'll find them in “Routines”. |  |
| 160 | `goHome` | 種目を選ぶ | Choose a dance | 英語の初版 | OK（製品判断: “Home” と iPhone の「ホーム画面」の紛れは receivedVoiceFrom 参照。ja の「ホームで」「ホームへ」も同じ（画面に「ホーム」という語は無く、タブは「練習」）） |  |
| 161 | `seeRoutines` | ルーティンを見る | See routines | 英語の初版 | OK |  |

## S11 音が鳴らない時

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 162 | `soundHelpSwitch` | 本体横のスイッチ（マナーモード）を確かめる | Check the switch on the side of your phone (silent mode). | 英語の初版 | 製品判断: Make sure your phone isn't on silent.（iPhone 15 Pro 以降と Android には横の消音スイッチが無い。ja 案「消音（マナーモード）になっていないか確かめる」。今の文はスイッチのある SE 向けのまま） |  |
| 163 | `soundHelpVolume` | 音量を上げる | Turn the volume up. | 英語の初版 | OK |  |
| 164 | `soundHelpEarphones` | イヤホン・Bluetooth の接続を確かめる | Check your earphones or Bluetooth connection. | 技術語の疑い（Bluetooth）・英語の初版 | OK |  |
| 165 | `soundHelpRetry` | もう一度 ▶ を押してください。 | Then press ▶ again. | 依頼・英語の初版 | OK |  |

## S12 ホーム画面に追加する方法

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 166 | `installTitle` | ホーム画面に追加する | Add to Home Screen | 英語の初版 | OK |  |
| 167 | `installIntro` | ホーム画面に追加すると、アプリのように開けて、電波が無くても使えます。 | Added to your Home Screen, it opens like an app and works without a signal. | 長さ・英語の初版 | From your Home Screen, it opens like an app and works without a signal. |  |
| 168 | `installIosStep1` | 画面の下の「…」を押します。 | Tap “…” at the bottom of the screen. | 英語の初版 | OK |  |
| 169 | `installIosStep2` | 「共有」を押します。 | Tap “Share”. | 英語の初版 | OK |  |
| 170 | `installIosStep3` | 「もっと見る」を押し、「ホーム画面に追加」を押します。 | Tap “View More”, then “Add to Home Screen”. | 英語の初版 | OK（Task 9 の Simulator（iOS 26.3）で確認済み: ja は「もっと見る」、en は “View More”（“See More” から直した）。並びに “More”（アプリの列の「その他」）もあるので “View More” と書き分ける） |  |
| 171 | `installIosStep4` | 右上の「追加」を押します。 | Tap “Add” at the top right. | 英語の初版 | OK |  |
| 172 | `installNotCarried` | 録音した声・受け取った声・ルーティンは、追加したアプリには引き継がれません。追加したアプリで、もう一度録音・受け取りをしてください。 | Recorded voices, received voices and routines don't carry over to the added app. Record or receive them again in the added app. | 依頼・長さ・英語の初版 | Voices and routines don't carry over to the Home Screen app. Record or receive them again there.（追加したアプリの英語の呼び方は “the Home Screen app” にそろえる。recordAddFirst・aboutPrivacy6 も） |  |
| 173 | `installOpenInSafari` | Safari で開くと、ホーム画面に追加できます。 | Open this page in Safari to add it to your Home Screen. | 英語の初版 | OK |  |
| 174 | `installOnPhone` | iPhone や Android で開くと、ホーム画面に追加できます。 | Open this page on your phone to add it to the Home Screen. | 英語の初版 | OK |  |
| 175 | `installCopyAddress` | アドレスをコピー | Copy the address | 技術語の疑い（アドレス・address）・英語の初版 | OK（製品判断: “Copy the link”／“Link copied” の方が “address” より馴染むかも） |  |
| 176 | `installAddressCopiedSafari` | アドレスをコピーしました。Safari を開き、アドレス欄に貼り付けてください。 | Address copied. Open Safari and paste it into the address bar. | 技術語の疑い（アドレス・address bar・address）・長さ・英語の初版 | OK（「上の」／“at the top” は D50 で外した＝Fix round 1） |  |
| 177 | `installAddressCopiedPhone` | アドレスをコピーしました。LINE やメールでスマホに送ってください。 | Address copied. Send it to your phone by LINE or email. | 技術語の疑い（アドレス・address）・英語の初版 | OK |  |
| 178 | `installAndroidButton` | ホーム画面に追加する | Add to Home Screen | 英語の初版 | OK |  |
| 179 | `installAndroidStep1` | 右上の「⋮」を押します。 | Tap “⋮” at the top right. | 英語の初版 | OK |  |
| 180 | `installAndroidStep2` | 「ホーム画面に追加」（または「アプリをインストール」）を押します。 | Tap “Add to Home screen” (or “Install app”). | 英語の初版 | OK |  |
| 181 | `installAndroidStep3` | 「インストール」を押します。 | Tap “Install”. | 英語の初版 | OK |  |
| 182 | `installDone` | このアプリはホーム画面から開いています。追加は済んでいます。 | You're using the app from your Home Screen. Nothing more to do. | 英語の初版 | You opened this from your Home Screen, so it's already added. |  |

## S13 プライバシー・アプリについて

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 183 | `deleteAllData` | データを全て消す | Delete all data | 技術語の疑い（データ・data）・英語の初版 | OK |  |
| 184 | `confirmDeleteAllTitle` | このアプリのデータを全て消しますか？ | Delete all data in this app? | 技術語の疑い（データ・data）・英語の初版 | OK |  |
| 185 | `confirmDeleteAllDetail` | 録音した声・受け取った声・ルーティン・設定が消えます。元に戻せません。 | Recorded voices, received voices, routines and settings will be deleted. This can't be undone. | 長さ・英語の初版 | OK |  |
| 186 | `confirmDeleteAll` | 消す | Delete | 英語の初版 | OK |  |
| 187 | `aboutTitle` | Dance Count について | About Dance Count | 法務確認待ち・英語の初版 | OK |  |
| 188 | `aboutApp` | Dance Count — for Ballroom　版⍽{version} | Dance Count — for Ballroom · Version⍽{version} | 法務確認待ち・技術語の疑い（版・version）・英語の初版 | OK |  |
| 189 | `aboutOperator` | 運営：くうが株式会社 | Operated by Kuga Inc. | 法務確認待ち・英語の初版 | OK |  |
| 190 | `aboutContact` | 問い合わせ | Contact | 法務確認待ち・英語の初版 | OK |  |
| 191 | `aboutNotOfficial` | このアプリのカウントは、公式のもの・監修を受けたものではありません。 | The counts in this app are not official and have not been reviewed by any organization. | 法務確認待ち・長さ・英語の初版 | OK |  |
| 192 | `aboutPrivacyHeading` | プライバシー | Privacy | 法務確認待ち・英語の初版 | OK |  |
| 193 | `aboutPrivacy1` | 録音した声・受け取った声・ルーティン・設定は、この端末の中にだけ保存されます。運営者（くうが株式会社）がこれらを受け取ることはありません。 | Recorded voices, received voices, routines and settings are saved only on this device. The operator (Kuga Inc.) never receives them. | 法務確認待ち・長さ・英語の初版 | OK |  |
| 194 | `aboutPrivacy2` | このアプリは、利用状況を集めたり、外部に送ったりする仕組みを持っていません（解析ツール・広告はなく、書体も外部から取り寄せません）。 | This app has no way to collect how it is used or to send that information anywhere (no analytics, no ads, and fonts are not fetched from other sites). | 法務確認待ち・長さ・英語の初版 | This app has no way to collect usage information or send it anywhere (no analytics, no ads, and no fonts loaded from other sites). |  |
| 195 | `aboutPrivacy3` | アプリのファイル（画面・音声・書体）を配信するサーバーには、ブラウザが通常送る情報（アクセスの日時など）が記録されることがあります。 | The server that delivers the app's files (screens, sounds and fonts) may record what browsers normally send, such as the time of access. | 法務確認待ち・技術語の疑い（ブラウザ・ファイル・サーバー・browser・file・server）・長さ・英語の初版 | The server that delivers the app's files (screens, sounds and fonts) may record information browsers normally send, such as the time of access. |  |
| 196 | `aboutPrivacy4` | マイクは、声を録音する画面でだけ使います。許可を取る時と、「録音する」「録り直す」を押した後の 1.5 秒だけ開き、すぐ閉じます。録音した声はこの端末に残り、いつでも消せます。 | The microphone is used only on the voice recording screen: when you allow access, and for 1.5 seconds after you tap “Record” or “Record again”. It is closed right after. Recordings stay on this device, and you can delete them at any time. | 法務確認待ち・技術語の疑い（マイク・microphone）・長さ・英語の初版 | The microphone is used only on the recording screen. It turns on only when you allow access and for 1.5 seconds after you tap “Record” or “Record again”, then turns off right away. Recordings stay on this device, and you can delete them at any time. |  |
| 197 | `aboutPrivacy5` | 「配る」で作ったファイルには、あなたの名前と、入れた声・ルーティン、作った日時が入ります。誰に渡すかは、あなた自身が決めます。LINE やメールでの受け渡しは、それぞれのサービスの決まりに従います。受け取ったファイルには、送った人の名前と声が入っています。 | A file made with “Share” contains your name, the voice and routines you put in it, and the date it was made. You decide who gets it. Sending it by LINE or email follows the rules of those services. A file you receive contains the sender's name and voice. | 法務確認待ち・技術語の疑い（ファイル・file）・長さ・英語の初版 | A file made with “Share” contains your name, the voice and routines you put in it, and the date it was made. You decide who gets it. If you send it by LINE or email, those services' own terms apply. A file you receive contains the sender's name and voice. |  |
| 198 | `aboutPrivacy6` | データは、この画面の「データを全て消す」か、ブラウザの設定（サイトのデータの削除）で消せます。iPhone では、Safari とホーム画面に追加したアプリで保存場所が別々です。消すのは、いま開いている方だけです。 | You can delete the data with “Delete all data” on this screen, or in your browser settings (delete the site data). On iPhone, Safari and the app added to the Home Screen keep their data separately. Only the one you have open is deleted. | 法務確認待ち・技術語の疑い（ブラウザ・データ・browser・data）・長さ・英語の初版 | You can delete the data with “Delete all data” on this screen, or in your browser settings (delete the site data). On iPhone, Safari and the Home Screen app keep their data separately, and only the one you have open is deleted. |  |
| 199 | `aboutCreditsHeading` | 使っているもの | Credits | 法務確認待ち・英語の初版 | OK |  |
| 200 | `aboutCreditFonts` | 書体：Inter・Noto Sans JP（SIL Open Font License 1.1） | Fonts: Inter and Noto Sans JP (SIL Open Font License 1.1) | 法務確認待ち・長さ・英語の初版 | OK |  |
| 201 | `aboutCreditCode` | Preact・Workbox（MIT License） | Preact and Workbox (MIT License) | 法務確認待ち・英語の初版 | OK |  |
| 202 | `aboutCreditIcons` | 一部のアイコン：Lucide（ISC License） | Some icons: Lucide (ISC License) | 法務確認待ち・英語の初版 | OK |  |

## 共通（複数の画面・部品）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 203 | `documentTitle` | Dance Count — for Ballroom | Dance Count — for Ballroom | 英語の初版 | OK |  |
| 204 | `switchLanguage` | English | 日本語 | 英語の初版 | OK |  |
| 205 | `tabFigures` | フィガー | Figures | 英語の初版 |  |  |
| 206 | `tabRoutines` | ルーティン | Routines | 英語の初版 | OK |  |
| 207 | `navLabel` | メイン | Main | 英語の初版 | OK |  |
| 208 | `back` | 戻る | Back | 英語の初版 | OK |  |
| 209 | `backToCover` | 表紙 | Cover | 英語の初版 |  |  |
| 210 | `coverMake` | 作る | Make | 英語の初版 |  |  |
| 211 | `makeRoutines` | ルーティンを作る・直す | Make and edit routines | 英語の初版 |  |  |
| 212 | `chooseDance` | 種目を選んでください | Choose a dance | 英語の初版 | OK |  |
| 213 | `danceGroup` | 種目 | Dances | 英語の初版 | OK |  |
| 214 | `resume` | 続きから | Resume | 英語の初版 | OK |  |
| 215 | `speed` | 速さ | Speed | 英語の初版 | OK |  |
| 216 | `speedSlow` | ゆっくり | Slower | 英語の初版 | OK |  |
| 217 | `speedStandard` | 標準 | Standard | 英語の初版 | OK |  |
| 218 | `speedFast` | 速め | Faster | 英語の初版 | OK |  |
| 219 | `tempoMark` | ♩={tempo} | ♩={tempo} | 英語の初版 | OK |  |
| 220 | `metronome` | メトロノーム | Metronome | 英語の初版 | OK |  |
| 221 | `leadIn` | はじめの合図 | Lead-in | 英語の初版 | 製品判断: “Count-in”（音楽・ダンスでより通じる語。leadInNow “Count-in…”・leadInLength “Count-in length” も一緒に） |  |
| 222 | `leadInNow` | はじめの合図… | Lead-in… | 英語の初版 | OK |  |
| 223 | `on` | オン | On | 英語の初版 | OK |  |
| 224 | `off` | オフ | Off | 英語の初版 | OK |  |
| 225 | `voiceChip` | 声: {name} | Voice: {name} | 英語の初版 | OK |  |
| 226 | `standardVoiceShort` | 標準（英語） | Standard (English) | 英語の初版 | OK |  |
| 227 | `moreOptions` | くわしく | More options | 英語の初版 | OK |  |
| 228 | `moreOptionsWithTempo` | くわしく · ♩={tempo} | More options · ♩={tempo} | 英語の初版 | OK |  |
| 229 | `fineSpeed` | 速さの細かい調整 | Fine speed | 英語の初版 | Fine-tune speed |  |
| 230 | `competitionSpeed` | 競技の速さ（♩={min}〜{max}） | Competition speed (♩={min}–{max}) | 英語の初版 | OK |  |
| 231 | `repeat` | 繰り返す | Repeat | 英語の初版 | OK |  |
| 232 | `play` | 再生 | Play | 英語の初版 | OK |  |
| 233 | `stop` | 停止 | Stop | 英語の初版 | OK |  |
| 234 | `nowCount` | いま {count} | Now: {count} | 英語の初版 | OK |  |
| 235 | `noSoundLink` | 音が鳴らない時は | If there is no sound | 英語の初版 | OK（ja は見出し soundHelpTitle「音が鳴らない時」にそろえて「音が鳴らない時は」に直した＝Fix round 1。en は元から同じ） |  |
| 236 | `close` | 閉じる | Close | 英語の初版 | OK |  |
| 237 | `standardVoiceEnglish` | 標準の声（英語） | Standard voice (English) | 英語の初版 | OK。製品判断（Fable OQ7）: どこでも短い “Standard (English)” にすれば 320px 幅の特別扱いが要らなくなる |  |
| 238 | `soundHelpTitle` | 音が鳴らない時 | If there is no sound | 英語の初版 | OK |  |
| 239 | `updateReady` | 新しい版があります。 | A new version is ready. | 技術語の疑い（版・version）・英語の初版 | An update is ready. |  |
| 240 | `routineSummary` | {dance} · {count} フィガー | {dance} · {count} figures | 英語の初版 | OK |  |
| 241 | `routineSummaryOne` | {dance} · 1 フィガー | {dance} · 1 figure | 英語の初版 | OK |  |
| 242 | `edit` | 編集 | Edit | 英語の初版 | OK |  |
| 243 | `delete` | 削除 | Delete | 英語の初版 | OK |  |
| 244 | `confirmDelete` | 削除する | Delete | 英語の初版 | OK |  |
| 245 | `cancel` | やめる | Cancel | 英語の初版 | OK |  |
| 246 | `undo` | 元に戻す | Undo | 英語の初版 | OK |  |
| 247 | `redo` | やり直す | Redo | 英語の初版 | OK |  |
| 248 | `counts` | カウント | Counts | 英語の初版 | OK |  |
| 249 | `done` | 決定 | Done | 英語の初版 | OK |  |
| 250 | `add` | 追加する | Add | 英語の初版 | OK |  |
| 251 | `addCopy` | {counts} で複製して追加 | Add a copy ({counts}) | 英語の初版 | OK |  |
| 252 | `matchCounts` | カウントを合わせる | Use that count | 英語の初版 | OK |  |
| 253 | `othersWillChange` | 同じ名前の{count}件も同じカウントになります | The other {count} will change too | 英語の初版 | Other figures with this name will change too ({count}) |  |
| 254 | `updateAll` | {count}件まとめて決定 | Update all {count} | 英語の初版 | OK |  |
| 255 | `settingsTitle` | 設定 | Settings | 英語の初版 | OK |  |
| 256 | `standardVoiceJapanese` | 標準の声（日本語） | Standard voice (Japanese) | 英語の初版 | OK |  |
| 257 | `standardVoiceJapaneseShort` | 標準（日本語） | Standard (Japanese) | 英語の初版 | OK |  |
| 258 | `distributorVoice` | {name}の声 | {name}'s voice | 英語の初版 | OK（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 259 | `defaultVoiceNameEn` | 自分の声（英語） | My voice (English) | 英語の初版 | OK |  |
| 260 | `defaultVoiceNameJa` | 自分の声（日本語） | My voice (Japanese) | 英語の初版 | OK |  |
| 261 | `previewVoice` | 試聴 | Preview | 英語の初版 | OK |  |
| 262 | `voiceTiming` | 声のタイミング | Voice timing | 英語の初版 | OK |  |
| 263 | `voiceEarlier` | 早く | Earlier | 英語の初版 | OK |  |
| 264 | `voiceLater` | 遅く | Later | 英語の初版 | OK |  |
| 265 | `voiceTimingHint` | 声が遅れて聞こえたら「早く」を押します。 | If the voice sounds late, press “Earlier”. | 英語の初版 | If the voice sounds late, tap “Earlier”. |  |
| 266 | `share` | 配る | Share | 英語の初版 | OK（製品判断: “Send” にするかは「先に決めてほしいこと」1） |  |
| 267 | `shareRoutines` | ルーティンを配る | Share routines | 英語の初版 | OK（製品判断: “Send” にするかは「先に決めてほしいこと」1） |  |
| 268 | `receiveFromFile` | ファイルから受け取る | Receive from a file | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 269 | `instructionsCopyByHand` | 長押しで選んでコピーできます。 | Press and hold to select and copy. | 英語の初版 | Touch and hold the text to select and copy it. |  |
| 270 | `backupTipRoutine` | ルーティンは「配る」でファイルにして、自分にも送っておけます。 | You can turn routines into a file with “Share” and send it to yourself. | 技術語の疑い（ファイル・file）・長さ・英語の初版 | Use “Share” to save routines in a file you can send to yourself. |  |
| 271 | `updateApp` | 更新する | Update | 英語の初版 | OK |  |
| 272 | `languageEnglish` | 英語 | English | 英語の初版 | OK |  |
| 273 | `languageJapanese` | 日本語 | Japanese | 英語の初版 | OK |  |

## 生徒への案内文（S9 でコピーされる）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 274 | `instructionsVoiceLead` | Dance Count で、私の声のカウントを使えます。 | You can practice with my voice in Dance Count. | 英語の初版 | OK |  |
| 275 | `instructionsRoutinesLead` | Dance Count で、私のルーティンを使えます。 | You can use my routines in Dance Count. | 英語の初版 | OK |  |
| 276 | `instructionsIphone` | 【iPhone】1. このファイルを開き、右上の共有ボタン →「"ファイル"に保存」 | [iPhone] 1. Open this file, tap Share (top right) → “Save to Files” | 技術語の疑い（ファイル・file）・長さ・英語の初版 | [iPhone] 1. Open this file, tap “Share” (top right) → “Save to Files” |  |
| 277 | `instructionsStep2` | 2. Dance Count を開き「使う」→ 下の「ルーティン」→「ファイルから受け取る」→「ファイルを選ぶ」 | 2. Open Dance Count → “Use” → “Routines” (bottom tab) → “Receive from a file” → “Choose a file” | 長さ・英語の初版 | OK |  |
| 278 | `instructionsStep3` | 3. 「最近使った項目」からこのファイルを選び「使う」 | 3. Choose this file from “Recents” and tap “Use” | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 279 | `instructionsAndroid` | 【Android】このファイルを開き、共有 →「Dance Count」→「使う」（「Dance Count」が出てこない時は、保存してから 2・3 の手順で「ファイルを選ぶ」） | [Android] Open this file, tap Share → “Dance Count” → “Use” (if “Dance Count” is not listed, save the file and follow steps 2–3 to “Choose a file”) | 技術語の疑い（ファイル・file）・長さ・英語の初版 | [Android] Open this file, tap “Share” → “Dance Count” → “Use” (if “Dance Count” is not listed, save the file and follow steps 2–3 to “Choose a file”) |  |
| 280 | `instructionsPhone` | （スマホで受け取るのが便利です） | (It's easiest on your phone.) | 英語の初版 | (It's easiest to receive this on your phone.) |  |

## エラー・知らせ（仕様 §11）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 281 | `noSoundTitle` | 音が出ていません。 | No sound is playing. | 英語の初版 | OK |  |
| 282 | `noSoundBody` | 本体の消音スイッチを確かめて、もう一度 ▶ を押してください。 | Check the silent switch and press ▶ again. | 依頼・英語の初版 | 製品判断: Make sure your phone isn't on silent, then press ▶ again.（soundHelpSwitch と同じ理由。ja 案「消音（マナーモード）になっていないか確かめて、もう一度 ▶ を押してください。」） |  |
| 283 | `playbackStopped` | 再生が止まりました。もう一度 ▶ を押してください。 | Playback stopped. Press ▶ again. | 依頼・英語の初版 | OK |  |
| 284 | `voiceMissing` | この声はまだ端末に入っていません。インターネットにつないで一度再生してください。 | This voice isn't on your device yet. Connect to the internet and play once. | 依頼・長さ・英語の初版 | This voice isn't on this device yet. Go online and play it once. |  |
| 285 | `wakeLockTip` | 練習中は画面が暗くなることがあります。自動ロックを長めにすると便利です。 | Your screen may dim during practice. A longer Auto-Lock helps. | 長さ・英語の初版 | The screen may dim while you practice. A longer Auto-Lock helps. |  |
| 286 | `saveFailed` | 保存できませんでした。空き容量を確かめてください。 | Couldn't save. Please check free space. | 依頼・英語の初版 | OK |  |
| 287 | `clearAllFailed` | 消せませんでした。ブラウザの設定からサイトのデータを消すこともできます。 | Couldn't delete. You can also delete the site data in your browser settings. | 技術語の疑い（ブラウザ・データ・browser・data）・長さ・英語の初版 | Couldn't delete. You can also clear site data in your browser settings. |  |
| 288 | `noVoiceHeard` | 声が入っていませんでした。もう一度録音してください。 | We couldn't hear your voice. Please record again. | 依頼・英語の初版 | OK |  |
| 289 | `micDenied` | マイクが使えない設定になっています。 | The microphone is turned off for this app. | 技術語の疑い（マイク・microphone）・英語の初版 | OK |  |
| 290 | `micFailed` | マイクを使えませんでした。ほかのアプリや通話を終えてから、もう一度「録音をはじめる」を押してください。 | The microphone couldn't be used. Close other apps or end the call, then tap “Start recording” again. | 依頼・技術語の疑い（マイク・microphone）・長さ・英語の初版 | Couldn't use the microphone. End any call or close other apps, then tap “Start recording” again. |  |
| 291 | `noRecorder` | このブラウザでは録音できません。Safari（iPhone）か Chrome で開いてください。 | This browser can't record. Open this page in Safari (iPhone) or Chrome. | 技術語の疑い（ブラウザ・browser）・長さ・英語の初版 | OK |  |
| 292 | `shareRefused` | 共有できませんでした。下の「ファイルを保存する」で保存できます。 | Sharing didn't work. You can save it with “Save the file” below. | 英語の初版 | OK |  |
| 293 | `openedInLine` | LINE の中で開いています。Safari か Chrome で開き直すと、受け取った声がずっと残ります。 | This is open inside LINE. Open it in Safari or Chrome so the voice stays on your phone. | 長さ・英語の初版 | You're in LINE. Open this in Safari or Chrome to keep received voices. |  |
| 294 | `fileBroken` | このファイルは読めませんでした。先生に送り直してもらってください。（{file}） | This file couldn't be read. Ask your teacher to send it again. ({file}) | 技術語の疑い（ファイル・file）・長さ・英語の初版 | OK |  |
| 295 | `fileTooLarge` | このファイルは大きすぎて受け取れません。 | This file is too large. | 技術語の疑い（ファイル・file）・英語の初版 | This file is too large to receive. |  |
| 296 | `fileTooNew` | 新しいアプリで作られたファイルです。アプリを更新してください。 | This file was made by a newer version. Please update the app. | 依頼・技術語の疑い（ファイル・file・version）・英語の初版 | This file was made with a newer version of this app. Please update this app. |  |
| 297 | `voiceLimitReached` | 声はすでに {count} あるので、受け取れません。使わない声を削除してから、もう一度選んでください。 | You already have {count} voices. Delete one you don't use, then choose the file again. | 技術語の疑い（file）・長さ・英語の初版 | You already have {count} voices. Delete one you don't use, then try again. |  |
| 298 | `routineUnreadable` | ルーティン「{name}」は読めませんでした。 | Routine “{name}” couldn't be read. | 英語の初版 | OK |  |
| 299 | `routinesUnreadableMore` | ほか {count} 本も読めませんでした。 | {count} more routines couldn't be read. | 英語の初版 | OK |  |
| 300 | `routinesOverLimit` | ルーティンは {max} 本までなので、{count} 本は受け取れません。 | You can keep up to {max} routines, so {count} can't be received. | 英語の初版 | OK |  |

## 脚注: 節ごとの依頼の数（1 画面 1 つまでの材料。1 つの画面に同時に出る数ではない）

- S0 表紙: 0
- S1 使う › フィガー（種目）: 0
- F1 種目のフィガー: 0
- S2 再生: 0
- U2・M1 ルーティン（使う・作る）: 0
- M0 作る: 0
- S4 ルーティン編集: 1
- S5 ルーティン再生: 0
- S6 設定: 0
- S7 声: 0
- S8 自分の声を録音: 1
- S9 配る: 0
- S10 受け取る: 0
- S11 音が鳴らない時: 1
- S12 ホーム画面に追加する方法: 1
- S13 プライバシー・アプリについて: 0
- 共通（複数の画面・部品）: 0
- 生徒への案内文（S9 でコピーされる）: 0
- エラー・知らせ（仕様 §11）: 7
