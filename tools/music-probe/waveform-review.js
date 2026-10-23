import { compileMusicProgram, MusicRoutineError } from '../../src/engine/music-plan.js';
import { MusicAudioEngine } from '../../src/engine/music-audio-engine.js';
import { loadVoicePack } from '../../src/engine/voice-pack-loader.js';
import { loadMusicAsset } from '../../src/app/platform/music.ts';
import { outputLatencySeconds, unlockAudioInsideTap, onAudioStateChange } from '../../src/app/platform/audio-context.ts';
import { onPageHidden } from '../../src/app/platform/page.ts';

import { MUSIC_ROUTINE_SAMPLES } from './routine-samples.ts';
import { openAppStorage } from '../../src/app/platform/storage.ts';
import { loadRoutines } from '../../src/app/routines/store.ts';
import { routinePlayability } from '../../src/app/routines/routine.ts';
import { renderMusicFile } from '../../src/app/platform/music-export.ts';
import { DEFAULT_VOICE } from '../../src/app/voices/selection.ts';

const $=id=>document.getElementById(id);
const state={track:null,analysis:null,audio:null,pack:null,engine:null,plan:null,zoom:0,tick:null,playing:false,preparing:false,generation:0,catalog:[],library:[],routineChoices:[],programId:new URLSearchParams(location.search).get('program')??'basic',exporting:false,exportAbort:null,fileUrl:null};
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
  wave(ctx,width-16,height,from,to,50,height-(plan.figures?55:30),8);ctx.font='16px system-ui';
  for(let tick=startTick;tick<endTick;tick+=960){
    const number=(tick-plan.startTick)/960%plan.profile.beatsPerBar+1;
    const pos=x(plan.tempo.tickToSeconds(tick)),down=number===1;
    ctx.strokeStyle=down?'#1b2a4a':'#c2c8d1';ctx.lineWidth=down?2:1;ctx.beginPath();ctx.moveTo(pos,35);ctx.lineTo(pos,height-27);ctx.stroke();
    ctx.fillStyle='#14213d';ctx.fillText(String(number),pos-4,25);
  }
  if(plan.figures)for(const figure of plan.figures){
    if(figure.figureIndex<plan.routineRange.startIndex||figure.figureIndex>plan.routineRange.endIndex||figure.startTick<startTick||figure.startTick>=endTick)continue;
    const pos=x(plan.tempo.tickToSeconds(figure.startTick));ctx.setLineDash([4,4]);ctx.strokeStyle='#4a5670';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pos,45);ctx.lineTo(pos,height-42);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#14213d';ctx.fillText(`${figure.figureIndex+1}番`,pos+3,height-23);
  }
  ctx.fillStyle='#4a5670';ctx.fillText(seconds(from),8,height-4);const label=seconds(to);ctx.fillText(label,width-8-ctx.measureText(label).width,height-4);
  if(state.tick!==null&&state.tick>=startTick&&state.tick<=endTick){const pos=x(plan.tempo.tickToSeconds(state.tick));ctx.strokeStyle='#a54d06';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(pos,0);ctx.lineTo(pos,height-25);ctx.stroke();}
  $('previous').disabled=state.preparing||state.zoom===0;$('next').disabled=state.preparing||endTick>=plan.endTick;
}
function currentRoutine(){return state.routineChoices.find(item=>item.selectionId===$('program').value)??null;}
function options(){
  const chosen=currentRoutine();
  return {kind:'music',danceId:state.track.danceId,track:state.track,sectionId:$('section').value,rate:Number($('rate').value),
    repetitions:1,startMode:$('start-order').value,delayBeats:state.track.beatsPerBar*2,countEnabled:!$('only').checked,
    musicVolume:.32,voiceVolume:1,voice:DEFAULT_VOICE,voiceOffsetMs:0,metronome:false,countInBars:0,loop:false,bpm:80,
    ...(chosen?{routine:{id:chosen.id,name:chosen.name,danceId:chosen.danceId,figures:chosen.figures,
      range:{startIndex:Number($('routine-from').value),endIndex:Number($('routine-to').value)}}}:{})};
}
function updateQuery(){const query=new URLSearchParams({track:$('track').value});if($('program').value!=='basic')query.set('program',$('program').value);history.replaceState(null,'',`/__music/review?${query}`);}
function populateRange(){
 const routine=currentRoutine();$('routine-range').hidden=!routine;
 for(const id of ['routine-from','routine-to'])$(id).replaceChildren(...(routine?.figures??[]).map((figure,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=`${index+1}番`;return option;}));
 $('routine-from').value='0';$('routine-to').value=String((routine?.figures.length??1)-1);
 $('routine-figures').replaceChildren(...(routine?.figures??[]).map((figure,index)=>{const li=document.createElement('li');li.dataset.figure=String(index);li.textContent=`${figure.name} · ${figure.counts}`;return li;}));
 $('routine-note').textContent=routine?.note??'';
}
function populatePrograms(){
 const choices=state.routineChoices.filter(item=>item.danceId===state.track?.danceId);
 const basic=document.createElement('option');basic.value='basic';basic.textContent='基本のカウント';
 $('program').replaceChildren(basic,...choices.map(item=>{const option=document.createElement('option');option.value=item.selectionId;option.textContent=item.name;option.disabled=routinePlayability(item)!=='ok';return option;}));
 $('program').value=choices.some(item=>item.selectionId===state.programId)?state.programId:'basic';state.programId=$('program').value;populateRange();updateQuery();
}
function selection(){if(!state.track)return false;
 try{
  state.plan=compileMusicProgram(options());state.zoom=0;state.tick=null;
  const routine=currentRoutine();$('routine-info').textContent=routine?`${routine.name} · ${Number($('routine-from').value)+1}〜${Number($('routine-to').value)+1}番を試聴`:'';
  $('routine-note').textContent=routine?.note??'';$('play').disabled=false;$('make-file').disabled=state.exporting;
  $('range').textContent=`${seconds(state.plan.transport.sourceStartSeconds)}から${seconds(state.plan.transport.sourceEndSeconds)}まで。6小節の推定区間です。`;
  overview();zoom();return true;
 }catch(error){
  state.plan=null;$('play').disabled=true;$('make-file').disabled=true;
  const message=error instanceof MusicRoutineError&&error.reason==='coverage'?'このルーティンは6小節の区間に入りません。最初と最後のフィガーを選んで短くしてください。':'このルーティンのカウントを確認してください。';
  $('status').textContent=message;$('routine-note').textContent=message;$('routine-info').textContent='';overview();const{ctx,width,height}=canvas('wave');ctx.clearRect(0,0,width,height);return false;
 }
}
function invalidateFile(){state.exportAbort?.abort();state.exportAbort=null;state.exporting=false;if(state.fileUrl)URL.revokeObjectURL(state.fileUrl);state.fileUrl=null;$('save-file').hidden=true;$('save-file').removeAttribute('href');$('file-status').textContent='';$('play').disabled=!state.plan;$('make-file').disabled=!state.plan;}
function settingsChanged(){stop();invalidateFile();if(selection())$('status').textContent='設定を変えました。もう一度聞けます。';}
function stop(){state.generation++;state.engine?.stop();state.playing=false;state.preparing=false;state.tick=null;$('count').textContent='—';$('figure-now').textContent='';for(const li of $('routine-figures').children)li.removeAttribute('aria-current');$('play').disabled=!state.plan||state.exporting;$('play').textContent='音楽とカウントを聞く';zoom();}
function frame(value){if(!value.playing){if(state.playing){state.playing=false;state.preparing=false;$('play').textContent='音楽とカウントを聞く';$('status').textContent='試聴が終わりました。';$('count').textContent='—';$('figure-now').textContent='';for(const li of $('routine-figures').children)li.removeAttribute('aria-current');}return;}
  state.tick=value.originalTick;$('count').textContent=value.countIn?'準備':value.event?.voiceKey?value.event.token:'—';
  const index=value.event?.figureIndex,routine=currentRoutine();
  const complete=state.plan.routineEndTick!==undefined&&state.tick!==null&&state.tick>=state.plan.routineEndTick;
  const figureText=Number.isInteger(index)?`${index+1}/${routine.figures.length} ${routine.figures[index].name}`:complete?'ルーティンが終わりました':routine?'準備':'';
  if($('figure-now').textContent!==figureText){$('figure-now').textContent=figureText;for(const li of $('routine-figures').children){if(li.dataset.figure===String(index))li.setAttribute('aria-current','true');else li.removeAttribute('aria-current');}}

  if(state.tick!==null&&state.tick!==undefined)state.zoom=Math.min(2,Math.max(0,Math.floor((state.tick-state.plan.startTick)/(2*state.plan.profile.beatsPerBar*960))));zoom();}
$('play').onclick=async()=>{
  if(state.playing||state.preparing){stop();$('status').textContent='止めました。';return;}
  if(state.exporting||!selection())return;
  stop();const generation=state.generation;state.preparing=true;$('play').textContent='準備をやめる';$('status').textContent='音楽を準備しています…';
  if(!state.audio){state.audio=unlockAudioInsideTap();onAudioStateChange(state.audio,value=>{if(value==='suspended'||value==='interrupted')stop();});}else void state.audio.resume();
  const chosenOptions=options();
  try{
    const [asset,pack]=await Promise.all([loadMusicAsset(state.audio,chosenOptions),state.pack??loadVoicePack(state.audio,new URL('/audio/default-en-female-v1/manifest.json',location.href))]);
    if(generation!==state.generation)return;state.pack=pack;state.engine??=new MusicAudioEngine(state.audio,{voicePack:pack,onFrame:frame,displayLatencySeconds:()=>outputLatencySeconds(state.audio)});
    if(!selection())return;$('wave').scrollIntoView({block:'center'});state.preparing=false;state.engine.start({...chosenOptions,compiled:state.plan,musicAsset:asset});state.playing=true;
    $('play').textContent='止める';$('status').textContent='再生中。太い線が小節のはじめです。';
  }catch(error){if(generation!==state.generation)return;stop();$('status').textContent='曲を準備できませんでした。もう一度お試しください。';console.error(error);}
};
for(const id of ['section','rate','only','start-order'])$(id).onchange=settingsChanged;
$('program').onchange=()=>{state.programId=$('program').value;populateRange();settingsChanged();updateQuery();};
$('routine-from').onchange=()=>{if(Number($('routine-to').value)<Number($('routine-from').value))$('routine-to').value=$('routine-from').value;settingsChanged();};
$('routine-to').onchange=()=>{if(Number($('routine-from').value)>Number($('routine-to').value))$('routine-from').value=$('routine-to').value;settingsChanged();};
$('make-file').onclick=async()=>{
 if(!selection())return;stop();invalidateFile();const abort=new AbortController();state.exportAbort=abort;state.exporting=true;$('make-file').disabled=true;$('play').disabled=true;$('file-status').textContent='音声を作っています…';
 try{const file=await renderMusicFile(options(),abort.signal);if(abort.signal.aborted)return;state.fileUrl=URL.createObjectURL(file);$('save-file').href=state.fileUrl;$('save-file').download=file.name;$('save-file').hidden=false;$('file-status').textContent='音声ができました。「音声を保存する」を押してください。';}
 catch(error){if(!abort.signal.aborted)$('file-status').textContent='音声を作れませんでした。設定を確認してください。';}
 finally{if(state.exportAbort===abort){state.exportAbort=null;state.exporting=false;$('make-file').disabled=!state.plan;$('play').disabled=!state.plan;}}
};
$('previous').onclick=()=>{stop();state.zoom=Math.max(0,state.zoom-1);zoom();};
$('next').onclick=()=>{stop();state.zoom=Math.min(2,state.zoom+1);zoom();};
onPageHidden(()=>{stop();invalidateFile();$('status').textContent='画面を離れたため止めました。';});
const observer=new ResizeObserver(()=>{overview();zoom();});observer.observe($('wave'));
let loadGeneration=0;
async function loadTrack(id){
 const generation=++loadGeneration;stop();invalidateFile();state.track=null;state.plan=null;state.analysis=null;
 $('play').disabled=true;$('make-file').disabled=true;$('play').textContent='解析を読み込んでいます…';$('section').disabled=true;$('status').textContent='この曲の解析を読み込んでいます…';
 try{
  const response=await fetch(`/__music/analysis?track=${encodeURIComponent(id)}`,{cache:'no-store'});
  if(!response.ok)throw Error('Analysis unavailable');const analysis=await response.json();
  if(generation!==loadGeneration)return;
  const track=state.catalog.find(track=>track.id===id)??null,metadata=state.library.find(item=>item.id===id);
  if(track&&(analysis.sourceSha256.slice(0,16)!==track.revision.slice(0,16)||JSON.stringify(analysis.beatsMs)!==JSON.stringify(track.beatsMs)))throw Error('Analysis and track differ');
  state.analysis=analysis;state.track=track;state.zoom=0;state.tick=null;
  $('track-title').textContent=metadata?.title??id;
  $('practice-link').href=track?`/#/use/music/${track.id}`:'/#/use/music';
  populatePrograms();
  $('section').replaceChildren(...(track?.sections??[]).map(section=>{const option=document.createElement('option');option.value=section.id;option.textContent=names[section.id];return option;}));
  $('section').disabled=!track;$('play').disabled=!track;$('play').textContent=track?'音楽とカウントを聞く':'練習区間の確認が必要です';
  const meter=analysis.expectedBeatsPerBar??4;
  $('legend').textContent='薄い線は1拍ずつ、太い線の「1」は小節のはじめです。再生中は今の位置に線が動きます。'+(track?.danceId==='chacha'?'チャチャチャの「&」は線と線の間で鳴ります。':'');
  $('summary').textContent=`${meter}拍子として解析。拍の候補${analysis.summary.beatCount}個、小節頭の候補${analysis.summary.downbeatCount}個。安定した候補${analysis.summary.candidateBars}区間、要確認${analysis.summary.uncertainBars}区間。末尾約${Math.ceil(analysis.summary.untrackedTailSeconds)}秒は拍が未確定です。`;
  $('issues').replaceChildren();
  for(const bar of analysis.bars.filter(bar=>bar.status!=='candidate')){const item=document.createElement('div');item.className='issue';
    item.textContent=`${seconds(analysis.beatsMs[bar.startBeat]/1000)}〜${seconds(analysis.beatsMs[bar.endBeat]/1000)}：${bar.issues.includes('meter-mismatch')?`${meter}拍ずつの区切りが不安定です。`:bar.issues.includes('irregular-beat-spacing')?'拍の間隔が不安定です。':'推定の根拠が弱い場所です。'}`;$('issues').append(item);}
  const tail=document.createElement('div');tail.className='issue';tail.textContent=`${seconds(analysis.beatsMs.at(-1)/1000)}〜${seconds(analysis.durationSeconds)}：拍を推定できていないため、カウントを付けていません。`;$('issues').append(tail);
  if(track&&selection()){$('status').textContent='波形と小節の推定を読み込みました。音と数字の位置を確認できます。';}
  else if(!track){overview();$('status').textContent='波形を読み込みました。安定した6小節が選べないため、再生前に拍と小節の確認が必要です。';}
 }catch(error){if(generation!==loadGeneration)return;$('status').textContent='解析を読み込めませんでした。解析プログラムの結果を確認してください。';console.error(error);}
}
$('track').onchange=()=>void loadTrack($('track').value);
try{
 const saved=await loadRoutines(await openAppStorage().catch(()=>null));
 state.routineChoices=[...MUSIC_ROUTINE_SAMPLES.map(item=>({...item,selectionId:item.id})),...saved.map(item=>({...item,selectionId:`saved-${item.id}`,note:'このアプリに保存したルーティンを読み込んでいます。内容は変更しません。'}))];
 const responses=await Promise.all([fetch('/__music/library',{cache:'no-store'}),fetch('/__music/catalog',{cache:'no-store'})]);
 if(responses.some(response=>!response.ok))throw Error('Library unavailable');
 [state.library,state.catalog]=await Promise.all(responses.map(response=>response.json()));
 $('track').replaceChildren(...state.library.map(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=item.label;return option;}));
 $('track').disabled=!state.library.length;
 const requested=new URLSearchParams(location.search).get('track');
 const first=state.library.find(item=>item.id===requested)?.id??state.library.find(item=>item.id==='paper-umbrella')?.id??state.library[0]?.id;
 if(!first)throw Error('No samples');$('track').value=first;await loadTrack(first);
}catch(error){$('status').textContent='曲と解析の一覧を読み込めませんでした。';console.error(error);}
