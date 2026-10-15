import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBundle, exportVoiceForBundle, parseBundle } from '../../../src/app/share/bundle.ts';
import { DISTRIBUTOR_ID_PATTERN, ensureDistributorId, newDistributorId, readDistributorId } from '../../../src/app/share/distributor-id.ts';
import { BUNDLE_SCHEMA_VERSION } from '../../../src/app/share/limits.ts';
import { planImport, type ImportPlan } from '../../../src/app/share/plan-import.ts';
import { DEFAULT_SETTINGS, normalizeSettings } from '../../../src/app/settings/settings.ts';
import { loadSettings, saveSettings } from '../../../src/app/settings/store.ts';
import { normalizeRoutine, type Routine } from '../../../src/app/routines/routine.ts';
import { normalizeVoicePackRecord, type VoicePackRecord } from '../../../src/app/voices/store.ts';
import { packFixture } from '../helpers/voice-fixtures.ts';
import { memoryStorage } from '../helpers/memory-storage.ts';
import { waltzRoutine } from '../helpers/share-fixtures.ts';

// D76（ひとみうさ承認 2026-10-15）: 配る人の見分け用の番号（distributor.id）。同じ先生の声・ルーティンの見分けに名前ではなく番号を使う。
const NOW = '2026-10-15T09:00:00.000Z';
const LATER = '2026-10-16T09:00:00.000Z';
const YAMADA_A = 'a'.repeat(32);
const YAMADA_B = 'b'.repeat(32);
function ids() {
  let next = 0;
  return (prefix: 'v' | 'r' | 'f') => `${prefix}-new-${String(next++).padStart(4, '0')}`;
}
async function parsedFor({ name = '山田', id = null as string | null, pack = packFixture('ja-JP', 12) as VoicePackRecord | null, routines = [] as Routine[] } = {}) {
  const text = buildBundle({ distributorName: name, voice: pack ? await exportVoiceForBundle(pack) : null, routines, now: NOW, distributorId: id });
  const parsed = parseBundle(text);
  if (!parsed.ok) throw new Error(parsed.problem);
  return parsed;
}
// 端末に保存して読み直した受け取った声（S7 の一覧に並ぶ形）
async function receivedVoice(options: Parameters<typeof parsedFor>[0], when = NOW): Promise<VoicePackRecord> {
  const pack = planImport(await parsedFor(options), [], [], { now: when, newId: ids() }).voice!.pack;
  return normalizeVoicePackRecord(structuredClone(pack))!;
}
const replaces = (plan: ImportPlan) => plan.voice!.replaces?.id ?? null;

test('the id is 16 random bytes in hex, made from crypto.getRandomValues', () => {
  const id = newDistributorId();
  assert.match(id, DISTRIBUTOR_ID_PATTERN);
  assert.notEqual(newDistributorId(), id);
  const fixed = newDistributorId({ getRandomValues: <T extends ArrayBufferView | null>(array: T) => { (array as unknown as Uint8Array).fill(0xab); return array; } } as Crypto);
  assert.equal(fixed, 'ab'.repeat(16));
});

test('readDistributorId: only the exact form; anything else is absent', () => {
  assert.equal(readDistributorId(YAMADA_A), YAMADA_A);
  for (const bad of [undefined, null, 42, '', 'A'.repeat(32), 'a'.repeat(31), 'a'.repeat(33), 'g'.repeat(32), ` ${YAMADA_A}`, { id: YAMADA_A }]) {
    assert.equal(readDistributorId(bad), null, String(bad));
  }
});

test('the id is made once and kept in the settings: two share files from the same device carry the same id', async () => {
  assert.equal(DEFAULT_SETTINGS.distributorId, null);
  const { storage } = memoryStorage({});
  const legacy = { read: () => null, forget: () => {} };
  const first = ensureDistributorId((await loadSettings(storage, legacy)).distributorId);
  assert.equal(first.isNew, true);
  assert.equal(await saveSettings(storage, { distributorId: first.id }), true);
  const second = ensureDistributorId((await loadSettings(storage, legacy)).distributorId, () => { throw new Error('must not make another'); });
  assert.deepEqual(second, { id: first.id, isNew: false });
  const fileA = JSON.parse(buildBundle({ distributorName: '山田', voice: null, routines: [waltzRoutine('r-11111111')], now: NOW, distributorId: first.id }));
  const fileB = JSON.parse(buildBundle({ distributorName: '山田先生', voice: null, routines: [waltzRoutine('r-22222222')], now: LATER, distributorId: second.id }));
  assert.equal(fileA.distributor.id, fileB.distributor.id);
  assert.equal(normalizeSettings({ distributorId: 'not-an-id' }).distributorId, null, 'a broken saved value is made again');
});

test('the file keeps schemaVersion 1 and writes distributor.id only when it is well formed', () => {
  const build = (distributorId: string | null) => JSON.parse(buildBundle({ distributorName: '山田', voice: null, routines: [waltzRoutine('r-11111111')], now: NOW, distributorId }));
  assert.equal(build(YAMADA_A).schemaVersion, BUNDLE_SCHEMA_VERSION);
  assert.equal(BUNDLE_SCHEMA_VERSION, 1);
  assert.deepEqual(build(YAMADA_A).distributor, { name: '山田', id: YAMADA_A });
  assert.deepEqual(build(null).distributor, { name: '山田' });
  assert.deepEqual(build('broken').distributor, { name: '山田' });
});

test('a broken distributor.id in a file is ignored, the file is still read (not "broken")', () => {
  const base = JSON.parse(buildBundle({ distributorName: '山田', voice: null, routines: [waltzRoutine('r-11111111')], now: NOW }));
  for (const bad of [42, null, 'x'.repeat(5000), 'A'.repeat(32), { nested: true }, ['a']]) {
    const parsed = parseBundle(JSON.stringify({ ...base, distributor: { name: '山田', id: bad } }));
    assert.ok(parsed.ok, JSON.stringify(bad).slice(0, 20));
    assert.deepEqual(parsed.distributor, { name: '山田' });
  }
  const good = parseBundle(JSON.stringify({ ...base, distributor: { name: '山田', id: YAMADA_A } }));
  assert.ok(good.ok);
  assert.deepEqual(good.distributor, { name: '山田', id: YAMADA_A });
});

test('old app compatibility: the parsing rules read only distributor.name, so a file with the id is read the same as one without', async () => {
  // 声の updatedAt は読んだ時刻になる（importRecordedVoicePack）ので、比べるのはルーティンだけの束
  const withId = await parsedFor({ id: YAMADA_A, pack: null, routines: [waltzRoutine('r-11111111')] });
  const without = await parsedFor({ pack: null, routines: [waltzRoutine('r-11111111')] });
  assert.deepEqual({ ...withId, distributor: { name: withId.distributor!.name } }, without);
  assert.ok((await parsedFor({ id: YAMADA_A })).voice, 'a voice file with the id is read too');
  // 旧アプリの端末に残る形（番号なし）の声・ルーティンも、新しいアプリでそのまま読める
  const oldPack = await receivedVoice({});
  assert.equal(oldPack.distributor?.id, undefined);
  assert.deepEqual(normalizeVoicePackRecord(structuredClone(oldPack)), oldPack);
});

test('a received voice and routine keep the id and read back from the device', async () => {
  const plan = planImport(await parsedFor({ id: YAMADA_A, routines: [waltzRoutine('r-teacher-0001')] }), [], [], { now: LATER, newId: ids() });
  assert.deepEqual(plan.voice!.pack.distributor, { name: '山田', id: YAMADA_A });
  assert.deepEqual(normalizeVoicePackRecord(structuredClone(plan.voice!.pack)), plan.voice!.pack);
  const routine = plan.routines[0]!.routine;
  assert.deepEqual(routine.receivedFrom, { distributor: '山田', receivedAt: LATER, sourceId: 'r-teacher-0001', distributorId: YAMADA_A });
  const valid = { ...routine, id: 'r-0f8fad5b-d9cb-469f-a165-70867728950e', figures: routine.figures.map((figure, index) => ({ ...figure, id: `f-0000000${index}` })) };
  assert.deepEqual(normalizeRoutine(structuredClone(valid)), valid);
  const broken = normalizeRoutine({ ...structuredClone(valid), receivedFrom: { ...valid.receivedFrom!, distributorId: 'nope' } })!;
  assert.equal(broken.receivedFrom!.distributorId, undefined, 'a broken saved id is dropped, the routine stays');
  const brokenPack = normalizeVoicePackRecord({ ...structuredClone(plan.voice!.pack), distributor: { name: '山田', id: 7 } })!;
  assert.deepEqual(brokenPack.distributor, { name: '山田' });
});

// 声の置き換えの表（plan-import.ts sameVoice のコメントと rulings.md D76）
test('voice: same id, different name → replaces (a renamed teacher does not duplicate)', async () => {
  const old = await receivedVoice({ name: '山田', id: YAMADA_A });
  const plan = planImport(await parsedFor({ name: '山田花子', id: YAMADA_A }), [old], [], { now: LATER, newId: ids() });
  assert.equal(replaces(plan), old.id);
  assert.equal(plan.voice!.pack.distributor?.name, '山田花子', 'the new voice carries the new name');
});

test('voice: same name, different id → both kept (two teachers called 山田)', async () => {
  const other = await receivedVoice({ name: '山田', id: YAMADA_B });
  assert.equal(replaces(planImport(await parsedFor({ name: '山田', id: YAMADA_A }), [other], [], { now: LATER, newId: ids() })), null);
});

test('voice: an old voice (no id) + a new file (id) with the same name → replaces once; after that the id decides', async () => {
  const old = await receivedVoice({ name: '山田' });
  const first = planImport(await parsedFor({ name: '山田', id: YAMADA_A }), [old], [], { now: LATER, newId: ids() });
  assert.equal(replaces(first), old.id);
  const upgraded = normalizeVoicePackRecord(structuredClone(first.voice!.pack))!;
  // その後は番号で: 同じ番号なら置き換え、同じ名前の別の番号は別の声
  assert.equal(replaces(planImport(await parsedFor({ name: '山田', id: YAMADA_A }), [upgraded], [], { now: LATER, newId: ids() })), upgraded.id);
  assert.equal(replaces(planImport(await parsedFor({ name: '山田', id: YAMADA_B }), [upgraded], [], { now: LATER, newId: ids() })), null);
});

test('voice: a new file prefers the voice with its id over an old same-name voice without id', async () => {
  const oldNoId = await receivedVoice({ name: '山田' });
  const withId = await receivedVoice({ name: '山田先生', id: YAMADA_A });
  assert.equal(replaces(planImport(await parsedFor({ name: '山田', id: YAMADA_A }), [oldNoId, withId], [], { now: LATER, newId: ids() })), withId.id);
});

test('voice: a voice with an id + an old file (no id) with the same name → both kept (it may be another 山田)', async () => {
  const withId = await receivedVoice({ name: '山田', id: YAMADA_A });
  assert.equal(replaces(planImport(await parsedFor({ name: '山田' }), [withId], [], { now: LATER, newId: ids() })), null);
});

test('voice: old file + old voice (both without id) still follow D40 (name + language)', async () => {
  const old = await receivedVoice({ name: '山田' });
  assert.equal(replaces(planImport(await parsedFor({ name: '山田' }), [old], [], { now: LATER, newId: ids() })), old.id);
  assert.equal(replaces(planImport(await parsedFor({ name: '佐藤' }), [old], [], { now: LATER, newId: ids() })), null);
});

test('voice: the same id in another language, or the own recorded voice, is never replaced', async () => {
  const japanese = await receivedVoice({ name: '山田', id: YAMADA_A });
  const own = packFixture('en', 12);
  assert.equal(replaces(planImport(await parsedFor({ name: '山田', id: YAMADA_A, pack: packFixture('en', 12) }), [japanese, own], [], { now: LATER, newId: ids() })), null);
});

// ルーティン: 先生の端末のルーティンの ID で。両方に番号がある時だけ番号も同じこと
test('routines: the same routine id replaces; with ids on both sides the id must match too; without id the old rule', async () => {
  const fromA = planImport(await parsedFor({ pack: null, id: YAMADA_A, routines: [waltzRoutine('r-teacher-0001')] }), [], [], { now: NOW, newId: ids() }).routines[0]!.routine;
  const noId = planImport(await parsedFor({ pack: null, routines: [waltzRoutine('r-teacher-0002')] }), [], [], { now: NOW, newId: ids() }).routines[0]!.routine;
  const mine = [fromA, noId];
  const check = async (id: string | null, routineId: string) =>
    planImport(await parsedFor({ pack: null, id, routines: [waltzRoutine(routineId)] }), [], mine, { now: LATER, newId: ids() }).routines[0]!.replaces;
  assert.equal(await check(YAMADA_A, 'r-teacher-0001'), fromA.id, 'same id, same routine → replaces');
  assert.equal(await check(YAMADA_B, 'r-teacher-0001'), null, 'another device with the same routine id → kept apart');
  assert.equal(await check(null, 'r-teacher-0001'), fromA.id, 'an old file (no id) → old rule');
  assert.equal(await check(YAMADA_A, 'r-teacher-0002'), noId.id, 'an old record (no id) + a new file → replaces (upgrade)');
  assert.equal(await check(null, 'r-teacher-0002'), noId.id, 'both without id → old rule');
  assert.equal(await check(YAMADA_A, 'r-teacher-0009'), null, 'another routine → new');
});
