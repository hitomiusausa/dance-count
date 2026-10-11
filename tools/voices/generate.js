#!/usr/bin/env node
// 日本語標準音声の候補を作る入口（Ruling 65）。**既定は dry-run**: 計画と費用見積もりを表に出すだけで、
// ネットワーク・外部プロセス・ファイル書き込みをしない。--yes で実行。Google（有料）は VOICES_ALLOW_PAID=1 も要る（2 重の鍵）。
//   npm run voices:plan                     … 計画だけ（Google ja-JP-Neural2-B・速さ 1.0）
//   npm run voices:plan -- --matrix         … 候補行列（Neural2-B/C/D × 1.0/1.15）の合計見積もり
//   VOICES_ALLOW_PAID=1 npm run voices:synth -- --yes --voice ja-JP-Neural2-B --rate 1.0
//   npm run voices:synth -- --provider recorded --source <録音パック.json|フォルダ> --yes
// 出力（生の音）は output/voices/raw/<provider>-<voice>-r<rate>-<date>/。次に npm run voices:process -- <そのフォルダ>。
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { REQUIRED_VOICE_KEYS } from '../../src/engine/recorded-voice-pack.js';
import { encodePcm16Wav } from './wav.js';
import { estimateCost, formatCostLines } from './pricing.js';
import { createGoogleProvider } from './providers/google.js';
import { createVoicevoxProvider } from './providers/voicevox.js';
import { createRecordedProvider } from './providers/recorded.js';

const root = path.resolve(import.meta.dirname, '../..');
export const DEFAULTS = Object.freeze({ provider: 'google', voice: 'ja-JP-Neural2-B', lang: 'ja-JP', rate: 1.0 });
// Ruling 65-6 の候補行列（6b の最初の便）
export const CANDIDATE_MATRIX = Object.freeze({ voices: ['ja-JP-Neural2-B', 'ja-JP-Neural2-C', 'ja-JP-Neural2-D'], rates: [1.0, 1.15] });
const PROVIDERS = new Set(['google', 'voicevox', 'recorded']);

export async function loadWords(file) {
  const resolved = file ? path.resolve(file) : path.join(import.meta.dirname, 'words.ja-JP.json');
  const raw = JSON.parse(await fs.readFile(resolved, 'utf8'));
  const words = {};
  for (const key of REQUIRED_VOICE_KEYS) {
    const entry = raw[key];
    if (entry === undefined) throw new Error(`${resolved} に「${key}」がありません`);
    words[key] = typeof entry === 'string' ? { text: entry } : entry;   // tools/voice-words.json（英）の形も読める
    if (words[key].ssml && !words[key].note) throw new Error(`${key}: ssml を使う語には note（理由）が要ります`);
  }
  return words;
}

const charCount = text => [...text].length;
const formatRate = rate => Number(rate).toFixed(2).replace(/0$/, '');
const dateStamp = now => `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;   // 手元の日付

export function candidateName({ provider, voice, rate }, now = new Date()) {
  const voicePart = provider === 'recorded' ? 'recorded' : String(voice).replace(/[^A-Za-z0-9-]/g, '_');
  return `${provider}-${voicePart}-r${formatRate(rate)}-${dateStamp(now)}`;
}

export function buildPlan(options, words) {
  const rows = REQUIRED_VOICE_KEYS.map(key => {
    const input = words[key].ssml ?? words[key].text;
    return { key, input, ssml: Boolean(words[key].ssml), chars: charCount(input) };
  });
  const totalChars = rows.reduce((sum, row) => sum + row.chars, 0);
  return { ...options, rows, totalChars, estimate: estimateCost(options.provider, options.voice, totalChars) };
}

function parseOptions(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      provider: { type: 'string' }, voice: { type: 'string' }, lang: { type: 'string' }, rate: { type: 'string' },
      words: { type: 'string' }, out: { type: 'string' }, source: { type: 'string' }, credit: { type: 'string' },
      yes: { type: 'boolean' }, 'dry-run': { type: 'boolean' }, matrix: { type: 'boolean' }
    }
  });
  const provider = values.provider ?? DEFAULTS.provider;
  if (!PROVIDERS.has(provider)) throw new Error(`--provider は google / voicevox / recorded のどれか: ${provider}`);
  const voice = values.voice ?? (provider === 'google' ? DEFAULTS.voice : provider === 'voicevox' ? undefined : 'recorded');
  if (!voice) throw new Error('VOICEVOX は --voice <話者番号> が要ります');
  if (provider === 'recorded' && !values.source) throw new Error('recorded は --source <録音パック.json か <key>.wav のフォルダ> が要ります');
  const rate = Number(values.rate ?? DEFAULTS.rate);
  if (!(rate > 0.25 && rate <= 4)) throw new Error(`--rate が正しくありません: ${values.rate}`);
  return { provider, voice, rate, lang: values.lang ?? DEFAULTS.lang, words: values.words, out: values.out, source: values.source,
    credit: values.credit, yes: values.yes === true, dryRun: values['dry-run'] === true, matrix: values.matrix === true };
}

function printPlan(plan, outDir, log) {
  log(`提供元: ${plan.provider}　声: ${plan.voice}　言語: ${plan.lang}　速さ: ${plan.rate}`);
  log('語        入力                  文字数  SSML');
  for (const row of plan.rows) log(`${row.key.padEnd(8)}  ${row.input.padEnd(20)}  ${String(row.chars).padStart(4)}    ${row.ssml ? 'あり' : '-'}`);
  log(`合計 ${plan.totalChars} 文字（SSML のタグも数える保守的な数え方）`);
  for (const line of formatCostLines(plan.estimate)) log(line);
  if (plan.provider === 'voicevox') log('VOICEVOX はクレジット表記が要ります（VOICEVOX:キャラクター名）。キャラクターごとの規約も確認してください。');
  log(`出力先: ${path.relative(root, outDir) || outDir}`);
}

/** テストから呼べる本体。deps で env・fetch・ファイル書き込み・ログを差し替えられる。 */
export async function runGenerate(argv, deps = {}) {
  const env = deps.env ?? process.env;
  const log = deps.log ?? console.log;
  const error = deps.error ?? console.error;
  const now = deps.now ?? new Date();
  const options = parseOptions(argv);
  const words = await loadWords(options.words);
  const plan = buildPlan(options, words);
  const outDir = path.resolve(options.out ?? path.join(root, 'output/voices/raw', candidateName(options, now)));
  printPlan(plan, outDir, log);

  if (options.matrix) {
    let total = 0;
    for (const voice of CANDIDATE_MATRIX.voices) for (const rate of CANDIDATE_MATRIX.rates) total += buildPlan({ ...options, voice, rate }, words).totalChars;
    log(`候補行列 ${CANDIDATE_MATRIX.voices.length}声 × ${CANDIDATE_MATRIX.rates.length}速 = ${CANDIDATE_MATRIX.voices.length * CANDIDATE_MATRIX.rates.length * 12} リクエスト・${total} 文字`);
    for (const line of formatCostLines(estimateCost(options.provider, options.voice, total))) log(line);
  }

  if (!options.yes || options.dryRun) {
    log('（dry-run: 何も送らず、何も書いていません。実行するには --yes）');
    return { mode: 'plan', exitCode: 0, plan };
  }
  if (options.provider === 'google' && env.VOICES_ALLOW_PAID !== '1') {
    error('止めました: Google は有料です。生成するには --yes に加えて環境変数 VOICES_ALLOW_PAID=1 が要ります（ひとみうさの GO の後だけ）。');
    return { mode: 'blocked', exitCode: 2, plan };
  }

  const provider = options.provider === 'google'
    ? createGoogleProvider({ voice: options.voice, lang: options.lang, rate: options.rate, fetch: deps.fetch, getToken: deps.getToken, getProject: deps.getProject, allowPaid: true })
    : options.provider === 'voicevox'
      ? createVoicevoxProvider({ voice: options.voice, rate: options.rate, credit: options.credit, fetch: deps.fetch })
      : await createRecordedProvider({ source: path.resolve(options.source) });
  const writeFile = deps.writeFile ?? fs.writeFile;
  const mkdir = deps.mkdir ?? fs.mkdir;
  await mkdir(outDir, { recursive: true });
  const described = provider.describe();
  const rawWords = {};
  for (const key of REQUIRED_VOICE_KEYS) {
    const result = await provider.synthesize({ key, ...words[key], voice: options.voice, lang: options.lang, rate: options.rate });
    await writeFile(path.join(outDir, `${key}.wav`), encodePcm16Wav(result.pcm, result.sampleRate));
    rawWords[key] = { ...words[key], sampleRate: result.sampleRate };
    log(`  ${key} ✓`);
  }
  const raw = {
    type: 'dance-count-voice-raw',
    provider: described.provider,
    name: described.name,
    voiceName: described.voiceName,
    locale: provider.locale ?? options.lang,
    speakingRate: options.rate,
    generatedAt: now.toISOString(),
    ...(described.credit ? { credit: described.credit } : {}),
    words: rawWords
  };
  await writeFile(path.join(outDir, 'raw.json'), `${JSON.stringify(raw, null, 2)}\n`);
  log(`次: npm run voices:process -- ${path.relative(root, outDir)}`);
  return { mode: 'synth', exitCode: 0, plan, outDir };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    const { exitCode } = await runGenerate(process.argv.slice(2));
    process.exitCode = exitCode;
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}
