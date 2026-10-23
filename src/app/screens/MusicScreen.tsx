import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { getDanceProfile } from '../../engine/dance-profiles.js';
import { compileMusicPlan, compileMusicProgram, MusicRoutineError, musicJobs } from '../../engine/music-plan.js';
import { BackButton } from '../components/BackButton.tsx';
import { Icon } from '../components/Icon.tsx';
import { danceName } from '../i18n/index.ts';
import { displayForVoiceKey } from '../lib/count-display.ts';
import { figureDisplayName } from '../../engine/figure-terminology.js';
import { musicRoutineChoices, musicFigureRange, type MusicFigureRange } from '../music/routines.ts';
import { useRoutines } from '../state/routines.ts';
import type { MusicTrack } from '../music/model.ts';
import { loadMusicPreferences, normalizeMusicPreferences, saveMusicPreferences, type MusicPreferences } from '../music/preferences.ts';
import { useMusicCatalog } from '../music/use-catalog.ts';
import { downloadFile } from '../platform/files.ts';
import { onPageHidden } from '../platform/page.ts';
import { MusicFileError, renderMusicFile } from '../platform/music-export.ts';
import { CountBox, MoreOptions, NoticeBox, PlayDock, VoiceChip } from '../practice/controls.tsx';
import { idleProgram, stripCells, stripView } from '../practice/beat-indicator.ts';
import type { MusicOptions } from '../practice/session.ts';
import { usePracticeSession } from '../practice/use-session.ts';
import { voiceOffsetFor } from '../practice/voice-offset.ts';
import { musicOriginTarget, musicPickerTarget, musicTrackTarget, musicRouteRange } from '../music/navigation.ts';
import { figureDisplayName as canonicalFigureName } from '../routines/figure-names.ts';
import { reviewedFigureBySlug } from '../routines/reviewed-counts.ts';
import { practiceCounts, type DanceProfileLike } from '../practice/preferences.ts';
import { buildHash, type RouteParams, type RouteQuery } from '../router/routes.ts';
import { replaceRoute } from '../state/route.ts';
import { useI18n } from '../state/i18n.ts';
import { useSettings } from '../state/settings.ts';
import { useStorage } from '../state/storage.ts';
import { DEFAULT_VOICE, voiceDisplayName, wordOffsetsFor } from '../voices/selection.ts';
import { usePlaybackVoice } from '../voices/use-playback-voice.ts';

const MUSIC_GENRES = [
  {id:'latin',danceIds:new Set(['samba','chacha','rumba','pasodoble','jive'])},
  {id:'standard',danceIds:new Set(['waltz','tango','vwaltz','slowfox','quickstep'])},
] as const;
interface MusicSourceProps { source?:RouteParams; query?:RouteQuery }
function useMusicSource(source:RouteParams={}){
  const {routines}=useRoutines();const {settings}=useSettings();const {translator:t}=useI18n();
  const routine=source.routineId?routines.find(item=>item.id===source.routineId):null;
  const danceId=routine?.danceId??source.danceId;
  const figure=useMemo(()=>{
    if(!source.danceId||source.routineId)return null;
    const reviewed=reviewedFigureBySlug(source.danceId,source.figureSlug);
    const name=reviewed?canonicalFigureName(source.danceId,reviewed.englishName,t.locale):t.t('musicBasicCount');
    return {id:`music-${source.danceId}-${source.figureSlug??'counts'}`,danceId:source.danceId,name,
      counts:practiceCounts(getDanceProfile(source.danceId) as DanceProfileLike,settings,reviewed)};
  },[source.danceId,source.figureSlug,source.routineId,t.locale,settings.lastTemplateByDance[source.danceId??'']]);
  return {danceId,figure,name:routine?.name??figure?.name};
}
export function MusicListScreen({source={},query={}}:MusicSourceProps) {
  const {translator:t}=useI18n();const {tracks,failed}=useMusicCatalog();const context=useMusicSource(source);
  const contextual=!!context.danceId,screen=contextual?'U5':'U3';
  const songs=tracks?.filter(track=>!context.danceId||track.danceId===context.danceId);
  const genres=contextual?[]:MUSIC_GENRES.map(genre=>({genre,tracks:songs?.filter(track=>genre.danceIds.has(track.danceId))??[]})).filter(item=>item.tracks.length>0);
  const songRows=(items:MusicTrack[])=><div data-list="music-tracks" role="list">{items.map(track=><div key={track.id} role="listitem"><a class="dc-link-row dc-music-song" data-track={track.id}
    href={buildHash(musicTrackTarget(track.id,source,query))}>
    <span class="dc-link-label"><small>{danceName(track.danceId,t.locale)}</small><b>{track.title}</b></span><Icon name="chev-r"/>
  </a></div>)}</div>;
  return <main class={`dc-screen${contextual?' dc-screen--focus':''}`} data-screen={screen}>
    <BackButton screen={screen} fallback={contextual?musicOriginTarget(source):undefined}/><h1 class="dc-heading">{t.t('musicList')}</h1>
    <p class="dc-body" data-music-context>{context.name?t.t('musicForSelection',{name:context.name}):t.t('musicIntro')}</p>
    {songs===undefined?<p role="status">{t.t('musicPreparing')}</p>:!songs.length?<p role="status">{t.t(failed?'musicFailed':contextual?'musicDanceEmpty':'musicEmpty')}</p>:
      contextual?songRows(songs):<div data-music-genres>{genres.map(({genre,tracks:genreTracks})=><details key={genre.id} class="dc-music-genre" data-music-genre={genre.id}>
        <summary><span>{t.t(genre.id==='latin'?'musicLatin':'musicStandard')}</span><small>{t.t('musicGenreSongCount',{count:genreTracks.length})}</small><Icon name="chev-r"/></summary>
        {songRows(genreTracks)}
      </details>)}</div>}
    {songs?.some(track=>track.preview)&&<div class="dc-music-note">{t.t('musicPreview')}</div>}
  </main>;
}
export function MusicPracticeScreen({trackId,source={},query={}}:{trackId:string}&MusicSourceProps) {
  const {translator:t}=useI18n();const {tracks,failed}=useMusicCatalog();const context=useMusicSource(source);
  const track=tracks?.find(item=>item.id===trackId&&(!context.danceId||item.danceId===context.danceId));
  useEffect(()=>{if(tracks!==null&&!failed&&!track)replaceRoute(musicPickerTarget(source,query));},[tracks,failed,track,context.danceId]);
  if(!track)return <main class="dc-screen dc-screen--focus" data-screen="U4"><BackButton screen="U4" fallback={musicPickerTarget(source,query)}/>
    <h1 class="dc-heading">{t.t('musicPractice')}</h1><p role="status">{t.t(tracks===null?'musicPreparing':'musicFailed')}</p></main>;
  return <MusicPlayer key={track.revision} track={track} source={source} query={query} figure={context.figure}/>;
}
function MusicPlayer({track,source,query,figure}:{track:MusicTrack;source:RouteParams;query:RouteQuery;figure:MusicOptions['figure']|null}) {
  const {translator:t}=useI18n();const {settings}=useSettings();const storage=useStorage();
  const {routines}=useRoutines();
  const choices=useMemo(()=>musicRoutineChoices(routines,track.danceId),[routines,track.danceId]);
  const [routineId,setRoutineId]=useState(source.routineId??'');const [chosenRange,setChosenRange]=useState<MusicFigureRange|undefined>(()=>musicRouteRange(query));
  const routine=choices.find(item=>item.id===routineId)??null;
  const range=routine?musicFigureRange(routine,chosenRange):null;
  const playback=usePlaybackVoice();const {session,view}=usePracticeSession(`music:${track.id}/${track.revision}`);
  const [prefs,setPrefs]=useState(()=>normalizeMusicPreferences(null,track));const current=useRef(prefs);current.current=prefs;
  const [ready,setReady]=useState(false);const [saveFailed,setSaveFailed]=useState(false);
  const [file,setFile]=useState<File|null>(null);const [rendering,setRendering]=useState(false);const [fileStatus,setFileStatus]=useState<'ready'|'failed'|'cancelled'|'volume'|'duration'|null>(null);
  const renderAbort=useRef<AbortController|null>(null);const alive=useRef(true);
  useEffect(()=>{
    let active=true;
    loadMusicPreferences(storage,track).then(value=>{if(active){current.current=value;setPrefs(value);setReady(true);}});
    return()=>{active=false;};
  },[storage,track.id,track.revision]);
  useEffect(()=>{
    alive.current=true;
    const remove=onPageHidden(()=>{
      session.stop();
      if(renderAbort.current){renderAbort.current.abort();renderAbort.current=null;setRendering(false);setFile(null);setFileStatus('cancelled');}
    });
    return()=>{alive.current=false;renderAbort.current?.abort();remove();};
  },[session]);
  const invalidate=()=>{renderAbort.current?.abort();renderAbort.current=null;setRendering(false);setFile(null);setFileStatus(null);};
  useEffect(()=>{session.stop();invalidate();},[routine,figure]);
  const chooseRoutine=(id:string)=>{session.stop();invalidate();setRoutineId(id);setChosenRange(undefined);};
  const chooseRange=(next:MusicFigureRange)=>{session.stop();invalidate();setChosenRange(next);};
  const change=(patch:Partial<MusicPreferences>)=>{
    session.stop();invalidate();const next=normalizeMusicPreferences({...current.current,...patch},track);
    current.current=next;setPrefs(next);void saveMusicPreferences(storage,track,next).then(ok=>{if(alive.current)setSaveFailed(!ok);});
  };
  const changeVolume=(patch:Partial<MusicPreferences>,save:boolean)=>{
    invalidate();const next=normalizeMusicPreferences({...current.current,...patch},track);
    current.current=next;setPrefs(next);session.setMusicVolumes(next.musicVolume,next.voiceVolume);
    if(save)void saveMusicPreferences(storage,track,next).then(ok=>{if(alive.current)setSaveFailed(!ok);});
  };
  // A new voice invalidates an already prepared file; it never quietly exports the old one.
  useEffect(()=>{session.stop();invalidate();},[settings.selectedVoiceId]);
  const options=():MusicOptions=>{
    const voice=playback.voice??DEFAULT_VOICE;
    return {kind:'music',danceId:track.danceId,track,sectionId:current.current.sectionId,rate:current.current.rate,
      repetitions:current.current.repetitions,musicVolume:current.current.musicVolume,voiceVolume:current.current.voiceVolume,
      countEnabled:current.current.countEnabled,countInBars:0,startMode:current.current.startMode,delayBeats:current.current.delayBeats,voice,voiceOffsetMs:voiceOffsetFor(settings,voice),
      metronome:false,loop:false,bpm:getDanceProfile(track.danceId).practiceBpm,
      ...(figure&&current.current.countEnabled?{figure}:{}),
      ...(routine&&range&&current.current.countEnabled?{routine:{id:routine.id,name:routine.name,danceId:routine.danceId,figures:routine.figures,range}}:{})};
  };
  const toggle=()=>{
    if(view.playing||view.starting){session.stop();return;}
    if(!ready||rendering||routineIssue)return;
    void session.play(options(),playback.pending(settings));
  };
  const makeFile=async()=>{
    if(routineIssue)return;
    session.stop();invalidate();const abort=new AbortController();renderAbort.current=abort;setRendering(true);
    try{
      let value=options();const pending=playback.pending(settings);if(pending)value={...value,...await pending};
      abort.signal.throwIfAborted();const result=await renderMusicFile(value,abort.signal);
      if(alive.current&&!abort.signal.aborted){setFile(result);setFileStatus('ready');}
    }catch(error){if(alive.current&&!abort.signal.aborted)setFileStatus(error instanceof MusicFileError&&error.reason!=='voice'?error.reason:'failed');}
    finally{if(alive.current&&renderAbort.current===abort){setRendering(false);renderAbort.current=null;}}
  };
  const planned=useMemo(()=>{
    try{return {plan:compileMusicProgram(options()),issue:null};}
    catch(error){return {plan:null,issue:error instanceof MusicRoutineError&&error.reason==='coverage'?'coverage':'invalid'};}
  },[track,prefs.sectionId,prefs.rate,prefs.startMode,prefs.delayBeats,prefs.countEnabled,routine,figure,range?.startIndex,range?.endIndex]);
  const routineIssue=planned.issue;
  const plan=planned.plan??compileMusicPlan(track,prefs.sectionId,prefs.rate);
  const estimate=musicJobs(plan,prefs.repetitions,{...prefs,voiceOffsetMs:playback.offsetMs,wordOffsetsMs:wordOffsetsFor(playback.voice??DEFAULT_VOICE)});
  const tooLong=estimate.end>120;
  const startCounts=figure&&prefs.countEnabled?figure.counts:routine&&range&&prefs.countEnabled?routine.figures[range.startIndex]!.counts:track.counts;
  const cells=useMemo(()=>stripCells(idleProgram(track.danceId,startCounts)),[track.danceId,startCounts]);
  const lit=view.playing&&!view.countIn?cells.findIndex(cell=>cell.label===displayForVoiceKey(view.voiceKey)):null;
  const sounding=(routine||figure)&&prefs.countEnabled&&view.playing&&!view.countIn?view.figureIndex:null;
  const strip=(routine||figure)&&view.program&&sounding!==null?stripView(stripCells(view.program,sounding),view.originalTick):{cells,lit:(routine||figure)?null:lit===-1?null:lit};
  const shownIndex=sounding??range?.startIndex??0;
  const routineEnd=(planned.plan as {routineEndTick?:number}|null)?.routineEndTick;
  const complete=(routine||figure)&&prefs.countEnabled&&view.playing&&routineEnd!==undefined&&view.originalTick!==null&&view.originalTick>=routineEnd;
  const busy=view.playing||view.starting;
  const received=prefs.countEnabled&&playback.voice?.kind==='pack'&&playback.voice.pack.origin==='received';
  return <main class="dc-screen dc-screen--focus dc-screen--dock dc-practice dc-music" data-screen="U4" data-routine={routine||figure?'true':'false'} data-playing={busy?'true':'false'}>
    <BackButton screen="U4" fallback={musicPickerTarget(source,query)}/>
    <div class="dc-practice-grid"><div>
      <header class="dc-playhead"><h1>{danceName(track.danceId,t.locale)}</h1><small>{track.title}</small></header>
      <div class="dc-music-note dc-music-summary">{t.t('musicSeconds',{seconds:Math.round(plan.transport.duration)})} · {t.t(prefs.repetitions===1?'musicOnce':'musicTimes',{count:prefs.repetitions})}</div>
      <NoticeBox notice={saveFailed?'save-failed':view.notice} onClose={()=>{setSaveFailed(false);session.dismissNotice();}}/>
      <CountBox playing={view.playing} countIn={view.countIn} leadText={view.listening?t.t('musicListening'):undefined} preparing={view.starting} nowText={displayForVoiceKey(view.voiceKey)} idleText={cells[0]?.label??''} strip={strip}>
        {(routine||figure)&&prefs.countEnabled&&<div class={`dc-figure-now${sounding!==null?' dc-figure-now--on':''}`} data-figure-now data-ellipsis title={figure?.name??routine?.figures[shownIndex]?.name}>
          {complete?t.t(figure?'musicPracticeFinished':'musicRoutineFinished'):figure?figure.name:<><span class="dc-figure-now-pos">{shownIndex+1} / {routine!.figures.length}</span> {figureDisplayName(track.danceId,routine!.figures[shownIndex]!.name,t.locale)}</>}
        </div>}
      </CountBox>
      {routineIssue&&<p class="dc-music-note" role="status" data-music-routine-error>{t.t(routineIssue==='coverage'?'musicRoutineTooLong':'musicRoutineInvalid')}</p>}
    </div><div>
      <div class="dc-field-label"><span>{t.t('musicSpeed')}</span></div>
      <div class="dc-chips" role="radiogroup" aria-label={t.t('musicSpeed')} data-group="music-speed">
        {track.rates.map(rate=><button type="button" key={rate} class="dc-chip" role="radio" aria-checked={prefs.rate===rate?'true':'false'} disabled={!ready||rendering}
          onClick={()=>change({rate})}>{prefs.rate===rate&&<Icon name="check"/>}{t.t(rate===1?'musicOriginal':rate<1?'musicSlower':'musicFaster')}</button>)}
      </div>
      <VoiceChip name={voiceDisplayName(t,playback.voice??DEFAULT_VOICE,'chip')}/>
      <MoreOptions label={t.t('musicSettings')}>
        {(figure||choices.length>0)&&<div data-group="music-routine">
          {figure?<><p class="dc-music-note" data-music-figure-name>{figure.name}</p><p class="dc-music-note">{t.t('musicFigureRepeats')}</p></>:<>
          <label class="dc-music-field">{t.t('musicRoutine')}<select data-music-routine value={routine?.id??''} disabled={!ready||rendering||!!source.routineId} onChange={e=>chooseRoutine(e.currentTarget.value)}>
            <option value="">{t.t('musicBasicCount')}</option>
            {choices.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label></>}
          {routine&&range&&<>
            <p class="dc-music-note" data-music-routine-name>{routine.name}</p>
            <label class="dc-music-field">{t.t('rangeStart')}<select data-music-from value={range.startIndex} disabled={!ready||rendering}
              onChange={e=>{const startIndex=Number(e.currentTarget.value);chooseRange({startIndex,endIndex:Math.max(startIndex,range.endIndex)});}}>
              {routine.figures.map((figure,index)=><option key={figure.id} value={index}>{t.t('musicFigureNumber',{number:index+1})}</option>)}
            </select></label>
            <label class="dc-music-field">{t.t('rangeEnd')}<select data-music-to value={range.endIndex} disabled={!ready||rendering}
              onChange={e=>{const endIndex=Number(e.currentTarget.value);chooseRange({startIndex:Math.min(endIndex,range.startIndex),endIndex});}}>
              {routine.figures.map((figure,index)=><option key={figure.id} value={index}>{t.t('musicFigureNumber',{number:index+1})}</option>)}
            </select></label>
            <p class="dc-music-note">{t.t('musicRoutineRange',{from:range.startIndex+1,to:range.endIndex+1})}</p>
            <ol class="dc-music-figures">{routine.figures.map((figure,index)=>index>=range.startIndex&&index<=range.endIndex&&<li key={figure.id} value={index+1}>{figureDisplayName(track.danceId,figure.name,t.locale)}</li>)}</ol>
          </>}
        </div>}

        <div data-group="music-range">
          <label class="dc-music-field">{t.t('musicRepetitions')}<select value={prefs.repetitions} disabled={!ready||rendering} onChange={e=>change({repetitions:Number(e.currentTarget.value)})}>
            {[1,2,4].map(n=><option key={n} value={n}>{t.t(n===1?'musicPlayOnce':'musicRepeatTimes',{count:n})}</option>)}
          </select></label>
        </div>
        <div data-group="music-sound">
          <label class="dc-music-field">{t.t('musicVolume')}<input aria-label={t.t('musicVolume')} type="range" min="0" max="0.7" step="0.01" value={prefs.musicVolume} disabled={!ready||rendering}
            onInput={e=>changeVolume({musicVolume:Number(e.currentTarget.value)},false)} onChange={e=>changeVolume({musicVolume:Number(e.currentTarget.value)},true)}/></label>
          <label class="dc-music-field">{t.t('musicVoiceVolume')}<input aria-label={t.t('musicVoiceVolume')} type="range" min="0" max="1.2" step="0.01" value={prefs.voiceVolume} disabled={!ready||rendering}
            onInput={e=>changeVolume({voiceVolume:Number(e.currentTarget.value)},false)} onChange={e=>changeVolume({voiceVolume:Number(e.currentTarget.value)},true)}/></label>
          <button type="button" class="dc-toggle dc-music-count" role="switch" aria-label={t.t('musicCount')} aria-checked={prefs.countEnabled} disabled={!ready||rendering}
            onClick={()=>change({countEnabled:!prefs.countEnabled})}><span class="dc-toggle-label">{t.t('musicCount')}</span><span class="dc-switch"><span class="dc-switch-knob"/><span class="dc-switch-text">{t.t(prefs.countEnabled?'musicWithCount':'musicOnly')}</span></span></button>
        </div>
        <div data-group="music-start">
          <label class="dc-music-field">{t.t('musicStartOrder')}<select value={prefs.startMode} disabled={!ready||rendering||!prefs.countEnabled}
            onChange={e=>change({startMode:e.currentTarget.value as MusicPreferences['startMode']})}>
            <option value="music-first">{t.t('musicFirst')}</option><option value="count-first">{t.t('musicCountFirst')}</option><option value="together">{t.t('musicTogether')}</option>
          </select></label>
          {prefs.startMode!=='together'&&prefs.countEnabled&&<>
            <label class="dc-music-field">{t.t(prefs.startMode==='music-first'?'musicListenWait':'musicCountWait')}<select value={prefs.delayBeats} disabled={!ready||rendering}
              onChange={e=>change({delayBeats:Number(e.currentTarget.value)})}>
              {[...new Set([1,2,track.beatsPerBar,track.beatsPerBar*2])].map(beats=><option key={beats} value={beats}>
                {t.t(beats<track.beatsPerBar?'musicWaitBeats':'musicWaitBars',{count:beats<track.beatsPerBar?beats:beats/track.beatsPerBar,beats})}</option>)}
            </select></label>
            <div class="dc-music-note">{t.t(prefs.startMode==='music-first'?(routine?'musicRoutineListenThen':figure?'musicFigureListenThen':'musicListenThen'):'musicCountThen',{beats:prefs.delayBeats})}</div>
          </>}
        </div>
        <div class="dc-music-file" data-group="music-file">
          <h2 class="dc-field-label">{t.t('musicSaveHeading')}</h2>
          <div class="dc-music-note">{t.t(received?'musicFileReceived':'musicFileIntro')}</div>
          {!received&&<div class="dc-music-note">{t.t('musicFileEstimate',{seconds:Math.ceil(estimate.end),size:Math.ceil(estimate.end*48000*4/1000000)})}</div>}
          {tooLong&&!received&&<div class="dc-body" role="status">{t.t('musicFileTooLong')}</div>}
          {rendering?<button type="button" class="dc-button dc-button--secondary" onClick={()=>{invalidate();setFileStatus('cancelled');}}>{t.t('musicCancelFile')}</button>:
            <button type="button" class="dc-button dc-button--secondary" disabled={!ready||received||tooLong||!!routineIssue||playback.voice===null} onClick={()=>void makeFile()}>{t.t('musicCreateFile')}</button>}
          {file&&<button type="button" class="dc-button dc-primary" data-music-save onClick={()=>downloadFile(file)}>{t.t('saveFileAgain')}</button>}
          {(rendering||fileStatus)&&<div class="dc-body" role="status">{t.t(rendering?'musicFilePreparing':fileStatus==='ready'?'musicFileReady':fileStatus==='cancelled'?'musicFileStopped':fileStatus==='volume'?'musicFileTooLoud':fileStatus==='duration'?'musicFileTooLong':'musicFileFailed')}</div>}
        </div>
      </MoreOptions>
      {track.preview&&<div class="dc-music-note">{t.t('musicPreview')}</div>}
      <span hidden data-music-duration={plan.transport.duration}/>
    </div></div>
    <PlayDock playing={busy} onToggle={toggle} disabled={!ready||rendering||!!routineIssue} label={rendering?t.t('musicFilePreparing'):!ready?t.t('musicPreparing'):undefined}/>
  </main>;
}
