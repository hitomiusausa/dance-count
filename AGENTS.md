# Dance Count for Ballroom — Agent Working Agreement

## Autonomy

- Proceed without asking for routine, reversible work inside this project: investigation, implementation, local file edits, tests, local audio generation, and browser verification.
- Ask before destructive operations, external publication/deployment, pushing changes, sending data or messages externally, accepting terms, or actions with material billing impact.
- Preserve user work and unrelated changes. Never use destructive Git commands. Do not stage or commit unrelated files.

## Evidence and correctness

- Treat the running application, files on disk, measured audio, and executed tests as evidence. Do not accept labels, reports, screenshots, or green tests alone as proof.
- Verify both implementation and effect through the production-representative path. For UI/audio changes, run automated tests and inspect the named user-facing case in a real browser.
- For timing, derive metronome, voice scheduling, and highlights from the same integer-tick timeline. Do not introduce a second timing calculation.
- For ballroom-dance knowledge, prefer authoritative sources and distinguish verified facts from product decisions or inference.
- Do not infer absence from truncated search output. Search all relevant definitions when claiming that something does not exist.

## Design and implementation

- Identify and name the root cause before changing code. Prefer the smallest structural fix that prevents recurrence.
- Keep one source of truth. Remove synchronization work through structure when possible; prefer references over copies and validation over warnings.
- Translate references into this product's roles and constraints rather than copying their surface appearance.
- Keep the beginner practice path simple. Advanced timing, recording, and editing controls belong behind progressive disclosure.
- Structural changes require a green automated test run. UI/audio changes additionally require direct browser verification of the affected case.
- Preserve machine-readable formats and exact parser tokens unless the migration and tests are updated together.

## Acceptance and reporting

- Re-run gates locally; report measured values and reproducible paths, not only completion claims.
- A fix is complete only after confirming that it is loaded and effective, including cache/version behavior for replaced audio assets.
- Record corrections when an earlier diagnosis was wrong. Do not hide a mistaken premise because the final implementation works.
- Report what changed, why, verification results, and intentionally deferred items when they affect future decisions.

## Project-specific safety rails

- Google Cloud TTS is a development-time asset generator, never a runtime dependency. Never expose credentials in public/browser files.
- Generated voice assets must have measured per-word onset metadata before use in practice playback.
- Do not migrate legacy routines directly. Compile and validate each routine with the v2 rhythm model, and flag ambiguous leading subdivisions for review.
- Do not publish or deploy this project without explicit user approval.

These rules adapt the principles in `fable5-agent-playbook.md` to this project. Facts and direct verification override any playbook heuristic.
