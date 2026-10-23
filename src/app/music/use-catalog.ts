import { useEffect, useState } from 'preact/hooks';
import { loadMusicCatalog } from '../platform/music.ts';
import type { MusicTrack } from './model.ts';
export function useMusicCatalog() {
  const [tracks,setTracks]=useState<MusicTrack[]|null>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    let alive=true;
    loadMusicCatalog().then(value=>{if(alive)setTracks(value);},()=>{if(alive){setFailed(true);setTracks([]);}});
    return()=>{alive=false;};
  },[]);
  return {tracks,failed};
}
