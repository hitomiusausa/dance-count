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

// 鳴らしながらメトロノームのオン/オフ（ひとみうさ 2026-11-02: 切り替えても最初からにせず、そのまま進む）
const clicksOf = context => context.nodes.filter(node => node.kind === 'osc');
test('metronome off while playing stops only the clicks still to come, without restarting', () => {
  const { context, engine } = play({ countInBars: 0 });
  const startTime = engine.state.startTime;
  const stopped = [];
  for (const node of clicksOf(context)) node.stop = () => stopped.push(node);
  const scheduled = engine.metronomeClicks.size;
  assert.ok(scheduled > 0);
  context.currentTime = startTime + 0.5;   // 1 拍目は過ぎた
  const pastClicks = [...engine.metronomeClicks.values()].filter(time => time <= context.currentTime).length;
  engine.setMetronome(false);
  assert.equal(stopped.length, scheduled - pastClicks, 'only future clicks are stopped');
  assert.equal(engine.state.startTime, startTime, 'no restart');
  assert.equal(engine.playing, true);
  assert.equal(engine.state.metronome, false);

  engine.stop();
});

test('metronome on while playing adds clicks only after now, on the same beat grid', () => {
  const { context, engine } = play({ countInBars: 0, metronome: false });
  assert.equal(clicksOf(context).length, 0);
  const beat = 60 / 84;
  context.currentTime = engine.state.startTime + 1.2 * beat;
  engine.setMetronome(true);
  const times = [...engine.metronomeClicks.values()];
  assert.ok(times.length > 0);
  assert.ok(times.every(time => time > context.currentTime));
  for (const time of times) {
    const beats = (time - engine.state.startTime) / beat;
    assert.ok(Math.abs(beats - Math.round(beats)) < 1e-9, `click on a beat: ${beats}`);
  }
  assert.equal(Math.min(...times), engine.state.startTime + 2 * beat, 'resumes from the next beat');

  engine.stop();
});

test('the lead-in clicks are not touched by the metronome switch', () => {
  const { context, engine } = play({ countInBars: 1, metronome: false });
  const leadIn = clicksOf(context).length;
  assert.equal(leadIn, 3, 'waltz: one bar of lead-in');
  const stopped = [];
  for (const node of clicksOf(context)) node.stop = () => stopped.push(node);
  engine.setMetronome(true);
  engine.setMetronome(false);
  assert.equal(stopped.filter(node => clicksOf(context).indexOf(node) < leadIn).length, 0);

  engine.stop();
});
