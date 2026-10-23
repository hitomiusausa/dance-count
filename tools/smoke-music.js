#!/usr/bin/env node
// Real Chrome checks of the integrated Use -> Music flow, not the old lab.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { compileMusicPlan, musicJobs } from '../src/engine/music-plan.js';

const BASE=process.env.DC_BASE_URL??'http://127.0.0.1:5195/';
const out=path.resolve('output/music-probe/app-exports');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:375,height:667},locale:'ja-JP',acceptDownloads:true});
await context.addInitScript(()=>{
  const original=AudioBufferSourceNode.prototype.start;
  const state={sources:[],errors:[]};
  window.__musicCheck=state;
  AudioBufferSourceNode.prototype.start=function(...args){
    state.sources.push({at:args[0]??0,offset:args[1]??0,duration:this.buffer?.duration,rate:this.playbackRate.value});
    return original.apply(this,args);
  };
});
const page=await context.newPage();const errors=[];const evidence={exports:[],playbacks:[],checks:[]};
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
function ensure(value,message){if(!value)throw Error(message);}
async function idle(){if(await page.locator('[data-screen=U4][data-playing=true]').count())await page.locator('[data-play]').click();}
async function select(name,value){await page.getByRole('combobox',{name}).selectOption(String(value));}
async function chooseRate(rate){await page.getByRole('radio',{name:rate===1?'もとの速さ':rate<1?'ゆっくり':'少し速く',exact:true}).click();}
async function setToggle(name,enabled){const toggle=page.getByRole('switch',{name,exact:true});if((await toggle.getAttribute('aria-checked')==='true')!==enabled)await toggle.click();}
try{
  await page.goto(BASE);await page.getByRole('link',{name:/使う/}).click();
  await page.getByRole('link',{name:'音楽に合わせて練習',exact:true}).click();
  await page.getByRole('link',{name:'Paper Umbrella ルンバ',exact:true}).click();
  await page.getByRole('radio',{name:'もとの速さ',exact:true}).waitFor();
  const track=await page.evaluate(async()=>{const response=await fetch('/__music/catalog');return(await response.json())[0];});
  evidence.revision=track.revision;
  await page.evaluate(async()=>{
    const {MusicAudioEngine}=await import('/src/engine/music-audio-engine.js');
    const stop=MusicAudioEngine.prototype.stop;
    window.__musicStops=[];
    MusicAudioEngine.prototype.stop=function(...args){window.__musicStops.push({time:this.audio.currentTime,cursor:this.cursor,playing:this.playing,stack:new Error().stack});return stop.apply(this,args);};
  });
  await page.getByText('練習の設定',{exact:true}).click();
  await select('曲とカウント、どちらから始めますか？','together');await select('同じところを何回くり返しますか？',1);
  for(const section of track.sections)for(const rate of track.rates){
    await select('曲のどこで練習しますか？',section.id);await chooseRate(rate);
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
    // Volume must change the gain without restarting the transport.
    await page.getByRole('slider',{name:'音楽の大きさ',exact:true}).focus();await page.keyboard.press('ArrowLeft');
    ensure(await page.locator('[data-screen=U4][data-playing=true]').count(),'volume stopped music');
    await idle();
    const spoken=sources.filter(source=>source.duration>.1&&source.duration<2&&source.at>=music[0].at-.1);
    ensure(spoken.length>=3,'not enough real spoken nodes for cadence verification');
    const intervals=spoken.slice(1).map((source,index)=>source.at-spoken[index].at).sort((a,b)=>a-b);
    const medianVoiceInterval=intervals[Math.floor(intervals.length/2)];
    const mappedIntervals=plan.events.slice(1).map((event,index)=>plan.transport.timeAt(event.absoluteTick)-plan.transport.timeAt(plan.events[index].absoluteTick)).sort((a,b)=>a-b);
    const expectedInterval=mappedIntervals[Math.floor(mappedIntervals.length/2)];
    ensure(Math.abs(medianVoiceInterval-expectedInterval)<.08,`spoken cadence differs from waveform map: ${medianVoiceInterval} vs ${expectedInterval}`);
    evidence.playbacks.push({section:section.id,rate,counts:[...counts],music,medianVoiceInterval});
    await page.getByRole('button',{name:'保存する音声を作る',exact:true}).click();
    const save=page.getByRole('button',{name:'ファイルを保存する',exact:true});
    await save.waitFor({state:'visible',timeout:20000});
    const event=page.waitForEvent('download');await save.click();const download=await event;
    const file=path.join(out,download.suggestedFilename());await download.saveAs(file);
    evidence.exports.push({section:section.id,rate,file,schedule:musicJobs(plan,1,{countInBars:0,countEnabled:true}),musicVolume:.32-(evidence.playbacks.length)*.01});
  }
  // One real repeated section is allowed to reach its second music start.
  await chooseRate(1.1);await select('曲のどこで練習しますか？','early');await select('同じところを何回くり返しますか？',2);
  const duration=Number(await page.locator('[data-music-duration]').getAttribute('data-music-duration'));
  const before=await page.evaluate(()=>window.__musicCheck.sources.length);
  await page.locator('[data-play]').click();await page.waitForTimeout((duration+1)*1000);
  ensure(await page.locator('[data-screen=U4][data-playing=true]').count(),'repeated practice stopped before second pass');
  const starts=await page.evaluate(i=>window.__musicCheck.sources.slice(i).filter(s=>s.duration>2),before);
  ensure(starts.length===2,'second music pass was not scheduled');
  ensure(Math.abs(starts[1].at-starts[0].at-duration)<1/44100,'loop accumulated timing error');
  await idle();evidence.checks.push('real second loop: same buffer at exact mapped interval');
  await page.getByRole('button',{name:'保存する音声を作る',exact:true}).click();
  await page.locator('[data-music-save]').waitFor({state:'visible'});
  const repeatedDownload=page.waitForEvent('download');await page.locator('[data-music-save]').click();
  const repeated=await repeatedDownload;const repeatedFile=path.join(out,repeated.suggestedFilename());await repeated.saveAs(repeatedFile);
  evidence.exports.push({section:'early',rate:1.1,file:repeatedFile,schedule:musicJobs(compileMusicPlan(track,'early',1.1),2,{countInBars:0,countEnabled:true})});
  evidence.checks.push('two-pass WAV saved from the same transport');
  // Real count-first/music-first schedules and actual downloaded files.
  await select('同じところを何回くり返しますか？',1);await select('曲のどこで練習しますか？','early');await chooseRate(1);
  const voiceManifest=await page.evaluate(async()=>await(await fetch('/audio/default-en-female-v1/manifest.json')).json());
  for(const [startMode,delayBeats] of [['music-first',1],['music-first',4],['music-first',8],['count-first',1],['count-first',4],['count-first',8]]){
    await select('曲とカウント、どちらから始めますか？',startMode);await select(startMode==='music-first'?'曲を何拍聞いてから数えますか？':'何拍数えてから曲を流しますか？',delayBeats);
    const plan=compileMusicPlan(track,'early',1),schedule=musicJobs(plan,1,{startMode,delayBeats});
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
    await idle();evidence.checks.push(`${startMode} ${delayBeats} beats: real nodes match the shared schedule`);
    await page.getByRole('button',{name:'保存する音声を作る',exact:true}).click();
    await page.locator('[data-music-save]').waitFor({state:'visible'});
    const event=page.waitForEvent('download');await page.locator('[data-music-save]').click();const download=await event;
    const file=path.join(out,download.suggestedFilename());await download.saveAs(file);
    evidence.exports.push({section:'early',rate:1,file,schedule,startMode,delayBeats});
  }
  // Long file prevention is visible BEFORE starting any render.
  await select('曲のどこで練習しますか？','late');await chooseRate(.8);await select('同じところを何回くり返しますか？',4);await select('曲とカウント、どちらから始めますか？','count-first');await select('何拍数えてから曲を流しますか？',8);
  ensure(await page.getByRole('button',{name:'保存する音声を作る',exact:true}).isDisabled(),'long file was not blocked up front');
  ensure(await page.getByText('練習が長すぎて保存できません。回数を少なくして、もう一度お試しください。',{exact:true}).isVisible(),'long-file advice missing');
  evidence.checks.push('long output is blocked with repeat-specific advice');
  await select('同じところを何回くり返しますか？',1);await chooseRate(1);await select('曲のどこで練習しますか？','early');
  // Settings survive leaving and reopening the player.
  await page.getByRole('button',{name:'戻る',exact:true}).click();await page.getByRole('link',{name:'Paper Umbrella ルンバ',exact:true}).click();
  await page.getByText('練習の設定',{exact:true}).click();
  ensure(await page.getByRole('combobox',{name:'曲のどこで練習しますか？'}).inputValue()==='early','range was not restored');
  evidence.checks.push('saved preferences restored after leaving and returning');
  // During output, cancellation must discard a late result.
  await page.route('**/__music/audio/**',async route=>{await new Promise(r=>setTimeout(r,1500));await route.continue();});
  await page.getByRole('button',{name:'保存する音声を作る',exact:true}).click();
  ensure(await page.locator('[data-play]').isDisabled(),'play remains active during rendering');
  await page.getByRole('button',{name:'やめる',exact:true}).click();await page.waitForTimeout(2000);
  ensure(await page.locator('[data-music-save]').count()===0,'cancelled file reappeared');await page.unroute('**/__music/audio/**');
  evidence.checks.push('cancelled output never returns a late save button');
  // An actual interrupted preparation cannot resurrect after its request completes.
  await page.route('**/__music/audio/**',async route=>{await new Promise(r=>setTimeout(r,1500));await route.continue();});
  await select('曲のどこで練習しますか？','middle');await page.locator('[data-play]').click();await page.waitForTimeout(100);
  await page.getByRole('button',{name:'戻る',exact:true}).click();await page.waitForTimeout(2000);
  ensure(await page.locator('[data-screen=U3]').count(),'navigation while preparing failed');await page.unroute('**/__music/audio/**');
  evidence.checks.push('leaving during music preparation never resumes it');
  await page.goto(`${BASE}#/use/music/unknown-song`);await page.waitForURL('**/#/use/music');
  evidence.checks.push('unknown track returns to the catalog');
  // Show the existing design at both normal and enlarged widths.
  for(const [width,height] of [[375,667],[375,548],[250,445],[1280,900]]){
    await page.setViewportSize({width,height});await page.goto(`${BASE}#/use/music/paper-umbrella`);
    await page.getByRole('radio',{name:'もとの速さ',exact:true}).waitFor();
    await page.screenshot({path:path.resolve(`output/music-probe/music-${width}x${height}.png`),fullPage:true});
    ensure(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`horizontal overflow at ${width}`);
  }
  ensure(errors.length===0,errors.join('\n'));
  evidence.errors=errors;await fs.writeFile(path.resolve('output/music-probe/app-browser-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(`music smoke OK: ${evidence.playbacks.length} playback variants, ${evidence.exports.length} saved WAVs, ${evidence.checks.length} lifecycle checks`);
}catch(error){
  let diagnostics=null;
  try{if(!page.isClosed())diagnostics=await page.evaluate(()=>({sources:window.__musicCheck?.sources.slice(-20),stops:window.__musicStops,visibility:document.visibilityState,text:document.body.innerText}));}catch{}
  await fs.writeFile(path.resolve('output/music-probe/smoke-failure.json'),JSON.stringify({error:String(error),url:page.url(),diagnostics},null,2));
  throw error;
}finally{await browser.close();}
