import type { AppStorage } from '../platform/storage.ts';
import type { MusicTrack } from './model.ts';

export interface MusicPreferences {
  sectionId: string; rate: number; repetitions: number;
  musicVolume: number; voiceVolume: number; countEnabled: boolean; startMode: 'together' | 'music-first' | 'count-first'; delayBeats: number;
}
export function normalizeMusicPreferences(raw: unknown, track: MusicTrack): MusicPreferences {
  const source = raw && typeof raw==='object' ? raw as Record<string,unknown> : {};
  const volume=(v:unknown,def:number,max:number)=>typeof v==='number'&&Number.isFinite(v)?Math.min(max,Math.max(0,v)):def;
  return {
    sectionId: track.sections.find(s=>s.id===source.sectionId)?.id ?? track.sections[0]!.id,
    rate: track.rates.find(r=>r===source.rate) ?? 1,
    repetitions: [1,2,4].find(n=>n===source.repetitions) ?? 1,
    musicVolume: volume(source.musicVolume,.32,.7),voiceVolume:volume(source.voiceVolume,1,1.2),
    countEnabled: source.countEnabled!==false,
    startMode: source.startMode==='together'||source.startMode==='count-first'||source.startMode==='music-first'?source.startMode:source.countInBars===0?'together':'music-first',
    delayBeats: [1,2,track.beatsPerBar,track.beatsPerBar*2].find(n=>n===source.delayBeats) ?? track.beatsPerBar*2
  };
}
const writes=new Map<string,Promise<unknown>>();
export async function loadMusicPreferences(storage: AppStorage | null, track: MusicTrack): Promise<MusicPreferences> {
  try{return normalizeMusicPreferences(await storage?.get('settings',`music:${track.id}`),track);}
  catch{return normalizeMusicPreferences(null,track);}
}
export async function saveMusicPreferences(storage: AppStorage | null, track: MusicTrack, value: MusicPreferences): Promise<boolean> {
  if(!storage)return false;
  const key=`music:${track.id}`;
  const next=(writes.get(key)??Promise.resolve()).catch(()=>{}).then(()=>storage.put('settings',normalizeMusicPreferences(value,track),key));
  writes.set(key,next);
  try{await next;return true;}catch{return false;}finally{if(writes.get(key)===next)writes.delete(key);}
}
