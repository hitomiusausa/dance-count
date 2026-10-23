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
