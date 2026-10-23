#!/usr/bin/env node
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { AxeBuilder } from '@axe-core/playwright';
const base=process.env.DC_BASE_URL??'http://127.0.0.1:5195/';
const browser=await chromium.launch({channel:'chrome',ignoreDefaultArgs:['--hide-scrollbars']});
const checks=[];
function ensure(value,message){if(!value)throw Error(message);}
try{
  const context=await browser.newContext({viewport:{width:375,height:667},locale:'ja-JP'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(new URL('/__music/review',base).href);await page.waitForFunction(()=>waveformReview.track!==null&&waveformReview.plan!==null);await page.getByRole('button',{name:'音楽とカウントを聞く',exact:true}).waitFor();
  const initial=await page.evaluate(()=>({revision:waveformReview.track.revision,sections:waveformReview.track.sections,summary:waveformReview.analysis.summary}));
  ensure(initial.revision.includes('-bars-v2-'),'old beat grid is still loaded');
  for(const [index,section] of initial.sections.entries()){
    await page.locator('#section').selectOption(section.id);
    const info=await page.evaluate(()=>{
      const {plan,analysis}=waveformReview;
      return{first:plan.events[0],start:plan.tempo.tickToMs(plan.startTick),isDownbeat:analysis.downbeatsMs.includes(plan.tempo.tickToMs(plan.startTick))};
    });
    ensure(info.isDownbeat&&info.first.token==='1','section did not start on the model downbeat');
    await page.getByRole('button',{name:'音楽とカウントを聞く',exact:true}).click();
    await page.waitForFunction(()=>waveformReview.playing);
    await page.waitForTimeout(index===0?9000:3500);
    ensure(await page.evaluate(()=>waveformReview.playing),'review playback ended prematurely');
    if(index===0)ensure(await page.evaluate(()=>waveformReview.zoom===1),'waveform did not follow into the next two bars');
    await page.getByRole('button',{name:'止める',exact:true}).click();
    ensure(!await page.evaluate(()=>waveformReview.playing),'stop failed');
    checks.push({section:section.id,...info});
  }
  await page.locator('summary').click();
  await page.locator('#rate').selectOption('0.8');
  ensure(await page.evaluate(()=>waveformReview.plan.transport.rate===.8),'speed did not use the shared plan');
  await page.locator('#only').check();
  await page.locator('#section').selectOption('early');
  await page.getByRole('button',{name:'音楽とカウントを聞く',exact:true}).click();
  await page.waitForFunction(()=>waveformReview.playing);
  ensure(await page.evaluate(()=>waveformReview.engine.schedule.jobs.every(job=>job.kind!=='voice')),'music-only mode still schedules voices');
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
  ensure(!await page.evaluate(()=>waveformReview.playing),'pagehide did not stop review playback');
  await page.locator('#only').uncheck();await page.locator('#rate').selectOption('1');
  await page.locator('#section').selectOption('middle');
  await page.route('**/__music/audio/**',async route=>{await new Promise(resolve=>setTimeout(resolve,1000));await route.continue();});
  await page.getByRole('button',{name:'音楽とカウントを聞く',exact:true}).click();
  await page.waitForFunction(()=>waveformReview.preparing);
  await page.getByRole('button',{name:'準備をやめる',exact:true}).click();
  await page.waitForTimeout(1500);
  ensure(!await page.evaluate(()=>waveformReview.playing||waveformReview.preparing),'cancelled preparation returned late');
  await page.unroute('**/__music/audio/**');
  for(const [width,height]of[[375,667],[250,445],[1280,900]]){
    await page.setViewportSize({width,height});
    ensure(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
    await page.screenshot({path:`output/music-probe/waveform-review-${width}.png`,fullPage:true});
  }
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();
  ensure(axe.violations.length===0,axe.violations.map(item=>item.id).join(','));
  ensure(errors.length===0,errors.join('\n'));
  await fs.writeFile('output/music-probe/waveform-review-evidence.json',JSON.stringify({initial,checks,errors,lifecycle:['wave follows playback','stop','slower speed','music-only','pagehide stop','cancelled pending load'],accessibility:'WCAG2A/AA',widths:[375,250,1280]},null,2)+'\n');
  console.log('waveform review OK: 3 downbeat-aligned sections, 6 lifecycle checks, 3 widths, WCAG2A/AA');
}finally{await browser.close();}
