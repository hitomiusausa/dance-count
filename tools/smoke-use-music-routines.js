#!/usr/bin/env node
// The student-facing Use flow: prepared song + readonly saved routine, no waveform.
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {AxeBuilder} from '@axe-core/playwright';
import {compileMusicProgram,musicJobs} from '../src/engine/music-plan.js';
const base=process.env.DC_BASE_URL??'http://127.0.0.1:5195/';
const evidence={playback:[],exports:[],layouts:[],checks:[],errors:[]};
const ensure=(value,message)=>{if(!value)throw Error(message);};
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:375,height:667},locale:'ja-JP',acceptDownloads:true});
 const page=await context.newPage();page.on('pageerror',e=>evidence.errors.push(e.message));
 const analysisRequests=[];page.on('request',r=>{if(/__music\/(analysis|review)/.test(r.url()))analysisRequests.push(r.url());});
 await page.goto(base);await page.waitForSelector('[data-screen=S0]');
 const seeded=await page.evaluate(async()=>{
  const {openAppStorage}=await import('/src/app/platform/storage.ts');const storage=await openAppStorage();
  const {createRoutine}=await import('/src/app/routines/routine.ts');const {makeId}=await import('/src/app/routines/ids.ts');
  const {MUSIC_ROUTINE_SAMPLES}=await import('/tools/music-probe/routine-samples.ts');
  const routines=MUSIC_ROUTINE_SAMPLES.map(s=>({...createRoutine({id:makeId('r'),danceId:s.danceId,name:`${s.danceId}の確認`,now:new Date().toISOString()}),figures:s.figures.map(f=>({...f,id:makeId('f')}))}));
  const long={...createRoutine({id:makeId('r'),danceId:'waltz',name:'長いルーティン',now:new Date().toISOString()}),figures:Array.from({length:8},()=>({id:makeId('f'),name:'長さ確認',counts:'123'}))};
  routines.push(long);for(const r of routines)await storage.put('routines',r);
  return routines;
 });
 await page.reload();await page.waitForSelector('[data-screen=S0]');
 const tracks=await page.evaluate(async()=>await(await fetch('/__music/catalog')).json());
 await page.evaluate(async()=>{
  const loaded=performance.getEntriesByType('resource').find(entry=>new URL(entry.name).pathname==='/src/engine/music-audio-engine.js');
  if(!loaded)throw Error('Music engine module was not loaded');
  const {MusicAudioEngine}=await import(loaded.name);const start=MusicAudioEngine.prototype.start;
  MusicAudioEngine.prototype.start=function(...args){const observed=[];const callback=this.onFrame;this.onFrame=frame=>{callback(frame);const last=observed.at(-1);if(last?.event?.absoluteTick!==frame.event?.absoluteTick||last?.playing!==frame.playing||last?.iteration!==frame.iteration||last?.listening!==frame.listening)observed.push(frame);};window.__routineMusic={observed,engine:this};return start.apply(this,args);};
 });
 for(const [i,danceId]of ['waltz','rumba','chacha'].entries()){
  const routine=seeded.find(r=>r.danceId===danceId),track=tracks.find(t=>t.danceId===danceId);
  await page.goto(new URL(`#/use/music/${track.id}`,base).href);await page.waitForFunction(()=>!document.querySelector('[data-play]')?.disabled);
  await page.locator('[data-more]').click();await page.locator('[data-music-routine]').selectOption(routine.id);
  const opts=await page.locator('[data-music-routine] option').evaluateAll(options=>options.map(o=>o.value));
  ensure(!seeded.some(r=>r.danceId!==danceId&&opts.includes(r.id)),'different dance routine offered');
  const startMode=['music-first','together','count-first'][i],rate=[1,.8,1.1][i];
  await page.getByRole('combobox',{name:'曲とカウント、どちらから始めますか？',exact:true}).selectOption(startMode);
  await page.getByRole('radio',{name:rate===1?'もとの速さ':rate<1?'ゆっくり':'少し速く',exact:true}).click();
  await page.locator('[data-more]').click();await page.locator('[data-play]').click();await page.waitForSelector('[data-playing=true]');
  await page.waitForSelector('[data-playing=false]',{timeout:60000});
  const observed=await page.evaluate(()=>window.__routineMusic.observed);
  const events=observed.filter(f=>Number.isInteger(f.event?.figureIndex));
  ensure(events[0]?.event.figureIndex===0,'opening routine figure skipped');
  ensure(new Set(events.map(f=>f.event.figureIndex)).size===3,'routine did not traverse all figures');
  ensure(events.some(f=>f.event.token==='&'),'half beat missing');
  if(danceId==='waltz')ensure(events.filter(f=>f.event.figureIndex===2).length===6,'two-bar figure was reset');
  ensure(await page.locator('canvas,input[type=file],a[href*="__music/review"]').count()===0,'analysis or upload UI exposed');
  evidence.playback.push({trackId:track.id,danceId,startMode,rate,observed});
  await page.locator('[data-more]').click();await page.getByRole('button',{name:'保存する音声を作る',exact:true}).click();
  await page.locator('[data-music-save]').waitFor({timeout:30000});
  const pending=page.waitForEvent('download');await page.locator('[data-music-save]').click();const downloaded=await pending;
  const file=path.resolve('output/music-probe/app-exports','use-'+downloaded.suggestedFilename());await downloaded.saveAs(file);
  const plan=compileMusicProgram({track,sectionId:'early',rate,startMode,delayBeats:track.beatsPerBar*2,routine});
  evidence.exports.push({trackId:track.id,file,schedule:musicJobs(plan,1,{startMode,delayBeats:track.beatsPerBar*2})});
  await page.locator('[data-music-to]').selectOption('1');ensure(!await page.locator('[data-music-save]').count(),'range change retained an obsolete WAV');
  await page.locator('[data-music-to]').selectOption('2');
  console.log(`Use routine OK: ${danceId}, ${startMode}, ${rate}, real WAV saved`);
 }
 // A repeated clip keeps the same listening introduction and starts figure 1 again.
 const repeatTrack=tracks.find(t=>t.danceId==='waltz');
 await page.goto(new URL(`#/use/music/${repeatTrack.id}`,base).href);await page.waitForSelector('[data-more]');await page.locator('[data-more]').click();
 await page.locator('[data-music-routine]').selectOption(seeded[0].id);
 await page.getByRole('combobox',{name:'同じところを何回くり返しますか？',exact:true}).selectOption('2');
 await page.locator('[data-more]').click();await page.locator('[data-play]').click();await page.waitForSelector('[data-playing=true]');
 await page.waitForFunction(()=>window.__routineMusic.observed.some(f=>f.iteration===1&&f.listening),null,{timeout:30000});
 ensure((await page.locator('.dc-now').textContent())==='曲を聞きましょう','repeat listening label missing');
 await page.waitForFunction(()=>window.__routineMusic.observed.some(f=>f.iteration===1&&f.event?.figureIndex===0),null,{timeout:15000});
 await page.locator('[data-play]').click();await page.locator('[data-more]').click();await page.getByRole('combobox',{name:'同じところを何回くり返しますか？',exact:true}).selectOption('1');await page.locator('[data-more]').click();
 evidence.checks.push('real second routine pass listens again and restarts figure 1');
 // Coverage must be explained outside the closed settings, with no silent shortening.
 const waltz=tracks.find(t=>t.danceId==='waltz'),long=seeded.at(-1);
 await page.goto(new URL(`#/use/music/${waltz.id}`,base).href);await page.waitForSelector('[data-more]');await page.locator('[data-more]').click();
 await page.locator('[data-music-routine]').selectOption(long.id);ensure(await page.locator('[data-play]').isDisabled(),'overlong routine silently shortened');
 await page.locator('[data-more]').click();ensure(await page.locator('[data-music-routine-error]').isVisible(),'coverage advice hidden in settings');
 await page.locator('[data-more]').click();
 const count=page.getByRole('switch',{name:'カウントの声',exact:true});await count.click();ensure(!await page.locator('[data-play]').isDisabled(),'muted routine blocked music-only playback');await count.click();
 await page.locator('[data-music-from]').selectOption('2');await page.locator('[data-music-to]').selectOption('4');
 ensure(!await page.locator('[data-play]').isDisabled(),'explicit figure range still blocked');
 await page.locator('[data-more]').click();await page.locator('[data-play]').click();await page.waitForSelector('[data-playing=true]');await page.waitForFunction(()=>document.querySelector('[data-figure-now]')?.textContent.includes('3 / 8'));await page.locator('[data-play]').click();
 const after=await page.evaluate(async()=>(await(await import('/src/app/platform/storage.ts')).openAppStorage()).getAll('routines'));
 ensure(JSON.stringify([...after].sort((a,b)=>a.id.localeCompare(b.id)))===JSON.stringify([...seeded].sort((a,b)=>a.id.localeCompare(b.id))),'music changed saved routine data');
 evidence.checks.push('coverage advice outside settings','music-only ignores routine coverage','explicit range retains original indices','saved routine bytes unchanged');
 // JA/EN, short phones and enlarged text width; the routine name adds no new operation.
 for(const locale of ['ja-JP','en']){
  await page.evaluate(async locale=>{const storage=await(await import('/src/app/platform/storage.ts')).openAppStorage();await storage.put('settings',{uiLocale:locale,lastDanceId:'waltz',hints:{firstPlaybackDone:true}},'app');},locale);
  await page.reload();await page.waitForSelector('[data-more]');await page.locator('[data-more]').click();await page.locator('[data-music-routine]').selectOption(seeded[0].id);await page.locator('[data-more]').click();
  for(const [width,height]of [[375,667],[375,548],[250,445],[1280,900]]){
   await page.setViewportSize({width,height});await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
   for(const open of [false,true]){
    if(open)await page.locator('[data-more]').click();
    const measure=await page.evaluate(()=>{
     const visible=e=>{if(e.closest('details:not([open])')&&!e.closest('summary'))return false;return e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';};
     const all=[...document.querySelectorAll('main button,main a,main select,main input,main summary')].filter(visible).filter(e=>!e.matches('[data-back]'));
     const small=all.filter(e=>{const r=e.getBoundingClientRect();return r.width<47.9||r.height<47.9;}).map(e=>e.textContent);
     const more=document.querySelector('[data-more]').getBoundingClientRect(),dock=document.querySelector('.dc-dock').getBoundingClientRect();
     return{overflow:document.documentElement.scrollWidth>innerWidth,operations:new Set(all.map(e=>e.closest('[data-group]')??e)).size,small,moreBottom:more.bottom,dockTop:dock.top};
    });
    ensure(!measure.overflow&&!measure.small.length&&measure.operations<=(open?9:5),`layout ${locale}/${width}/${open}: ${JSON.stringify(measure)}`);
    if(!open&&width===375&&height===548)await page.screenshot({path:`output/music-probe/use-routine-short-${locale}.png`,fullPage:false});
    if(!open&&width===375&&height===548)ensure(measure.moreBottom<=measure.dockTop-8,`settings covered by play dock ${locale}: ${JSON.stringify(measure)}`);
    evidence.layouts.push({locale,width,height,open,...measure});
    if(open){if(width===375||width===250){const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();ensure(!axe.violations.length,axe.violations.map(v=>v.id).join(','));}await page.screenshot({path:`output/music-probe/use-routine-${locale}-${width}x${height}.png`,fullPage:true});await page.locator('[data-more]').click();}
   }
  }
 }
 ensure(!analysisRequests.length,'student flow requested analysis');ensure(!evidence.errors.length,evidence.errors.join('\n'));
 evidence.checks.push('no waveform, analysis requests, creator link or audio upload','JA/EN, 4 sizes, closed <=5 / open <=9 operations, WCAG2A/AA');
 await fs.writeFile('output/music-probe/use-routine-browser-evidence.json',JSON.stringify(evidence,null,2)+'\n');
 console.log('Use music routines OK: 3 playback/WAV cases, readonly range, no analysis UI, 16 locale/size states');
}catch(error){await fs.writeFile('output/music-probe/use-routine-failure.json',JSON.stringify({error:String(error),...evidence},null,2)+'\n');throw error;}finally{await browser.close();}
