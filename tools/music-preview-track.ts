import type { MusicTrack } from '../src/app/music/model.ts';
import { compileMusicPlan } from '../src/engine/music-plan.js';

// Paper Umbrella listening candidate, chosen from the user's half-time feedback.
// Tracker pulses are not automatically musical beats. Keep the original analysis
// intact and make this per-song interpretation explicit, outside the player UI.
export function buildMusicPreviewTrack(sourceSha256: string, trackedBeatsSeconds: number[]): MusicTrack {
  const pulsesPerBeat = 2;
  const phase = 0; // The alternate phase and the musical downbeat still need listening review.
  const beats = trackedBeatsSeconds.filter((_, index) => index % pulsesPerBeat === phase);
  const beatsPerBar = 4;
  const sectionBeats = 24; // Six slower bars; preserves the current source windows for this input.
  const sections = [20, 140, 280].map((seconds, index) => {
    const nearest = beats.findIndex(time => time >= seconds);
    if (nearest < 0) throw new Error('Missing preview range');
    const firstBeat = Math.ceil(nearest / beatsPerBar) * beatsPerBar;
    const lastBeat = firstBeat + sectionBeats;
    if (lastBeat >= beats.length) throw new Error('Preview exceeds tracked coverage');
    return { id: ['early', 'middle', 'late'][index]!, startTick: firstBeat * 960, endTick: lastBeat * 960 };
  });
  const track: MusicTrack = {
    id: 'paper-umbrella', revision: `${sourceSha256.slice(0,16)}-atempo-v3-pulse2-phase0`, title: 'Paper Umbrella', danceId: 'rumba',
    beatsPerBar, counts: '2341', anchorTick: 960, beatsMs: beats.map(time => time * 1000),
    rates: [.8, 1, 1.1], sections, preview: true
  };
  for (const section of sections) compileMusicPlan(track, section.id);
  return track;
}
