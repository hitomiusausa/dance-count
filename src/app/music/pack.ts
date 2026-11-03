import { compileMusicPlan } from '../../engine/music-plan.js';
import type { MusicTrack } from './model.ts';

// 公開用の音楽の一式の決まり（docs/app-store/RELEASE-PLAN.md §1-2）。作る側（tools/music-pack.ts）・読む側（platform/music.ts）・
// 公開前の番人（tools/check-dist.js）が同じここを使う。端末に触らない純粋な形（Node でテストする）。
export const MUSIC_CATALOG_FILE = 'music-catalog.json';
export const MUSIC_PACK_SCHEMA_VERSION = 1;
export const MUSIC_PACK_TRACKS_MAX = 60;           // 10 種目 × 約 3 曲の倍まで
export const MUSIC_AUDIO_FORMATS = ['flac'] as const;
export type MusicAudioFormat = (typeof MUSIC_AUDIO_FORMATS)[number];
export interface MusicPackCatalog { schemaVersion: number; tracks: MusicTrack[] }

const SAFE_ID = /^[a-z0-9-]+$/;
const SAFE_SECTION = /^[a-z]+$/;

// 音源の置き場所（dist からの相対）。曲の版（revision）と音源の作り方の版（clipVersion）が入る
// ＝曲を差し替えても、作り方を直しても、古いキャッシュ（Web の CacheFirst・1 年の immutable）は当たらない
export function musicClipPath(track: Pick<MusicTrack, 'id' | 'revision' | 'audioFormat' | 'clipVersion'>, sectionId: string, rate: number): string {
  if (!SAFE_ID.test(track.id) || !SAFE_ID.test(track.revision) || !SAFE_ID.test(track.clipVersion ?? '') || !SAFE_SECTION.test(sectionId) || !track.audioFormat) throw new Error('Invalid music clip identity');
  return `music/${track.id}/${track.revision}/${track.clipVersion}/${sectionId}-${String(rate)}.${track.audioFormat}`;
}

// 一式の一覧を信用せずに確かめる。曲ごとに、全区間 × 全速さの練習の計画が組めることまで見る（読めない曲を一覧に出さない）。
export function parseMusicPackCatalog(value: unknown): MusicTrack[] {
  const catalog = value as Partial<MusicPackCatalog> | null;
  if (!catalog || catalog.schemaVersion !== MUSIC_PACK_SCHEMA_VERSION || !Array.isArray(catalog.tracks)) throw new Error('Invalid music catalog');
  if (catalog.tracks.length > MUSIC_PACK_TRACKS_MAX) throw new Error('Too many music tracks');
  const ids = new Set<string>();
  for (const track of catalog.tracks) {
    if (!track || !SAFE_ID.test(track.id) || !SAFE_ID.test(track.revision) || typeof track.title !== 'string' || !track.title.trim()) throw new Error('Invalid music track');
    if (ids.has(track.id)) throw new Error(`Duplicate music track ${track.id}`);
    ids.add(track.id);
    if (!(MUSIC_AUDIO_FORMATS as readonly string[]).includes(track.audioFormat ?? '')) throw new Error(`Unsupported audio format for ${track.id}`);
    if (!SAFE_ID.test(track.clipVersion ?? '')) throw new Error(`Missing clip version for ${track.id}`);
    if (!Array.isArray(track.sections) || !track.sections.length || !track.sections.every(section => SAFE_SECTION.test(section.id))) throw new Error(`Invalid sections for ${track.id}`);
    if (!Array.isArray(track.rates) || !track.rates.length) throw new Error(`Invalid rates for ${track.id}`);
    for (const section of track.sections) for (const rate of track.rates) compileMusicPlan(track, section.id, rate);
  }
  return catalog.tracks;
}

// 一覧が指す音源のすべて（公開前の番人が、ファイルがそろっていて余りが無いことを確かめる）
export function musicPackFiles(tracks: MusicTrack[]): string[] {
  return tracks.flatMap(track => track.sections.flatMap(section => track.rates.map(rate => musicClipPath(track, section.id, rate))));
}
