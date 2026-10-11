import { getDanceProfile } from '../../engine/dance-profiles.js';
import type { PracticeOptions } from '../practice/session.ts';
import type { VoiceSelection } from './selection.ts';

// 声の試聴（Ruling 61-5）。ワルツの最初の型（123）を標準の速さで、合図なし・繰り返しなし・メトロノームあり。
// S7 の「▶ 試聴」は 1 小節、S8 完成画面の聞き比べは 2 小節。
export const PREVIEW_DANCE_ID = 'waltz';

export function voicePreviewOptions(voice: VoiceSelection, voiceOffsetMs: number, bars: 1 | 2): PracticeOptions {
  const profile = getDanceProfile(PREVIEW_DANCE_ID) as { templates: readonly string[]; practiceBpm: number };
  const bar = profile.templates[0]!;
  return {
    kind: 'counts', danceId: PREVIEW_DANCE_ID, counts: bar.repeat(bars), bpm: profile.practiceBpm,
    metronome: true, countInBars: 0, loop: false, track: null, voice, voiceOffsetMs
  };
}
