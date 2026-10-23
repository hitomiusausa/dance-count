import test from 'node:test';
import assert from 'node:assert/strict';
import { beatMapTempo, sectionTransport } from '../../src/engine/tempo-map.js';
import { compileMusicPlan, musicJobs } from '../../src/engine/music-plan.js';
import { MusicAudioEngine, scheduleMusicJob } from '../../src/engine/music-audio-engine.js';
import { FakeAudioContext, fakeVoicePack } from './engine-schedule-harness.js';

const track = {
  danceId:'rumba',beatsPerBar:4,counts:'2341',anchorTick:960,rates:[.8,1,1.1],
  beatsMs:Array.from({length:33},(_,i)=>300+i*400+i*i*3),
  sections:[{id:'section',startTick:8*960,endTick:24*960}]
};

test('nonuniform section transport uses differences of absolute positions in both directions and every repeat',()=>{
  const tempo=beatMapTempo(track.beatsMs,4);
  for(const rate of track.rates){
    const map=sectionTransport(tempo,8*960,24*960,rate);
    const expectedDuration=(track.beatsMs[24]-track.beatsMs[8])/1000/rate;
    assert.equal(map.duration,expectedDuration);
    for(const iteration of [0,1,10000])for(const tick of [8*960,8*960+480,14*960,23*960+720]){
      const expected=iteration*expectedDuration+(tempo.tickToSeconds(tick)-tempo.tickToSeconds(8*960))/rate;
      assert.equal(map.timeAt(tick,iteration),expected);
      assert.ok(Math.abs(map.tickAt(expected,iteration)-tick)<1e-5);
    }
  }
});
test('rumba words follow the music beat phase, keeping integer ticks and half-open boundaries',()=>{
  const plan=compileMusicPlan(track,'section');
  assert.equal(plan.events.length,16);
  assert.equal(plan.events[0].token,'1');
  for(const event of plan.events){
    assert.ok(Number.isInteger(event.absoluteTick));
    assert.ok(event.absoluteTick>=8*960&&event.absoluteTick<24*960);
    assert.equal(event.token,String(event.absoluteTick/960%4+1));
  }
  assert.throws(()=>compileMusicPlan({...track,sections:[{id:'section',startTick:8*960,endTick:34*960}]},'section'),/coverage/);
  assert.throws(()=>compileMusicPlan(track,'missing'),RangeError);
  assert.throws(()=>compileMusicPlan(track,'section',.7),RangeError);
});
test('finite repeats restart the same source range; lead-in happens only once and count-off keeps music',()=>{
  const plan=compileMusicPlan(track,'section',.8);
  const result=musicJobs(plan,4,{countInBars:2,countEnabled:false,metronome:false});
  assert.equal(result.jobs.filter(j=>j.kind==='voice').length,0);
  assert.equal(result.jobs.filter(j=>j.kind==='click').length,8);
  const music=result.jobs.filter(j=>j.kind==='music');
  assert.equal(music.length,4);
  music.forEach((job,i)=>{
    assert.equal(job.at,result.start+i*plan.transport.duration);
    assert.ok(Math.abs(job.end-job.at-plan.transport.duration)<1e-10);
  });
  assert.throws(()=>musicJobs(plan,Infinity),RangeError);
  assert.throws(()=>musicJobs(plan,0),RangeError);
});
test('early voice calibration reserves preroll before the first word, even with no lead-in',()=>{
  const plan=compileMusicPlan(track,'section');
  const result=musicJobs(plan,1,{voiceOffsetMs:-200,wordOffsetsMs:{one:-100}});
  const first=result.jobs.find(j=>j.kind==='voice');
  assert.ok(first.at-.3-.05>=0,'onset compensation must not put the first voice before output time zero');
});
test('voice scheduling preserves onset and per-word ms offsets independently of music speed',()=>{
  const audio=new FakeAudioContext(),pack=fakeVoicePack();
  const event={voiceKey:'two'};
  scheduleMusicJob(audio,{kind:'voice',at:1,end:1.6,event,nextVoiceKey:'three'},5,{
    voicePack:pack,voiceBus:audio.destination,voiceOffsetMs:-10,wordOffsetsMs:{two:20,three:-10}
  });
  const start=audio.log.find(e=>e[0]==='voice'&&e[1]==='start');
  assert.equal(start[2],6-pack.words.get('two').onsetMs/1000+.01);
  assert.ok(audio.log.some(e=>e[0]==='voice'&&e[1]==='stop'&&Math.abs(e[2]-6.58)<1e-10));
});
test('realtime music uses bounded lookahead, stops missed jobs and reports positions from the shared map',()=>{
  const oldRaf=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
  try{
    const audio=new FakeAudioContext(),frames=[];
    const plan=compileMusicPlan(track,'section');
    const engine=new MusicAudioEngine(audio,{voicePack:fakeVoicePack(),onFrame:f=>frames.push(f)});
    const start=engine.start({compiled:plan,musicAsset:{buffer:{duration:plan.transport.duration}},repetitions:4});
    assert.ok(engine.cursor<engine.schedule.jobs.length/2,'must not create an entire long practice up front');
    audio.currentTime=start+.1;engine.frame();
    assert.equal(frames.at(-1).event.voiceKey,'one');
    assert.ok(Math.abs(frames.at(-1).originalTick-plan.transport.tickAt(.1))<1e-7);
    audio.currentTime=20;engine.scheduleAhead();assert.equal(engine.playing,false);
    assert.equal(frames.at(-1).playing,false);
  }finally{globalThis.requestAnimationFrame=oldRaf;globalThis.cancelAnimationFrame=oldCancel;}
});


test('music-first listens to two measured bars once, then joins the existing musical phase',()=>{
  for (const rate of track.rates) {
    const plan=compileMusicPlan(track,'section',rate);
    const result=musicJobs(plan,2,{startMode:'music-first',delayBeats:8});
    const firstVoice=result.jobs.find(job=>job.kind==='voice');
    assert.equal(result.start,.12);
    assert.equal(firstVoice.event.absoluteTick,16*960);
    assert.equal(firstVoice.at,result.start+(track.beatsMs[16]-track.beatsMs[8])/1000/rate);
    assert.equal(firstVoice.event.voiceKey,'one');
    assert.ok(result.jobs.some(job=>job.kind==='voice'&&job.at===result.start+plan.transport.duration&&job.event.absoluteTick===plan.startTick));
    assert.equal(result.jobs.filter(job=>job.kind==='music').length,2);
    assert.equal(result.jobs.filter(job=>job.kind==='click').length,0);
  }
});
test('one beat later means the second beat, one bar later means the second bar',()=>{
  const plan=compileMusicPlan(track,'section');
  for(const beats of [1,2,4,8]){
    const result=musicJobs(plan,1,{startMode:'music-first',delayBeats:beats});
    const first=result.jobs.find(job=>job.kind==='voice');
    assert.equal(first.event.absoluteTick,plan.startTick+beats*960);
    assert.equal(first.at,result.start+plan.transport.timeAt(first.event.absoluteTick));
  }
});
test('count-first has real phase-aligned words before music and no synthesized clicks',()=>{
  const plan=compileMusicPlan(track,'section',.8);
  for(const beats of [1,2,4,8]){
    const result=musicJobs(plan,1,{startMode:'count-first',delayBeats:beats,voiceOffsetMs:-200});
    const lead=result.jobs.filter(job=>job.kind==='voice'&&job.at<result.start);
    assert.equal(lead.length,beats);
    assert.equal(lead[0].event.absoluteTick,plan.startTick-beats*960);
    assert.ok(Math.abs(lead[0].at-.32)<1e-10);
    assert.equal(lead.at(-1).event.voiceKey,'four');
    assert.equal(result.jobs.find(job=>job.kind==='voice'&&job.at>=result.start).event.voiceKey,'one');
    assert.equal(result.jobs.filter(job=>job.kind==='click').length,0);
  }
});
test('muted counts start music immediately; meter supplies the default two-bar length',()=>{
  const plan=compileMusicPlan(track,'section');
  for(const startMode of ['music-first','count-first','together']){
    const result=musicJobs(plan,1,{startMode,countEnabled:false});
    assert.equal(result.start,.12);assert.equal(result.jobs.length,1);
  }
  const waltz=compileMusicPlan({...track,danceId:'waltz',beatsPerBar:3,counts:'123',anchorTick:0},'section');
  assert.doesNotThrow(()=>musicJobs(waltz,1,{startMode:'count-first'}));
  assert.throws(()=>musicJobs(plan,1,{startMode:'invalid'}),RangeError);
  assert.throws(()=>musicJobs(plan,1,{startMode:'music-first',delayBeats:16}),RangeError);
});

test('display follows listening and spoken prelude phases from the same schedule',()=>{
  const oldRaf=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
  try {
    for(const startMode of ['music-first','count-first']) {
      const audio=new FakeAudioContext(),frames=[];
      const plan=compileMusicPlan(track,'section');
      const engine=new MusicAudioEngine(audio,{voicePack:fakeVoicePack(),onFrame:frame=>frames.push(frame)});
      engine.start({compiled:plan,musicAsset:{buffer:{duration:plan.transport.duration}},startMode,delayBeats:8});
      audio.currentTime=engine.origin+.3;engine.frame();
      if(startMode==='music-first')assert.equal(frames.at(-1).listening,true);
      else {assert.equal(frames.at(-1).countIn,false);assert.equal(frames.at(-1).event.voiceKey,'one');}
      audio.currentTime=engine.origin+engine.schedule.countStart+.1;engine.frame();
      assert.equal(frames.at(-1).countIn,false);assert.equal(frames.at(-1).event.voiceKey,'one');
      engine.stop();
    }
  } finally {globalThis.requestAnimationFrame=oldRaf;globalThis.cancelAnimationFrame=oldCancel;}
});
