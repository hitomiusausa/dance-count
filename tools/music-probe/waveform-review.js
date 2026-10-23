import { compileMusicPlan } from '../../src/engine/music-plan.js';
import { MusicAudioEngine } from '../../src/engine/music-audio-engine.js';
import { loadVoicePack } from '../../src/engine/voice-pack-loader.js';
import { loadMusicAsset } from '../../src/app/platform/music.ts';
import { outputLatencySeconds, unlockAudioInsideTap, onAudioStateChange } from '../../src/app/platform/audio-context.ts';
import { onPageHidden } from '../../src/app/platform/page.ts';

const $=id=>document.getElementById(id);
const state={track:null,analysis:null,audio:null,pack:null,engine:null,plan:null,zoom:0,tick:null,playing:false,preparing:false,generation:0,catalog:[],library:[]};
window.waveformReview=state;
const seconds=value=>`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`;
const names={early:'はじめ',middle:'まん中',late:'おわり'};
function canvas(id){const element=$(id),ctx=element.getContext('2d'),scale=devicePixelRatio||1;
  const width=element.clientWidth,height=element.clientHeight;
  if(element.width!==Math.round(width*scale)||element.height!==Math.round(height*scale)){element.width=Math.round(width*scale);element.height=Math.round(height*scale);}
  ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);return{ctx,width,height};}
function wave(ctx,width,height,from,to,top,bottom,left=0){
  const data=state.analysis.waveform,hop=data.hopSeconds,first=Math.max(0,Math.floor(from/hop)),last=Math.min(data.min.length,Math.ceil(to/hop));
  const center=(top+bottom)/2,amplitude=(bottom-top)/2;
  ctx.strokeStyle='#8790a3';ctx.lineWidth=1;ctx.beginPath();
  // Collapse each pixel column to min/max: keep transients at every zoom level.
  for(let pixel=0;pixel<width;pixel++){
    const begin=Math.max(first,Math.floor((from+(to-from)*pixel/width)/hop));
    const end=Math.min(last,Math.max(begin+1,Math.ceil((from+(to-from)*(pixel+1)/width)/hop)));
    let lo=0,hi=0;for(let i=begin;i<end;i++){lo=Math.min(lo,data.min[i]);hi=Math.max(hi,data.max[i]);}
    ctx.moveTo(left+pixel,center-hi*amplitude);ctx.lineTo(left+pixel,center-lo*amplitude);
  }ctx.stroke();
}
function overview(){if(!state.analysis)return;const{ctx,width,height}=canvas('overview'),duration=state.analysis.durationSeconds;
  if(state.plan){const from=state.plan.transport.sourceStartSeconds,to=state.plan.transport.sourceEndSeconds;
    ctx.fillStyle='#eef0f5';ctx.fillRect(from/duration*width,0,(to-from)/duration*width,height-24);}
  for(const bar of state.analysis.bars){if(bar.status==='candidate')continue;
    const a=state.analysis.beatsMs[bar.startBeat]/1000,b=state.analysis.beatsMs[bar.endBeat]/1000;
    ctx.fillStyle='#fbe9e7';ctx.fillRect(a/duration*width,0,Math.max(1,(b-a)/duration*width),height-24);
  }
  const last=state.analysis.beatsMs.at(-1)/1000;ctx.fillStyle='#fbe9e7';ctx.fillRect(last/duration*width,0,(duration-last)/duration*width,height-24);
  wave(ctx,width,height,0,duration,8,height-30);ctx.fillStyle='#14213d';ctx.font='16px system-ui';ctx.fillText('0:00',0,height-4);
  const label=seconds(duration);ctx.fillText(label,width-ctx.measureText(label).width,height-4);
}
function zoom(){if(!state.plan)return;const{ctx,width,height}=canvas('wave'),plan=state.plan;
  const startTick=plan.startTick+state.zoom*2*plan.profile.beatsPerBar*960,endTick=Math.min(plan.endTick,startTick+2*plan.profile.beatsPerBar*960);
  const from=plan.tempo.tickToSeconds(startTick),to=plan.tempo.tickToSeconds(endTick),x=time=>(time-from)/(to-from)*(width-16)+8;
  wave(ctx,width-16,height,from,to,50,height-30,8);ctx.font='16px system-ui';
  for(let tick=startTick;tick<endTick;tick+=960){
    const number=(tick-plan.startTick)/960%plan.profile.beatsPerBar+1;
    const pos=x(plan.tempo.tickToSeconds(tick)),down=number===1;
    ctx.strokeStyle=down?'#1b2a4a':'#c2c8d1';ctx.lineWidth=down?2:1;ctx.beginPath();ctx.moveTo(pos,35);ctx.lineTo(pos,height-27);ctx.stroke();
    ctx.fillStyle='#14213d';ctx.fillText(String(number),pos-4,25);
  }
  ctx.fillStyle='#4a5670';ctx.fillText(seconds(from),8,height-4);const label=seconds(to);ctx.fillText(label,width-8-ctx.measureText(label).width,height-4);
  if(state.tick!==null&&state.tick>=startTick&&state.tick<=endTick){const pos=x(plan.tempo.tickToSeconds(state.tick));ctx.strokeStyle='#a54d06';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(pos,0);ctx.lineTo(pos,height-25);ctx.stroke();}
  $('previous').disabled=state.preparing||state.zoom===0;$('next').disabled=state.preparing||endTick>=plan.endTick;
}
function selection(){if(!state.track)return;state.plan=compileMusicPlan(state.track,$('section').value,Number($('rate').value));state.zoom=0;state.tick=null;
  $('range').textContent=`${seconds(state.plan.transport.sourceStartSeconds)}から${seconds(state.plan.transport.sourceEndSeconds)}まで。6小節の推定区間です。`;
  overview();zoom();}
function stop(){state.generation++;state.engine?.stop();state.playing=false;state.preparing=false;state.tick=null;$('count').textContent='—';$('play').disabled=!state.track;$('play').textContent='音楽とカウントを聞く';zoom();}
function frame(value){if(!value.playing){if(state.playing){state.playing=false;state.preparing=false;$('play').textContent='音楽とカウントを聞く';$('status').textContent='試聴が終わりました。';$('count').textContent='—';}return;}
  state.tick=value.originalTick;$('count').textContent=value.event?.token??'—';
  if(state.tick!==null&&state.tick!==undefined)state.zoom=Math.min(2,Math.max(0,Math.floor((state.tick-state.plan.startTick)/(2*state.plan.profile.beatsPerBar*960))));zoom();}
$('play').onclick=async()=>{
  if(state.playing||state.preparing){stop();$('status').textContent='止めました。';return;}
  stop();const generation=state.generation;state.preparing=true;$('play').textContent='準備をやめる';$('status').textContent='音楽を準備しています…';
  if(!state.audio){state.audio=unlockAudioInsideTap();onAudioStateChange(state.audio,value=>{if(value==='suspended'||value==='interrupted')stop();});}else void state.audio.resume();
  const options={track:state.track,sectionId:$('section').value,rate:Number($('rate').value)};
  try{
    const [asset,pack]=await Promise.all([loadMusicAsset(state.audio,options),state.pack??loadVoicePack(state.audio,new URL('/audio/default-en-female-v1/manifest.json',location.href))]);
    if(generation!==state.generation)return;state.pack=pack;state.engine??=new MusicAudioEngine(state.audio,{voicePack:pack,onFrame:frame,displayLatencySeconds:()=>outputLatencySeconds(state.audio)});
    selection();$('wave').scrollIntoView({block:'center'});state.preparing=false;state.engine.start({compiled:state.plan,musicAsset:asset,repetitions:1,startMode:'together',countEnabled:!$('only').checked});state.playing=true;
    $('play').textContent='止める';$('status').textContent='再生中。太い線が小節のはじめです。';
  }catch(error){if(generation!==state.generation)return;stop();$('status').textContent='曲を準備できませんでした。もう一度お試しください。';console.error(error);}
};
for(const id of ['section','rate','only'])$(id).onchange=()=>{stop();selection();$('status').textContent='設定を変えました。もう一度聞けます。';};
$('previous').onclick=()=>{stop();state.zoom=Math.max(0,state.zoom-1);zoom();};
$('next').onclick=()=>{stop();state.zoom=Math.min(2,state.zoom+1);zoom();};
onPageHidden(()=>{stop();$('status').textContent='画面を離れたため止めました。';});
const observer=new ResizeObserver(()=>{overview();zoom();});observer.observe($('wave'));
let loadGeneration=0;
async function loadTrack(id){
 const generation=++loadGeneration;stop();state.track=null;state.plan=null;state.analysis=null;
 $('play').disabled=true;$('play').textContent='解析を読み込んでいます…';$('section').disabled=true;$('status').textContent='この曲の解析を読み込んでいます…';
 try{
  const response=await fetch(`/__music/analysis?track=${encodeURIComponent(id)}`,{cache:'no-store'});
  if(!response.ok)throw Error('Analysis unavailable');const analysis=await response.json();
  if(generation!==loadGeneration)return;
  const track=state.catalog.find(track=>track.id===id)??null,metadata=state.library.find(item=>item.id===id);
  if(track&&(analysis.sourceSha256.slice(0,16)!==track.revision.slice(0,16)||JSON.stringify(analysis.beatsMs)!==JSON.stringify(track.beatsMs)))throw Error('Analysis and track differ');
  state.analysis=analysis;state.track=track;state.zoom=0;state.tick=null;
  $('track-title').textContent=metadata?.title??id;
  $('practice-link').href=track?`/#/use/music/${track.id}`:'/#/use/music';
  history.replaceState(null,'',`/__music/review?track=${encodeURIComponent(id)}`);
  $('section').replaceChildren(...(track?.sections??[]).map(section=>{const option=document.createElement('option');option.value=section.id;option.textContent=names[section.id];return option;}));
  $('section').disabled=!track;$('play').disabled=!track;$('play').textContent=track?'音楽とカウントを聞く':'練習区間の確認が必要です';
  const meter=analysis.expectedBeatsPerBar??4;
  $('legend').textContent='薄い線は1拍ずつ、太い線の「1」は小節のはじめです。再生中は今の位置に線が動きます。'+(track?.danceId==='chacha'?'チャチャチャの「&」は線と線の間で鳴ります。':'');
  $('summary').textContent=`${meter}拍子として解析。拍の候補${analysis.summary.beatCount}個、小節頭の候補${analysis.summary.downbeatCount}個。安定した候補${analysis.summary.candidateBars}区間、要確認${analysis.summary.uncertainBars}区間。末尾約${Math.ceil(analysis.summary.untrackedTailSeconds)}秒は拍が未確定です。`;
  $('issues').replaceChildren();
  for(const bar of analysis.bars.filter(bar=>bar.status!=='candidate')){const item=document.createElement('div');item.className='issue';
    item.textContent=`${seconds(analysis.beatsMs[bar.startBeat]/1000)}〜${seconds(analysis.beatsMs[bar.endBeat]/1000)}：${bar.issues.includes('meter-mismatch')?`${meter}拍ずつの区切りが不安定です。`:bar.issues.includes('irregular-beat-spacing')?'拍の間隔が不安定です。':'推定の根拠が弱い場所です。'}`;$('issues').append(item);}
  const tail=document.createElement('div');tail.className='issue';tail.textContent=`${seconds(analysis.beatsMs.at(-1)/1000)}〜${seconds(analysis.durationSeconds)}：拍を推定できていないため、カウントを付けていません。`;$('issues').append(tail);
  if(track){selection();$('status').textContent='波形と小節の推定を読み込みました。音と数字の位置を確認できます。';}
  else{overview();$('status').textContent='波形を読み込みました。安定した6小節が選べないため、再生前に拍と小節の確認が必要です。';}
 }catch(error){if(generation!==loadGeneration)return;$('status').textContent='解析を読み込めませんでした。解析プログラムの結果を確認してください。';console.error(error);}
}
$('track').onchange=()=>void loadTrack($('track').value);
try{
 const responses=await Promise.all([fetch('/__music/library',{cache:'no-store'}),fetch('/__music/catalog',{cache:'no-store'})]);
 if(responses.some(response=>!response.ok))throw Error('Library unavailable');
 [state.library,state.catalog]=await Promise.all(responses.map(response=>response.json()));
 $('track').replaceChildren(...state.library.map(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=item.label;return option;}));
 $('track').disabled=!state.library.length;
 const requested=new URLSearchParams(location.search).get('track');
 const first=state.library.find(item=>item.id===requested)?.id??state.library.find(item=>item.id==='paper-umbrella')?.id??state.library[0]?.id;
 if(!first)throw Error('No samples');$('track').value=first;await loadTrack(first);
}catch(error){$('status').textContent='曲と解析の一覧を読み込めませんでした。';console.error(error);}
