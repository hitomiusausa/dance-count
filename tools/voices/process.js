#!/usr/bin/env node
// 生の音（generate.js の出力、または人の録音）を処理経路に通して、1 つの音声パック（manifest＋12 本の WAV）にする。
//   npm run voices:process -- output/voices/raw/<候補>            → output/voices/<候補>/
//   npm run voices:process -- --provider recorded <録音パック.json|フォルダ> [--name 候補名]
//   [--overrides <json>]  語ごとの onsetOverrideMs と note（Ruling 66-3。アルゴリズムは変えない）
// ネットワークには出ない。public/ には書かない（採用は voices:adopt だけ）。
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { REQUIRED_VOICE_KEYS } from '../../src/engine/recorded-voice-pack.js';
import { parsePcm16Wav } from './wav.js';
import { buildManifest, dbfs, processWords, referencePeakRms } from './pipeline.js';
import { createRecordedProvider } from './providers/recorded.js';

const root = path.resolve(import.meta.dirname, '../..');

async function loadRaw(rawDir) {
  const raw = JSON.parse(await fs.readFile(path.join(rawDir, 'raw.json'), 'utf8'));
  const words = {};
  for (const key of REQUIRED_VOICE_KEYS) {
    const wav = parsePcm16Wav(await fs.readFile(path.join(rawDir, `${key}.wav`)));
    words[key] = { samples: wav.samples, sampleRate: wav.sampleRate };
  }
  return { meta: raw, words };
}

async function loadRecorded(source) {
  const provider = await createRecordedProvider({ source });
  const words = {};
  for (const key of REQUIRED_VOICE_KEYS) {
    const decoded = await provider.synthesize({ key });
    words[key] = { samples: decoded.pcm, sampleRate: decoded.sampleRate };
  }
  const described = provider.describe();
  return { meta: { provider: described.provider, name: described.name, voiceName: described.voiceName, locale: provider.locale ?? 'ja-JP', speakingRate: 1 }, words };
}

export async function runProcess(argv, { log = console.log, now = new Date() } = {}) {
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true,
    options: { provider: { type: 'string' }, name: { type: 'string' }, out: { type: 'string' }, overrides: { type: 'string' } } });
  const input = positionals[0];
  if (!input) throw new Error('使い方: voices:process -- <生の音のフォルダ> ／ --provider recorded <録音パック.json|フォルダ>');
  const recorded = values.provider === 'recorded';
  const { meta, words } = recorded ? await loadRecorded(path.resolve(input)) : await loadRaw(path.resolve(input));
  const id = values.name ?? (recorded ? `recorded-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}` : path.basename(path.resolve(input)));
  const outDir = path.resolve(values.out ?? path.join(root, 'output/voices', id));
  const overrides = values.overrides ? JSON.parse(await fs.readFile(values.overrides, 'utf8')) : {};

  const result = processWords(words, { refPeakRms: await referencePeakRms() });
  log(`音量: パック全体で ${result.gainDb >= 0 ? '+' : ''}${result.gainDb} dB（基準: 英パックの peakRms の中央値）`);
  log('語        onset  長さ   ピーク(dBFS)  頭打ち  注意');
  for (const key of REQUIRED_VOICE_KEYS) {
    const word = result.words[key];
    if (!word.wav) { log(`${key.padEnd(8)}  —      —      —             —       ${word.problem}`); continue; }
    log(`${key.padEnd(8)}  ${String(word.onsetMs).padStart(4)}  ${String(word.durationMs).padStart(5)}  ${dbfs(word.peak).toFixed(1).padStart(11)}  ${String(word.limitedDb).padStart(6)}  ${word.problem ?? ''}`);
  }
  const fatal = result.problems.filter(item => item.problem === 'silent');
  if (fatal.length) {
    log(`止めました: 音が無い語があります（${fatal.map(item => item.key).join(', ')}）。パックは書いていません。`);
    return { exitCode: 1, result };
  }
  await fs.mkdir(outDir, { recursive: true });
  for (const key of REQUIRED_VOICE_KEYS) await fs.writeFile(path.join(outDir, `${key}.wav`), result.words[key].wav);
  const manifest = buildManifest({ id, name: meta.name, provider: meta.provider, locale: meta.locale, voiceName: meta.voiceName,
    speakingRate: meta.speakingRate, credit: meta.credit, generatedAt: meta.generatedAt, measuredAt: now.toISOString(), words: result.words, overrides });
  await fs.writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  if (result.problems.length) log(`注意: ${result.problems.map(item => `${item.key}=${item.problem}`).join(', ')}（聴感ゲートで確かめる）`);
  log(`書きました: ${path.relative(root, outDir)}　次: npm run voices:check -- ${path.relative(root, outDir)} --allow-pending → npm run voices:gate -- ${path.relative(root, outDir)}`);
  return { exitCode: 0, result, outDir, manifest };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    process.exitCode = (await runProcess(process.argv.slice(2))).exitCode;
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}
