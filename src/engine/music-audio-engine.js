import { scheduleVoiceEvent } from './voice-pack-loader.js';
import { effectiveVoiceOffsetMs } from './audio-engine.js';
import { musicJobs } from './music-plan.js';

// Used by both realtime playback and offline export. Music buffers have already
// been stretched at production time: playbackRate stays 1, and voices stay natural.
export function scheduleMusicJob(audio, job, origin, { buffer, voicePack, musicBus, voiceBus, voiceOffsetMs = 0, wordOffsetsMs = {} }) {
  const at = origin + job.at;
  if (job.kind === 'voice') {
    return scheduleVoiceEvent({ audioContext: audio, destination: voiceBus, voicePack, event: job.event,
      targetTime: at, userOffsetMs: effectiveVoiceOffsetMs(voiceOffsetMs, wordOffsetsMs, job.event.voiceKey),
      endTime: Math.min(origin + (job.sectionEnd ?? job.end), origin + job.end
        + (job.nextVoiceKey ? effectiveVoiceOffsetMs(voiceOffsetMs, wordOffsetsMs, job.nextVoiceKey)/1000 : 0)) });
  }
  if (job.kind === 'click') {
    const source = audio.createOscillator(), gain = audio.createGain();
    source.frequency.value = job.accent ? 1320 : 880;
    gain.gain.setValueAtTime(job.accent ? .13 : .08, at);
    gain.gain.exponentialRampToValueAtTime(.0001, at+.035);
    source.connect(gain).connect(audio.destination); source.start(at); source.stop(at+.04); return source;
  }
  const source = audio.createBufferSource(), gain = audio.createGain();
  source.buffer = buffer;
  source.connect(gain).connect(musicBus);
  const end = origin + job.end;
  gain.gain.setValueAtTime(0,at); gain.gain.linearRampToValueAtTime(1,at+.008);
  gain.gain.setValueAtTime(1,end-.012); gain.gain.linearRampToValueAtTime(0,end);
  source.start(at); source.stop(end); return source;
}

export function createMusicBuses(audio, musicVolume = .32, voiceVolume = 1) {
  if (![musicVolume,voiceVolume].every(v => Number.isFinite(v) && v >= 0 && v <= 1.5)) throw new RangeError('Invalid music volume');
  const musicBus = audio.createGain(), voiceBus = audio.createGain();
  musicBus.gain.value = musicVolume; voiceBus.gain.value = voiceVolume;
  musicBus.connect(audio.destination); voiceBus.connect(audio.destination);
  return { musicBus, voiceBus };
}

export class MusicAudioEngine {
  constructor(audioContext, { voicePack, onFrame = () => {}, displayLatencySeconds = () => 0 } = {}) {
    this.audio = audioContext; this.voicePack = voicePack; this.onFrame = onFrame;
    this.displayLatencySeconds = displayLatencySeconds; this.sources = new Set(); this.playing = false;
  }
  setVoicePack(pack) { this.voicePack = pack; }
  setVolumes(music,voice) {
    if (![music,voice].every(v=>Number.isFinite(v)&&v>=0&&v<=1.5)) throw new RangeError('Invalid music volume');
    this.context?.musicBus.gain.setTargetAtTime?.(music,this.audio.currentTime,.02);
    this.context?.voiceBus.gain.setTargetAtTime?.(voice,this.audio.currentTime,.02);
  }
  start({ compiled, musicAsset, startMode, delayBeats, repetitions = 1, countInBars = 0, countEnabled = true, metronome = false,
    voiceOffsetMs = 0, wordOffsetsMs = {}, musicVolume = .32, voiceVolume = 1 }) {
    this.stop();
    if (!musicAsset?.buffer || !this.voicePack) throw new Error('Music or voice is not loaded');
    if (Math.abs(musicAsset.buffer.duration-compiled.transport.duration) > .05) throw new Error('Music buffer and timing map do not match');
    const schedule = musicJobs(compiled, repetitions, { countInBars, countEnabled, metronome, voiceOffsetMs, wordOffsetsMs, startMode, delayBeats });
    this.plan = compiled; this.schedule = schedule; this.origin = this.audio.currentTime;
    this.context = { ...createMusicBuses(this.audio,musicVolume,voiceVolume), buffer: musicAsset.buffer,
      voicePack: this.voicePack, voiceOffsetMs, wordOffsetsMs };
    this.cursor = 0; this.playing = true;
    this.scheduleAhead(); this.timer = setInterval(() => this.scheduleAhead(),50); this.frame();
    return this.origin + schedule.start;
  }
  scheduleAhead() {
    if (!this.playing) return;
    const now = this.audio.currentTime - this.origin;
    if (now >= this.schedule.end) { this.stop(); return; }
    const jobs = this.schedule.jobs;
    while (this.cursor < jobs.length && jobs[this.cursor].at-.2 <= now+.35) {
      const job = jobs[this.cursor++];
      // A suspended tab must not burst old words when the clock resumes.
      if (job.at < now-.05) { this.stop(); return; }
      const node = scheduleMusicJob(this.audio,job,this.origin,this.context);
      if (node) {
        this.sources.add(node);
        node.addEventListener?.('ended',()=>this.sources.delete(node),{once:true});
      }
    }
  }
  frame() {
    if (!this.playing) return;
    const latency = this.displayLatencySeconds();
    const elapsed = this.audio.currentTime-this.origin-(Number.isFinite(latency)&&latency>0 ? latency : 0)-this.schedule.start;
    if (elapsed < 0) {
      const event = this.schedule.startMode === 'count-first'
        ? this.schedule.jobs.filter(job=>job.kind==='voice'&&job.at<=elapsed+this.schedule.start).at(-1)?.event : null;
      this.onFrame({ playing:true,countIn:!event,event:event??null,originalTick:null });
    } else if (elapsed + this.schedule.start < this.schedule.countStart) {
      this.onFrame({ playing:true,countIn:true,listening:true,event:null,originalTick:null });
    }
    else {
      const iteration = Math.min(this.schedule.repetitions-1,Math.floor(elapsed/this.plan.transport.duration));
      const tick = this.plan.transport.tickAt(elapsed,iteration);
      let event = null;
      for (const candidate of this.plan.events) { if(candidate.absoluteTick<=tick) event=candidate; else break; }
      if(this.plan.routineEndTick!==undefined&&tick>=this.plan.routineEndTick)event=null;
      const listening=this.schedule.startMode==='music-first'&&this.plan.routineStartTick!==undefined&&tick<this.plan.routineStartTick;
      this.onFrame({ playing:true,countIn:listening,listening,event,originalTick:tick,iteration });
    }
    this.raf = requestAnimationFrame(()=>this.frame());
  }
  stop() {
    this.playing = false;
    clearInterval(this.timer); if(this.raf) cancelAnimationFrame(this.raf);
    this.timer = null; this.raf = null;
    for(const node of this.sources) { try {node.stop();} catch {} }
    this.sources.clear();
    this.context?.musicBus.disconnect?.(); this.context?.voiceBus.disconnect?.(); this.context = null;
    this.onFrame({playing:false,event:null,originalTick:null});
  }
}
