#!/usr/bin/env node
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { AxeBuilder } from '@axe-core/playwright';
const BASE=process.env.DC_BASE_URL??'http://127.0.0.1:5195/';
const browser=await chromium.launch({channel:'chrome',ignoreDefaultArgs:['--hide-scrollbars']});
const results=[];
let latestPage;
try{
  for(const locale of ['ja-JP','en'])for(const [width,height] of [[375,667],[375,548],[320,568],[250,445],[1280,900]]){
    console.log(`music UI: ${locale} ${width}x${height}`);
    const context=await browser.newContext({viewport:{width,height},locale});const page=await context.newPage();latestPage=page;
    await page.goto(BASE);await page.waitForSelector('[data-screen=S0]');
    await page.evaluate(locale=>new Promise((resolve,reject)=>{
      const request=indexedDB.open('dance-count-v2');request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{const db=request.result;const tx=db.transaction('settings','readwrite');
        tx.objectStore('settings').put({uiLocale:locale,lastDanceId:'rumba',hints:{firstPlaybackDone:true}},'app');
        tx.oncomplete=()=>{db.close();resolve(true);};tx.onerror=()=>reject(tx.error);};
    }),locale);
    await page.reload();await page.goto(`${BASE}#/use`);await page.waitForSelector('[data-music-entry]');await page.evaluate(()=>document.fonts.ready);
    const home=await page.evaluate(()=>{
      const entry=document.querySelector('[data-music-entry]').getBoundingClientRect();
      const tabs=document.querySelector('.dc-tabs').getBoundingClientRect();
      return{entry:{top:entry.top,bottom:entry.bottom,height:entry.height},tabsTop:tabs.top};
    });
    if(width===375&&height===548&&home.entry.bottom>home.tabsTop-8)throw Error(`entry hidden: ${locale} ${JSON.stringify(home)}`);
    await page.locator('[data-music-entry]').click();await page.locator('[data-track]').first().click();
    await page.waitForSelector('[data-screen=U4] [role=radio]');
    for(const rateIndex of [0,1,2]){
      await page.getByRole('radio').nth(rateIndex).click();await page.evaluate(()=>document.fonts.ready);
      const measure=async()=>page.evaluate(()=>{
        const visible=el=>{
          const closed=el.closest('details:not([open])');
          if(closed&&!el.closest('summary'))return false;
          const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';
        };
        const targets=[...document.querySelectorAll('main button,main a,main select,main input,main summary')].filter(visible);
        const small=targets.filter(el=>{const r=el.getBoundingClientRect();return r.width<47.9||r.height<47.9;}).map(el=>({text:el.textContent?.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
        const fonts=[...document.querySelectorAll('main *')].filter(el=>visible(el)&&[...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())).filter(el=>parseFloat(getComputedStyle(el).fontSize)<16).map(el=>el.tagName);
        const more=document.querySelector('[data-more]').getBoundingClientRect(),dock=document.querySelector('.dc-dock').getBoundingClientRect();
        const all=[...document.querySelectorAll('main button,main a,main select,main input,main summary')].filter(visible).filter(el=>!el.matches('[data-back]'));
        const groups=new Set(all.map(el=>el.closest('[data-group]')??el));
        return{small,fonts,overflow:document.documentElement.scrollWidth>innerWidth,moreBottom:more.bottom,dockTop:dock.top,operations:groups.size};
      });
      const closed=await measure();
      if(closed.small.length||closed.fonts.length||closed.overflow||closed.operations>5)throw Error(`closed ${locale}/${width}/${rateIndex}: ${JSON.stringify(closed)}`);
      if(width===375&&height===548&&closed.moreBottom>closed.dockTop-8)throw Error(`details hidden ${locale}/${rateIndex}: ${JSON.stringify(closed)}`);
      await page.locator('[data-more]').click();const open=await measure();
      if(open.small.length||open.fonts.length||open.overflow||open.operations>9)throw Error(`open ${locale}/${width}/${rateIndex}: ${JSON.stringify(open)}`);
      if(rateIndex===1){
        const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();
        if(axe.violations.length)throw Error(`accessibility ${locale}/${width}: ${axe.violations.map(v=>v.id).join(',')}`);
        await page.screenshot({path:`output/music-probe/music-ui-${locale}-${width}x${height}.png`,fullPage:true});
      }
      await page.locator('[data-more]').click();results.push({locale,width,height,rateIndex,home,closed,open});
    }
    await context.close();
  }
  await fs.writeFile('output/music-probe/music-ui-evidence.json',JSON.stringify(results,null,2)+'\n');
  console.log(`music UI OK: ${results.length} locale/size/speed cases, closed and open, WCAG checks on 10 pages`);
}catch(error){
  if(latestPage&&!latestPage.isClosed()){
    await latestPage.screenshot({path:'output/music-probe/music-ui-failure.png',fullPage:true});
    console.error((await latestPage.locator('body').innerText()).slice(0,1200));
  }
  throw error;
}finally{await browser.close();}
