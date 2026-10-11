// 段6a のテスト用の合成信号（音声バイナリは commit しない＝Ruling 66-2）。
export const RATE = 48_000;

export function silence(ms, rate = RATE) {
  return new Float32Array(Math.round(ms / 1000 * rate));
}

// 220Hz＋倍音の「声もどき」。amplitude はピークの目安。
export function voiced(ms, { rate = RATE, frequency = 220, amplitude = 0.3 } = {}) {
  const samples = new Float32Array(Math.round(ms / 1000 * rate));
  for (let index = 0; index < samples.length; index += 1) {
    const t = index / rate;
    samples[index] = amplitude * (0.6 * Math.sin(2 * Math.PI * frequency * t)
      + 0.25 * Math.sin(2 * Math.PI * frequency * 2 * t)
      + 0.15 * Math.sin(2 * Math.PI * frequency * 3 * t));
  }
  return samples;
}

export function concat(...parts) {
  const out = new Float32Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

// 無音 300ms → 声 400ms → 無音 200ms（Ruling 66-1 の合成信号）
export function syntheticWord(options = {}) {
  const rate = options.rate ?? RATE;
  return concat(silence(options.headMs ?? 300, rate), voiced(options.voiceMs ?? 400, { ...options, rate }), silence(options.tailMs ?? 200, rate));
}

// 12 語の合成パック（処理経路を通した物）をフォルダに書く。聴感ゲートの道具のテスト用（音が無い今は合成音で）。
export async function writeSyntheticPack(dir, id, { gate = { status: 'pending' }, locale = 'ja-JP' } = {}) {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { processWords, buildManifest } = await import('../../../tools/voices/pipeline.js');
  const { REQUIRED_VOICE_KEYS } = await import('../../../src/engine/recorded-voice-pack.js');
  const raw = Object.fromEntries(REQUIRED_VOICE_KEYS.map((key, index) => [key, {
    samples: syntheticWord({ frequency: 180 + index * 15, voiceMs: 260 + index * 10 }), sampleRate: RATE
  }]));
  const result = processWords(raw, { refPeakRms: 0.2 });
  const packDir = path.join(dir, id);
  await fs.mkdir(packDir, { recursive: true });
  for (const key of REQUIRED_VOICE_KEYS) await fs.writeFile(path.join(packDir, `${key}.wav`), result.words[key].wav);
  const manifest = buildManifest({ id, name: '合成テスト', provider: 'google-cloud-tts', locale, voiceName: 'ja-JP-Neural2-B', speakingRate: 1,
    generatedAt: '2026-10-12T00:00:00.000Z', words: result.words });
  manifest.gate = gate;
  await fs.writeFile(path.join(packDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return packDir;
}
