// 再生エンジンが実際に予約する時刻を、偽の AudioContext で記録する（tempo-map 集約の前後比較用）。
import { PracticeAudioEngine } from '../../src/engine/audio-engine.js';
import { compileRhythm, compileRoutine } from '../../src/engine/rhythm-compiler.js';

const VOICE_KEYS = ['slow', 'quick', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'and', 'ah'];

class FakeParam {
  constructor(log, name) { this.log = log; this.name = name; this.value = 1; }
  setValueAtTime(value, time) { this.log.push([this.name, 'set', value, time]); }
  exponentialRampToValueAtTime(value, time) { this.log.push([this.name, 'exp', value, time]); }
  linearRampToValueAtTime(value, time) { this.log.push([this.name, 'lin', value, time]); }
}

class FakeNode {
  constructor(log, kind) {
    this.log = log;
    this.kind = kind;
    this.gain = new FakeParam(log, `${kind}.gain`);
    this.frequency = new FakeParam(log, `${kind}.frequency`);
  }
  connect(node) { return node; }
  start(time, offset = 0) { this.log.push([this.kind, 'start', time, offset, this.frequency.value]); }
  stop(time) { this.log.push([this.kind, 'stop', time]); }
}

export class FakeAudioContext {
  constructor() { this.currentTime = 0; this.log = []; this.destination = {}; }
  createOscillator() { return new FakeNode(this.log, 'osc'); }
  createGain() { return new FakeNode(this.log, 'gain'); }
  createBufferSource() { return new FakeNode(this.log, 'voice'); }
}

export function fakeVoicePack() {
  return { words: new Map(VOICE_KEYS.map((key, index) => [key, { buffer: { duration: 0.9 }, onsetMs: 37 + index * 3, gainDb: -1.5 }])) };
}

// 入力は固定値で持つ（dance-profiles の練習 BPM・競技 BPM 上限・最後の標準パターンを 2026-10-11 時点で写したもの）。
// プロフィールのデータを編集してもゴールデン比較の入力が変わらないようにするため。値と並び順を変えないこと。
const PROFILE_CASE_INPUTS = [
  ['waltz', [84, 90, 67], '12&3'],
  ['tango', [112, 136, 67], 'SSQQS'],
  ['vwaltz', [150, 180, 67], '123'],
  ['slowfox', [80, 120, 67], 'SQQ'],
  ['quickstep', [160, 208, 67], 'QQS'],
  ['rumba', [80, 108, 67], '2341'],
  ['chacha', [96, 128, 67], '234&1'],
  ['samba', [80, 104, 67], 'SQQ'],
  ['pasodoble', [96, 124, 67], '12345678'],
  ['jive', [136, 176, 67], '123a45a6']
];

export const SCHEDULE_CASES = [
  ...PROFILE_CASE_INPUTS.flatMap(([danceId, bpms, counts]) => bpms.map(bpm => ({
    name: `${danceId}@${bpm}`,
    compiled: () => compileRhythm({ danceId, counts }),
    options: { bpm, countInBars: 1 }
  }))),
  {
    name: 'jive-routine-range@133.7',
    compiled: () => compileRoutine({ danceId: 'jive', figures: [
      { id: 'a', name: 'a', counts: '123a45a6' },
      { id: 'b', name: 'b', counts: '12' },
      { id: 'c', name: 'c', counts: '3a45a6' }
    ] }),
    options: { bpm: 133.7, countInBars: 2, rangeStartTick: 6 * 960, rangeEndTick: 12 * 960, voiceOffsetMs: 23, wordOffsetsMs: { six: -11 } }
  },
  {
    name: 'waltz-no-loop@84',
    compiled: () => compileRhythm({ danceId: 'waltz', counts: '12&3' }),
    options: { bpm: 84, loop: false, countInBars: 0, metronome: false }
  }
];

export async function recordSchedule(testCase) {
  const savedRaf = globalThis.requestAnimationFrame;
  const savedCancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  const context = new FakeAudioContext();
  const frames = [];
  const engine = new PracticeAudioEngine(context, { voicePack: fakeVoicePack(), onFrame: frame => frames.push(frame) });
  try {
    const compiled = testCase.compiled();
    const patternStart = engine.start({ compiled, ...testCase.options });
    for (let step = 1; step <= 40; step += 1) {
      context.currentTime = step * 0.173;
      engine.scheduleAhead();
      engine.frame();
    }
    return {
      patternStart,
      log: context.log,
      frames: frames.map(frame => ({
        playing: frame.playing,
        token: frame.event?.token ?? null,
        tick: frame.event?.absoluteTick ?? null,
        progress: frame.progress,
        originalTick: frame.originalTick ?? null,
        iteration: frame.iteration ?? null,
        countIn: frame.countIn ?? null
      }))
    };
  } finally {
    engine.stop();
    globalThis.requestAnimationFrame = savedRaf;
    globalThis.cancelAnimationFrame = savedCancel;
  }
}
