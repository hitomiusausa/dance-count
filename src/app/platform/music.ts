import type { MusicAsset, MusicTrack } from '../music/model.ts';
import { compileMusicPlan } from '../../engine/music-plan.js';
import type { MusicOptions } from '../practice/session.ts';

export function musicPreviewEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_MUSIC_PREVIEW === '1';
}

export async function loadMusicCatalog(): Promise<MusicTrack[]> {
  if (import.meta.env.DEV && import.meta.env.VITE_MUSIC_PREVIEW === '1') {
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
  return [];
}

// Keep only the most recently decoded segment per AudioContext (bounded memory).
const decoded = new WeakMap<BaseAudioContext,{key:string;promise:Promise<MusicAsset>}>();
export function loadMusicAsset(audio: BaseAudioContext, options: Pick<MusicOptions,'track'|'sectionId'|'rate'>): Promise<MusicAsset> {
  if (import.meta.env.DEV && import.meta.env.VITE_MUSIC_PREVIEW === '1') {
    compileMusicPlan(options.track,options.sectionId,options.rate);
    const key=`${options.track.id}/${options.track.revision}/${options.sectionId}/${options.rate}`;
    const known=decoded.get(audio);if(known?.key===key)return known.promise;
    const promise=(async()=>{
      const response=await fetch(`/__music/audio/${encodeURIComponent(options.track.id)}/${encodeURIComponent(options.sectionId)}/${options.rate}`,{cache:'no-store'});
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
  return Promise.reject(new Error('Music preview is unavailable'));
}
