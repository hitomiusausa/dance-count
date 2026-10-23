// Loopback-only creator samples. Source music, models and reports never enter dist.
import { createHash } from 'node:crypto';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Plugin } from 'vite';
import type { MusicTrack } from '../src/app/music/model.ts';
import { buildMusicPreviewTrack, type PreviewDefinition } from './music-preview-track.ts';
const run=promisify(execFile);
interface LocalEntry {id:string;title:string;label:string;danceId:string;source:string;stamp:number;analysis:any;track:MusicTrack|null}
export function musicDevPlugin():Plugin{return{name:'local-music-preview',apply:'serve',async configureServer(server){
  if(process.env.VITE_MUSIC_PREVIEW!=='1')return;
  const source=process.env.DC_MUSIC_SOURCE??path.join(homedir(),'Downloads','Paper Umbrella.wav');
  const output=path.join(server.config.root,'output/music-probe');
  const reportPath=path.join(output,'bar-analysis.json'),indexPath=path.join(output,'library-index.json');
  let entries=new Map<string,LocalEntry>(),generation=0;
  async function refresh(){
    const mine=++generation,next=new Map<string,LocalEntry>();
    async function add(id:string,title:string,label:string,danceId:string,file:string,reportFile:string,definition?:PreviewDefinition,expectedHash?:string){
      try{
        if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid id');
        const analysis=JSON.parse(await readFile(reportFile,'utf8'));
        const hash=createHash('sha256').update(await readFile(file)).digest('hex');
        if(hash!==analysis.sourceSha256||(expectedHash&&hash!==expectedHash))throw Error('Source differs from analysis');
        const entry:LocalEntry={id,title,label,danceId,source:file,stamp:(await stat(file)).mtimeMs,analysis,track:null};
        next.set(id,entry);
        try{entry.track=buildMusicPreviewTrack(hash,analysis,definition);}catch{server.config.logger.warn(`Sample ${id} needs bar review before count playback.`);}
      }catch{server.config.logger.warn(`Sample ${id} needs a matching local source and bar analysis.`);}
    }
    await add('paper-umbrella','Paper Umbrella','前の試作曲','rumba',source,reportPath);
    try{
      const index=JSON.parse(await readFile(indexPath,'utf8'));
      if(index.schemaVersion!==1||!Array.isArray(index.tracks)||index.tracks.length>29)throw Error('Invalid library');
      for(const item of index.tracks){
        if(!['waltz','rumba','chacha'].includes(item.danceId)||!/^local-inputs\/[a-f0-9]{64}\.(mp3|wav|flac|ogg)$/.test(item.sourcePath)||!/^library\/[a-f0-9]{16}\/bar-analysis\.json$/.test(item.analysisPath))continue;
        await add(item.id,item.title,item.label,item.danceId,path.join(output,item.sourcePath),path.join(output,item.analysisPath),{id:item.id,title:item.title,danceId:item.danceId},item.sourceSha256);
      }
    }catch{ /* A library is optional until the creator prepares the samples. */ }
    if(mine===generation)entries=next;
  }
  await refresh();
  const watched=new Set([reportPath,indexPath,source]);
  const changed=(file:string)=>{if(watched.has(file))void refresh().then(()=>server.ws.send({type:'full-reload'}));};
  server.watcher.add([...watched]);server.watcher.on('change',changed);server.watcher.on('add',changed);
  server.httpServer?.once('close',()=>{server.watcher.off('change',changed);server.watcher.off('add',changed);});
  const pending=new Map<string,Promise<Buffer>>();
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
      const key=`${current.revision}-${section.id}-${match[3]}`;
      let promise=pending.get(key);
      if(!promise){
        promise=(async()=>{
          const dir=path.join(output,'app-clips'),file=path.join(dir,`${key}.wav`);
          try{return await readFile(file);}catch{}
          const from=current.beatsMs[section.startTick/960]!/1000,end=current.beatsMs[section.endTick/960]!/1000,rate=Number(match[3]),duration=(end-from)/rate;
          const filter=`asetpts=PTS-STARTPTS,atrim=start=${from}:end=${end},asetpts=PTS-STARTPTS,atempo=${rate},apad=whole_dur=${duration},atrim=duration=${duration}`;
          const result=await run('ffmpeg',['-v','error','-i',entry.source,'-af',filter,'-ar','48000','-c:a','pcm_s16le','-f','wav','-'],{encoding:'buffer',maxBuffer:16*1024*1024});
          if((await stat(entry.source)).mtimeMs!==entry.stamp)throw Error('Source changed during rendering');
          await mkdir(dir,{recursive:true});await writeFile(file,result.stdout);return result.stdout;
        })();
        pending.set(key,promise);promise.finally(()=>pending.delete(key)).catch(()=>{});
      }
      const data=await promise;res.setHeader('Content-Type','audio/wav');res.setHeader('Content-Length',data.length);res.end(data);
    }catch{res.statusCode=503;res.end('Music preparation failed');}
  });
}};}
