#!/usr/bin/env node
// 英語の標準音声（default-en-female-v1）を Google Cloud TTS で作り直す古いスクリプト（英パックの再現手順として残す）。
// 有料なので二重の鍵: --yes と VOICES_ALLOW_PAID=1。出荷中のパックに書くなら --overwrite-shipped も（段6a 修正便 I-1）。
//   VOICES_ALLOW_PAID=1 npm run voices:generate -- --yes --overwrite-shipped
//   VOICES_ALLOW_PAID=1 npm run voices:build -- --yes --overwrite-shipped    （生成のあと onset を測る）
// 日本語の候補は tools/voices/generate.js（npm run voices:plan / voices:synth）を使う。

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { checkPaidRun, OVERWRITE_SHIPPED_FLAG } from './voices/paid-guard.js';
import { measureVoicePack } from './measure-voice-onsets.js';

const ROOT = path.resolve(import.meta.dirname, '..');

export async function runGenerateGoogleVoices(argv, deps = {}) {
  const env = deps.env ?? process.env;
  const log = deps.log ?? console.log;
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const write = deps.writeFile ?? writeFile;
  const makeDir = deps.mkdir ?? mkdir;
  const outputDir = path.resolve(ROOT, env.VOICE_OUTPUT_DIR ?? 'public/audio/default-en-female-v1');
  const voiceName = env.GOOGLE_TTS_VOICE ?? 'en-US-Neural2-F';
  const languageCode = env.GOOGLE_TTS_LANGUAGE ?? 'en-US';
  const speakingRate = Number(env.GOOGLE_TTS_RATE ?? '1.25');
  const words = JSON.parse(await readFile(path.join(ROOT, 'tools/voice-words.json'), 'utf8'));
  const measure = argv.includes('--measure');

  log(`Google ${voiceName}（${languageCode}・速さ ${speakingRate}）で ${Object.keys(words).length} 語を作る → ${path.relative(ROOT, outputDir)}${measure ? '（そのあと onset を測る）' : ''}`);
  const guard = checkPaidRun({ argv, env, outputDir, log });
  if (!guard.proceed) return { mode: guard.mode, exitCode: guard.exitCode };

  const token = (deps.getToken ?? getAccessToken)(env);
  const quotaProject = (deps.getProject ?? getQuotaProject)(env);
  await makeDir(outputDir, { recursive: true });
  const manifestWords = {};

  for (const [key, text] of Object.entries(words)) {
    const response = await fetchImpl('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json; charset=utf-8',
        ...(quotaProject ? { 'x-goog-user-project': quotaProject } : {})
      },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 48000, speakingRate }
      })
    });

    if (!response.ok) throw new Error(`Google TTS failed for ${key}: ${response.status} ${await response.text()}`);
    const body = await response.json();
    await write(path.join(outputDir, `${key}.wav`), Buffer.from(body.audioContent, 'base64'));
    manifestWords[key] = { file: `${key}.wav`, onsetMs: 0, gainDb: 0, needsOnsetMeasurement: true };
  }

  const manifest = {
    schemaVersion: 2,
    id: path.basename(outputDir),
    name: `Google ${voiceName}`,
    source: 'google-cloud-tts',
    locale: languageCode,
    voiceName,
    speakingRate,
    sampleRate: 48000,
    status: 'needs-onset-measurement',
    words: manifestWords
  };
  await write(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  log(`Generated ${Object.keys(words).length} files in ${outputDir}`);
  if (measure) {
    await (deps.measure ?? measureVoicePack)(outputDir, { overwriteShipped: argv.includes(OVERWRITE_SHIPPED_FLAG) });
    log('onset を測って manifest に書きました');
  } else {
    log('Next: measure each perceptual onset and update onsetMs before production use.');
  }
  return { mode: 'generated', exitCode: 0, outputDir };
}

function getAccessToken(env) {
  if (env.GOOGLE_TTS_ACCESS_TOKEN) return env.GOOGLE_TTS_ACCESS_TOKEN;
  try {
    return execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    throw new Error('Google credentials are unavailable. Run: gcloud auth application-default login');
  }
}

function getQuotaProject(env) {
  if (env.GOOGLE_CLOUD_QUOTA_PROJECT) return env.GOOGLE_CLOUD_QUOTA_PROJECT;
  if (env.GOOGLE_CLOUD_PROJECT) return env.GOOGLE_CLOUD_PROJECT;
  try {
    return execFileSync('gcloud', ['config', 'get-value', 'project'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    process.exitCode = (await runGenerateGoogleVoices(process.argv.slice(2))).exitCode;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
