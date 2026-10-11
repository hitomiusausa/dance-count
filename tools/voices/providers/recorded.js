// 人の録音（Ruling 69-2 の B）。録音パック JSON（type:'dance-count-recorded-voice-pack'・words[key].dataBase64）か、
// <key>.wav が並ぶフォルダを読む。WAV（16bit PCM）はそのまま、それ以外（Safari の mp4 など）は ffmpeg で 48kHz・モノに。
// 外部への送信は無い（無料）。
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { REQUIRED_VOICE_KEYS, RECORDED_PACK_TYPE } from '../../../src/engine/recorded-voice-pack.js';
import { isRiffWave, parsePcm16Wav } from '../wav.js';

const DECODE_RATE = 48_000;

export function decodeWithFfmpeg(bytes, sampleRate = DECODE_RATE) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-f', 'f32le', '-ac', '1', '-ar', String(sampleRate), 'pipe:1'],
    { input: bytes, maxBuffer: 256 * 1024 * 1024 });
  if (result.error?.code === 'ENOENT') throw new Error('ffmpeg が見つかりません（brew install ffmpeg）。WAV 以外の録音を読むのに使います');
  if (result.status !== 0) throw new Error(`録音をデコードできません: ${result.stderr?.toString()}`);
  const out = result.stdout;
  return { pcm: new Float32Array(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength)), sampleRate };
}

function decode(bytes, decodeOther) {
  if (isRiffWave(bytes)) {
    try {
      const wav = parsePcm16Wav(Buffer.from(bytes));
      return { pcm: wav.samples, sampleRate: wav.sampleRate };
    } catch {
      // 16bit 以外の WAV は ffmpeg へ
    }
  }
  return decodeOther(bytes);
}

export async function createRecordedProvider({ source, decodeOther = decodeWithFfmpeg }) {
  const stat = await fs.stat(source);
  const entries = {};
  let name = path.basename(source);
  let locale;
  if (stat.isDirectory()) {
    for (const key of REQUIRED_VOICE_KEYS) {
      const file = path.join(source, `${key}.wav`);
      try { entries[key] = await fs.readFile(file); } catch { /* 無い語は synthesize で分かる文言にする */ }
    }
  } else {
    const pack = JSON.parse(await fs.readFile(source, 'utf8'));
    if (pack.type !== RECORDED_PACK_TYPE || !pack.words) throw new Error('録音音声パック（dance-count-recorded-voice-pack）ではありません');
    name = pack.name ?? name;
    locale = pack.locale;
    for (const [key, word] of Object.entries(pack.words)) {
      if (!REQUIRED_VOICE_KEYS.includes(key) || typeof word.dataBase64 !== 'string') continue;
      entries[key] = Buffer.from(word.dataBase64, 'base64');
    }
  }
  return {
    id: 'recorded',
    paid: false,
    locale,
    keys: () => REQUIRED_VOICE_KEYS.filter(key => entries[key]),
    describe: () => ({ provider: 'human-recording', name, voiceName: 'human-recording' }),
    async synthesize({ key }) {
      if (!entries[key]) throw new Error(`録音に「${key}」がありません: ${source}`);
      const decoded = decode(entries[key], decodeOther);
      return { pcm: decoded.pcm, sampleRate: decoded.sampleRate, meta: { source } };
    }
  };
}
