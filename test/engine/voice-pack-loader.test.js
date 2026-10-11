import test from 'node:test';
import assert from 'node:assert/strict';

import { loadVoicePack, scheduleVoiceEvent, validateManifest, VoicePackError } from '../../src/engine/voice-pack-loader.js';

test('voice manifest v2 accepts per-word onset metadata', () => {
  assert.equal(validateManifest({
    schemaVersion: 2,
    id: 'test-pack',
    words: { one: { file: 'one.wav', onsetMs: 24, gainDb: -1 } }
  }), true);
});

test('voice manifest rejects a negative onset', () => {
  assert.throws(
    () => validateManifest({
      schemaVersion: 2,
      id: 'test-pack',
      words: { one: { file: 'one.wav', onsetMs: -1 } }
    }),
    VoicePackError
  );
});

test('voice pack keeps manifest order when decoding completes out of order', async () => {
  const manifest = {
    schemaVersion: 2,
    id: 'ordered-pack',
    words: {
      one: { file: 'one.wav', onsetMs: 10 },
      two: { file: 'two.wav', onsetMs: 10 },
      three: { file: 'three.wav', onsetMs: 10 }
    }
  };
  const delays = { 'one.wav': 15, 'two.wav': 5, 'three.wav': 0 };
  const fetchImpl = async url => {
    if (String(url).endsWith('manifest.json')) {
      return { ok: true, json: async () => manifest };
    }
    const file = String(url).split('/').at(-1);
    await new Promise(resolve => setTimeout(resolve, delays[file]));
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) };
  };
  const audioContext = {
    decodeAudioData: async () => ({ duration: 1 })
  };

  const pack = await loadVoicePack(audioContext, 'https://example.test/audio/manifest.json', fetchImpl);
  assert.deepEqual([...pack.words.keys()], ['one', 'two', 'three']);
});

test('late scheduling skips the elapsed buffer head while preserving voice onset timing', () => {
  const starts = [];
  const source = { connect: () => ({ connect() {} }), start: (...args) => starts.push(args) };
  const audioContext = {
    currentTime: 10,
    destination: {},
    createBufferSource: () => source,
    createGain: () => ({ gain: { value: 0 } })
  };
  const voicePack = { words: new Map([['one', { onsetMs: 50, gainDb: 0, buffer: { duration: 0.6 } }]]) };
  scheduleVoiceEvent({ audioContext, voicePack, event: { voiceKey: 'one' }, targetTime: 10.02 });
  assert.equal(starts.length, 1);
  assert.equal(starts[0][0], 10);
  assert.ok(Math.abs(starts[0][1] - 0.03) < 1e-9);
});

test('voice can fade and stop exactly at the next audible count onset', () => {
  const starts = [];
  const stops = [];
  const gainEvents = [];
  const source = { connect: () => ({ connect() {} }), start: (...args) => starts.push(args), stop: time => stops.push(time) };
  const audioContext = {
    currentTime: 10,
    destination: {},
    createBufferSource: () => source,
    createGain: () => ({ gain: {
      value: 0.5,
      setValueAtTime: (value, time) => gainEvents.push(['set', value, time]),
      linearRampToValueAtTime: (value, time) => gainEvents.push(['ramp', value, time])
    } })
  };
  const voicePack = { words: new Map([['ah', { onsetMs: 25, gainDb: -6.0206, buffer: { duration: 0.5 } }]]) };
  scheduleVoiceEvent({ audioContext, voicePack, event: { voiceKey: 'ah' }, targetTime: 10.2, endTime: 10.285, fadeOutSeconds: 0.012 });
  assert.deepEqual(starts, [[10.174999999999999, 0]]);
  assert.deepEqual(stops, [10.285]);
  assert.equal(gainEvents[0][0], 'set');
  assert.ok(Math.abs(gainEvents[0][2] - 10.273) < 1e-9);
  assert.deepEqual(gainEvents[1], ['ramp', 0, 10.285]);
});
