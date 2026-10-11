# Preflight conflict scan: app-v1 stage 1 plan

Plan: `docs/superpowers/plans/2026-10-11-app-v1-stage1.md` (line numbers below refer to it).
Spec: `docs/superpowers/specs/2026-10-11-app-v1-design.md` (§3, §10, §13, §14). Also cross-read: `docs/app-v1/rulings.md` (Ruling 20, 21, 23), master plan.
Method: read-only. Plan code checked against the current tree (`src/v2`, `public`, `tools`, `test/v2`, README, package.json) with grep/sed and a few node one-liners.

Verified facts used below:
- Current tests = 95 (plan baseline). 95 + 33 (golden: 1 coverage + 32 cases) = 128; +2 hygiene = 130; +5 tempo-map = 135; +6 i18n = 141; +6 routes = 147; +2 boundary = 149. All Task step counts agree (L342, 479, 771, 961, 1446, 1637, 1830, 2027, 2170, 2196).
- 32 golden cases: 10 dances x 3 bpm (30 unique names, checked by script) + 2 = 32.
- `src/v2` has exactly 23 top-level `.js` files (hygiene test `>= 23`, L415, passes at Task 2; Task 4 makes 24).
- `public/audio/default-en-female-v1` has 13 files (dist "16 files", L1215/L1217 OK).
- tempo-map code as written puts the four formula lines at 29-32 (L946-949 expectation OK).
- Every one of the 12 audio-engine replacements (L805-914) matches the real source text (lines 3, 7-11, 18-21, 52-62, 68, 74-76, 118-119, 138, 145, 152, 156, 191-192, 198). `compiled` is not used in `scheduleAhead` body, so dropping it from the destructure (L880-885) is safe.
- `dance-timing-audit.js` uses `TICKS_PER_BEAT` only on lines 1, 46, 51, so removing the import (L934) is safe. `timeline-view-model.js` has no tick-to-seconds math (plan finding 1 is correct).
- `output/all-dance-timing-audit.json` is tracked (the `git checkout --` restores in Tasks 1/2/3/5/11 work). `scope.dances` exists (=10), so the Task 1 Step 4 mutation is valid.
- Only one `?v=` import (audio-engine.js:3) and two `no-store` (voice-pack-loader.js:10,20) exist, as the plan says.
- `npm start`, "Documents/Playground", the `public/voice-calibration.html` URL and "## テスト" all exist in README as Task 11 assumes.

## Table A: task pairs sharing a file or interface

| X | Y | X produces vs Y consumes | Finding |
|---|---|---|---|
| T1 | T2 | T1: `test/v2/engine-schedule-harness.js`, `capture-engine-schedule.js`, `engine-schedule.test.js`, `fixtures/engine-schedule-golden.json`, `tools/compare-timing-audit.js`, script `timing:compare`, `output/timing-audit-before.json`. T2: `git mv test/v2 test/engine` (fixtures dir moves with it), `sed src/v2/ -> src/engine/` over `test/engine/*.js` and `tools/*.js` (rewrites the harness imports L193-195, L294, L312 and the compare tool is unaffected), package.json `test` glob (L380) | consistent |
| T1 | T2 | package.json: T1 adds `timing:compare` (L165-168); T2 rewrites only the `test` line (L380). Real line is `"test": "node --test test/v2/*.test.js",` so the sed matches | consistent |
| T1 | T3, T5, T11 | `npm run timing:compare` + baseline file reused at L557, L957, L2164 | consistent |
| T1 | T5 | Golden (33 tests) is the guard for the aggregation (L800, L966). `PracticeAudioEngine#start/scheduleAhead/frame` API used by harness (L261-265) is unchanged by T5 (additive `tempo` param only) | consistent |
| T1 | T6 | T6 rewrites whole package.json (L1011-1047); keeps `timing:compare` as last script and `test` = engine glob | consistent |
| T2 | T3 | T2 sed on `public/*.html` (L378) then T3 `git mv public legacy` (L510); T2 commit adds `public` (L488). T3 sed on `legacy/*.html` for `./audio/default-en-female-v1/` (L529) matches the 4 real lines (practice:502, routine-editor:725, voice-calibration:52, six-comparison:28, last uses double quotes, handled) | consistent |
| T2 | T3 | `test/engine/ui-assets.test.js`: T2 fixes regex `src\/v2\/` (L379), T3 rewrites `'public/` -> `'legacy/` (L543). Real file uses `path.join(root, 'public/assets/...')` (6 hits) so both seds hit; grep L548 finds no leftover (only default-en-female paths remain in tools) | consistent |
| T2 | T3 | tools: T2 `src/v2/` -> `src/engine/`; T3 output dirs + `check-ui-accessibility.js:4` default URL (L544-546). The real strings match the seds ('public/audio/six-candidates', 'public/audio/subdivision-review', `http://localhost:4173/public/`). `measure-voice-onsets`, `generate-google-voices`, `audit-all-dance-timing` and `render-subdivision` pack-dir reads keep `public/audio/default-en-female-v1`, which is exactly what T3 Interfaces says (L505) | consistent |
| T2 | T4 | Hygiene test `files.length >= 23` (L415) vs T4 adding `tempo-map.js` (24th file) | consistent (>=) |
| T2 | T5 | T2 removes `?v=` from audio-engine.js line 3 (L451-458); T5 Step 2.1 import block (L806-814) already shows the post-T2 line | consistent |
| T2 | T5 | `loadVoicePack(...fetchImpl)` unchanged by T5 | consistent |
| T2 | T6 | `test` script: T2 sets `node --test test/engine/*.test.js`; T6 file L1023 identical | consistent |
| T2 | T7 | T7 replaces `test` line (L1269-1271) with engine + app globs; matches T6 line shape incl. trailing comma | consistent |
| T3 | T6 | `index.html`: T3 interim redirect (L547) then T6 full replace (L1098). `publicDir` = `public/` holds only audio after T3, so Vite copies 13 audio files and no HTML (check-dist `.html$` rule L1179 relies on this) | consistent |
| T3 | T6 | `npm run legacy` (T6 L1024) replaces the ad-hoc `python3 -m http.server 4173` of T3 Step 5 (L569, explicitly flagged) | consistent |
| T3 | T10 | Smoke legacy block: `LEGACY_URL=.../legacy/`, `#play` (exists, practice.html:149), response URL `/public/audio/default-en-female-v1/` (T3 path) , 13 x 200 | consistent |
| T3 | T11 | README legacy URL (L2154) = T3 layout | consistent |
| T4 | T5 | T4 exports `constantTempo(bpm)` with `tickToMs/msToTick/tickToSeconds/secondsToTick`; T5 consumes `constantTempo` + `tickToSeconds`, `tickToMs`, `secondsToTick` (L813, L829, L845, L898, L914, L928, L936-937). Operation order of `tickToSeconds` (`tick/960*60/bpm`, L712) equals the engine's old expression | consistent |
| T4 | T5 | T5 `grep` expects tempo-map lines 29-32 (L946-949); actual positions 29-32 | consistent |
| T4 | T5 | T5 default param `tempo = constantTempo(bpm)` (L795, L827, L843, L857) vs T4 error text `BPM must be greater than zero` (L706) = old text | consistent, but see Table C-3 (evaluation order / Infinity) |
| T5 | T11 | Same grep (L943 vs L2165) | consistent |
| T6 | T7 | tsconfig `include ["src/app","test/app",...]` (L1093) + `allowImportingTsExtensions`/`erasableSyntaxOnly` (L1086-1087) vs T7/T8/T9 test files importing `../../src/app/...ts` and `.js` engine files (`allowJs`) | consistent (`test/app` absent until T7 is harmless) |
| T6 | T10 | T6 temp `App.tsx` exports `App`; `main.tsx` imports `{ App } from './App.tsx'` (L1159); T10 replaces whole file with `export function App` (L2002). `base.css` classes used by T10 (`dc-shell, dc-screen, dc-appbar, dc-appname, dc-appsub, dc-heading, dc-utility, dc-tabs, dc-tab`) are all defined (L1131-1142) | consistent |
| T6 | T10, T11 | `npm run build` + check-dist => "dist OK: 16 files" at L1215, L2027, L2174 | consistent |
| T7 | T10 | T10 consumes `createAppTranslator, resolveAppLocale, AppLocale, AppTranslator` (index.ts L1415-1435 exports all four). Message keys used by T10 (`tabPractice, tabRoutines, tabSettings, navLabel, appName, appSubtitle, switchLanguage, chooseDance, routinesTitle, routinesEmpty, settingsTitle`) all exist in both locales (L1352-1379). Smoke strings (L2059-2060) equal the dictionary | consistent |
| T7 | T10 | `settingsLanguage` key is defined (L1364, L1378) but no screen uses it | CONFLICT (minor, dead key vs spec §3 L121 "S6 にも同じ項目"; see Table C-9) |
| T8 | T10 | T10 consumes `parseHash, buildHash, showsTabs, tabOf, Route, ScreenId, TabId` (L1866, L1894, L1988); T8 exports all (L1547-1626) | consistent |
| T8 | T10 | `TabBar` TABS hard-codes tab -> root screen (L1897-1901) while `SCREENS[*].tab` (T8) already encodes tab membership | consistent in output, duplicated mapping (Table C-7) |
| T9 | T10 | T10 consumes `readHash, onHashChange, deviceLanguages` (L1865, L1987); T9 exports `readHash`, `onHashChange`, `setHash`, `deviceLanguages` with those signatures (L1725-1751) | consistent |
| T9 | T10 | Boundary test (T9) scans every T10 file (stated L2028). Scanned T10 code has no `window/navigator/storage/location/history` followed by `.`/`[` | consistent |
| T8 | T9 | Boundary test: `routes.ts` mentions `window` only in a `//` comment (L1546), which the test skips | consistent |
| T7 | T9 | `resolveAppLocale(languages: readonly string[])` (L1418) vs `deviceLanguages(): readonly string[]` (L1748) | consistent |
| T10 | T11 | `git status --short` must show only `フィガー/` (L2166-2177). T10 commits the 8 png files it generates (L2126); `dist/` ignored (L1051); restored audit JSON | consistent |
| spec §10/§3 | T10 | Tab bar layout at 1280: Ruling 21 + master L19 + spec §5 size table put the tab bar at the top from 1024px; `.dc-tabs` is `position: fixed; bottom: 0` at all widths (L1139) and T10 Step 6 expects bottom tabs at 1280 (L2121) | CONFLICT (see ruling 1) |

## Table B: each task against itself

| Task | Self-consistent? | Finding |
|---|---|---|
| 1 | yes | Test count 95 -> 128 (L342) matches 33 new tests. Files list says `test/v2/...` and Task 2 moves them (L359). Step 4 mutation `j.scope.dances=11` valid. Step 6 expects ENOENT: top-level `await readFile` of the missing golden raises it. Step 7 "wrote 32 cases" matches 30 unique + 2. Commit (L350) adds every created file. Minor: `const { generatedAt, ...rest }` leaves `generatedAt` unused (L154). |
| 2 | yes | 128 -> 130 (L479). Step 2 sed list covers package.json `test` (real text has no `src/v2/`, handled by the dedicated sed at L380). Hygiene test #1 expected failure text names audio-engine.js (L443) and #2 the `{"cache":"no-store"}` (L444): both match real code. `git diff --stat` expectation (L468): `audio-engine.js | 2 +-`, `voice-pack-loader.js | 4 ++--` correct (1 line + 2 lines). |
| 3 | yes | Counts unchanged (130, L561). `ls` expectation (L517-523) matches real `public` listing (7 html + assets + audio). Step 2 expected 4 hits in alphabetical order (L534-537) correct. Step 3 grep (L548) expected empty: confirmed no other `public/` refs in test/tools/index.html apart from default-en-female paths. Step 5 uses `python3 -m http.server`, valid because `start` still exists until Task 6. |
| 4 | yes | 5 tests (a, b, b2, c, invalid) = pass 5 (L764) and 135 (L771). Hand-checked tests b/b2/c against the beatMap code (tickToMs/msToTick incl. extrapolation, equality at beat times, last beat) all hold. `constantTempo(undefined)` throws via `!(bpm > 0)`; Infinity via isFinite (L706). Note L755 (pre-first-beat extrapolation uses the FIRST interval) differs from Ruling 20 wording (last interval) - flagged as ruling 3. |
| 5 | yes | Step 1 "pass 33" matches Task 1 (33 tests). "12 replacements, each once" verified against source. Step 4 expected grep output (4 lines) matches tempo-map positions and the remaining engine code after the edits (all 8 old expressions replaced: audio-engine 10/20/68/145/198, rhythm-compiler 129, dance-timing-audit 46/51). Step 5: 135 / 135 right. Plan keeps `eventOccurrenceTime` (uses `eventTimeSeconds`) with no `tempo` param. Test `eventOccurrenceTime = 2010.25` and `eventTimeSeconds = 11.25` recomputed by hand: still exact under the new operation order. |
| 6 | yes, one wording issue | `engines`, scripts, tsconfig, vite config consistent with each other. Step 1 `npm ls` ordering alphabetical OK. L1009 says `test` is "engine only during stage 1" but Task 7 adds `test/app` inside stage 1 (L1269): wording stale, harmless. `start` script removed here; README still says `npm start` until Task 11 and HANDOFF.md:232,243 and `tools/check-ui-accessibility.js:11` say `npm start` forever (stale command, Table C-13). Step 8 expects 135 (no new tests). |
| 7 | yes | 6 tests -> 141 (L1446). `findForbiddenWords` samples vs implementation: all banned samples hit (JP substring, EN `\b`), lookalikes (Important, Synchronised, Count-in, Lead-in) pass. Spec §6 U14 table words all present. `danceName('slowfox','en')`='Slow Foxtrot', `('waltz','ja-JP')`='ワルツ' match `DANCE_NAMES`. |
| 8 | yes | 6 tests -> 147 (L1637). Round trip + fallback cases traced through `parseHash`/`buildHash` by hand (S1 `#/`, S4 new vs edit, `#/practice/%E3%81%82`, `#/practice/<script>`, `#/routines/x/delete`, `garbage`, ``): all as the test expects. Sorted tab list `['S1','S12','S13','S3','S6','S7']` is correct lexical order. Test 6 title "each screen belongs to exactly one tab" checks only 5 of 13 screens (Table C-5). |
| 9 | yes | Step 1 expected (pass 1, fail 1) valid: boundary test passes with no offender, files test fails. 2 tests -> 149 (L1830). Interfaces list matches code. `locale.ts` and `hash.ts` are described "中身あり" but have no unit test. |
| 10 | yes | Files/commit list complete; produced png names (4 for s1 + 4 for s6, L2070, L2075) equal the 8 in the commit (L2126). Smoke selectors exist in the markup (`[data-nav] a`, `[data-screen]`, `h2` in S1, `[data-utility]`). Step 4 count 149 unchanged (no tests added). The 1280 screenshot expectation (bottom tab bar, L2121) conflicts with Ruling 21 (ruling 1). |
| 11 | yes | Step 2 numbers 149 / 16 files / `other-timing-math=1` consistent with earlier tasks; `$?` after `grep -v` pipeline is 1 when nothing is left, as claimed. Step 4 says `timing:compare` ran "計4回 (Task 2・3・5・11)" but Task 2 runs it twice (L391, L475) and Task 1 once more (L174): 6 runs in all; spec §14 only requires the two (Task 2, Task 5). Wording only. |

## Table C: plan-mandated content a reviewer would treat as a defect

| # | Where | Defect | Severity |
|---|---|---|---|
| C-1 | T4 test (a), L610-626 | Test claims "bit for bit vs pre-move engine" but re-types the same expressions the implementation uses (`tick / TICKS_PER_BEAT * 60 / bpm`, L615, L617, L623). It is a tautology against the code, not against the old engine; the real proof is the Task 1 golden. Duplicated formula blocks (also repeated in `tools/audit-all-dance-timing.js`, L939 intentional). | low |
| C-2 | T5, L927-929 and L795 | `eventTimeSeconds` and `eventOccurrenceTime` hard-wire `constantTempo(bpm)` and take no `tempo`, so a beat map injected through `start({tempo})` is bypassed by these exports. Ruling 20 wants "the same TempoMap" everywhere. Plan justifies it (not on any playback path), but it leaves a second, non-injectable entry to tick-to-time. | medium |
| C-3 | T5, L843, L857, L827 | Default-parameter `tempo = constantTempo(bpm)` is evaluated before the body: (a) `start({bpm: 0})` now throws before `this.stop()` and before the "Voice pack is not loaded" check (old order: stop, voice-pack check, range check, then NaN times); (b) `patternDurationSeconds(0, 0)` now reports the BPM error, not the duration error; (c) `bpm = Infinity` used to be accepted and now throws (`Number.isFinite`, L706). Contradicts Global Constraint L15 "無改変" / Review Focus 2 "behaviour unchanged". Not covered by the golden (valid inputs only). | low-medium |
| C-4 | T9 test, L1672 | Boundary regex needs `.` or `[` right after the name: `typeof navigator === 'undefined'`, `const w = window;`, `globalThis.x`-less forms, `self`, `document.defaultView`, `import.meta.env`, `addEventListener(` bare calls all pass undetected. Only `.ts/.tsx` under `src/app` scanned. Spec §10 says "lint で禁止"; the test is a grep substitute with false negatives. | medium |
| C-5 | T8 test 6, L1529-1535 | Title says every screen is in exactly one tab; asserts 5 of 13 screens and cannot fail for the 8 others. | low |
| C-6 | T9/T10 | `hash.ts` (`setHash` replace branch, `onHashChange` unsubscribe) and `locale.ts` fallback branch (`navigator.languages` empty) have no test; `setHash` is not used by any screen in stage 1. Review Focus 5 (L64) claims "navigator.languages が空" is covered by Task 7 tests but those only exercise `resolveAppLocale([])`, not the adapter. | low-medium |
| C-7 | T10 L1897-1901, L1996-2000, L1930 | Tab -> root screen mapping duplicated in `TabBar.tsx` and `SCREENS[*].tab`/`path`; `HomeScreen` re-derives the "other" locale instead of using `APP_LOCALES`. AGENTS.md: keep one source of truth. | low |
| C-8 | T6 L1102 | `<html lang="ja">` static; `lang={locale}` is only set on `.dc-shell` (L2010), so the document language stays `ja` for English users (screen readers). `document` is not banned so the fix would be allowed. | low |
| C-9 | T7 L1364/1378, T10 L1964-1976 | `settingsLanguage` is a dead key; spec §3 L121 says S6 also has the language item, plan puts it only on S1 (L2040 "言語の切替は段1では画面上だけ"). `danceName` is also unused by any stage-1 screen (tested only). | low |
| C-10 | T10 L1903, spec §3 L103 | Spec: tabs are "アイコン＋文字". Plan: text only (icons in stage 2, master L115). Declared deviation, fine for stage 1 but no test fails if icons are never added. | info |
| C-11 | T10 smoke L2094-2095 | `routine-editor.html` visit only waits 1000 ms and relies on console-error capture; no assertion that the page rendered. `waitForTimeout` sleeps. | low |
| C-12 | T2 hygiene test #1, L418 | Detects only `from '...'` static imports; dynamic `import('...?v=')` and bare `import '...'` slip; non-recursive (`src/engine/data` not scanned). | low |
| C-13 | T6 L1019-1036 | `start` removed; `npm start` still referenced in README until T11 (L11), `HANDOFF.md:232,243` and `tools/check-ui-accessibility.js:11` (never updated by the plan). | low |
| C-14 | T5 L939, L941-950 / Global L18 | "tick<->時刻の計算は tempo-map.js だけ" but `tools/audit-all-dance-timing.js` (`/ 960 * 60_000 / bpm`) and `tools/render-subdivision-audio-review.js` (`60 / bpm / 960`) keep their own formula; the verifying grep (L943, L2165) scans `src/engine` only. First is a deliberate independent check, second is dev-only; both are literal second time calculations (AGENTS.md "Do not introduce a second timing calculation"). | medium (needs explicit ratification, ruling 4) |
| C-15 | T4 L757 | `constantTempo('84')` accepted and stored as string in `tempo.bpm` (JSDoc says number). Documented as compat. | info |
| C-16 | T10 spec §6 U-table | No `window/navigator` access found outside `src/app/platform/` in any plan code; `document` only in `main.tsx` (allowed). | none (checked) |

## Conflicts needing a ruling

1. **Tab bar position at >= 1024px** (plan L1139, L2121 vs Ruling 21, spec §5 size table row "下タブ", master L19). Plan renders a fixed bottom bar at every width and its Step 6 pass criterion expects bottom tabs at 1280x900. Ruling needed: accept bottom-only for stage 1 and move the top-bar CSS to stage 2 (add to master carry-over table, which currently lists icons but not this), or implement the 1024px top bar in Task 6 `base.css`.
2. **Ruling 20 / spec §10 step 5 names `timeline-view-model.js` for aggregation; plan aggregates `rhythm-compiler.js` and `dance-timing-audit.js` instead** (plan L49, L788, L915-937; spec §10 L478, Ruling 20 item 2). Plan is factually right (no tick-to-seconds in timeline-view-model). Ruling needed to amend the spec/ruling text so the reviewer does not count it as a miss; also decide whether `eventTimeSeconds/eventOccurrenceTime` must accept an injected `tempo` (C-2).
3. **beatMap extrapolation before the first beat** (plan L755 uses the first interval; Ruling 20 L252 and spec §10 L494 say "範囲外は最後の拍間隔で外挿"). Plan itself asks Fable to confirm. Ruling needed (affects Task 4 test b2 L639-645, `tickToMs(-960) === 500`).
4. **Remaining independent tick-to-time formulas outside `tempo-map.js`** (plan L939 vs Global Constraint L18 and AGENTS.md): `tools/audit-all-dance-timing.js` and `tools/render-subdivision-audio-review.js`. Ruling needed: ratify as deliberate (check/dev-only) and widen the verification grep to say so, or route them through `constantTempo`.
5. **Behaviour drift from the "無改変" rule in Task 5** (C-3, plan L843/L857/L827 vs L15 and Review Focus 2): argument-validation order and Infinity BPM change. Ruling needed: accept (document) or make the defaults lazy (`tempo ??= constantTempo(bpm)` inside the body, after `stop()`).

Non-blocking notes (no ruling needed unless the PO wants it): C-4 (weak boundary regex), C-6 (untested platform adapters), C-9 (S6 language item missing), C-13 (stale `npm start` references), `?ui-state=no-sound` (Ruling 23) is dropped by `parseHash` and `Route` has no query field (plan L1583-1585, L1513), stage 2 will have to add it.

Count: 5 conflicts needing a ruling; 1 additional minor cross-task conflict (dead `settingsLanguage` key, Table A) folded into C-9.
