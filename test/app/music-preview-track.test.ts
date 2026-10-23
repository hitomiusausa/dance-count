import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMusicPreviewTrack } from '../../tools/music-preview-track.ts';
import { compileMusicPlan } from '../../src/engine/music-plan.js';

const raw = Array.from({length:800},(_,i)=>.3+i*.45+i*i*.000005);
const hash = 'a'.repeat(64);
test('Paper Umbrella keeps every other measured pulse as a beat without flattening its timing',()=>{
  const track=buildMusicPreviewTrack(hash,raw);
  assert.deepEqual(track.beatsMs,raw.filter((_,i)=>i%2===0).map(time=>time*1000));
  assert.match(track.revision,/v3-pulse2-phase0$/);
  for(let beat=1;beat<track.beatsMs.length;beat++){
    assert.ok(Math.abs(track.beatsMs[beat]!-track.beatsMs[beat-1]!-(raw[beat*2]!-raw[(beat-1)*2]!)*1000)<1e-9);
  }
});
test('music, spoken words, bar lengths, intros and every speed use the same slower beat grid',()=>{
  const track=buildMusicPreviewTrack(hash,raw);
  for(const section of track.sections)for(const rate of track.rates){
    const plan=compileMusicPlan(track,section.id,rate);
    assert.equal(plan.events.length,24);
    assert.equal(plan.durationTicks,6*4*960);
    const start=section.startTick/960,end=section.endTick/960;
    assert.ok(Math.abs(plan.transport.duration-(raw[end*2]!-raw[start*2]!)/rate)<1e-10);
    const voices=plan.events.filter(event=>event.absoluteTick>=section.startTick+8*960);
    assert.equal(voices.length,16);
    assert.equal(voices[0]!.absoluteTick,section.startTick+8*960);
    assert.ok(Math.abs(plan.transport.timeAt(voices[0]!.absoluteTick)-(raw[(start+8)*2]!-raw[start*2]!)/rate)<1e-10);
  }
});
test('a listening interpretation never extends the measured tail or accepts an invalid selected beat map',()=>{
  assert.throws(()=>buildMusicPreviewTrack(hash,raw.slice(0,500)),/range|coverage/);
  const bad=[...raw];bad[40]=bad[38]!;
  assert.throws(()=>buildMusicPreviewTrack(hash,bad),/not after/);
});
