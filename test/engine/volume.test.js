// D73 声とメトロノームの大きさ: 出口（GainNode）2 本の倍率だけ。予約の時刻は変えない。
import test from 'node:test';
import assert from 'node:assert/strict';
import { PracticeAudioEngine, clampVolume } from '../../src/engine/audio-engine.js';
import { compileRhythm } from '../../src/engine/rhythm-compiler.js';
import { fakeVoicePack } from './engine-schedule-harness.js';

class Node {
  constructor(kind, context) { this.kind = kind; this.context = context; this.gain = { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }; this.frequency = { value: 0 }; this.target = null; }
  connect(node) { this.target = node; return node; }
  start() {}
  stop() {}
}
class Context {
  constructor() { this.currentTime = 0; this.destination = { kind: 'destination' }; this.nodes = []; }
  make(kind) { const node = new Node(kind, this); this.nodes.push(node); return node; }
  createGain() { return this.make('gain'); }
  createOscillator() { return this.make('osc'); }
  createBufferSource() { return this.make('voice'); }
}

function play(options = {}) {
  const savedRaf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame ??= () => {};
  const context = new Context();
  const engine = new PracticeAudioEngine(context, { voicePack: fakeVoicePack() });
  try {
    engine.start({ compiled: compileRhythm({ danceId: 'waltz', counts: '123' }), bpm: 84, countInBars: 0, ...options });
    return { context, engine };
  } finally {
    globalThis.requestAnimationFrame = savedRaf;
  }
}

// 声・クリックの音源が、どの出口につながったか（音源 → 語ごと／クリックごとの gain → 出口）
const busOf = node => node.target?.target;

test('D73: voices go through the voice bus and clicks through the metronome bus; both buses reach the speakers', () => {
  const { context, engine } = play({ voiceVolume: 0.25, clickVolume: 0.64 });
  try {
  const { voice, click } = engine.buses;
  assert.equal(voice.target, context.destination);
  assert.equal(click.target, context.destination);
  assert.equal(voice.gain.value, 0.25);
  assert.equal(click.gain.value, 0.64);
  const voices = context.nodes.filter(node => node.kind === 'voice');
  const clicks = context.nodes.filter(node => node.kind === 'osc');
  assert.ok(voices.length > 0 && voices.every(node => busOf(node) === voice));
  assert.ok(clicks.length > 0 && clicks.every(node => busOf(node) === click));
  } finally {
    engine.stop();
  }
});

test('D73: changing the volume while playing only changes the bus gain (nothing is rescheduled)', () => {
  const { context, engine } = play();
  assert.deepEqual([engine.buses.voice.gain.value, engine.buses.click.gain.value], [1, 1]);
  const before = context.nodes.length;
  engine.setVolumes({ click: 0 });
  assert.deepEqual([engine.buses.voice.gain.value, engine.buses.click.gain.value], [1, 0]);
  assert.equal(context.nodes.length, before);
  assert.equal(engine.playing, true);
  engine.stop();
});

test('D73: the default is today’s level and bad values are clamped', () => {
  const { engine } = play();
  assert.deepEqual(engine.volumes, { voice: 1, click: 1 });
  assert.equal(clampVolume(2), 1);
  assert.equal(clampVolume(-1), 0);
  assert.equal(clampVolume('x'), 1);
  engine.stop();
});
