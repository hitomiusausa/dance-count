#!/usr/bin/env node
// 外で作った声のファイル（番号つきの mp3・wav など）を、voices:process が受け取る「生の音」の形（raw.json＋語ごとの WAV）にする。
// 2026-11-03: ひとみうさが VOICEPEAK で作った日本語の男性・女性の声（Dropbox /Voice。権利確認済み＝ひとみうさ）。
//   npm run voices:import -- <フォルダ> --voice female --name voicepeak-ja-female-20261103 [--suffix dance_female]
//   → output/voices/raw/<name>/（Git に入れない）→ 次: npm run voices:process -- output/voices/raw/<name>
// ファイル名の先頭の 2 桁の番号で語を決める（VOICEPEAK の書き出しの順。下の FILE_INDEX）。「4」は「し」（06）を使い、「よん」（05）は使わない
// （D77・ひとみうさ 2026-11-03）。足りない番号があれば止める。mp3 は ffmpeg で 48kHz・モノラルにする（WAV は 16bit）（mp3 の頭の無音は ffmpeg が除く＝
// 2026-11-02 にクリック音で実測。声の出だしの位置はこの後の voices:process が測る）。ネットワークには出ない。public/ には書かない。
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { REQUIRED_VOICE_KEYS } from '../../src/engine/recorded-voice-pack.js';
import { encodePcm16Wav } from './wav.js';

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, '../..');
export const IMPORT_SAMPLE_RATE = 48000;

// VOICEPEAK の書き出しの番号 → アプリの語（05 は「よん」で使わない）
export const FILE_INDEX = Object.freeze({
  slow: '00', quick: '01', one: '02', two: '03', three: '04', four: '06',
  five: '07', six: '08', seven: '09', eight: '10', and: '11', ah: '12'
});
export const UNUSED_INDEX = Object.freeze({ '05': '4（よん）。「し」（06）を使う＝D77' });
const AUDIO = /\.(mp3|wav|m4a|aac|flac|ogg)$/i;

// フォルダのファイルを語に割り当てる（suffix を渡せば、名前にそれを含むファイルだけ）。番号が重なる・足りない時は止める
export function assignFiles(names, { suffix } = {}) {
  const byIndex = new Map();
  for (const name of names) {
    if (!AUDIO.test(name) || (suffix && !name.includes(suffix))) continue;
    const index = /^(\d{2})-/.exec(name)?.[1];
    if (!index) continue;
    if (byIndex.has(index)) throw new Error(`番号 ${index} のファイルが 2 つあります: ${byIndex.get(index)} と ${name}`);
    byIndex.set(index, name);
  }
  const files = {};
  const missing = [];
  for (const key of REQUIRED_VOICE_KEYS) {
    const name = byIndex.get(FILE_INDEX[key]);
    if (name) files[key] = name; else missing.push(`${key}（${FILE_INDEX[key]}）`);
  }
  if (missing.length) throw new Error(`足りない語があります: ${missing.join('、')}`);
  const unused = [...byIndex.keys()].filter(index => !Object.values(FILE_INDEX).includes(index));
  return { files, unused: unused.map(index => `${byIndex.get(index)}${UNUSED_INDEX[index] ? `（${UNUSED_INDEX[index]}）` : ''}`) };
}

// −1〜1 の小数（wav.js の encodePcm16Wav が受け取る形）。整数で渡すと全部が ±1 に張り付いて音が割れる
export async function decodeToMono(file) {
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(IMPORT_SAMPLE_RATE), '-f', 'f32le', '-c:a', 'pcm_f32le', '-'],
    { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  return new Float32Array(stdout.buffer.slice(stdout.byteOffset, stdout.byteOffset + stdout.length));
}

export async function runImport(argv, { log = console.log, now = new Date() } = {}) {
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true,
    options: { voice: { type: 'string' }, name: { type: 'string' }, suffix: { type: 'string' }, out: { type: 'string' }, credit: { type: 'string' } } });
  const source = positionals[0];
  if (!source || !['female', 'male'].includes(values.voice ?? '') || !values.name) {
    throw new Error('使い方: voices:import -- <フォルダ> --voice female|male --name <候補名> [--suffix dance_female]');
  }
  if (!/^[a-z0-9-]+$/.test(values.name)) throw new Error('--name は英小文字・数字・ハイフンだけ');
  const dir = path.resolve(source);
  const { files, unused } = assignFiles(await fs.readdir(dir), { suffix: values.suffix });
  const outDir = path.resolve(values.out ?? path.join(root, 'output/voices/raw', values.name));
  await fs.mkdir(outDir, { recursive: true });
  const rawWords = {};
  for (const key of REQUIRED_VOICE_KEYS) {
    const pcm = await decodeToMono(path.join(dir, files[key]));
    if (!pcm.length) throw new Error(`${files[key]}: 音がありません`);
    await fs.writeFile(path.join(outDir, `${key}.wav`), encodePcm16Wav(pcm, IMPORT_SAMPLE_RATE));
    rawWords[key] = { sourceFile: files[key] };
    log(`${key.padEnd(6)} ← ${files[key]}（${(pcm.length / IMPORT_SAMPLE_RATE).toFixed(3)} 秒）`);
  }
  if (unused.length) log(`使わないファイル: ${unused.join('、')}`);
  const label = values.voice === 'male' ? '男性' : '女性';
  const raw = {
    type: 'dance-count-voice-raw',
    provider: 'voicepeak',
    name: `VOICEPEAK 日本語・${label}（${values.name}）`,
    voiceName: `voicepeak-ja-${values.voice}`,
    locale: 'ja-JP',
    speakingRate: null,
    generatedAt: now.toISOString(),
    credit: values.credit ?? 'VOICEPEAK でひとみうさが作成。権利確認済み（ひとみうさ 2026-11-03）',
    words: rawWords
  };
  await fs.writeFile(path.join(outDir, 'raw.json'), `${JSON.stringify(raw, null, 2)}\n`);
  log(`書きました: ${path.relative(root, outDir)}　次: npm run voices:process -- ${path.relative(root, outDir)}`);
  return { outDir, files, unused };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    await runImport(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
