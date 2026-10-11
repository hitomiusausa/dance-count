import fs from 'node:fs/promises';
import path from 'node:path';
import { compileRhythm } from '../src/engine/rhythm-compiler.js';
import { measureOnset } from '../src/engine/onset-detector.js';
import { parsePcm16Wav } from './measure-voice-onsets.js';

const root = path.resolve(import.meta.dirname, '..');
const packDir = path.join(root, 'public/audio/default-en-female-v1');
const outputDir = path.join(root, 'legacy/audio/subdivision-review');
const manifest = JSON.parse(await fs.readFile(path.join(packDir, 'manifest.json'), 'utf8'));
const sampleRate = 48_000;
const fadeMs = 12;
const preRollMs = 180;
const repetitions = 2;
const cases = [
  { id: 'chacha-practice', danceId: 'chacha', dance: 'チャチャチャ', counts: '234&1', bpm: 96 },
  { id: 'chacha-fast', danceId: 'chacha', dance: 'チャチャチャ', counts: '234&1', bpm: 128 },
  { id: 'samba-practice', danceId: 'samba', dance: 'サンバ', counts: '1a2', bpm: 80 },
  { id: 'samba-fast', danceId: 'samba', dance: 'サンバ', counts: '1a2', bpm: 104 },
  { id: 'jive-practice', danceId: 'jive', dance: 'ジャイブ', counts: '123a45a6', bpm: 136 },
  { id: 'jive-fast', danceId: 'jive', dance: 'ジャイブ', counts: '123a45a6', bpm: 176 }
];

const words = await loadWords();
await fs.mkdir(outputDir, { recursive: true });
const results = [];

for (const item of cases) {
  const compiled = compileRhythm({ danceId: item.danceId, counts: item.counts });
  const scheduled = repeatedEvents(compiled, repetitions);
  const current = render(scheduled, compiled.durationTicks, item.bpm, 'current');
  const faded = render(scheduled, compiled.durationTicks, item.bpm, 'fade');
  const currentFile = `${item.id}-current.wav`;
  const fadedFile = `${item.id}-fade.wav`;
  await fs.writeFile(path.join(outputDir, currentFile), encodePcm16Wav(current.samples, sampleRate));
  await fs.writeFile(path.join(outputDir, fadedFile), encodePcm16Wav(faded.samples, sampleRate));
  results.push({
    ...item,
    repetitions,
    fadeMs,
    current: { file: currentFile, ...current.metrics },
    fade: { file: fadedFile, ...faded.metrics }
  });
}

const review = { generatedAt: new Date().toISOString(), sampleRate, results };
await fs.writeFile(path.join(outputDir, 'review.json'), `${JSON.stringify(review, null, 2)}\n`);
console.table(results.map(item => ({
  種目: item.dance,
  BPM: item.bpm,
  パターン: item.counts,
  現状最大重なりms: item.current.maxOverlapMs,
  現状ピーク: item.current.peak,
  現状クリップsample: item.current.clippedSamples,
  フェード対象: item.fade.shortenedEvents,
  フェード後重なりms: item.fade.maxOverlapMs,
  フェード後ピーク: item.fade.peak,
  フェード後クリップsample: item.fade.clippedSamples
})));
console.log(path.join(outputDir, 'review.json'));

async function loadWords() {
  const loaded = {};
  for (const [key, item] of Object.entries(manifest.words)) {
    const wav = parsePcm16Wav(await fs.readFile(path.join(packDir, item.file)));
    if (wav.sampleRate !== sampleRate) throw new Error(`${key}: sampleRateが${sampleRate}ではありません`);
    const onset = measureOnset(wav.samples, wav.sampleRate);
    loaded[key] = {
      samples: wav.samples,
      onsetSamples: Math.round(item.onsetMs / 1000 * sampleRate),
      activeEndSamples: activeEndSample(wav.samples, wav.sampleRate, onset.threshold)
    };
  }
  return loaded;
}

function repeatedEvents(compiled, count) {
  const events = [];
  for (let repetition = 0; repetition < count; repetition += 1) {
    for (const event of compiled.events.filter(value => value.voiceKey)) {
      events.push({ ...event, absoluteTick: event.absoluteTick + repetition * compiled.durationTicks });
    }
  }
  return events;
}

function render(events, durationTicks, bpm, policy) {
  const tickSeconds = 60 / bpm / 960;
  const totalSeconds = preRollMs / 1000 + durationTicks * repetitions * tickSeconds + 0.8;
  const mix = new Float32Array(Math.ceil(totalSeconds * sampleRate));
  const fadeSamples = Math.round(fadeMs / 1000 * sampleRate);
  let maxOverlapMs = 0;
  let totalOverlapMs = 0;
  let shortenedEvents = 0;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const word = words[event.voiceKey];
    const targetSample = Math.round((preRollMs / 1000 + event.absoluteTick * tickSeconds) * sampleRate);
    const outputStart = targetSample - word.onsetSamples;
    const next = events[index + 1];
    const nextTarget = next ? Math.round((preRollMs / 1000 + next.absoluteTick * tickSeconds) * sampleRate) : Infinity;
    const naturalActiveEnd = outputStart + word.activeEndSamples;
    const overlapSamples = Math.max(0, naturalActiveEnd - nextTarget);
    const overlapMs = overlapSamples / sampleRate * 1000;
    maxOverlapMs = Math.max(maxOverlapMs, overlapMs);
    totalOverlapMs += overlapMs;
    const shouldFade = policy === 'fade' && Number.isFinite(nextTarget) && overlapSamples > 0;
    if (shouldFade) shortenedEvents += 1;

    for (let sourceIndex = 0; sourceIndex < word.samples.length; sourceIndex += 1) {
      const outputIndex = outputStart + sourceIndex;
      if (outputIndex < 0 || outputIndex >= mix.length) continue;
      if (shouldFade && outputIndex >= nextTarget) break;
      let gain = 1;
      if (shouldFade && outputIndex > nextTarget - fadeSamples) gain = Math.max(0, (nextTarget - outputIndex) / fadeSamples);
      mix[outputIndex] += word.samples[sourceIndex] * gain;
    }
  }

  let peak = 0;
  let clippedSamples = 0;
  for (const sample of mix) {
    peak = Math.max(peak, Math.abs(sample));
    if (Math.abs(sample) > 1) clippedSamples += 1;
  }
  return {
    samples: mix,
    metrics: {
      maxOverlapMs: policy === 'fade' ? 0 : Math.round(maxOverlapMs),
      totalOverlapMs: policy === 'fade' ? 0 : Math.round(totalOverlapMs),
      shortenedEvents,
      peak: Number(peak.toFixed(3)),
      clippedSamples
    }
  };
}

function activeEndSample(samples, rate, threshold) {
  const windowSize = Math.max(1, Math.round(rate * 0.005));
  let lastActive = 0;
  for (let start = 0; start < samples.length; start += windowSize) {
    const end = Math.min(samples.length, start + windowSize);
    let sumSquares = 0;
    for (let index = start; index < end; index += 1) sumSquares += samples[index] ** 2;
    if (Math.sqrt(sumSquares / (end - start)) >= threshold) lastActive = end;
  }
  return lastActive;
}

function encodePcm16Wav(samples, rate) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.max(-1, Math.min(1, samples[index]));
    buffer.writeInt16LE(Math.round(value * (value < 0 ? 32768 : 32767)), 44 + index * 2);
  }
  return buffer;
}
