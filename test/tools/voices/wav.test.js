import test from 'node:test';
import assert from 'node:assert/strict';
import { encodePcm16Wav, parsePcm16Wav } from '../../../tools/voices/wav.js';
import { voiced } from './helpers.js';

test('encodePcm16Wav → parsePcm16Wav round-trips a mono signal within one LSB', () => {
  const source = voiced(50);
  const parsed = parsePcm16Wav(encodePcm16Wav(source, 48_000));
  assert.equal(parsed.sampleRate, 48_000);
  assert.equal(parsed.channels, 1);
  assert.equal(parsed.bitsPerSample, 16);
  assert.equal(parsed.samples.length, source.length);
  for (let index = 0; index < source.length; index += 1) assert.ok(Math.abs(parsed.samples[index] - source[index]) <= 1 / 32767);
});

test('stereo input is averaged to mono', () => {
  const left = new Float32Array([0.5, 0.5, -0.25]);
  const right = new Float32Array([0.25, -0.5, -0.25]);
  const parsed = parsePcm16Wav(encodePcm16Wav([left, right], 24_000));
  assert.equal(parsed.channels, 2);
  assert.equal(parsed.sampleRate, 24_000);
  assert.deepEqual([...parsed.samples].map(value => Math.round(value * 1000) / 1000), [0.375, 0, -0.25]);
});

test('an odd-sized chunk before data is padded and skipped', () => {
  const plain = encodePcm16Wav(new Float32Array([0.5, -0.5]), 48_000);
  const odd = Buffer.concat([Buffer.from('LIST'), Buffer.from([3, 0, 0, 0]), Buffer.from('abc'), Buffer.from([0])]);
  const buffer = Buffer.concat([plain.subarray(0, 36), odd, plain.subarray(36)]);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  const parsed = parsePcm16Wav(buffer);
  assert.equal(parsed.samples.length, 2);
  assert.ok(Math.abs(parsed.samples[0] - 0.5) < 1e-3);
});

test('non-16-bit WAV is rejected', () => {
  const buffer = encodePcm16Wav(new Float32Array([0]), 48_000);
  buffer.writeUInt16LE(24, 34);
  assert.throws(() => parsePcm16Wav(buffer), /16-bit/);
});
