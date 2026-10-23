// Catalog metadata only. Source files and analysis reports stay outside public/.
export interface MusicSection { id: string; startTick: number; endTick: number }
export interface MusicTrack {
  id: string;
  revision: string;
  title: string;
  danceId: string;
  beatsPerBar: number;
  counts: string;
  anchorTick: number;
  beatsMs: number[];
  rates: number[];
  sections: MusicSection[];
  preview: boolean;
}
export interface MusicAsset { buffer: AudioBuffer }
