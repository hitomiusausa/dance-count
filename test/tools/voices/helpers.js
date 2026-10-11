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
