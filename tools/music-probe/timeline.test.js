import test from 'node:test';
import assert from 'node:assert/strict';
import { probeTimeline } from './timeline.js';

const report = { durationSeconds: 20, trackedBeatsSeconds: Array.from({ length: 30 }, (_, i) => .2 + i * .5 + i*i*.001), constantFirstBeatSeconds: .2, constantBpm: 120 };
test('variable beat positions survive a nonzero excerpt start and inverse display mapping', () => {
  const { events, tempo } = probeTimeline(report, { from: 3, duration: 8 });
  assert.ok(events.length > 10);
  for (const event of events) {
    assert.ok(Number.isInteger(event.absoluteTick));
    assert.equal(event.trackSeconds, report.trackedBeatsSeconds[event.absoluteTick / 960]);
    assert.equal(event.localSeconds, event.trackSeconds - 3);
    assert.ok(Math.abs(tempo.secondsToTick(event.trackSeconds) - event.absoluteTick) < 1e-8);
    assert.equal(event.token, String(event.absoluteTick / 960 % 4 + 1));
  }
});
test('phase moves the count vocabulary while offset moves time; neither changes integer beat placement', () => {
  const a = probeTimeline(report, { from: 3, duration: 8 });
  const b = probeTimeline(report, { from: 3, duration: 8, phase: 1, offsetMs: 50 });
  for (const event of b.events) {
    const original = a.events.find(e => e.absoluteTick === event.absoluteTick);
    if (!original) continue;
    assert.ok(Math.abs(event.trackSeconds - original.trackSeconds - .05) < 1e-10);
    assert.equal(Number(event.token), (Number(original.token) + 2) % 4 + 1);
  }
});
test('no inferred beats are extrapolated beyond the tracked region and invalid ranges fail', () => {
  const result = probeTimeline(report, { from: 15, duration: 5 });
  assert.ok(result.events.every(e => e.absoluteTick <= 29*960 && e.localSeconds >= .12 && e.localSeconds < 4.88));
  assert.throws(() => probeTimeline(report, { from: 19, duration: 5 }), RangeError);
  assert.throws(() => probeTimeline(report, { phase: 4 }), RangeError);
});
