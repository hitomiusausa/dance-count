import test from 'node:test';
import assert from 'node:assert/strict';
import { DANCE_PROFILES, TICKS_PER_BEAT } from '../../src/engine/dance-profiles.js';
import { beatMapTempo, constantTempo } from '../../src/engine/tempo-map.js';

const TEMPI = [...new Set([
  ...Object.values(DANCE_PROFILES).flatMap(profile => [profile.practiceBpm, profile.competitionBpm.min, profile.competitionBpm.max]),
  40, 67, 133.7, 220
])];
const LAST_TICK = 16 * 4 * TICKS_PER_BEAT;

test('(a) constant tempo matches the pre-move engine and audit arithmetic bit for bit on every tick', () => {
  for (const bpm of TEMPI) {
    const tempo = constantTempo(bpm);
    for (let tick = -2 * TICKS_PER_BEAT; tick <= LAST_TICK; tick += 1) {
      // audio-engine.js（移設前）: localTick / TICKS_PER_BEAT * 60 / bpm
      if (tempo.tickToSeconds(tick) !== tick / TICKS_PER_BEAT * 60 / bpm) assert.fail(`tickToSeconds ${bpm} ${tick}`);
      // dance-timing-audit.js・tools/audit-all-dance-timing.js: tick / 960 * 60_000 / bpm
      if (tempo.tickToMs(tick) !== tick / 960 * 60_000 / bpm) assert.fail(`tickToMs ${bpm} ${tick}`);
      // 仕様 §10 の式 tick × 60000 / (bpm × 960) と数学的に同値（浮動小数の丸め差だけ許す）
      assert.ok(Math.abs(tempo.tickToMs(tick) - tick * 60_000 / (bpm * 960)) < 1e-9);
    }
    // audio-engine.js frame()（移設前）: localSeconds / (60 / bpm) * TICKS_PER_BEAT
    for (const seconds of [0, 0.173, 1, 2.5, 61.3]) {
      assert.equal(tempo.secondsToTick(seconds), seconds / (60 / bpm) * TICKS_PER_BEAT);
    }
  }
});

test('(b) beat map returns each measured beat time exactly on beat ticks', () => {
  const beatsMs = [512, 1229, 1951, 2660, 3388, 4101];
  const tempo = beatMapTempo(beatsMs, 4);
  beatsMs.forEach((ms, index) => {
    assert.equal(tempo.tickToMs(index * TICKS_PER_BEAT), ms);
    assert.equal(tempo.msToTick(ms), index * TICKS_PER_BEAT);
  });
  assert.equal(tempo.tickToMs(TICKS_PER_BEAT / 2), (512 + 1229) / 2);
  assert.equal(tempo.beatsPerBar, 4);
});

test('(b2) beat map extrapolates past the last beat with the last interval and before the first with the first interval', () => {
  const tempo = beatMapTempo([1000, 1500, 2100], 3);
  assert.equal(tempo.tickToMs(3 * TICKS_PER_BEAT), 2700);
  assert.equal(tempo.tickToMs(-TICKS_PER_BEAT), 500);
  assert.equal(tempo.msToTick(2700), 3 * TICKS_PER_BEAT);
  assert.equal(tempo.msToTick(500), -TICKS_PER_BEAT);
});

test('(c) both tempo maps are strictly increasing and invert each other', () => {
  const maps = [constantTempo(84), constantTempo(133.7), beatMapTempo([0, 700, 1390, 2110, 2800], 4)];
  for (const tempo of maps) {
    let previous = -Infinity;
    for (let tick = -3 * TICKS_PER_BEAT; tick <= 8 * TICKS_PER_BEAT; tick += 37) {
      const ms = tempo.tickToMs(tick);
      assert.ok(ms > previous, `${tempo.kind} not increasing at ${tick}`);
      previous = ms;
      assert.ok(Math.abs(tempo.msToTick(ms) - tick) < 1e-6, `${tempo.kind} round trip at ${tick}`);
      assert.ok(Math.abs(tempo.tickToSeconds(tick) * 1000 - ms) < 1e-6, `${tempo.kind} seconds vs ms at ${tick}`);
    }
  }
});

test('invalid tempo input is rejected instead of producing NaN times', () => {
  for (const bpm of [0, -84, Number.NaN, Infinity, undefined]) {
    assert.throws(() => constantTempo(bpm), RangeError, `bpm ${String(bpm)}`);
  }
  assert.throws(() => beatMapTempo([1000], 4), RangeError);
  assert.throws(() => beatMapTempo([0, 500, 500], 4), RangeError);
  assert.throws(() => beatMapTempo([0, 500, 400], 4), RangeError);
  assert.throws(() => beatMapTempo([0, Number.NaN], 4), RangeError);
  assert.throws(() => beatMapTempo([0, 500], 0), RangeError);
});
