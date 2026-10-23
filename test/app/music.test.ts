import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHash,buildHash,parentScreen } from '../../src/app/router/routes.ts';
import { resolveScreen } from '../../src/app/router/resolve.ts';
import { normalizeMusicPreferences,saveMusicPreferences } from '../../src/app/music/preferences.ts';
import { encodeMusicWav } from '../../src/app/platform/music-export.ts';
import type { MusicTrack } from '../../src/app/music/model.ts';
import type { AppStorage } from '../../src/app/platform/storage.ts';

const track:MusicTrack={id:'test',revision:'1',title:'Test',danceId:'rumba',counts:'2341',beatsPerBar:4,anchorTick:960,
  beatsMs:[0,500,1000,1500,2000],rates:[.8,1,1.1],sections:[{id:'early',startTick:0,endTick:3840}],preview:true};
test('music lives under Use and direct links stay disabled when the feature is unavailable',()=>{
  for(const [hash,screen] of [['#/use/music','U3'],['#/use/music/test','U4']] as const){
    const route=parseHash(hash);assert.equal(route.screen,screen);assert.equal(buildHash(route),hash);
    assert.deepEqual(resolveScreen(route,[]),{screen:'S1',redirect:{screen:'S1',params:{}}});
    assert.equal(resolveScreen(route,[],undefined,true).screen,screen);
  }
  assert.equal(parentScreen('U4'),'U3');assert.equal(parentScreen('U3'),'S1');
});
test('saved music settings tolerate removed ranges, bad rates and non-finite volume',()=>{
  const prefs=normalizeMusicPreferences({sectionId:'removed',rate:4,repetitions:100,musicVolume:Infinity,voiceVolume:-3,countInBars:3},track);
  assert.deepEqual(prefs,{sectionId:'early',rate:1,repetitions:1,musicVolume:.32,voiceVolume:0,countEnabled:true,startMode:'music-first',delayBeats:8});
});
test('rapid preference writes are serialized so the final selection wins',async()=>{
  const calls:number[]=[];
  const storage={async put(_s:unknown,value:{rate:number}){await new Promise(r=>setTimeout(r,value.rate===.8?20:0));calls.push(value.rate);}} as unknown as AppStorage;
  const initial=normalizeMusicPreferences(null,track);
  await Promise.all([saveMusicPreferences(storage,track,{...initial,rate:.8}),saveMusicPreferences(storage,track,{...initial,rate:1.1})]);
  assert.deepEqual(calls,[.8,1.1]);
});
test('WAV output preserves channel order, sample count, duration and signs; clipped audio is refused',()=>{
  const audio={numberOfChannels:2,length:2,sampleRate:48000,getChannelData:(c:number)=>Float32Array.from(c?[.25,-.25]:[1,-1])} as AudioBuffer;
  const out=new DataView(encodeMusicWav(audio));
  assert.equal(out.getUint32(24,true),48000);assert.equal(out.getUint32(40,true),8);
  assert.equal(out.getInt16(44,true),32767);assert.equal(out.getInt16(46,true),8192);assert.equal(out.getInt16(48,true),-32768);
  assert.throws(()=>encodeMusicWav({...audio,getChannelData:()=>Float32Array.from([1.1,0])} as AudioBuffer),/clipped/);
});

test('start order defaults to two listening bars and explicit settings take precedence over old click preferences',()=>{
  assert.equal(normalizeMusicPreferences(null,track).startMode,'music-first');
  assert.equal(normalizeMusicPreferences({countInBars:0},track).startMode,'together');
  const prefs=normalizeMusicPreferences({startMode:'music-first',delayBeats:1,countInBars:0},track);
  assert.equal(prefs.startMode,'music-first');assert.equal(prefs.delayBeats,1);
  assert.equal(normalizeMusicPreferences({startMode:'bad',delayBeats:Infinity},track).delayBeats,8);
});


test('music offers only playable routines of the same dance without mutating their stored content',async()=>{
  const {musicRoutineChoices,musicFigureRange}=await import('../../src/app/music/routines.ts');
  const {createRoutine}=await import('../../src/app/routines/routine.ts');
  const make=(id:string,danceId:string,counts:string)=>({...createRoutine({id,danceId,name:id,now:'2026-10-23'}),figures:[{id:'f-test-12345678',name:'Figure',counts}]});
  const good=make('r-good-12345678','rumba','2341'),wrong=make('r-wrong-12345678','waltz','123');
  const bad=make('r-invalid-12345678','rumba','&2341'),empty={...good,id:'r-empty-12345678',figures:[]};
  const original=[good,wrong,bad,empty],before=JSON.stringify(original);
  assert.deepEqual(musicRoutineChoices(original,'rumba').map(r=>r.id),[good.id]);
  assert.deepEqual(musicFigureRange({...good,figures:[...good.figures,...good.figures,...good.figures]}),{startIndex:0,endIndex:2});
  assert.deepEqual(musicFigureRange(good,{startIndex:3,endIndex:10}),{startIndex:0,endIndex:0});
  assert.equal(JSON.stringify(original),before);
});
