import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryStorage } from '../helpers/memory-storage.ts';
import { packFixture, wordFixture } from '../helpers/voice-fixtures.ts';
import { RECORDED_PACK_IDS, isVoiceId, toVoiceLocale } from '../../../src/app/voices/ids.ts';
import { STANDARD_VOICES, findStandardVoice } from '../../../src/app/voices/standard.ts';
import { STANDARD_VOICE_ID } from '../../../src/app/settings/settings.ts';
import {
  VOICE_KEYS, VOICE_LIMITS, deleteVoicePack, isCompletePack, listVoicePacks, loadVoicePack, newRecordedPack, normalizeVoicePackRecord,
  packProgress, removeVoicePack, renamePack, saveVoicePack, withWord
} from '../../../src/app/voices/store.ts';
import { withPackOffset } from '../../../src/app/practice/voice-offset.ts';

const NOW = '2026-10-12T00:00:00.000Z';

test('recorded voice ids are the legacy constants, one per language (Ruling 56-3)', () => {
  assert.deepEqual(RECORDED_PACK_IDS, { en: 'user-recorded-v1', 'ja-JP': 'user-recorded-ja-v1' });
  assert.equal(newRecordedPack('en', 'x', NOW).id, 'user-recorded-v1');
  assert.equal(newRecordedPack('ja-JP', 'x', NOW).id, 'user-recorded-ja-v1');
  for (const ok of ['user-recorded-v1', 'default-en-female-v1', 'a', 'A_b-9'.repeat(12).slice(0, 64)]) assert.equal(isVoiceId(ok), true, ok);
  for (const bad of ['', 'a b', 'あ', 'x'.repeat(65), '../x', 3, null]) assert.equal(isVoiceId(bad), false, String(bad));
  assert.equal(toVoiceLocale('ja'), 'ja-JP');
  assert.equal(toVoiceLocale('ja-JP'), 'ja-JP');
  assert.equal(toVoiceLocale('en-GB'), 'en');
  assert.equal(toVoiceLocale(undefined), 'en');
});

test('the standard voice list starts with the English voice the settings default to (Ruling 60-5)', () => {
  assert.equal(STANDARD_VOICES[0]!.id, STANDARD_VOICE_ID);
  assert.deepEqual(STANDARD_VOICES.map(voice => voice.locale), ['en']);
  assert.equal(findStandardVoice(STANDARD_VOICE_ID)?.locale, 'en');
  assert.equal(findStandardVoice('user-recorded-v1'), undefined);
});

test('a new pack has no words, the recorded origin and the language as vocabulary', () => {
  const pack = newRecordedPack('ja-JP', '自分の声（日本語）', NOW);
  assert.equal(pack.origin, 'recorded');
  assert.equal(pack.locale, 'ja-JP');
  assert.equal(pack.vocabularyId, 'ja-JP');
  assert.equal(pack.updatedAt, NOW);
  assert.deepEqual(pack.words, {});
  assert.deepEqual(packProgress(pack), { recorded: 0, total: 12, complete: false });
});

test('words are added in the S8 order and complete means all 12 (Ruling 59-5)', () => {
  assert.deepEqual(VOICE_KEYS, ['slow', 'quick', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'and', 'ah']);
  const seven = packFixture('en', 7);
  assert.deepEqual(packProgress(seven), { recorded: 7, total: 12, complete: false });
  assert.equal(isCompletePack(seven), false);
  const full = packFixture('en', 12);
  assert.equal(isCompletePack(full), true);
  assert.equal(isCompletePack(null), false);
  const later = withWord(full, 'six', wordFixture(50), '2026-10-12T01:00:00.000Z');
  assert.equal(later.words.six!.onsetMs, 50);
  assert.equal(later.updatedAt, '2026-10-12T01:00:00.000Z');
  assert.equal(full.words.six!.onsetMs, 40, 'withWord does not mutate');
});

test('save, load, list and delete go through the voice-packs store', async () => {
  const { storage, data } = memoryStorage();
  const en = packFixture('en', 12);
  const ja = packFixture('ja-JP', 7, { now: '2026-10-11T00:00:00.000Z' });
  assert.equal(await saveVoicePack(storage, en), true);
  assert.equal(await saveVoicePack(storage, ja), true);
  assert.ok(data.has('voice-packs/user-recorded-v1'));
  const loaded = await loadVoicePack(storage, 'user-recorded-v1');
  assert.equal(loaded?.name, '自分の声（英語）');
  assert.ok(loaded?.words.slow?.blob instanceof Blob);
  assert.deepEqual((await listVoicePacks(storage)).map(pack => pack.id), ['user-recorded-ja-v1', 'user-recorded-v1']);
  assert.equal(await deleteVoicePack(storage, 'user-recorded-v1'), true);
  assert.equal(await loadVoicePack(storage, 'user-recorded-v1'), null);
});

test('received voices come after recorded ones (Ruling 56-1)', async () => {
  const { storage } = memoryStorage();
  const received = { ...packFixture('ja-JP', 12, { name: '山田先生の声', now: '2026-01-01T00:00:00.000Z' }), id: 'v-recv-1', origin: 'received', distributor: { name: '山田' } };
  await storage.put('voice-packs', received);
  await saveVoicePack(storage, packFixture('en', 3));
  const list = await listVoicePacks(storage);
  assert.deepEqual(list.map(pack => pack.id), ['user-recorded-v1', 'v-recv-1']);
  assert.deepEqual(list[1]!.distributor, { name: '山田' });
});

test('broken records are skipped, not deleted; an unknown origin reads as recorded', async () => {
  const good = packFixture('en', 2);
  const { storage, data } = memoryStorage({
    'voice-packs/a': { id: 'a', name: 'x' },
    'voice-packs/b': { ...good, id: 'b', words: { slow: { blob: 'not a blob', onsetMs: 1 } } },
    'voice-packs/c': { ...good, id: 'c', name: '   ' },
    'voice-packs/d': { ...good, id: 'd', name: 'あ'.repeat(41) },
    'voice-packs/e e': { ...good, id: 'e e' },
    'voice-packs/f': { ...good, id: 'f', origin: 'weird', locale: 'ja' }
  });
  const list = await listVoicePacks(storage);
  assert.deepEqual(list.map(pack => pack.id), ['f']);
  assert.equal(list[0]!.origin, 'recorded');
  assert.equal(list[0]!.locale, 'ja-JP');
  assert.equal(data.size, 6, 'nothing was deleted');
  assert.equal(normalizeVoicePackRecord(null), null);
  assert.equal(normalizeVoicePackRecord([]), null);
});

test('a word or a pack over the size limits is refused (Ruling 56-4)', () => {
  const pack = packFixture('en', 1);
  const big = { ...pack, words: { slow: { ...pack.words.slow!, blob: new Blob([new Uint8Array(VOICE_LIMITS.wordBytes + 1)]) } } };
  assert.equal(normalizeVoicePackRecord(big), null);
  assert.ok(normalizeVoicePackRecord(pack));
});

test('storage failures become false or empty, never a throw', async () => {
  const { storage } = memoryStorage({}, { failWrites: true, failReads: true });
  assert.equal(await saveVoicePack(storage, packFixture('en', 1)), false);
  assert.equal(await deleteVoicePack(storage, 'user-recorded-v1'), false);
  assert.deepEqual(await listVoicePacks(storage), []);
  assert.equal(await loadVoicePack(storage, 'user-recorded-v1'), null);
  assert.equal(await saveVoicePack(null, packFixture('en', 1)), false);
  assert.deepEqual(await listVoicePacks(null), []);
  assert.equal(await loadVoicePack(memoryStorage().storage, 'bad id'), null);
});

test('renamePack trims, keeps 40 characters and refuses an empty name', () => {
  const pack = packFixture('en', 12);
  assert.equal(renamePack(pack, '  山田の声  ')?.name, '山田の声');
  assert.equal([...renamePack(pack, 'あ'.repeat(50))!.name].length, 40);
  assert.equal(renamePack(pack, '   '), null);
  assert.equal(renamePack(pack, 'x')?.updatedAt, pack.updatedAt, 'renaming does not touch the sound');
});

test('the timing offset survives a re-record and a rename, also through save and load (final review M6)', async () => {
  const tuned = withPackOffset(packFixture('en', 12), -20, NOW);
  const rerecorded = withWord(tuned, 'one', wordFixture(55), '2026-10-12T01:00:00.000Z');
  assert.equal(rerecorded.timingAdjustments?.globalOffsetMs, -20);
  assert.equal(rerecorded.words.one?.onsetMs, 55);
  const renamed = renamePack(rerecorded, '山田先生');
  assert.equal(renamed?.timingAdjustments?.globalOffsetMs, -20);
  assert.equal(renamed?.name, '山田先生');
  const { storage } = memoryStorage();
  assert.equal(await saveVoicePack(storage, renamed!), true);
  assert.equal((await loadVoicePack(storage, 'user-recorded-v1'))?.timingAdjustments?.globalOffsetMs, -20);
});

test('delete returns the list without the voice only after storage confirms; a failure keeps the row (final review M4)', async () => {
  const en = packFixture('en', 12);
  const ja = packFixture('ja-JP', 7);
  const { storage, data } = memoryStorage();
  await saveVoicePack(storage, en);
  await saveVoicePack(storage, ja);
  assert.deepEqual((await removeVoicePack(storage, [en, ja], en.id))?.map(pack => pack.id), [ja.id]);
  assert.equal(data.has(`voice-packs/${en.id}`), false);
  const failing = memoryStorage({}, { failWrites: true });
  assert.equal(await removeVoicePack(failing.storage, [en, ja], en.id), null);
  assert.equal(await removeVoicePack(null, [en], en.id), null);
});

test('a received voice keeps its source id, source time and received time through save and load (Ruling 84-1)', async () => {
  const { storage } = memoryStorage();
  const received = {
    ...packFixture('ja-JP', 12, { name: '自分の声（日本語）' }), id: 'v-0f8fad5b-d9cb-469f-a165-70867728950e', origin: 'received' as const,
    distributor: { name: '山田' }, consent: { voiceDistribution: true as const, consentedAt: NOW },
    sourceId: 'user-recorded-ja-v1', sourceUpdatedAt: '2026-10-01T00:00:00.000Z', receivedAt: NOW
  };
  assert.equal(await saveVoicePack(storage, received), true);
  const loaded = await loadVoicePack(storage, received.id);
  assert.equal(loaded?.sourceId, 'user-recorded-ja-v1');
  assert.equal(loaded?.sourceUpdatedAt, '2026-10-01T00:00:00.000Z');
  assert.equal(loaded?.receivedAt, NOW);
  assert.deepEqual(loaded?.consent, { voiceDistribution: true, consentedAt: NOW });
});
