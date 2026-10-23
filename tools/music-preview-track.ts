import { createHash } from 'node:crypto';
import { getDanceProfile } from '../src/engine/dance-profiles.js';
import { compileMusicPlan } from '../src/engine/music-plan.js';
import type { MusicTrack } from '../src/app/music/model.ts';

export interface AnalyzedBar {
  startBeat: number; endBeat: number; beatsPerBar: number;
  meanBeatActivation: number; downbeatActivation: number;
  status: 'candidate' | 'uncertain'; issues: string[];
}
export interface BarAnalysis {
  schemaVersion: number; analysisId: string; sourceSha256: string;
  durationSeconds: number; beatsMs: number[]; downbeatsMs: number[]; bars: AnalyzedBar[];
}

// A creator-side adapter: source waveform -> learned beat/downbeat times ->
// contiguous bars in the supplied dance meter. An inferred downbeat is never index%4 by assumption.
export interface PreviewDefinition {id:string;title:string;danceId:'waltz'|'rumba'|'chacha'}
export function buildMusicPreviewTrack(sourceSha256: string, analysis: BarAnalysis, definition?:PreviewDefinition): MusicTrack {
  const settings=definition??{id:'paper-umbrella',title:'Paper Umbrella',danceId:'rumba' as const};
  if(!/^[a-z0-9-]+$/.test(settings.id)||!settings.title.trim())throw new Error('Invalid track identity');
  const profile=getDanceProfile(settings.danceId),meter=profile.beatsPerBar,counts=profile.templates[0];
  const countStartBeat=settings.danceId==='waltz'?0:1;
  if (analysis.schemaVersion!==1 || analysis.sourceSha256!==sourceSha256 || !/^[a-f0-9]{64}$/.test(analysis.analysisId)) {
    throw new Error('Analysis identity or schema mismatch');
  }
  if (!Number.isFinite(analysis.durationSeconds) || analysis.durationSeconds<=0 || !Array.isArray(analysis.beatsMs) ||
      analysis.beatsMs.some(time=>!Number.isFinite(time)||time<0||time>analysis.durationSeconds*1000)) throw new Error('Invalid analysis coverage');
  const windows: { startBeat:number; endBeat:number; score:number }[]=[];
  const length=6;
  for (let i=0;i<=analysis.bars.length-length;i++) {
    const bars=analysis.bars.slice(i,i+length);
    if (bars.some(bar=>bar.status!=='candidate'||bar.issues.length||bar.beatsPerBar!==meter||
      !Number.isInteger(bar.startBeat)||!Number.isInteger(bar.endBeat)||bar.endBeat-bar.startBeat!==meter||
      !Number.isFinite(bar.meanBeatActivation)||!Number.isFinite(bar.downbeatActivation)||
      bar.startBeat<0||bar.endBeat>=analysis.beatsMs.length||
      !analysis.downbeatsMs.includes(analysis.beatsMs[bar.startBeat]!))) continue;
    if (bars.slice(1).some((bar,index)=>bar.startBeat!==bars[index]!.endBeat)) continue;
    const startBeat=bars[0]!.startBeat,endBeat=bars[length-1]!.endBeat;
    if ((analysis.beatsMs[endBeat]!-analysis.beatsMs[startBeat]!)/1000>40) continue;
    windows.push({startBeat,endBeat,score:bars.reduce((sum,b)=>sum+b.meanBeatActivation+b.downbeatActivation,0)/(length*2)});
  }
  const chosen=new Set<number>();
  const targets=definition?[.10,.45,.75].map(fraction=>fraction*analysis.durationSeconds):[20,140,280];
  const sections=targets.flatMap((target,index)=>{
    const best=windows.filter(window=>!chosen.has(window.startBeat)&&Math.abs(analysis.beatsMs[window.startBeat]!/1000-target)<=45).sort((a,b)=>{
      const distance=(window:typeof a)=>Math.abs(analysis.beatsMs[window.startBeat]!/1000-target)+2*(1-window.score);
      return distance(a)-distance(b);
    })[0];
    if(!best){if(definition)return [];throw new Error('No consistent six-bar preview near requested range');}
    chosen.add(best.startBeat);
    return [{ id:['early','middle','late'][index]!,startTick:best.startBeat*960,endTick:best.endBeat*960,
      anchorTick:(best.startBeat+countStartBeat)*960 }];
  });
  if(!sections.length)throw new Error('No consistent practice bars');
  const mapId=createHash('sha256').update(JSON.stringify({sourceSha256,beatsMs:analysis.beatsMs,sections,settings,counts})).digest('hex');
  const track:MusicTrack={id:settings.id,revision:`${sourceSha256.slice(0,16)}-bars-v2-${mapId.slice(0,12)}`,
    title:settings.title,danceId:settings.danceId,beatsPerBar:meter,counts,anchorTick:countStartBeat*960,
    beatsMs:[...analysis.beatsMs],rates:[.8,1,1.1],sections,preview:true};
  for (const section of sections) for(const rate of track.rates) compileMusicPlan(track,section.id,rate);
  return track;
}
