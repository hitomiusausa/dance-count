// D72 小節を数える: 小節の頭の「1」だけが番号の語になり、予約の時刻（と止める時刻）は変わらない。
import test from 'node:test';
import assert from 'node:assert/strict';
import { BAR_COUNT_WORDS, PracticeAudioEngine, barOrdinal, spokenVoiceKey } from '../../src/engine/audio-engine.js';
import { compileRhythm, compileRoutine } from '../../src/engine/rhythm-compiler.js';
import { FakeAudioContext, fakeVoicePack } from './engine-schedule-harness.js';

function run(compiled, options) {
  const savedRaf = globalThis.requestAnimationFrame;
  const savedCancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  const context = new FakeAudioContext();
  const pack = fakeVoicePack();
  // 同じ onset の声にして、語が替わっても開始の時刻が替わらないことを見る（語ごとの onset の差は声の側の補正で、時刻の計算ではない）
  for (const word of pack.words.values()) word.onsetMs = 40;
  const words = [];
  const get = pack.words.get.bind(pack.words);
  pack.words.get = key => { words.push(key); return get(key); };
  const frames = [];
  const engine = new PracticeAudioEngine(context, { voicePack: pack, onFrame: frame => frames.push(frame) });
  try {
    engine.start({ compiled, ...options });
    for (let step = 1; step <= 120; step += 1) {
      context.currentTime = step * 0.25;
      engine.scheduleAhead();
      engine.frame();
    }
    return { log: context.log, words, frames };
  } finally {
    engine.stop();
    globalThis.requestAnimationFrame = savedRaf;
    globalThis.cancelAnimationFrame = savedCancel;
  }
}

test('D72: the words are 1-2-3, 2-2-3 … 8-2-3, then 1-2-3 again (waltz)', () => {
  const { words } = run(compileRhythm({ danceId: 'waltz', counts: '123' }), { bpm: 84, countInBars: 0, barCounting: true });
  const firsts = words.filter((_, index) => index % 3 === 0).slice(0, 10);
  assert.deepEqual(firsts, ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'one', 'two']);
  assert.ok(words.filter((_, index) => index % 3 === 1).every(word => word === 'two'));
  assert.ok(words.filter((_, index) => index % 3 === 2).every(word => word === 'three'));
});

test('D72: bar counting changes only which word is chosen — every scheduled time is the same', () => {
  for (const [danceId, counts, bpm, countInBars] of [['waltz', '12&3', 84, 2], ['vwaltz', '123', 180, 1], ['waltz', '123', 67, 0]]) {
    const plain = run(compileRhythm({ danceId, counts }), { bpm, countInBars });
    const counted = run(compileRhythm({ danceId, counts }), { bpm, countInBars, barCounting: true });
    assert.deepEqual(counted.log, plain.log, `${danceId} ${counts}`);
    assert.notDeepEqual(counted.words, plain.words);
  }
});

test('D72: off (the default) chooses exactly the original words', () => {
  const compiled = compileRhythm({ danceId: 'waltz', counts: '12&3' });
  const plain = run(compiled, { bpm: 84, countInBars: 1 });
  assert.deepEqual(plain.words.slice(0, 8), ['one', 'two', 'and', 'three', 'one', 'two', 'and', 'three']);
  assert.ok(plain.frames.every(frame => !('bar' in frame)));
});

test('D72: the frame carries the bar number (1–8) from the same tick, and none during the lead-in', () => {
  const { frames } = run(compileRhythm({ danceId: 'waltz', counts: '123' }), { bpm: 180, countInBars: 1, barCounting: true });
  const lead = frames.filter(frame => frame.countIn);
  assert.ok(lead.length > 0 && lead.every(frame => frame.bar === undefined));
  const bars = frames.filter(frame => frame.playing && !frame.countIn).map(frame => frame.bar);
  assert.equal(bars[0], 1);
  assert.ok(bars.includes(8) && bars.every(bar => bar >= 1 && bar <= 8));
});

test('D72: a routine range counts from the bar the range starts in', () => {
  const compiled = compileRoutine({ danceId: 'waltz', figures: [
    { id: 'a', name: 'a', counts: '123123' }, { id: 'b', name: 'b', counts: '123' }, { id: 'c', name: 'c', counts: '123' }
  ] });
  const bar = 3 * 960;
  const options = { rangeStartTick: 2 * bar, rangeDurationTicks: 2 * bar, beatsPerBar: 3, barCounting: true };
  const first = compiled.events.find(event => event.absoluteTick === 2 * bar);
  assert.equal(spokenVoiceKey(first, { ...options, iteration: 0 }), 'one');
  assert.equal(spokenVoiceKey(compiled.events.find(event => event.absoluteTick === 3 * bar), { ...options, iteration: 0 }), 'two');
  assert.equal(spokenVoiceKey(first, { ...options, iteration: 1 }), 'three');
  assert.equal(barOrdinal({ tick: 2 * bar, iteration: 4, rangeStartTick: 2 * bar, rangeDurationTicks: 2 * bar, beatsPerBar: 3 }), 8);
  assert.equal(spokenVoiceKey(first, { ...options, iteration: 4 }), 'one');   // 9 小節目は 1 に戻る
});

test('D72: only a “1” on the downbeat is replaced (an off-beat word or a “1” off the downbeat stays)', () => {
  const options = { barCounting: true, iteration: 0, rangeStartTick: 0, rangeDurationTicks: 11520, beatsPerBar: 4 };
  assert.equal(spokenVoiceKey({ absoluteTick: 3840, voiceKey: 'one' }, options), 'two');
  assert.equal(spokenVoiceKey({ absoluteTick: 2880, voiceKey: 'one' }, options), 'one');   // ルンバの「4-1」の 1 は強拍ではない
  assert.equal(spokenVoiceKey({ absoluteTick: 3840, voiceKey: 'five' }, options), 'five');
  assert.equal(spokenVoiceKey({ absoluteTick: 3840, voiceKey: 'slow' }, options), 'slow');
  assert.equal(BAR_COUNT_WORDS.length, 8);
});
