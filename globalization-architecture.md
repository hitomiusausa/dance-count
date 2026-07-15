# Global-ready architecture

## Principle

Internationalization is four independent concerns. They must never be inferred from one another.

1. **UI locale** — language used by buttons, guidance, errors, dates, and accessibility text.
2. **Count vocabulary / voice locale** — words spoken on the beat. A user may use an English UI with Japanese counts, or the reverse.
3. **Dance authority and regional convention** — e.g. ISTD, WDSF, NDCA, JDSF, or a studio-specific convention.
4. **Display names** — localized names and aliases for dances, figures, routines, and levels. Stable IDs remain language-neutral.

## Locale format

- Store language tags as canonical BCP 47 strings (`en`, `en-GB`, `ja-JP`, `es`, `zh-Hant-TW`).
- UI locales initially shipped: `en`, `ja-JP`.
- UI fallback: exact locale → base language → English.
- Voice packs may use any structurally valid BCP 47 tag, even when the UI is not translated into that language.
- Legacy `ja` voice packs migrate to `ja-JP`; legacy missing locales migrate to `en`.

## Count vocabulary registry

Each vocabulary defines:

- stable vocabulary ID;
- BCP 47 language tag;
- localized vocabulary name;
- the 12 runtime voice keys (`slow`, `quick`, `one`…`eight`, `and`, `ah`);
- primary recording prompt and optional regional/studio alternatives.

Runtime rhythm events continue to use language-neutral voice keys. Selecting a voice pack changes only the audio mapped to those keys and never changes tick timing.

## Voice pack metadata

Voice packs carry:

- `id`, `name`, `locale`, `vocabularyId`;
- optional speaker and pronunciation notes;
- recordings and per-word timing adjustments;
- schema version and timestamps.

English and Japanese packs use separate IDs and are never overwritten by switching languages.

## Dance content metadata

Future reviewed routine data should add:

- `authority`: `ISTD`, `WDSF`, `NDCA`, `JDSF`, or `studio`;
- `authorityVersion` and `sourceReference`;
- localized `names` keyed by BCP 47 tag;
- stable language-neutral dance, figure, and routine IDs;
- review status and reviewer evidence.

The runtime contract is implemented in `src/v2/routine-provenance.js`. Legacy labels such as “(ISTD)” remain part of the imported display name, but never become a verified authority claim automatically. A routine is eligible for a beginner preset only after its review evidence and any authority claim have been recorded explicitly.

Translation never changes rhythm tokens, figure IDs, or timing.

## Rollout

1. Build the locale and count-vocabulary registries; migrate existing packs without deleting audio.
2. Ship English and Japanese UI resources on the recording surface, then practice and editor surfaces.
3. Add global metadata to reviewed routines before public release.
4. Add languages based on real demand by registering translations and a vocabulary, without changing the audio engine.
5. Localize privacy, microphone consent, terms, and voice-distribution conditions per release region before deployment.
