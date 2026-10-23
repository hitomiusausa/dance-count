// Development-only provider. No source audio, beat map or private filename is
// imported by the client or copied into public/dist.
import { createHash } from 'node:crypto';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Plugin } from 'vite';
import type { MusicTrack } from '../src/app/music/model.ts';

const run = promisify(execFile);
export function musicDevPlugin(): Plugin {
  return {
    name: 'local-music-preview', apply: 'serve',
    async configureServer(server) {
      if (process.env.VITE_MUSIC_PREVIEW !== '1') return;
      const source = process.env.DC_MUSIC_SOURCE ?? path.join(homedir(),'Downloads','Paper Umbrella.wav');
      const reportPath = path.join(server.config.root,'output/music-probe/analysis.json');
      let track: MusicTrack | null = null;
      let sourceStamp = 0;
      try {
        const report = JSON.parse(await readFile(reportPath,'utf8'));
        const hash = createHash('sha256').update(await readFile(source)).digest('hex');
        if (hash !== report.sourceSha256) throw new Error('Source hash differs from analysis');
        sourceStamp = (await stat(source)).mtimeMs;
        const beats: number[] = report.trackedBeatsSeconds;
        const sections = [20,140,280].map((seconds,i) => {
          const nearest = beats.findIndex(t=>t>=seconds);
          if(nearest<0) throw new Error('Missing preview range');
          const firstBeat = Math.ceil(nearest/4)*4;
          const lastBeat = firstBeat+48;
          if(lastBeat>=beats.length) throw new Error('Preview exceeds tracked coverage');
          return { id:['early','middle','late'][i]!,startTick:firstBeat*960,endTick:lastBeat*960 };
        });
        track = { id:'paper-umbrella',revision:`${hash.slice(0,16)}-atempo-v2`,title:'Paper Umbrella',danceId:'rumba',
          beatsPerBar:4,counts:'2341',anchorTick:960,beatsMs:beats.map(t=>t*1000),
          rates:[.8,1,1.1],sections,preview:true };
      } catch {
        server.config.logger.warn('Music preview needs a matching local source and analysis.json. Catalog is empty.');
      }
      const pending = new Map<string,Promise<Buffer>>();
      server.middlewares.use(async (req,res,next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if(!url.pathname.startsWith('/__music/')) return next();
        const remote = req.socket.remoteAddress ?? '';
        if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote)) {res.statusCode=403;res.end();return;}
        res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
        if(req.method!=='GET') {res.statusCode=405;res.end();return;}
        if(url.pathname==='/__music/catalog') {
          res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(track?[track]:[])); return;
        }
        const match = /^\/__music\/audio\/([a-z-]+)\/([a-z]+)\/(0\.8|1|1\.1)$/.exec(url.pathname);
        const section = track?.sections.find(s=>s.id===match?.[2]);
        if(!track||!match||match[1]!==track.id||!section) {res.statusCode=404;res.end();return;}
        try {
          if((await stat(source)).mtimeMs!==sourceStamp) throw new Error('Source changed; restart with fresh analysis');
          const key=`${track.revision}-${section.id}-${match[3]}`;
          let promise = pending.get(key);
          if(!promise) {
            const current=track;
            promise=(async()=>{
              const dir=path.join(server.config.root,'output/music-probe/app-clips');
              const file=path.join(dir,`${key}.wav`);
              try {return await readFile(file);} catch { /* first render */ }
              const from=current.beatsMs[section.startTick/960]!/1000;
              const end=current.beatsMs[section.endTick/960]!/1000;
              const rate=Number(match[3]);
              // Trim in source time BEFORE stretching. Output-side -ss/-t would
              // cut against the transformed timestamps and select the wrong music.
              const duration=(end-from)/rate;
              const filter=`atrim=start=${from}:end=${end},asetpts=PTS-STARTPTS,atempo=${rate},apad=whole_dur=${duration},atrim=duration=${duration}`;
              const result=await run('ffmpeg',['-v','error','-i',source,'-af',filter,
                '-ar','48000','-c:a','pcm_s16le','-f','wav','-'],{encoding:'buffer',maxBuffer:16*1024*1024});
              await mkdir(dir,{recursive:true}); await writeFile(file,result.stdout); return result.stdout;
            })();
            pending.set(key,promise); promise.finally(()=>pending.delete(key)).catch(()=>{});
          }
          const data=await promise;
          res.setHeader('Content-Type','audio/wav');res.setHeader('Content-Length',data.length);res.end(data);
        } catch {res.statusCode=503;res.end('Music preparation failed');}
      });
    }
  };
}
