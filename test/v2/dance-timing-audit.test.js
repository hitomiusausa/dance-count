import test from 'node:test';
import assert from 'node:assert/strict';

import { DANCE_PROFILES, TICKS_PER_BEAT } from '../../src/v2/dance-profiles.js';
import { atomicRhythmCases, auditCompiledTransitions, expectedEventTimeMs } from '../../src/v2/dance-timing-audit.js';
import { compileRhythm } from '../../src/v2/rhythm-compiler.js';

test('every atomic count transition accepted by each dance compiles on integer ticks', () => {
  let checked = 0;
  for (const profile of Object.values(DANCE_PROFILES)) {
    const cases = atomicRhythmCases(profile);
    assert.ok(cases.length > 0, profile.name);
    for (const counts of cases) {
      const compiled = compileRhythm({ danceId: profile.id, counts });
      for (const event of compiled.events) assert.equal(Number.isInteger(event.absoluteTick), true, `${profile.name} ${counts}`);
      checked += 1;
    }
  }
  assert.ok(checked >= 500);
});

test('event milliseconds are derived exactly from ticks at all profile tempos', () => {
  for (const profile of Object.values(DANCE_PROFILES)) {
    for (const bpm of [profile.practiceBpm, profile.competitionBpm.min, profile.competitionBpm.max]) {
      for (const counts of profile.templates) {
        const compiled = compileRhythm({ danceId: profile.id, counts });
        for (const event of compiled.events) {
          assert.equal(expectedEventTimeMs(event, bpm), event.absoluteTick / TICKS_PER_BEAT * 60_000 / bpm);
        }
      }
    }
  }
});

test('transition audit distinguishes exact onset gap from active-voice overlap', () => {
  const compiled = compileRhythm({ danceId: 'jive', counts: '3a4' });
  const transitions = auditCompiledTransitions(compiled, 176, { three: 295, ah: 270, four: 240 });
  assert.equal(Math.round(transitions[0].gapMs), 256);
  assert.equal(Math.round(transitions[0].overlapMs), 39);
  assert.equal(Math.round(transitions[1].gapMs), 85);
  assert.equal(Math.round(transitions[1].overlapMs), 185);
});
