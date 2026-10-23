#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {AxeBuilder} from '@axe-core/playwright';
import {compileMusicProgram,musicJobs} from '../src/engine/music-plan.js';
const base=process.env.DC_BASE_URL??'http://127.0.0.1:5195/';
const browser=await chromium.launch({channel:'chrome'});
const evidence={playback:[],exports:[],checks:[],errors:[]};
const ensure=(value,message)=>{if(!value)throw Error(message);};
const review=(id,program)=>new URL(`/__music/review?track=${id}&program=${program}`,base).href;
try{
 const context=await browser.newContext({viewport:{width:375,height:667},locale:'ja-JP',acceptDownloads:true});
 const page=await context.newPage();page.on('pageerror',error=>evidence.errors.push(error.message));
 await page.goto(review('waltz-33445d26a14c','sample-waltz'));
 await page.waitForFunction(()=>waveformReview.plan?.routineEndTick!==undefined);
 const tracks=await page.evaluate(()=>waveformReview.catalog.filter(t=>t.id!=='paper-umbrella'));
 // All five provided songs: actual realtime frames from the production audio engine.
 for(const [i,track] of tracks.entries()){
  await page.goto(review(track.id,`sample-${track.danceId}`));
  await page.waitForFunction(()=>waveformReview.plan?.routineEndTick!==undefined);
  await page.locator('summary').click();
  const mode=['together','music-first','count-first'][i%3];
  const rate=[1,.8,1.1][i%3];
  await page.locator('#start-order').selectOption(mode);await page.locator('#rate').selectOption(String(rate));
  await page.getByRole('button',{name:'音楽とカウントを聞く',exact:true}).click();await page.waitForFunction(()=>waveformReview.playing);
  await page.evaluate(()=>{
   const engine=waveformReview.engine,original=engine.onFrame;
   waveformReview.observed=[];let previous='';
   engine.onFrame=frame=>{original(frame);const key=`${frame.event?.figureIndex}:${frame.event?.token}:${frame.playing}`;
    if(key!==previous){previous=key;waveformReview.observed.push({tick:frame.originalTick,event:frame.event,playing:frame.playing});}};
  });
  await page.waitForFunction(()=>!waveformReview.playing,null,{timeout:60000});
  const result=await page.evaluate(()=>({observed:waveformReview.observed,plan:{start:waveformReview.plan.routineStartTick,end:waveformReview.plan.routineEndTick,figures:waveformReview.plan.figures},schedule:waveformReview.engine.schedule,figureText:document.querySelector('#figure-now').textContent}));
  const events=result.observed.filter(f=>Number.isInteger(f.event?.figureIndex));
  ensure(events[0]?.event.figureIndex===0,`first figure skipped: ${track.id}/${mode}`);
  ensure(new Set(events.map(f=>f.event.figureIndex)).size===3,`missing figure: ${track.id}`);
  ensure(events.some(f=>f.event.token==='&'),`missing half beat: ${track.id}`);
  for(const figure of result.plan.figures){
   const first=events.find(f=>f.event.figureIndex===figure.figureIndex);
   ensure(first.tick>=figure.startTick&&first.tick-figure.startTick<360,`late figure transition: ${track.id}/${figure.figureIndex}`);
  }
  if(track.danceId==='waltz')ensure(events.filter(f=>f.event.figureIndex===2).length===6,'two-bar figure was reset');
  ensure(result.figureText==='','figure remained active after playback');
  evidence.playback.push({trackId:track.id,mode,rate,...result});
  await fs.writeFile('output/music-probe/routine-browser-evidence.json',JSON.stringify(evidence,null,2)+'\n');
  console.log(`routine playback OK: ${track.id} ${mode} ${rate}`);
 }
 // Real saved WAVs at every supported rate, using the same plans as realtime.
 for(const danceId of ['waltz','rumba','chacha']){
  const track=tracks.find(t=>t.danceId===danceId);
  await page.goto(review(track.id,`sample-${danceId}`));await page.waitForFunction(()=>waveformReview.plan?.routineEndTick!==undefined);
  await page.locator('summary').click();
  const startMode=danceId==='rumba'?'music-first':danceId==='chacha'?'count-first':'together';
  await page.locator('#start-order').selectOption(startMode);
  for(const rate of track.rates){
   await page.locator('#rate').selectOption(String(rate));
   const routine=await page.evaluate(()=>{const r=waveformReview.routineChoices.find(r=>r.selectionId===document.querySelector('#program').value);return{danceId:r.danceId,figures:r.figures};});
   const plan=compileMusicProgram({track,sectionId:'early',rate,routine,startMode,delayBeats:track.beatsPerBar*2});
   await page.locator('#make-file').click();await page.locator('#save-file').waitFor({state:'visible',timeout:60000});
   const pending=page.waitForEvent('download');await page.locator('#save-file').click();const download=await pending;
   const file=path.resolve('output/music-probe/app-exports',download.suggestedFilename());await download.saveAs(file);
   evidence.exports.push({trackId:track.id,rate,startMode,file,schedule:musicJobs(plan,1,{startMode,delayBeats:track.beatsPerBar*2})});
   console.log(`routine export OK: ${danceId} ${rate}`);
  }
 }
 // Seed an isolated browser profile only. The review must read, never edit, saved data.
 const saved=await page.evaluate(async()=>{
  const {openAppStorage}=await import('/src/app/platform/storage.ts');
  const {createRoutine}=await import('/src/app/routines/routine.ts');const {makeId}=await import('/src/app/routines/ids.ts');
  const routine=createRoutine({id:makeId('r'),danceId:'waltz',name:'保存した長いルーティン',now:new Date().toISOString()});
  routine.figures=Array.from({length:8},(_,i)=>({id:makeId('f'),name:`確認 ${i+1}`,counts:i===3?'12&3':'123'}));
  const storage=await openAppStorage();await storage.put('routines',routine);return routine;
 });
 const waltz=tracks.find(t=>t.danceId==='waltz');
 await page.goto(review(waltz.id,`saved-${saved.id}`));
 await page.waitForFunction(()=>waveformReview.track!==null&&document.querySelector('#program').value.startsWith('saved-'));
 ensure(await page.locator('#play').isDisabled(),'overlong routine was silently truncated');
 ensure((await page.locator('#routine-note').textContent()).includes('入りません')&&(await page.locator('#status').textContent()).includes('入りません'),'coverage needs a clear explanation');
 ensure(await page.evaluate(()=>document.querySelector('#overview').toDataURL().length)>2000,'overlong selection hid the whole waveform');
 await page.locator('summary').click();await page.locator('#routine-from').selectOption('2');await page.locator('#routine-to').selectOption('4');
 ensure(!await page.locator('#play').isDisabled(),'explicit shorter range did not enable playback');
 const selected=await page.evaluate(()=>({events:waveformReview.plan.events,range:waveformReview.plan.routineRange}));
 ensure(selected.events[0].figureIndex===2&&selected.events.at(-1).figureIndex===4,'range lost original figure indices');
 await page.locator('#play').click();await page.waitForFunction(()=>waveformReview.playing);
 await page.waitForFunction(()=>document.querySelector('#figure-now').textContent.startsWith('3/8'));
 await page.locator('#play').click();
 const unchanged=await page.evaluate(async id=>(await (await import('/src/app/platform/storage.ts')).openAppStorage()).get('routines',id),saved.id);
 ensure(JSON.stringify(saved)===JSON.stringify(unchanged),'review mutated a saved routine');
 evidence.checks.push('saved routine loaded readonly','overlong routine rejected','explicit figure range keeps original indices');
 // A pending render cannot re-enable an obsolete download after a settings change.
 await page.locator('#make-file').click();await page.locator('#rate').selectOption('0.8');
 await page.waitForTimeout(1000);ensure(await page.locator('#save-file').isHidden(),'cancelled output returned late');
 evidence.checks.push('changed settings cancel old export');
 await page.route('**/__music/audio/**',async route=>{await new Promise(r=>setTimeout(r,1000));await route.continue();});
 await page.locator('#make-file').click();await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));await page.waitForTimeout(1500);
 ensure(!await page.locator('#play').isDisabled()&&!await page.locator('#make-file').isDisabled()&&await page.locator('#save-file').isHidden(),'pagehide render cancellation did not restore controls');
 await page.unroute('**/__music/audio/**');evidence.checks.push('pagehide cancels export and restores controls');
 for(const [width,height]of[[375,667],[250,445],[1280,900]]){
  await page.setViewportSize({width,height});ensure(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
  await page.screenshot({path:`output/music-probe/routine-review-${width}.png`,fullPage:true});
 }
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();ensure(!axe.violations.length,axe.violations.map(v=>v.id).join(','));
 evidence.checks.push('3 widths without overflow','WCAG2A/AA');
 ensure(!evidence.errors.length,evidence.errors.join('\n'));
 await fs.writeFile('output/music-probe/routine-browser-evidence.json',JSON.stringify(evidence,null,2)+'\n');
 console.log('routine music OK: 5 realtime songs, 9 saved WAVs, readonly saved routine/range/lifecycle/layout checks');
}finally{await browser.close();}
