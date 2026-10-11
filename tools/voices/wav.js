// WAV の読み書き（16bit PCM）。読み取りは英パックの実測と同じ関数を使う（rms-auto-v1 の回帰を壊さない）。
import { parsePcm16Wav } from '../measure-voice-onsets.js';

export { parsePcm16Wav };

// samples: Float32Array（モノ）か Float32Array の配列（チャンネルごと・同じ長さ）
export function encodePcm16Wav(samples, sampleRate) {
  const channels = Array.isArray(samples) ? samples : [samples];
  const channelCount = channels.length;
  const frames = channels[0].length;
  const dataSize = frames * channelCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channelCount, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channelCount * 2, 28);
  buffer.writeUInt16LE(channelCount * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const value = Math.max(-1, Math.min(1, channels[channel][frame]));
      buffer.writeInt16LE(Math.round(value * (value < 0 ? 32768 : 32767)), 44 + (frame * channelCount + channel) * 2);
    }
  }
  return buffer;
}

export function isRiffWave(bytes) {
  return bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString('ascii') === 'RIFF' && Buffer.from(bytes.subarray(8, 12)).toString('ascii') === 'WAVE';
}
