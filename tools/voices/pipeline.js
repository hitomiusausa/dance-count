// 日本語標準音声の処理経路（Ruling 65-5）: モノ化・48kHz 化 → 頭詰め → 尻尾 → 音量合わせ（パック全体で 1 係数）→ 書き出した WAV を再実測 → manifest。
// ここは純粋関数の列（ffmpeg のリサンプルだけ外部プロセス。注入で差し替え可）。CLI は process.js。
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { measureOnset } from '../../src/engine/onset-detector.js';
import { encodePcm16Wav, parsePcm16Wav } from './wav.js';

export const TARGET_SAMPLE_RATE = 48_000;   // 英パックと同じ
export const TARGET_ONSET_MS = 40;          // 頭の無音をここまで詰める（英パックの中央値 40ms）
export const HEAD_FADE_MS = 5;              // recording-normalizer と同じ
export const TAIL_FADE_MS = 15;             // recording-normalizer と同じ
export const TAIL_KEEP_MS = 60;             // 発声の終わり（threshold 以下に落ちた所）から残す尻尾
export const MAX_WORD_MS = 900;             // これより長い語は警告（英パック最長 745ms）
export const MIN_WORD_MS = 250;             // これより短い語は警告（実測で見直す）
export const LOUDNESS_REF = 'default-en-female-v1';   // 英パックの peakRms の中央値に合わせる
export const PEAK_CEILING_DBFS = -1;        // 合わせた後にこれを超える語は下げる（クリップ防止）
export const PIPELINE_VERSION = 'ja-v1';
export const ONSET_METHOD = 'rms-auto-v1';  // measureOnset の既定パラメータ（変えない＝Ruling 66-3）
const ACTIVE_WINDOW_MS = 5;

const root = path.resolve(import.meta.dirname, '../..');
export const ENGLISH_PACK_DIR = path.join(root, 'public/audio', LOUDNESS_REF);

export const dbfs = linear => 20 * Math.log10(Math.max(linear, 1e-12));
export const fromDbfs = db => 10 ** (db / 20);
const msToSamples = (ms, rate) => Math.round(ms / 1000 * rate);
const samplesToMs = (count, rate) => Math.round(count / rate * 1000);

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) throw new Error('median of nothing');
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function peakOf(samples) {
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  return peak;
}

// 発声の終わり（最後に threshold 以上だった 5ms 窓の終わり）。audit-all-dance-timing.js と同じ測り方。
export function activeEndSample(samples, rate, threshold) {
  const windowSize = Math.max(1, Math.round(rate * ACTIVE_WINDOW_MS / 1000));
  let lastActive = 0;
  for (let start = 0; start < samples.length; start += windowSize) {
    const end = Math.min(samples.length, start + windowSize);
    let sumSquares = 0;
    for (let index = start; index < end; index += 1) sumSquares += samples[index] ** 2;
    if (Math.sqrt(sumSquares / (end - start)) >= threshold) lastActive = end;
  }
  return lastActive;
}

let ffmpegChecked;
export function hasFfmpeg() {
  if (ffmpegChecked === undefined) ffmpegChecked = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
  return ffmpegChecked;
}

export function resampleWithFfmpeg(samples, fromRate, toRate = TARGET_SAMPLE_RATE) {
  if (!hasFfmpeg()) throw new Error('ffmpeg が見つかりません（brew install ffmpeg）。48kHz 以外の音は ffmpeg で 48kHz に揃えます');
  const input = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'f32le', '-ar', String(fromRate), '-ac', '1', '-i', 'pipe:0',
    '-f', 'f32le', '-ar', String(toRate), '-ac', '1', 'pipe:1'], { input, maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`ffmpeg のリサンプルに失敗: ${result.stderr?.toString()}`);
  const out = result.stdout;
  return new Float32Array(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength));
}

// (2)(3) 頭を TARGET_ONSET_MS に詰め（足りなければ無音を足す）、発声の終わり＋TAIL_KEEP_MS で切ってフェード。
export function trimWord(samples, rate) {
  let onset;
  try {
    onset = measureOnset(samples, rate);
  } catch {
    return { problem: 'silent' };
  }
  const onsetSample = msToSamples(onset.onsetMs, rate);
  const targetSample = msToSamples(TARGET_ONSET_MS, rate);
  const start = onsetSample - targetSample;
  const end = Math.min(samples.length, activeEndSample(samples, rate, onset.threshold) + msToSamples(TAIL_KEEP_MS, rate));
  const padding = Math.max(0, -start);
  const out = new Float32Array(padding + end - Math.max(0, start));
  out.set(samples.subarray(Math.max(0, start), end), padding);
  const headFade = Math.min(out.length, msToSamples(HEAD_FADE_MS, rate));
  for (let index = 0; index < headFade; index += 1) out[index] *= index / headFade;
  const tailFade = Math.min(out.length, msToSamples(TAIL_FADE_MS, rate));
  for (let index = 0; index < tailFade; index += 1) out[out.length - 1 - index] *= index / tailFade;
  return { samples: out, sourceOnsetMs: onset.onsetMs, peakRms: onset.peakRms };
}

export function measureWord(samples, rate) {
  const onset = measureOnset(samples, rate);
  const activeEndMs = samplesToMs(activeEndSample(samples, rate, onset.threshold), rate);
  return {
    onsetMs: onset.onsetMs,
    durationMs: samplesToMs(samples.length, rate),
    peakRms: onset.peakRms,
    peak: peakOf(samples),
    activeEndMs,
    postOnsetMs: activeEndMs - onset.onsetMs
  };
}

/**
 * rawWords: { key: { samples: Float32Array（モノ）, sampleRate } }
 * options.refPeakRms: 音量の基準（英パックの peakRms の中央値。referencePeakRms() で得る）
 * options.resample: (samples, fromRate, toRate) => Float32Array（既定 ffmpeg）
 * 返り値: { gain, gainDb, words: { key: { samples, wav, sampleRate, onsetMs, durationMs, peakRms, peak, postOnsetMs, sourceOnsetMs, limitedDb, problem? } }, problems }
 */
export function processWords(rawWords, { refPeakRms, resample = resampleWithFfmpeg } = {}) {
  if (!(refPeakRms > 0)) throw new Error('refPeakRms が要ります（referencePeakRms() で英パックから得る）');
  const words = {};
  const problems = [];
  const trimmed = {};
  for (const [key, raw] of Object.entries(rawWords)) {
    const samples = raw.sampleRate === TARGET_SAMPLE_RATE ? raw.samples : resample(raw.samples, raw.sampleRate, TARGET_SAMPLE_RATE);
    const result = trimWord(samples, TARGET_SAMPLE_RATE);
    if (result.problem) {
      words[key] = { problem: result.problem };
      problems.push({ key, problem: result.problem });
      continue;
    }
    trimmed[key] = result;
  }

  const keys = Object.keys(trimmed);
  const gain = keys.length ? refPeakRms / median(keys.map(key => trimmed[key].peakRms)) : 1;
  const ceiling = fromDbfs(PEAK_CEILING_DBFS);
  for (const key of keys) {
    const source = trimmed[key].samples;
    const peak = peakOf(source) * gain;
    const wordGain = peak > ceiling ? gain * ceiling / peak : gain;
    // int16 の丸めで天井をわずかに越えないよう、頭打ちの時は 1 LSB 下げる
    const scaled = Float32Array.from(source, value => value * wordGain * (peak > ceiling ? (32767 - 1) / 32767 : 1));
    const wav = encodePcm16Wav(scaled, TARGET_SAMPLE_RATE);
    const written = parsePcm16Wav(wav).samples;  // (5) 書き出した物をもう一度測る
    const measured = measureWord(written, TARGET_SAMPLE_RATE);
    const word = {
      samples: written,
      wav,
      sampleRate: TARGET_SAMPLE_RATE,
      ...measured,
      sourceOnsetMs: trimmed[key].sourceOnsetMs,
      limitedDb: peak > ceiling ? Number(dbfs(peak / ceiling).toFixed(2)) : 0
    };
    if (measured.durationMs < MIN_WORD_MS) word.problem = 'too-short';
    else if (measured.durationMs > MAX_WORD_MS) word.problem = 'too-long';
    if (word.problem) problems.push({ key, problem: word.problem });
    words[key] = word;
  }
  return { gain, gainDb: Number(dbfs(gain).toFixed(2)), words, problems };
}

// (6) manifest。英パックの欄＋段6の欄（Ruling 68-1）。gainDb は常に 0（音量は波形に焼く）。
export function buildManifest({ id, name, provider, locale, voiceName, speakingRate, credit, generatedAt, measuredAt = new Date().toISOString(), words, overrides = {} }) {
  const manifestWords = {};
  for (const [key, word] of Object.entries(words)) {
    if (!word.wav) continue;
    const entry = {
      file: `${key}.wav`,
      onsetMs: word.onsetMs,
      gainDb: 0,
      needsOnsetMeasurement: false,
      onsetMethod: ONSET_METHOD,
      durationMs: word.durationMs,
      peakRms: Number(word.peakRms.toFixed(4))
    };
    const override = overrides[key];
    if (override?.onsetOverrideMs !== undefined) {
      if (!override.note?.trim()) throw new Error(`${key}: onsetOverrideMs には note（理由）が要ります`);
      entry.onsetMs = override.onsetOverrideMs;
      entry.onsetOverrideMs = override.onsetOverrideMs;
      entry.onsetMethod = 'manual';
      entry.note = override.note;
    }
    manifestWords[key] = entry;
  }
  const manifest = {
    schemaVersion: 2,
    id,
    name,
    source: provider,
    locale,
    voiceName,
    speakingRate,
    sampleRate: TARGET_SAMPLE_RATE,
    status: 'auto-onset-measured',
    provider,
    generatedAt,
    pipeline: { version: PIPELINE_VERSION, targetOnsetMs: TARGET_ONSET_MS, loudnessRef: LOUDNESS_REF },
    gate: { status: 'pending' },
    words: manifestWords,
    onsetMeasuredAt: measuredAt
  };
  if (credit) manifest.credit = credit;
  if (!generatedAt) delete manifest.generatedAt;
  return manifest;
}

export async function referencePeakRms(packDir = ENGLISH_PACK_DIR) {
  const manifest = JSON.parse(await fs.readFile(path.join(packDir, 'manifest.json'), 'utf8'));
  const values = [];
  for (const word of Object.values(manifest.words)) {
    const wav = parsePcm16Wav(await fs.readFile(path.join(packDir, word.file)));
    values.push(measureOnset(wav.samples, wav.sampleRate).peakRms);
  }
  return median(values);
}
