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
| 4 | `coverUseFor` | （生徒の方） | (students) | 英語の初版 |  |  |
| 5 | `coverUseSub` | 種目のカウントで練習する・先生のルーティンを鳴らす | Practice a dance's count · Play your teacher's routines | 英語の初版 |  |  |
| 6 | `coverMakeFor` | （指導者の方） | (teachers) | 英語の初版 |  |  |
| 7 | `coverMakeSub` | 自分の声を録音する・ルーティンを作る・生徒に配る | Record your voice · Make routines · Share with students | 英語の初版 |  |  |
| 8 | `coverSettingsSub` | 言語・困った時は・アプリについて | Language · Help · About | 英語の初版 |  |  |
| 9 | `continueLast` | 前回の練習 | Last practice | 英語の初版 |  |  |

## S1 使う › フィガー（種目）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 10 | `lastTime` | 前回 | Last time | 英語の初版 | OK |  |
| 11 | `installCard` | ホーム画面に追加すると、アプリのように使えます | Add to your Home Screen to use it like an app | 英語の初版 | Add it to your Home Screen to use it like an app |  |

## F1 種目のフィガー

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 12 | `basicCount` | 基本のカウント | Basic count | 英語の初版 |  |  |

## S2 再生

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 13 | `countPattern` | カウントの型 | Count pattern | 英語の初版 | OK |  |

## U2・M1 ルーティン（使う・作る）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 14 | `editFromMake` | ルーティンを直す・消す時は、トップの「作る」から。 | To edit or delete a routine, go to “Make” on the home screen. | 英語の初版 |  |  |
| 15 | `cannotPlayEmpty` | フィガーがありません。「作る」で直せます。 | No figures yet. You can fix this in “Make”. | 英語の初版 |  |  |
| 16 | `cannotPlayFix` | カウントに直す所があります。「作る」で直せます。 | Some counts need fixing. You can fix this in “Make”. | 英語の初版 |  |  |
| 17 | `routinesTitle` | ルーティン | Routines | 英語の初版 | OK |  |
| 18 | `routinesEmpty` | まだルーティンはありません | No routines yet | 英語の初版 | OK |  |
| 19 | `newRoutine` | 新しいルーティン | New routine | 英語の初版 | OK |  |
| 20 | `receivedFrom` | {name}から | From {name} | 英語の初版 | OK（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 21 | `needsFigures` | フィガーを追加すると再生できます。 | Add a figure to play this routine. | 英語の初版 | OK |  |
| 22 | `needsFix` | カウントに直す所があります。 | Some counts need fixing. | 英語の初版 | OK |  |
| 23 | `confirmDeleteTitle` | このルーティンを削除しますか？ | Delete this routine? | 英語の初版 | OK |  |

## M0 作る

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 24 | `makeIntro` | 指導者の方へ。作った物は「配る」でファイルにして生徒に送れます。 | For instructors. Use “Share” to turn what you make into a file for your students. | 技術語の疑い（ファイル・file）・長さ・英語の初版 |  |  |
| 25 | `makeShare` | 配る（ファイルを作る） | Share (make a file) | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 26 | `makeShareSub` | 声とルーティンを 1 つのファイルに | Your voice and routines in one file | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 27 | `voiceStatusNone` | まだ録音していません | Not recorded yet | 英語の初版 |  |  |
| 28 | `voiceStatusPack` | {language} · {count} / {total} 語 | {language} · {count} / {total} words | 英語の初版 |  |  |
| 29 | `voiceStatusDone` | 録音済み | Recorded | 英語の初版 |  |  |
| 30 | `routinesCount` | {count} 本（受け取った物も直せます） | {count} routines (received ones too) | 英語の初版 |  |  |
| 31 | `routinesCountOne` | 1 本（受け取った物も直せます） | 1 routine (received ones too) | 英語の初版 |  |  |
| 32 | `routinesNone` | まだありません | None yet | 英語の初版 |  |  |
| 33 | `recordVoice` | 自分の声を録音する | Record your voice | 英語の初版 | OK |  |

## S4 ルーティン編集

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 34 | `newRoutineTitle` | 新しいルーティン | New routine | 英語の初版 | OK |  |
| 35 | `editRoutineTitle` | ルーティンの編集 | Edit routine | 英語の初版 | OK |  |
| 36 | `defaultRoutineName` | {dance}のルーティン | {dance} routine | 英語の初版 | OK |  |
| 37 | `routineName` | 名前 | Name | 英語の初版 | OK |  |
| 38 | `danceLine` | 種目: {dance} | Dance: {dance} | 英語の初版 | OK |  |
| 39 | `changeDance` | 変える | Change | 英語の初版 | OK |  |
| 40 | `noFigures` | フィガーはまだありません。 | No figures yet. | 英語の初版 | OK |  |
| 41 | `addFigure` | フィガーを追加 | Add a figure | 英語の初版 | OK |  |
| 42 | `newFigure` | 新しいフィガー | New figure | 英語の初版 | OK |  |
| 43 | `figureName` | フィガーの名前 | Figure name | 英語の初版 | OK |  |
| 44 | `figureSuggestions` | 名前の候補 | Suggested names | 英語の初版 | OK |  |
| 45 | `figureChoices` | {dance}のフィガー（{count}） | {dance} figures ({count}) | 英語の初版 | OK |  |
| 46 | `commonCounts` | カウントの形 | Count patterns | 英語の初版 | OK |  |
| 47 | `allowedSymbols` | 使える文字：{symbols} | Allowed: {symbols} | 英語の初版 | You can use: {symbols} |  |
| 48 | `countsFromHistory` | 前に使ったカウントです | Count you used before | 英語の初版 |  |  |
| 49 | `countsFromReviewed` | 目安のカウントです | Typical count | 英語の初版 |  |  |
| 50 | `sameNameExists` | 同じ名前があります（{counts}） | Same name exists ({counts}) | 英語の初版 | This name is already used ({counts}) |  |
| 51 | `sameNameCopy` | 同じ名前があります：{name}（{counts}） | Same name exists: {name} ({counts}) | 英語の初版 | {name} ({counts}) already exists |  |
| 52 | `renameForOtherCount` | 名前を変えると、違うカウントにできます | Use another name for a different count | 英語の初版 | Use a different name for a different count |  |
| 53 | `offBarFigure` | {beats}拍のカウントではありません | Not a {beats}-beat count | 英語の初版 | OK |  |
| 54 | `offBarFigureEdit` | {beats}拍のカウントではありません。必要なら編集してください。 | Not a {beats}-beat count. Edit it if needed. | 依頼・英語の初版 | OK |  |
| 55 | `routineEndsMidBar` | 小節の途中で終わっています。繰り返すと頭がずれます。 | The routine ends mid-bar, so repeats start off the beat. | 英語の初版 | The routine ends mid-bar, so repeats won't start on beat 1. |  |
| 56 | `startWithBeat` | 最初は数字か S・Q から | Start with a number, S or Q | 英語の初版 | OK |  |
| 57 | `countsInvalid` | この並びでは数えられません | This count can't be played | 英語の初版 | OK |  |
| 58 | `nameNeeded` | 名前を入れると決定できます | Add a name to finish | 英語の初版 | Enter a name to finish |  |
| 59 | `previewFigure` | このフィガーを試聴 | Play this figure | 英語の初版 | OK |  |
| 60 | `moveUp` | 上へ | Up | 英語の初版 | OK |  |
| 61 | `moveDown` | 下へ | Down | 英語の初版 | OK |  |
| 62 | `duplicate` | 複製 | Duplicate | 英語の初版 | OK |  |
| 63 | `moveFigureLabel` | {name}を動かす | Move {name} | 英語の初版 | OK |  |
| 64 | `previewAll` | 全体を試聴 | Play all | 英語の初版 | OK |  |
| 65 | `leadInLength` | はじめの合図の長さ | Lead-in length | 英語の初版 | OK（製品判断: leadIn の “Count-in” 案と一緒に決める） |  |
| 66 | `oneBar` | 1小節 | 1 bar | 英語の初版 | OK |  |
| 67 | `twoBars` | 2小節 | 2 bars | 英語の初版 | OK |  |
| 68 | `routineSpeed` | 速さ | Speed | 英語の初版 | OK |  |
| 69 | `danceStandardSpeed` | 種目の標準（♩={tempo}） | Dance standard (♩={tempo}) | 英語の初版 | Standard for this dance (♩={tempo}) |  |

## S5 ルーティン再生

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 70 | `madeByYou` | {dance} · あなたが作成 | {dance} · made by you | 英語の初版 | OK |  |
| 71 | `madeBy` | {dance} · {name}が作成 | {dance} · made by {name} | 英語の初版 | OK（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 72 | `figuresHeading` | フィガー | Figures | 英語の初版 | OK |  |
| 73 | `practiceRange` | 練習する範囲 | Practice range | 英語の初版 | OK |  |
| 74 | `previous` | 前 | Prev | 英語の初版 | Previous（幅が許せば。略語 “Prev” は年配の方に読みにくい） |  |
| 75 | `next` | 次 | Next | 英語の初版 | OK |  |

## S6 設定

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 76 | `settingsInstall` | ホーム画面に追加する方法 | How to add to the Home Screen | 英語の初版 | OK |  |
| 77 | `settingsHelpHeading` | 困った時は | If something's wrong | 英語の初版 | If something goes wrong |  |
| 78 | `settingsAbout` | プライバシー・アプリについて | Privacy & about this app | 英語の初版 | OK。製品判断（Fable OQ7）: 短い語（例 “About & privacy”）にすれば 320px 幅の特別扱いが要らなくなる |  |
| 79 | `settingsAboutHeading` | このアプリについて | About this app | 英語の初版 |  |  |
| 80 | `versionLabel` | 版 {version} | Version {version} | 技術語の疑い（版・version）・英語の初版 | OK |  |
| 81 | `settingsLanguage` | 言語 | Language | 英語の初版 | OK |  |

## S7 声

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 82 | `recordFromMake` | 自分の声の録音は、トップの「作る」から。 | To record your own voice, go to “Make” on the home screen. | 英語の初版 |  |  |
| 83 | `voicesTitle` | 声 | Voice | 英語の初版 | Voices |  |
| 84 | `voiceInProgressCount` | ·⍽{count}⍽/⍽12⍽語 | ·⍽{count}⍽/⍽12⍽words | 英語の初版 | OK |  |
| 85 | `confirmDeleteVoiceTitle` | この声を削除しますか？ | Delete this voice? | 英語の初版 | OK |  |
| 86 | `continueRecording` | 続きを録音する | Continue recording | 英語の初版 | OK |  |

## S8 自分の声を録音

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 87 | `recordAddFirst` | ホーム画面に追加してから録音するのがおすすめです。このブラウザで録音した声は、追加したアプリには引き継がれません。（追加の方法は、設定の「ホーム画面に追加する方法」） | We recommend adding to the Home Screen before recording. A voice recorded in this browser won't carry over to the added app. (See Settings → “How to add to the Home Screen”.) | 技術語の疑い（ブラウザ・browser）・長さ・英語の初版 | Before recording, we recommend adding this to your Home Screen. Voices recorded in this browser don't carry over to the Home Screen app. (Settings → “How to add to the Home Screen”) |  |
| 88 | `recordTitle` | 自分の声を録音 | Record your voice | 英語の初版 | OK |  |
| 89 | `recordIntro1` | 12 語を、1 語ずつ録音します。 | You will record 12 words, one at a time. | 英語の初版 | OK |  |
| 90 | `recordIntro2` | 録音は、この端末の中にだけ残ります。 | Recordings stay on this device only. | 英語の初版 | OK |  |
| 91 | `recordIntro3` | いつでも消せます。 | You can delete them at any time. | 英語の初版 | OK |  |
| 92 | `recordLanguage` | 数える言葉 | Count in | 英語の初版 | Counting language |  |
| 93 | `countInEnglish` | 英語で数える（One, Two, Slow…） | Count in English (One, Two, Slow…) | 英語の初版 | OK |  |
| 94 | `countInJapanese` | 日本語で数える（いち、に、スロー…） | Count in Japanese (ichi, ni, san…) | 英語の初版 | OK |  |
| 95 | `recordedUpTo` | {count}⍽/⍽12⍽語まで録音済み | {count}⍽/⍽12⍽words recorded | 英語の初版 | OK |  |
| 96 | `recordedAll` | 録音済み（12 語） | Recorded (12 words) | 英語の初版 | OK |  |
| 97 | `startRecording` | 録音をはじめる | Start recording | 英語の初版 | OK |  |
| 98 | `wordProgress` | {index} / 12 語 | {index} / 12 words | 英語の初版 | OK |  |
| 99 | `recordHint` | 「今！」の合図で「{word}」と言ってください。 | At “Now!”, say “{word}”. | 英語の初版 | OK |  |
| 100 | `recordWord` | 録音する | Record | 英語の初版 | OK |  |
| 101 | `recordAgain` | 録り直す | Record again | 英語の初版 | OK |  |
| 102 | `reviewFromFirst` | 1⍽語目から見直す | Review from word 1 | 英語の初版 | OK |  |
| 103 | `recordingNow` | 録音中 | Recording | 英語の初版 | OK |  |
| 104 | `recordCancel` | やめる | Cancel | 英語の初版 |  |  |
| 105 | `recordCueNow` | 今！ | Now! | 英語の初版 |  |  |
| 106 | `recordAutoStop` | 約⍽2⍽秒で自動で止まります | Stops automatically in about 2 seconds | 英語の初版 |  |  |
| 107 | `listenTake` | 聞く | Play | 英語の初版 | OK |  |
| 108 | `previousWord` | 前の語 | Previous | 英語の初版 | OK |  |
| 109 | `nextWord` | 次へ | Next | 英語の初版 | OK |  |
| 110 | `finishRecording` | 完成へ | Finish | 英語の初版 | OK |  |
| 111 | `micHowTo` | 設定の開き方 | How to allow it | 英語の初版 | OK |  |
| 112 | `micHowToIphone` | iPhone：設定 → アプリ → Safari → マイク（ホーム画面から開いた時は、Safari のかわりにこのアプリの名前） | iPhone: Settings → Apps → Safari → Microphone (if you opened it from the Home Screen, this app's name instead of Safari) | 技術語の疑い（マイク・microphone）・長さ・英語の初版 | iPhone: Settings → Apps → Safari → Microphone (if you opened it from your Home Screen, choose this app's name instead of Safari) |  |
| 113 | `micHowToOther` | Android・PC：アドレスバーの左のマーク → マイク | Android / PC: the icon at the left of the address bar → Microphone | 技術語の疑い（アドレスバー・アドレス・マイク・address bar・address・microphone）・英語の初版 | Android / PC: the icon at the left end of the address bar → Microphone |  |
| 114 | `micHowToThen` | 許可したら、もう一度「録音をはじめる」を押してください。 | Then tap “Start recording” again. | 依頼・英語の初版 | After allowing it, tap “Start recording” again. |  |
| 115 | `recordNeedsHttps` | 安全な接続（https）で開くと録音できます。 | Recording works only over a secure (https) connection. | 英語の初版 |  |  |
| 116 | `voiceReadyTitle` | 録音できました | Your voice is ready | 英語の初版 | OK |  |
| 117 | `voiceName` | 名前 | Name | 英語の初版 | OK |  |
| 118 | `compareTitle` | ワルツで聞き比べる | Compare with the waltz | 英語の初版 | Compare using a waltz |  |
| 119 | `yourVoice` | 自分の声 | Your voice | 英語の初版 | OK |  |
| 120 | `standardVoice` | 標準の声 | Standard voice | 英語の初版 | OK |  |
| 121 | `finishDone` | 完了 | Done | 英語の初版 | OK |  |
| 122 | `backupTipRecording` | 「配る」で作ったファイルを自分にも送っておくと、端末を替えても声を使えます。 | Send yourself the file made with “Share” and you can use this voice on another phone. | 技術語の疑い（ファイル・file）・長さ・英語の初版 | Send yourself the file from “Share” to keep this voice if you change phones. |  |

## S9 配る

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 123 | `shareTitle` | 配る | Share | 英語の初版 | OK |  |
| 124 | `shareYourName` | あなたの名前 | Your name | 英語の初版 | OK |  |
| 125 | `shareNameNeeded` | 名前を入れると、ファイルを作れます。 | Enter your name to create the file. | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 126 | `shareVoiceHeading` | 声 | Voice | 英語の初版 | OK |  |
| 127 | `shareVoiceNone` | 入れない | None | 英語の初版 | OK |  |
| 128 | `shareNoRecordedVoice` | 録音した声はまだありません。 | You haven't recorded a voice yet. | 英語の初版 | OK |  |
| 129 | `shareVoiceInProgress` | {language}の声は {count} / {total} 語まで録音ずみです。{total} 語そろうと配れます。 | Your {language} voice has {count} / {total} words. It can be shared once all {total} are recorded. | 長さ・英語の初版 |  |  |
| 130 | `shareVoicePrepFailed` | この声はファイルにできませんでした。 | This voice couldn't be put in a file. | 技術語の疑い（ファイル・file）・英語の初版 | This voice couldn't be added to the file. |  |
| 131 | `shareConsent` | 自分の声をこのファイルに入れて配ることに同意します。配り先は自分で管理します。 | I agree to put my voice in this file and share it. I will manage who receives it. | 技術語の疑い（ファイル・file）・長さ・英語の初版 | I agree to share my voice in this file. I'll decide who receives it. |  |
| 132 | `shareConsentNeeded` | 同意すると、ファイルを作れます。 | Tick the box to create the file. | 技術語の疑い（ファイル・file）・英語の初版 | Check the box to create the file. |  |
| 133 | `shareRoutinesHeading` | ルーティン | Routines | 英語の初版 | OK |  |
| 134 | `shareNoRoutines` | 配れるルーティンはまだありません。 | No routines to share yet. | 英語の初版 | OK |  |
| 135 | `shareChooseSomething` | 声かルーティンを選ぶと、ファイルを作れます。 | Choose a voice or a routine to create the file. | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 136 | `shareNothingYet` | 先に声を録音するか、ルーティンを作ると配れます。 | Record a voice or make a routine first, and then you can share it. | 英語の初版 | OK（D51・代理決定。S9 を録音もルーティンも無いまま開いた時の帯の 1 行。final-review m2） |  |
| 137 | `createFile` | ファイルを作る | Create file | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 138 | `shareAfterSend` | ファイルを送ったら、下の案内文も送ってください。 | After sending the file, send the instructions below too. | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 139 | `shareSaved` | 「{file}」を保存しました。LINE やメールに添付できます。 | “{file}” has been saved. You can attach it to LINE or email. | 英語の初版 | Saved “{file}”. You can attach it in LINE or to an email. |  |
| 140 | `copyInstructions` | 生徒への案内文をコピー | Copy instructions for students | 英語の初版 | OK |  |
| 141 | `instructionsCopied` | 案内文をコピーしました。LINE やメールに貼れます。 | Copied. You can paste it into LINE or email. | 英語の初版 | OK |  |
| 142 | `instructionsLabel` | 生徒への案内文 | Instructions for students | 英語の初版 | OK |  |

## S10 受け取る

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 143 | `receiveTitle` | 受け取る | Receive | 英語の初版 | OK |  |
| 144 | `chooseFile` | ファイルを選ぶ | Choose a file | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 145 | `readingFile` | 読んでいます… | Reading… | 英語の初版 | OK |  |
| 146 | `receiveHelpLine` | LINE で届いたファイルは、先に「"ファイル"に保存」しておくと、ここで選べます。 | If the file came by LINE, save it with “Save to Files” first. | 技術語の疑い（ファイル・file）・長さ・英語の初版 | OK |  |
| 147 | `receiveHelpRecents` | 選ぶ画面では「最近使った項目」にあります。 | You will find it under “Recents”. | 英語の初版 | You'll find it under “Recents”. |  |
| 148 | `openInSafari` | Safari で開く | Open in Safari | 英語の初版 | OK |  |
| 149 | `inThisFile` | このファイルの中身 | In this file | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 150 | `fileVoiceFrom` | {name}の声（{language}）· {count} 語 | {name}'s voice ({language}) · {count} words | 英語の初版 | OK（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 151 | `fileVoiceNamed` | {name}（{language}）· {count} 語 | {name} ({language}) · {count} words | 英語の初版 | OK |  |
| 152 | `fileRoutinesOne` | ルーティン 1 本: {names} | 1 routine: {names} | 英語の初版 | OK |  |
| 153 | `fileRoutines` | ルーティン {count} 本: {names} | {count} routines: {names} | 英語の初版 | OK |  |
| 154 | `namesAndMore` | {names} ほか {count} 本 | {names} and {count} more | 英語の初版 | OK |  |
| 155 | `routineNoName` | （名前なし） | (no name) | 英語の初版 | OK |  |
| 156 | `replaceVoiceFrom` | {name}の声はすでにあります。「使う」で新しい方に置き換わります。 | You already have {name}'s voice. “Use” replaces it with this one. | 英語の初版 | You already have {name}'s voice. Tap “Use” to replace it with this one.（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 157 | `replaceVoiceNamed` | 「{name}」はすでにあります。「使う」で新しい方に置き換わります。 | You already have “{name}”. “Use” replaces it with this one. | 英語の初版 | You already have “{name}”. Tap “Use” to replace it with this one. |  |
| 158 | `replaceRoutines` | 同じルーティンは新しい方に置き換わります。 | Routines you already have are replaced with the new ones. | 英語の初版 | OK |  |
| 159 | `useFile` | 使う | Use | 英語の初版 | OK |  |
| 160 | `receivedTitle` | 受け取りました | Received | 英語の初版 | OK |  |
| 161 | `receivedVoiceFrom` | 「使う」で種目を選んで ▶ を押すと、{name}の声で鳴ります。 | Choose a dance in “Use” and press ▶ to hear {name}'s voice. | 英語の初版 | OK（Fable 2026-10-13: 「ホームで」をやめ「「使う」で」に。英語は “Home screen” が iPhone の「ホーム画面」と紛れるので “Choose a dance in “Use””。アプリのタブ名は ja「使う」／en “Use”）（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 162 | `receivedVoiceNamed` | 「使う」で種目を選んで ▶ を押すと、「{name}」で鳴ります。 | Choose a dance in “Use” and press ▶ to hear “{name}”. | 英語の初版 | OK（receivedVoiceFrom と同じ理由。Fable 2026-10-13: 「ホームで」→「「使う」で」） |  |
| 163 | `receivedRoutines` | 「ルーティン」に入っています。 | They are in “Routines”. | 英語の初版 | You'll find them in “Routines”. |  |
| 164 | `receivedRoutinesToo` | ルーティンは、下の「ルーティン」にあります。 | The routines are under “Routines” at the bottom. | 英語の初版 |  |  |
| 165 | `goHome` | 種目を選ぶ | Choose a dance | 英語の初版 | OK（Fable 2026-10-13: 「ホームへ」→「種目を選ぶ」／“Choose a dance”。“Home” と iPhone の「ホーム画面」の紛れを避ける。画面に「ホーム」という語は無い） |  |
| 166 | `seeRoutines` | ルーティンを見る | See routines | 英語の初版 | OK |  |

## S11 音が鳴らない時

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 167 | `soundHelpSwitch` | 本体横のスイッチ（マナーモード）を確かめる | Check the switch on the side of your phone (silent mode). | 英語の初版 | 製品判断: Make sure your phone isn't on silent.（iPhone 15 Pro 以降と Android には横の消音スイッチが無い。ja 案「消音（マナーモード）になっていないか確かめる」。今の文はスイッチのある SE 向けのまま） |  |
| 168 | `soundHelpVolume` | 音量を上げる | Turn the volume up. | 英語の初版 | OK |  |
| 169 | `soundHelpEarphones` | イヤホン・Bluetooth の接続を確かめる | Check your earphones or Bluetooth connection. | 技術語の疑い（Bluetooth）・英語の初版 | OK |  |
| 170 | `soundHelpRetry` | もう一度 ▶ を押してください。 | Then press ▶ again. | 依頼・英語の初版 | OK |  |

## S12 ホーム画面に追加する方法

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 171 | `installTitle` | ホーム画面に追加する | Add to Home Screen | 英語の初版 | OK |  |
| 172 | `installIntro` | ホーム画面に追加すると、アプリのように開けて、電波が無くても使えます。 | Added to your Home Screen, it opens like an app and works without a signal. | 長さ・英語の初版 | From your Home Screen, it opens like an app and works without a signal. |  |
| 173 | `installIosStep1` | 画面の下の「…」を押します。 | Tap “…” at the bottom of the screen. | 英語の初版 | OK |  |
| 174 | `installIosStep2` | 「共有」を押します。 | Tap “Share”. | 英語の初版 | OK |  |
| 175 | `installIosStep3` | 「もっと見る」を押し、「ホーム画面に追加」を押します。 | Tap “View More”, then “Add to Home Screen”. | 英語の初版 | OK（Task 9 の Simulator（iOS 26.3）で確認済み: ja は「もっと見る」、en は “View More”（“See More” から直した）。並びに “More”（アプリの列の「その他」）もあるので “View More” と書き分ける） |  |
| 176 | `installIosStep4` | 右上の「追加」を押します。 | Tap “Add” at the top right. | 英語の初版 | OK |  |
| 177 | `installNotCarried` | 録音した声・受け取った声・ルーティンは、追加したアプリには引き継がれません。追加したアプリで、もう一度録音・受け取りをしてください。 | Recorded voices, received voices and routines don't carry over to the added app. Record or receive them again in the added app. | 依頼・長さ・英語の初版 | Voices and routines don't carry over to the Home Screen app. Record or receive them again there.（追加したアプリの英語の呼び方は “the Home Screen app” にそろえる。recordAddFirst・aboutPrivacy6 も） |  |
| 178 | `installOpenInSafari` | Safari で開くと、ホーム画面に追加できます。 | Open this page in Safari to add it to your Home Screen. | 英語の初版 | OK |  |
| 179 | `installOnPhone` | iPhone や Android で開くと、ホーム画面に追加できます。 | Open this page on your phone to add it to the Home Screen. | 英語の初版 | OK |  |
| 180 | `installCopyAddress` | アドレスをコピー | Copy the address | 技術語の疑い（アドレス・address）・英語の初版 | OK（製品判断: “Copy the link”／“Link copied” の方が “address” より馴染むかも） |  |
| 181 | `installAddressCopiedSafari` | アドレスをコピーしました。Safari を開き、アドレス欄に貼り付けてください。 | Address copied. Open Safari and paste it into the address bar. | 技術語の疑い（アドレス・address bar・address）・長さ・英語の初版 | OK（「上の」／“at the top” は D50 で外した＝Fix round 1） |  |
| 182 | `installAddressCopiedPhone` | アドレスをコピーしました。LINE やメールでスマホに送ってください。 | Address copied. Send it to your phone by LINE or email. | 技術語の疑い（アドレス・address）・英語の初版 | OK |  |
| 183 | `installAndroidButton` | ホーム画面に追加する | Add to Home Screen | 英語の初版 | OK |  |
| 184 | `installAndroidStep1` | 右上の「⋮」を押します。 | Tap “⋮” at the top right. | 英語の初版 | OK |  |
| 185 | `installAndroidStep2` | 「ホーム画面に追加」（または「アプリをインストール」）を押します。 | Tap “Add to Home screen” (or “Install app”). | 英語の初版 | OK |  |
| 186 | `installAndroidStep3` | 「インストール」を押します。 | Tap “Install”. | 英語の初版 | OK |  |
| 187 | `installDone` | このアプリはホーム画面から開いています。追加は済んでいます。 | You're using the app from your Home Screen. Nothing more to do. | 英語の初版 | You opened this from your Home Screen, so it's already added. |  |

## S13 プライバシー・アプリについて

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 188 | `deleteAllData` | データを全て消す | Delete all data | 技術語の疑い（データ・data）・英語の初版 | OK |  |
| 189 | `confirmDeleteAllTitle` | このアプリのデータを全て消しますか？ | Delete all data in this app? | 技術語の疑い（データ・data）・英語の初版 | OK |  |
| 190 | `confirmDeleteAllDetail` | 録音した声・受け取った声・ルーティン・設定が消えます。元に戻せません。 | Recorded voices, received voices, routines and settings will be deleted. This can't be undone. | 長さ・英語の初版 | OK |  |
| 191 | `confirmDeleteAll` | 消す | Delete | 英語の初版 | OK |  |
| 192 | `aboutTitle` | Dance Count について | About Dance Count | 法務確認待ち・英語の初版 | OK |  |
| 193 | `aboutApp` | Dance Count — for Ballroom　版⍽{version} | Dance Count — for Ballroom · Version⍽{version} | 法務確認待ち・技術語の疑い（版・version）・英語の初版 | OK |  |
| 194 | `aboutOperator` | 運営：くうが株式会社 | Operated by Kuga Inc. | 法務確認待ち・英語の初版 | OK |  |
| 195 | `aboutContact` | 問い合わせ | Contact | 法務確認待ち・英語の初版 | OK |  |
| 196 | `aboutNotOfficial` | このアプリのカウントは、公式のもの・監修を受けたものではありません。 | The counts in this app are not official and have not been reviewed by any organization. | 法務確認待ち・長さ・英語の初版 | OK |  |
| 197 | `aboutPrivacyHeading` | プライバシー | Privacy | 法務確認待ち・英語の初版 | OK |  |
| 198 | `aboutPrivacy1` | 録音した声・受け取った声・ルーティン・設定は、この端末の中にだけ保存されます。運営者（くうが株式会社）がこれらを受け取ることはありません。 | Recorded voices, received voices, routines and settings are saved only on this device. The operator (Kuga Inc.) never receives them. | 法務確認待ち・長さ・英語の初版 | OK |  |
| 199 | `aboutPrivacy2` | このアプリは、利用状況を集めたり、外部に送ったりする仕組みを持っていません（解析ツール・広告はなく、書体も外部から取り寄せません）。 | This app has no way to collect how it is used or to send that information anywhere (no analytics, no ads, and fonts are not fetched from other sites). | 法務確認待ち・長さ・英語の初版 | This app has no way to collect usage information or send it anywhere (no analytics, no ads, and no fonts loaded from other sites). |  |
| 200 | `aboutPrivacy3` | アプリのファイル（画面・音声・書体）を配信するサーバーには、ブラウザが通常送る情報（アクセスの日時など）が記録されることがあります。 | The server that delivers the app's files (screens, sounds and fonts) may record what browsers normally send, such as the time of access. | 法務確認待ち・技術語の疑い（ブラウザ・ファイル・サーバー・browser・file・server）・長さ・英語の初版 | The server that delivers the app's files (screens, sounds and fonts) may record information browsers normally send, such as the time of access. |  |
| 201 | `aboutPrivacy4` | マイクは、声を録音する画面でだけ使います。許可を取る時と、「録音する」「録り直す」を押してから、合図と録音のあいだ（約⍽6⍽秒）だけ開き、すぐ閉じます。録音した声はこの端末に残り、いつでも消せます。 | The microphone is used only on the voice recording screen: when you allow access, and after you tap “Record” or “Record again”, only during the countdown and the recording (about 6 seconds). It is closed right after. Recordings stay on this device, and you can delete them at any time. | 法務確認待ち・技術語の疑い（マイク・microphone）・長さ・英語の初版 | The microphone is used only on the recording screen. It turns on only when you allow access and for 1.5 seconds after you tap “Record” or “Record again”, then turns off right away. Recordings stay on this device, and you can delete them at any time. |  |
| 202 | `aboutPrivacy5` | 「配る」で作ったファイルには、あなたの名前と、入れた声・ルーティン、作った日時が入ります。誰に渡すかは、あなた自身が決めます。LINE やメールでの受け渡しは、それぞれのサービスの決まりに従います。受け取ったファイルには、送った人の名前と声が入っています。 | A file made with “Share” contains your name, the voice and routines you put in it, and the date it was made. You decide who gets it. Sending it by LINE or email follows the rules of those services. A file you receive contains the sender's name and voice. | 法務確認待ち・技術語の疑い（ファイル・file）・長さ・英語の初版 | A file made with “Share” contains your name, the voice and routines you put in it, and the date it was made. You decide who gets it. If you send it by LINE or email, those services' own terms apply. A file you receive contains the sender's name and voice. |  |
| 203 | `aboutPrivacy6` | データは、この画面の「データを全て消す」か、ブラウザの設定（サイトのデータの削除）で消せます。iPhone では、Safari とホーム画面に追加したアプリで保存場所が別々です。消すのは、いま開いている方だけです。 | You can delete the data with “Delete all data” on this screen, or in your browser settings (delete the site data). On iPhone, Safari and the app added to the Home Screen keep their data separately. Only the one you have open is deleted. | 法務確認待ち・技術語の疑い（ブラウザ・データ・browser・data）・長さ・英語の初版 | You can delete the data with “Delete all data” on this screen, or in your browser settings (delete the site data). On iPhone, Safari and the Home Screen app keep their data separately, and only the one you have open is deleted. |  |
| 204 | `aboutCreditsHeading` | 使っているもの | Credits | 法務確認待ち・英語の初版 | OK |  |
| 205 | `aboutCreditFonts` | 書体：Inter・Noto Sans JP（SIL Open Font License 1.1） | Fonts: Inter and Noto Sans JP (SIL Open Font License 1.1) | 法務確認待ち・長さ・英語の初版 | OK |  |
| 206 | `aboutCreditCode` | Preact・Workbox（MIT License） | Preact and Workbox (MIT License) | 法務確認待ち・英語の初版 | OK |  |
| 207 | `aboutCreditIcons` | 一部のアイコン：Lucide（ISC License） | Some icons: Lucide (ISC License) | 法務確認待ち・英語の初版 | OK |  |

## U3・U4 音楽練習（開発プレビュー）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 208 | `musicRoutine` | どのカウントで練習しますか？ | Which count? | 英語の初版 |  |  |
| 209 | `musicBasicCount` | 基本のカウント | Basic count | 英語の初版 |  |  |
| 210 | `musicFigureNumber` | {number}番 | Figure {number} | 英語の初版 |  |  |
| 211 | `musicRoutineRange` | {from}〜{to}番を練習します。保存したルーティンの内容は変わりません。 | Figures {from}–{to}. The saved routine stays as it is. | 英語の初版 |  |  |
| 212 | `musicRoutineTooLong` | この曲の練習区間に入りません。「練習の設定」でフィガーを少なくしてください。 | This routine does not fit this part of the song. Choose fewer figures in Practice settings. | 依頼・長さ・英語の初版 |  |  |
| 213 | `musicRoutineInvalid` | このカウントは再生できません。「練習の設定」で別のルーティンを選んでください。 | This count could not be played. Choose another routine in Practice settings. | 長さ・英語の初版 |  |  |
| 214 | `musicRoutineFinished` | ルーティンが終わりました | The routine has finished | 英語の初版 |  |  |
| 215 | `musicRoutineListenThen` | 曲を{beats}拍ぶん聞いてから、最初のフィガーを始めます。くり返すときも同じ順番です。 | Listen to {beats} beats, then start the first figure. Each repeat follows this order. | 長さ・英語の初版 |  |  |
| 216 | `musicForSelection` | 「{name}」に合わせる曲を選びます。 | Choose music for {name} | 英語の初版 |  |  |
| 217 | `musicDanceEmpty` | この種目の曲を準備しています。 | Songs for this dance are being prepared. | 英語の初版 |  |  |
| 218 | `musicFigureRepeats` | このフィガーを曲に合わせてくり返し練習します。 | Practice this figure repeatedly with the song. | 英語の初版 |  |  |
| 219 | `musicPracticeFinished` | 練習が終わりました | Practice has finished | 英語の初版 |  |  |
| 220 | `musicFigureListenThen` | 曲を{beats}拍ぶん聞いてから数えます。くり返すときも同じ順番です。 | Listen to {beats} beats, then begin counting. Each repeat follows this order. | 長さ・英語の初版 |  |  |
| 221 | `musicSettings` | 練習の設定 | Practice settings | 英語の初版 |  |  |
| 222 | `musicSpeed` | 曲の速さ | Music speed | 英語の初版 |  |  |
| 223 | `musicSeconds` | 約{seconds}秒 | About {seconds} sec | 英語の初版 |  |  |
| 224 | `musicPlayOnce` | 1回だけ | Once | 英語の初版 |  |  |
| 225 | `musicRepeatTimes` | {count}回続ける | {count} times in a row | 英語の初版 |  |  |
| 226 | `musicListenWait` | 曲を何拍聞いてから数えますか？ | How long to listen before counting? | 英語の初版 |  |  |
| 227 | `musicCountWait` | 何拍数えてから曲を流しますか？ | How long to count before the music? | 英語の初版 |  |  |
| 228 | `musicSaveHeading` | 練習用の音声を保存 | Save audio for practice | 英語の初版 |  |  |
| 229 | `musicWithCount` | 声も聞く | With the count | 英語の初版 |  |  |
| 230 | `musicOnly` | 音楽だけ | Music only | 英語の初版 |  |  |
| 231 | `musicPractice` | 音楽に合わせて練習 | Practice with music | 英語の初版 |  |  |
| 232 | `musicIntro` | ラテンまたはスタンダードを選ぶと、曲が表示されます。曲を選ぶと、音楽と一緒にカウントが鳴ります。 | Choose Latin or Standard to see the songs. Choose a song to practice with its count. | 長さ・英語の初版 |  |  |
| 233 | `musicPreview` | 試聴用です。曲と数える位置は確認中です。 | Practice preview · song and count positions are being checked. | 英語の初版 |  |  |
| 234 | `musicPreparing` | 曲を準備しています… | Preparing the song… | 英語の初版 |  |  |
| 235 | `musicEmpty` | 曲を準備しています。 | Songs are being prepared. | 英語の初版 |  |  |
| 236 | `musicFailed` | 曲を開けませんでした。曲の一覧へ戻って、もう一度選んでください。 | This song could not be opened. Go back to the song list and choose again. | 長さ・英語の初版 |  |  |
| 237 | `musicList` | 種目を選んでください | Choose a dance style | 英語の初版 |  |  |
| 238 | `musicLatin` | ラテン | Latin | 英語の初版 |  |  |
| 239 | `musicStandard` | スタンダード | Standard | 英語の初版 |  |  |
| 240 | `musicGenreSongCount` | {count}曲 | {count} songs | 英語の初版 |  |  |
| 241 | `musicStartOrder` | 曲とカウント、どちらから始めますか？ | Which starts first? | 英語の初版 |  |  |
| 242 | `musicFirst` | 曲を先に流す | Music first | 英語の初版 |  |  |
| 243 | `musicCountFirst` | カウントを先に | Count first | 英語の初版 |  |  |
| 244 | `musicTogether` | 一緒に始める | Together | 英語の初版 |  |  |
| 245 | `musicWaitBeats` | {count}拍ぶん | {count} beats | 英語の初版 |  |  |
| 246 | `musicWaitBars` | {beats}拍ぶん（{count}小節） | {beats} beats ({count} bars) | 英語の初版 |  |  |
| 247 | `musicListenThen` | 曲だけを{beats}拍ぶん聞いたあと、声が入ります。この準備は最初の1回だけです。 | Listen to {beats} beats of music, then the count joins. This introduction happens once. | 長さ・英語の初版 |  |  |
| 248 | `musicCountThen` | カウントを{beats}拍ぶん聞いたあと、曲が入ります。曲の拍に合う数字から数えます。 | Hear {beats} counts, then the music joins. The numbers lead into the music’s beat. | 長さ・英語の初版 |  |  |
| 249 | `musicListening` | 曲を聞きましょう | Listen to the music | 英語の初版 |  |  |
| 250 | `musicRepetitions` | 同じところを何回くり返しますか？ | How many times in a row? | 英語の初版 |  |  |
| 251 | `musicTimes` | {count}回 | {count} times | 英語の初版 |  |  |
| 252 | `musicOnce` | 1回 | Once | 英語の初版 |  |  |
| 253 | `musicOriginal` | もとの速さ | Original | 英語の初版 |  |  |
| 254 | `musicSlower` | ゆっくり | Slower | 英語の初版 |  |  |
| 255 | `musicFaster` | 少し速く | Faster | 英語の初版 |  |  |
| 256 | `musicVolume` | 音楽の大きさ | Music volume | 英語の初版 |  |  |
| 257 | `musicVoiceVolume` | 声の大きさ | Voice volume | 英語の初版 |  |  |
| 258 | `musicCount` | カウントの声 | Hear the count | 英語の初版 |  |  |
| 259 | `musicCreateFile` | 保存する音声を作る | Make audio to save | 英語の初版 |  |  |
| 260 | `musicFilePreparing` | 音声ファイルを作っています… | Making the audio file… | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 261 | `musicFileReady` | 音声ファイルができました。「ファイルを保存する」を押してください。 | Your audio file is ready. Press “Save the file”. | 依頼・技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 262 | `musicFileFailed` | 音声ファイルを作れませんでした。もう一度お試しください。 | The audio file could not be made. Please try again. | 依頼・技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 263 | `musicFileTooLoud` | 音が大きすぎて保存できません。音を小さくして、もう一度お試しください。 | The sound is too loud to save. Lower the volume and try again. | 英語の初版 |  |  |
| 264 | `musicFileTooLong` | 練習が長すぎて保存できません。回数を少なくして、もう一度お試しください。 | This practice is too long to save. Choose fewer repeats. | 長さ・英語の初版 |  |  |
| 265 | `musicFileEstimate` | 約{seconds}秒 · 約{size}MB | About {seconds} seconds · {size} MB | 英語の初版 |  |  |
| 266 | `musicFileReceived` | 先生から受け取った声は、ここで聞けますが音声ファイルにはできません。 | A voice received from a teacher can be played here, but cannot be put in an audio file. | 技術語の疑い（ファイル・file）・長さ・英語の初版 |  |  |
| 267 | `musicFileIntro` | 今の設定の音声を作ってから、スマホなどに保存できます。 | Make audio with your current settings, then choose where to save it. | 英語の初版 |  |  |
| 268 | `musicFileStopped` | 音声ファイルを作るのをやめました。 | Making the file was cancelled. | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 269 | `musicCancelFile` | やめる | Cancel | 英語の初版 |  |  |

## 共通（複数の画面・部品）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 270 | `tabMusic` | 音楽 | Music | 英語の初版 |  |  |
| 271 | `musicAdd` | 音楽をつける | Add music | 英語の初版 |  |  |
| 272 | `musicPracticeSettings` | 音楽・練習の設定 | Music & practice settings | 英語の初版 |  |  |
| 273 | `musicMissing` | 曲を準備できませんでした。もう一度「再生」を押してください。 | The song could not be prepared. Press Play to try again. | 依頼・英語の初版 |  |  |
| 274 | `musicWait` | あとから入るまで | Time before joining | 英語の初版 |  |  |
| 275 | `musicEarly` | はじめ | Beginning | 英語の初版 |  |  |
| 276 | `musicMiddle` | まん中 | Middle | 英語の初版 |  |  |
| 277 | `musicLate` | おわり | End | 英語の初版 |  |  |
| 278 | `musicBars` | {count}小節 | {count} bars | 英語の初版 |  |  |
| 279 | `documentTitle` | Dance Count — for Ballroom | Dance Count — for Ballroom | 英語の初版 | OK |  |
| 280 | `switchLanguage` | English | 日本語 | 英語の初版 | OK |  |
| 281 | `tabFigures` | フィガー | Figures | 英語の初版 |  |  |
| 282 | `tabRoutines` | ルーティン | Routines | 英語の初版 | OK |  |
| 283 | `navLabel` | メイン | Main | 英語の初版 | OK |  |
| 284 | `back` | 戻る | Back | 英語の初版 | OK |  |
| 285 | `backToCover` | トップ | Home | 英語の初版 |  |  |
| 286 | `coverMake` | 作る | Make | 英語の初版 |  |  |
| 287 | `makeRoutines` | ルーティンを作る・直す | Make and edit routines | 英語の初版 |  |  |
| 288 | `chooseDance` | 種目を選んでください | Choose a dance | 英語の初版 | OK |  |
| 289 | `danceGroup` | 種目 | Dances | 英語の初版 | OK |  |
| 290 | `resume` | 続きから | Resume | 英語の初版 | OK |  |
| 291 | `speed` | 速さ | Speed | 英語の初版 | OK |  |
| 292 | `speedSlow` | ゆっくり | Slower | 英語の初版 | OK |  |
| 293 | `speedStandard` | 標準 | Standard | 英語の初版 | OK |  |
| 294 | `speedFast` | 速め | Faster | 英語の初版 | OK |  |
| 295 | `tempoMark` | ♩={tempo} | ♩={tempo} | 英語の初版 | OK |  |
| 296 | `metronome` | メトロノーム | Metronome | 英語の初版 | OK |  |
| 297 | `leadIn` | はじめの合図 | Lead-in | 英語の初版 | 製品判断: “Count-in”（音楽・ダンスでより通じる語。leadInNow “Count-in…”・leadInLength “Count-in length” も一緒に） |  |
| 298 | `leadInNow` | はじめの合図… | Lead-in… | 英語の初版 | OK |  |
| 299 | `on` | オン | On | 英語の初版 | OK |  |
| 300 | `off` | オフ | Off | 英語の初版 | OK |  |
| 301 | `voiceChip` | 声: {name} | Voice: {name} | 英語の初版 | OK |  |
| 302 | `standardVoiceShort` | 標準（英語） | Standard (English) | 英語の初版 | OK |  |
| 303 | `moreOptions` | くわしく | More options | 英語の初版 | OK |  |
| 304 | `moreOptionsWithTempo` | くわしく · ♩={tempo} | More options · ♩={tempo} | 英語の初版 | OK |  |
| 305 | `fineSpeed` | 速さの細かい調整 | Fine speed | 英語の初版 | Fine-tune speed |  |
| 306 | `competitionSpeed` | 競技の速さ（♩={min}〜{max}） | Competition speed (♩={min}–{max}) | 英語の初版 | OK |  |
| 307 | `repeat` | 繰り返す | Repeat | 英語の初版 | OK |  |
| 308 | `play` | 再生 | Play | 英語の初版 | OK |  |
| 309 | `stop` | 停止 | Stop | 英語の初版 | OK |  |
| 310 | `nowCount` | いま {count} | Now: {count} | 英語の初版 | OK |  |
| 311 | `noSoundLink` | 音が鳴らない時は | If there is no sound | 英語の初版 | OK（ja は見出し soundHelpTitle「音が鳴らない時」にそろえて「音が鳴らない時は」に直した＝Fix round 1。en は元から同じ） |  |
| 312 | `close` | 閉じる | Close | 英語の初版 | OK |  |
| 313 | `standardVoiceEnglish` | 標準の声（英語） | Standard voice (English) | 英語の初版 | OK。製品判断（Fable OQ7）: どこでも短い “Standard (English)” にすれば 320px 幅の特別扱いが要らなくなる |  |
| 314 | `soundHelpTitle` | 音が鳴らない時 | If there is no sound | 英語の初版 | OK |  |
| 315 | `updateReady` | 新しい版があります。 | A new version is ready. | 技術語の疑い（版・version）・英語の初版 | An update is ready. |  |
| 316 | `routineSummary` | {dance} · {count} フィガー | {dance} · {count} figures | 英語の初版 | OK |  |
| 317 | `routineSummaryOne` | {dance} · 1 フィガー | {dance} · 1 figure | 英語の初版 | OK |  |
| 318 | `edit` | 編集 | Edit | 英語の初版 | OK |  |
| 319 | `delete` | 削除 | Delete | 英語の初版 | OK |  |
| 320 | `confirmDelete` | 削除する | Delete | 英語の初版 | OK |  |
| 321 | `cancel` | やめる | Cancel | 英語の初版 | OK |  |
| 322 | `undo` | 元に戻す | Undo | 英語の初版 | OK |  |
| 323 | `redo` | やり直す | Redo | 英語の初版 | OK |  |
| 324 | `counts` | カウント | Counts | 英語の初版 | OK |  |
| 325 | `done` | 決定 | Done | 英語の初版 | OK |  |
| 326 | `add` | 追加する | Add | 英語の初版 | OK |  |
| 327 | `addCopy` | {counts} で複製して追加 | Add a copy ({counts}) | 英語の初版 | OK |  |
| 328 | `matchCounts` | カウントを合わせる | Use that count | 英語の初版 | OK |  |
| 329 | `othersWillChange` | 同じ名前の{count}件も同じカウントになります | The other {count} will change too | 英語の初版 | Other figures with this name will change too ({count}) |  |
| 330 | `updateAll` | {count}件まとめて決定 | Update all {count} | 英語の初版 | OK |  |
| 331 | `rangeStart` | はじめ | From | 英語の初版 | OK |  |
| 332 | `rangeEnd` | おわり | To | 英語の初版 | OK |  |
| 333 | `settingsTitle` | 設定 | Settings | 英語の初版 | OK |  |
| 334 | `standardVoiceJapanese` | 標準の声（日本語） | Standard voice (Japanese) | 英語の初版 | OK |  |
| 335 | `standardVoiceJapaneseShort` | 標準（日本語） | Standard (Japanese) | 英語の初版 | OK |  |
| 336 | `distributorVoice` | {name}の声 | {name}'s voice | 英語の初版 | OK（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 337 | `defaultVoiceNameEn` | 自分の声（英語） | My voice (English) | 英語の初版 | OK |  |
| 338 | `defaultVoiceNameJa` | 自分の声（日本語） | My voice (Japanese) | 英語の初版 | OK |  |
| 339 | `previewVoice` | 試聴 | Preview | 英語の初版 | OK |  |
| 340 | `voiceTiming` | 声のタイミング | Voice timing | 英語の初版 | OK |  |
| 341 | `voiceEarlier` | 早く | Earlier | 英語の初版 | OK |  |
| 342 | `voiceLater` | 遅く | Later | 英語の初版 | OK |  |
| 343 | `voiceTimingHint` | 声が遅れて聞こえたら「早く」を押します。 | If the voice sounds late, press “Earlier”. | 英語の初版 | If the voice sounds late, tap “Earlier”. |  |
| 344 | `share` | 配る | Share | 英語の初版 | OK（製品判断: “Send” にするかは「先に決めてほしいこと」1） |  |
| 345 | `shareRoutines` | ルーティンを配る | Share routines | 英語の初版 | OK（製品判断: “Send” にするかは「先に決めてほしいこと」1） |  |
| 346 | `receiveFromFile` | ファイルから受け取る | Receive from a file | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 347 | `saveFileAgain` | ファイルを保存する | Save the file | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 348 | `instructionsCopyByHand` | 長押しで選んでコピーできます。 | Press and hold to select and copy. | 英語の初版 | Touch and hold the text to select and copy it. |  |
| 349 | `backupTipRoutine` | ルーティンは「配る」でファイルにして、自分にも送っておけます。 | You can turn routines into a file with “Share” and send it to yourself. | 技術語の疑い（ファイル・file）・長さ・英語の初版 | Use “Share” to save routines in a file you can send to yourself. |  |
| 350 | `updateApp` | 更新する | Update | 英語の初版 | OK |  |
| 351 | `languageEnglish` | 英語 | English | 英語の初版 | OK |  |
| 352 | `languageJapanese` | 日本語 | Japanese | 英語の初版 | OK |  |

## 生徒への案内文（S9 でコピーされる）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 353 | `instructionsVoiceLead` | Dance Count で、私の声のカウントを使えます。 | You can practice with my voice in Dance Count. | 英語の初版 | OK |  |
| 354 | `instructionsRoutinesLead` | Dance Count で、私のルーティンを使えます。 | You can use my routines in Dance Count. | 英語の初版 | OK |  |
| 355 | `instructionsIphone` | 【iPhone】1. このファイルを開き、右上の共有ボタン →「"ファイル"に保存」 | [iPhone] 1. Open this file, tap Share (top right) → “Save to Files” | 技術語の疑い（ファイル・file）・長さ・英語の初版 | [iPhone] 1. Open this file, tap “Share” (top right) → “Save to Files” |  |
| 356 | `instructionsStep2` | 2. Dance Count を開き「使う」→ 下の「ルーティン」→「ファイルから受け取る」→「ファイルを選ぶ」 | 2. Open Dance Count → “Use” → “Routines” (bottom tab) → “Receive from a file” → “Choose a file” | 長さ・英語の初版 | OK |  |
| 357 | `instructionsStep3` | 3. 「最近使った項目」からこのファイルを選び「使う」 | 3. Choose this file from “Recents” and tap “Use” | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 358 | `instructionsAndroid` | 【Android】このファイルを開き、共有 →「Dance Count」→「使う」（「Dance Count」が出てこない時は、保存してから 2・3 の手順で「ファイルを選ぶ」） | [Android] Open this file, tap Share → “Dance Count” → “Use” (if “Dance Count” is not listed, save the file and follow steps 2–3 to “Choose a file”) | 技術語の疑い（ファイル・file）・長さ・英語の初版 | [Android] Open this file, tap “Share” → “Dance Count” → “Use” (if “Dance Count” is not listed, save the file and follow steps 2–3 to “Choose a file”) |  |
| 359 | `instructionsPhone` | （スマホで受け取るのが便利です） | (It's easiest on your phone.) | 英語の初版 | (It's easiest to receive this on your phone.) |  |

## エラー・知らせ（仕様 §11）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 360 | `noSoundTitle` | 音が出ていません。 | No sound is playing. | 英語の初版 | OK |  |
| 361 | `noSoundBody` | 本体の消音スイッチを確かめて、もう一度 ▶ を押してください。 | Check the silent switch and press ▶ again. | 依頼・英語の初版 | 製品判断: Make sure your phone isn't on silent, then press ▶ again.（soundHelpSwitch と同じ理由。ja 案「消音（マナーモード）になっていないか確かめて、もう一度 ▶ を押してください。」） |  |
| 362 | `playbackStopped` | 再生が止まりました。もう一度 ▶ を押してください。 | Playback stopped. Press ▶ again. | 依頼・英語の初版 | OK |  |
| 363 | `voiceMissing` | この声はまだ端末に入っていません。インターネットにつないで一度再生してください。 | This voice isn't on your device yet. Connect to the internet and play once. | 依頼・長さ・英語の初版 | This voice isn't on this device yet. Go online and play it once. |  |
| 364 | `wakeLockTip` | 練習中は画面が暗くなることがあります。自動ロックを長めにすると便利です。 | Your screen may dim during practice. A longer Auto-Lock helps. | 長さ・英語の初版 | The screen may dim while you practice. A longer Auto-Lock helps. |  |
| 365 | `saveFailed` | 保存できませんでした。空き容量を確かめてください。 | Couldn't save. Please check free space. | 依頼・英語の初版 | OK |  |
| 366 | `clearAllFailed` | 消せませんでした。ブラウザの設定からサイトのデータを消すこともできます。 | Couldn't delete. You can also delete the site data in your browser settings. | 技術語の疑い（ブラウザ・データ・browser・data）・長さ・英語の初版 | Couldn't delete. You can also clear site data in your browser settings. |  |
| 367 | `noVoiceHeard` | 声が入っていませんでした。もう一度録音してください。 | We couldn't hear your voice. Please record again. | 依頼・英語の初版 | OK |  |
| 368 | `micDenied` | マイクが使えない設定になっています。 | The microphone is turned off for this app. | 技術語の疑い（マイク・microphone）・英語の初版 | OK |  |
| 369 | `micFailed` | マイクを使えませんでした。ほかのアプリや通話を終えてから、もう一度「録音をはじめる」を押してください。 | The microphone couldn't be used. Close other apps or end the call, then tap “Start recording” again. | 依頼・技術語の疑い（マイク・microphone）・長さ・英語の初版 | Couldn't use the microphone. End any call or close other apps, then tap “Start recording” again. |  |
| 370 | `noRecorder` | このブラウザでは録音できません。Safari（iPhone）か Chrome で開いてください。 | This browser can't record. Open this page in Safari (iPhone) or Chrome. | 技術語の疑い（ブラウザ・browser）・長さ・英語の初版 | OK |  |
| 371 | `shareRefused` | 共有できませんでした。下の「ファイルを保存する」で保存できます。 | Sharing didn't work. You can save it with “Save the file” below. | 英語の初版 | OK |  |
| 372 | `openedInLine` | LINE の中で開いています。Safari か Chrome で開き直すと、受け取った声がずっと残ります。 | This is open inside LINE. Open it in Safari or Chrome so the voice stays on your phone. | 長さ・英語の初版 | You're in LINE. Open this in Safari or Chrome to keep received voices. |  |
| 373 | `fileBroken` | このファイルは読めませんでした。先生に送り直してもらってください。（{file}） | This file couldn't be read. Ask your teacher to send it again. ({file}) | 技術語の疑い（ファイル・file）・長さ・英語の初版 | OK |  |
| 374 | `fileTooLarge` | このファイルは大きすぎて受け取れません。 | This file is too large. | 技術語の疑い（ファイル・file）・英語の初版 | This file is too large to receive. |  |
| 375 | `fileTooNew` | 新しいアプリで作られたファイルです。アプリを更新してください。 | This file was made by a newer version. Please update the app. | 依頼・技術語の疑い（ファイル・file・version）・英語の初版 | This file was made with a newer version of this app. Please update this app. |  |
| 376 | `voiceLimitReached` | 声はすでに {count} あるので、受け取れません。使わない声を削除してから、もう一度選んでください。 | You already have {count} voices. Delete one you don't use, then choose the file again. | 技術語の疑い（file）・長さ・英語の初版 | You already have {count} voices. Delete one you don't use, then try again. |  |
| 377 | `routineUnreadable` | ルーティン「{name}」は読めませんでした。 | Routine “{name}” couldn't be read. | 英語の初版 | OK |  |
| 378 | `routinesUnreadableMore` | ほか {count} 本も読めませんでした。 | {count} more routines couldn't be read. | 英語の初版 | OK |  |
| 379 | `routinesOverLimit` | ルーティンは {max} 本までなので、{count} 本は受け取れません。 | You can keep up to {max} routines, so {count} can't be received. | 英語の初版 | OK |  |

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
- U3・U4 音楽練習（開発プレビュー）: 3
- 共通（複数の画面・部品）: 1
- 生徒への案内文（S9 でコピーされる）: 0
- エラー・知らせ（仕様 §11）: 7
