#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium}from'playwright-core';
import {compileMusicPlan,musicJobs}from'../src/engine/music-plan.js';
const base=process.env.DC_BASE_URL??'http://127.0.0.1:5195/';
const browser=await chromium.launch({channel:'chrome'}),checks=[];
function ensure(value,message){if(!value)throw Error(message);}
try{
 const context=await browser.newContext({viewport:{width:375,height:667},locale:'ja-JP',acceptDownloads:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base);const tracks=await page.evaluate(async()=>await(await fetch('/__music/catalog')).json());
 const samples=tracks.filter(track=>track.id!=='paper-umbrella');
 ensure(samples.length===6,'expected six provided samples');
 ensure(samples.filter(track=>track.danceId==='waltz').length===1,'waltz sample missing');
 ensure(samples.filter(track=>track.danceId==='tango').length===1,'tango sample missing');
 const tango=samples.find(track=>track.danceId==='tango');
 ensure(tango.counts==='SSQQS'&&tango.anchorTick===0&&tango.sections.length>=2,'tango count or safe preview sections missing');
 const expectedFirst=tango.counts[0];
 const evidence=JSON.parse(await fs.readFile('output/music-probe/app-browser-evidence.json','utf8'));
 for(const track of samples){
  await page.goto(new URL(`#/use/music/${track.id}`,base).href);
  const play=page.locator('[data-play]');await play.waitFor();await page.waitForFunction(()=>!document.querySelector('[data-play]')?.disabled);
  if(track.danceId==='waltz')ensure((await page.locator('.dc-now').textContent())==='1','waltz idle count is not one');
  await page.getByText('練習の設定',{exact:true}).click();
  await page.getByRole('combobox',{name:'曲とカウント、どちらから始めますか？',exact:true}).selectOption('together');
  await play.click();await page.waitForSelector('[data-screen=U4][data-playing=true]');
  const words=new Set();for(let i=0;i<100;i++){words.add(await page.locator('.dc-now').textContent());await page.waitForTimeout(50);}
  ensure(words.size>=3,`count did not advance for ${track.id}`);
  if(track.danceId==='chacha')ensure(words.has('&'),`cha-cha half beat not seen for ${track.id}`);
  await play.click();
  const plan=compileMusicPlan(track,track.sections[0].id,1);
  ensure(plan.events[0].token===(track.danceId==='tango'?expectedFirst:'1'),'first count differs from the dance phase at the inferred downbeat');
  await page.getByRole('button',{name:'保存する音声を作る',exact:true}).click();await page.locator('[data-music-save]').waitFor();
  const event=page.waitForEvent('download');await page.locator('[data-music-save]').click();const download=await event;
  const file=path.resolve('output/music-probe/app-exports',download.suggestedFilename());await download.saveAs(file);
  evidence.exports.push({trackId:track.id,section:track.sections[0].id,rate:1,file,schedule:musicJobs(plan,1,{startMode:'together',countEnabled:true})});
  for(const [width,height]of[[375,548],[250,445]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>window.scrollTo(0,0));
    ensure(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${track.id}/${width}`);
  }
  await page.setViewportSize({width:375,height:667});
  checks.push({id:track.id,title:track.title,danceId:track.danceId,meter:track.beatsPerBar,sections:track.sections,words:[...words],file});
 }
 // The waveform page can change between 3/4 and 4/4 without reusing an old plan.
 await page.goto(new URL('/__music/review',base).href);await page.getByRole('button',{name:'音楽とカウントを聞く',exact:true}).waitFor();
 for(const track of samples){
  await page.locator('#track').selectOption(track.id);await page.waitForFunction(id=>waveformReview.track?.id===id,track.id);
  const result=await page.evaluate(()=>({meter:waveformReview.plan.profile.beatsPerBar,first:waveformReview.plan.events[0].token}));
  ensure(result.meter===track.beatsPerBar&&result.first===(track.danceId==='tango'?expectedFirst:'1'),'waveform page reused the wrong meter or count phase');
 }
 const waltz=samples.find(track=>track.danceId==='waltz');await page.locator('#track').selectOption(waltz.id);await page.waitForFunction(id=>waveformReview.track?.id===id,waltz.id);
 await page.getByRole('button',{name:'音楽とカウントを聞く',exact:true}).click();await page.waitForFunction(()=>waveformReview.playing);await page.waitForTimeout(5500);
 ensure(await page.evaluate(()=>waveformReview.zoom>=1),'three-beat waveform did not follow two bars');
 await page.getByRole('button',{name:'止める',exact:true}).click();
 ensure(errors.length===0,errors.join('\n'));
 await fs.writeFile('output/music-probe/app-browser-evidence.json',JSON.stringify(evidence,null,2)+'\n');
 await fs.writeFile('output/music-probe/library-browser-evidence.json',JSON.stringify({checks,errors,waltzWaveFollow:true},null,2)+'\n');
 console.log('music library OK: 6 samples played and exported, 3/4 and 4/4 plans, tango downbeat, cha-cha half beats, small-screen layout, waveform switching');
}finally{await browser.close();}
