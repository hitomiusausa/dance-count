import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTDOWN, captureWaitMs, countdownPlan, micOpenEstimateMs, type CountdownPlan } from '../../../src/app/voices/countdown.ts';
import { TAKE_MS } from '../../../src/app/platform/recorder.ts';
import { processTake, type DecodeContext } from '../../../src/app/voices/normalize.ts';
import { checkTake } from '../../../src/app/voices/take-check.ts';
import { fakeAudio, fakeBuffer, type FakeBuffer } from '../helpers/voice-fixtures.ts';
import { ABOUT_TEXT as ABOUT_MESSAGES } from '../../../src/app/i18n/about.ts';
import { APP_MESSAGES } from '../../../src/app/i18n/messages.ts';

const RATE = 48000;
const REACTION_MS = 300;   // 「今！」が聞こえてから言い始めるまで（ひとみうさの前提）

test('the countdown is 3 → 2 → 1 → Now about 1 s apart, pi on 3/2/1 and a higher, longer pōn ≤ 120 ms (D59)', () => {
  const plan = countdownPlan();
  assert.deepEqual(plan.marks.map(mark => mark.mark), [3, 2, 1, 'now']);
  assert.deepEqual(plan.marks.map(mark => mark.atMs), [60, 1060, 2060, 3060]);
  assert.deepEqual(plan.cues.map(cue => cue.atMs), [60, 1060, 2060, 3060], 'each cue on its number');
  const [pi, , , pon] = plan.cues;
  assert.ok(pon!.hz > pi!.hz && pon!.ms > pi!.ms, 'pōn is higher and longer');
  assert.ok(pon!.ms <= 120);
});

test('the take starts only after the last cue has ended plus the guard, shifted by the output latency (D59)', () => {
  for (const latency of [0, 40, 200]) {
    const plan = countdownPlan(latency);
    const heardEnd = Math.max(...plan.cues.map(cue => cue.atMs + cue.ms)) + latency;
    assert.equal(plan.captureAtMs, heardEnd + COUNTDOWN.guardMs, `latency ${latency}`);
    assert.equal(plan.marks.at(-1)!.atMs, 3060 + latency, 'the numbers follow what is heard');
  }
});

test('if the audio clock lags behind the screen clock, the cues are stopped and the take waits (D59)', () => {
  const plan = countdownPlan(0);
  assert.equal(captureWaitMs(plan, plan.captureAtMs, 0), 0, 'clocks agree');
  assert.equal(captureWaitMs(plan, null, 0), 0, 'no cue sounds were scheduled');
  assert.equal(captureWaitMs(plan, 2500, 0), COUNTDOWN.guardMs, 'the pōn has not played yet');
  assert.equal(captureWaitMs(plan, 3100, 200), 200 + COUNTDOWN.guardMs, 'the pōn is still sounding');
});

test('the privacy text says “about 6 seconds” for the countdown and the take, and the note says 2 seconds', () => {
  const seconds = Math.round(micOpenEstimateMs(TAKE_MS) / 1000);
  assert.equal(seconds, 6);
  assert.match(ABOUT_MESSAGES['ja-JP'].aboutPrivacy4, new RegExp(`約\\u00A0${seconds}\\u00A0秒`));
  assert.match(ABOUT_MESSAGES.en.aboutPrivacy4, new RegExp(`about ${seconds} seconds`));
  assert.match(APP_MESSAGES['ja-JP'].recordAutoStop, new RegExp(`約\\u00A0${TAKE_MS / 1000}\\u00A0秒`));
  assert.match(APP_MESSAGES.en.recordAutoStop, new RegExp(`about ${TAKE_MS / 1000} seconds`));
  for (const text of [ABOUT_MESSAGES['ja-JP'].aboutPrivacy4, ABOUT_MESSAGES.en.aboutPrivacy4]) assert.equal(/1\.5/.test(text), false);
});

// --- 合図の音が録音に入らないこと（ビープ → 声 の合成の信号で、本物の判定と切り出し processTake を通す）
// 部屋の中: 合図の音（出力の遅れ latency で届く・残響は時定数 tauMs で減衰）＋ 声（「今」が聞こえてから REACTION_MS 後・220Hz 0.5）。
function room(plan: CountdownPlan, { latencyMs = 0, tauMs = 58, voiceAtMs }: { latencyMs?: number; tauMs?: number; voiceAtMs: number }): Float32Array {
  const total = plan.captureAtMs + TAKE_MS + 500;
  const samples = new Float32Array(Math.round(total * RATE / 1000));
  for (const cue of plan.cues) {
    const start = Math.round((cue.atMs + latencyMs) * RATE / 1000);
    const end = start + Math.round(cue.ms * RATE / 1000);
    for (let i = start; i < samples.length; i += 1) {
      const decay = i < end ? 1 : Math.exp(-((i - end) / RATE * 1000) / tauMs);   // 鳴り終わった後は残響だけ
      if (decay < 1e-6) break;
      samples[i] += 0.3 * decay * Math.sin(2 * Math.PI * cue.hz * i / RATE);
    }
  }
  const voiceStart = Math.round(voiceAtMs * RATE / 1000);
  for (let i = voiceStart; i < Math.min(samples.length, voiceStart + Math.round(0.6 * RATE)); i += 1) samples[i] += 0.5 * Math.sin(2 * Math.PI * 220 * i / RATE);
  return samples;
}

function captureFrom(samples: Float32Array, fromMs: number): FakeBuffer {
  const start = Math.round(fromMs * RATE / 1000);
  return fakeBuffer([samples.slice(start, start + Math.round(TAKE_MS * RATE / 1000))], RATE);
}

const decoding = (buffer: FakeBuffer): DecodeContext => ({ ...fakeAudio, async decodeAudioData() { return buffer; } });

for (const latencyMs of [0, 200]) {
  test(`beep-then-voice: the take holds the voice, not the pōn, and is cut at the voice (latency ${latencyMs} ms)`, async () => {
    const plan = countdownPlan(latencyMs);
    const nowHeardMs = plan.marks.at(-1)!.atMs;   // 「今」の数字＝ポーンが聞こえる時
    const voiceAtMs = nowHeardMs + REACTION_MS;
    const samples = room(plan, { latencyMs, voiceAtMs });
    const take = captureFrom(samples, plan.captureAtMs);
    const expectedOnset = voiceAtMs - plan.captureAtMs;
    assert.ok(expectedOnset > 0, 'a 300 ms reaction still starts inside the take');
    const check = checkTake(take);
    assert.equal(check.problem, null);
    assert.ok(Math.abs(check.onsetMs! - expectedOnset) <= 10, `onset ${check.onsetMs} vs voice ${expectedOnset}`);
    const result = await processTake(decoding(take), new Blob(['x']), 'slow');
    assert.equal(result.ok, true);
    if (result.ok) assert.ok(Math.abs(result.word.sourceOnsetMs - expectedOnset) <= 10);
    // 対照: 「今」の時に録音を始めていたら、判定はポーンを声の頭と取る（＝余白が要る理由）
    const naive = checkTake(captureFrom(samples, nowHeardMs));
    assert.ok(naive.onsetMs! < 20, `a take from “Now” would start on the pōn (onset ${naive.onsetMs})`);
  });
}

test('a late speaker (1 s after “Now!”) still fits in the 2 s window', () => {
  const plan = countdownPlan(0);
  const voiceAtMs = plan.marks.at(-1)!.atMs + 1000;
  const check = checkTake(captureFrom(room(plan, { voiceAtMs }), plan.captureAtMs));
  assert.equal(check.problem, null);
});
