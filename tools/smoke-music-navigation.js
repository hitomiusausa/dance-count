#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {AxeBuilder} from '@axe-core/playwright';
const base=process.env.DC_BASE_URL??'http://127.0.0.1:5195/';
const evidence={checks:[],exports:[],layouts:[],errors:[]};const ensure=(v,m)=>{if(!v)throw Error(m);};
async function instrument(page){
 await page.evaluate(async()=>{const entry=performance.getEntriesByType('resource').find(r=>new URL(r.name).pathname==='/src/engine/music-audio-engine.js');const {MusicAudioEngine}=await import(entry.name);const start=MusicAudioEngine.prototype.start;MusicAudioEngine.prototype.start=function(...args){window.__navigationMusic=this;return start.apply(this,args);};});
}
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:375,height:667},locale:'ja-JP',acceptDownloads:true});
 const page=await context.newPage();page.on('pageerror',e=>evidence.errors.push(e.message));
 await page.goto(base);await page.waitForSelector('[data-screen=S0]');
 const routines=await page.evaluate(async()=>{
  const {openAppStorage}=await import('/src/app/platform/storage.ts');const {createRoutine}=await import('/src/app/routines/routine.ts');const {makeId}=await import('/src/app/routines/ids.ts');const {MUSIC_ROUTINE_SAMPLES}=await import('/tools/music-probe/routine-samples.ts');
  const storage=await openAppStorage();const waltz={...createRoutine({id:makeId('r'),danceId:'waltz',name:'ワルツの確認',now:new Date().toISOString()}),figures:MUSIC_ROUTINE_SAMPLES[0].figures.map(f=>({...f,id:makeId('f')}))};
  const unavailable={...createRoutine({id:makeId('r'),danceId:'slowfox',name:'曲を準備中のルーティン',now:new Date().toISOString()}),figures:[{id:makeId('f'),name:'確認',counts:'SQQ'}]};
  for(const r of [waltz,unavailable])await storage.put('routines',r);return[waltz,unavailable];
 });
 await page.reload();await page.waitForSelector('[data-screen=S0]');await page.getByRole('link',{name:/使う/}).click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-nav] a').length===3);
 ensure((await page.locator('[data-nav] a').allTextContents()).map(x=>x.trim()).join('/')==='フィガー/ルーティン/音楽','three Use tabs missing');
 for(const [label,screen] of [['ルーティン','U2'],['音楽','U3'],['フィガー','S1'],['音楽','U3']]){await page.getByRole('link',{name:label,exact:true}).click();await page.waitForSelector(`[data-screen=${screen}]`);}
 await page.waitForSelector('[data-screen=U3]');await page.waitForSelector('[data-track]');ensure(await page.locator('[data-track]').count()===6,'root song list was filtered');
 await page.locator('[data-back]').click();await page.waitForSelector('[data-screen=S0]');
 evidence.checks.push('three root tabs and one-tap return to cover');
 await page.getByRole('link',{name:/使う/}).click();await page.locator('a[href="#/figures/waltz"]').click();await page.locator('[data-figure=chasse-from-pp]').click();await page.waitForSelector('[data-screen=S2]');
 await page.locator('[data-more]').click();await page.locator('[data-add-music]').click();await page.waitForSelector('[data-screen=U5]');
 ensure((await page.locator('[data-music-context]').textContent()).includes('シャッセ'),'figure selection lost');
 await page.waitForSelector('[data-track]');ensure(await page.locator('[data-track]').count()===1&&!await page.locator('[data-nav]').count(),'figure picker should show matching songs without root tabs');
 const figurePath=page.url();await page.locator('[data-track]').click();await page.waitForSelector('[data-screen=U4]');await page.waitForFunction(()=>document.querySelector('[data-play]')?.disabled===false);
 ensure((await page.locator('[data-figure-now]').textContent()).includes('シャッセ'),'music player did not keep figure');
 ensure(await page.locator('[data-playing=false]').count()===1,'song started automatically after choosing');
 // Patch the loaded module URL, including Vite's HMR version if present.
 await instrument(page);
 await page.locator('[data-play]').click();await page.waitForSelector('[data-playing=true]');await page.waitForSelector('[data-playing=false]',{timeout:30000});
 const figureSchedule=await page.evaluate(()=>({schedule:window.__navigationMusic.schedule,figures:window.__navigationMusic.plan.figures,events:window.__navigationMusic.plan.events}));
 ensure(figureSchedule.figures.length===4&&figureSchedule.events.filter(e=>e.token==='&').length===4,'figure was not repeated across the song');
 await page.locator('[data-more]').click();await page.getByRole('button',{name:'保存する音声を作る',exact:true}).click();await page.locator('[data-music-save]').waitFor();
 let pending=page.waitForEvent('download');await page.locator('[data-music-save]').click();let download=await pending;let file=path.resolve('output/music-probe/app-exports','navigation-'+download.suggestedFilename());await download.saveAs(file);evidence.exports.push({file,schedule:figureSchedule.schedule});
 await page.reload();await page.waitForSelector('[data-figure-now]');ensure((await page.locator('[data-figure-now]').textContent()).includes('シャッセ'),'reload forgot figure');ensure(await page.locator('[data-playing=false]').count()===1,'reload resumed music');
 await page.locator('[data-back]').click();await page.waitForSelector('[data-screen=U5]');ensure(page.url()===figurePath,'direct/reloaded back did not keep figure picker');await page.locator('[data-back]').click();await page.waitForSelector('[data-screen=S2]');ensure(page.url().includes('chasse-from-pp'),'back lost selected figure');ensure(await page.locator('[data-playing=false]').count()===1,'returning to figure resumed old playback');
 evidence.checks.push('figure → same-dance songs → repeated figure music/WAV','figure and safe stopped state survive reload/back');
 // Routine source carries an explicitly selected figure range into song selection.
 await page.goto(new URL('#/use/routines',base).href);await page.locator('[data-row]').first().locator('button').click();await page.waitForSelector('[data-screen=S5]');
 if(await page.locator('[data-playing=true]').count())await page.locator('[data-play]').click();
 await page.locator('[data-more]').click();await page.locator('.dc-range-step').first().getByRole('button',{name:'次',exact:true}).click();
 await page.locator('[data-add-music]').click();await page.waitForSelector('[data-screen=U5]');ensure(page.url().includes('from=1&to=2'),'source range not passed');await page.waitForSelector('[data-track]');ensure(await page.locator('[data-track]').count()===1,'routine song picker not filtered');
 await page.locator('[data-track]').click();await page.waitForSelector('[data-screen=U4]');await page.waitForFunction(()=>document.querySelector('[data-play]')?.disabled===false);
 await page.locator('[data-more]').click();ensure(await page.locator('[data-music-routine]').inputValue()===routines[0].id&&await page.locator('[data-music-routine]').isDisabled(),'routine source changed');
 ensure(await page.locator('[data-music-from]').inputValue()==='1'&&await page.locator('[data-music-to]').inputValue()==='2','range selection lost');await page.locator('[data-more]').click();
 await instrument(page);await page.locator('[data-play]').click();await page.waitForSelector('[data-playing=true]');await page.waitForFunction(()=>window.__navigationMusic?.plan.events[0]?.figureIndex===1);
 const routineSchedule=await page.evaluate(()=>window.__navigationMusic.schedule);await page.waitForFunction(()=>document.querySelector('[data-figure-now]')?.textContent.includes('2 / 3'),null,{timeout:15000});await page.locator('[data-play]').click();
 await page.locator('[data-more]').click();await page.getByRole('button',{name:'保存する音声を作る',exact:true}).click();await page.locator('[data-music-save]').waitFor();pending=page.waitForEvent('download');await page.locator('[data-music-save]').click();download=await pending;file=path.resolve('output/music-probe/app-exports','navigation-'+download.suggestedFilename());await download.saveAs(file);evidence.exports.push({file,schedule:routineSchedule});
 await page.reload();await page.waitForSelector('[data-more]');await page.locator('[data-more]').click();ensure(await page.locator('[data-music-from]').inputValue()==='1','reload forgot routine range');await page.locator('[data-back]').click();await page.waitForSelector('[data-screen=U5]');await page.locator('[data-back]').click();await page.waitForSelector('[data-screen=S5]');ensure(page.url().includes(routines[0].id)&&await page.locator('[data-playing=false]').count()===1,'routine return resumed playback or changed routine');
 evidence.checks.push('routine → matching songs → preserved source/range/WAV','routine source and range survive reload; return is stopped');
 // Wrong track, deleted routine and unsupported dance must not silently replace the count.
 await page.goto(new URL('#/use/music/chacha-0a638f3a0662/figure/waltz/chasse-from-pp',base).href);await page.waitForSelector('[data-screen=U5]');await page.waitForSelector('[data-track]');ensure(await page.locator('[data-track]').count()===1,'wrong dance track did not return to matching songs');
 await page.goto(new URL('#/use/music/for/routine/r-missing-12345678',base).href);await page.waitForSelector('[data-screen=U2]');await page.waitForURL('**/#/use/routines');
 await page.goto(new URL(`#/use/music/for/routine/${routines[1].id}`,base).href);await page.waitForSelector('[data-screen=U5]');await page.getByText('この種目の曲を準備しています。',{exact:true}).waitFor();
 const after=await page.evaluate(async()=>(await(await import('/src/app/platform/storage.ts')).openAppStorage()).getAll('routines'));ensure(JSON.stringify(after)===JSON.stringify([...routines].sort((a,b)=>a.id.localeCompare(b.id))),'source routine data changed');
 evidence.checks.push('wrong dance track rejected','missing routine returns to routine list','unavailable dance explained','saved routine data unchanged');
 // Each root, contextual picker and player: short phone, enlarged-text width, desktop, JA/EN.
 for(const locale of ['ja-JP','en']){
  await page.evaluate(async locale=>{const s=await(await import('/src/app/platform/storage.ts')).openAppStorage();await s.put('settings',{uiLocale:locale,hints:{firstPlaybackDone:true}},'app');},locale);await page.reload();
  for(const hash of ['#/use','#/use/routines','#/use/music','#/use/music/for/figure/waltz/chasse-from-pp','#/use/music/waltz-33445d26a14c/figure/waltz/chasse-from-pp']){
   await page.goto(new URL(hash,base).href);await page.waitForSelector('main h1');if(hash.includes('33445'))await page.waitForSelector('[data-figure-now]');else if(hash==='#/use/music')await page.waitForSelector('[data-track]');
   for(const [width,height]of [[375,548],[250,445],[1280,900]]){
    await page.setViewportSize({width,height});await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    const measure=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,small:[...document.querySelectorAll('[data-nav] a,[data-back],[data-track]')].filter(e=>{const r=e.getBoundingClientRect();return r.width<48||r.height<48;}).length}));ensure(!measure.overflow&&!measure.small,`layout ${locale}/${hash}/${width}: ${JSON.stringify(measure)}`);evidence.layouts.push({locale,hash,width,...measure});
    if(width===375){const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();ensure(!axe.violations.length,axe.violations.map(v=>v.id).join(','));await page.screenshot({path:`output/music-probe/navigation-${locale}-${hash.replace(/[^a-z0-9]+/gi,'-')}.png`,fullPage:false});}
   }
   ensure(!await page.locator('canvas,input[type=file],a[href*="__music/review"]').count(),'creator UI exposed');
  }
 }
 ensure(!evidence.errors.length,evidence.errors.join('\n'));await fs.writeFile('output/music-probe/navigation-browser-evidence.json',JSON.stringify(evidence,null,2)+'\n');console.log('music navigation OK: 3 tabs, figure/routine context, 2 actual WAVs, reload/back/validation, 30 layout cases, 10 WCAG pages');
}catch(error){await fs.writeFile('output/music-probe/navigation-failure.json',JSON.stringify({error:String(error),...evidence},null,2)+'\n');throw error;}finally{await browser.close();}
