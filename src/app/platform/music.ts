import type { MusicAsset, MusicTrack } from '../music/model.ts';
import { MUSIC_CATALOG_FILE, musicClipPath, parseMusicPackCatalog } from '../music/pack.ts';
import { compileMusicPlan } from '../../engine/music-plan.js';
import type { MusicOptions } from '../practice/session.ts';

// 曲の出どころは 2 つ（docs/app-store/RELEASE-PLAN.md §1-2）:
// - 開発の試聴（tools/music-dev-plugin.ts の /__music/）: npm run dev を VITE_MUSIC_PREVIEW=1 で
// - 公開用の一式（tools/music-pack.ts が作り、ビルドが DC_MUSIC_PACK で dist に入れる）: ./music-catalog.json と ./music/…
// どちらも定数にしておくと、使わない方は公開ビルドで false に畳まれて成果物から消える（関数の呼び出しのままだと畳まれずに残り、
// check-dist が落ちる＝2026-11-02 の試聴ボタンで起きた）。import.meta.env と __MUSIC_PACK__ は Vite だけが入れる（Node のテストでは無い）。
declare const __MUSIC_PACK__: boolean | undefined;
const MUSIC_PREVIEW = Boolean(import.meta.env && import.meta.env.DEV && import.meta.env.VITE_MUSIC_PREVIEW === '1');
const MUSIC_PACK = !MUSIC_PREVIEW && typeof __MUSIC_PACK__ === 'boolean' && __MUSIC_PACK__;

// 音楽の入口（下のタブ・練習の設定・曲の画面）を出すか
export function musicAvailable(): boolean {
  return MUSIC_PREVIEW || MUSIC_PACK;
}

export async function loadMusicCatalog(): Promise<MusicTrack[]> {
  if (MUSIC_PREVIEW) {
    const response=await fetch('/__music/catalog',{cache:'no-store'});
    if(!response.ok) throw new Error('Music catalog is unavailable');
    const tracks: MusicTrack[]=await response.json();
    if(!Array.isArray(tracks)||tracks.length>30) throw new Error('Invalid music catalog');
    for(const track of tracks) {
      if(!/^[a-z0-9-]+$/.test(track.id)||typeof track.title!=='string'||!track.sections.length||!track.preview) throw new Error('Invalid preview track');
      for(const section of track.sections) for(const rate of track.rates) compileMusicPlan(track,section.id,rate);
    }
    return tracks;
  }
  if (MUSIC_PACK) {
    const response = await fetch(`./${MUSIC_CATALOG_FILE}`);
    if (!response.ok) throw new Error('Music catalog is unavailable');
    return parseMusicPackCatalog(await response.json());
  }
  return [];
}

// 区間 × 速さの音源の URL。無ければ null
function musicClipUrl(track: MusicTrack, sectionId: string, rate: number): string | null {
  if (MUSIC_PREVIEW) return `/__music/audio/${encodeURIComponent(track.id)}/${encodeURIComponent(sectionId)}/${rate}`;
  if (MUSIC_PACK && track.audioFormat) return `./${musicClipPath(track, sectionId, rate)}`;
  return null;
}

// 曲を選ぶ画面の試聴: 「はじめ」の区間を元の速さで（練習と同じ切り出しを使う＝別の音源を作らない）
function musicSampleUrl(track: MusicTrack): string | null {
  const section = track.sections[0];
  return section ? musicClipUrl(track, section.id, 1) : null;
}
export function canPlayMusicSample(track: MusicTrack): boolean {
  return musicSampleUrl(track) !== null;
}
export interface MusicSamplePlayback { stop(): void }
// 鳴らし終わり・失敗は onEnd(failed) で知らせる。stop() の後は知らせない
export function playMusicSample(track: MusicTrack, onEnd: (failed: boolean) => void): MusicSamplePlayback | null {
  const url = musicSampleUrl(track);
  if (!url) return null;
  const element = new Audio(url);
  let active = true;
  const finish = (failed: boolean) => { if (!active) return; active = false; element.pause(); onEnd(failed); };
  element.onended = () => finish(false);
  element.onerror = () => finish(true);
  element.play().catch(() => finish(true));
  return { stop() { active = false; element.pause(); } };
}

// Keep only the most recently decoded segment per AudioContext (bounded memory).
const decoded = new WeakMap<BaseAudioContext,{key:string;promise:Promise<MusicAsset>}>();
export function loadMusicAsset(audio: BaseAudioContext, options: Pick<MusicOptions,'track'|'sectionId'|'rate'>): Promise<MusicAsset> {
  const url = musicClipUrl(options.track, options.sectionId, options.rate);
  if (!url) return Promise.reject(new Error('Music is unavailable'));
  compileMusicPlan(options.track,options.sectionId,options.rate);
  const key=`${options.track.id}/${options.track.revision}/${options.sectionId}/${options.rate}`;
  const known=decoded.get(audio);if(known?.key===key)return known.promise;
  const promise=(async()=>{
    // 開発の試聴は毎回作り直す（no-store）。公開用の一式は置き場所に曲の版が入るので、普通にキャッシュしてよい
    const response=await fetch(url, MUSIC_PREVIEW ? {cache:'no-store'} : undefined);
    if(!response.ok) throw new Error('Music segment is unavailable');
    const bytes=await response.arrayBuffer();
    if(bytes.byteLength>16*1024*1024)throw new Error('Music segment is too large');
    const buffer=await audio.decodeAudioData(bytes);
    if(buffer.length*buffer.numberOfChannels*4>32*1024*1024)throw new Error('Decoded music exceeds memory budget');
    return {buffer};
  })();
  decoded.set(audio,{key,promise});promise.catch(()=>{if(decoded.get(audio)?.key===key)decoded.delete(audio);});
  return promise;
}
