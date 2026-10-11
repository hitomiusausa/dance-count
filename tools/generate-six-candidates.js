#!/usr/bin/env node
// six の候補を 3 本作った前例（英パックの six.wav はここから差し替えた）。有料なので二重の鍵: --yes と VOICES_ALLOW_PAID=1（段6a 修正便 I-1）。
//   VOICES_ALLOW_PAID=1 npm run voices:six-candidates -- --yes      （出力は legacy/audio/six-candidates/）

import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { checkPaidRun } from './voices/paid-guard.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(ROOT, 'legacy/audio/six-candidates');

const candidates = [
  {
    id: 'six-retry',
    label: '同じ設定で再生成',
    input: { text: 'six' },
    pitch: 0
  },
  {
    id: 'six-brighter',
    label: '少し明るい声（+2半音）',
    input: { ssml: '<speak><prosody pitch="+2st">six</prosody></speak>' },
    pitch: 0
  },
  {
    id: 'five-six-seven-context',
    label: '前後の数字を含む発音',
    input: { ssml: '<speak>five<break time="300ms"/>six<break time="300ms"/>seven</speak>' },
    pitch: 0
  }
];

export async function runSixCandidates(argv, deps = {}) {
  const env = deps.env ?? process.env;
  const log = deps.log ?? console.log;
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const write = deps.writeFile ?? writeFile;
  const makeDir = deps.mkdir ?? mkdir;
  const voiceName = env.GOOGLE_TTS_VOICE ?? 'en-US-Neural2-F';
  const languageCode = env.GOOGLE_TTS_LANGUAGE ?? 'en-US';
  const speakingRate = Number(env.GOOGLE_TTS_RATE ?? '1.25');
  log(`Google ${voiceName} で six の候補 ${candidates.length} 本 → ${path.relative(ROOT, outputDir)}`);
  const guard = checkPaidRun({ argv, env, outputDir, log });
  if (!guard.proceed) return { mode: guard.mode, exitCode: guard.exitCode };

  const token = (deps.getToken ?? (() => execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim()))(env);
  const quotaProject = (deps.getProject ?? (() => env.GOOGLE_CLOUD_QUOTA_PROJECT
    ?? execFileSync('gcloud', ['config', 'get-value', 'project'], { encoding: 'utf8' }).trim()))(env);

  await makeDir(outputDir, { recursive: true });
  for (const candidate of candidates) {
    const response = await fetchImpl('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json; charset=utf-8',
        ...(quotaProject ? { 'x-goog-user-project': quotaProject } : {})
      },
      body: JSON.stringify({
        input: candidate.input,
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 48000, speakingRate, pitch: candidate.pitch }
      })
    });
    if (!response.ok) throw new Error(`Google TTS failed for ${candidate.id}: ${response.status} ${await response.text()}`);
    const body = await response.json();
    await write(path.join(outputDir, `${candidate.id}.wav`), Buffer.from(body.audioContent, 'base64'));
    log(`Generated ${candidate.id}.wav`);
  }
  await write(path.join(outputDir, 'candidates.json'), `${JSON.stringify({
    voiceName,
    speakingRate,
    generatedAt: new Date().toISOString(),
    candidates: candidates.map(({ id, label }) => ({ id, label, file: `${id}.wav` }))
  }, null, 2)}\n`);
  log(`Candidates saved in ${outputDir}`);
  return { mode: 'generated', exitCode: 0 };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    process.exitCode = (await runSixCandidates(process.argv.slice(2))).exitCode;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
