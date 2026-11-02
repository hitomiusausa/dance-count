import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { getDanceProfile } from '../../engine/dance-profiles.js';
import { compileMusicPlan, compileMusicProgram, MusicRoutineError } from '../../engine/music-plan.js';
import { BackButton } from '../components/BackButton.tsx';
import { Icon } from '../components/Icon.tsx';
import { danceName } from '../i18n/index.ts';
import { displayForVoiceKey } from '../lib/count-display.ts';
import { figureDisplayName } from '../../engine/figure-terminology.js';
import { musicRoutineChoices, musicFigureRange, type MusicFigureRange } from '../music/routines.ts';
import { useRoutines } from '../state/routines.ts';
import type { MusicLevel, MusicTrack } from '../music/model.ts';
import { canPlayMusicSample, playMusicSample, type MusicSamplePlayback } from '../platform/music.ts';
import { loadMusicPreferences, normalizeMusicPreferences, saveMusicPreferences, type MusicPreferences } from '../music/preferences.ts';
import { useMusicCatalog } from '../music/use-catalog.ts';
import { onPageHidden } from '../platform/page.ts';
import { CountBox, MetronomeVolumeControl, MoreOptions, NoticeBox, PlayDock, VoiceChip } from '../practice/controls.tsx';
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
import { DEFAULT_VOICE, voiceDisplayName } from '../voices/selection.ts';
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
const LEVEL_LABEL: Record<MusicLevel, 'musicLevelLow' | 'musicLevelMiddle' | 'musicLevelHigh'> = { low: 'musicLevelLow', middle: 'musicLevelMiddle', high: 'musicLevelHigh' };
// 曲を選ぶ画面の試聴（2026-11-02 ひとみうさ）。鳴らすのは 1 曲だけ。同じ曲をもう一度押す・別の曲を押す・画面を離れると止める
function useSongSample(){
  const current=useRef<MusicSamplePlayback|null>(null);
  const [playing,setPlaying]=useState<string|null>(null);const [failed,setFailed]=useState<string|null>(null);
  const stop=()=>{current.current?.stop();current.current=null;setPlaying(null);};
  useEffect(()=>()=>{current.current?.stop();current.current=null;},[]);
  useEffect(()=>onPageHidden(stop),[]);
  const toggle=(track:MusicTrack)=>{
    const same=playing===track.id;stop();setFailed(null);
    if(same)return;
    const playback=playMusicSample(track,wasFailure=>{if(current.current!==playback)return;current.current=null;setPlaying(null);if(wasFailure)setFailed(track.id);});
    if(!playback)return;
    current.current=playback;setPlaying(track.id);
  };
  return {playing,failed,toggle};
}
export function MusicListScreen({source={},query={}}:MusicSourceProps) {
  const {translator:t}=useI18n();const {tracks,failed}=useMusicCatalog();const context=useMusicSource(source);
  const contextual=!!context.danceId,screen=contextual?'U5':'U3';
  const songs=tracks?.filter(track=>!context.danceId||track.danceId===context.danceId);
  const genres=contextual?[]:MUSIC_GENRES.map(genre=>({genre,tracks:songs?.filter(track=>genre.danceIds.has(track.danceId))??[]})).filter(item=>item.tracks.length>0);
  const sample=useSongSample();
  const duration=(seconds:number|undefined)=>{
    if(seconds===undefined||!Number.isFinite(seconds)||seconds<=0)return null;
    const total=Math.round(seconds),minutes=Math.floor(total/60),rest=total%60;
    return t.t('musicDuration',{minutes,seconds:t.locale.startsWith('ja')?rest:String(rest).padStart(2,'0')});
  };
  // 1 行: 種目・レベル・長さ／曲名（練習へ） ＋ 試聴ボタン。リンクの中にボタンを入れない（押せる物の入れ子にしない）
  const songRows=(items:MusicTrack[])=><div data-list="music-tracks" role="list">{items.map(track=>{
    const meta=[danceName(track.danceId,t.locale),track.level?t.t(LEVEL_LABEL[track.level]):null,duration(track.durationSeconds)].filter(Boolean).join(' · ');
    const on=sample.playing===track.id,canListen=canPlayMusicSample(track);
    return <div key={track.id} role="listitem" class="dc-music-row">
      <a class="dc-link-row dc-music-song" data-track={track.id} data-level={track.level}
        href={buildHash(musicTrackTarget(track.id,source,query))}>
        <span class="dc-link-label"><small data-song-meta>{meta}</small><b>{track.title}</b></span><Icon name="chev-r"/>
      </a>
      {canListen&&<button type="button" class="dc-button dc-button--secondary dc-music-listen" data-listen={track.id} aria-pressed={on}
        aria-label={t.t(on?'musicListenStopLabel':'musicListenLabel',{title:track.title})} onClick={()=>sample.toggle(track)}>
        <Icon name={on?'stop':'play'}/></button>}
      {sample.failed===track.id&&<p class="dc-music-listen-error" role="status">{t.t('musicListenFailed')}</p>}
    </div>;})}</div>;
  return <main class={`dc-screen${contextual?' dc-screen--focus':''}`} data-screen={screen}>
    <BackButton screen={screen} fallback={contextual?musicOriginTarget(source):undefined}/><h1 class="dc-heading">{t.t(contextual?'musicChooseSong':'musicList')}</h1>
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
  const {translator:t}=useI18n();const {settings,update}=useSettings();const storage=useStorage();
  const {routines}=useRoutines();
  const choices=useMemo(()=>musicRoutineChoices(routines,track.danceId),[routines,track.danceId]);
  const [routineId,setRoutineId]=useState(source.routineId??'');const [chosenRange,setChosenRange]=useState<MusicFigureRange|undefined>(()=>musicRouteRange(query));
  const routine=choices.find(item=>item.id===routineId)??null;
  const range=routine?musicFigureRange(routine,chosenRange):null;
  const playback=usePlaybackVoice();const {session,view}=usePracticeSession(`music:${track.id}/${track.revision}`);
  const [prefs,setPrefs]=useState(()=>normalizeMusicPreferences(null,track));const current=useRef(prefs);current.current=prefs;
  const [ready,setReady]=useState(false);const [saveFailed,setSaveFailed]=useState(false);
  const alive=useRef(true);
  useEffect(()=>{
    let active=true;
    loadMusicPreferences(storage,track).then(value=>{if(active){current.current=value;setPrefs(value);setReady(true);}});
    return()=>{active=false;};
  },[storage,track.id,track.revision]);
  useEffect(()=>{
    alive.current=true;
    const remove=onPageHidden(()=>{
      session.stop();
    });
    return()=>{alive.current=false;remove();};
  },[session]);
  useEffect(()=>{session.stop();},[routine,figure]);
  const chooseRoutine=(id:string)=>{session.stop();setRoutineId(id);setChosenRange(undefined);};
  const chooseRange=(next:MusicFigureRange)=>{session.stop();setChosenRange(next);};
  const change=(patch:Partial<MusicPreferences>)=>{
    session.stop();const next=normalizeMusicPreferences({...current.current,...patch},track);
    current.current=next;setPrefs(next);void saveMusicPreferences(storage,track,next).then(ok=>{if(alive.current)setSaveFailed(!ok);});
  };
  const changeVolume=(patch:Partial<MusicPreferences>,save:boolean)=>{
    const next=normalizeMusicPreferences({...current.current,...patch},track);
    current.current=next;setPrefs(next);session.setMusicVolumes(next.musicMuted?0:next.musicVolume,next.countMuted?0:next.voiceVolume);
    if(save)void saveMusicPreferences(storage,track,next).then(ok=>{if(alive.current)setSaveFailed(!ok);});
  };
  const changeMute=(key:'musicMuted'|'countMuted')=>{
    const next=normalizeMusicPreferences({...current.current,[key]:!current.current[key]},track);
    current.current=next;setPrefs(next);session.setMusicVolumes(next.musicMuted?0:next.musicVolume,next.countMuted?0:next.voiceVolume);
    void saveMusicPreferences(storage,track,next).then(ok=>{if(alive.current)setSaveFailed(!ok);});
  };
  const changeMetronomeVolume=(volume:number,save:boolean)=>{
    session.setMetronomeVolume(settings.metronomeMuted?0:volume);
    if(save)update({metronomeVolume:volume});
  };
  const toggleMetronomeMute=()=>{
    const muted=!settings.metronomeMuted;
    update({metronomeMuted:muted});
    session.setMetronomeVolume(muted?0:settings.metronomeVolume);
  };
  useEffect(()=>{session.stop();},[settings.selectedVoiceId]);
  const options=():MusicOptions=>{
    const voice=playback.voice??DEFAULT_VOICE;
    return {kind:'music',danceId:track.danceId,track,sectionId:current.current.sectionId,rate:current.current.rate,
      repetitions:current.current.repetitions,musicVolume:current.current.musicMuted?0:current.current.musicVolume,voiceVolume:current.current.countMuted?0:current.current.voiceVolume,
      countEnabled:true,countInBars:0,startMode:current.current.startMode,delayBeats:current.current.delayBeats,voice,voiceOffsetMs:voiceOffsetFor(settings,voice),
      metronome:true,metronomeVolume:settings.metronomeMuted?0:settings.metronomeVolume,
      loop:false,bpm:getDanceProfile(track.danceId).practiceBpm,
      ...(figure?{figure}:{}),
      ...(routine&&range?{routine:{id:routine.id,name:routine.name,danceId:routine.danceId,figures:routine.figures,range}}:{})};
  };
  const toggle=()=>{
    if(view.playing||view.starting){session.stop();return;}
    if(!ready||routineIssue)return;
    void session.play(options(),playback.pending(settings));
  };
  const planned=useMemo(()=>{
    try{return {plan:compileMusicProgram(options()),issue:null};}
    catch(error){return {plan:null,issue:error instanceof MusicRoutineError&&error.reason==='coverage'?'coverage':'invalid'};}
  },[track,prefs.sectionId,prefs.rate,prefs.startMode,prefs.delayBeats,settings.metronomeMuted,settings.metronomeVolume,routine,figure,range?.startIndex,range?.endIndex]);
  const routineIssue=planned.issue;
  const plan=planned.plan??compileMusicPlan(track,prefs.sectionId,prefs.rate);
  const startCounts=figure?figure.counts:routine&&range?routine.figures[range.startIndex]!.counts:track.counts;
  const idleCells=useMemo(()=>stripCells(idleProgram(track.danceId,startCounts)),[track.danceId,startCounts]);
  const cells=useMemo(()=>{
    // Rumba music starts the spoken dance count on 2, but this strip shows bar beats.
    // Keep the first spoken 2 highlighted at beat 2 while the strip reads 1, 2, 3, 4.
    return track.danceId==='rumba'&&!routine&&!figure&&startCounts==='2341'
      ?idleCells.map((cell,index)=>({...cell,label:String(index+1)}))
      :idleCells;
  },[track.danceId,startCounts,routine,figure,idleCells]);
  const lit=view.playing&&!view.countIn?cells.findIndex(cell=>cell.label===displayForVoiceKey(view.voiceKey)):null;
  const sounding=(routine||figure)&&view.playing&&!view.countIn?view.figureIndex:null;
  const strip=(routine||figure)&&view.program&&sounding!==null?stripView(stripCells(view.program,sounding),view.originalTick):{cells,lit:(routine||figure)?null:lit===-1?null:lit};
  const shownIndex=sounding??range?.startIndex??0;
  const routineEnd=(planned.plan as {routineEndTick?:number}|null)?.routineEndTick;
  const complete=(routine||figure)&&view.playing&&routineEnd!==undefined&&view.originalTick!==null&&view.originalTick>=routineEnd;
  const busy=view.playing||view.starting;
  const waitBars=t.t(prefs.delayBeats===track.beatsPerBar?'musicWaitOneBar':'musicWaitTwoBars');
  return <main class="dc-screen dc-screen--focus dc-screen--dock dc-practice dc-music" data-screen="U4" data-routine={routine||figure?'true':'false'} data-playing={busy?'true':'false'}>
    <BackButton screen="U4" fallback={musicPickerTarget(source,query)} backTo={musicOriginTarget(source)}/>
    <div class="dc-practice-grid"><div>
      <header class="dc-playhead"><h1>{danceName(track.danceId,t.locale)}</h1><small>{track.title}</small></header>
      <div class="dc-music-note dc-music-summary">{t.t('musicSeconds',{seconds:Math.round(plan.transport.duration)})} · {t.t(prefs.repetitions===1?'musicOnce':'musicTimes',{count:prefs.repetitions})}</div>
      <NoticeBox notice={saveFailed?'save-failed':view.notice} onClose={()=>{setSaveFailed(false);session.dismissNotice();}}/>
      <CountBox playing={view.playing} countIn={view.countIn} leadText={view.listening?t.t('musicListening'):undefined} preparing={view.starting} nowText={displayForVoiceKey(view.voiceKey)} idleText={idleCells[0]?.label??''} strip={strip}>
        {(routine||figure)&&<div class={`dc-figure-now${sounding!==null?' dc-figure-now--on':''}`} data-figure-now data-ellipsis title={figure?.name??routine?.figures[shownIndex]?.name}>
          {complete?t.t(figure?'musicPracticeFinished':'musicRoutineFinished'):figure?figure.name:<><span class="dc-figure-now-pos">{shownIndex+1} / {routine!.figures.length}</span> {figureDisplayName(track.danceId,routine!.figures[shownIndex]!.name,t.locale)}</>}
        </div>}
      </CountBox>
      {routineIssue&&<p class="dc-music-note" role="status" data-music-routine-error>{t.t(routineIssue==='coverage'?'musicRoutineTooLong':'musicRoutineInvalid')}</p>}
    </div><div>
      <div class="dc-field-label"><span>{t.t('musicSpeed')}</span></div>
      <div class="dc-chips" role="radiogroup" aria-label={t.t('musicSpeed')} data-group="music-speed">
        {track.rates.map(rate=><button type="button" key={rate} class="dc-chip" role="radio" aria-checked={prefs.rate===rate?'true':'false'} disabled={!ready}
          onClick={()=>change({rate})}>{prefs.rate===rate&&<Icon name="check"/>}{t.t(rate===1?'musicOriginal':rate<1?'musicSlower':'musicFaster')}</button>)}
      </div>
      <VoiceChip name={voiceDisplayName(t,playback.voice??DEFAULT_VOICE,'chip')}/>
      <MoreOptions label={t.t('musicSettings')}>
        <a class="dc-link-row" data-music-reselect href={buildHash(musicPickerTarget(source,query))}>
          <Icon name="play"/><span class="dc-link-label">{t.t('musicChooseAnotherSong')}</span><Icon name="chev-r"/>
        </a>
        {(figure||choices.length>0)&&<div data-group="music-routine">
          {figure?<><p class="dc-music-note" data-music-figure-name>{figure.name}</p><p class="dc-music-note">{t.t('musicFigureRepeats')}</p></>:<>
          <label class="dc-music-field">{t.t('musicRoutine')}<select data-music-routine value={routine?.id??''} disabled={!ready||!!source.routineId} onChange={e=>chooseRoutine(e.currentTarget.value)}>
            <option value="">{t.t('musicBasicCount')}</option>
            {choices.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label></>}
          {routine&&range&&<>
            <p class="dc-music-note" data-music-routine-name>{routine.name}</p>
            <label class="dc-music-field">{t.t('rangeStart')}<select data-music-from value={range.startIndex} disabled={!ready}
              onChange={e=>{const startIndex=Number(e.currentTarget.value);chooseRange({startIndex,endIndex:Math.max(startIndex,range.endIndex)});}}>
              {routine.figures.map((figure,index)=><option key={figure.id} value={index}>{t.t('musicFigureNumber',{number:index+1})}</option>)}
            </select></label>
            <label class="dc-music-field">{t.t('rangeEnd')}<select data-music-to value={range.endIndex} disabled={!ready}
              onChange={e=>{const endIndex=Number(e.currentTarget.value);chooseRange({startIndex:Math.min(endIndex,range.startIndex),endIndex});}}>
              {routine.figures.map((figure,index)=><option key={figure.id} value={index}>{t.t('musicFigureNumber',{number:index+1})}</option>)}
            </select></label>
            <p class="dc-music-note">{t.t('musicRoutineRange',{from:range.startIndex+1,to:range.endIndex+1})}</p>
            <ol class="dc-music-figures">{routine.figures.map((figure,index)=>index>=range.startIndex&&index<=range.endIndex&&<li key={figure.id} value={index+1}>{figureDisplayName(track.danceId,figure.name,t.locale)}</li>)}</ol>
          </>}
        </div>}

        <div data-group="music-range">
          <label class="dc-music-field">{t.t('musicRepetitions')}<select value={prefs.repetitions} disabled={!ready} onChange={e=>change({repetitions:Number(e.currentTarget.value)})}>
            {[1,2,4].map(n=><option key={n} value={n}>{t.t(n===1?'musicPlayOnce':'musicRepeatTimes',{count:n})}</option>)}
          </select></label>
        </div>
        <div data-group="music-sound">
          <label class="dc-music-field">{t.t('musicVolume')}<div class="dc-music-volume-control">
            <input aria-label={t.t('musicVolume')} type="range" min="0" max="0.7" step="0.01" value={prefs.musicVolume} disabled={!ready}
              onInput={e=>changeVolume({musicVolume:Number(e.currentTarget.value)},false)} onChange={e=>changeVolume({musicVolume:Number(e.currentTarget.value)},true)}/>
            <button type="button" class="dc-button dc-button--secondary dc-music-mute" data-mute-music aria-label={t.t(prefs.musicMuted?'musicUnmuteMusicLabel':'musicMuteMusicLabel')} aria-pressed={prefs.musicMuted} disabled={!ready}
              onClick={()=>changeMute('musicMuted')}>{t.t(prefs.musicMuted?'musicUnmute':'musicMute')}</button>
          </div></label>
          <label class="dc-music-field">{t.t('musicCountVolume')}<div class="dc-music-volume-control">
            <input aria-label={t.t('musicCountVolume')} type="range" min="0" max="1.2" step="0.01" value={prefs.voiceVolume} disabled={!ready}
              onInput={e=>changeVolume({voiceVolume:Number(e.currentTarget.value)},false)} onChange={e=>changeVolume({voiceVolume:Number(e.currentTarget.value)},true)}/>
            <button type="button" class="dc-button dc-button--secondary dc-music-mute" data-mute-count aria-label={t.t(prefs.countMuted?'musicUnmuteCountLabel':'musicMuteCountLabel')} aria-pressed={prefs.countMuted} disabled={!ready}
              onClick={()=>changeMute('countMuted')}>{t.t(prefs.countMuted?'musicUnmute':'musicMute')}</button>
          </div></label>
          <MetronomeVolumeControl value={settings.metronomeVolume} muted={settings.metronomeMuted}
            onPreview={value=>changeMetronomeVolume(value,false)} onChange={value=>changeMetronomeVolume(value,true)} onMute={toggleMetronomeMute}/>
        </div>
        <div data-group="music-start">
          <label class="dc-music-field">{t.t('musicStartOrder')}<select value={prefs.startMode} disabled={!ready}
            onChange={e=>change({startMode:e.currentTarget.value as MusicPreferences['startMode']})}>
            <option value="music-first">{t.t('musicFirst')}</option><option value="count-first">{t.t('musicCountFirst')}</option><option value="together">{t.t('musicTogether')}</option>
          </select></label>
          {prefs.startMode!=='together'&&<>
            <label class="dc-music-field">{t.t(prefs.startMode==='music-first'?'musicListenWait':'musicCountWait')}<select value={prefs.delayBeats} disabled={!ready}
              onChange={e=>change({delayBeats:Number(e.currentTarget.value)})}>
              {[track.beatsPerBar,track.beatsPerBar*2].map((beats,index)=><option key={beats} value={beats}>
                {t.t(index===0?'musicWaitOneBar':'musicWaitTwoBars')}</option>)}
            </select></label>
            <div class="dc-music-note">{t.t(prefs.startMode==='music-first'?(routine?'musicRoutineListenThen':figure?'musicFigureListenThen':'musicListenThen'):'musicCountThen',{bars:waitBars})}</div>
          </>}
        </div>
      </MoreOptions>
      {track.preview&&<div class="dc-music-note">{t.t('musicPreview')}</div>}
      <span hidden data-music-duration={plan.transport.duration}/>
    </div></div>
    <PlayDock playing={busy} onToggle={toggle} disabled={!ready||!!routineIssue} label={!ready?t.t('musicPreparing'):undefined}/>
  </main>;
}
