// 古い英語用の生成スクリプトにも二重の鍵（--yes ＋ VOICES_ALLOW_PAID=1）と、出荷中のパックを守る --overwrite-shipped（段6a の修正便・I-1）。
// ネットワークには出ない（fetch・トークン・書き込みはすべて注入した偽物）。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runGenerateGoogleVoices } from '../../../tools/generate-google-voices.js';
import { runSixCandidates } from '../../../tools/generate-six-candidates.js';
import { measureVoicePack } from '../../../tools/measure-voice-onsets.js';
import { isShippedAudioDir } from '../../../tools/voices/paid-guard.js';
import { encodePcm16Wav } from '../../../tools/voices/wav.js';

const root = path.resolve(import.meta.dirname, '../../..');
const shipped = path.join(root, 'public/audio/default-en-female-v1');
const audio = encodePcm16Wav(new Float32Array(4800).fill(0.1), 48_000).toString('base64');

function fakes(env = {}) {
  const calls = { fetch: 0, token: 0, writes: [], logs: [] };
  return {
    calls,
    deps: {
      env,
      fetch: async () => { calls.fetch += 1; return { ok: true, json: async () => ({ audioContent: audio }) }; },
      getToken: () => { calls.token += 1; return 'fake'; },
      getProject: () => '',
      writeFile: async file => { calls.writes.push(String(file)); },
      mkdir: async () => {},
      log: line => calls.logs.push(String(line)),
      error: line => calls.logs.push(String(line))
    }
  };
}

test('isShippedAudioDir covers public/audio and its packs only', () => {
  assert.equal(isShippedAudioDir(shipped), true);
  assert.equal(isShippedAudioDir(path.join(root, 'public/audio')), true);
  assert.equal(isShippedAudioDir(path.join(root, 'legacy/audio/six-candidates')), false);
  assert.equal(isShippedAudioDir(path.join(root, 'output/voices/x')), false);
});

for (const [label, argv, env] of [
  ['no flags', [], {}],
  ['--yes without VOICES_ALLOW_PAID', ['--yes'], {}],
  ['VOICES_ALLOW_PAID without --yes', [], { VOICES_ALLOW_PAID: '1' }],
  ['VOICES_ALLOW_PAID=true', ['--yes'], { VOICES_ALLOW_PAID: 'true' }]
]) {
  test(`voices:generate (${label}) only prints the plan and exits 0`, async () => {
    const { calls, deps } = fakes(env);
    const result = await runGenerateGoogleVoices(argv, deps);
    assert.equal(result.mode, 'plan');
    assert.equal(result.exitCode, 0);
    assert.deepEqual([calls.fetch, calls.token, calls.writes.length], [0, 0, 0]);
    assert.match(calls.logs.join('\n'), /VOICES_ALLOW_PAID=1/);
  });
}

test('voices:generate with both keys still refuses the shipped English pack without --overwrite-shipped', async () => {
  const { calls, deps } = fakes({ VOICES_ALLOW_PAID: '1' });
  const result = await runGenerateGoogleVoices(['--yes'], deps);
  assert.equal(result.mode, 'refused');
  assert.notEqual(result.exitCode, 0);
  assert.deepEqual([calls.fetch, calls.token, calls.writes.length], [0, 0, 0]);
  assert.match(calls.logs.join('\n'), /--overwrite-shipped/);
});

test('voices:generate with both keys writes 12 files to a non-shipped folder', async () => {
  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-legacy-'));
  try {
    const { calls, deps } = fakes({ VOICES_ALLOW_PAID: '1', VOICE_OUTPUT_DIR: out });
    const result = await runGenerateGoogleVoices(['--yes'], deps);
    assert.equal(result.mode, 'generated');
    assert.equal(calls.fetch, 12);
    assert.equal(calls.writes.length, 13);
    assert.ok(calls.writes.every(file => file.startsWith(out)));
  } finally {
    await fs.rm(out, { recursive: true, force: true });
  }
});

test('voices:generate --overwrite-shipped is the only way to target the shipped pack', async () => {
  const { calls, deps } = fakes({ VOICES_ALLOW_PAID: '1' });
  const result = await runGenerateGoogleVoices(['--yes', '--overwrite-shipped'], deps);
  assert.equal(result.mode, 'generated');
  assert.equal(calls.fetch, 12);
  assert.ok(calls.writes.every(file => file.startsWith(shipped)));
});

test('voices:build (--measure) in plan mode does not measure or write', async () => {
  const { calls, deps } = fakes();
  let measured = 0;
  const result = await runGenerateGoogleVoices(['--measure'], { ...deps, measure: async () => { measured += 1; } });
  assert.equal(result.mode, 'plan');
  assert.equal(measured, 0);
  assert.equal(calls.writes.length, 0);
});

test('voices:six-candidates needs both keys and writes only under legacy/', async () => {
  const blocked = fakes();
  assert.equal((await runSixCandidates(['--yes'], blocked.deps)).mode, 'plan');
  assert.deepEqual([blocked.calls.fetch, blocked.calls.token, blocked.calls.writes.length], [0, 0, 0]);
  const allowed = fakes({ VOICES_ALLOW_PAID: '1' });
  const result = await runSixCandidates(['--yes'], allowed.deps);
  assert.equal(result.mode, 'generated');
  assert.equal(allowed.calls.fetch, 3);
  assert.ok(allowed.calls.writes.every(file => file.startsWith(path.join(root, 'legacy/audio/six-candidates'))));
});

test('measureVoicePack refuses to rewrite the shipped manifest unless asked, but can measure without writing', async () => {
  await assert.rejects(measureVoicePack(shipped), /--overwrite-shipped/);
  const before = await fs.readFile(path.join(shipped, 'manifest.json'), 'utf8');
  const { measurements, written } = await measureVoicePack(shipped, { write: false });
  assert.equal(written, false);
  assert.equal(measurements.slow.onsetMs, 30);
  assert.equal(await fs.readFile(path.join(shipped, 'manifest.json'), 'utf8'), before);
});
