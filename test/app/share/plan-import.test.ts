import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBundle, exportVoiceForBundle, parseBundle } from '../../../src/app/share/bundle.ts';
import { commitImport, planImport, type ImportPlan } from '../../../src/app/share/plan-import.ts';
import { ROUTINES_MAX } from '../../../src/app/routines/limits.ts';
import { normalizeRoutine, type Routine } from '../../../src/app/routines/routine.ts';
import { VOICE_LIMITS, normalizeVoicePackRecord, type VoicePackRecord } from '../../../src/app/voices/store.ts';
import { packFixture } from '../helpers/voice-fixtures.ts';
import { waltzRoutine } from '../helpers/share-fixtures.ts';

const NOW = '2026-10-12T09:00:00.000Z';
const LATER = '2026-10-13T09:00:00.000Z';
function ids() {
  let next = 0;
  return (prefix: 'v' | 'r' | 'f') => `${prefix}-new-${String(next++).padStart(4, '0')}`;
}
async function parsedFor({ name = '山田', pack = packFixture('ja-JP', 12) as VoicePackRecord | null, routines = [] as Routine[] } = {}) {
  const text = buildBundle({ distributorName: name, voice: pack ? await exportVoiceForBundle(pack) : null, routines, now: NOW });
  const parsed = parseBundle(text);
  if (!parsed.ok) throw new Error(parsed.problem);
  return parsed;
}
const received = (plan: ImportPlan) => plan.voice!.pack;

test('a received voice gets a new v- id, the received origin, who it is from and the teacher-side id (Ruling 84-1)', async () => {
  const teacher = { ...packFixture('ja-JP', 12), timingAdjustments: { globalOffsetMs: -30, wordOffsetsMs: { one: 20 }, adjustedAt: NOW } };
  const plan = planImport(await parsedFor({ pack: teacher }), [], [], { now: LATER, newId: ids() });
  const pack = received(plan);
  assert.equal(pack.id, 'v-new-0000');
  assert.equal(pack.origin, 'received');
  assert.deepEqual(pack.distributor, { name: '山田' });
  assert.deepEqual(pack.consent, { voiceDistribution: true, consentedAt: NOW });
  assert.equal(pack.sourceId, 'user-recorded-ja-v1');
  assert.equal(pack.sourceUpdatedAt, teacher.updatedAt);
  assert.equal(pack.receivedAt, LATER);
  assert.equal(pack.name, teacher.name);
  assert.deepEqual(pack.timingAdjustments, { globalOffsetMs: 0, wordOffsetsMs: { one: 20 }, adjustedAt: NOW }, 'the teacher device delay is dropped, the per-word habit stays');
  assert.equal(plan.voice!.replaces, null);
  assert.deepEqual(normalizeVoicePackRecord(structuredClone(pack)), pack, 'the record can be stored and read back as it is');
});

test('a teacher offset alone leaves no timing adjustments on the received voice (Ruling 84-1)', async () => {
  const teacher = { ...packFixture('en', 12), timingAdjustments: { globalOffsetMs: 40, wordOffsetsMs: {}, adjustedAt: NOW } };
  const pack = received(planImport(await parsedFor({ pack: teacher }), [], [], { now: LATER, newId: ids() }));
  assert.equal('timingAdjustments' in pack, false);
});

test('the same teacher\'s voice in the same language replaces the old one; another name or language is a new voice (Ruling 84-4・D38)', async () => {
  const first = received(planImport(await parsedFor(), [], [], { now: NOW, newId: ids() }));
  const own = packFixture('ja-JP', 12);   // 自分の録音（同じ user-recorded-ja-v1）は置き換えない
  assert.equal(planImport(await parsedFor(), [own, first], [], { now: LATER, newId: ids() }).voice!.replaces?.id, first.id);
  assert.equal(planImport(await parsedFor({ name: '山田（大会用）' }), [own, first], [], { now: LATER, newId: ids() }).voice!.replaces, null);
  assert.equal(planImport(await parsedFor({ pack: packFixture('en', 12) }), [own, first], [], { now: LATER, newId: ids() }).voice!.replaces, null);
  assert.equal(planImport(await parsedFor(), [own], [], { now: LATER, newId: ids() }).voice!.replaces, null);
});

test('with 20 voices a new voice is refused, but a replacement still fits (Ruling 83-2・84-5)', async () => {
  const first = received(planImport(await parsedFor(), [], [], { now: NOW, newId: ids() }));
  const others = Array.from({ length: VOICE_LIMITS.packs - 1 }, (_, index) => ({ ...first, id: `v-other-${index}`, sourceId: `other-${index}` }));
  const full = [...others, first];
  assert.equal(planImport(await parsedFor({ name: '佐藤' }), full, [], { now: LATER, newId: ids() }).voiceBlocked, true);
  assert.equal(planImport(await parsedFor({ name: '佐藤' }), full, [], { now: LATER, newId: ids() }).voice, null);
  const replacing = planImport(await parsedFor(), full, [], { now: LATER, newId: ids() });
  assert.equal(replacing.voiceBlocked, false);
  assert.equal(replacing.voice!.replaces?.id, first.id);
});

test('received routines get new routine and figure ids, the received source and who they are from (Ruling 84-2)', async () => {
  const teacher = waltzRoutine('r-teacher-0001');
  const plan = planImport(await parsedFor({ pack: null, routines: [teacher] }), [], [], { now: LATER, newId: ids() });
  const [{ routine, replaces }] = plan.routines;
  assert.equal(replaces, null);
  assert.equal(routine!.id, 'r-new-0000');
  assert.deepEqual(routine!.figures.map(figure => figure.id), ['f-new-0001', 'f-new-0002']);
  assert.deepEqual(routine!.figures.map(figure => [figure.name, figure.counts]), teacher.figures.map(figure => [figure.name, figure.counts]));
  assert.equal(routine!.source, 'received');
  assert.equal(routine!.provenance.sourceKind, 'received');
  assert.deepEqual(routine!.receivedFrom, { distributor: '山田', receivedAt: LATER, sourceId: 'r-teacher-0001' });
  assert.equal(plan.voice, null);
  const valid = { ...routine!, id: 'r-0f8fad5b-d9cb-469f-a165-70867728950e', figures: routine!.figures.map((figure, index) => ({ ...figure, id: `f-0000000${index}` })) };
  assert.deepEqual(normalizeRoutine(structuredClone(valid)), valid, 'the routine can be stored and read back');
});

test('the same routine again replaces the received copy; routines past 200 are not received (Ruling 83-2・84-4・84-5)', async () => {
  const teacher = [waltzRoutine('r-teacher-0001'), waltzRoutine('r-teacher-0002'), waltzRoutine('r-teacher-0003')];
  const firstPlan = planImport(await parsedFor({ pack: null, routines: teacher }), [], [], { now: NOW, newId: ids() });
  const mine = firstPlan.routines.map(item => item.routine);
  const filler = Array.from({ length: ROUTINES_MAX - mine.length - 1 }, (_, index) => waltzRoutine(`r-fill-${String(index).padStart(4, '0')}`));
  const again = planImport(await parsedFor({ pack: null, routines: [...teacher, waltzRoutine('r-teacher-0004'), waltzRoutine('r-teacher-0005')] }),
    [], [...filler, ...mine], { now: LATER, newId: ids() });
  assert.deepEqual(again.routines.map(item => item.replaces), [mine[0]!.id, mine[1]!.id, mine[2]!.id, null]);
  assert.equal(again.routinesOverLimit, 1);
});

test('"Use" writes the new things first and removes the replaced ones only after; a failed write stops and keeps the old (Ruling 83-3)', async () => {
  const old = received(planImport(await parsedFor(), [], [], { now: NOW, newId: ids() }));
  const plan = planImport(await parsedFor({ routines: [waltzRoutine('r-teacher-0001')] }), [old], [], { now: LATER, newId: ids() });
  const log: string[] = [];
  const writer = (failOn = '') => ({
    async saveVoice(pack: VoicePackRecord) { log.push(`save ${pack.id}`); return failOn !== 'voice'; },
    async deleteVoice(id: string) { log.push(`delete ${id}`); return true; },
    async saveRoutine(routine: Routine) { log.push(`save ${routine.id}`); return failOn !== 'routine'; },
    async removeRoutine(id: string) { log.push(`remove ${id}`); return true; }
  });
  assert.equal(await commitImport(plan, writer()), true);
  assert.deepEqual(log, [`save ${plan.voice!.pack.id}`, `delete ${old.id}`, `save ${plan.routines[0]!.routine.id}`]);
  log.length = 0;
  assert.equal(await commitImport(plan, writer('voice')), false);
  assert.deepEqual(log, [`save ${plan.voice!.pack.id}`]);
});

test('the new voice is chosen as soon as it is saved, before a routine write can fail (stage-5 Task 7 review M2)', async () => {
  const old = received(planImport(await parsedFor(), [], [], { now: NOW, newId: ids() }));
  const plan = planImport(await parsedFor({ routines: [waltzRoutine('r-teacher-0001')] }), [old], [], { now: LATER, newId: ids() });
  const log: string[] = [];
  const writer = {
    async saveVoice(pack: VoicePackRecord) { log.push(`save ${pack.id}`); return true; },
    voiceSaved(pack: VoicePackRecord) { log.push(`choose ${pack.id}`); },
    async deleteVoice(id: string) { log.push(`delete ${id}`); return true; },
    async saveRoutine(routine: Routine) { log.push(`save ${routine.id}`); return false; },
    async removeRoutine(id: string) { log.push(`remove ${id}`); return true; }
  };
  assert.equal(await commitImport(plan, writer), false);
  assert.deepEqual(log, [`save ${plan.voice!.pack.id}`, `choose ${plan.voice!.pack.id}`, `delete ${old.id}`, `save ${plan.routines[0]!.routine.id}`],
    'the old voice is gone, so the selection must already point at the new one');
});

test('only known fields of a received voice are kept; unknown keys in the file are not stored (stage-5 review)', async () => {
  const text = buildBundle({ distributorName: '山田', voice: await exportVoiceForBundle(packFixture('ja-JP', 12)), routines: [], now: NOW });
  const data = JSON.parse(text);
  data.voicePack.evil = 'x'.repeat(1000);
  data.voicePack.sourceId = 'forged';
  data.voicePack.receivedAt = 'forged';
  data.voicePack.futureField = { preset: true };
  data.voicePack.words.one.extra = 'y';
  data.voicePack.timingAdjustments = { globalOffsetMs: 5, wordOffsetsMs: { two: 10 }, adjustedAt: NOW, extra: 'z' };
  const tampered = JSON.stringify(data).replace('"evil":', '"__proto__":{"polluted":true},"evil":');
  const parsed = parseBundle(tampered);
  assert.ok(parsed.ok);
  const pack = received(planImport(parsed, [], [], { now: LATER, newId: ids() }));
  assert.deepEqual(Object.keys(pack).sort(), ['consent', 'distributor', 'id', 'locale', 'name', 'origin', 'receivedAt', 'schemaVersion',
    'sourceId', 'sourceUpdatedAt', 'timingAdjustments', 'type', 'updatedAt', 'vocabularyId', 'words'].sort());
  assert.equal(Object.hasOwn(pack, '__proto__'), false);
  assert.equal(pack.sourceId, 'user-recorded-ja-v1');
  assert.equal(pack.receivedAt, LATER);
  assert.deepEqual(Object.keys(pack.words.one!).sort(), ['blob', 'durationMs', 'gainDb', 'mimeType', 'normalized', 'onsetMs', 'sourceOnsetMs']);
  assert.deepEqual(pack.timingAdjustments, { globalOffsetMs: 0, wordOffsetsMs: { two: 10 }, adjustedAt: NOW });
  assert.deepEqual(normalizeVoicePackRecord(structuredClone(pack)), pack);
});
