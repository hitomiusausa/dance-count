import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { measureOnset } from '../src/v2/onset-detector.js';
import { recordingTrimPlan, REFERENCE_VOICE_TIMING } from '../src/v2/recording-normalizer.js';

const file = process.argv[2];
if (!file) throw new Error('Usage: node tools/audit-recorded-voice-pack.js <voice-pack.json>');
const pack = JSON.parse(await fs.readFile(file, 'utf8'));
if (pack.type !== 'dance-count-recorded-voice-pack' || !pack.words) throw new Error('録音音声パックではありません');

const sampleRate = 48_000;
const rows = [];
for (const [key, reference] of Object.entries(REFERENCE_VOICE_TIMING)) {
  const word = pack.words[key];
  if (!word?.dataBase64) {
    rows.push({ key, status: 'missing' });
    continue;
  }
  const encoded = Buffer.from(word.dataBase64, 'base64');
  const decoded = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-f', 'f32le', '-ac', '1', '-ar', String(sampleRate), 'pipe:1'
  ], { input: encoded, maxBuffer: 64 * 1024 * 1024 });
  if (decoded.status !== 0) throw new Error(`${key}をデコードできません: ${decoded.stderr.toString()}`);
  const samples = new Float32Array(decoded.stdout.buffer, decoded.stdout.byteOffset, decoded.stdout.byteLength / 4);
  const detected = measureOnset(samples, sampleRate, { sustainMs: 50, relativeThreshold: 0.04, absoluteThreshold: 0.002 });
  const plan = recordingTrimPlan(key, detected.onsetMs, sampleRate);
  const activeEndMs = findActiveEndMs(samples, sampleRate, detected.threshold);
  const targetEndMs = plan.startMs + plan.durationMs;
  rows.push({
    key,
    sourceMs: Math.round(samples.length / sampleRate * 1000),
    detectedOnsetMs: detected.onsetMs,
    removedHeadMs: Math.round(plan.startMs),
    targetMs: reference.durationMs,
    activeEndMs,
    tailOverrunMs: Math.max(0, activeEndMs - targetEndMs),
    tailPaddingMs: Math.max(0, targetEndMs - activeEndMs),
    status: activeEndMs > targetEndMs + 20 ? 'tail-risk' : 'ok'
  });
}

console.table(rows);
const missing = rows.filter(row => row.status === 'missing').length;
const tailRisks = rows.filter(row => row.status === 'tail-risk').length;
console.log(JSON.stringify({ words: rows.length, missing, tailRisks, ok: missing === 0 && tailRisks === 0 }));

function findActiveEndMs(samples, rate, threshold) {
  const windowSize = Math.max(1, Math.round(rate * 0.005));
  let lastActiveFrame = 0;
  for (let start = 0; start < samples.length; start += windowSize) {
    const end = Math.min(samples.length, start + windowSize);
    let sumSquares = 0;
    for (let index = start; index < end; index += 1) sumSquares += samples[index] ** 2;
    if (Math.sqrt(sumSquares / (end - start)) >= threshold) lastActiveFrame = end;
  }
  return Math.round(lastActiveFrame / rate * 1000);
}
