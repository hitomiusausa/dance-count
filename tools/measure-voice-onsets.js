import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureOnset } from '../src/engine/onset-detector.js';

export { measureOnset };

const DEFAULT_PACK_DIR = path.resolve('public/audio/default-en-female-v1');

export function parsePcm16Wav(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Not a RIFF/WAVE file');
  }

  let format;
  let dataOffset;
  let dataSize;
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (body + size > buffer.length) throw new Error(`Invalid WAV chunk: ${id}`);
    if (id === 'fmt ') {
      format = {
        audioFormat: buffer.readUInt16LE(body),
        channels: buffer.readUInt16LE(body + 2),
        sampleRate: buffer.readUInt32LE(body + 4),
        bitsPerSample: buffer.readUInt16LE(body + 14)
      };
    } else if (id === 'data') {
      dataOffset = body;
      dataSize = size;
    }
    offset = body + size + (size % 2);
  }

  if (!format || dataOffset === undefined) throw new Error('WAV is missing fmt or data chunk');
  if (format.audioFormat !== 1 || format.bitsPerSample !== 16) {
    throw new Error('Only 16-bit PCM WAV is supported');
  }

  const frameCount = Math.floor(dataSize / (format.channels * 2));
  const samples = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < format.channels; channel += 1) {
      sum += buffer.readInt16LE(dataOffset + (frame * format.channels + channel) * 2) / 32768;
    }
    samples[frame] = sum / format.channels;
  }
  return { ...format, samples };
}

export async function measureVoicePack(packDir = DEFAULT_PACK_DIR) {
  const manifestPath = path.join(packDir, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const measurements = {};

  for (const [key, word] of Object.entries(manifest.words)) {
    const wav = parsePcm16Wav(await fs.readFile(path.join(packDir, word.file)));
    const measurement = measureOnset(wav.samples, wav.sampleRate);
    word.onsetMs = measurement.onsetMs;
    word.needsOnsetMeasurement = false;
    word.onsetMethod = 'rms-auto-v1';
    measurements[key] = measurement;
  }

  manifest.status = 'auto-onset-measured';
  manifest.onsetMeasuredAt = new Date().toISOString();
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifestPath, measurements };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const packDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_PACK_DIR;
  const { manifestPath, measurements } = await measureVoicePack(packDir);
  for (const [key, result] of Object.entries(measurements)) {
    console.log(`${key.padEnd(7)} ${String(result.onsetMs).padStart(4)} ms`);
  }
  console.log(`Updated ${manifestPath}`);
}
