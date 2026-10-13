#!/usr/bin/env node
// 偽マイク用の WAV を作る（Ruling 63-5）。Chrome の --use-file-for-fake-audio-capture に渡す（ループで何度も鳴る）。
// fake-mic.wav: 1.5 秒・48kHz・16bit・モノ。0.3 秒の無音 → 0.6 秒の 220Hz＋倍音（声の代わり）→ 0.6 秒の無音。
// silence.wav : 1.5 秒の全 0。
// quiet.wav   : fake-mic.wav と同じ形で振幅だけ小さい（ピーク 0.0005。D59 で 0.002 から）。全 0 ではないので「無音の基準 SILENCE_PEAK_RMS」そのものを試す。
//               Chrome のマイクは自動ゲイン（AGC）で小さい音を持ち上げるため、アプリが見る peakRms は 0.002 以上 0.01 未満になる。
//               実測（2026-10-12）: 0.001〜0.004 は基準 0 だと「録れた」、基準 0.01 だと「声が入っていない」。0.0003 は検出器の下限 0.002 で先に落ちる。
//               D59（2026-10-14）: 合図の 3.3 秒のあいだマイクが開いたままになり、AGC がその間に持ち上げる（実測 ピーク 0.002 の WAV で
//               開いてすぐ 0.0076 → 1 秒後 0.011 → 3.3 秒後 0.023）。録音の開始が 3.3 秒後になったので 0.0005 に下げた（3.3 秒後に 0.0056＝
//               検出器の下限 0.002 より上・基準 0.01 未満）。0.001 は 3.3 秒後に 0.011 で基準を越える。
// 使い方: node tools/make-fake-mic-wav.js（test/fixtures/voice/ に書く。中身は決定的なので何度作っても同じバイト列）
import fs from 'node:fs';
import path from 'node:path';

export const SAMPLE_RATE = 48000;
export const TOTAL_SECONDS = 1.5;
export const VOICE_START_SECONDS = 0.3;
export const VOICE_SECONDS = 0.6;
export const VOICE_PEAK = 0.5;
export const QUIET_PEAK = 0.0005;

export function fakeVoiceSamples({ silent = false, peak = VOICE_PEAK } = {}) {
  const samples = new Float32Array(Math.round(SAMPLE_RATE * TOTAL_SECONDS));
  if (silent) return samples;
  const start = Math.round(SAMPLE_RATE * VOICE_START_SECONDS);
  const length = Math.round(SAMPLE_RATE * VOICE_SECONDS);
  const ramp = Math.round(SAMPLE_RATE * 0.01);
  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.min(1, i / ramp, (length - i) / ramp);
    const tone = Math.sin(2 * Math.PI * 220 * t) + 0.5 * Math.sin(2 * Math.PI * 440 * t) + 0.25 * Math.sin(2 * Math.PI * 660 * t);
    samples[start + i] = peak * envelope * tone / 1.75;
  }
  return samples;
}

export function encodeMonoWav(samples, sampleRate = SAMPLE_RATE) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((value, index) => {
    const clamped = Math.max(-1, Math.min(1, value));
    buffer.writeInt16LE(Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff), 44 + index * 2);
  });
  return buffer;
}

if (path.resolve(process.argv[1] ?? "") === import.meta.filename) {
  const dir = path.resolve(import.meta.dirname, '../test/fixtures/voice');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'fake-mic.wav'), encodeMonoWav(fakeVoiceSamples()));
  fs.writeFileSync(path.join(dir, 'silence.wav'), encodeMonoWav(fakeVoiceSamples({ silent: true })));
  fs.writeFileSync(path.join(dir, 'quiet.wav'), encodeMonoWav(fakeVoiceSamples({ peak: QUIET_PEAK })));
  console.log(`wrote ${dir}/fake-mic.wav, silence.wav and quiet.wav`);
}
