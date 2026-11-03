// アプリと同じ鳴り方で、カウントの流れを WAV の波形にする（聴感ゲート用）。
// アプリの PracticeAudioEngine（src/engine/audio-engine.js）を、予約を書き留めるだけの AudioContext で動かし、その予約どおりに足し合わせる。
// 予約の計算（語を拍の何 ms 前から鳴らすか・次の語の拍で 12ms で消す・メトロノームの時刻と音量）はアプリのものを使う＝二つ目の計算を作らない。
// 2026-11-03: 以前の render-gate は語を最後まで重ねて鳴らしていて、アプリの「次の語の拍で切る」と違っていた（訂正）。
import { PracticeAudioEngine } from '../../src/engine/audio-engine.js';

class RecordedParam {
  constructor(value) { this.value = value; this.events = []; }
  setValueAtTime(value, time) { this.events.push({ type: 'set', value, time }); return this; }
  linearRampToValueAtTime(value, time) { this.events.push({ type: 'linear', value, time }); return this; }
  exponentialRampToValueAtTime(value, time) { this.events.push({ type: 'exp', value, time }); return this; }
  // time（秒）での値。Web Audio の自動化と同じ考え方（直前の点から次の点まで線形／指数でつなぐ）
  at(time) {
    let value = this.value;
    let from = { value: this.value, time: -Infinity };
    for (const event of this.events) {
      if (event.time <= time) { value = event.value; from = event; continue; }
      if (event.type === 'set') break;
      if (!Number.isFinite(from.time)) return value;
      const ratio = (time - from.time) / (event.time - from.time);
      if (event.type === 'linear') return from.value + (event.value - from.value) * ratio;
      return from.value * (event.value / from.value) ** ratio;
    }
    return value;
  }
}

class RecordedNode {
  constructor(kind, context) { this.kind = kind; this.context = context; this.output = null; }
  connect(node) { this.output = node; return node; }
  addEventListener() {}
}

export function createRecordingContext(sampleRate) {
  const context = {
    sampleRate,
    currentTime: 0,
    sources: [],
    destination: new RecordedNode('destination'),
    createGain() { const node = new RecordedNode('gain', context); node.gain = new RecordedParam(1); return node; },
    createBufferSource() {
      const node = new RecordedNode('buffer', context);
      node.start = (when = 0, offset = 0) => { node.when = when; node.offset = offset; context.sources.push(node); };
      node.stop = time => { node.stopAt ??= time; };
      return node;
    },
    createOscillator() {
      const node = new RecordedNode('oscillator', context);
      node.frequency = { value: 440 };
      node.start = (when = 0) => { node.when = when; context.sources.push(node); };
      node.stop = time => { node.stopAt ??= time; };
      return node;
    }
  };
  return context;
}

// 音源から出口までの GainNode の倍率を掛け合わせる（time 秒の時）
function gainAt(node, time) {
  let gain = 1;
  for (let current = node.output; current && current.kind === 'gain'; current = current.output) gain *= current.gain.at(time);
  return gain;
}

/**
 * words: { key: { samples: Float32Array, onsetMs, gainDb? } }（manifest の onsetMs＝アプリと同じ）
 * 返り値: { samples, startTime（最初の語の拍の秒） }。頭の余白 preRollMs・最後の余白 tailMs をつけた repetitions 回ぶん
 */
export function renderWithEngine(words, compiled, bpm, { sampleRate = 48000, repetitions = 2, clicks = true, preRollMs = 300, tailMs = 800 } = {}) {
  const context = createRecordingContext(sampleRate);
  const voicePack = { words: new Map(Object.entries(words).map(([key, word]) => [key, {
    onsetMs: word.onsetMs, gainDb: word.gainDb ?? 0, buffer: { duration: word.samples.length / sampleRate, samples: word.samples }
  }])) };
  const engine = new PracticeAudioEngine(context, { voicePack, lookaheadSeconds: 0 });
  const realSetInterval = globalThis.setInterval;
  const realRaf = globalThis.requestAnimationFrame;
  globalThis.setInterval = () => 0;           // 予約は下で手で進める
  globalThis.requestAnimationFrame = () => 0;
  let startTime;
  try {
    startTime = engine.start({ compiled, bpm, loop: true, metronome: clicks, countInBars: 0 });
    const duration = (startTime - context.currentTime) + repetitions * compiled.durationTicks * 60 / bpm / 960;
    engine.lookaheadSeconds = duration + 5;    // repetitions 回＋次の回の頭まで予約させる（次の回の頭が前の語の終わりを決める）
    engine.scheduleAhead();
  } finally {
    engine.playing = false;                    // stop() は呼ばない（予約を消すため）
    globalThis.setInterval = realSetInterval;
    globalThis.requestAnimationFrame = realRaf;
  }
  const shift = preRollMs / 1000 - startTime;  // 最初の語の拍を preRollMs に置く
  const totalSeconds = preRollMs / 1000 + repetitions * compiled.durationTicks * 60 / bpm / 960 + tailMs / 1000;
  const mix = new Float32Array(Math.ceil(totalSeconds * sampleRate));
  const endOfPattern = startTime + repetitions * compiled.durationTicks * 60 / bpm / 960;
  for (const source of context.sources) {
    if (source.when >= endOfPattern - 1e-9) continue;   // repetitions 回より後の語・クリックは鳴らさない（前の語の終わりを決めるためだけに予約した）
    const stopAt = source.stopAt ?? Infinity;
    if (source.kind === 'buffer') {
      const data = source.buffer.samples;
      const first = Math.round((source.when + shift) * sampleRate);
      const skip = Math.round(source.offset * sampleRate);
      for (let index = skip; index < data.length; index += 1) {
        const time = source.when + (index - skip) / sampleRate;
        if (time >= stopAt) break;
        const target = first + index - skip;
        if (target >= 0 && target < mix.length) mix[target] += data[index] * gainAt(source, time);
      }
    } else {
      const first = Math.round((source.when + shift) * sampleRate);
      const length = Math.round((stopAt - source.when) * sampleRate);
      for (let index = 0; index < length; index += 1) {
        const time = source.when + index / sampleRate;
        const target = first + index;
        if (target >= 0 && target < mix.length) mix[target] += Math.sin(2 * Math.PI * source.frequency.value * index / sampleRate) * gainAt(source, time);
      }
    }
  }
  return { samples: mix, startTime: preRollMs / 1000 };
}
