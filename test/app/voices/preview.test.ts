import test from 'node:test';
import assert from 'node:assert/strict';
import { compileProgram } from '../../../src/app/practice/session.ts';
import { DEFAULT_VOICE } from '../../../src/app/voices/selection.ts';
import { voicePreviewOptions } from '../../../src/app/voices/preview.ts';

test('S7 previews one waltz bar, the S8 comparison two, with no lead-in and no repeat (Ruling 61-5)', () => {
  const one = voicePreviewOptions(DEFAULT_VOICE, -20, 1);
  assert.equal(one.kind === 'counts' && one.counts, '123');
  assert.equal(one.countInBars, 0);
  assert.equal(one.loop, false);
  assert.equal(one.metronome, true);
  assert.equal(one.bpm, 84);
  assert.equal(one.voiceOffsetMs, -20);
  const two = voicePreviewOptions(DEFAULT_VOICE, 0, 2);
  assert.equal(two.kind === 'counts' && two.counts, '123123');
  assert.equal((compileProgram(two).compiled as { events: unknown[] }).events.length, 6);
});
