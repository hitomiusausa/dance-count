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

## S1 ホーム

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 1 | `appName` | Dance Count | Dance Count | 英語の初版 |  |  |
| 2 | `appSubtitle` | for Ballroom | for Ballroom | 英語の初版 |  |  |
| 3 | `switchLanguage` | English | 日本語 | 英語の初版 |  |  |
| 4 | `lastTime` | 前回 | Last time | 英語の初版 |  |  |
| 5 | `resume` | 続きから | Resume | 英語の初版 |  |  |
| 6 | `teacherVoice` | 先生の声で練習 | Practice with your teacher's voice | 英語の初版 |  |  |
| 7 | `installCard` | ホーム画面に追加すると、アプリのように使えます | Add to your Home Screen to use it like an app | 英語の初版 |  |  |

## S2 再生

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 8 | `countPattern` | カウントの型 | Count pattern | 英語の初版 |  |  |

## S3 ルーティン一覧

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 9 | `routinesTitle` | ルーティン | Routines | 英語の初版 |  |  |
| 10 | `routinesEmpty` | まだルーティンはありません | No routines yet | 英語の初版 |  |  |
| 11 | `newRoutine` | 新しいルーティン | New routine | 英語の初版 |  |  |
| 12 | `receivedFrom` | {name}さんから | From {name} | 英語の初版 |  |  |
| 13 | `needsFigures` | フィガーを追加すると再生できます。 | Add a figure to play this routine. | 英語の初版 |  |  |
| 14 | `needsFix` | カウントに直す所があります。 | Some counts need fixing. | 英語の初版 |  |  |
| 15 | `confirmDeleteTitle` | このルーティンを削除しますか？ | Delete this routine? | 英語の初版 |  |  |

## S4 ルーティン編集

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 16 | `newRoutineTitle` | 新しいルーティン | New routine | 英語の初版 |  |  |
| 17 | `editRoutineTitle` | ルーティンの編集 | Edit routine | 英語の初版 |  |  |
| 18 | `defaultRoutineName` | {dance}のルーティン | {dance} routine | 英語の初版 |  |  |
| 19 | `routineName` | 名前 | Name | 英語の初版 |  |  |
| 20 | `danceLine` | 種目: {dance} | Dance: {dance} | 英語の初版 |  |  |
| 21 | `changeDance` | 変える | Change | 英語の初版 |  |  |
| 22 | `noFigures` | フィガーはまだありません。 | No figures yet. | 英語の初版 |  |  |
| 23 | `addFigure` | フィガーを追加 | Add a figure | 英語の初版 |  |  |
| 24 | `newFigure` | 新しいフィガー | New figure | 英語の初版 |  |  |
| 25 | `figureName` | フィガーの名前 | Figure name | 英語の初版 |  |  |
| 26 | `figureSuggestions` | 名前の候補 | Suggested names | 英語の初版 |  |  |
| 27 | `figureChoices` | {dance}のフィガー（{count}） | {dance} figures ({count}) | 英語の初版 |  |  |
| 28 | `commonCounts` | カウントの形 | Count patterns | 英語の初版 |  |  |
| 29 | `allowedSymbols` | 使える文字：{symbols} | Allowed: {symbols} | 英語の初版 |  |  |
| 30 | `sameNameExists` | 同じ名前があります（{counts}） | Same name exists ({counts}) | 英語の初版 |  |  |
| 31 | `sameNameCopy` | 同じ名前があります：{name}（{counts}） | Same name exists: {name} ({counts}) | 英語の初版 |  |  |
| 32 | `renameForOtherCount` | 名前を変えると、違うカウントにできます | Use another name for a different count | 英語の初版 |  |  |
| 33 | `offBarFigure` | {beats}拍のカウントではありません | Not a {beats}-beat count | 英語の初版 |  |  |
| 34 | `offBarFigureEdit` | {beats}拍のカウントではありません。必要なら編集してください。 | Not a {beats}-beat count. Edit it if needed. | 依頼・英語の初版 |  |  |
| 35 | `routineEndsMidBar` | 小節の途中で終わっています。繰り返すと頭がずれます。 | The routine ends mid-bar, so repeats start off the beat. | 英語の初版 |  |  |
| 36 | `startWithBeat` | 最初は数字か S・Q から | Start with a number, S or Q | 英語の初版 |  |  |
| 37 | `countsInvalid` | この並びでは数えられません | This count can't be played | 英語の初版 |  |  |
| 38 | `nameNeeded` | 名前を入れると決定できます | Add a name to finish | 英語の初版 |  |  |
| 39 | `previewFigure` | このフィガーを試聴 | Play this figure | 英語の初版 |  |  |
| 40 | `moveUp` | 上へ | Up | 英語の初版 |  |  |
| 41 | `moveDown` | 下へ | Down | 英語の初版 |  |  |
| 42 | `duplicate` | 複製 | Duplicate | 英語の初版 |  |  |
| 43 | `moveFigureLabel` | {name}を動かす | Move {name} | 英語の初版 |  |  |
| 44 | `previewAll` | 全体を試聴 | Play all | 英語の初版 |  |  |
| 45 | `leadInLength` | はじめの合図の長さ | Lead-in length | 英語の初版 |  |  |
| 46 | `oneBar` | 1小節 | 1 bar | 英語の初版 |  |  |
| 47 | `twoBars` | 2小節 | 2 bars | 英語の初版 |  |  |
| 48 | `routineSpeed` | 速さ | Speed | 英語の初版 |  |  |
| 49 | `danceStandardSpeed` | 種目の標準（♩={tempo}） | Dance standard (♩={tempo}) | 英語の初版 |  |  |

## S5 ルーティン再生

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 50 | `madeByYou` | {dance} · あなたが作成 | {dance} · made by you | 英語の初版 |  |  |
| 51 | `madeBy` | {dance} · {name}さんが作成 | {dance} · made by {name} | 英語の初版 |  |  |
| 52 | `figuresHeading` | フィガー | Figures | 英語の初版 |  |  |
| 53 | `practiceRange` | 練習する範囲 | Practice range | 英語の初版 |  |  |
| 54 | `rangeStart` | はじめ | From | 英語の初版 |  |  |
| 55 | `rangeEnd` | おわり | To | 英語の初版 |  |  |
| 56 | `previous` | 前 | Prev | 英語の初版 |  |  |
| 57 | `next` | 次 | Next | 英語の初版 |  |  |

## S6 設定

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 58 | `settingsInstall` | ホーム画面に追加する方法 | How to add to the Home Screen | 英語の初版 |  |  |
| 59 | `settingsHelpHeading` | 困った時は | If something's wrong | 英語の初版 |  |  |
| 60 | `settingsAbout` | プライバシー・アプリについて | Privacy & about this app | 英語の初版 |  |  |
| 61 | `versionLabel` | 版 {version} | Version {version} | 技術語の疑い（版・version）・英語の初版 |  |  |
| 62 | `settingsTitle` | 設定 | Settings | 英語の初版 |  |  |
| 63 | `settingsLanguage` | 言語 | Language | 英語の初版 |  |  |
| 64 | `forTeachers` | 先生の方へ | For teachers | 英語の初版 |  |  |
| 65 | `shareRoutines` | ルーティンを配る | Share routines | 英語の初版 |  |  |

## S7 声

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 66 | `voiceInProgressCount` | ·⍽{count}⍽/⍽12⍽語 | ·⍽{count}⍽/⍽12⍽words | 英語の初版 |  |  |
| 67 | `previewVoice` | 試聴 | Preview | 英語の初版 |  |  |
| 68 | `confirmDeleteVoiceTitle` | この声を削除しますか？ | Delete this voice? | 英語の初版 |  |  |
| 69 | `continueRecording` | 続きを録音する | Continue recording | 英語の初版 |  |  |
| 70 | `receiveFromFile` | ファイルから受け取る | Receive from a file | 技術語の疑い（ファイル・file）・英語の初版 |  |  |

## S8 自分の声を録音

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 71 | `recordAddFirst` | ホーム画面に追加してから録音するのがおすすめです。このブラウザで録音した声は、追加したアプリには引き継がれません。（追加の方法は、設定の「ホーム画面に追加する方法」） | We recommend adding to the Home Screen before recording. A voice recorded in this browser won't carry over to the added app. (See Settings → “How to add to the Home Screen”.) | 技術語の疑い（ブラウザ・browser）・長さ・英語の初版 |  |  |
| 72 | `recordTitle` | 自分の声を録音 | Record your voice | 英語の初版 |  |  |
| 73 | `recordIntro1` | 12 語を、1 語ずつ録音します。 | You will record 12 words, one at a time. | 英語の初版 |  |  |
| 74 | `recordIntro2` | 録音は、この端末の中にだけ残ります。 | Recordings stay on this device only. | 英語の初版 |  |  |
| 75 | `recordIntro3` | いつでも消せます。 | You can delete them at any time. | 英語の初版 |  |  |
| 76 | `recordLanguage` | 数える言葉 | Count in | 英語の初版 |  |  |
| 77 | `countInEnglish` | 英語で数える（One, Two, Slow…） | Count in English (One, Two, Slow…) | 英語の初版 |  |  |
| 78 | `countInJapanese` | 日本語で数える（いち、に、スロー…） | Count in Japanese (いち, に, スロー…) | 英語の初版 |  |  |
| 79 | `recordedUpTo` | {count}⍽/⍽12⍽語まで録音済み | {count}⍽/⍽12⍽words recorded | 英語の初版 |  |  |
| 80 | `recordedAll` | 録音済み（12 語） | Recorded (12 words) | 英語の初版 |  |  |
| 81 | `startRecording` | 録音をはじめる | Start recording | 英語の初版 |  |  |
| 82 | `wordProgress` | {index} / 12 語 | {index} / 12 words | 英語の初版 |  |  |
| 83 | `recordHint` | ボタンを押したら、すぐ「{word}」と言ってください。 | Tap the button, then say “{word}” right away. | 英語の初版 |  |  |
| 84 | `recordWord` | 録音する | Record | 英語の初版 |  |  |
| 85 | `recordAgain` | 録り直す | Record again | 英語の初版 |  |  |
| 86 | `reviewFromFirst` | 1⍽語目から見直す | Review from word 1 | 英語の初版 |  |  |
| 87 | `recordingNow` | 録音中… | Recording… | 英語の初版 |  |  |
| 88 | `listenTake` | 聞く | Play | 英語の初版 |  |  |
| 89 | `previousWord` | 前の語 | Previous | 英語の初版 |  |  |
| 90 | `nextWord` | 次へ | Next | 英語の初版 |  |  |
| 91 | `finishRecording` | 完成へ | Finish | 英語の初版 |  |  |
| 92 | `micHowTo` | 設定の開き方 | How to allow it | 英語の初版 |  |  |
| 93 | `micHowToIphone` | iPhone：設定 → アプリ → Safari → マイク（ホーム画面から開いた時は、Safari のかわりにこのアプリの名前） | iPhone: Settings → Apps → Safari → Microphone (if you opened it from the Home Screen, this app’s name instead of Safari) | 技術語の疑い（マイク・microphone）・長さ・英語の初版 |  |  |
| 94 | `micHowToOther` | Android・PC：アドレスバーの左のマーク → マイク | Android / PC: the icon at the left of the address bar → Microphone | 技術語の疑い（アドレスバー・アドレス・マイク・address bar・address・microphone）・英語の初版 |  |  |
| 95 | `micHowToThen` | 許可したら、もう一度「録音をはじめる」を押してください。 | Then tap “Start recording” again. | 依頼・英語の初版 |  |  |
| 96 | `voiceReadyTitle` | 録音できました | Your voice is ready | 英語の初版 |  |  |
| 97 | `voiceName` | 名前 | Name | 英語の初版 |  |  |
| 98 | `compareTitle` | ワルツで聞き比べる | Compare with the waltz | 英語の初版 |  |  |
| 99 | `yourVoice` | 自分の声 | Your voice | 英語の初版 |  |  |
| 100 | `standardVoice` | 標準の声 | Standard voice | 英語の初版 |  |  |
| 101 | `finishDone` | 完了 | Done | 英語の初版 |  |  |
| 102 | `backupTipRecording` | 「配る」で作ったファイルを自分にも送っておくと、端末を替えても声を使えます。 | Send yourself the file made with “Share” and you can use this voice on another phone. | 技術語の疑い（ファイル・file）・長さ・英語の初版 |  |  |

## S9 配る

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 103 | `shareTitle` | 配る | Share | 英語の初版 |  |  |
| 104 | `shareYourName` | あなたの名前 | Your name | 英語の初版 |  |  |
| 105 | `shareNameNeeded` | 名前を入れると、ファイルを作れます。 | Enter your name to create the file. | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 106 | `shareVoiceHeading` | 声 | Voice | 英語の初版 |  |  |
| 107 | `shareVoiceNone` | 入れない | None | 英語の初版 |  |  |
| 108 | `shareNoRecordedVoice` | 録音した声はまだありません。 | You haven't recorded a voice yet. | 英語の初版 |  |  |
| 109 | `shareVoicePrepFailed` | この声はファイルにできませんでした。 | This voice couldn't be put in a file. | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 110 | `shareConsent` | 自分の声をこのファイルに入れて配ることに同意します。配り先は自分で管理します。 | I agree to put my voice in this file and share it. I will manage who receives it. | 技術語の疑い（ファイル・file）・長さ・英語の初版 |  |  |
| 111 | `shareConsentNeeded` | 同意すると、ファイルを作れます。 | Tick the box to create the file. | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 112 | `shareRoutinesHeading` | ルーティン | Routines | 英語の初版 |  |  |
| 113 | `shareNoRoutines` | 配れるルーティンはまだありません。 | No routines to share yet. | 英語の初版 |  |  |
| 114 | `shareChooseSomething` | 声かルーティンを選ぶと、ファイルを作れます。 | Choose a voice or a routine to create the file. | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 115 | `createFile` | ファイルを作る | Create file | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 116 | `shareAfterSend` | ファイルを送ったら、下の案内文も送ってください。 | After sending the file, send the instructions below too. | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 117 | `shareSaved` | 「{file}」を保存しました。LINE やメールに添付できます。 | “{file}” has been saved. You can attach it to LINE or email. | 英語の初版 |  |  |
| 118 | `saveFileAgain` | ファイルを保存する | Save the file | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 119 | `copyInstructions` | 生徒への案内文をコピー | Copy instructions for students | 英語の初版 |  |  |
| 120 | `instructionsCopied` | 案内文をコピーしました。LINE やメールに貼れます。 | Copied. You can paste it into LINE or email. | 英語の初版 |  |  |
| 121 | `instructionsLabel` | 生徒への案内文 | Instructions for students | 英語の初版 |  |  |

## S10 受け取る

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 122 | `receiveTitle` | 受け取る | Receive | 英語の初版 |  |  |
| 123 | `chooseFile` | ファイルを選ぶ | Choose a file | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 124 | `readingFile` | 読んでいます… | Reading… | 英語の初版 |  |  |
| 125 | `receiveHelpLine` | LINE で届いたファイルは、先に「"ファイル"に保存」しておくと、ここで選べます。 | If the file came by LINE, save it with “Save to Files” first. | 技術語の疑い（ファイル・file）・長さ・英語の初版 |  |  |
| 126 | `receiveHelpRecents` | 選ぶ画面では「最近使った項目」にあります。 | You will find it under “Recents”. | 英語の初版 |  |  |
| 127 | `openInSafari` | Safari で開く | Open in Safari | 英語の初版 |  |  |
| 128 | `inThisFile` | このファイルの中身 | In this file | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 129 | `languageEnglish` | 英語 | English | 英語の初版 |  |  |
| 130 | `languageJapanese` | 日本語 | Japanese | 英語の初版 |  |  |
| 131 | `fileVoiceFrom` | {name}さんの声（{language}）· {count} 語 | {name}'s voice ({language}) · {count} words | 英語の初版 |  |  |
| 132 | `fileVoiceNamed` | {name}（{language}）· {count} 語 | {name} ({language}) · {count} words | 英語の初版 |  |  |
| 133 | `fileRoutinesOne` | ルーティン 1 本: {names} | 1 routine: {names} | 英語の初版 |  |  |
| 134 | `fileRoutines` | ルーティン {count} 本: {names} | {count} routines: {names} | 英語の初版 |  |  |
| 135 | `namesAndMore` | {names} ほか {count} 本 | {names} and {count} more | 英語の初版 |  |  |
| 136 | `routineNoName` | （名前なし） | (no name) | 英語の初版 |  |  |
| 137 | `replaceVoiceFrom` | {name}さんの声はすでにあります。「使う」で新しい方に置き換わります。 | You already have {name}'s voice. “Use” replaces it with this one. | 英語の初版 |  |  |
| 138 | `replaceVoiceNamed` | 「{name}」はすでにあります。「使う」で新しい方に置き換わります。 | You already have “{name}”. “Use” replaces it with this one. | 英語の初版 |  |  |
| 139 | `replaceRoutines` | 同じルーティンは新しい方に置き換わります。 | Routines you already have are replaced with the new ones. | 英語の初版 |  |  |
| 140 | `useFile` | 使う | Use | 英語の初版 |  |  |
| 141 | `receivedTitle` | 受け取りました | Received | 英語の初版 |  |  |
| 142 | `receivedVoiceFrom` | ホームで種目を選んで ▶ を押すと、{name}さんの声で鳴ります。 | Choose a dance on the Home screen and press ▶ to hear {name}'s voice. | 英語の初版 |  |  |
| 143 | `receivedVoiceNamed` | ホームで種目を選んで ▶ を押すと、「{name}」で鳴ります。 | Choose a dance on the Home screen and press ▶ to hear “{name}”. | 英語の初版 |  |  |
| 144 | `receivedRoutines` | 「ルーティン」に入っています。 | They are in “Routines”. | 英語の初版 |  |  |
| 145 | `goHome` | ホームへ | Go to Home | 英語の初版 |  |  |
| 146 | `seeRoutines` | ルーティンを見る | See routines | 英語の初版 |  |  |

## S11 音が鳴らない時

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 147 | `soundHelpSwitch` | 本体横のスイッチ（マナーモード）を確かめる | Check the switch on the side of your phone (silent mode). | 英語の初版 |  |  |
| 148 | `soundHelpVolume` | 音量を上げる | Turn the volume up. | 英語の初版 |  |  |
| 149 | `soundHelpEarphones` | イヤホン・Bluetooth の接続を確かめる | Check your earphones or Bluetooth connection. | 技術語の疑い（Bluetooth）・英語の初版 |  |  |
| 150 | `soundHelpRetry` | もう一度 ▶ を押してください。 | Then press ▶ again. | 依頼・英語の初版 |  |  |

## S12 ホーム画面に追加する方法

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 151 | `installTitle` | ホーム画面に追加する | Add to Home Screen | 英語の初版 |  |  |
| 152 | `installIntro` | ホーム画面に追加すると、アプリのように開けて、電波が無くても使えます。 | Added to your Home Screen, it opens like an app and works without a signal. | 長さ・英語の初版 |  |  |
| 153 | `installIosStep1` | 画面の下の「…」を押します。 | Tap “…” at the bottom of the screen. | 英語の初版 |  |  |
| 154 | `installIosStep2` | 「共有」を押します。 | Tap “Share”. | 英語の初版 |  |  |
| 155 | `installIosStep3` | 「もっと見る」を押し、「ホーム画面に追加」を押します。 | Tap “See More”, then “Add to Home Screen”. | 英語の初版 |  |  |
| 156 | `installIosStep4` | 右上の「追加」を押します。 | Tap “Add” at the top right. | 英語の初版 |  |  |
| 157 | `installNotCarried` | 録音した声・受け取った声・ルーティンは、追加したアプリには引き継がれません。追加したアプリで、もう一度録音・受け取りをしてください。 | Recorded voices, received voices and routines don't carry over to the added app. Record or receive them again in the added app. | 依頼・長さ・英語の初版 |  |  |
| 158 | `installOpenInSafari` | Safari で開くと、ホーム画面に追加できます。 | Open this page in Safari to add it to your Home Screen. | 英語の初版 |  |  |
| 159 | `installOnPhone` | iPhone や Android で開くと、ホーム画面に追加できます。 | Open this page on your phone to add it to the Home Screen. | 英語の初版 |  |  |
| 160 | `installCopyAddress` | アドレスをコピー | Copy the address | 技術語の疑い（アドレス・address）・英語の初版 |  |  |
| 161 | `installAddressCopiedSafari` | アドレスをコピーしました。Safari を開き、上のアドレス欄に貼り付けてください。 | Address copied. Open Safari and paste it into the address bar at the top. | 技術語の疑い（アドレス・address bar・address）・長さ・英語の初版 |  |  |
| 162 | `installAddressCopiedPhone` | アドレスをコピーしました。LINE やメールでスマホに送ってください。 | Address copied. Send it to your phone by LINE or email. | 技術語の疑い（アドレス・address）・英語の初版 |  |  |
| 163 | `installAndroidButton` | ホーム画面に追加する | Add to Home Screen | 英語の初版 |  |  |
| 164 | `installAndroidStep1` | 右上の「⋮」を押します。 | Tap “⋮” at the top right. | 英語の初版 |  |  |
| 165 | `installAndroidStep2` | 「ホーム画面に追加」（または「アプリをインストール」）を押します。 | Tap “Add to Home screen” (or “Install app”). | 英語の初版 |  |  |
| 166 | `installAndroidStep3` | 「インストール」を押します。 | Tap “Install”. | 英語の初版 |  |  |
| 167 | `installDone` | このアプリはホーム画面から開いています。追加は済んでいます。 | You're using the app from your Home Screen. Nothing more to do. | 英語の初版 |  |  |

## S13 プライバシー・アプリについて

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 168 | `deleteAllData` | データを全て消す | Delete all data | 技術語の疑い（データ・data）・英語の初版 |  |  |
| 169 | `confirmDeleteAllTitle` | このアプリのデータを全て消しますか？ | Delete all data in this app? | 技術語の疑い（データ・data）・英語の初版 |  |  |
| 170 | `confirmDeleteAllDetail` | 録音した声・受け取った声・ルーティン・設定が消えます。 | Recorded voices, received voices, routines and settings will be deleted. | 長さ・英語の初版 |  |  |
| 171 | `confirmDeleteAll` | 消す | Delete | 英語の初版 |  |  |
| 172 | `aboutTitle` | Dance Count について | About Dance Count | 法務確認待ち・英語の初版 |  |  |
| 173 | `aboutApp` | Dance Count — for Ballroom　版⍽{version} | Dance Count — for Ballroom · Version⍽{version} | 法務確認待ち・技術語の疑い（版・version）・英語の初版 |  |  |
| 174 | `aboutOperator` | 運営：くうが株式会社 | Operated by Kuga Inc. | 法務確認待ち・英語の初版 |  |  |
| 175 | `aboutContact` | 問い合わせ | Contact | 法務確認待ち・英語の初版 |  |  |
| 176 | `aboutNotOfficial` | このアプリのカウントは、公式のもの・監修を受けたものではありません。 | The counts in this app are not official and have not been reviewed by any organization. | 法務確認待ち・長さ・英語の初版 |  |  |
| 177 | `aboutPrivacyHeading` | プライバシー | Privacy | 法務確認待ち・英語の初版 |  |  |
| 178 | `aboutPrivacy1` | 録音した声・受け取った声・ルーティン・設定は、この端末の中にだけ保存されます。運営者（くうが株式会社）がこれらを受け取ることはありません。 | Recorded voices, received voices, routines and settings are saved only on this device. The operator (Kuga Inc.) never receives them. | 法務確認待ち・長さ・英語の初版 |  |  |
| 179 | `aboutPrivacy2` | このアプリは、利用状況を集めたり、外部に送ったりする仕組みを持っていません（解析ツール・広告はなく、書体も外部から取り寄せません）。 | This app has no way to collect how it is used or to send anything out (no analytics, no ads, and fonts are not fetched from other sites). | 法務確認待ち・長さ・英語の初版 |  |  |
| 180 | `aboutPrivacy3` | アプリのファイル（画面・音声・書体）を配信するサーバーには、ブラウザが通常送る情報（アクセスの日時など）が記録されることがあります。 | The server that delivers the app's files (screens, sounds and fonts) may record what browsers normally send, such as the time of access. | 法務確認待ち・技術語の疑い（ブラウザ・ファイル・サーバー・browser・file・server）・長さ・英語の初版 |  |  |
| 181 | `aboutPrivacy4` | マイクは、声を録音する画面でだけ使います。許可を取る時と、「録音する」を押した後の 1.5 秒だけ開き、すぐ閉じます。録音した声はこの端末に残り、いつでも消せます。 | The microphone is used only on the voice recording screen: when you allow access, and for 1.5 seconds after you tap “Record”. It is closed right after. Recordings stay on this device, and you can delete them at any time. | 法務確認待ち・技術語の疑い（マイク・microphone）・長さ・英語の初版 |  |  |
| 182 | `aboutPrivacy5` | 「配る」で作ったファイルには、あなたの名前と、入れた声・ルーティンが入ります。誰に渡すかは、あなた自身が決めます。LINE やメールでの受け渡しは、それぞれのサービスの決まりに従います。受け取ったファイルには、送った人の名前と声が入っています。 | A file made with “Share” contains your name and the voice and routines you put in it. You decide who gets it. Sending it by LINE or email follows the rules of those services. A file you receive contains the sender's name and voice. | 法務確認待ち・技術語の疑い（ファイル・file）・長さ・英語の初版 |  |  |
| 183 | `aboutPrivacy6` | データは、この画面の「データを全て消す」か、ブラウザの設定（サイトのデータの削除）で消せます。iPhone では、Safari とホーム画面に追加したアプリで保存場所が別々です。消すのは、いま開いている方だけです。 | You can delete the data with “Delete all data” on this screen, or in your browser settings (delete the site data). On iPhone, Safari and the app added to the Home Screen keep their data separately. Only the one you have open is deleted. | 法務確認待ち・技術語の疑い（ブラウザ・データ・browser・data）・長さ・英語の初版 |  |  |
| 184 | `aboutCreditsHeading` | 使っているもの | Credits | 法務確認待ち・英語の初版 |  |  |
| 185 | `aboutCreditFonts` | 書体：Inter・Noto Sans JP（SIL Open Font License 1.1） | Fonts: Inter and Noto Sans JP (SIL Open Font License 1.1) | 法務確認待ち・長さ・英語の初版 |  |  |
| 186 | `aboutCreditCode` | Preact・Workbox（MIT License） | Preact and Workbox (MIT License) | 法務確認待ち・英語の初版 |  |  |

## 共通（複数の画面・部品）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 187 | `documentTitle` | Dance Count — for Ballroom | Dance Count — for Ballroom | 英語の初版 |  |  |
| 188 | `tabPractice` | 練習 | Practice | 英語の初版 |  |  |
| 189 | `tabRoutines` | ルーティン | Routines | 英語の初版 |  |  |
| 190 | `tabSettings` | 設定 | Settings | 英語の初版 |  |  |
| 191 | `navLabel` | メイン | Main | 英語の初版 |  |  |
| 192 | `back` | 戻る | Back | 英語の初版 |  |  |
| 193 | `chooseDance` | 種目を選んでください | Choose a dance | 英語の初版 |  |  |
| 194 | `danceGroup` | 種目 | Dances | 英語の初版 |  |  |
| 195 | `speed` | 速さ | Speed | 英語の初版 |  |  |
| 196 | `speedSlow` | ゆっくり | Slower | 英語の初版 |  |  |
| 197 | `speedStandard` | 標準 | Standard | 英語の初版 |  |  |
| 198 | `speedFast` | 速め | Faster | 英語の初版 |  |  |
| 199 | `tempoMark` | ♩={tempo} | ♩={tempo} | 英語の初版 |  |  |
| 200 | `metronome` | メトロノーム | Metronome | 英語の初版 |  |  |
| 201 | `leadIn` | はじめの合図 | Lead-in | 英語の初版 |  |  |
| 202 | `leadInNow` | はじめの合図… | Lead-in… | 英語の初版 |  |  |
| 203 | `on` | オン | On | 英語の初版 |  |  |
| 204 | `off` | オフ | Off | 英語の初版 |  |  |
| 205 | `voiceChip` | 声: {name} | Voice: {name} | 英語の初版 |  |  |
| 206 | `standardVoiceShort` | 標準（英語） | Standard (English) | 英語の初版 |  |  |
| 207 | `moreOptions` | くわしく | More options | 英語の初版 |  |  |
| 208 | `moreOptionsWithTempo` | くわしく · ♩={tempo} | More options · ♩={tempo} | 英語の初版 |  |  |
| 209 | `fineSpeed` | 速さの細かい調整 | Fine speed | 英語の初版 |  |  |
| 210 | `competitionSpeed` | 競技の速さ（♩={min}〜{max}） | Competition speed (♩={min}–{max}) | 英語の初版 |  |  |
| 211 | `repeat` | 繰り返す | Repeat | 英語の初版 |  |  |
| 212 | `play` | 再生 | Play | 英語の初版 |  |  |
| 213 | `stop` | 停止 | Stop | 英語の初版 |  |  |
| 214 | `nowCount` | いま {count} | Now: {count} | 英語の初版 |  |  |
| 215 | `noSoundLink` | 音が出ない時は | If there is no sound | 英語の初版 |  |  |
| 216 | `close` | 閉じる | Close | 英語の初版 |  |  |
| 217 | `voicesTitle` | 声 | Voice | 英語の初版 |  |  |
| 218 | `standardVoiceEnglish` | 標準の声（英語） | Standard voice (English) | 英語の初版 |  |  |
| 219 | `soundHelpTitle` | 音が鳴らない時 | If there is no sound | 英語の初版 |  |  |
| 220 | `updateReady` | 新しい版があります。 | A new version is ready. | 技術語の疑い（版・version）・英語の初版 |  |  |
| 221 | `routineSummary` | {dance} · {count} フィガー | {dance} · {count} figures | 英語の初版 |  |  |
| 222 | `routineSummaryOne` | {dance} · 1 フィガー | {dance} · 1 figure | 英語の初版 |  |  |
| 223 | `edit` | 編集 | Edit | 英語の初版 |  |  |
| 224 | `delete` | 削除 | Delete | 英語の初版 |  |  |
| 225 | `confirmDelete` | 削除する | Delete | 英語の初版 |  |  |
| 226 | `cancel` | やめる | Cancel | 英語の初版 |  |  |
| 227 | `undo` | 元に戻す | Undo | 英語の初版 |  |  |
| 228 | `redo` | やり直す | Redo | 英語の初版 |  |  |
| 229 | `counts` | カウント | Counts | 英語の初版 |  |  |
| 230 | `done` | 決定 | Done | 英語の初版 |  |  |
| 231 | `add` | 追加する | Add | 英語の初版 |  |  |
| 232 | `addCopy` | {counts} で複製して追加 | Add a copy ({counts}) | 英語の初版 |  |  |
| 233 | `matchCounts` | カウントを合わせる | Use that count | 英語の初版 |  |  |
| 234 | `othersWillChange` | 同じ名前の{count}件も同じカウントになります | The other {count} will change too | 英語の初版 |  |  |
| 235 | `updateAll` | {count}件まとめて決定 | Update all {count} | 英語の初版 |  |  |
| 236 | `standardVoiceJapanese` | 標準の声（日本語） | Standard voice (Japanese) | 英語の初版 |  |  |
| 237 | `standardVoiceJapaneseShort` | 標準（日本語） | Standard (Japanese) | 英語の初版 |  |  |
| 238 | `distributorVoice` | {name}さんの声 | {name}'s voice | 英語の初版 |  |  |
| 239 | `defaultVoiceNameEn` | 自分の声（英語） | My voice (English) | 英語の初版 |  |  |
| 240 | `defaultVoiceNameJa` | 自分の声（日本語） | My voice (Japanese) | 英語の初版 |  |  |
| 241 | `recordVoice` | 自分の声を録音する | Record your voice | 英語の初版 |  |  |
| 242 | `voiceTiming` | 声のタイミング | Voice timing | 英語の初版 |  |  |
| 243 | `voiceEarlier` | 早く | Earlier | 英語の初版 |  |  |
| 244 | `voiceLater` | 遅く | Later | 英語の初版 |  |  |
| 245 | `voiceTimingHint` | 声が遅れて聞こえたら「早く」を押します。 | If the voice sounds late, press “Earlier”. | 英語の初版 |  |  |
| 246 | `share` | 配る | Share | 英語の初版 |  |  |
| 247 | `instructionsCopyByHand` | 長押しで選んでコピーできます。 | Press and hold to select and copy. | 英語の初版 |  |  |
| 248 | `backupTipRoutine` | ルーティンは「配る」でファイルにして、自分にも送っておけます。 | You can turn routines into a file with “Share” and send it to yourself. | 技術語の疑い（ファイル・file）・長さ・英語の初版 |  |  |
| 249 | `updateApp` | 更新する | Update | 英語の初版 |  |  |

## 生徒への案内文（S9 でコピーされる）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 250 | `instructionsVoiceLead` | Dance Count で、私の声のカウントを使えます。 | You can practice with my voice in Dance Count. | 英語の初版 |  |  |
| 251 | `instructionsRoutinesLead` | Dance Count で、私のルーティンを使えます。 | You can use my routines in Dance Count. | 英語の初版 |  |  |
| 252 | `instructionsIphone` | 【iPhone】1. このファイルを開き、右上の共有ボタン →「"ファイル"に保存」 | [iPhone] 1. Open this file, tap Share (top right) → “Save to Files” | 技術語の疑い（ファイル・file）・長さ・英語の初版 |  |  |
| 253 | `instructionsStep2` | 2. Dance Count を開き「先生の声で練習」→「ファイルから受け取る」→「ファイルを選ぶ」 | 2. Open Dance Count → “Practice with your teacher's voice” → “Receive from a file” → “Choose a file” | 長さ・英語の初版 |  |  |
| 254 | `instructionsStep3` | 3. 「最近使った項目」からこのファイルを選び「使う」 | 3. Choose this file from “Recents” and tap “Use” | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 255 | `instructionsAndroid` | 【Android】このファイルを開き、共有 →「Dance Count」→「使う」（「Dance Count」が出てこない時は、保存してから 2・3 の手順で「ファイルを選ぶ」） | [Android] Open this file, tap Share → “Dance Count” → “Use” (if “Dance Count” is not listed, save the file and follow steps 2–3 to “Choose a file”) | 技術語の疑い（ファイル・file）・長さ・英語の初版 |  |  |
| 256 | `instructionsPhone` | （スマホで受け取るのが便利です） | (It's easiest on your phone.) | 英語の初版 |  |  |

## エラー・知らせ（仕様 §11）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 257 | `noSoundTitle` | 音が出ていません。 | No sound is playing. | 英語の初版 |  |  |
| 258 | `noSoundBody` | 本体の消音スイッチを確かめて、もう一度 ▶ を押してください。 | Check the silent switch and press ▶ again. | 依頼・英語の初版 |  |  |
| 259 | `playbackStopped` | 再生が止まりました。もう一度 ▶ を押してください。 | Playback stopped. Press ▶ again. | 依頼・英語の初版 |  |  |
| 260 | `voiceMissing` | この声はまだ端末に入っていません。インターネットにつないで一度再生してください。 | This voice isn't on your device yet. Connect to the internet and play once. | 依頼・長さ・英語の初版 |  |  |
| 261 | `wakeLockTip` | 練習中は画面が暗くなることがあります。自動ロックを長めにすると便利です。 | Your screen may dim during practice. A longer Auto-Lock helps. | 長さ・英語の初版 |  |  |
| 262 | `saveFailed` | 保存できませんでした。空き容量を確かめてください。 | Couldn't save. Please check free space. | 依頼・英語の初版 |  |  |
| 263 | `clearAllFailed` | 消せませんでした。ブラウザの設定からサイトのデータを消すこともできます。 | Couldn't delete. You can also delete the site data in your browser settings. | 技術語の疑い（ブラウザ・データ・browser・data）・長さ・英語の初版 |  |  |
| 264 | `noVoiceHeard` | 声が入っていませんでした。もう一度録音してください。 | We couldn't hear your voice. Please record again. | 依頼・英語の初版 |  |  |
| 265 | `micDenied` | マイクが使えない設定になっています。 | The microphone is turned off for this app. | 技術語の疑い（マイク・microphone）・英語の初版 |  |  |
| 266 | `micFailed` | マイクを使えませんでした。ほかのアプリや通話を終えてから、もう一度「録音をはじめる」を押してください。 | The microphone couldn't be used. Close other apps or end the call, then tap “Start recording” again. | 依頼・技術語の疑い（マイク・microphone）・長さ・英語の初版 |  |  |
| 267 | `noRecorder` | このブラウザでは録音できません。Safari（iPhone）か Chrome で開いてください。 | This browser can't record. Open this page in Safari (iPhone) or Chrome. | 技術語の疑い（ブラウザ・browser）・長さ・英語の初版 |  |  |
| 268 | `shareRefused` | 共有できませんでした。下の「ファイルを保存する」で保存できます。 | Sharing didn't work. You can save it with “Save the file” below. | 英語の初版 |  |  |
| 269 | `openedInLine` | LINE の中で開いています。Safari か Chrome で開き直すと、受け取った声がずっと残ります。 | This is open inside LINE. Open it in Safari or Chrome so the voice stays on your phone. | 長さ・英語の初版 |  |  |
| 270 | `fileBroken` | このファイルは読めませんでした。先生に送り直してもらってください。（{file}） | This file couldn't be read. Ask your teacher to send it again. ({file}) | 技術語の疑い（ファイル・file）・長さ・英語の初版 |  |  |
| 271 | `fileTooLarge` | このファイルは大きすぎて受け取れません。 | This file is too large. | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 272 | `fileTooNew` | 新しいアプリで作られたファイルです。アプリを更新してください。 | This file was made by a newer version. Please update the app. | 依頼・技術語の疑い（ファイル・file・version）・英語の初版 |  |  |
| 273 | `voiceLimitReached` | 声はすでに {count} あるので、受け取れません。使わない声を削除してから、もう一度選んでください。 | You already have {count} voices. Delete one you don't use, then choose the file again. | 技術語の疑い（file）・長さ・英語の初版 |  |  |
| 274 | `routineUnreadable` | ルーティン「{name}」は読めませんでした。 | Routine “{name}” couldn't be read. | 英語の初版 |  |  |
| 275 | `routinesUnreadableMore` | ほか {count} 本も読めませんでした。 | {count} more routines couldn't be read. | 英語の初版 |  |  |
| 276 | `routinesOverLimit` | ルーティンは {max} 本までなので、{count} 本は受け取れません。 | You can keep up to {max} routines, so {count} can't be received. | 英語の初版 |  |  |

## 脚注: 節ごとの依頼の数（1 画面 1 つまでの材料。1 つの画面に同時に出る数ではない）

- S1 ホーム: 0
- S2 再生: 0
- S3 ルーティン一覧: 0
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
