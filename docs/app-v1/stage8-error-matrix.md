# 段8 エラー・知らせの全件表（仕様 §11・Ruling 100）

作成: 段8 Task 5（2026-10-12）。正本の文は `src/app/i18n/messages.ts`（鍵の列）。英語は鍵の en（監修シート `stage8-copy-review.md` の「エラー・知らせ」の節）。
読み方: 1 行＝§11 の 1 つの状況。**空欄が残る行は違反**（Ruling 100-1）。「検査」の列の名前は `tools/check-app-ui.js` の状態名（5 周＝375×667・1280×900 の reduced-motion 有無・375×548。加えて U9 と 320 の周）か、スモークの場面。
共通の型（§11）: 何が起きたか 1 文＋次に押すもの。技術用語・コード番号なし（禁止語テスト `test/app/i18n.test.ts`）。枠は `[data-alert]`（1 画面に 1 つ・375 幅で 120px 以下・中の操作は `[data-alert-action]` の 1 つまで＝ui:check の R23）。

| # | 状況（§11） | 鍵 | 出す画面と型 | ボタン | 強制表示の方法 | 検査 | 実機でしか見られない物 |
|---|---|---|---|---|---|---|---|
| 1 | 音が鳴らない（2 秒判定） | `noSoundTitle`＋`noSoundBody` | S2・S5 の上の枠 `[data-alert="no-sound"]` | 「音が出ない時は ›」（→ S11。`[data-alert-action]`） | `?ui-state=no-sound` | ui:check「S2 音が出ない」「S5 音が出ない」・`smoke:practice`（鳴っている時には出ないこと） | マナーモード・音量 0 でなく本当に鳴らない時だけ出るか（§14） |
| 2 | 再生が中断（電話・ロック復帰） | `playbackStopped` | S2・S5 の枠 `[data-alert="stopped"]` | なし（下の ▶。点滅させない） | `?ui-state=stopped`（段8） | ui:check「S2 再生が止まった」「S5 再生が止まった」 | 電話の着信・画面ロックからの復帰（§14） |
| 3 | マイク拒否 | `micDenied`・`micHowTo`・`micHowToIphone`・`micHowToOther`・`micHowToThen` | S8 説明の画面の枠 `[data-alert="mic-denied"]`（言葉の 2 択と「録音をはじめる」は残る。D30） | 「設定の開き方」（枠の中で 3 行に開く） | `?ui-state=mic-denied` | ui:check「S8 マイク拒否」 | OS の許可ダイアログで「許可しない」（Simulator では押せない） |
| 4 | マイクが使えない（通話中・ほかのアプリ・見つからない） | `micFailed` | S8 説明の画面の枠 `[data-alert="mic-failed"]` | なし（同じ「録音をはじめる」） | `?ui-state=mic-failed`（段8） | ui:check「S8 マイクを使えない」 | 通話中に「録音をはじめる」 |
| 5 | マイク非対応 | `noRecorder` | S8 の枠 `[data-alert="no-recorder"]` | なし（左上の「‹ 戻る」） | `?ui-state=no-recorder` | ui:check「S8 非対応」 | 古いブラウザ |
| 6 | 録音が無音・短すぎ | `noVoiceHeard` | S8 語の画面の枠（説明の 1 行と同じ 60px の箱） | なし（同じ「録音する」） | `?ui-state=no-voice` | ui:check「S8 声が入っていない」「S8 録れた語で声が入っていない」・`smoke:voice`（無音・小さすぎの WAV） | — |
| 7 | 保存失敗・容量不足 | `saveFailed` | 発生した画面の枠 `[data-alert="save-failed"]`: S2・S5（声のタイミング）・S4（ルーティン）・S8（語・完成）・S10 確認・S3／S7（削除） | 「閉じる」（段8・Ruling 103-3。閉じると元の案内に戻る。S8・S10 は枠だけ） | `?ui-state=save-failed`（S2・S4・S5・S8・S10。段8）・IndexedDB の delete が投げる（S3・S7） | ui:check「S2 保存できなかった」「S2 保存できなかった・閉じた」「S4 保存できなかった」「S5 保存できなかった」「S8 保存できなかった」「S10 確認・保存できなかった」「S3 更新あり・消せなかった」「S7 更新あり・消せなかった」 | 本当に空き容量が無い端末 |
| 8 | 壊れたファイル・別の種類 | `fileBroken` | S10 選ぶ画面の枠 `[data-alert="broken"]`（ファイル名つき） | なし（同じ「ファイルを選ぶ」） | 壊れたファイルを選ぶ（`test/fixtures/share/broken.txt`） | ui:check「S10 読めない」・`smoke:share` | LINE から保存したファイル |
| 9 | 20MB 超 | `fileTooLarge` | S10 選ぶ画面の枠 `[data-alert="too-large"]` | なし（同じ「ファイルを選ぶ」） | 20MB＋1 バイトのファイルを選ぶ・Android の共有で大きすぎ（SW の印） | ui:check「S10 大きすぎ」・`smoke:pwa`（受け口の大きすぎ） | — |
| 10 | 新しすぎる schemaVersion | `fileTooNew`・`updateApp` | S10 選ぶ画面の枠 `[data-alert="too-new"]` | 「更新する」（再読み込み。選んだファイルは受け口へ戻す） | 新しすぎるファイルを選ぶ（`too-new.txt`） | ui:check「S10 新しすぎ」・`smoke:share` | — |
| 11 | 一部のルーティンが不正 | `routineUnreadable`・`routinesUnreadableMore` | S10 確認の画面の 1 行（`.dc-receive-note`。声と読めたルーティンは受け取る） | 「使う」 | 1 本だけ壊れたファイルを選ぶ（`bundle-one-broken-routine.dancecount.txt`） | ui:check「S10 一部読めない」（段8）・`smoke:share` | — |
| 12 | オフラインで声が未キャッシュ | `voiceMissing` | S2・S5 の枠・S7 の枠（試聴の失敗。段8・Ruling 100-3） `[data-alert="voice-missing"]` | なし（左上の「‹ 戻る」） | `?ui-state=voice-missing`（S2・S5・S7。段8） | ui:check「S2 声が端末に無い」「S5 声が端末に無い」「S7 声が端末に無い」 | 初回の precache が終わる前に機内モード（段7 Ruling 91-2・実機確認表） |
| 13 | 共有シート不可 | `shareSaved` | S9 の結果の 1 行 `.dc-result`（案内の枠は無し。保存に切り替えてファイル名） | なし（「生徒への案内文をコピー」は続く操作） | 共有の無い端末（`navigator.canShare` が偽） | ui:check「S9 共有できない端末」（段8）・`smoke:share`（先生の PC） | PC の Chrome・Safari |
| 14 | 共有を拒まれた（段5） | `shareRefused`・`saveFileAgain` | S9 の結果の 1 行 `.dc-result` | 「ファイルを保存する」（自動では保存しない） | `navigator.share` が NotAllowedError で拒む（段8。ui-state でなく実経路＝計画者の発見） | ui:check「S9 共有を拒まれた」（段8） | Android の Chrome が `.txt` を拒む時（段5 実機確認 A-12） |
| 15 | 声が 20 を超える（段5） | `voiceLimitReached`（段8 で ja を「声はすでに {count} あるので、受け取れません。…」に） | S10 選ぶ画面の枠 `[data-alert="voice-limit"]` | なし（同じ「ファイルを選ぶ」） | 受け取った声 20 本を入れてから声入りのファイルを選ぶ（実経路＝計画者の発見） | ui:check「S10 声が 20」（段8） | — |
| 16 | ルーティンが 200 を超える（段5） | `routinesOverLimit` | S10 確認の画面の 1 行 | 「使う」（入る分だけ） | ルーティン 199 本を入れてから 2 本入りのファイルを選ぶ（実経路＝計画者の発見） | ui:check「S10 ルーティン 200 超」（段8） | — |
| 17 | LINE のアプリ内ブラウザ（段5） | `openedInLine`・`openInSafari` | S10 選ぶ画面の枠 `[data-alert="in-line"]` | 「Safari で開く」（`?openExternalBrowser=1`） | LINE の UA | ui:check「S10 LINE の中」 | LINE で URL を開く（段5 実機確認） |
| 18 | WakeLock 不可 | `wakeLockTip` | S2 の枠 `[data-alert="wake-tip"]`（1 回だけ） | 「閉じる」 | `?ui-state=wakelock-tip` | ui:check「S2 画面が暗くなる案内」 | iOS の Safari（http）・自動ロック（§14） |
| 19 | データを消せなかった（段8 で足す。Ruling 99-4・100-1） | `clearAllFailed` | S13 の枠 `[data-alert="clear-failed"]`（「データを全て消す」の上） | なし（同じ「データを全て消す」） | IndexedDB の clear が投げる | ui:check「S13 消せなかった」（段8）・`smoke:routines`（消せた時の実経路） | — |

## 計画者の注記

- 仕様 §11 の表は **18 行**（Ruling 100-1 の「21 行」は数え違いと見て、表の行のまま 18＋段8 の 1＝19 行にした。行を足し落とした物は無い）。
- 14〜16 は ui-state を足さず**実経路**で強制した（`navigator.share` の拒否・声 20 本の seed・ルーティン 199 本の seed）。Ruling 100-2 は `share-refused`・`voice-limit`・`routines-over-limit` の ui-state を挙げていたが、実経路が安く作れたので、アプリの中に見た目だけの分岐を増やさなかった（計画の Open question）。
- 「何が起きたか 1 文＋次に押すもの」の目視（Ruling 100-4）: 1・2・4・6・7・12・15 は 1 文目が起きたこと・2 文目が次（同じ ▶／「録音をはじめる」／「ファイルを選ぶ」）。3 は 1 文＋「設定の開き方」。5 は 1 文＋「Safari（iPhone）か Chrome で開いてください」。13 は文の中に次（添付できます）。
