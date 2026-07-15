import test from 'node:test';
import assert from 'node:assert/strict';
import { measureRecordingOnset, normalizeAudioBuffer, recordingTrimPlan, REFERENCE_VOICE_TIMING } from '../../src/v2/recording-normalizer.js';

function audioBuffer(channels, sampleRate) {
  const data = channels.map(channel => Float32Array.from(channel));
  return {
    numberOfChannels: data.length,
    length: data[0].length,
    sampleRate,
    getChannelData: channel => data[channel]
  };
}

const audioContext = {
  createBuffer(numberOfChannels, length, sampleRate) {
    return audioBuffer(Array.from({ length: numberOfChannels }, () => new Float32Array(length)), sampleRate);
  }
};

test('trim plan aligns detected speech onset to the standard voice onset', () => {
  const plan = recordingTrimPlan('one', 1035, 1000);
  assert.equal(plan.startFrame, 1000);
  assert.equal(plan.onsetMs, REFERENCE_VOICE_TIMING.one.onsetMs);
  assert.equal(plan.lengthFrames, REFERENCE_VOICE_TIMING.one.durationMs);
});

test('normalization removes an early recording click and fixes clip duration', () => {
  const samples = new Float32Array(2200);
  samples[5] = 1; // 録音ボタン由来の短いクリック
  samples.fill(0.5, 1000, 1500); // 検出済みの発声区間
  const result = normalizeAudioBuffer(audioContext, audioBuffer([samples], 1000), 'one', 1000);
  const output = result.buffer.getChannelData(0);
  assert.equal(output.length, REFERENCE_VOICE_TIMING.one.durationMs);
  assert.equal(output[5], 0);
  assert.ok(output[REFERENCE_VOICE_TIMING.one.onsetMs + 20] > 0.45);
});

test('recording onset ignores a longer button click before sustained speech', () => {
  const samples = new Float32Array(1800);
  samples.fill(0.8, 100, 130); // 30msの機械的なクリック音
  samples.fill(0.35, 800, 1300); // 持続する発声
  const detected = measureRecordingOnset(audioBuffer([samples], 1000));
  assert.equal(detected.onsetMs, 800);
});
