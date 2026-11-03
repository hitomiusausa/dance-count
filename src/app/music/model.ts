// Catalog metadata only. Source files and analysis reports stay outside public/.
export interface MusicSection { id: string; startTick: number; endTick: number; anchorTick?: number }
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
  level?: MusicLevel;          // 制作者がファイル名の 2 つ目（Low／Middle／High）で付けたレベル。Low がいちばん初心者向け
  durationSeconds?: number;    // 曲全体の長さ（解析で測った値）
  audioFormat?: 'flac';        // 公開用の一式の音源の形（music/pack.ts）。開発の試聴（/__music/）には無い
  clipVersion?: string;        // 公開用の一式の音源の作り方の版（tools/music-library.ts の CLIP_VERSION）。置き場所に入る
}
export type MusicLevel = 'low' | 'middle' | 'high';
export const MUSIC_LEVELS: readonly MusicLevel[] = ['low', 'middle', 'high'];
// ファイル名 `<種目>_<レベル>_<曲名>` の 2 つ目からレベルを読む（大文字小文字は問わない。知らない語は null）
export function levelFromFilename(filename: string): MusicLevel | null {
  const token = filename.split('_')[1]?.toLowerCase();
  return MUSIC_LEVELS.find(level => level === token) ?? null;
}
export interface MusicAsset { buffer: AudioBuffer }
