#!/usr/bin/env node
// Real Chrome checks of the integrated Use -> Music flow, not the old lab.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { compileMusicPlan, musicJobs } from '../src/engine/music-plan.js';

const BASE=process.env.DC_BASE_URL??'http://127.0.0.1:5195/';
const out=path.resolve('output/music-probe');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:375,height:667},locale:'ja-JP'});
await context.addInitScript(()=>{
  const original=AudioBufferSourceNode.prototype.start;
  const state={sources:[],errors:[]};
  window.__musicCheck=state;
  AudioBufferSourceNode.prototype.start=function(...args){
    state.sources.push({at:args[0]??0,offset:args[1]??0,duration:this.buffer?.duration,rate:this.playbackRate.value});
    return original.apply(this,args);
  };
});
const page=await context.newPage();const errors=[];const evidence={playbacks:[],checks:[]};
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
function ensure(value,message){if(!value)throw Error(message);}
async function idle(){if(await page.locator('[data-screen=U4][data-playing=true]').count())await page.locator('[data-play]').click();}
async function select(name,value){await page.getByRole('combobox',{name}).selectOption(String(value));}
async function chooseRate(rate){await page.getByRole('radio',{name:rate===1?'もとの速さ':rate<1?'ゆっくり':'少し速く',exact:true}).click();}
async function setToggle(name,enabled){const toggle=page.getByRole('switch',{name,exact:true});if((await toggle.getAttribute('aria-checked')==='true')!==enabled)await toggle.click();}
async function openSettings(){const more=page.locator('.dc-more');if(!await more.evaluate(element=>element.open))await page.locator('[data-more]').click();}
try{
  await page.goto(BASE);
  await page.waitForSelector('[data-screen=S0]');
  await page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('dance-count-v2');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('settings','readwrite');tx.objectStore('settings').delete('music:paper-umbrella');tx.oncomplete=()=>{db.close();resolve(true);};tx.onerror=()=>reject(tx.error);};}));
  await page.reload();await page.getByRole('link',{name:/使う/}).click();
  await page.getByRole('link',{name:'音楽',exact:true}).click();
  await page.locator('[data-music-genre] summary').first().click();
  await page.getByRole('link',{name:'ルンバ Paper Umbrella',exact:true}).click();
  await page.getByRole('radio',{name:'もとの速さ',exact:true}).waitFor();
  ensure((await page.locator('.dc-beats li').allTextContents()).join('')==='1234','Rumba beat strip should start at beat 1');
  ensure((await page.locator('.dc-now').textContent())?.trim()==='2','Rumba dance count should stay on 2 for the music alignment');
  ensure(await page.locator('[data-group="music-file"]').count()===0,'audio export controls must not be available in practice');
  ensure(await page.getByRole('button',{name:/音声を作る|ファイルを保存する/}).count()===0,'audio export action is visible');
  evidence.checks.push('practice screen has no audio export action');
  const track=await page.evaluate(async()=>{const response=await fetch('/__music/catalog');return(await response.json())[0];});
  evidence.revision=track.revision;
  await page.evaluate(async()=>{
    const {MusicAudioEngine}=await import('/src/engine/music-audio-engine.js');
    const stop=MusicAudioEngine.prototype.stop;
    window.__musicStops=[];
    MusicAudioEngine.prototype.stop=function(...args){window.__musicStops.push({time:this.audio.currentTime,cursor:this.cursor,playing:this.playing,stack:new Error().stack});return stop.apply(this,args);};
  });
  await page.getByText('練習の設定',{exact:true}).click();
  await select('曲とカウントをどう始めますか？','together');await select('曲とカウントを何回繰り返しますか？',1);
  const section=track.sections[0];
  for(const rate of track.rates){
    await chooseRate(rate);
    const before=await page.evaluate(()=>window.__musicCheck.sources.length);
    await page.locator('[data-play]').click();
    await page.waitForSelector('[data-screen=U4][data-playing=true]');
    await page.waitForFunction(()=>/^[1-4]$/.test(document.querySelector('.dc-now')?.textContent??''));
    const counts=new Set();for(let i=0;i<24;i++){counts.add(await page.locator('.dc-now').textContent());await page.waitForTimeout(250);}
    ensure(counts.size>=3,`count froze ${section.id}@${rate}`);
    const sources=await page.evaluate(i=>window.__musicCheck.sources.slice(i),before);
    const music=sources.filter(s=>s.duration>2);
    ensure(music.length===1&&music[0].rate===1,'pitch must not be changed through playbackRate');
    const plan=compileMusicPlan(track,section.id,rate);
    ensure(Math.abs(music[0].duration-plan.transport.duration)<.05,'decoded variant duration differs from map');
    await page.getByRole('slider',{name:'カウントの大きさ',exact:true}).waitFor();
    // Volume must change the gain without restarting the transport.
    await page.getByRole('slider',{name:'音楽の大きさ',exact:true}).focus();await page.keyboard.press('ArrowLeft');
    ensure(await page.locator('[data-screen=U4][data-playing=true]').count(),'volume stopped music');
    if(rate===track.rates[0]){
      const countMute=page.locator('[data-mute-count]'),musicMute=page.locator('[data-mute-music]');
      await countMute.click();ensure(await countMute.getAttribute('aria-pressed')==='true','count 消音 did not turn on');
      ensure(await page.locator('[data-screen=U4][data-playing=true]').count(),'count 消音 stopped music');
      await countMute.click();ensure(await countMute.getAttribute('aria-pressed')==='false','count 消音 did not turn off');
      await musicMute.click();ensure(await musicMute.getAttribute('aria-pressed')==='true','music 消音 did not turn on');
      ensure(await page.locator('[data-screen=U4][data-playing=true]').count(),'music 消音 stopped transport');
      await musicMute.click();ensure(await musicMute.getAttribute('aria-pressed')==='false','music 消音 did not turn off');
    }
    await idle();
    const spoken=sources.filter(source=>source.duration>.1&&source.duration<2&&source.at>=music[0].at-.1);
    ensure(spoken.length>=3,'not enough real spoken nodes for cadence verification');
    const intervals=spoken.slice(1).map((source,index)=>source.at-spoken[index].at).sort((a,b)=>a-b);
    const medianVoiceInterval=intervals[Math.floor(intervals.length/2)];
    const mappedIntervals=plan.events.slice(1).map((event,index)=>plan.transport.timeAt(event.absoluteTick)-plan.transport.timeAt(plan.events[index].absoluteTick)).sort((a,b)=>a-b);
    const expectedInterval=mappedIntervals[Math.floor(mappedIntervals.length/2)];
    ensure(Math.abs(medianVoiceInterval-expectedInterval)<.08,`spoken cadence differs from waveform map: ${medianVoiceInterval} vs ${expectedInterval}`);
    evidence.playbacks.push({section:section.id,rate,counts:[...counts],music,medianVoiceInterval});
  }
  // One real repeated section is allowed to reach its second music start.
  await chooseRate(1.1);await select('曲とカウントを何回繰り返しますか？',2);
  const duration=Number(await page.locator('[data-music-duration]').getAttribute('data-music-duration'));
  const before=await page.evaluate(()=>window.__musicCheck.sources.length);
  await page.locator('[data-play]').click();await page.waitForTimeout((duration+1)*1000);
  ensure(await page.locator('[data-screen=U4][data-playing=true]').count(),'repeated practice stopped before second pass');
  const starts=await page.evaluate(i=>window.__musicCheck.sources.slice(i).filter(s=>s.duration>2),before);
  ensure(starts.length===2,'second music pass was not scheduled');
  ensure(Math.abs(starts[1].at-starts[0].at-duration)<1/44100,'loop accumulated timing error');
  await idle();evidence.checks.push('real second loop: same buffer at exact mapped interval');
  // Real count-first/music-first schedules use the shared transport.
  await select('曲とカウントを何回繰り返しますか？',1);await chooseRate(1);
  const voiceManifest=await page.evaluate(async()=>await(await fetch('/audio/default-en-female-v1/manifest.json')).json());
  for(const [startMode,delayBeats] of [['music-first',4],['music-first',8],['count-first',4],['count-first',8]]){
    await select('曲とカウントをどう始めますか？',startMode);await select(startMode==='music-first'?'曲を何小節聞いてから数えますか？':'何小節数えてから曲を流しますか？',delayBeats);
    const plan=compileMusicPlan(track,section.id,1),schedule=musicJobs(plan,1,{startMode,delayBeats});
    const firstWord=schedule.jobs.find(job=>job.kind==='voice');
    const before=await page.evaluate(()=>window.__musicCheck.sources.length);
    await page.locator('[data-play]').click();await page.waitForSelector('[data-screen=U4][data-playing=true]');
    if(startMode==='music-first')await page.getByText('曲を聞きましょう',{exact:true}).waitFor();
    await page.waitForTimeout((Math.max(schedule.start,firstWord.at)+.6)*1000);
    const sources=await page.evaluate(i=>window.__musicCheck.sources.slice(i),before);
    const music=sources.find(source=>source.duration>2),voice=sources.find(source=>source.duration>.1&&source.duration<2); // Ignore the tiny Web Audio unlock pulse.
    ensure(music&&voice,`missing ordered sound: ${startMode}/${delayBeats}`);
    const observedGap=voice.at+voiceManifest.words[firstWord.event.voiceKey].onsetMs/1000-music.at;
    const expectedGap=firstWord.at-schedule.start;
    ensure(Math.abs(observedGap-expectedGap)<1/44100,`start order drift: ${startMode}/${delayBeats}: ${observedGap} vs ${expectedGap}`);
    await idle();evidence.checks.push(`${startMode} ${delayBeats/track.beatsPerBar} bars: real nodes match the shared schedule`);
  }
  await chooseRate(1.1);await select('曲とカウントを何回繰り返しますか？',2);
  // Settings survive leaving and reopening the player.
  await openSettings();await page.getByRole('link',{name:'曲を選び直す',exact:true}).click();await page.locator('[data-music-genre] summary').first().click();await page.getByRole('link',{name:'ルンバ Paper Umbrella',exact:true}).click();
  await openSettings();
  ensure(await page.getByRole('radio',{name:'少し速く',exact:true}).getAttribute('aria-checked')==='true','saved speed was not restored');
  ensure(await page.getByRole('combobox',{name:'曲とカウントを何回繰り返しますか？'}).inputValue()==='2','saved repeat count was not restored');
  evidence.checks.push('saved preferences restored after leaving and returning');
  await page.locator('[data-play]').click();await page.waitForTimeout(100);
  await openSettings();await page.getByRole('link',{name:'曲を選び直す',exact:true}).click();
  await page.waitForSelector('[data-screen=U3]');
  ensure(await page.locator('[data-screen=U3]').count(),'navigation during playback failed');
  evidence.checks.push('reselect song returns to catalog and stops playback');
  await page.goto(`${BASE}#/use/music/unknown-song`);await page.waitForURL('**/#/use/music');
  evidence.checks.push('unknown track returns to the catalog');
  // From a figure practice, one Back action from the music player should skip the song picker.
  await page.getByRole('link',{name:'フィガー',exact:true}).click();await page.waitForSelector('[data-screen=S1]');
  await page.getByRole('link',{name:'ワルツ 1 2 3',exact:true}).click();await page.waitForSelector('[data-screen=F1]');
  await page.locator('[data-figure="whisk"]').click();await page.waitForSelector('[data-screen=S2]');
  await page.locator('[data-more]').click();await page.locator('[data-add-music]').click();await page.waitForSelector('[data-screen=U5]');
  await page.getByRole('link',{name:/The Sweetest Dance/}).click();await page.waitForSelector('[data-screen=U4]');
  await page.getByRole('button',{name:'戻る',exact:true}).click();await page.waitForSelector('[data-screen=S2]');
  ensure(await page.locator('[data-screen=U5]').count()===0,'figure Back returned to the song picker instead of practice');
  ensure(page.url().includes('/practice/waltz/whisk'),'figure Back lost the selected figure');
  evidence.checks.push('figure music Back returns directly to the selected figure');
  // Repeat the same path for a saved routine.
  await page.goto(BASE);await page.waitForSelector('[data-screen=S0]');
  await page.evaluate(async()=>{
    const {createRoutine}=await import('/src/app/routines/routine.ts');
    const routine=createRoutine({id:'r-music-back-test-1234',danceId:'rumba',name:'Music back test',now:'2026-10-24'});
    routine.figures=[{id:'f-music-back-test-1234',name:'Basic',counts:'2341'}];
    await new Promise((resolve,reject)=>{
      const request=indexedDB.open('dance-count-v2');request.onerror=()=>reject(request.error);request.onsuccess=()=>{
        const db=request.result,tx=db.transaction('routines','readwrite');tx.objectStore('routines').put(routine);
        tx.oncomplete=()=>{db.close();resolve(true);};tx.onerror=()=>reject(tx.error);
      };
    });
  });
  await page.reload();await page.waitForSelector('[data-screen=S0]');
  await page.goto(`${BASE}#/routines/r-music-back-test-1234/play`);await page.waitForSelector('[data-screen=S5]');
  await page.locator('[data-more]').click();await page.locator('[data-add-music]').click();await page.waitForSelector('[data-screen=U5]');
  await page.getByRole('link',{name:'ルンバ Paper Umbrella',exact:true}).click();await page.waitForSelector('[data-screen=U4]');
  await page.getByRole('button',{name:'戻る',exact:true}).click();await page.waitForSelector('[data-screen=S5]');
  ensure(await page.locator('[data-screen=U5]').count()===0,'routine Back returned to the song picker instead of routine practice');
  evidence.checks.push('routine music Back returns directly to routine practice');
  // Show the existing design at both normal and enlarged widths.
  for(const [width,height] of [[375,667],[375,548],[250,445],[1280,900]]){
    await page.setViewportSize({width,height});await page.goto(`${BASE}#/use/music/paper-umbrella`);
    await page.getByRole('radio',{name:'もとの速さ',exact:true}).waitFor();
    await page.screenshot({path:path.resolve(`output/music-probe/music-${width}x${height}.png`),fullPage:true});
    ensure(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`horizontal overflow at ${width}`);
  }
  ensure(errors.length===0,errors.join('\n'));
  evidence.errors=errors;await fs.writeFile(path.resolve('output/music-probe/app-browser-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(`music smoke OK: ${evidence.playbacks.length} playback variants, ${evidence.checks.length} lifecycle checks`);
}catch(error){
  let diagnostics=null;
  try{if(!page.isClosed())diagnostics=await page.evaluate(()=>({sources:window.__musicCheck?.sources.slice(-20),stops:window.__musicStops,visibility:document.visibilityState,text:document.body.innerText}));}catch{}
  await fs.writeFile(path.resolve('output/music-probe/smoke-failure.json'),JSON.stringify({error:String(error),url:page.url(),diagnostics},null,2));
  throw error;
}finally{await browser.close();}
