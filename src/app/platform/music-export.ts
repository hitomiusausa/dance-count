import { compileMusicProgram, musicJobs } from '../../engine/music-plan.js';
import { createMusicBuses, scheduleMusicJob } from '../../engine/music-audio-engine.js';
import type { MusicOptions } from '../practice/session.ts';
import { wordOffsetsFor } from '../voices/selection.ts';
import { loadStandardVoice, loadRecordedVoice } from './assets.ts';
import { loadMusicAsset } from './music.ts';

export class MusicFileError extends Error {
  readonly reason: 'volume' | 'duration' | 'voice';
  constructor(reason: 'volume' | 'duration' | 'voice', message: string) { super(message); this.reason=reason; }
}

export async function renderMusicFile(options: MusicOptions, signal: AbortSignal): Promise<File> {
  if(options.countEnabled&&options.voice.kind==='pack'&&options.voice.pack.origin==='received') throw new MusicFileError('voice','Voice cannot be redistributed');
  const compiled=compileMusicProgram(options);
  const schedule=musicJobs(compiled,options.repetitions,{...options,wordOffsetsMs:wordOffsetsFor(options.voice)});
  if(schedule.end>120)throw new MusicFileError('duration','Export is too long');
  const audio=new OfflineAudioContext(2,Math.ceil(schedule.end*48000),48000);
  const [asset,voicePack]=await Promise.all([
    loadMusicAsset(audio,options),
    options.voice.kind==='standard'?loadStandardVoice(audio,options.voice.id):loadRecordedVoice(audio,options.voice.pack)
  ]);
  signal.throwIfAborted();
  if(Math.abs(asset.buffer.duration-compiled.transport.duration)>.05)throw new Error('Music duration mismatch');
  const context={...createMusicBuses(audio,options.musicVolume,options.voiceVolume),buffer:asset.buffer,voicePack,
    voiceOffsetMs:options.voiceOffsetMs,wordOffsetsMs:wordOffsetsFor(options.voice)};
  for(const job of schedule.jobs)scheduleMusicJob(audio,job,0,context);
  const rendered=await audio.startRendering();
  signal.throwIfAborted();
  const bytes=encodeMusicWav(rendered);
  signal.throwIfAborted();
  return new File([bytes],`dance-count-${options.track.id}-${options.sectionId}-${options.rate}x-${options.repetitions}times-${options.countEnabled?'count':'music'}-${options.startMode??'together'}-${options.delayBeats??0}beats${options.routine?'-routine':''}.wav`,{type:'audio/wav'});
}

// Return the actual saved bytes; reject clipped output instead of hiding it.
export function encodeMusicWav(audio: AudioBuffer): ArrayBuffer {
  const channels=audio.numberOfChannels,size=audio.length*channels*2;
  const bytes=new ArrayBuffer(44+size),view=new DataView(bytes);
  const text=(offset:number,value:string)=>[...value].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));
  text(0,'RIFF');view.setUint32(4,36+size,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,audio.sampleRate,true);
  view.setUint32(28,audio.sampleRate*channels*2,true);view.setUint16(32,channels*2,true);view.setUint16(34,16,true);
  text(36,'data');view.setUint32(40,size,true);
  const samples=Array.from({length:channels},(_,c)=>audio.getChannelData(c));
  for(let i=0;i<audio.length;i++)for(let c=0;c<channels;c++){
    const value=samples[c]![i]!;
    if(!Number.isFinite(value)||Math.abs(value)>1)throw new MusicFileError('volume','Output clipped; reduce volume');
    view.setInt16(44+(i*channels+c)*2,Math.round(value*(value<0?32768:32767)),true);
  }
  return bytes;
}
