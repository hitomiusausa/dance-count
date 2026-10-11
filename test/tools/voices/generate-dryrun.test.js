import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runGenerate, loadWords } from '../../../tools/voices/generate.js';
import { estimateCost, PRICING } from '../../../tools/voices/pricing.js';
import { REQUIRED_VOICE_KEYS } from '../../../src/engine/recorded-voice-pack.js';
import { COUNT_VOCABULARIES } from '../../../src/engine/count-vocabularies.js';

function spies() {
  const calls = { fetch: 0, token: 0, writes: 0, logs: [] };
  return {
    calls,
    deps: {
      env: {},
      fetch: async () => { calls.fetch += 1; throw new Error('network must not be used'); },
      getToken: () => { calls.token += 1; return 'never'; },
      writeFile: async () => { calls.writes += 1; },
      mkdir: async () => { calls.writes += 1; },
      log: line => calls.logs.push(String(line)),
      error: line => calls.logs.push(String(line))
    }
  };
}

test('default run is a dry run: no fetch, no token, no writes, and a cost estimate', async () => {
  const { calls, deps } = spies();
  const result = await runGenerate([], deps);
  assert.equal(result.mode, 'plan');
  assert.equal(result.exitCode, 0);
  assert.deepEqual([calls.fetch, calls.token, calls.writes], [0, 0, 0]);
  const text = calls.logs.join('\n');
  assert.match(text, /ja-JP-Neural2-B/);
  assert.match(text, /無料枠内なら ¥0/);
  assert.match(text, /未確認/);
});

test('--dry-run wins even with --yes', async () => {
  const { calls, deps } = spies();
  deps.env = { VOICES_ALLOW_PAID: '1' };
  const result = await runGenerate(['--yes', '--dry-run'], deps);
  assert.equal(result.mode, 'plan');
  assert.deepEqual([calls.fetch, calls.token, calls.writes], [0, 0, 0]);
});

test('--yes alone stops for Google without VOICES_ALLOW_PAID=1', async () => {
  const { calls, deps } = spies();
  const result = await runGenerate(['--yes'], deps);
  assert.equal(result.mode, 'blocked');
  assert.notEqual(result.exitCode, 0);
  assert.deepEqual([calls.fetch, calls.token, calls.writes], [0, 0, 0]);
  assert.match(calls.logs.join('\n'), /VOICES_ALLOW_PAID=1/);
});

test('VOICES_ALLOW_PAID must be exactly "1"', async () => {
  const { calls, deps } = spies();
  deps.env = { VOICES_ALLOW_PAID: 'true' };
  const result = await runGenerate(['--yes'], deps);
  assert.equal(result.mode, 'blocked');
  assert.equal(calls.fetch, 0);
});

test('the estimate counts every character of the 12 words (SSML included when present)', async () => {
  const { deps } = spies();
  const result = await runGenerate([], deps);
  const words = await loadWords();
  const expected = REQUIRED_VOICE_KEYS.reduce((sum, key) => sum + [...(words[key].ssml ?? words[key].text)].length, 0);
  assert.equal(result.plan.totalChars, expected);
  assert.equal(result.plan.rows.length, 12);
});

test('words.ja-JP.json follows REQUIRED_VOICE_KEYS and the vocabulary text (D29)', async () => {
  const raw = JSON.parse(await fs.readFile(path.resolve(import.meta.dirname, '../../../tools/voices/words.ja-JP.json'), 'utf8'));
  assert.deepEqual(Object.keys(raw), [...REQUIRED_VOICE_KEYS]);
  for (const key of REQUIRED_VOICE_KEYS) {
    const entry = raw[key];
    if (entry.ssml) assert.ok(entry.note && entry.note.trim(), `${key}: ssml needs a note`);
    else assert.equal(entry.text, COUNT_VOCABULARIES['ja-JP'].prompts[key][0], key);
  }
});

test('estimateCost: free tier line is ¥0 and the paid line uses the voice tier price', () => {
  const neural = estimateCost('google', 'ja-JP-Neural2-B', 1_000_000);
  assert.equal(neural.tier, 'neural2');
  assert.equal(neural.paidUsd, PRICING.google.neural2.usdPerMillion);
  assert.equal(neural.verified, false);
  assert.equal(estimateCost('google', 'ja-JP-Chirp3-HD-Aoede', 1_000_000).tier, 'chirp3-hd');
  assert.equal(estimateCost('google', 'ja-JP-Standard-A', 10).tier, 'standard');
  assert.equal(estimateCost('voicevox', '2', 100).paidUsd, 0);
  assert.equal(estimateCost('recorded', 'x', 100).paidUsd, 0);
});

test('google provider refuses to synthesize without allowPaid even if called directly', async () => {
  const { createGoogleProvider } = await import('../../../tools/voices/providers/google.js');
  let fetches = 0;
  const provider = createGoogleProvider({ voice: 'ja-JP-Neural2-B', lang: 'ja-JP', rate: 1, fetch: async () => { fetches += 1; }, getToken: () => 't' });
  await assert.rejects(provider.synthesize({ key: 'one', text: 'いち' }), /VOICES_ALLOW_PAID/);
  assert.equal(fetches, 0);
});

test('with both keys, google synthesis goes through the injected fetch and writes raw files', async () => {
  const { encodePcm16Wav } = await import('../../../tools/voices/wav.js');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-gen-'));
  try {
    const requests = [];
    const audio = encodePcm16Wav(new Float32Array(4800).fill(0.1), 48_000).toString('base64');
    const result = await runGenerate(['--yes', '--out', dir], {
      env: { VOICES_ALLOW_PAID: '1' },
      fetch: async (url, init) => { requests.push({ url, body: JSON.parse(init.body), auth: init.headers.authorization }); return { ok: true, json: async () => ({ audioContent: audio }) }; },
      getToken: () => 'fake-token', getProject: () => '', log: () => {}, error: () => {}
    });
    assert.equal(result.mode, 'synth');
    assert.equal(requests.length, 12);
    assert.equal(requests[0].auth, 'Bearer fake-token');
    assert.deepEqual(requests[0].body.audioConfig, { audioEncoding: 'LINEAR16', sampleRateHertz: 48_000, speakingRate: 1 });
    assert.equal(requests[0].body.voice.name, 'ja-JP-Neural2-B');
    const raw = JSON.parse(await fs.readFile(path.join(dir, 'raw.json'), 'utf8'));
    assert.equal(raw.provider, 'google-cloud-tts');
    assert.deepEqual(Object.keys(raw.words), [...REQUIRED_VOICE_KEYS]);
    assert.ok((await fs.stat(path.join(dir, 'one.wav'))).size > 44);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('voicevox is not contacted without --yes', async () => {
  const { calls, deps } = spies();
  const result = await runGenerate(['--provider', 'voicevox', '--voice', '2'], deps);
  assert.equal(result.mode, 'plan');
  assert.equal(calls.fetch, 0);
  assert.match(calls.logs.join('\n'), /クレジット/);
});
