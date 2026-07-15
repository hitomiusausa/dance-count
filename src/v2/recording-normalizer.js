import { measureOnset, mixAudioBufferToMono } from './onset-detector.js';

export const REFERENCE_VOICE_TIMING = Object.freeze({
  slow: Object.freeze({ onsetMs: 30, durationMs: 641 }),
  quick: Object.freeze({ onsetMs: 45, durationMs: 581 }),
  one: Object.freeze({ onsetMs: 35, durationMs: 591 }),
  two: Object.freeze({ onsetMs: 45, durationMs: 545 }),
  three: Object.freeze({ onsetMs: 50, durationMs: 560 }),
  four: Object.freeze({ onsetMs: 80, durationMs: 535 }),
  five: Object.freeze({ onsetMs: 70, durationMs: 567 }),
  six: Object.freeze({ onsetMs: 40, durationMs: 745 }),
  seven: Object.freeze({ onsetMs: 40, durationMs: 655 }),
  eight: Object.freeze({ onsetMs: 25, durationMs: 535 }),
  and: Object.freeze({ onsetMs: 35, durationMs: 591 }),
  ah: Object.freeze({ onsetMs: 25, durationMs: 498 })
});

export function recordingTrimPlan(key, detectedOnsetMs, sampleRate) {
  const reference = REFERENCE_VOICE_TIMING[key];
  if (!reference) throw new Error(`基準音声がありません: ${key}`);
  if (!Number.isFinite(detectedOnsetMs) || detectedOnsetMs < 0 || !Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error('録音の切り出し情報が正しくありません');
  }
  const startMs = Math.max(0, detectedOnsetMs - reference.onsetMs);
  return {
    startMs,
    startFrame: Math.round(startMs * sampleRate / 1000),
    lengthFrames: Math.max(1, Math.round(reference.durationMs * sampleRate / 1000)),
    onsetMs: reference.onsetMs,
    durationMs: reference.durationMs
  };
}

export function normalizeAudioBuffer(audioContext, sourceBuffer, key, detectedOnsetMs) {
  const plan = recordingTrimPlan(key, detectedOnsetMs, sourceBuffer.sampleRate);
  const output = audioContext.createBuffer(sourceBuffer.numberOfChannels, plan.lengthFrames, sourceBuffer.sampleRate);
  const fadeInFrames = Math.min(plan.lengthFrames, Math.round(sourceBuffer.sampleRate * 0.005));
  const fadeOutFrames = Math.min(plan.lengthFrames, Math.round(sourceBuffer.sampleRate * 0.015));

  for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel += 1) {
    const source = sourceBuffer.getChannelData(channel);
    const target = output.getChannelData(channel);
    const available = Math.max(0, Math.min(plan.lengthFrames, source.length - plan.startFrame));
    if (available) target.set(source.subarray(plan.startFrame, plan.startFrame + available));
    for (let index = 0; index < fadeInFrames; index += 1) target[index] *= index / Math.max(1, fadeInFrames - 1);
    for (let index = 0; index < fadeOutFrames; index += 1) {
      const targetIndex = plan.lengthFrames - fadeOutFrames + index;
      target[targetIndex] *= 1 - index / Math.max(1, fadeOutFrames - 1);
    }
  }
  return { buffer: output, ...plan };
}

export async function normalizeRecordingBlob(audioContext, blob, key) {
  const sourceBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
  const detected = measureRecordingOnset(sourceBuffer);
  const normalized = normalizeAudioBuffer(audioContext, sourceBuffer, key, detected.onsetMs);
  return {
    blob: encodeAudioBufferAsWav(normalized.buffer),
    mimeType: 'audio/wav',
    onsetMs: normalized.onsetMs,
    sourceOnsetMs: detected.onsetMs,
    durationMs: normalized.durationMs,
    normalized: true,
    gainDb: 0
  };
}

export function measureRecordingOnset(audioBuffer) {
  return measureOnset(mixAudioBufferToMono(audioBuffer), audioBuffer.sampleRate, {
    sustainMs: 50,
    relativeThreshold: 0.04,
    absoluteThreshold: 0.002
  });
}

export function encodeAudioBufferAsWav(audioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataLength = audioBuffer.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  const channelData = Array.from({ length: channels }, (_, channel) => audioBuffer.getChannelData(channel));
  let offset = 44;
  for (let frame = 0; frame < audioBuffer.length; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}
