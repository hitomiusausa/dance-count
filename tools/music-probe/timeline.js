// Experimental adapter only. Production PracticeAudioEngine is unchanged.
import { beatMapTempo } from '../../src/engine/tempo-map.js';
import { compileRhythm } from '../../src/engine/rhythm-compiler.js';
import { TICKS_PER_BEAT } from '../../src/engine/dance-profiles.js';

export function probeTimeline(report, { mode = 'measured', phase = 0, offsetMs = 0, from = 20, duration = 32 } = {}) {
  if (!['measured', 'constant'].includes(mode) || !Number.isInteger(phase) || phase < 0 || phase > 3 ||
      ![offsetMs, from, duration].every(Number.isFinite) || from < 0 || duration <= 0 || from + duration > report.durationSeconds) {
    throw new RangeError('Invalid local probe range or mapping');
  }
  const beats = mode === 'measured' ? report.trackedBeatsSeconds :
    report.trackedBeatsSeconds.map((_, i) => report.constantFirstBeatSeconds + i * 60 / report.constantBpm);
  const tempo = beatMapTempo(beats.map(t => t * 1000 + offsetMs), 4);
  const pattern = compileRhythm({ danceId: 'rumba', counts: '2341' });
  const events = [];
  // Bar 1 is provisional. A pattern begins on beat 2, one tick-beat after it.
  for (let bar = -1; bar <= Math.ceil(beats.length / 4); bar++) {
    for (const event of pattern.events) {
      const absoluteTick = (bar * 4 + phase + 1) * TICKS_PER_BEAT + event.absoluteTick;
      if (absoluteTick < 0 || absoluteTick > (beats.length - 1) * TICKS_PER_BEAT) continue;
      const trackSeconds = tempo.tickToSeconds(absoluteTick);
      // Allow full voice preroll; avoid cutting a word into the beginning.
      if (trackSeconds >= from + .12 && trackSeconds < from + duration - .12) {
        events.push({ ...event, absoluteTick, trackSeconds, localSeconds: trackSeconds - from });
      }
    }
  }
  events.sort((a, b) => a.absoluteTick - b.absoluteTick);
  return { tempo, events, from, duration, phase };
}
