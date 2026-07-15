#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const outputDir = path.resolve(ROOT, process.env.VOICE_OUTPUT_DIR ?? 'public/audio/default-en-female-v1');
const voiceName = process.env.GOOGLE_TTS_VOICE ?? 'en-US-Neural2-F';
const languageCode = process.env.GOOGLE_TTS_LANGUAGE ?? 'en-US';
const speakingRate = Number(process.env.GOOGLE_TTS_RATE ?? '1.25');
const words = JSON.parse(await readFile(path.join(ROOT, 'tools/voice-words.json'), 'utf8'));
const token = getAccessToken();
const quotaProject = getQuotaProject();

await mkdir(outputDir, { recursive: true });
const manifestWords = {};

for (const [key, text] of Object.entries(words)) {
  const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json; charset=utf-8',
      ...(quotaProject ? { 'x-goog-user-project': quotaProject } : {})
    },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig: {
        audioEncoding: 'LINEAR16',
        sampleRateHertz: 48000,
        speakingRate
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Google TTS failed for ${key}: ${response.status} ${await response.text()}`);
  }
  const body = await response.json();
  await writeFile(path.join(outputDir, `${key}.wav`), Buffer.from(body.audioContent, 'base64'));
  manifestWords[key] = {
    file: `${key}.wav`,
    onsetMs: 0,
    gainDb: 0,
    needsOnsetMeasurement: true
  };
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
await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${Object.keys(words).length} files in ${outputDir}`);
console.log('Next: measure each perceptual onset and update onsetMs before production use.');

function getAccessToken() {
  if (process.env.GOOGLE_TTS_ACCESS_TOKEN) return process.env.GOOGLE_TTS_ACCESS_TOKEN;
  try {
    return execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    throw new Error(
      'Google credentials are unavailable. Set GOOGLE_TTS_ACCESS_TOKEN or run: gcloud auth application-default login'
    );
  }
}

function getQuotaProject() {
  if (process.env.GOOGLE_CLOUD_QUOTA_PROJECT) return process.env.GOOGLE_CLOUD_QUOTA_PROJECT;
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  try {
    return execFileSync('gcloud', ['config', 'get-value', 'project'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}
