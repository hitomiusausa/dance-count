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
