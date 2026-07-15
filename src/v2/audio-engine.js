import { TICKS_PER_BEAT } from './dance-profiles.js';
import { eventTimeSeconds } from './rhythm-compiler.js';
import { scheduleVoiceEvent } from './voice-pack-loader.js?v=20260713-overlap-fade';

const DEFAULT_LOOKAHEAD_SECONDS = 0.35;

export function patternDurationSeconds(durationTicks, bpm) {
  if (!(durationTicks > 0)) throw new RangeError('Pattern duration must be greater than zero');
  if (!(bpm > 0)) throw new RangeError('BPM must be greater than zero');
  return durationTicks / TICKS_PER_BEAT * 60 / bpm;
}

export function eventOccurrenceTime({ event, iteration, durationTicks, bpm, startTime }) {
  const loopTick = event.absoluteTick + iteration * durationTicks;
  return eventTimeSeconds({ ...event, absoluteTick: loopTick }, bpm, startTime);
}

export function rangeEventTimeSeconds({ event, iteration, rangeStartTick, rangeDurationTicks, bpm, startTime }) {
  const localTick = event.absoluteTick - rangeStartTick + iteration * rangeDurationTicks;
  return startTime + localTick / TICKS_PER_BEAT * 60 / bpm;
}

export function isAccentedBeat(beatIndex, beatsPerBar) {
  return positiveModulo(beatIndex, beatsPerBar) === 0;
}

export function countInBeatCount(beatsPerBar, bars) {
  if (!Number.isInteger(bars) || bars < 0 || bars > 2) throw new RangeError('Count-in bars must be 0, 1, or 2');
  return beatsPerBar * bars;
}

export function effectiveVoiceOffsetMs(globalOffsetMs = 0, wordOffsetsMs = {}, voiceKey = null) {
  const global = Number.isFinite(Number(globalOffsetMs)) ? Number(globalOffsetMs) : 0;
  const word = voiceKey && Number.isFinite(Number(wordOffsetsMs?.[voiceKey])) ? Number(wordOffsetsMs[voiceKey]) : 0;
  return global + word;
}

export class PracticeAudioEngine {
  constructor(audioContext, { voicePack, onFrame = () => {}, lookaheadSeconds = DEFAULT_LOOKAHEAD_SECONDS } = {}) {
    this.audioContext = audioContext;
    this.voicePack = voicePack;
    this.onFrame = onFrame;
    this.lookaheadSeconds = lookaheadSeconds;
    this.sources = new Set();
    this.playing = false;
  }

  setVoicePack(voicePack) {
    this.voicePack = voicePack;
  }

  start({
    compiled,
    bpm,
    loop = true,
    metronome = true,
    voiceOffsetMs = 0,
    wordOffsetsMs = {},
    countInBars = 1,
    rangeStartTick = 0,
    rangeEndTick = compiled.durationTicks
  }) {
    this.stop();
    if (!this.voicePack) throw new Error('Voice pack is not loaded');
    if (!(rangeStartTick >= 0 && rangeEndTick > rangeStartTick && rangeEndTick <= compiled.durationTicks)) {
      throw new RangeError('Invalid playback range');
    }
    const beatSeconds = 60 / bpm;
    const countInBeats = countInBeatCount(compiled.profile.beatsPerBar, countInBars);
    const patternStartTime = this.audioContext.currentTime + 0.12 + countInBeats * beatSeconds;
    const countInStartTime = patternStartTime - countInBeats * beatSeconds;

    this.state = {
      compiled,
      bpm,
      loop,
      metronome,
      voiceOffsetMs,
      wordOffsetsMs,
      rangeStartTick,
      rangeEndTick,
      rangeDurationTicks: rangeEndTick - rangeStartTick,
      startTime: patternStartTime,
      nextIteration: 0,
      scheduledThroughIteration: -1
    };
    this.playing = true;

    if (countInBeats > 0) {
      const rangeStartBeat = Math.floor(rangeStartTick / TICKS_PER_BEAT);
      for (let beat = 0; beat < countInBeats; beat += 1) {
        const originalBeat = rangeStartBeat - countInBeats + beat;
        this.scheduleClick(countInStartTime + beat * beatSeconds, isAccentedBeat(originalBeat, compiled.profile.beatsPerBar));
      }
    }

    this.scheduleAhead();
    this.schedulerId = setInterval(() => this.scheduleAhead(), 50);
    this.frame();
    return patternStartTime;
  }

  stop() {
    this.playing = false;
    if (this.schedulerId) clearInterval(this.schedulerId);
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.schedulerId = null;
    this.frameId = null;
    for (const source of this.sources) {
      try { source.stop(); } catch { /* source may already have ended */ }
    }
    this.sources.clear();
    this.onFrame({ playing: false, event: null, progress: 0 });
  }

  scheduleAhead() {
    if (!this.playing) return;
    const { compiled, bpm, loop, startTime } = this.state;
    const duration = patternDurationSeconds(this.state.rangeDurationTicks, bpm);
    const horizon = this.audioContext.currentTime + this.lookaheadSeconds;

    if (!loop && this.state.nextIteration > 0) {
      if (this.audioContext.currentTime > startTime + duration) this.stop();
      return;
    }

    while (startTime + this.state.nextIteration * duration <= horizon) {
      const iteration = this.state.nextIteration;
      this.scheduleIteration(iteration);
      this.state.scheduledThroughIteration = iteration;
      this.state.nextIteration += 1;
      if (!loop) break;
    }

  }

  scheduleIteration(iteration) {
    const { compiled, bpm, loop, metronome, voiceOffsetMs, wordOffsetsMs, startTime, rangeStartTick, rangeEndTick, rangeDurationTicks } = this.state;

    if (metronome) {
      const firstBeat = Math.ceil(rangeStartTick / TICKS_PER_BEAT);
      for (let beat = firstBeat; beat * TICKS_PER_BEAT < rangeEndTick; beat += 1) {
        const originalTick = beat * TICKS_PER_BEAT;
        const localTick = originalTick - rangeStartTick + iteration * rangeDurationTicks;
        const time = startTime + localTick / TICKS_PER_BEAT * 60 / bpm;
        this.scheduleClick(time, beat % compiled.profile.beatsPerBar === 0);
      }
    }

    const voiceEvents = compiled.events.filter(item => item.voiceKey && item.absoluteTick >= rangeStartTick && item.absoluteTick < rangeEndTick);
    for (const [eventIndex, event] of voiceEvents.entries()) {
      const targetTime = rangeEventTimeSeconds({ event, iteration, rangeStartTick, rangeDurationTicks, bpm, startTime });
      const nextEvent = voiceEvents[eventIndex + 1] ?? (loop ? voiceEvents[0] : null);
      const nextIteration = eventIndex + 1 < voiceEvents.length ? iteration : iteration + 1;
      const endTime = nextEvent
        ? rangeEventTimeSeconds({ event: nextEvent, iteration: nextIteration, rangeStartTick, rangeDurationTicks, bpm, startTime })
          + effectiveVoiceOffsetMs(voiceOffsetMs, wordOffsetsMs, nextEvent.voiceKey) / 1000
        : null;
      const source = scheduleVoiceEvent({
        audioContext: this.audioContext,
        voicePack: this.voicePack,
        event,
        targetTime,
        userOffsetMs: effectiveVoiceOffsetMs(voiceOffsetMs, wordOffsetsMs, event.voiceKey),
        endTime
      });
      this.trackSource(source);
    }
  }

  scheduleClick(time, accent) {
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.frequency.value = accent ? 1320 : 880;
    gain.gain.setValueAtTime(accent ? 0.18 : 0.10, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
    oscillator.connect(gain).connect(this.audioContext.destination);
    oscillator.start(time);
    oscillator.stop(time + 0.04);
    this.trackSource(oscillator);
  }

  trackSource(source) {
    if (!source) return;
    this.sources.add(source);
    source.addEventListener?.('ended', () => this.sources.delete(source), { once: true });
  }

  frame() {
    if (!this.playing) return;
    const { compiled, bpm, loop, startTime, rangeStartTick, rangeEndTick, rangeDurationTicks } = this.state;
    const duration = patternDurationSeconds(rangeDurationTicks, bpm);
    const elapsed = this.audioContext.currentTime - startTime;
    if (elapsed < 0) {
      this.onFrame({ playing: true, event: null, progress: 0, countIn: true, originalTick: null });
    } else {
      const localSeconds = loop ? elapsed % duration : Math.min(elapsed, duration);
      const localTick = localSeconds / (60 / bpm) * TICKS_PER_BEAT;
      const originalTick = rangeStartTick + localTick;
      const iteration = Math.floor(elapsed / duration);
      const rangeEvents = compiled.events.filter(event => event.absoluteTick >= rangeStartTick && event.absoluteTick < rangeEndTick);
      let activeEvent = rangeEvents[0] ?? null;
      for (const event of rangeEvents) {
        if (event.absoluteTick <= originalTick) activeEvent = event;
        else break;
      }
      this.onFrame({
        playing: true,
        event: activeEvent,
        progress: Math.min(1, localSeconds / duration),
        originalTick,
        iteration,
        countIn: false
      });
    }
    this.frameId = requestAnimationFrame(() => this.frame());
  }
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}
