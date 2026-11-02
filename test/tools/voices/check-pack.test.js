// 番人（Ruling 68-2・68-3）: 英パックは通り、1 項目ずつ壊すと落ちる。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { checkPack, checkDistAudio, findSecrets, loadStandardVoices } from '../../../tools/voices/check-pack.js';
import { encodePcm16Wav } from '../../../tools/voices/wav.js';
import { syntheticWord, voiced, concat, silence } from './helpers.js';

const root = path.resolve(import.meta.dirname, '../../..');
const englishPack = path.join(root, 'public/audio/default-en-female-v1');

async function withPack(id, mutate, run) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-pack-'));
  const dir = path.join(base, id);
  try {
    await fs.cp(englishPack, dir, { recursive: true });
    const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
    manifest.id = id;
    if (id !== 'default-en-female-v1') manifest.gate = { status: 'approved', approvedBy: 'test', approvedAt: '2026-10-12T00:00:00.000Z' };
    await mutate?.(manifest, dir);
    await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
    return await run(dir, base);
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
}

const expectProblem = async (id, mutate, pattern, options) => withPack(id, mutate, async dir => {
  const result = await checkPack(dir, options);
  assert.equal(result.ok, false, `expected a problem matching ${pattern}`);
  assert.ok(result.problems.some(problem => pattern.test(problem)), result.problems.join('\n'));
});

test('the committed English pack passes', async () => {
  const result = await checkPack(englishPack);
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
});

test('an approved copy under another id passes', async () => {
  await withPack('default-ja-female-v1', null, async dir => assert.deepEqual((await checkPack(dir)).problems, []));
});

test('gate must be approved (only the English pack is grandfathered)', async () => {
  await expectProblem('default-ja-female-v1', manifest => { manifest.gate = { status: 'pending' }; }, /gate/);
  await expectProblem('default-ja-female-v1', manifest => { delete manifest.gate; }, /gate/);
  await withPack('default-ja-female-v1', manifest => { manifest.gate = { status: 'pending' }; },
    async dir => assert.equal((await checkPack(dir, { requireApproved: false })).ok, true));
});

test('format problems are each caught', async () => {
  const ja = 'default-ja-female-v1';
  await expectProblem(ja, manifest => { manifest.schemaVersion = 1; }, /schemaVersion/);
  await expectProblem(ja, manifest => { manifest.id = 'other'; }, /id/);
  await expectProblem(ja, manifest => { delete manifest.words.ah; }, /ah/);
  await expectProblem(ja, manifest => { const { slow, ...rest } = manifest.words; manifest.words = { ...rest, slow }; }, /順/);
  await expectProblem(ja, manifest => { manifest.words.one.needsOnsetMeasurement = true; }, /needsOnsetMeasurement/);
  await expectProblem(ja, manifest => { manifest.words.one.onsetMs = 5000; }, /onsetMs/);
  await expectProblem(ja, manifest => { manifest.words.one.onsetMethod = 'guess'; }, /onsetMethod/);
  await expectProblem(ja, manifest => { manifest.words.one.onsetMethod = 'manual'; }, /note/);
  await expectProblem(ja, manifest => { manifest.words.one.file = '../one.wav'; }, /file/);
});

test('WAV problems are each caught', async () => {
  const ja = 'default-ja-female-v1';
  await expectProblem(ja, async (_, dir) => fs.rm(path.join(dir, 'two.wav')), /two/);
  await expectProblem(ja, async (_, dir) => fs.writeFile(path.join(dir, 'two.wav'), encodePcm16Wav([syntheticWord(), syntheticWord()], 48_000)), /モノ|mono/);
  await expectProblem(ja, async (_, dir) => fs.writeFile(path.join(dir, 'two.wav'), encodePcm16Wav(syntheticWord({ rate: 44_100 }), 44_100)), /48000/);
  await expectProblem(ja, async (_, dir) => fs.writeFile(path.join(dir, 'two.wav'), encodePcm16Wav(concat(silence(40), voiced(100)), 48_000)), /短/);
  await expectProblem(ja, async (_, dir) => fs.writeFile(path.join(dir, 'two.wav'), encodePcm16Wav(concat(silence(40), voiced(1200)), 48_000)), /長/);
  await expectProblem(ja, async (_, dir) => fs.writeFile(path.join(dir, 'two.wav'), encodePcm16Wav(syntheticWord({ amplitude: 2 }), 48_000)), /ピーク/);
  await expectProblem(ja, async (_, dir) => fs.writeFile(path.join(dir, 'notes.txt'), 'x'), /notes\.txt/);
});

test('standard-voices.json is the single source: English first, then the Japanese standard voice (stage 6c・D78)', async () => {
  const voices = await loadStandardVoices();
  assert.deepEqual(voices, [{ id: 'default-en-female-v1', locale: 'en' }, { id: 'default-ja-female-v1', locale: 'ja-JP' }]);
});

test('the shipped Japanese standard pack passes the guard and its gate was approved by the owner (D78)', async () => {
  const dir = path.join(root, 'public/audio/default-ja-female-v1');
  const { problems, manifest } = await checkPack(dir);
  assert.deepEqual(problems, []);
  assert.equal(manifest.locale, 'ja-JP');
  assert.equal(manifest.gate.status, 'approved');
});

test('checkDistAudio: listed packs must exist and pass; unknown packs must not ship', async () => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-dist-'));
  try {
    await fs.cp(englishPack, path.join(dist, 'audio/default-en-female-v1'), { recursive: true });
    const voices = [{ id: 'default-en-female-v1', locale: 'en' }];
    assert.deepEqual(await checkDistAudio(dist, voices), []);
    assert.ok((await checkDistAudio(dist, [...voices, { id: 'default-ja-female-v1', locale: 'ja-JP' }])).some(problem => /missing audio\/default-ja-female-v1\/manifest\.json/.test(problem)));
    await fs.mkdir(path.join(dist, 'audio/default-ja-female-v1'));
    await fs.writeFile(path.join(dist, 'audio/default-ja-female-v1/manifest.json'), '{"schemaVersion":2,"id":"default-ja-female-v1","words":{}}');
    const problems = await checkDistAudio(dist, voices);
    assert.ok(problems.some(problem => /must not ship audio\/default-ja-female-v1/.test(problem)), problems.join('\n'));
    const listed = await checkDistAudio(dist, [...voices, { id: 'default-ja-female-v1', locale: 'ja-JP' }]);
    assert.ok(listed.some(problem => /default-ja-female-v1/.test(problem) && /gate|slow/.test(problem)), listed.join('\n'));
  } finally {
    await fs.rm(dist, { recursive: true, force: true });
  }
});

test('findSecrets spots API keys, private keys and OAuth tokens', () => {
  assert.deepEqual(findSecrets('const a = 1;'), []);
  assert.equal(findSecrets('key=AIza' + 'SyB0000000000000000000000000000000').length, 1);
  assert.equal(findSecrets('{"private' + '_key": "-----BEGIN"}').length, 1);
  assert.equal(findSecrets('Bearer ya' + '29.a0Af').length, 1);
});

test('audio files anywhere outside dist/audio/<listed id>/ must not ship (I-2)', async () => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-dist-place-'));
  try {
    await fs.cp(englishPack, path.join(dist, 'audio/default-en-female-v1'), { recursive: true });
    const voices = [{ id: 'default-en-female-v1', locale: 'en' }];
    assert.deepEqual(await checkDistAudio(dist, voices), []);
    for (const file of ['voices-ja/one.wav', 'audio-ja/default-ja-female-v1/one.mp3', 'assets/two.m4a', 'x.ogg', 'a/b.aac', 'c.webm', 'd.FLAC']) {
      await fs.mkdir(path.dirname(path.join(dist, file)), { recursive: true });
      await fs.writeFile(path.join(dist, file), 'x');
    }
    const problems = await checkDistAudio(dist, voices);
    for (const file of ['voices-ja/one.wav', 'audio-ja/default-ja-female-v1/one.mp3', 'assets/two.m4a', 'x.ogg', 'a/b.aac', 'c.webm', 'd.FLAC']) {
      assert.ok(problems.some(problem => problem.includes(`must not ship ${file}`)), `${file}\n${problems.join('\n')}`);
    }
  } finally {
    await fs.rm(dist, { recursive: true, force: true });
  }
});

test('Finder dotfiles (.DS_Store) are ignored by the pack checks', async () => {
  await withPack('default-ja-female-v1', async (_, dir) => fs.writeFile(path.join(dir, '.DS_Store'), 'x'), async (dir, base) => {
    assert.deepEqual((await checkPack(dir)).problems, []);
  });
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-dist-dot-'));
  try {
    await fs.cp(englishPack, path.join(dist, 'audio/default-en-female-v1'), { recursive: true });
    await fs.writeFile(path.join(dist, 'audio/.DS_Store'), 'x');
    await fs.writeFile(path.join(dist, 'audio/default-en-female-v1/.DS_Store'), 'x');
    assert.deepEqual(await checkDistAudio(dist, [{ id: 'default-en-female-v1', locale: 'en' }]), []);
  } finally {
    await fs.rm(dist, { recursive: true, force: true });
  }
});
