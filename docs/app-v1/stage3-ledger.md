# SDD ledger — plan: docs/superpowers/plans/2026-10-11-app-v1-stage3.md
Spec: docs/superpowers/specs/2026-10-11-app-v1-design.md (approved; stage-3 readings applied with the plan). Rulings 35–49, D10–D12 in docs/app-v1/rulings.md.
Workspace: main checkout on branch agent/app-v1 (PO: stages 2–8 on this branch; untracked フィガー/ only). Start HEAD: 5522194. PO approved plan 2026-10-11 ("いいよ").
Note: .superpowers/sdd/progress.md (flat) is stage 2's old ledger — not ours, left in place.

## Preflight scan
Method: the planner built every task as one commit in a scratch copy (branch plan4), generated this plan's code from those commits, then replayed ONLY the plan text (patches + full files) onto 8917fd6 — all 11 code tasks came out byte-identical to the verified commits; npm test after each: 225/246/253/259/270/270/284/284/288/288/288.
| Pair / task | Produces vs consumes | Finding |
|---|---|---|
| T1→T2/T3 AppStorage getAll/delete, memoryStorage helper | T1 produces, T3 store + tests consume | consistent (replay) |
| T1 APP_VERSION → T2 createRoutine | consistent |
| T2 ids/counts/routine → T3 store, T4 resolve, T7 editor, T9 screen | consistent |
| T3 RoutinesContext/settings fields → T4 App, T5 prefs, T8–T10 screens | consistent |
| T4 replaceRoute/autoplay{kind,id}/UiState confirm-delete → T8 S3, T9 S4, T10 S5 | consistent |
| T5 PracticeOptions 2 forms/figureIndex → T9 previews, T10 S5 | consistent |
| T6 controls.tsx/use-session/FORCED_NOTICE/save-failed → T9, T10 | consistent |
| T7 RoutineEditor (move, changeDance) → T9 screen + drag hook | consistent |
| App.tsx touched T3,T4,T8,T9,T10 (sequential patches) | patches apply in order (replay) |
| messages.ts touched T6,T8,T9,T10 | patches apply in order (replay) |
| base.css touched T8,T9,T10 | patches apply in order (replay) |
| icons.svg/icon-names touched T8,T9 | consistent |
| T8–T10 DOM contract → T11 ui:check/smoke selectors | consistent (planner ran ui:check 93 PASS, smoke OK on the same code) |
| Each task self-consistency | tests vs code verified per commit in scratch | clean |
- Ruling: execute in the main checkout on agent/app-v1, not a worktree — PO decision recorded in HANDOVER (same as stage 2) — if wrong, the branch is discardable; main untouched.
- Ruling: implementers transcribe plan code (git apply blocks / full files) and must stop on a failed apply instead of hand-editing — plan text is replay-verified — if wrong, the implementer reports BLOCKED and I rule.
- Ruling: implementers start/stop their own dev server on 5173 (strictPort) when a step needs a browser; warm the page once before smoke/ui:check (plan finding #12) — if wrong, smoke flakes are re-run once before being treated as failures.

## Tasks
- Task 1: ⚠️ resolved by controller: files byte-identical to verified scratch commit 903f2a3; npm test 225/0 re-run by controller
- Task 1: minor (deferred): store.test inline fakes stub getAll/delete (boilerplate) / storage.run onerror+onabort can both fire (harmless; commit-wait has no unit test, smoke covers) / check-dist readdir not recursive
- Task 1: complete (commits 5522194..3b81ea2, review clean)
- Task 2: ⚠️ resolved by controller: files byte-identical to verified scratch commit 21d54a5 (reviewer's truncated view of counts/figure-names covered by identity)
- Task 2: minor (deferred): normalizeRoutine does not reject duplicate figure ids (S4 renders rows keyed by figure.id — final review to triage) / figure-names sourceAliases[0]! assumes ≥1 alias / checkCounts assumes single-char tokens
- Task 2: complete (commits 3b81ea2..d606bc8, review clean)
- Task 3: Ruling: accept the implementer's Co-Authored-By "Claude Sonnet 5.5" instead of the plan's "Opus 5.5" — it names the model that actually committed (system attribution) — if wrong, cosmetic trailer only
- Task 3: ⚠️ resolved by controller: files byte-identical to verified scratch commit c438d3f (253/0 measured there)
- Task 3: minor (deferred): store.test "failing write…next write" uses a second storage, weaker than its name (plan text) / memory updates before the write, so after a failed write memory and disk differ until reload (by design; S4 shows save-failed — check in Task 9)
- Task 3: complete (commits d606bc8..f096707, review clean)
- Task 4: ⚠️ resolved by controller: files byte-identical to verified scratch commit 85baeec (259/0 there)
- Task 4: minor (deferred): App redirect effect deps [redirectHash] only (intentional) / S4/S5 fall back to HomeScreen until Tasks 9–10 (expected)
- Task 4: complete (commits f096707..f5714a3, review clean)
- Task 5: ⚠️ resolved by controller: files byte-identical to verified scratch commit e1bd32a (270/0 there)
- Task 5: minor (deferred): CompiledProgram.compiled typed unknown (test casts) / rest-destructure _removed idiom
- Task 5: complete (commits f5714a3..f64c044, review clean)
- Task 6: ⚠️ resolved by controller: files byte-identical to verified scratch commit 49add02; implementer ran ui:check 41 PASS + smoke:practice; "くわしく below the fold at 375×667" concern = same as stage 2 (summary 570→618 vs dock 570, measured before stage 3) — not a regression
- Task 6: minor (deferred): isPlaying() reads latest.view which updates only on render (same as before; play/stop double-click before render) / MoreOptions registers a no-op onToggle on S2
- Task 6: complete (commits f64c044..f9f60c8, review clean)
- Task 7: Ruling (Important 1, plan-mandated code: changeDance checks the figure count before closing the open row, so a valid add-draft on an empty routine is committed under the OLD dance and the dance still changes): fix — changeDance closes first; if closing committed a figure (count>0 now) it does NOT change the dance and returns true. Screen side (Task 9) will close the open row before showing the picker and only show it when still 0 figures (carried into the Task 9 dispatch) — if wrong, one extra tap for the teacher.
- Task 7: Ruling (Important 2: commit-then-act paths of moveOpen/duplicateOpen untested with invalid drafts): add tests — cheap and they guard the closing rule.
- Task 7: minor (deferred): undo/redo close (commit) the open row first, so a valid draft is committed then undone (per closing rule; confirm UX in final review) / rename,setLeadInBars,setBpm don't close an open row (screen keeps exclusivity) / setBpm has no range check (screen clamps) / after duplicate the original row stays open
- Task 7: fix round 1/5 (2 addressed, 0 open — changeDance closes first & keeps the dance when a figure was committed; tests for invalid drafts in moveOpen/duplicateOpen; commits 2c454be..a523a6d)
- Task 7: complete (commits f9f60c8..a523a6d, review clean after 1 fix round). NOTE: test counts are plan+3 from here (T8 287, T9 291, T10–T12 291). editor.ts now differs from the plan text (fix round) — later identity checks skip it.
- Task 8: ⚠️ resolved by controller: files byte-identical to verified scratch commit a323cab; 287/0 (plan+3)
- Task 8: minor (deferred): delete ignores remove()'s boolean (no feedback on a failed delete) / confirm-delete effect deps [uiState] only (test-only) / new-routine button disabled at 200 with no explanation
- Task 8: complete (commits a523a6d..2b82084, review clean)
- Task 9: ⚠️ resolved by controller: all files except RoutineEditScreen.tsx byte-identical to scratch efac384; RoutineEditScreen differs only by the Task 7 ruling hunk (diffed)
- Task 9: Ruling (Important 1, plan-mandated: the unmount cleanup's persist() calls replaceRoute for a never-saved routine, so 戻る with a valid un-added first figure saves it but sends the user back into S4 and overwrites the S3 history entry): fix — the leave paths (unmount cleanup and the same-screen hash switch) save WITHOUT replacing the route (persist gets an option to skip the replace; saved flag set) — if wrong, a saved routine opened later from S3 is unaffected.
- Task 9: Ruling (Minor 2 included in the same round: Escape/blur during a started drag leaves pointer capture, so the release click opens the row): set ignoreClick when an interrupt cancels a started drag — one line, a real surprise for the user.
- Task 9: Ruling (Minor 3 included: hash-switch path drops a valid draft of a never-saved routine while the unmount path saves it): make both leave paths behave the same (save the committed draft without replacing) — same fix as Important 1.
- Task 9: minor (deferred / reviewer likely wrong): adjacent grips touching — grips stretch within .dc-row-line inside .dc-row's 4px padding, so the gap is 4+1+4=9px; ui:check U3 measures it in Task 11.
- Task 9: fix round 1/5 (3 addressed, 0 open — leave paths save without replaceRoute; hash-switch saves a committed draft of a never-saved routine; Esc/blur during a started drag no longer opens the row; persist became a function declaration (hoisting checked); commits e8a2cd0..5e3f153)
- Task 9: complete (commits 2b82084..5e3f153, review clean after 1 fix round). RoutineEditScreen.tsx and useReorderDrag.ts now differ from the plan text.
- Task 10: ⚠️ resolved by controller: files byte-identical to scratch d8b0035; implementer measured chip→dock room 13.8px; zero-figure …/play redirect is unit-tested in test/app/router-resolve.test.ts
- Task 10: Ruling (Important 1, plan-mandated: auto-scroll puts the sounding row under the fixed dock on phones — no scroll-margin): fix — `.dc-play-row { scroll-margin-bottom: calc(var(--dockh) + 8px + env(safe-area-inset-bottom)); }` — if wrong, the row stops a little higher than needed.
- Task 10: Ruling (Minor 1 & 2 in the same round): the visibility check subtracts the dock (list must be visible above the dock), and RangeStep handlers read latest.current.range like every other handler — both one-liners on the same code paths.
- Task 10: minor (deferred): no guard if figure count changes while S5 is mounted (router guards it in one tab)
- Task 10: fix round 1/5 (3 addressed, 0 open — scroll-margin above the dock; visibility check uses the dock top; range steps read latest; commits 200deb8..934cbc2)
- Task 10: minor (deferred): .dc-play-row rule split in two in base.css / a display:none dock would read as top 0 (not reachable)
- Task 10: complete (commits 5e3f153..934cbc2, review clean after 1 fix round)
- Task 11: ⚠️ resolved by controller: files byte-identical to scratch 0882716; implementer: ui:check 93 PASS dev + dist, smoke:routines dev+dist OK, smoke:practice OK, 4 mutations caught (mutation 1 also showed U4 initial 4≠5 — expected side effect)
- Task 11: minor (deferred): DC_ONLY matching no state passes with 0 checks (local helper only) / verifiedNames assumes ≥1 verified name per fixture dance
- Task 11: complete (commits 934cbc2..3d1f94b, review clean)
- Task 12: minor (deferred): HANDOVER test-count line wording / 番人 table's ui:check row still lists S1/S2/S3/S6/S7/S11 (now also S4/S5) / device-check uses `npm run dev -- --host` (unchecked)
- Task 12: complete (commits 3d1f94b..6f35387, review clean)
## Final review
- Final review (opus, 5522194..6f35387): With fixes — Important 1 (typing only a name on a new routine then going back: the name input's blur commits during unmount → persist() replaces the route → user lands back in S4; same class as Task 9 Important 1) + Minor 1–6. Reviewer re-ran tests 291, typecheck, build, smoke:routines and ui:check 93 on the built preview.
- Ruling (final fix wave contents): fix Important 1 (route replacement only while mounted; smoke step + device-check row) and Minors 1 (S3 shows save-failed when delete fails), 2 (S5 visibility uses platform viewportHeight), 3 (#/routines/new at 200 routines redirects to S3, unit-tested in resolve), 4 (standard-speed chip uses aria-pressed, not a stray role=radio), 6 (reset ignoreClick on keydown too), and doc nits (HANDOVER 番人 ui:check row lists S3–S5; count line wording) — all small, user-facing or accuracy — if wrong, small revert.
- Ruling (parked): Minor 5 (keepName compares with a recomputed default; cosmetic) — Ruling: code stands, cosmetic only. crypto.randomUUID outside platform — Ruling: code stands; crypto is not a device surface in the boundary rule (and has a fallback). T2 duplicate figure ids — Ruling: fix in stage 5 with import (only app-made UUIDs exist now); carried in HANDOVER.
- Final fix wave: 7 addressed (commits 6f35387..63533e5): name-only + back no longer returns to S4 (route replace only while mounted; pending name committed in cleanup; smoke step + device row #16); S3 delete failure shows save-failed; S5 uses platform viewportHeight; #/routines/new at 200 → S3 (+test); standard-speed chip aria-pressed; ignoreClick reset on keydown; HANDOVER doc nits. Extra: RoutineNameField resyncs only on real name prop change (fixed a mount race that wiped typed text). Scoped re-review (opus): all addressed, no new breakage.
- Final: residual risks for the device check: iOS swipe-back blur timing (row #16); WebKit no-blur path verified by hand only; S3 delete-failure notice verified by code only.
- Stage 3 closed: 292 tests, typecheck ok, build dist OK, timing identical, golden unchanged, ui:check 93 PASS dev+dist, smoke:routines + smoke:practice OK. iPhone device check (docs/app-v1/stage3-device-check.md, 16 rows) pending.

## 追加便（iPhone 実機確認の指摘 D13〜D18）

計画: `docs/superpowers/plans/2026-10-11-app-v1-stage3-followup.md`。裁定: Ruling 50〜53・D13〜D18（`docs/app-v1/rulings.md`）。ブランチ `agent/app-v1`、始点 `88d73cb`（段3の最終）。SDD の台帳は `.superpowers/sdd/2026-10-11-app-v1-stage3-followup/progress.md`。実装は Opus（計画に完全なコードは無く、Ruling の本文が仕様）。審美の選択肢は推奨の既定で作った（「・」区切り・「N件まとめて決定」・常設の行 400・影 0.25・一覧の中に止める・全体の注意 `--ink2`。ひとみうさが見てから調整）。

| Task | 中身 | コミット | Ruling | レビュー | 持ち越した Minor |
|---|---|---|---|---|---|
| F1 | 同じ名前のフィガーは同じカウント（複製して追加／カウントを合わせる／N件まとめて決定）・使える文字を常に表示（D13・D14） | `2c24529` | 50 | 指摘なしで完了。テスト 302 | updateAll 中の moveOpen／duplicateOpen／openRow が全行を確定すること（close() 経由）の単体テストが無い・実機確認表 18 の「2件」は実装者の計算が正しい（Ruling 本文の「3件」は 3 回出てくる場合）・「同じ名前の1件も…なります」が 375px で「す」だけ折れる（文言は PO／Fable）・updateAll 中の行の試聴はその行だけ |
| F2 | つかんだ行が少し浮いて指についてくる（D15） | `33f35b1` | 51 | spec ✅・品質 approved（0 C／0 I／4 M）。テスト 305 | M1 行き先の線が浮いた行の文字の上を通る（**ひとみうさの実機判断**。確認表 20）・M2 開いた行が閉じる時の位置補正に自動の検査が無い（最終レビューの探査 A で手で確認済み）・M3 閉じる描画と次の lift の間に理論上 1 フレームの隙・M4 テストの分け方が Ruling の「4 件」と違う（中身はそろう） |
| F3 | 3拍の注意（ワルツ・VW の行）と小節の途中で終わる注意（全種目・一覧の下）（D16） | `33ef176` | 52 | spec ✅・品質 approved（0 C／0 I／4 M）。テスト 312・ui:check 97 | M2 1280 幅で「S4 小節の注意」の操作数の下限検査が無い・M3 `.dc-row-note .dc-ic` の規則が S4 に閉じていない・M4 台帳の D16 の行（この締めで消化） |
| F4 | はじめの合図は 2 小節（S2 はオンで 2 小節・新しいルーティンの初期値 2）（D17） | `4c80c8f` | （D17 のみ） | spec ✅・品質 approved（0 C／0 I／2 M）。テスト 313 | `smoke-routines.js` 13 行目のコメントが「1小節」のまま・`practiceLeadInBars` の戻り値の型 `0|2` が `LEAD_IN_BARS` と別に手書き |
| F5 | カウントの形を増やす（種目ごとに規則で作る ≤8 個・別グループ・開いた行の主要操作 7→8）（D18） | `01b2cbe` | 53 | spec ✅・品質 approved（0 C／0 I／3 M）。テスト 319・ui:check 97 | `check-app-ui.js` ~418: 形はあるが押されたチップが無い状態を足すと大きく落ちる・FigureForm が描画ごとに countPatterns を作り直す（無視できる）・台帳の D18 の行（この締めで消化） |

F3 の裁定（コントローラー）:
- 実装者の Ruling 52 からの 4 つのずれを採用（行の注意は行の幅いっぱいで 375px に 2 行で収める・全体の注意は 16px の div・「S4 小節の注意」は操作数を固定せず total:5・検査用データは「シャッセ フロム PP」）— レビューが意図は保たれていると確認 — 外れたら CSS／ui:check の手直し。
- 再生の警告（「〜してください」）が行の全文の注意と同時に出て S4 の依頼が 2 つになる場面は許す — 再生の警告は一時的なエラーの状態で、いつもの画面ではない — 外れたら再生の警告の文言を後で短くする。

### 全体レビュー（Opus・`88d73cb..01b2cbe`）

**Ready**（0 Critical／0 Important／4 Minor）。テスト 319・typecheck・build・ui:check 97・両 smoke OK。375 幅の実ブラウザで機能をまたぐ探査（開いた行＋ドラッグの位置補正・同じ名前の行で形をタップ・名前の打ち替え → カウントを合わせる・並べ替えで全文の注意が移る・小節の判定に合図を含めない・描画の重さ）はすべて仕様どおり。`src/engine/` は無変更。

- Ruling（修正便）: M2・M3・M4 と締めの文書を直す — 小さく、利用者に見えるか番人のため — 外れたら小さく戻す。
- Ruling（保留）: **M1** は直さず PO／Fable への問いとして HANDOVER に持ち越す（下）。

### 修正便（`9aa31d0`＋この文書のコミット）

- **M2**: 主ボタンが「複製して追加」の間は、カウントの形をどれも押された印にしない（打った形は捨てるので、色の付いた形と保存される値が食い違わないように）。判定は純粋関数 `pressedPattern(draftCounts, action)`（`src/app/routines/count-patterns.ts`）に出し単体テスト 1 件。smoke の「複製して追加」の場面に「別の形をタップしても複製して追加のまま・押された形 0」を追加（判定を戻すと smoke が落ちることを確認）。ui:check の状態は「複製して追加」を通らないので不変。
- **M4**: `smoke:routines` に 1 本: ウィスクを 3 行にする → 1 行目を開いて形 `1 2 & 3` をタップ →「3件まとめて決定」→ 3 行とも `1 2 & 3` → 「元に戻す」1 回で 3 行とも `1 2 3`。
- **M3**: 仕様 §4 S4 に D15 の一文（つかんだ行は浮いて指についてくる）・D14 の「使える文字：1・2・3・&」の常設の行（「使える記号」の文を置き換え・「・」も除く）・D13（同じ名前は同じカウント）と D16（3拍と小節の注意・止めない）の行を追加。主要操作の期待値を S4＝8（行を開く）・7（くわしく開）に。
- 締め: この節、HANDOVER（§0・§4b・§5・§6）、実機確認表（17〜30 を追加便の再確認として明示・D17 の 2 行・M4 の流れの 1 行・確認表 17 に M2・確認表 20 に F2 M1 の判断を追記）。
- ゲート: テスト **320**・typecheck・build（dist OK）・ui:check **97 PASS**（exit 0）・`smoke:routines`・`smoke:practice` OK（いずれも 5199 番の自前の開発サーバー）。

### PO／Fable への問い（保留 M1 → 2026-10-12 に D22 で決定。下の「PO の決定 D22」）

**同じ名前の判定は保存された名前どうしで比べている**（Ruling 50-1 のとおり。`editor.ts` の `sameName`＝`foldFigureName`）。一方、英語の画面では verified の日本語名を英語名で表示する（`figureDisplayName`）。そのため、日本語で保存した「ウィスク 12&3」が英語の画面で "Whisk" と見えている所へ、先生が "Whisk" を `1 2 3` で足すと普通の「Add」になり、"Whisk" が 2 行・違うカウントで並ぶ（D13 が防ぎたかった見え方）。日本語の画面では起きない。起きるのは言語を切り替えた時か、段5で受け取ったルーティンで日英の名前が混ざる時だけ。
- 案 A: verified 名は用語集の項目（`terminologyKey(danceId, name)` の `englishName`）で比べ、それ以外は今の `foldFigureName`。
- 案 B: このままにして、Ruling 50 の「外れた時の代償」に限界として書き足す。
- 段5（受け取り）の計画までに決めたい。

### Task F6（D19・追加便の後の iPhone の指摘）— 同じ名前の時は複製専用の形

計画は同じ `…-stage3-followup.md` の Task F6（`e205c5d`）。実装は Opus、4 回目の直しは新しい Opus（同じ所で 2 回外したら作り手を替える約束）。

| 便 | コミット | 中身 | テスト／ui:check |
|---|---|---|---|
| 実装 | `60442a6` | 追加の行で同じ名前を打つと、名前の欄のすぐ下に注意・カウントの欄と形は消え、主ボタン「1 2 3 で複製して追加」。編集の行は「カウントを合わせる」。打ったカウントは消さずに残す | 324 |
| 直し 1 | `5452ade` | レビュー I1: 複製の形への切り替えは**名前だけ**で決める（カウントが違うかでは決めない＝打っている欄が消えない）。複製の形になった時、名前の欄にフォーカスがあればボタンを見えている範囲（visualViewport）の上へ動かす。M1 注意は `figureDisplayName`・M3 Ruling 53-2 の追加の行＝6 の訂正・M4 ui:check は「使える文字」を i18n で探す | 329／101 |
| 直し 2 | `e68c854` | シミュレーターで: キーボードが落ち着く前に動かしてボタンが付属の帯の下に残った → visualViewport の resize／scroll のたびに動かし直す。下に固定の帯（▶ 全体を試聴）がキーボードの上に持ち上がってフォームを覆った → 入力中は帯を隠す | |
| 直し 3 | `7a5c9c9` | 入力中かを実際のフォーカスから見直す。WebKit の smoke を追加 | |
| 直し 4 | `d61aeca` | シミュレーターで: 複製の後に帯が隠れたまま戻らず、空いた所をもう一度タップすると ▶ が鳴り出した（iOS は pointerdown → pointerup → click の順で、「指を離すまで待つ」が来ない pointerup を待っていた）→ フォーカスや指の順番で当てるのをやめ、**画面のキーボードが開いている間だけ**帯を隠す（レイアウトの高さ − visualViewport の高さ > 150px＝`lib/keyboard.ts` の `isKeyboardOpen`）。閉じれば resize で戻る（click の後なので指の下に帯は出ない）。PC は隠さない | 336／101 |

- iOS シミュレーター（iPhone 16e・iOS 26.3・ソフトウェアキーボード）での発見は 3 つ: ①複製ボタンがキーボードの付属の帯の下に隠れる ②固定の帯がキーボードに乗ってフォームを覆う ③複製の後に帯が隠れたまま戻らない。①は直し 1・2、②③は直し 4 で解決し、シミュレーターで PASS（キーボードが出ると帯が消え、複製ボタンが見え、押すと増え、キーボードが閉じると帯が戻る）。確かめ方は HANDOVER §8。
- Ruling（直し 1）: 追加の行で複製の形にするのは名前が同じかどうかだけ — カウントが既に同じなら複製と同じ結果 — 外れたら形の規則を小さく直す。
- Ruling（直し 4）: フォーカスや指の順番は当てない。見えている高さでキーボードを判定する — iOS で確実・単純 — 外れたら帯を常に出す形へ戻す。
- 保留: M2（編集の行の注意の位置に自動の検査が無い）・M5（375 幅で名前が語の途中で折れる＝PO の判断。最終レビュー2 M2 で空白の所で折れるように直した）。F7 に小さく持ち越して消化: N1 Ruling 50 D13-2 の訂正の注記・N2 仕様 §4 S4 に帯の隠し方と複製ボタンの見せ方・N3 WebKit の smoke は「入っていない」時だけ飛ばす。
- 再レビュー: すべて対応済み。テスト 336・ui:check 101。

### Task F7（D20・D21・Ruling 54）— 種目のフィガーの一覧・かなとカナは同じ名前

- 計画 `425efdb`・実装 `bfe6b6c`（Opus）。spec ✅・品質 approved（0 C／0 I／5 M）。テスト **347**・ui:check **113**。
- 名前が空の追加の行は、名前の欄の下に「ワルツのフィガー（17）」のように種目の照合済みフィガー全部（`[data-group="figure-names"][data-catalog]`・U5 の上限 20）。タップで名前だけ入り、一覧が消えて同じ所にカウントの欄と形が出る（最後までキーボード無しで足せる）。名前を消すと一覧が戻る。
- かなとカナは同じ名前（D21）: 候補・同じ名前の判定・まとめて決定は `foldFigureName` で畳んで比べる。「選び終えた」の判定だけは綴りで見る（Ruling 54-9）。
- シミュレーター（iPhone 16e）: 一覧の表示・ウィスク → 1 2 & 3 → 追加をキーボード無しで・「うぃす」でウィスク／バックウィスク・奥のチップをタップしてもフォームが見えたまま、を確認。初回は古いキャッシュで文言の鍵がそのまま出た（再読み込みで直る → 実機確認の前に再読み込み）。ハードウェアキーボードの時だけ帯が IME の帯の上に白い隙間つきで浮く（シミュレーターだけ・iPhone では起きない。保留）。
- 保留した Minor: `data-catalog` の例外が figure-names に限られていない・一覧のチップ → 複製の形の自動検査が無い（最終レビュー2 の探査で手で確認）・aria-labelledby と aria-label（読み上げは同じ）。

### 最終レビュー2（Opus・`c374cdb..bfe6b6c`）

**With fixes**（0 Critical／1 Important／5 Minor）。テスト 347・typecheck・build・ui:check 113・両 smoke（WebKit 込み）OK。i18n の日英は同じ鍵・同じ差し込み。375 幅の探査（一覧のチップ → 複製・「うぃすく」への打ち替え → カウントを合わせる・名前を消すと一覧が戻る・長い名前）は仕様どおり。`src/engine/` は無変更。

- **I1**: 画面のキーボードが開いている間に ⠿ でドラッグすると、自動スクロールが止まらない（帯が `display:none` で矩形の上端 0 を下端に使い、指がどこでも下へ流れた。Chromium で 0 → 416px を再現）。
- M1 一覧は 1 行に 1 個ずつで、ワルツ約 914px・タンゴ約 1,069px（Ruling 54-5 の見込み 700〜750px より長い）。M2 長い名前が語の途中で折れ、行頭に「ー」が来る。M3 英語の画面で一覧の "Whisk" をタップすると日本語の「ウィスク」と別の名前になる（保留 M1 が 1 タップで起きる）。M4 全体を鳴らしている間にルーティン名の欄を触ると帯（■ 止める）が隠れる。M5 `FigureForm.tsx` の古いコメント・使わない `REASON_TEXT.sameName`。
- Ruling（修正便2）: I1・M2・M4・M5 と締めの文書 — どれも小さい — 外れたら小さく戻す。
- Ruling（PO へ）: M1（一覧の形）は PO の判断。M3 は PO が **D22** で決めた（下）。

### 修正便2（`d3d4e72`＋この文書のコミット）

- **I1**: 自動スクロールの下端を純粋関数 `autoScrollBottom(dock, visibleBottom)`（`reorder-drag.ts`）に。帯に高さがある時だけ帯の上端（と見えている範囲の下端の小さい方）、隠れている時は `visibleViewport().bottom`。単体テスト 1 件。smoke に 1 本（キーボードの代わりを開いて中ほどの行をつかみ 800ms 止める → スクロールしない）。直しを戻すと smoke が落ちる（scrollY 250 → 650）ことを確認。S5 の同じ形（`RoutinePlayScreen.tsx`）は S5 に帯を隠す仕組みが無いので触らない。
- **M2**: `.dc-chip--name` に `word-break: keep-all; line-break: strict`（空白・「・」・「&」の所で折れる）。`overflow-wrap: anywhere` は空白の無い名前の受け皿として残す。375 幅で 10 種目 × 日英の一覧を計測し、はみ出し 0・ページ幅 375。2 行になるのは日本語でワルツ 2・タンゴ 1・スローフォックス 3 など（すべて語の切れ目）。一覧の高さはワルツ約 944px・タンゴ約 1,099px（2 行の名前がチップ幅いっぱいになるぶん M1 の計測より少し長い）。撮影 `~/.playwright-mcp/stage3-fix2-{waltz,tango,slowfox}-list-375.png`。
- **M4**: 帯を隠すかを純粋関数 `hidesDock(keyboardOpen, playing)`（`lib/keyboard.ts`）に。鳴らしている間（starting 含む）は隠さない。単体テスト 1 件。smoke に 1 本（▶ 全体を試聴 → キーボードの代わり → 帯が残る → ■ 止める → 帯が隠れる）。直しを戻すと smoke が落ちることを確認。
- **M5**: コメントを「2〜3 グループ」に直し、`REASON_TEXT` の鍵の型から `sameName` を外した。
- 締め: この節、HANDOVER（§0・§3・§4b・§5・§6・§8・§9）、実機確認表（40・41 を追加。37 に折れ方と一覧の長さの判断）。
- ゲート（5199 番の自前の開発サーバー）: テスト **349**・typecheck・build（dist OK・1064 files）・ui:check **113 PASS**（exit 0）・`smoke:routines`（WebKit 込み）・`smoke:practice` OK。

### PO の決定 D22（最終レビュー2 M3・保留 M1 の答え）

同じ照合済みフィガーに当たる名前は同じ名前とみなす（日英の対応表で判定。A 案）→ **Task F8 で実装済み（`7ba21f5`。下の節）**。B 案（行に「どのフィガーか」を保存して表示を言語で切り替える）は段5の計画で決める。正本は `rulings.md` の D22。

### Task F8（D22 同じフィガーなら同じ名前・`7ba21f5`）

- `figure-names.ts` に `figureIdentity(danceId, name)`: 同じ種目の照合済みフィガーに当たる名前（日本語の別名・英語名・かなの畳み）はそのフィガーの印（`figure:<種目>:<英語名>`）、当たらない名前は `'text:'`＋`foldFigureName`。同じ種目で 2 つのフィガーが同じ畳んだ名前を持つ時（曖昧）は印を付けず綴りで比べる（今の登録簿には無いことをテストで固定。曖昧の振る舞いは `buildFigureIdentity` に作り物の登録簿を渡して検査）。
- `editor.ts` の `sameName`・`renamed`・`updateAll` の仲間分け（＝複製の形・カウントを合わせる）をすべて `figureIdentity` 経由に（判定は 1 か所）。保存データ・表示（注意は今どおり代表の保存名を `figureDisplayName` で）・`spellingKey`（候補の「選び終えた」）は不変。
- D22 で意味が変わった既存テスト 2 件の期待値を直した（「ナチュラルターン」＝ "Natural Turn"、「ウィスク」＝ "whisk"）。
- テスト 349 → **358**（figure-names 5・editor 4）。smoke:routines に 1 本（英語表示・waltz13 の追加の行で一覧の "Whisk" → "Same name exists: Whisk (1 2 & 3)"・"Add a copy (1 2 & 3)"・カウントの欄なし → 14 行目）。実機確認表に 42。撮影 `~/.playwright-mcp/f8-en-whisk-copy-375.png`。
- ゲート（5199 番の自前の開発サーバー）: テスト 358・typecheck・build（dist OK・1064 files）・ui:check **113 PASS**（exit 0）・`smoke:routines`（WebKit 込み）・`smoke:practice` OK。

### 実機の再確認

`docs/app-v1/stage3-device-check.md` の **17〜42**（追加便ぶん）をひとみうさの iPhone で（先にページを再読み込み）。OK なら段4の詳細計画へ。
