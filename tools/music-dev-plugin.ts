// Loopback-only creator samples. Source music, models and reports never enter dist.
// 曲の読み方と切り出し方は tools/music-library.ts（公開の一式 music-pack.ts と同じ正本）。
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import type { Plugin } from 'vite';
import { CLIP_VERSION, assertRubberband, calibrateClipShifts, libraryPaths, readMusicLibrary, renderClip, sourceSampleRate, type ClipCalibration, type LocalEntry } from './music-library.ts';
export function musicDevPlugin():Plugin{return{name:'local-music-preview',apply:'serve',async configureServer(server){
  if(process.env.VITE_MUSIC_PREVIEW!=='1')return;
  const source=process.env.DC_MUSIC_SOURCE??path.join(homedir(),'Downloads','Paper Umbrella.wav');
  const paths=libraryPaths(server.config.root),{output,reportPath,indexPath}=paths;
  let entries=new Map<string,LocalEntry>(),generation=0;
  async function refresh(){
    const mine=++generation;
    const next=await readMusicLibrary(paths,{trialSource:source,warn:message=>server.config.logger.warn(message)});
    if(mine===generation)entries=next;
  }
  await refresh();
  const watched=new Set([reportPath,indexPath,source]);
  const changed=(file:string)=>{if(watched.has(file))void refresh().then(()=>server.ws.send({type:'full-reload'}));};
  server.watcher.add([...watched]);server.watcher.on('change',changed);server.watcher.on('add',changed);
  server.httpServer?.once('close',()=>{server.watcher.off('change',changed);server.watcher.off('add',changed);});
  const pending=new Map<string,Promise<Buffer>>();
  // 切り出しの時刻の打ち消しは、曲のサンプリング周波数ごとに 1 回測る（公開の一式 music-pack.ts と同じ）
  const calibrations=new Map<string,Promise<ClipCalibration>>();
  const calibrate=(sampleRate:number,rates:number[])=>{const key=`${sampleRate}/${rates.join(',')}`;let found=calibrations.get(key);
    if(!found){found=assertRubberband().then(()=>calibrateClipShifts(sampleRate,rates));calibrations.set(key,found);found.catch(error=>{calibrations.delete(key);server.config.logger.error(String(error));});}return found;};
  server.middlewares.use(async(req,res,next)=>{
    const url=new URL(req.url??'/','http://localhost');if(!url.pathname.startsWith('/__music/'))return next();
    if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??'')){res.statusCode=403;res.end();return;}
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    if(req.method!=='GET'){res.statusCode=405;res.end();return;}
    if(url.pathname==='/__music/catalog'){
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify([...entries.values()].flatMap(entry=>entry.track?[entry.track]:[])));return;
    }
    if(url.pathname==='/__music/library'){
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify([...entries.values()].map(entry=>({id:entry.id,title:entry.title,label:entry.label,danceId:entry.danceId,playable:!!entry.track,summary:entry.analysis.summary}))));return;
    }
    if(url.pathname==='/__music/analysis'){
      const entry=entries.get(url.searchParams.get('track')??'paper-umbrella');
      if(!entry){res.statusCode=404;res.end();return;}
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify(entry.analysis));return;
    }
    if(url.pathname==='/__music/review'){
      res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await readFile(path.join(server.config.root,'tools/music-probe/waveform-review.html'),'utf8'));return;
    }
    const match=/^\/__music\/audio\/([a-z0-9-]+)\/([a-z]+)\/(0\.8|1|1\.1)$/.exec(url.pathname);
    const entry=match?entries.get(match[1]!):null,current=entry?.track;
    const section=current?.sections.find(item=>item.id===match?.[2]);
    if(!entry||!current||!section||!match){res.statusCode=404;res.end();return;}
    try{
      if((await stat(entry.source)).mtimeMs!==entry.stamp)throw Error('Source changed');
      const key=`${current.revision}-${CLIP_VERSION}-${section.id}-${match[3]}`;   // 作り方の版を入れる＝作り方を直したら古い app-clips は使わない
      let promise=pending.get(key);
      if(!promise){
        promise=(async()=>{
          const dir=path.join(output,'app-clips'),file=path.join(dir,`${key}.wav`);
          try{return await readFile(file);}catch{}
          const rate=Number(match[3]),{shifts}=await calibrate(await sourceSampleRate(entry.source),current.rates);
          const clip=await renderClip(entry.source,current,section.id,rate,'pcm',shifts.get(rate)!);
          if((await stat(entry.source)).mtimeMs!==entry.stamp)throw Error('Source changed during rendering');
          await mkdir(dir,{recursive:true});await writeFile(file,clip);return clip;
        })();
        pending.set(key,promise);promise.finally(()=>pending.delete(key)).catch(()=>{});
      }
      const data=await promise;res.setHeader('Content-Type','audio/wav');res.setHeader('Content-Length',data.length);res.end(data);
    }catch{res.statusCode=503;res.end('Music preparation failed');}
  });
}};}
