import test from 'node:test';
import assert from 'node:assert/strict';
import { compileRoutine } from '../../src/v2/rhythm-compiler.js';
import { beatPositionAtTick, buildFigureTimeline } from '../../src/v2/timeline-view-model.js';

test('figure timeline preserves the bar phase across figure boundaries', () => {
  const compiled = compileRoutine({
    danceId: 'waltz',
    figures: [
      { id: 'a', name: '前半', counts: '12' },
      { id: 'b', name: '後半', counts: '3' }
    ]
  });

  assert.deepEqual(buildFigureTimeline(compiled, 0).beats.map(beat => beat.beatInBar), [1, 2]);
  assert.deepEqual(buildFigureTimeline(compiled, 1).beats.map(beat => beat.beatInBar), [3]);
});

test('figure timeline places subdivision events within their beat', () => {
  const compiled = compileRoutine({
    danceId: 'chacha',
    figures: [{ id: 'a', name: 'シャッセ', counts: '4&1' }]
  });
  const timeline = buildFigureTimeline(compiled, 0);

  assert.deepEqual(timeline.beats[0].events, [
    { token: '4', offset: 0 },
    { token: '&', offset: 0.5 }
  ]);
  assert.deepEqual(timeline.beats[1].events, [{ token: '1', offset: 0 }]);
});

test('playback tick resolves to the active beat and its progress', () => {
  assert.deepEqual(beatPositionAtTick(1200), { startTick: 960, progress: 0.25 });
  assert.deepEqual(beatPositionAtTick(1920), { startTick: 1920, progress: 0 });
  assert.equal(beatPositionAtTick(null), null);
});
