#!/usr/bin/env node
// 音声パック 1 つの検査（Ruling 68-2）。テスト・check-dist・voices:check で共有する。
//   npm run voices:check -- public/audio/default-en-female-v1
//   npm run voices:check -- output/voices/<候補> --allow-pending   （聴感ゲート前の候補）
// 標準音声の正本は src/app/voices/standard-voices.json（Ruling 68-3。段4の STANDARD_VOICES もこれを読む）。
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REQUIRED_VOICE_KEYS } from '../../src/engine/recorded-voice-pack.js';
import { parsePcm16Wav } from './wav.js';
import { MAX_WORD_MS, MIN_WORD_MS, PEAK_CEILING_DBFS, TARGET_SAMPLE_RATE, dbfs, peakOf } from './pipeline.js';

const root = path.resolve(import.meta.dirname, '../..');
export const STANDARD_VOICES_PATH = path.join(root, 'src/app/voices/standard-voices.json');
// 英パックは gate 欄が無いまま既承認とみなす唯一の例外（作り直す日に gate を書いて例外を消す）
export const GRANDFATHERED_PACK_ID = 'default-en-female-v1';
const ONSET_METHODS = new Set(['rms-auto-v1', 'manual']);
// 音の拡張子。dist では audio/<standard-voices.json の ID>/ の下にしか置けない（段6a 修正便 I-2）
export const AUDIO_EXT = /\.(wav|mp3|m4a|ogg|aac|webm|flac)$/i;
// Finder の .DS_Store などの隠しファイルは検査で数えない
const isDotfile = name => name.startsWith('.');
// 鍵の漏れ（Ruling 65-3・68-3）: Google API キー・サービスアカウント鍵・OAuth アクセストークン
export const SECRET_PATTERNS = Object.freeze([
  { name: 'Google API key (AIza…)', pattern: /AIza[0-9A-Za-z_-]{20,}/ },
  { name: 'service account "private_key"', pattern: /"private_key"\s*:/ },
  { name: 'OAuth access token (ya29.…)', pattern: /ya29\.[0-9A-Za-z_-]{4,}/ }
]);

export function findSecrets(text) {
  return SECRET_PATTERNS.filter(item => item.pattern.test(text)).map(item => item.name);
}

export async function loadStandardVoices(file = STANDARD_VOICES_PATH) {
  const voices = JSON.parse(await fs.readFile(file, 'utf8'));
  if (!Array.isArray(voices) || !voices.length) throw new Error(`${file}: 配列で 1 行以上`);
  const seen = new Set();
  for (const voice of voices) {
    if (typeof voice?.id !== 'string' || !/^[a-z0-9-]+$/.test(voice.id) || typeof voice.locale !== 'string' || !voice.locale) {
      throw new Error(`${file}: 各行は { id, locale }: ${JSON.stringify(voice)}`);
    }
    if (seen.has(voice.id)) throw new Error(`${file}: id が重複: ${voice.id}`);
    seen.add(voice.id);
  }
  return voices;
}

export async function checkPack(packDir, { expectedId = path.basename(packDir), requireApproved = true } = {}) {
  const problems = [];
  const label = expectedId;
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(path.join(packDir, 'manifest.json'), 'utf8'));
  } catch (error) {
    return { ok: false, problems: [`${label}: manifest.json を読めません (${error.message})`] };
  }
  if (manifest.schemaVersion !== 2) problems.push(`${label}: schemaVersion が 2 ではありません`);
  if (manifest.id !== expectedId) problems.push(`${label}: manifest の id "${manifest.id}" がフォルダ名と違います`);
  if (manifest.sampleRate !== undefined && manifest.sampleRate !== TARGET_SAMPLE_RATE) problems.push(`${label}: manifest の sampleRate が ${TARGET_SAMPLE_RATE} ではありません`);

  const approved = manifest.gate?.status === 'approved' || (manifest.id === GRANDFATHERED_PACK_ID && manifest.gate === undefined);
  if (requireApproved && !approved) problems.push(`${label}: 聴感ゲート未通過（gate.status が approved ではありません）`);

  const words = manifest.words ?? {};
  const keys = Object.keys(words);
  const missing = REQUIRED_VOICE_KEYS.filter(key => !words[key]);
  const extra = keys.filter(key => !REQUIRED_VOICE_KEYS.includes(key));
  if (missing.length) problems.push(`${label}: 語が足りません: ${missing.join(', ')}`);
  if (extra.length) problems.push(`${label}: 知らない語があります: ${extra.join(', ')}`);
  if (!missing.length && !extra.length && keys.join() !== REQUIRED_VOICE_KEYS.join()) problems.push(`${label}: 語の順が REQUIRED_VOICE_KEYS と違います`);

  const expectedFiles = new Set(['manifest.json']);
  for (const key of REQUIRED_VOICE_KEYS.filter(item => words[item])) {
    const word = words[key];
    if (typeof word.file !== 'string' || !/^[A-Za-z0-9_-]+\.wav$/.test(word.file)) { problems.push(`${label}/${key}: file が正しくありません: ${word.file}`); continue; }
    expectedFiles.add(word.file);
    if (word.needsOnsetMeasurement !== false) problems.push(`${label}/${key}: needsOnsetMeasurement が false ではありません`);
    if (!ONSET_METHODS.has(word.onsetMethod)) problems.push(`${label}/${key}: onsetMethod が rms-auto-v1 / manual ではありません`);
    if (word.onsetMethod === 'manual' && !word.note?.trim?.()) problems.push(`${label}/${key}: 手で決めた onset には note（理由）が要ります`);
    if (word.gainDb !== undefined && word.gainDb !== 0) problems.push(`${label}/${key}: gainDb は 0（音量は波形に焼く）`);
    let wav;
    try {
      wav = parsePcm16Wav(await fs.readFile(path.join(packDir, word.file)));
    } catch (error) {
      problems.push(`${label}/${key}: ${word.file} を読めません (${error.message})`);
      continue;
    }
    if (wav.channels !== 1) problems.push(`${label}/${key}: モノ（1ch）ではありません（${wav.channels}ch）`);
    if (wav.sampleRate !== TARGET_SAMPLE_RATE) problems.push(`${label}/${key}: ${TARGET_SAMPLE_RATE}Hz ではありません（${wav.sampleRate}）`);
    const durationMs = wav.samples.length / wav.sampleRate * 1000;
    if (!Number.isFinite(word.onsetMs) || word.onsetMs < 0 || word.onsetMs >= durationMs) problems.push(`${label}/${key}: onsetMs ${word.onsetMs} が長さ ${Math.round(durationMs)}ms の外です`);
    if (durationMs < MIN_WORD_MS) problems.push(`${label}/${key}: 短すぎます（${Math.round(durationMs)}ms < ${MIN_WORD_MS}）`);
    if (durationMs > MAX_WORD_MS) problems.push(`${label}/${key}: 長すぎます（${Math.round(durationMs)}ms > ${MAX_WORD_MS}）`);
    const peak = dbfs(peakOf(wav.samples));
    if (peak > PEAK_CEILING_DBFS + 0.01) problems.push(`${label}/${key}: ピーク ${peak.toFixed(2)} dBFS が ${PEAK_CEILING_DBFS} を超えています`);
  }
  for (const entry of await fs.readdir(packDir)) {
    if (isDotfile(entry)) continue;
    if (!expectedFiles.has(entry)) problems.push(`${label}: manifest に無いファイルがあります: ${entry}`);
  }
  return { ok: problems.length === 0, problems, manifest };
}

// dist/audio/ の番人（Ruling 68-3）: (a) JSON の各 ID に manifest がある (b) JSON に無いパックは出荷しない (c) 各パックが checkPack を通る
// (d) 音のファイルは dist のどこであっても audio/<JSON の ID>/ の直下にしか置けない（I-2。別の場所に置いた候補の素通りを塞ぐ）
export async function checkDistAudio(distDir, standardVoices) {
  const problems = [];
  const audioDir = path.join(distDir, 'audio');
  const ids = new Set(standardVoices.map(voice => voice.id));
  let entries = [];
  try { entries = await fs.readdir(audioDir, { withFileTypes: true }); } catch { /* 無ければ下の missing で落ちる */ }
  for (const entry of entries) {
    if (isDotfile(entry.name)) continue;
    if (!ids.has(entry.name)) problems.push(`must not ship audio/${entry.name}${entry.isDirectory() ? '/' : ''} (not in src/app/voices/standard-voices.json)`);
  }
  for (const id of ids) {
    const packDir = path.join(audioDir, id);
    try {
      await fs.access(path.join(packDir, 'manifest.json'));
    } catch {
      problems.push(`missing audio/${id}/manifest.json`);
      continue;
    }
    problems.push(...(await checkPack(packDir, { expectedId: id })).problems);
  }
  const allowed = new RegExp(`^audio/(${[...ids].map(id => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})/[^/]+$`);
  const all = (await fs.readdir(distDir, { recursive: true, withFileTypes: true })).filter(entry => entry.isFile());
  for (const entry of all) {
    const file = path.relative(distDir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/');
    if (AUDIO_EXT.test(file) && !(ids.size && allowed.test(file))) problems.push(`must not ship ${file} (audio only under audio/<id in standard-voices.json>/)`);
  }
  return problems;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const dirs = args.filter(arg => !arg.startsWith('--'));
  if (!dirs.length) {
    console.error('使い方: voices:check -- <パックのフォルダ…> [--allow-pending]');
    process.exitCode = 1;
  } else {
    for (const dir of dirs) {
      const result = await checkPack(path.resolve(dir), { requireApproved: !args.includes('--allow-pending') });
      if (result.ok) console.log(`OK ${dir}`);
      else { console.error(`NG ${dir}\n  ${result.problems.join('\n  ')}`); process.exitCode = 1; }
    }
  }
}
