import test from 'node:test';
import assert from 'node:assert/strict';

import { TICKS_PER_BEAT } from '../../src/engine/dance-profiles.js';
import { DANCE_PROFILES } from '../../src/engine/dance-profiles.js';
import { compileRhythm, compileRoutine, eventTimeSeconds } from '../../src/engine/rhythm-compiler.js';

const positions = compiled => compiled.events.map(event => event.absoluteTick / TICKS_PER_BEAT);

test('Waltz 123 fills one three-beat bar', () => {
  const result = compileRhythm({ danceId: 'waltz', counts: '123' });
  assert.deepEqual(positions(result), [0, 1, 2]);
  assert.equal(result.durationTicks, 3 * TICKS_PER_BEAT);
  assert.deepEqual(result.warnings, []);
});

test('Waltz 12&3 places & on the half beat', () => {
  const result = compileRhythm({ danceId: 'waltz', counts: '12&3' });
  assert.deepEqual(positions(result), [0, 1, 1.5, 2]);
  assert.equal(result.durationTicks, 3 * TICKS_PER_BEAT);
});

test('Slow Foxtrot SQQ is four beats', () => {
  const result = compileRhythm({ danceId: 'slowfox', counts: 'SQQ' });
  assert.deepEqual(positions(result), [0, 2, 3]);
  assert.equal(result.durationTicks, 4 * TICKS_PER_BEAT);
});

test('Cha Cha 234&1 places 4-and-one correctly', () => {
  const result = compileRhythm({ danceId: 'chacha', counts: '234&1' });
  assert.deepEqual(positions(result), [0, 1, 2, 2.5, 3]);
  assert.equal(result.durationTicks, 4 * TICKS_PER_BEAT);
});

test('Samba 1a2 uses the three-quarter subdivision', () => {
  const result = compileRhythm({ danceId: 'samba', counts: '1a2' });
  assert.deepEqual(positions(result), [0, 0.75, 1]);
  assert.equal(result.durationTicks, 2 * TICKS_PER_BEAT);
});

test('Samba SQQ is two beats', () => {
  const result = compileRhythm({ danceId: 'samba', counts: 'SQQ' });
  assert.deepEqual(positions(result), [0, 1, 1.5]);
  assert.equal(result.durationTicks, 2 * TICKS_PER_BEAT);
});

test('Jive 123a45a6 produces two three-a-four groups', () => {
  const result = compileRhythm({ danceId: 'jive', counts: '123a45a6' });
  assert.deepEqual(positions(result), [0, 1, 2, 2.75, 3, 4, 4.75, 5]);
  assert.equal(result.durationTicks, 6 * TICKS_PER_BEAT);
});

test('routine figures preserve the global bar phase', () => {
  const result = compileRoutine({
    danceId: 'slowfox',
    figures: [
      { id: 'a', name: 'A', counts: 'S' },
      { id: 'b', name: 'B', counts: 'QQ' }
    ]
  });
  assert.deepEqual(positions(result), [0, 2, 3]);
  assert.equal(result.events[1].figureId, 'b');
  assert.equal(result.events[1].beatInBar, 2);
});

test('ambiguous leading subdivision is rejected', () => {
  assert.throws(
    () => compileRhythm({ danceId: 'tango', counts: '&QQ' }),
    error => error.details.code === 'AMBIGUOUS_LEADING_SUBDIVISION'
  );
});

test('pickup subdivision is placed before beat zero', () => {
  const result = compileRhythm({
    danceId: 'tango',
    counts: '&QQ',
    leadingSubdivision: 'pickup'
  });
  assert.deepEqual(positions(result), [-0.5, 0, 1]);
});

test('event ticks convert to AudioContext seconds without accumulation', () => {
  const result = compileRhythm({ danceId: 'chacha', counts: '234&1' });
  assert.equal(eventTimeSeconds(result.events[3], 120, 10), 11.25);
});

test('all ten dance profiles have at least one compilable template', () => {
  assert.equal(Object.keys(DANCE_PROFILES).length, 10);
  for (const profile of Object.values(DANCE_PROFILES)) {
    const result = compileRhythm({ danceId: profile.id, counts: profile.templates[0] });
    assert.ok(result.events.length > 0, profile.name);
  }
});

test('dance-specific vocabulary rejects numeric counts for Tango', () => {
  assert.throws(
    () => compileRhythm({ danceId: 'tango', counts: '1234' }),
    error => error.details.code === 'TOKEN_NOT_ALLOWED_FOR_DANCE'
  );
});

test('routine compilation reports which figure contains an invalid count', () => {
  assert.throws(
    () => compileRoutine({ danceId: 'tango', figures: [
      { id: 'ok', name: 'Walks', counts: 'SS' },
      { id: 'bad', name: 'Broken', counts: '1' }
    ] }),
    error => error.details.figureIndex === 1 && error.details.figureId === 'bad'
  );
});

test('dance-specific vocabulary keeps Samba S/Q and 1a2 timing', () => {
  assert.doesNotThrow(() => compileRhythm({ danceId: 'samba', counts: 'SQQ' }));
  assert.doesNotThrow(() => compileRhythm({ danceId: 'samba', counts: '1a2' }));
});
