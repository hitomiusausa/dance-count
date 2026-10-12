# 役割分け（D55〜D57）の台帳 — 2026-10-13

正本は `docs/superpowers/plans/2026-10-13-app-v1-role-split.md`。下は subagent-driven-development の進行台帳（`.superpowers/sdd/2026-10-13-app-v1-role-split/progress.md`）をそのまま保存した物。枝 `agent/auto-counts`（`agent/app-v1` には未マージ・未 push）。

## 数の推移

| 時点 | tests | ui:check |
|---|---|---|
| N0（出発点） | 655 | 678 |
| Task 1（修正便込み・`f8390f1`+`bdfdc70`） | 661 | 755 |
| Task 2（`fb0dcaa`+`040688e`） | 661 | 748 |
| Task 3（`c5b1711`） | 664 | 769 |
| Task 4（`daaedab`） | 675 | 769 |
| Task 5（`bda7ff4`） | 675 | 846 |
| Task 6（`b296e2e`・文書） | 675 | 846 |
| Task 7 + 直し便（`63b2bc5`・`8b5f918`） | 678 | 869 |

（計画の見込み 671／839 との差: Task 1 の修正便で +4 テスト、S1 の長いフィガー名の状態 +7、通しの直し便で +3 テスト・+23 検査。）

## 計画者の発見と Fable の答え

発見 1〜24 の受け入れ／修正は `rulings.md` 末尾「役割分け計画（2026-10-13）の質問への答え（Fable）」§3。使いやすさの通し確認の答えは同「役割分け 使いやすさの通し確認の質問への答え（Fable・2026-10-13）」。

## 進行台帳

Spec: docs/superpowers/specs/2026-10-11-app-v1-design.md + rulings.md (D55/R114, D56/R115-118, D57/R119-122, Fable answers 6b391b0).
Start: plan 2131d48, Fable answers 6b391b0. Branch agent/auto-counts (worktree). Ports for agents: 5185/5184/4185 (5173/5199/5198 forbidden).

## Pre-flight scan
| Pair / task | Shared | Finding |
|---|---|---|
| T1→T2,T5 | messages.ts, Settings/Home/Cover screens, base.css, generated i18n files | Sequential diffs; planner replayed all 8 in order on 3d2f51e with ls-tree match. OK |
| T1→T4→T5 | routes.ts/resolve.ts, resume.ts | T4 adds resolveScreen 3rd arg consumed by T5. Replay-verified. OK |
| T3 | beat-indicator/session/controls | Independent of T4/T5 except Practice screen (T5 later). Replay-verified. OK |
| T1 vs Fable 6b391b0 | S10 copy | Fable changed goHome / receivedVoiceFrom / receivedVoiceNamed wording → Task 1 must apply it (see rulings) |
| T8 vs Fable 6b391b0 | rulings.md end section, po-checklist row 15, device-check 1e(2) | Fable already appended answers; T8 must not duplicate; apply Fable's T8 changes |
| T8 self | ledger path `.superpowers/sdd/role-split/progress.md` | actual workspace is `.superpowers/sdd/2026-10-13-app-v1-role-split/progress.md` |

Ruling: Task 1 applies Fable §2 S10 wording (goHome→「種目を選ぶ」/"Choose a dance"; receivedVoiceFrom/Named→「「使う」で種目を選んで ▶ を押すと、…」) plus check-app-ui L274, smoke-share L205, honorific.test L30, ReceiveScreen comment, regenerate i18n:phrases + copy:sheet — Fable ruled — cost if wrong: copy tweak.
Ruling: Task 8 reads ledger from this workspace path; rulings.md gets only Ruling 114–122 head notes + planner findings, pointing to Fable's existing section instead of re-answering OQs — avoid duplicate answers — cost: doc tidy.
Task 1: dispatched (Opus) BASE=6b391b0
Task 1: implementer DONE_WITH_CONCERNS f8390f1 (657 tests, ui:check 755). Ruling: copy-review sheet S10 'AI 一次案' column stale → fix in Task 8 — doc only — cost: confusing PO row
Task 1 review: spec ✅, quality changes requested — I1 S10 done (replaceRoute) breaks ‹ 表紙 (double tap / lands on U2/S7); M2 alias redirect drops ?ui-state; M3 copy-review stale (→Task 8).
Ruling: ‹ 表紙 on use-root screens (parent S0) must reach the cover in one tap: go back to the nearest `#/` entry in visited (platform historyGo(-n)), else replaceRoute(S0) — Fable §1-1 — cost if wrong: back nav rework.
Task 1 fix round 1: resume implementer (I1 + M2).
Task 1 fix round 1: bdfdc70 (661 tests = plan+4; later task test expectations shift +4; ui:check 755). Concern: visited≠real history drift; future exits to U1/U2 must use exitTo.
Task 1 re-review: Approved (I1, M2 fixed). Parked (Low, pre-existing): replaceRoute+recordVisit double pop when entry two back equals new hash (invalid S5 deep link → U2 redirect) → ‹ 表紙 needs 2 taps. Rare; note for final review.
Task 1: complete (f8390f1, bdfdc70). Counts now: tests 661, ui:check 755. Later task test expectations = plan +4.
Task 2: dispatched (Sonnet) BASE=bdfdc70
Task 2: implementer DONE fb0dcaa (661, ui:check 748). Note: S7 hint orphan 「から。」 at 320.
Task 2 review: Approved. Polish round 1 (resume): orphan から。 override (recordFromMake/editFromMake) + stale base.css comment.
Task 2 polish 040688e: controller read diff (U+2060 after 」 like receiveHelpLine + OVERRIDES; comment fixed). Accepted.
Task 2: complete (fb0dcaa, 040688e). tests 661, ui:check 748.
Task 3: dispatched (Opus) BASE=040688e (expect tests 664, ui:check 769)
Task 3: implementer DONE c5b1711 (664, ui:check 769, smoke:practice lit order OK).
Task 3 review: spec ✅, quality Approved. Parked for final fix dispatch: M1 drop overflow:hidden on .dc-beats (base.css:136); M3 useMemo idleProgram during S5 count-in; N4 Profile alias; N5 blank line RoutinePlayScreen:413. M2 S5 strip switch → device-check line. Ruling: strip centred (was left) + a/& min width → PO-confirm item in Task 8 po-checklist — taste — cost: CSS tweak.
Task 3: complete (c5b1711). tests 664, ui:check 769.
Task 4: dispatched (Sonnet) BASE=c5b1711 (expect tests 675, ui:check 769)
Task 4: implementer DONE_WITH_CONCERNS daaedab (675, ui:check 769). resolve.ts merged by hand around T1 fix round.
Task 4 review: spec ✅, Approved. Parked for final: M1 resolve.ts:30-34 basic redirects drop ?ui-state; N2 comment U1 vs 'S1'; N3 non-verified sorts last.
Task 4: complete (daaedab). tests 675, ui:check 769.
Task 5: dispatched (Opus) BASE=daaedab (expect tests 675, ui:check 839)
Task 5: implementer DONE bda7ff4 (675, ui:check 846 = 839+7 new guard state 'S1 前回あり・長いフィガー'). Extras: .dc-figure-name nowrap; last-practice label ellipsis at 2 lines (U10). Ruling: accept ellipsis on the last-practice cards only (Fable Q3 no-ellipsis applies to S2 name) — U10 binding — PO-confirm in Task 8.
Task 5 review: spec ✅, Approved. Parked for final: L1 F1 row <b> clamp lacks data-ellipsis (base.css:107) → add data-ellipsis like U2.
Task 5: complete (bda7ff4). tests 675, ui:check 846.
Task 6: dispatched (Sonnet) BASE=bda7ff4
Task 6: b296e2e docs-only; controller checked diff (S10 wording, parents, ‹ 表紙 one tap) — accepted without separate reviewer (docs, 44 lines). complete.
Task 7: dispatched (fresh Opus) BASE=b296e2e
Task 7: 63b2bc5 DONE. 3 wrap fixes (F1 names .dc-figure-name+<wbr>, M0 phrased at 320, cover settings line). Gates 675 / ui:check 846 / 5 smokes. OQs 1 scroll carry-over on forward nav; 2 S10 voice+routines mention U2; 3 S9 copy when partial recording; 4 150% zoom ~250px overflow. Note: sim first-launch white 5–10s.
Task 7 OQs → Fable.
Fable 72ba5e2: all 4 adopted (fix list rulings §2 2-1..2-5); white screen = sim artefact, verify on device. Walk fix round (9b): resume Task 7 agent, BASE=72ba5e2.
Walk fix round: 8b5f918 (678 tests, ui:check 869, 5 smokes). Concerns: <300px strip cells 16px (<20 min), S5 lone 3 at 250, device-check 1e created with 1e-2 only.
Walk fix review: spec ✅ Approved. Parked for final: M1 goBack ‹ 表紙 read as forward (cover jumps top; harmless); M2 base.css:587 dead .dc-opt-label rule; N4 check-app-ui comment misplacement; N5 walk doc "4 つ"→3. L3 strip 16px <300 → PO/Fable list (Task 8).
Task 7: complete (63b2bc5, 72ba5e2 Fable, 8b5f918). tests 678, ui:check 869.
Task 8: dispatched (Sonnet) BASE=8b5f918

Task 8: 文書の締め（実機確認表 1c〜1e・po-checklist 15〜16 と PO 確認・HANDOVER §0・台帳・裁定の注記・監修シート S10 の一次案）。コードは触らない。tests 678。

## 最終レビューに回す Parked（Low/Minor）

- T1 再レビュー: replaceRoute + recordVisit の二重 pop（無効な S5 の深いリンク → U2 の redirect）で ‹ 表紙が 2 タップ。まれ。
- T3: M1 `.dc-beats` の overflow:hidden を外す（base.css:136）／M3 S5 のカウントインの間 idleProgram の useMemo／N4 Profile alias／N5 RoutinePlayScreen:413 の空行。
- T4: M1 resolve.ts:30-34 の基本の redirect が ?ui-state を落とす／N2 コメントの U1 と 'S1'／N3 未監修が最後に並ぶ。
- T5: L1 F1 の行の `<b>` の clamp に data-ellipsis（base.css:107）。
- 直し便: M1 goBack の ‹ 表紙が前進と読まれ表紙が上端へ（無害）／M2 base.css:587 の死んだ `.dc-opt-label`／N4 check-app-ui のコメント位置／N5 walk 文書の「4 つ」→ 3／L3 300px 未満の段の丸 16px（20px 未満）。
