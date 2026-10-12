import test from 'node:test';
import assert from 'node:assert/strict';
import { exportRecordedVoicePack } from '../../../src/engine/recorded-voice-pack.js';
import { buildBundle, exportVoiceForBundle, parseBundle } from '../../../src/app/share/bundle.ts';
import { BUNDLE_ROUTINES_MAX } from '../../../src/app/share/limits.ts';
import { VOICE_LIMITS, withWord, type VoicePackRecord } from '../../../src/app/voices/store.ts';
import { packFixture, wordFixture } from '../helpers/voice-fixtures.ts';
import { waltzRoutine } from '../helpers/share-fixtures.ts';

const NOW = '2026-10-12T09:00:00.000Z';
const ok = (text: string) => {
  const parsed = parseBundle(text);
  if (!parsed.ok) throw new Error(`expected ok, got ${parsed.problem}`);
  return parsed;
};
const problem = (text: string) => { const parsed = parseBundle(text); return parsed.ok ? 'ok' : parsed.problem; };
async function voiceBundle(pack: VoicePackRecord = packFixture('ja-JP', 12), extra: Record<string, unknown> = {}) {
  const bundle = JSON.parse(buildBundle({ distributorName: '山田', voice: await exportVoiceForBundle(pack), routines: [], now: NOW }));
  return JSON.stringify({ ...bundle, ...extra });
}

test('a bundle round-trips: the voice words, the routines, the name and the consent come back (Ruling 80-1)', async () => {
  const pack = packFixture('ja-JP', 12);
  const routines = [waltzRoutine('r-11111111'), waltzRoutine('r-22222222', 'タンゴ前の確認')];
  const text = buildBundle({ distributorName: '  山田  ', voice: await exportVoiceForBundle(pack), routines, now: NOW });
  const parsed = ok(text);
  assert.equal(parsed.legacy, false);
  assert.deepEqual(parsed.distributor, { name: '山田' });
  assert.deepEqual(parsed.consent, { voiceDistribution: true, consentedAt: NOW });
  assert.equal(parsed.voice?.pack.id, 'user-recorded-ja-v1');
  assert.equal(parsed.voice?.pack.locale, 'ja-JP');
  assert.equal(parsed.voice?.sourceUpdatedAt, pack.updatedAt);
  assert.equal(Object.keys(parsed.voice!.pack.words).length, 12);
  assert.equal(parsed.voice!.pack.words.slow!.blob.size, pack.words.slow!.blob.size);
  assert.equal(parsed.voice!.pack.words.slow!.onsetMs, pack.words.slow!.onsetMs);
  assert.deepEqual(parsed.routines, routines);
  assert.deepEqual(parsed.rejected, []);
  assert.equal(JSON.parse(text).createdWith.app, 'dance-count');
});

test('a received routine is shared as the sharer\'s own: no receivedFrom, user-created (Ruling 80-2)', () => {
  const base = waltzRoutine('r-33333333');
  const received = { ...base, source: 'received' as const, provenance: { ...base.provenance, sourceKind: 'received' as const },
    receivedFrom: { distributor: '佐藤', receivedAt: NOW, sourceId: 'r-teacher-0001' } };
  const shared = JSON.parse(buildBundle({ distributorName: '山田', voice: null, routines: [received], now: NOW })).routines[0];
  assert.equal(shared.source, 'user-created');
  assert.equal(shared.provenance.sourceKind, 'user-created');
  assert.equal('receivedFrom' in shared, false);
  assert.equal('consent' in JSON.parse(buildBundle({ distributorName: '山田', voice: null, routines: [received], now: NOW })), false);
});

test('only a complete recorded voice can go into a file, and a file needs a name and something in it (D37)', async () => {
  await assert.rejects(exportVoiceForBundle({ ...packFixture('ja-JP', 12), origin: 'received', distributor: { name: '佐藤' } }));
  await assert.rejects(exportVoiceForBundle(packFixture('en', 11)));
  assert.throws(() => buildBundle({ distributorName: '   ', voice: null, routines: [waltzRoutine('r-11111111')], now: NOW }));
  assert.throws(() => buildBundle({ distributorName: '山田', voice: null, routines: [], now: NOW }));
});

test('a newer schemaVersion is "too new"; a wrong one, broken JSON, an unknown type or a non-object is "broken" (Ruling 80-5)', async () => {
  const good = JSON.parse(await voiceBundle());
  assert.equal(problem(JSON.stringify({ ...good, schemaVersion: 2 })), 'too-new');
  for (const schemaVersion of [0, '1', 1.5, null]) assert.equal(problem(JSON.stringify({ ...good, schemaVersion })), 'broken', String(schemaVersion));
  for (const text of ['{"type":"x"', '', 'null', '[]', '"text"', JSON.stringify({ ...good, type: 'x' })]) assert.equal(problem(text), 'broken', text.slice(0, 20));
});

test('an old single voice file from the old recorder screen is read as a voice-only bundle (Ruling 80-5-2)', async () => {
  const legacy = await exportRecordedVoicePack(packFixture('en', 12, { name: 'My recorded voice' }));
  const parsed = ok(legacy);
  assert.equal(parsed.legacy, true);
  assert.equal(parsed.distributor, null);
  assert.equal(parsed.consent, null);
  assert.equal(parsed.voice?.pack.name, 'My recorded voice');
  assert.deepEqual(parsed.routines, []);
});

test('a voice without consent, without a name, half-recorded or with a word over 2MB is "broken" (Ruling 80-5-3)', async () => {
  assert.equal(problem(await voiceBundle(undefined, { consent: undefined })), 'broken');
  assert.equal(problem(await voiceBundle(undefined, { consent: { voiceDistribution: false } })), 'broken');
  assert.equal(problem(await voiceBundle(undefined, { distributor: { name: ' ' } })), 'broken');
  const half = JSON.parse(await voiceBundle());
  delete half.voicePack.words.ah;
  assert.equal(problem(JSON.stringify(half)), 'broken');
  const big = { ...wordFixture(), blob: new Blob([new Uint8Array(VOICE_LIMITS.wordBytes + 1)], { type: 'audio/wav' }) };
  const bigPack = withWord(packFixture('en', 12), 'slow', big, NOW);
  const bigText = JSON.stringify({ ...JSON.parse(await voiceBundle()), voicePack: JSON.parse(await exportRecordedVoicePack(bigPack)) });
  assert.equal(problem(bigText), 'broken');
});

test('a routine that cannot be read is listed by name and the rest is still received (spec §7・§11)', () => {
  const good = waltzRoutine('r-11111111');
  const bundle = JSON.parse(buildBundle({ distributorName: '山田', voice: null, routines: [good], now: NOW }));
  bundle.routines.push({ ...good, id: 'r-22222222', name: 'こわれたルーティン', figures: [{ id: 'f-22222222', name: 'x', counts: '12a3' }] });
  bundle.routines.push({ id: 'r-33333333', figures: 'x' });
  const parsed = ok(JSON.stringify(bundle));
  assert.deepEqual(parsed.routines.map(routine => routine.id), ['r-11111111']);
  assert.deepEqual(parsed.rejected, [{ name: 'こわれたルーティン' }, { name: null }]);
});

test('received names lose invisible control and direction characters; a name left empty is unreadable (stage-5 review)', async () => {
  const good = waltzRoutine('r-11111111', '\u202eワルツ\u202c');
  const bundle = JSON.parse(buildBundle({ distributorName: '山田', voice: null, routines: [good], now: NOW }));
  bundle.distributor.name = '\u2066山田\u2069\u0007';
  bundle.routines[0].figures[0].name = 'ナチュラル\u200fターン';
  bundle.routines.push({ ...good, id: 'r-22222222', name: '\u202e\n' });
  const parsed = ok(JSON.stringify(bundle));
  assert.deepEqual(parsed.distributor, { name: '山田' });
  assert.deepEqual(parsed.routines.map(routine => routine.name), ['ワルツ']);
  assert.equal(parsed.routines[0].figures[0].name, 'ナチュラルターン');
  assert.deepEqual(parsed.rejected, [{ name: null }]);
  assert.equal(problem(JSON.stringify({ ...bundle, distributor: { name: '\u202e' } })), 'broken');
  const voice = JSON.parse(await voiceBundle());
  voice.voicePack.name = '自分の\u202e声';
  assert.equal(ok(JSON.stringify(voice)).voice?.pack.name, '自分の声');
});

test('more than 50 routines, routines that are not a list, or nothing readable is "broken" (Ruling 80-4・80-5)', () => {
  const routines = Array.from({ length: BUNDLE_ROUTINES_MAX }, (_, index) => waltzRoutine(`r-${String(index).padStart(8, '0')}`));
  const bundle = JSON.parse(buildBundle({ distributorName: '山田', voice: null, routines, now: NOW }));
  assert.equal(ok(JSON.stringify(bundle)).routines.length, BUNDLE_ROUTINES_MAX);
  assert.equal(problem(JSON.stringify({ ...bundle, routines: [...bundle.routines, bundle.routines[0]] })), 'broken');
  assert.equal(problem(JSON.stringify({ ...bundle, routines: 'x' })), 'broken');
  assert.equal(problem(JSON.stringify({ ...bundle, routines: [] })), 'broken');
  assert.equal(problem(JSON.stringify({ ...bundle, routines: [{ name: 'x' }] })), 'broken');
});

test('a received word never keeps the file\'s volume: gainDb 120, -50 or "loud" all come back as 0 (final review I1)', async () => {
  for (const gainDb of [120, -50, 'loud', null, 1e308]) {
    const data = JSON.parse(await voiceBundle());
    for (const word of Object.values(data.voicePack.words) as Array<Record<string, unknown>>) word.gainDb = gainDb;
    const parsed = ok(JSON.stringify(data));
    for (const word of Object.values(parsed.voice!.pack.words)) assert.equal(word!.gainDb, 0, String(gainDb));
  }
});

test('a received word must be an audio type the app records; anything else is "broken" (final review I1)', async () => {
  for (const [mimeType, expected] of [['audio/wav', 'audio/wav'], ['Audio/WebM; codecs=opus', 'audio/webm;codecs=opus'], ['audio/mp4', 'audio/mp4'],
    ['audio/ogg;codecs=opus', 'audio/ogg;codecs=opus'], ['audio/x-wav', 'audio/x-wav']] as const) {
    const data = JSON.parse(await voiceBundle());
    data.voicePack.words.one.mimeType = mimeType;
    assert.equal(ok(JSON.stringify(data)).voice!.pack.words.one!.mimeType, expected, mimeType);
  }
  for (const mimeType of [undefined, 42, { a: 1 }, '', 'text/html', 'application/octet-stream', 'audio/wav<script>', `audio/wav;codecs=${'x'.repeat(80)}`]) {
    const data = JSON.parse(await voiceBundle());
    data.voicePack.words.one.mimeType = mimeType;
    assert.equal(problem(JSON.stringify(data)), 'broken', String(mimeType));
  }
});

test('received word times outside what the app can make are "broken" (final review I1)', async () => {
  const cases: Array<[string, unknown]> = [['onsetMs', -1], ['onsetMs', 10_001], ['onsetMs', '40'], ['sourceOnsetMs', 1e9], ['sourceOnsetMs', -5],
    ['durationMs', 0], ['durationMs', 10_001], ['durationMs', null]];
  for (const [field, value] of cases) {
    const data = JSON.parse(await voiceBundle());
    data.voicePack.words.two[field] = value;
    assert.equal(problem(JSON.stringify(data)), 'broken', `${field}=${String(value)}`);
  }
  const edge = JSON.parse(await voiceBundle());
  edge.voicePack.words.two.onsetMs = 10_000;
  edge.voicePack.words.two.durationMs = 10_000;
  assert.equal(problem(JSON.stringify(edge)), 'ok');
  // 旧画面の未整形の語は録音の中の開始・長さを持たなくてよい
  const legacy = JSON.parse(await voiceBundle());
  Object.assign(legacy.voicePack.words.three, { normalized: false, sourceOnsetMs: undefined, durationMs: undefined });
  assert.equal(problem(JSON.stringify(legacy)), 'ok');
});

test('the same routine id twice in one file is read once (final review M1)', () => {
  const good = waltzRoutine('r-11111111');
  const bundle = JSON.parse(buildBundle({ distributorName: '山田', voice: null, routines: [good], now: NOW }));
  bundle.routines.push({ ...bundle.routines[0], name: '二度目' });
  const parsed = ok(JSON.stringify(bundle));
  assert.deepEqual(parsed.routines.map(routine => routine.name), [good.name]);
  assert.deepEqual(parsed.rejected, []);
});

test('consent and update times are kept only as short ISO times (final review M4)', async () => {
  const data = JSON.parse(await voiceBundle());
  data.consent.consentedAt = 'x'.repeat(5000);
  data.voicePack.updatedAt = `2026-10-12T00:00:00.000Z${'y'.repeat(100)}`;
  const parsed = ok(JSON.stringify(data));
  assert.equal(parsed.consent?.consentedAt, '');
  assert.equal(parsed.voice?.sourceUpdatedAt, null);
  const fine = ok(await voiceBundle());
  assert.equal(fine.consent?.consentedAt, NOW);
  assert.equal(fine.voice?.sourceUpdatedAt, '2026-10-12T00:00:00.000Z');
});
