import { mixAudioBufferToMono } from '../../engine/onset-detector.js';
import { encodeAudioBufferAsWav, normalizeAudioBuffer } from '../../engine/recording-normalizer.js';
import { checkTake, type AudioBufferLike, type TakeProblem } from './take-check.ts';
import { VOICE_LIMITS, type RecordedWord, type VoiceKey } from './store.ts';

// 録れた 1 語を保存する形にする（Ruling 58-3）。全部エンジンの export を呼ぶだけ（エンジンは 0 行変更）:
// decode → 判定 → モノにまとめる → 頭をそろえて切り出す（normalizeAudioBuffer）→ 16bit WAV。サンプルレートは録音のまま。
// 失敗はエンジンの Error を外へ出さず、種類（TakeProblem・'failed'）に変える（画面の文言は messages.ts のキーだけ。Ruling 58-5）。
export interface DecodeContext {
  decodeAudioData(data: ArrayBuffer): Promise<AudioBufferLike>;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike;
}

export type TakeFailure = TakeProblem | 'failed';
export type TakeResult = { ok: true; word: RecordedWord } | { ok: false; problem: TakeFailure };

export async function processTake(audio: DecodeContext, blob: Blob, key: VoiceKey): Promise<TakeResult> {
  let source: AudioBufferLike;
  try {
    source = await audio.decodeAudioData(await blob.arrayBuffer());
  } catch {
    return { ok: false, problem: 'failed' };
  }
  const check = checkTake(source);
  if (check.problem || check.onsetMs === null) return { ok: false, problem: check.problem ?? 'silent' };
  try {
    const mono = toMono(audio, source);
    const normalized = normalizeAudioBuffer(audio as unknown as AudioContext, mono as unknown as AudioBuffer, key, check.onsetMs);
    const blobOut = encodeAudioBufferAsWav(normalized.buffer);
    if (blobOut.size > VOICE_LIMITS.wordBytes) return { ok: false, problem: 'failed' };
    return {
      ok: true,
      word: { blob: blobOut, mimeType: 'audio/wav', onsetMs: normalized.onsetMs, sourceOnsetMs: check.onsetMs, durationMs: normalized.durationMs, normalized: true, gainDb: 0 }
    };
  } catch {
    return { ok: false, problem: 'failed' };
  }
}

function toMono(audio: DecodeContext, source: AudioBufferLike): AudioBufferLike {
  if (source.numberOfChannels === 1) return source;
  const mono = audio.createBuffer(1, source.length, source.sampleRate);
  mono.getChannelData(0).set(mixAudioBufferToMono(source as unknown as AudioBuffer));
  return mono;
}
