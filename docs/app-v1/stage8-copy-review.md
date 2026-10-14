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
| 17 | `infoMakeRoutines` | 種目ごとのルーティンを組み立てて、カウントをつけられます。できたルーティンは生徒に配ったり、「使う」で鳴らしたりできます。 | Build a routine for each dance and add the counts. You can send a finished routine to your students, or play it in “Use”. | 長さ・英語の初版 |  |  |
| 18 | `infoRoutines` | 先生から受け取ったルーティンと、自分で作ったルーティンが並びます。押すとすぐ鳴ります。 | Routines from your teacher and ones you made are listed here. Tap one to play it right away. | 長さ・英語の初版 |  |  |
| 19 | `routinesTitle` | ルーティン | Routines | 英語の初版 | OK |  |
| 20 | `routinesEmpty` | まだルーティンはありません | No routines yet | 英語の初版 | OK |  |
| 21 | `newRoutine` | 新しいルーティン | New routine | 英語の初版 | OK |  |
| 22 | `receivedFrom` | {name}から | From {name} | 英語の初版 | OK（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 23 | `needsFigures` | フィガーを追加すると再生できます。 | Add a figure to play this routine. | 英語の初版 | OK |  |
| 24 | `needsFix` | カウントに直す所があります。 | Some counts need fixing. | 英語の初版 | OK |  |
| 25 | `confirmDeleteTitle` | このルーティンを削除しますか？ | Delete this routine? | 英語の初版 | OK |  |

## M0 作る

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 26 | `makeIntro` | 指導者の方へ。作った物は「配る」でファイルにして生徒に送れます。 | For instructors. Use “Share” to turn what you make into a file for your students. | 技術語の疑い（ファイル・file）・長さ・英語の初版 |  |  |
| 27 | `makeShare` | 配る（ファイルを作る） | Share (make a file) | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 28 | `makeShareSub` | 声とルーティンを 1 つのファイルに | Your voice and routines in one file | 技術語の疑い（ファイル・file）・英語の初版 |  |  |
| 29 | `voiceStatusNone` | まだ録音していません | Not recorded yet | 英語の初版 |  |  |
| 30 | `voiceStatusPack` | {language} · {count} / {total} 語 | {language} · {count} / {total} words | 英語の初版 |  |  |
| 31 | `voiceStatusDone` | 録音済み | Recorded | 英語の初版 |  |  |
| 32 | `routinesCount` | {count} 本（受け取った物も直せます） | {count} routines (received ones too) | 英語の初版 |  |  |
| 33 | `routinesCountOne` | 1 本（受け取った物も直せます） | 1 routine (received ones too) | 英語の初版 |  |  |
| 34 | `routinesNone` | まだありません | None yet | 英語の初版 |  |  |
| 35 | `recordVoice` | 自分の声を録音する | Record your voice | 英語の初版 | OK |  |

## S4 ルーティン編集

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 36 | `newRoutineTitle` | 新しいルーティン | New routine | 英語の初版 | OK |  |
| 37 | `editRoutineTitle` | ルーティンの編集 | Edit routine | 英語の初版 | OK |  |
| 38 | `defaultRoutineName` | {dance}のルーティン | {dance} routine | 英語の初版 | OK |  |
| 39 | `routineName` | 名前 | Name | 英語の初版 | OK |  |
| 40 | `danceLine` | 種目: {dance} | Dance: {dance} | 英語の初版 | OK |  |
| 41 | `changeDance` | 変える | Change | 英語の初版 | OK |  |
| 42 | `noFigures` | フィガーはまだありません。 | No figures yet. | 英語の初版 | OK |  |
| 43 | `addFigure` | フィガーを追加 | Add a figure | 英語の初版 | OK |  |
| 44 | `newFigure` | 新しいフィガー | New figure | 英語の初版 | OK |  |
| 45 | `figureName` | フィガーの名前 | Figure name | 英語の初版 | OK |  |
| 46 | `figureSuggestions` | 名前の候補 | Suggested names | 英語の初版 | OK |  |
| 47 | `figureChoices` | {dance}のフィガー（{count}） | {dance} figures ({count}) | 英語の初版 | OK |  |
| 48 | `commonCounts` | カウントの形 | Count patterns | 英語の初版 | OK |  |
| 49 | `allowedSymbols` | 使える文字：{symbols} | Allowed: {symbols} | 英語の初版 | You can use: {symbols} |  |
| 50 | `countsFromHistory` | 前に使ったカウントです | Count you used before | 英語の初版 |  |  |
| 51 | `countsFromReviewed` | 目安のカウントです | Typical count | 英語の初版 |  |  |
| 52 | `sameNameExists` | 同じ名前があります（{counts}） | Same name exists ({counts}) | 英語の初版 | This name is already used ({counts}) |  |
| 53 | `sameNameCopy` | 同じ名前があります：{name}（{counts}） | Same name exists: {name} ({counts}) | 英語の初版 | {name} ({counts}) already exists |  |
| 54 | `renameForOtherCount` | 名前を変えると、違うカウントにできます | Use another name for a different count | 英語の初版 | Use a different name for a different count |  |
| 55 | `offBarFigure` | {beats}拍のカウントではありません | Not a {beats}-beat count | 英語の初版 | OK |  |
| 56 | `offBarFigureEdit` | {beats}拍のカウントではありません。必要なら編集してください。 | Not a {beats}-beat count. Edit it if needed. | 依頼・英語の初版 | OK |  |
| 57 | `routineEndsMidBar` | 小節の途中で終わっています。繰り返すと頭がずれます。 | The routine ends mid-bar, so repeats start off the beat. | 英語の初版 | The routine ends mid-bar, so repeats won't start on beat 1. |  |
| 58 | `startWithBeat` | 最初は数字か S・Q から | Start with a number, S or Q | 英語の初版 | OK |  |
| 59 | `countsInvalid` | この並びでは数えられません | This count can't be played | 英語の初版 | OK |  |
| 60 | `nameNeeded` | 名前を入れると決定できます | Add a name to finish | 英語の初版 | Enter a name to finish |  |
| 61 | `previewFigure` | このフィガーを試聴 | Play this figure | 英語の初版 | OK |  |
| 62 | `moveUp` | 上へ | Up | 英語の初版 | OK |  |
| 63 | `moveDown` | 下へ | Down | 英語の初版 | OK |  |
| 64 | `duplicate` | 複製 | Duplicate | 英語の初版 | OK |  |
| 65 | `moveFigureLabel` | {name}を動かす | Move {name} | 英語の初版 | OK |  |
| 66 | `previewAll` | 全体を試聴 | Play all | 英語の初版 | OK |  |
| 67 | `leadInLength` | はじめの合図の長さ | Lead-in length | 英語の初版 | OK（製品判断: leadIn の “Count-in” 案と一緒に決める） |  |
| 68 | `oneBar` | 1小節 | 1 bar | 英語の初版 | OK |  |
| 69 | `twoBars` | 2小節 | 2 bars | 英語の初版 | OK |  |
| 70 | `routineSpeed` | 速さ | Speed | 英語の初版 | OK |  |
| 71 | `danceStandardSpeed` | 種目の標準（♩={tempo}） | Dance standard (♩={tempo}) | 英語の初版 | Standard for this dance (♩={tempo}) |  |

## S5 ルーティン再生

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 72 | `madeByYou` | {dance} · あなたが作成 | {dance} · made by you | 英語の初版 | OK |  |
| 73 | `madeBy` | {dance} · {name}が作成 | {dance} · made by {name} | 英語の初版 | OK（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 74 | `figuresHeading` | フィガー | Figures | 英語の初版 | OK |  |
| 75 | `practiceRange` | 練習する範囲 | Practice range | 英語の初版 | OK |  |
| 76 | `rangeStart` | はじめ | From | 英語の初版 | OK |  |
| 77 | `rangeEnd` | おわり | To | 英語の初版 | OK |  |
| 78 | `previous` | 前 | Prev | 英語の初版 | Previous（幅が許せば。略語 “Prev” は年配の方に読みにくい） |  |
| 79 | `next` | 次 | Next | 英語の初版 | OK |  |
| 80 | `nextFigure` | 次: {name} | Next: {name} | 英語の初版 |  |  |

## S6 設定

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 81 | `settingsInstall` | ホーム画面に追加する方法 | How to add to the Home Screen | 英語の初版 | OK |  |
| 82 | `settingsHelpHeading` | 困った時は | If something's wrong | 英語の初版 | If something goes wrong |  |
| 83 | `settingsAbout` | プライバシー・アプリについて | Privacy & about this app | 英語の初版 | OK。製品判断（Fable OQ7）: 短い語（例 “About & privacy”）にすれば 320px 幅の特別扱いが要らなくなる |  |
| 84 | `settingsAboutHeading` | このアプリについて | About this app | 英語の初版 |  |  |
| 85 | `versionLabel` | 版 {version} | Version {version} | 技術語の疑い（版・version）・英語の初版 | OK |  |
| 86 | `settingsLanguage` | 言語 | Language | 英語の初版 | OK |  |

## S7 声

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 87 | `recordFromMake` | 自分の声の録音は、トップの「作る」から。 | To record your own voice, go to “Make” on the home screen. | 英語の初版 |  |  |
| 88 | `voicesTitle` | 声 | Voice | 英語の初版 | Voices |  |
| 89 | `voiceInProgressCount` | ·⍽{count}⍽/⍽12⍽語 | ·⍽{count}⍽/⍽12⍽words | 英語の初版 | OK |  |
| 90 | `confirmDeleteVoiceTitle` | この声を削除しますか？ | Delete this voice? | 英語の初版 | OK |  |
| 91 | `continueRecording` | 続きを録音する | Continue recording | 英語の初版 | OK |  |

## S8 自分の声を録音

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 92 | `infoRecord` | カウントの 12 の言葉を自分の声で録音すると、その声でカウントが鳴ります。録音した声は「配る」で生徒に渡せます。 | Record the 12 count words in your own voice, and the counts will play in your voice. You can send it to your students in “Share”. | 長さ・英語の初版 |  |  |
| 93 | `recordAddFirst` | ホーム画面に追加してから録音するのがおすすめです。このブラウザで録音した声は、追加したアプリには引き継がれません。（追加の方法は、設定の「ホーム画面に追加する方法」） | We recommend adding to the Home Screen before recording. A voice recorded in this browser won't carry over to the added app. (See Settings → “How to add to the Home Screen”.) | 技術語の疑い（ブラウザ・browser）・長さ・英語の初版 | Before recording, we recommend adding this to your Home Screen. Voices recorded in this browser don't carry over to the Home Screen app. (Settings → “How to add to the Home Screen”) |  |
| 94 | `recordTitle` | 自分の声を録音 | Record your voice | 英語の初版 | OK |  |
| 95 | `recordIntro1` | 12 語を、1 語ずつ録音します。 | You will record 12 words, one at a time. | 英語の初版 | OK |  |
| 96 | `recordIntro2` | 録音は、この端末の中にだけ残ります。 | Recordings stay on this device only. | 英語の初版 | OK |  |
| 97 | `recordIntro3` | いつでも消せます。 | You can delete them at any time. | 英語の初版 | OK |  |
| 98 | `recordLanguage` | 数える言葉 | Count in | 英語の初版 | Counting language |  |
| 99 | `countInEnglish` | 英語で数える（One, Two, Slow…） | Count in English (One, Two, Slow…) | 英語の初版 | OK |  |
| 100 | `countInJapanese` | 日本語で数える（いち、に、スロー…） | Count in Japanese (ichi, ni, san…) | 英語の初版 | OK |  |
| 101 | `recordedUpTo` | {count}⍽/⍽12⍽語まで録音済み | {count}⍽/⍽12⍽words recorded | 英語の初版 | OK |  |
| 102 | `recordedAll` | 録音済み（12 語） | Recorded (12 words) | 英語の初版 | OK |  |
| 103 | `startRecording` | 録音をはじめる | Start recording | 英語の初版 | OK |  |
| 104 | `recordWords` | 録音する 12 語 | The 12 words | 英語の初版 |  |  |
| 105 | `recordHint` | 「今！」の合図で「{word}」と言ってください。 | At “Now!”, say “{word}”. | 英語の初版 | OK |  |
| 106 | `recordWord` | 録音する | Record | 英語の初版 | OK |  |
| 107 | `recordAgain` | 録り直す | Record again | 英語の初版 | OK |  |
| 108 | `reviewFromFirst` | 1⍽語目から見直す | Review from word 1 | 英語の初版 | OK |  |
| 109 | `recordingNow` | 録音中 | Recording | 英語の初版 | OK |  |
| 110 | `recordCancel` | やめる | Cancel | 英語の初版 |  |  |
| 111 | `recordCueNow` | 今！ | Now! | 英語の初版 |  |  |
| 112 | `recordAutoStop` | 約⍽2⍽秒で自動で止まります | Stops automatically in about 2 seconds | 英語の初版 |  |  |
| 113 | `listenTake` | 聞く | Play | 英語の初版 | OK |  |
| 114 | `previousWord` | 前のカウント | Previous count | 英語の初版 | OK |  |
| 115 | `nextWord` | 次のカウント | Next count | 英語の初版 | OK |  |
| 116 | `finishRecording` | 完成へ | Finish | 英語の初版 | OK |  |
| 117 | `micHowTo` | 設定の開き方 | How to allow it | 英語の初版 | OK |  |
| 118 | `micHowToIphone` | iPhone：設定 → アプリ → Safari → マイク（ホーム画面から開いた時は、Safari のかわりにこのアプリの名前） | iPhone: Settings → Apps → Safari → Microphone (if you opened it from the Home Screen, this app's name instead of Safari) | 技術語の疑い（マイク・microphone）・長さ・英語の初版 | iPhone: Settings → Apps → Safari → Microphone (if you opened it from your Home Screen, choose this app's name instead of Safari) |  |
| 119 | `micHowToOther` | Android・PC：アドレスバーの左のマーク → マイク | Android / PC: the icon at the left of the address bar → Microphone | 技術語の疑い（アドレスバー・アドレス・マイク・address bar・address・microphone）・英語の初版 | Android / PC: the icon at the left end of the address bar → Microphone |  |
| 120 | `micHowToThen` | 許可したら、もう一度「録音をはじめる」を押してください。 | Then tap “Start recording” again. | 依頼・英語の初版 | After allowing it, tap “Start recording” again. |  |
| 121 | `recordNeedsHttps` | 安全な接続（https）で開くと録音できます。 | Recording works only over a secure (https) connection. | 英語の初版 |  |  |
| 122 | `voiceReadyTitle` | 録音できました | Your voice is ready | 英語の初版 | OK |  |
| 123 | `voiceName` | 名前 | Name | 英語の初版 | OK |  |
| 124 | `compareTitle` | ワルツで聞き比べる | Compare with the waltz | 英語の初版 | Compare using a waltz |  |
| 125 | `yourVoice` | 自分の声 | Your voice | 英語の初版 | OK |  |
| 126 | `standardVoice` | 標準の声 | Standard voice | 英語の初版 | OK |  |
| 127 | `finishDone` | 完了 | Done | 英語の初版 | OK |  |
| 128 | `backupTipRecording` | 「配る」で作ったファイルを自分にも送っておくと、端末を替えても声を使えます。 | Send yourself the file made with “Share” and you can use this voice on another phone. | 技術語の疑い（ファイル・file）・長さ・英語の初版 | Send yourself the file from “Share” to keep this voice if you change phones. |  |

## S9 配る

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 129 | `infoShare` | 自分の声とルーティンを 1 つのファイルにして、生徒に送れます。生徒はそのファイルを「受け取る」で開きます。 | Put your voice and routines into one file and send it to your students. They open it in “Receive”. | 技術語の疑い（ファイル・file）・長さ・英語の初版 |  |  |
| 130 | `shareTitle` | 配る | Share | 英語の初版 | OK |  |
| 131 | `shareYourName` | あなたの名前 | Your name | 英語の初版 | OK |  |
| 132 | `shareNameNeeded` | 名前を入れると、ファイルを作れます。 | Enter your name to create the file. | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 133 | `shareVoiceHeading` | 声 | Voice | 英語の初版 | OK |  |
| 134 | `shareVoiceNone` | 入れない | None | 英語の初版 | OK |  |
| 135 | `shareNoRecordedVoice` | 録音した声はまだありません。 | You haven't recorded a voice yet. | 英語の初版 | OK |  |
| 136 | `shareVoiceInProgress` | {language}の声は {count} / {total} 語まで録音ずみです。{total} 語そろうと配れます。 | Your {language} voice has {count} / {total} words. It can be shared once all {total} are recorded. | 長さ・英語の初版 |  |  |
| 137 | `shareVoicePrepFailed` | この声はファイルにできませんでした。 | This voice couldn't be put in a file. | 技術語の疑い（ファイル・file）・英語の初版 | This voice couldn't be added to the file. |  |
| 138 | `shareConsent` | 自分の声をこのファイルに入れて配ることに同意します。配り先は自分で管理します。 | I agree to put my voice in this file and share it. I will manage who receives it. | 技術語の疑い（ファイル・file）・長さ・英語の初版 | I agree to share my voice in this file. I'll decide who receives it. |  |
| 139 | `shareConsentNeeded` | 同意すると、ファイルを作れます。 | Tick the box to create the file. | 技術語の疑い（ファイル・file）・英語の初版 | Check the box to create the file. |  |
| 140 | `shareRoutinesHeading` | ルーティン | Routines | 英語の初版 | OK |  |
| 141 | `shareNoRoutines` | 配れるルーティンはまだありません。 | No routines to share yet. | 英語の初版 | OK |  |
| 142 | `shareChooseSomething` | 声かルーティンを選ぶと、ファイルを作れます。 | Choose a voice or a routine to create the file. | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 143 | `shareNothingYet` | 先に声を録音するか、ルーティンを作ると配れます。 | Record a voice or make a routine first, and then you can share it. | 英語の初版 | OK（D51・代理決定。S9 を録音もルーティンも無いまま開いた時の帯の 1 行。final-review m2） |  |
| 144 | `createFile` | ファイルを作る | Create file | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 145 | `shareAfterSend` | ファイルを送ったら、下の案内文も送ってください。 | After sending the file, send the instructions below too. | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 146 | `shareSaved` | 「{file}」を保存しました。LINE やメールに添付できます。 | “{file}” has been saved. You can attach it to LINE or email. | 英語の初版 | Saved “{file}”. You can attach it in LINE or to an email. |  |
| 147 | `saveFileAgain` | ファイルを保存する | Save the file | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 148 | `copyInstructions` | 生徒への案内文をコピー | Copy instructions for students | 英語の初版 | OK |  |
| 149 | `showInstructions` | 案内文を見る | Show the message | 英語の初版 |  |  |
| 150 | `instructionsCopied` | 案内文をコピーしました。LINE やメールに貼れます。 | Copied. You can paste it into LINE or email. | 英語の初版 | OK |  |
| 151 | `instructionsLabel` | 生徒への案内文 | Instructions for students | 英語の初版 | OK |  |

## S10 受け取る

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 152 | `infoReceive` | 先生から届いたファイルを開くと、先生の声やルーティンをこの端末で使えるようになります。 | Open the file your teacher sent you to use their voice and routines on this device. | 技術語の疑い（ファイル・file）・長さ・英語の初版 |  |  |
| 153 | `receiveTitle` | 受け取る | Receive | 英語の初版 | OK |  |
| 154 | `chooseFile` | ファイルを選ぶ | Choose a file | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 155 | `readingFile` | 読んでいます… | Reading… | 英語の初版 | OK |  |
| 156 | `receiveHelpLine` | LINE で届いたファイルは、先に「"ファイル"に保存」しておくと、ここで選べます。 | If the file came by LINE, save it with “Save to Files” first. | 技術語の疑い（ファイル・file）・長さ・英語の初版 | OK |  |
| 157 | `receiveHelpRecents` | 選ぶ画面では「最近使った項目」にあります。 | You will find it under “Recents”. | 英語の初版 | You'll find it under “Recents”. |  |
| 158 | `openInSafari` | Safari で開く | Open in Safari | 英語の初版 | OK |  |
| 159 | `inThisFile` | このファイルの中身 | In this file | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 160 | `fileVoiceFrom` | {name}の声（{language}）· {count} 語 | {name}'s voice ({language}) · {count} words | 英語の初版 | OK（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 161 | `fileVoiceNamed` | {name}（{language}）· {count} 語 | {name} ({language}) · {count} words | 英語の初版 | OK |  |
| 162 | `fileRoutinesOne` | ルーティン 1 本: {names} | 1 routine: {names} | 英語の初版 | OK |  |
| 163 | `fileRoutines` | ルーティン {count} 本: {names} | {count} routines: {names} | 英語の初版 | OK |  |
| 164 | `namesAndMore` | {names} ほか {count} 本 | {names} and {count} more | 英語の初版 | OK |  |
| 165 | `routineNoName` | （名前なし） | (no name) | 英語の初版 | OK |  |
| 166 | `replaceVoiceFrom` | {name}の声はすでにあります。「使う」で新しい方に置き換わります。 | You already have {name}'s voice. “Use” replaces it with this one. | 英語の初版 | You already have {name}'s voice. Tap “Use” to replace it with this one.（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 167 | `replaceVoiceNamed` | 「{name}」はすでにあります。「使う」で新しい方に置き換わります。 | You already have “{name}”. “Use” replaces it with this one. | 英語の初版 | You already have “{name}”. Tap “Use” to replace it with this one. |  |
| 168 | `replaceRoutines` | 同じルーティンは新しい方に置き換わります。 | Routines you already have are replaced with the new ones. | 英語の初版 | OK |  |
| 169 | `useFile` | 使う | Use | 英語の初版 | OK |  |
| 170 | `receivedTitle` | 受け取りました | Received | 英語の初版 | OK |  |
| 171 | `receivedVoiceFrom` | 「使う」で種目を選んで ▶ を押すと、{name}の声で鳴ります。 | Choose a dance in “Use” and press ▶ to hear {name}'s voice. | 英語の初版 | OK（Fable 2026-10-13: 「ホームで」をやめ「「使う」で」に。英語は “Home screen” が iPhone の「ホーム画面」と紛れるので “Choose a dance in “Use””。アプリのタブ名は ja「使う」／en “Use”）（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 172 | `receivedVoiceNamed` | 「使う」で種目を選んで ▶ を押すと、「{name}」で鳴ります。 | Choose a dance in “Use” and press ▶ to hear “{name}”. | 英語の初版 | OK（receivedVoiceFrom と同じ理由。Fable 2026-10-13: 「ホームで」→「「使う」で」） |  |
| 173 | `receivedRoutines` | 「ルーティン」に入っています。 | They are in “Routines”. | 英語の初版 | You'll find them in “Routines”. |  |
| 174 | `goHome` | 種目を選ぶ | Choose a dance | 英語の初版 | OK（Fable 2026-10-13: 「ホームへ」→「種目を選ぶ」／“Choose a dance”。“Home” と iPhone の「ホーム画面」の紛れを避ける。画面に「ホーム」という語は無い） |  |
| 175 | `seeRoutines` | ルーティンを見る | See routines | 英語の初版 | OK |  |
| 176 | `playRoutine` | ルーティンを鳴らす | Play the routine | 英語の初版 |  |  |

## S11 音が鳴らない時

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 177 | `soundHelpSwitch` | 本体横のスイッチ（マナーモード）を確かめる | Check the switch on the side of your phone (silent mode). | 英語の初版 | 製品判断: Make sure your phone isn't on silent.（iPhone 15 Pro 以降と Android には横の消音スイッチが無い。ja 案「消音（マナーモード）になっていないか確かめる」。今の文はスイッチのある SE 向けのまま） |  |
| 178 | `soundHelpVolume` | 音量を上げる | Turn the volume up. | 英語の初版 | OK |  |
| 179 | `soundHelpEarphones` | イヤホン・Bluetooth の接続を確かめる | Check your earphones or Bluetooth connection. | 技術語の疑い（Bluetooth）・英語の初版 | OK |  |
| 180 | `soundHelpRetry` | もう一度 ▶ を押してください。 | Then press ▶ again. | 依頼・英語の初版 | OK |  |

## S12 ホーム画面に追加する方法

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 181 | `installTitle` | ホーム画面に追加する | Add to Home Screen | 英語の初版 | OK |  |
| 182 | `installIntro` | ホーム画面に追加すると、アプリのように開けて、電波が無くても使えます。 | Added to your Home Screen, it opens like an app and works without a signal. | 長さ・英語の初版 | From your Home Screen, it opens like an app and works without a signal. |  |
| 183 | `installIosStep1` | 画面の下の「…」を押します。 | Tap “…” at the bottom of the screen. | 英語の初版 | OK |  |
| 184 | `installIosStep2` | 「共有」を押します。 | Tap “Share”. | 英語の初版 | OK |  |
| 185 | `installIosStep3` | 「もっと見る」を押し、「ホーム画面に追加」を押します。 | Tap “View More”, then “Add to Home Screen”. | 英語の初版 | OK（Task 9 の Simulator（iOS 26.3）で確認済み: ja は「もっと見る」、en は “View More”（“See More” から直した）。並びに “More”（アプリの列の「その他」）もあるので “View More” と書き分ける） |  |
| 186 | `installIosStep4` | 右上の「追加」を押します。 | Tap “Add” at the top right. | 英語の初版 | OK |  |
| 187 | `installNotCarried` | 録音した声・受け取った声・ルーティンは、追加したアプリには引き継がれません。追加したアプリで、もう一度録音・受け取りをしてください。 | Recorded voices, received voices and routines don't carry over to the added app. Record or receive them again in the added app. | 依頼・長さ・英語の初版 | Voices and routines don't carry over to the Home Screen app. Record or receive them again there.（追加したアプリの英語の呼び方は “the Home Screen app” にそろえる。recordAddFirst・aboutPrivacy6 も） |  |
| 188 | `installOpenInSafari` | Safari で開くと、ホーム画面に追加できます。 | Open this page in Safari to add it to your Home Screen. | 英語の初版 | OK |  |
| 189 | `installOnPhone` | iPhone や Android で開くと、ホーム画面に追加できます。 | Open this page on your phone to add it to the Home Screen. | 英語の初版 | OK |  |
| 190 | `installCopyAddress` | アドレスをコピー | Copy the address | 技術語の疑い（アドレス・address）・英語の初版 | OK（製品判断: “Copy the link”／“Link copied” の方が “address” より馴染むかも） |  |
| 191 | `installAddressCopiedSafari` | アドレスをコピーしました。Safari を開き、アドレス欄に貼り付けてください。 | Address copied. Open Safari and paste it into the address bar. | 技術語の疑い（アドレス・address bar・address）・長さ・英語の初版 | OK（「上の」／“at the top” は D50 で外した＝Fix round 1） |  |
| 192 | `installAddressCopiedPhone` | アドレスをコピーしました。LINE やメールでスマホに送ってください。 | Address copied. Send it to your phone by LINE or email. | 技術語の疑い（アドレス・address）・英語の初版 | OK |  |
| 193 | `installAndroidButton` | ホーム画面に追加する | Add to Home Screen | 英語の初版 | OK |  |
| 194 | `installAndroidStep1` | 右上の「⋮」を押します。 | Tap “⋮” at the top right. | 英語の初版 | OK |  |
| 195 | `installAndroidStep2` | 「ホーム画面に追加」（または「アプリをインストール」）を押します。 | Tap “Add to Home screen” (or “Install app”). | 英語の初版 | OK |  |
| 196 | `installAndroidStep3` | 「インストール」を押します。 | Tap “Install”. | 英語の初版 | OK |  |
| 197 | `installDone` | このアプリはホーム画面から開いています。追加は済んでいます。 | You're using the app from your Home Screen. Nothing more to do. | 英語の初版 | You opened this from your Home Screen, so it's already added. |  |

## S13 プライバシー・アプリについて

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 198 | `deleteAllData` | データを全て消す | Delete all data | 技術語の疑い（データ・data）・英語の初版 | OK |  |
| 199 | `confirmDeleteAllTitle` | このアプリのデータを全て消しますか？ | Delete all data in this app? | 技術語の疑い（データ・data）・英語の初版 | OK |  |
| 200 | `confirmDeleteAllDetail` | 録音した声・受け取った声・ルーティン・設定が消えます。元に戻せません。 | Recorded voices, received voices, routines and settings will be deleted. This can't be undone. | 長さ・英語の初版 | OK |  |
| 201 | `confirmDeleteAll` | 消す | Delete | 英語の初版 | OK |  |
| 202 | `aboutTitle` | Dance Count について | About Dance Count | 法務確認待ち・英語の初版 | OK |  |
| 203 | `aboutApp` | Dance Count — for Ballroom　版⍽{version} | Dance Count — for Ballroom · Version⍽{version} | 法務確認待ち・技術語の疑い（版・version）・英語の初版 | OK |  |
| 204 | `aboutOperator` | 運営：くうが株式会社 | Operated by Kuga Inc. | 法務確認待ち・英語の初版 | OK |  |
| 205 | `aboutContact` | 問い合わせ | Contact | 法務確認待ち・英語の初版 | OK |  |
| 206 | `aboutNotOfficial` | このアプリのカウントは、公式のもの・監修を受けたものではありません。 | The counts in this app are not official and have not been reviewed by any organization. | 法務確認待ち・長さ・英語の初版 | OK |  |
| 207 | `aboutPrivacyHeading` | プライバシー | Privacy | 法務確認待ち・英語の初版 | OK |  |
| 208 | `aboutPrivacy1` | 録音した声・受け取った声・ルーティン・設定は、この端末の中にだけ保存されます。運営者（くうが株式会社）がこれらを受け取ることはありません。 | Recorded voices, received voices, routines and settings are saved only on this device. The operator (Kuga Inc.) never receives them. | 法務確認待ち・長さ・英語の初版 | OK |  |
| 209 | `aboutPrivacy2` | このアプリは、利用状況を集めたり、外部に送ったりする仕組みを持っていません（解析ツール・広告はなく、書体も外部から取り寄せません）。 | This app has no way to collect how it is used or to send that information anywhere (no analytics, no ads, and fonts are not fetched from other sites). | 法務確認待ち・長さ・英語の初版 | This app has no way to collect usage information or send it anywhere (no analytics, no ads, and no fonts loaded from other sites). |  |
| 210 | `aboutPrivacy3` | アプリのファイル（画面・音声・書体）を配信するサーバーには、ブラウザが通常送る情報（アクセスの日時など）が記録されることがあります。 | The server that delivers the app's files (screens, sounds and fonts) may record what browsers normally send, such as the time of access. | 法務確認待ち・技術語の疑い（ブラウザ・ファイル・サーバー・browser・file・server）・長さ・英語の初版 | The server that delivers the app's files (screens, sounds and fonts) may record information browsers normally send, such as the time of access. |  |
| 211 | `aboutPrivacy4` | マイクは、声を録音する画面でだけ使います。許可を取る時と、「録音する」「録り直す」を押してから、合図と録音のあいだ（約⍽6⍽秒）だけ開き、すぐ閉じます。録音した声はこの端末に残り、いつでも消せます。 | The microphone is used only on the voice recording screen: when you allow access, and after you tap “Record” or “Record again”, only during the countdown and the recording (about 6 seconds). It is closed right after. Recordings stay on this device, and you can delete them at any time. | 法務確認待ち・技術語の疑い（マイク・microphone）・長さ・英語の初版 | The microphone is used only on the recording screen. It turns on only when you allow access and for 1.5 seconds after you tap “Record” or “Record again”, then turns off right away. Recordings stay on this device, and you can delete them at any time. |  |
| 212 | `aboutPrivacy5` | 「配る」で作ったファイルには、あなたの名前と、入れた声・ルーティン、作った日時が入ります。誰に渡すかは、あなた自身が決めます。LINE やメールでの受け渡しは、それぞれのサービスの決まりに従います。受け取ったファイルには、送った人の名前と声が入っています。 | A file made with “Share” contains your name, the voice and routines you put in it, and the date it was made. You decide who gets it. Sending it by LINE or email follows the rules of those services. A file you receive contains the sender's name and voice. | 法務確認待ち・技術語の疑い（ファイル・file）・長さ・英語の初版 | A file made with “Share” contains your name, the voice and routines you put in it, and the date it was made. You decide who gets it. If you send it by LINE or email, those services' own terms apply. A file you receive contains the sender's name and voice. |  |
| 213 | `aboutPrivacy6` | データは、この画面の「データを全て消す」か、ブラウザの設定（サイトのデータの削除）で消せます。iPhone では、Safari とホーム画面に追加したアプリで保存場所が別々です。消すのは、いま開いている方だけです。 | You can delete the data with “Delete all data” on this screen, or in your browser settings (delete the site data). On iPhone, Safari and the app added to the Home Screen keep their data separately. Only the one you have open is deleted. | 法務確認待ち・技術語の疑い（ブラウザ・データ・browser・data）・長さ・英語の初版 | You can delete the data with “Delete all data” on this screen, or in your browser settings (delete the site data). On iPhone, Safari and the Home Screen app keep their data separately, and only the one you have open is deleted. |  |
| 214 | `aboutCreditsHeading` | 使っているもの | Credits | 法務確認待ち・英語の初版 | OK |  |
| 215 | `aboutCreditFonts` | 書体：Inter・Noto Sans JP（SIL Open Font License 1.1） | Fonts: Inter and Noto Sans JP (SIL Open Font License 1.1) | 法務確認待ち・長さ・英語の初版 | OK |  |
| 216 | `aboutCreditCode` | Preact・Workbox（MIT License） | Preact and Workbox (MIT License) | 法務確認待ち・英語の初版 | OK |  |
| 217 | `aboutCreditIcons` | 一部のアイコン：Lucide（ISC License） | Some icons: Lucide (ISC License) | 法務確認待ち・英語の初版 | OK |  |

## 共通（複数の画面・部品）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 218 | `documentTitle` | Dance Count — for Ballroom | Dance Count — for Ballroom | 英語の初版 | OK |  |
| 219 | `switchLanguage` | English | 日本語 | 英語の初版 | OK |  |
| 220 | `tabFigures` | フィガー | Figures | 英語の初版 |  |  |
| 221 | `tabRoutines` | ルーティン | Routines | 英語の初版 | OK |  |
| 222 | `navLabel` | メイン | Main | 英語の初版 | OK |  |
| 223 | `back` | 戻る | Back | 英語の初版 | OK |  |
| 224 | `backToCover` | トップ | Home | 英語の初版 |  |  |
| 225 | `coverMake` | 作る | Make | 英語の初版 |  |  |
| 226 | `makeRoutines` | ルーティンを作る・直す | Make and edit routines | 英語の初版 |  |  |
| 227 | `chooseDance` | 種目を選んでください | Choose a dance | 英語の初版 | OK |  |
| 228 | `danceGroup` | 種目 | Dances | 英語の初版 | OK |  |
| 229 | `resume` | 続きから | Resume | 英語の初版 | OK |  |
| 230 | `lastRoutine` | ルーティン | Routine | 英語の初版 |  |  |
| 231 | `lastRoutineFrom` | {from}のルーティン | Routine from {from} | 英語の初版 |  |  |
| 232 | `speed` | 速さ | Speed | 英語の初版 | OK |  |
| 233 | `speedSlow` | ゆっくり | Slower | 英語の初版 | OK |  |
| 234 | `speedStandard` | 標準 | Standard | 英語の初版 | OK |  |
| 235 | `speedFast` | 速め | Faster | 英語の初版 | OK |  |
| 236 | `tempoMark` | ♩={tempo} | ♩={tempo} | 英語の初版 | OK |  |
| 237 | `metronome` | メトロノーム | Metronome | 英語の初版 | OK |  |
| 238 | `leadIn` | はじめの合図 | Lead-in | 英語の初版 | 製品判断: “Count-in”（音楽・ダンスでより通じる語。leadInNow “Count-in…”・leadInLength “Count-in length” も一緒に） |  |
| 239 | `leadInNow` | はじめの合図… | Lead-in… | 英語の初版 | OK |  |
| 240 | `on` | オン | On | 英語の初版 | OK |  |
| 241 | `off` | オフ | Off | 英語の初版 | OK |  |
| 242 | `voiceChip` | 声: {name} | Voice: {name} | 英語の初版 | OK |  |
| 243 | `standardVoiceShort` | 標準（英語） | Standard (English) | 英語の初版 | OK |  |
| 244 | `moreOptions` | くわしく | More options | 英語の初版 | OK |  |
| 245 | `moreOptionsWithTempo` | くわしく · ♩={tempo} | More options · ♩={tempo} | 英語の初版 | OK |  |
| 246 | `fineSpeed` | 速さの細かい調整 | Fine speed | 英語の初版 | Fine-tune speed |  |
| 247 | `competitionSpeed` | 競技の速さ（♩={min}〜{max}） | Competition speed (♩={min}–{max}) | 英語の初版 | OK |  |
| 248 | `repeat` | 繰り返す | Repeat | 英語の初版 | OK |  |
| 249 | `play` | 再生 | Play | 英語の初版 | OK |  |
| 250 | `stop` | 停止 | Stop | 英語の初版 | OK |  |
| 251 | `nowCount` | いま {count} | Now: {count} | 英語の初版 | OK |  |
| 252 | `noSoundLink` | 音が鳴らない時は | If there is no sound | 英語の初版 | OK（ja は見出し soundHelpTitle「音が鳴らない時」にそろえて「音が鳴らない時は」に直した＝Fix round 1。en は元から同じ） |  |
| 253 | `close` | 閉じる | Close | 英語の初版 | OK |  |
| 254 | `aboutThisScreen` | この画面について | About this screen | 英語の初版 |  |  |
| 255 | `standardVoiceEnglish` | 標準の声（英語） | Standard voice (English) | 英語の初版 | OK。製品判断（Fable OQ7）: どこでも短い “Standard (English)” にすれば 320px 幅の特別扱いが要らなくなる |  |
| 256 | `soundHelpTitle` | 音が鳴らない時 | If there is no sound | 英語の初版 | OK |  |
| 257 | `updateReady` | 新しい版があります。 | A new version is ready. | 技術語の疑い（版・version）・英語の初版 | An update is ready. |  |
| 258 | `routineSummary` | {dance} · {count} フィガー | {dance} · {count} figures | 英語の初版 | OK |  |
| 259 | `routineSummaryOne` | {dance} · 1 フィガー | {dance} · 1 figure | 英語の初版 | OK |  |
| 260 | `edit` | 編集 | Edit | 英語の初版 | OK |  |
| 261 | `delete` | 削除 | Delete | 英語の初版 | OK |  |
| 262 | `confirmDelete` | 削除する | Delete | 英語の初版 | OK |  |
| 263 | `cancel` | やめる | Cancel | 英語の初版 | OK |  |
| 264 | `undo` | 元に戻す | Undo | 英語の初版 | OK |  |
| 265 | `redo` | やり直す | Redo | 英語の初版 | OK |  |
| 266 | `counts` | カウント | Counts | 英語の初版 | OK |  |
| 267 | `done` | 決定 | Done | 英語の初版 | OK |  |
| 268 | `add` | 追加する | Add | 英語の初版 | OK |  |
| 269 | `addCopy` | {counts} で複製して追加 | Add a copy ({counts}) | 英語の初版 | OK |  |
| 270 | `matchCounts` | カウントを合わせる | Use that count | 英語の初版 | OK |  |
| 271 | `othersWillChange` | 同じ名前の{count}件も同じカウントになります | The other {count} will change too | 英語の初版 | Other figures with this name will change too ({count}) |  |
| 272 | `updateAll` | {count}件まとめて決定 | Update all {count} | 英語の初版 | OK |  |
| 273 | `settingsTitle` | 設定 | Settings | 英語の初版 | OK |  |
| 274 | `standardVoiceJapanese` | 標準の声（日本語） | Standard voice (Japanese) | 英語の初版 | OK |  |
| 275 | `standardVoiceJapaneseShort` | 標準（日本語） | Standard (Japanese) | 英語の初版 | OK |  |
| 276 | `distributorVoice` | {name}の声 | {name}'s voice | 英語の初版 | OK（D49: {name} には “Yamada”／“Yamada-sensei” のように打った名前がそのまま入る。日本語は「山田さん」「山田先生」） |  |
| 277 | `defaultVoiceNameEn` | 自分の声（英語） | My voice (English) | 英語の初版 | OK |  |
| 278 | `defaultVoiceNameJa` | 自分の声（日本語） | My voice (Japanese) | 英語の初版 | OK |  |
| 279 | `previewVoice` | 試聴 | Preview | 英語の初版 | OK |  |
| 280 | `recordWordChip` | {index}番目・{word}・{state} | Word {index}, {word}, {state} | 英語の初版 |  |  |
| 281 | `recordWordDone` | 録音済み | recorded | 英語の初版 |  |  |
| 282 | `recordWordTodo` | まだ | not yet | 英語の初版 |  |  |
| 283 | `voiceTiming` | 声のタイミング | Voice timing | 英語の初版 | OK |  |
| 284 | `voiceEarlier` | 早く | Earlier | 英語の初版 | OK |  |
| 285 | `voiceLater` | 遅く | Later | 英語の初版 | OK |  |
| 286 | `voiceTimingHint` | 声が遅れて聞こえたら「早く」を押します。 | If the voice sounds late, press “Earlier”. | 英語の初版 | If the voice sounds late, tap “Earlier”. |  |
| 287 | `share` | 配る | Share | 英語の初版 | OK（製品判断: “Send” にするかは「先に決めてほしいこと」1） |  |
| 288 | `shareRoutines` | ルーティンを配る | Share routines | 英語の初版 | OK（製品判断: “Send” にするかは「先に決めてほしいこと」1） |  |
| 289 | `receiveFromFile` | ファイルから受け取る | Receive from a file | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 290 | `instructionsCopyByHand` | 長押しで選んでコピーできます。 | Press and hold to select and copy. | 英語の初版 | Touch and hold the text to select and copy it. |  |
| 291 | `backupTipRoutine` | ルーティンは「配る」でファイルにして、自分にも送っておけます。 | You can turn routines into a file with “Share” and send it to yourself. | 技術語の疑い（ファイル・file）・長さ・英語の初版 | Use “Share” to save routines in a file you can send to yourself. |  |
| 292 | `updateApp` | 更新する | Update | 英語の初版 | OK |  |
| 293 | `languageEnglish` | 英語 | English | 英語の初版 | OK |  |
| 294 | `languageJapanese` | 日本語 | Japanese | 英語の初版 | OK |  |
| 295 | `receivedRoutinesToo` | ルーティンは、「使う」の下のタブ「ルーティン」にあります。 | The routines are under the “Routines” tab at the bottom of “Use”. | 英語の初版 |  |  |

## 生徒への案内文（S9 でコピーされる）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 296 | `instructionsVoiceLead` | Dance Count で、私の声のカウントを使えます。 | You can practice with my voice in Dance Count. | 英語の初版 | OK |  |
| 297 | `instructionsRoutinesLead` | Dance Count で、私のルーティンを使えます。 | You can use my routines in Dance Count. | 英語の初版 | OK |  |
| 298 | `instructionsIphoneHead` | 【iPhone】 | [iPhone] | 英語の初版 |  |  |
| 299 | `instructionsStep1` | 1. このファイルを開き、右上の共有ボタン →「"ファイル"に保存」 | 1. Open this file, tap Share (top right) → “Save to Files” | 技術語の疑い（ファイル・file）・英語の初版 | 1. Open this file, tap “Share” (top right) → “Save to Files” |  |
| 300 | `instructionsStep2` | 2. Dance Count を開き「使う」→ 下の「ルーティン」→「ファイルから受け取る」→「ファイルを選ぶ」 | 2. Open Dance Count → “Use” → “Routines” (bottom tab) → “Receive from a file” → “Choose a file” | 長さ・英語の初版 | OK |  |
| 301 | `instructionsStep3` | 3. 「最近使った項目」からこのファイルを選び「使う」 | 3. Choose this file from “Recents” and tap “Use” | 技術語の疑い（ファイル・file）・英語の初版 | OK |  |
| 302 | `instructionsAndroidHead` | 【Android】 | [Android] | 英語の初版 |  |  |
| 303 | `instructionsAndroid` | このファイルを開き、共有 →「Dance Count」→「使う」（「Dance Count」が出てこない時は、保存してから 2・3 の手順で「ファイルを選ぶ」） | Open this file, tap Share → “Dance Count” → “Use” (if “Dance Count” is not listed, save the file and follow steps 2–3 to “Choose a file”) | 技術語の疑い（ファイル・file）・長さ・英語の初版 | Open this file, tap “Share” → “Dance Count” → “Use” (if “Dance Count” is not listed, save the file and follow steps 2–3 to “Choose a file”) |  |
| 304 | `instructionsPhone` | （スマホで受け取るのが便利です） | (It's easiest on your phone.) | 英語の初版 | (It's easiest to receive this on your phone.) |  |

## エラー・知らせ（仕様 §11）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 305 | `noSoundTitle` | 音が出ていません。 | No sound is playing. | 英語の初版 | OK |  |
| 306 | `noSoundBody` | 本体の消音スイッチを確かめて、もう一度 ▶ を押してください。 | Check the silent switch and press ▶ again. | 依頼・英語の初版 | 製品判断: Make sure your phone isn't on silent, then press ▶ again.（soundHelpSwitch と同じ理由。ja 案「消音（マナーモード）になっていないか確かめて、もう一度 ▶ を押してください。」） |  |
| 307 | `playbackStopped` | 再生が止まりました。もう一度 ▶ を押してください。 | Playback stopped. Press ▶ again. | 依頼・英語の初版 | OK |  |
| 308 | `voiceMissing` | この声はまだ端末に入っていません。インターネットにつないで一度再生してください。 | This voice isn't on your device yet. Connect to the internet and play once. | 依頼・長さ・英語の初版 | This voice isn't on this device yet. Go online and play it once. |  |
| 309 | `wakeLockTip` | 練習中は画面が暗くなることがあります。自動ロックを長めにすると便利です。 | Your screen may dim during practice. A longer Auto-Lock helps. | 長さ・英語の初版 | The screen may dim while you practice. A longer Auto-Lock helps. |  |
| 310 | `wakeLockTipOther` | 練習中は画面が暗くなることがあります。画面が消えるまでの時間を長めにすると便利です。 | Your screen may dim during practice. A longer screen timeout helps. | 長さ・英語の初版 |  |  |
| 311 | `saveFailed` | 保存できませんでした。空き容量を確かめてください。 | Couldn't save. Please check free space. | 依頼・英語の初版 | OK |  |
| 312 | `clearAllFailed` | 消せませんでした。ブラウザの設定からサイトのデータを消すこともできます。 | Couldn't delete. You can also delete the site data in your browser settings. | 技術語の疑い（ブラウザ・データ・browser・data）・長さ・英語の初版 | Couldn't delete. You can also clear site data in your browser settings. |  |
| 313 | `noVoiceHeard` | 声が入っていませんでした。もう一度録音してください。 | We couldn't hear your voice. Please record again. | 依頼・英語の初版 | OK |  |
| 314 | `micDenied` | マイクが使えない設定になっています。 | The microphone is turned off for this app. | 技術語の疑い（マイク・microphone）・英語の初版 | OK |  |
| 315 | `micFailed` | マイクを使えませんでした。ほかのアプリや通話を終えてから、もう一度「録音をはじめる」を押してください。 | The microphone couldn't be used. Close other apps or end the call, then tap “Start recording” again. | 依頼・技術語の疑い（マイク・microphone）・長さ・英語の初版 | Couldn't use the microphone. End any call or close other apps, then tap “Start recording” again. |  |
| 316 | `noRecorder` | このブラウザでは録音できません。Safari（iPhone）か Chrome で開いてください。 | This browser can't record. Open this page in Safari (iPhone) or Chrome. | 技術語の疑い（ブラウザ・browser）・長さ・英語の初版 | OK |  |
| 317 | `shareRefused` | 共有できませんでした。下の「ファイルを保存する」で保存できます。 | Sharing didn't work. You can save it with “Save the file” below. | 英語の初版 | OK |  |
| 318 | `openedInLine` | LINE の中で開いています。Safari か Chrome で開き直すと、受け取った声がずっと残ります。 | This is open inside LINE. Open it in Safari or Chrome so the voice stays on your phone. | 長さ・英語の初版 | You're in LINE. Open this in Safari or Chrome to keep received voices. |  |
| 319 | `fileBroken` | このファイルは読めませんでした。先生に送り直してもらってください。（{file}） | This file couldn't be read. Ask your teacher to send it again. ({file}) | 技術語の疑い（ファイル・file）・長さ・英語の初版 | OK |  |
| 320 | `fileTooLarge` | このファイルは大きすぎて受け取れません。 | This file is too large. | 技術語の疑い（ファイル・file）・英語の初版 | This file is too large to receive. |  |
| 321 | `fileTooNew` | 新しいアプリで作られたファイルです。アプリを更新してください。 | This file was made by a newer version. Please update the app. | 依頼・技術語の疑い（ファイル・file・version）・英語の初版 | This file was made with a newer version of this app. Please update this app. |  |
| 322 | `voiceLimitReached` | 声はすでに {count} あるので、受け取れません。使わない声を削除してから、もう一度選んでください。 | You already have {count} voices. Delete one you don't use, then choose the file again. | 技術語の疑い（file）・長さ・英語の初版 | You already have {count} voices. Delete one you don't use, then try again. |  |
| 323 | `routineUnreadable` | ルーティン「{name}」は読めませんでした。 | Routine “{name}” couldn't be read. | 英語の初版 | OK |  |
| 324 | `routinesUnreadableMore` | ほか {count} 本も読めませんでした。 | {count} more routines couldn't be read. | 英語の初版 | OK |  |
| 325 | `routinesOverLimit` | ルーティンは {max} 本までなので、{count} 本は受け取れません。 | You can keep up to {max} routines, so {count} can't be received. | 英語の初版 | OK |  |

## 公開ページのメタ（index.html の description・og:description。検索・共有の時に出る）

| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |
|---|---|---|---|---|---|---|
| 326 | `pageDescription` | 社交ダンスのカウント（1・2・3／スロー・クイック）を声で鳴らす練習アプリ。無料・登録なし。先生が自分の声を録音して、生徒に配れます。 | Voice counts for ballroom dance (1-2-3, slow-quick). Free, no sign-up. Teachers can record their own voice and share it with students. | 長さ・英語の初版 |  |  |

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
- 公開ページのメタ（index.html の description・og:description。検索・共有の時に出る）: 0
