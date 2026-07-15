#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(ROOT, 'public/audio/six-candidates');
const voiceName = process.env.GOOGLE_TTS_VOICE ?? 'en-US-Neural2-F';
const languageCode = process.env.GOOGLE_TTS_LANGUAGE ?? 'en-US';
const speakingRate = Number(process.env.GOOGLE_TTS_RATE ?? '1.25');
const token = execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore']
}).trim();
const quotaProject = process.env.GOOGLE_CLOUD_QUOTA_PROJECT
  ?? execFileSync('gcloud', ['config', 'get-value', 'project'], { encoding: 'utf8' }).trim();

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

await mkdir(outputDir, { recursive: true });

for (const candidate of candidates) {
  const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json; charset=utf-8',
      'x-goog-user-project': quotaProject
    },
    body: JSON.stringify({
      input: candidate.input,
      voice: { languageCode, name: voiceName },
      audioConfig: {
        audioEncoding: 'LINEAR16',
        sampleRateHertz: 48000,
        speakingRate,
        pitch: candidate.pitch
      }
    })
  });
  if (!response.ok) throw new Error(`Google TTS failed for ${candidate.id}: ${response.status} ${await response.text()}`);
  const body = await response.json();
  await writeFile(path.join(outputDir, `${candidate.id}.wav`), Buffer.from(body.audioContent, 'base64'));
  console.log(`Generated ${candidate.id}.wav`);
}

await writeFile(path.join(outputDir, 'candidates.json'), `${JSON.stringify({
  voiceName,
  speakingRate,
  generatedAt: new Date().toISOString(),
  candidates: candidates.map(({ id, label }) => ({ id, label, file: `${id}.wav` }))
}, null, 2)}\n`);

console.log(`Candidates saved in ${outputDir}`);
