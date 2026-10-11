import { encodeAudioBufferAsWav } from '../../../src/engine/recording-normalizer.js';
import { VOICE_KEYS, newRecordedPack, withWord, type RecordedWord, type VoicePackRecord } from '../../../src/app/voices/store.ts';
import type { VoiceLocale } from '../../../src/app/voices/ids.ts';

// テスト用の AudioBuffer（AudioContext の代わり）。チャンネルごとの Float32Array を持つだけ。
export interface FakeBuffer { numberOfChannels: number; sampleRate: number; length: number; duration: number; getChannelData(channel: number): Float32Array }

export function fakeBuffer(channels: Float32Array[], sampleRate = 48000): FakeBuffer {
  const length = channels[0]!.length;
  return { numberOfChannels: channels.length, sampleRate, length, duration: length / sampleRate, getChannelData: channel => channels[channel]! };
}

export const fakeAudio = {
  createBuffer(channels: number, length: number, sampleRate: number): FakeBuffer {
    return fakeBuffer(Array.from({ length: channels }, () => new Float32Array(length)), sampleRate);
  }
};

// 声の代わり: startMs から lengthMs だけ振幅 amplitude の 220Hz。残りは noise の一定ノイズ（0 なら無音）。
export function tone({ totalMs = 1500, startMs = 300, lengthMs = 600, amplitude = 0.5, noise = 0, sampleRate = 48000 } = {}): Float32Array {
  const samples = new Float32Array(Math.round(totalMs * sampleRate / 1000));
  for (let i = 0; i < samples.length; i += 1) samples[i] = noise * (i % 2 === 0 ? 1 : -1);
  const start = Math.round(startMs * sampleRate / 1000);
  const end = Math.min(samples.length, start + Math.round(lengthMs * sampleRate / 1000));
  for (let i = start; i < end; i += 1) samples[i] = amplitude * Math.sin(2 * Math.PI * 220 * i / sampleRate);
  return samples;
}

export function wordFixture(onsetMs = 40): RecordedWord {
  const wav = encodeAudioBufferAsWav(fakeBuffer([tone({ totalMs: 745, startMs: onsetMs, lengthMs: 400 })]));
  return { blob: wav, mimeType: 'audio/wav', onsetMs, sourceOnsetMs: 320, durationMs: 745, normalized: true, gainDb: 0 };
}

export function packFixture(locale: VoiceLocale, recorded: number, { name = locale === 'en' ? '自分の声（英語）' : '自分の声（日本語）', now = '2026-10-12T00:00:00.000Z' } = {}): VoicePackRecord {
  let pack = newRecordedPack(locale, name, now);
  for (const key of VOICE_KEYS.slice(0, recorded)) pack = withWord(pack, key, wordFixture(), now);
  return pack;
}
