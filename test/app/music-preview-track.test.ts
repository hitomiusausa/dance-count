import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMusicPreviewTrack, type BarAnalysis } from '../../tools/music-preview-track.ts';
import { compileMusicPlan } from '../../src/engine/music-plan.js';

const hash='a'.repeat(64);
function analyzed():BarAnalysis {
  const beatsMs=Array.from({length:421},(_,i)=>300+i*850+i*i*.07);
  // Global beat zero is deliberately NOT a musical downbeat. Every section must
  // carry its own anchor; a modulo-four assumption would rotate all words.
  const bars=Array.from({length:103},(_,i)=>({startBeat:3+i*4,endBeat:7+i*4,beatsPerBar:4,
    meanBeatActivation:.95,downbeatActivation:.9,status:'candidate' as const,issues:[]}));
  return {schemaVersion:1,analysisId:'b'.repeat(64),sourceSha256:hash,durationSeconds:400,
    beatsMs,downbeatsMs:bars.map(bar=>beatsMs[bar.startBeat]!),bars};
}
test('preview keeps waveform beat times and starts every section on an inferred downbeat',()=>{
  const data=analyzed(),track=buildMusicPreviewTrack(hash,data);
  assert.deepEqual(track.beatsMs,data.beatsMs);assert.match(track.revision,/-bars-v2-/);
  for(const section of track.sections)for(const rate of track.rates){
    assert.ok(data.downbeatsMs.includes(track.beatsMs[section.startTick/960]!));
    assert.equal(section.startTick/960%4,3);
    const plan=compileMusicPlan(track,section.id,rate);
    assert.equal(plan.events.length,24);assert.equal(plan.events[0]!.token,'1');
    assert.equal(plan.events[1]!.token,'2');assert.equal(plan.events[3]!.token,'4');
    assert.equal(section.anchorTick,section.startTick+960);
    assert.ok(Math.abs(plan.transport.duration-(track.beatsMs[section.endTick/960]!-track.beatsMs[section.startTick/960]!)/1000/rate)<1e-10);
  }
});
test('uncertain and non-four-beat bars are skipped instead of resampled into an assumed meter',()=>{
  const data=analyzed();
  for(const bar of data.bars)if(data.beatsMs[bar.startBeat]!>=270000){bar.status='uncertain';bar.issues=['meter-mismatch'];}
  const track=buildMusicPreviewTrack(hash,data),late=track.sections[2]!;
  assert.ok(track.beatsMs[late.endTick/960]!<275000);
  for(const bar of data.bars)bar.status='uncertain';
  assert.throws(()=>buildMusicPreviewTrack(hash,data),/No consistent/);
});
test('stale source, invalid coverage, fabricated downbeats and nonmonotone maps are rejected',()=>{
  assert.throws(()=>buildMusicPreviewTrack('c'.repeat(64),analyzed()),/identity/);
  const invalid=analyzed();invalid.beatsMs[40]=invalid.beatsMs[38]!;
  assert.throws(()=>buildMusicPreviewTrack(hash,invalid),/not after/);
  assert.throws(()=>buildMusicPreviewTrack(hash,{...analyzed(),downbeatsMs:[]}),/No consistent/);
  assert.throws(()=>buildMusicPreviewTrack(hash,{...analyzed(),durationSeconds:1}),/coverage/);
});

test('changing beat contents invalidates assets even when a report ID was accidentally kept',()=>{
  const before=analyzed(),after=analyzed();after.beatsMs[40]!+=10;
  assert.notEqual(buildMusicPreviewTrack(hash,before).revision,buildMusicPreviewTrack(hash,after).revision);
});

test('waltz experiments use three measured beats per bar and start the 123 pattern on bar one',()=>{
  const data=analyzed();data.bars=Array.from({length:136},(_,i)=>({startBeat:2+i*3,endBeat:5+i*3,beatsPerBar:3,meanBeatActivation:.95,downbeatActivation:.9,status:'candidate',issues:[]}));
  data.downbeatsMs=data.bars.map(bar=>data.beatsMs[bar.startBeat]!);
  const track=buildMusicPreviewTrack(hash,data,{id:'waltz-test',title:'Waltz',danceId:'waltz'});
  assert.equal(track.beatsPerBar,3);assert.equal(track.counts,'123');
  for(const section of track.sections){const plan=compileMusicPlan(track,section.id);assert.equal(plan.events.length,18);assert.equal(section.anchorTick,section.startTick);assert.deepEqual(plan.events.slice(0,3).map(event=>event.token),['1','2','3']);}
});
test('cha-cha experiments preserve the half-beat and rather than doubling the musical beat grid',()=>{
  const data=analyzed();const track=buildMusicPreviewTrack(hash,data,{id:'chacha-test',title:'Cha-cha',danceId:'chacha'});
  const section=track.sections[0]!,plan=compileMusicPlan(track,section.id);
  assert.equal(track.counts,'234&1');assert.equal(plan.events.length,30);
  const and=plan.events.find(event=>event.token==='&')!;assert.equal(and.absoluteTick%960,480);
  assert.equal(track.beatsMs.length,data.beatsMs.length);
});
test('preview choices never overlap and unavailable ranges are omitted',()=>{
  const data=analyzed(),starts=[...Array.from({length:9},(_,i)=>44+i*4),...Array.from({length:9},(_,i)=>208+i*4),...Array.from({length:5},(_,i)=>352+i*4)];
  data.bars=starts.map(startBeat=>({startBeat,endBeat:startBeat+4,beatsPerBar:4,meanBeatActivation:.95,downbeatActivation:.9,status:'candidate' as const,issues:[]}));
  data.downbeatsMs=data.bars.map(bar=>data.beatsMs[bar.startBeat]!);
  const track=buildMusicPreviewTrack(hash,data,{id:'tango-test',title:'Tango',danceId:'tango'});
  assert.deepEqual(track.sections.map(section=>section.id),['early','middle']);
  assert.equal(track.counts,'SSQQS');assert.equal(track.anchorTick,0);
  for(let i=1;i<track.sections.length;i++)assert.ok(track.sections[i-1]!.endTick<=track.sections[i]!.startTick);
});

// 2026-11-02 ひとみうさ「出だしが途中から」: 「はじめ」は曲の頭から最初のきれいな 6 小節（長さの 10% の位置ではない）
test('the early practice range starts at the first clean bar of the song, not at ten percent of its length',()=>{
  const data=analyzed();data.bars=Array.from({length:64},(_,i)=>({startBeat:1+i*3,endBeat:4+i*3,beatsPerBar:3,meanBeatActivation:.95,downbeatActivation:.9,status:'candidate' as const,issues:[] as string[]}));
  data.downbeatsMs=data.bars.map(bar=>data.beatsMs[bar.startBeat]!);
  const track=buildMusicPreviewTrack(hash,data,{id:'waltz-top',title:'Waltz',danceId:'waltz'});
  assert.equal(track.sections[0]!.id,'early');assert.equal(track.sections[0]!.startTick,1*960,'bar one of the song');
  // 頭の 2 小節が要確認なら、それを飛ばした最初のきれいな小節から
  data.bars[0]!.status='uncertain';data.bars[1]!.issues=['meter-mismatch'];
  const skipped=buildMusicPreviewTrack(hash,data,{id:'waltz-top',title:'Waltz',danceId:'waltz'});
  assert.equal(skipped.sections[0]!.startTick,data.bars[2]!.startBeat*960);
  for(let i=1;i<skipped.sections.length;i++)assert.ok(skipped.sections[i-1]!.endTick<=skipped.sections[i]!.startTick);
});

// 2026-11-02 ひとみうさ: 曲を選ぶ画面にレベルと長さ。レベルはファイル名の 2 つ目（Low がいちばん初心者向け）
test('the level comes from the second word of the file name and the length from the analysis',async()=>{
  const {levelFromFilename}=await import('../../src/app/music/model.ts');
  assert.equal(levelFromFilename('Waltz_Low_Moon_steps.wav'),'low');
  assert.equal(levelFromFilename('Tango_Middle_The_Final_Posture.mp3'),'middle');
  assert.equal(levelFromFilename('chacha_High_Fuego_en_la_eternidad.mp3'),'high');
  assert.equal(levelFromFilename('Waltz_Slow_Low_Moon_Steps.wav'),null,'an unknown word is not a level');
  assert.equal(levelFromFilename('ワルツ初級.m4a'),null);
  const track=buildMusicPreviewTrack(hash,analyzed(),{id:'tango-level',title:'Tango',danceId:'tango',level:'low'});
  assert.equal(track.level,'low');assert.equal(track.durationSeconds,400);
  assert.equal('level' in buildMusicPreviewTrack(hash,analyzed(),{id:'tango-none',title:'Tango',danceId:'tango',level:null}),false);
});

test('samba songs are checked in the measured four-beat groups (two samba bars) and count in 2/4 from a detected downbeat',()=>{
  const data=analyzed();data.bars=Array.from({length:100},(_,i)=>({startBeat:1+i*4,endBeat:5+i*4,beatsPerBar:4,meanBeatActivation:.95,downbeatActivation:.9,status:'candidate' as const,issues:[] as string[]}));
  data.downbeatsMs=data.bars.map(bar=>data.beatsMs[bar.startBeat]!);
  const track=buildMusicPreviewTrack(hash,data,{id:'samba-test',title:'Samba',danceId:'samba',level:'low'});
  assert.equal(track.beatsPerBar,2);assert.equal(track.anchorTick,0);
  for(const section of track.sections){
    assert.equal(section.anchorTick,section.startTick,'the count starts on the downbeat');
    assert.ok(data.downbeatsMs.includes(track.beatsMs[section.startTick/960]!),'sections start on a detected downbeat');
    assert.equal((section.endTick-section.startTick)/960,24,'six measured groups = twelve samba bars');
    const plan=compileMusicPlan(track,section.id);assert.ok(plan.events.length>0);
  }
});

test('a samba analysis with two-beat bars is not accepted as measured four-beat groups',()=>{
  const data=analyzed();data.bars=Array.from({length:200},(_,i)=>({startBeat:1+i*2,endBeat:3+i*2,beatsPerBar:2,meanBeatActivation:.95,downbeatActivation:.9,status:'candidate' as const,issues:[] as string[]}));
  data.downbeatsMs=data.bars.map(bar=>data.beatsMs[bar.startBeat]!);
  assert.throws(()=>buildMusicPreviewTrack(hash,data,{id:'samba-two',title:'Samba',danceId:'samba'}),/No consistent/);
});
