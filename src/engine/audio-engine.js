import { TICKS_PER_BEAT } from './dance-profiles.js';
import { eventTimeSeconds } from './rhythm-compiler.js';
import { constantTempo } from './tempo-map.js';
import { scheduleVoiceEvent } from './voice-pack-loader.js';

const DEFAULT_LOOKAHEAD_SECONDS = 0.35;

// D72 小節を数える: 各小節の頭の「1」を小節の番号の語に替える（1-2-3 → 2-2-3 → … → 8-2-3 → 1-2-3）。
// 語は声にもとからある数の語（one〜eight）だけ。予約の時刻は替えない（同じ event・同じ tick・同じ時刻の計算で、選ぶ語だけが替わる）。
export const BAR_COUNT_WORDS = Object.freeze(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']);

// 鳴らし始め（範囲の頭を含む小節）から数えた小節の番号（0 始まり・8 で 1 周しない生の値）。
export function barOrdinal({ tick, iteration = 0, rangeStartTick = 0, rangeDurationTicks, beatsPerBar }) {
  const barTicks = beatsPerBar * TICKS_PER_BEAT;
  const alignedStart = Math.floor(rangeStartTick / barTicks) * barTicks;
  return Math.floor((tick - alignedStart + iteration * rangeDurationTicks) / barTicks);
}

// 鳴らす語。小節を数える時だけ、小節の頭（強拍）に置かれた「1」（voiceKey 'one'）を番号の語にする。それ以外はもとの語のまま。
export function spokenVoiceKey(event, { barCounting = false, iteration = 0, rangeStartTick = 0, rangeDurationTicks, beatsPerBar }) {
  if (!barCounting || event.voiceKey !== 'one') return event.voiceKey;
  if (event.absoluteTick % (beatsPerBar * TICKS_PER_BEAT) !== 0) return event.voiceKey;
  const ordinal = barOrdinal({ tick: event.absoluteTick, iteration, rangeStartTick, rangeDurationTicks, beatsPerBar });
  return BAR_COUNT_WORDS[positiveModulo(ordinal, BAR_COUNT_WORDS.length)];
}

// tempo は省略可（既定は constantTempo(bpm)）。既定は検査の後で作る（引数の既定値にすると
// 既存の検査より先に評価され、エラーの順番が変わるため）。BPM の検査は constantTempo が同じ文言で行う。
export function patternDurationSeconds(durationTicks, bpm, tempo) {
  if (!(durationTicks > 0)) throw new RangeError('Pattern duration must be greater than zero');
  tempo ??= constantTempo(bpm);
  return tempo.tickToSeconds(durationTicks);
}

export function eventOccurrenceTime({ event, iteration, durationTicks, bpm, startTime }) {
  const loopTick = event.absoluteTick + iteration * durationTicks;
  return eventTimeSeconds({ ...event, absoluteTick: loopTick }, bpm, startTime);
}

export function rangeEventTimeSeconds({ event, iteration, rangeStartTick, rangeDurationTicks, bpm, startTime, tempo }) {
  const localTick = event.absoluteTick - rangeStartTick + iteration * rangeDurationTicks;
  tempo ??= constantTempo(bpm);
  return startTime + tempo.tickToSeconds(localTick);
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

// D73 声とメトロノームの大きさ: 0〜1 の倍率（既定 1＝今までの大きさ）。それぞれ 1 本の出口（GainNode）にまとめて掛ける。
// 予約・時刻には触らない（出口の倍率だけ。鳴っている最中に変えても予約し直さない）。
export function clampVolume(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(1, Math.max(0, number));
}

export class PracticeAudioEngine {
  // displayLatencySeconds: 画面のハイライトだけを遅らせる秒数（Bluetooth の outputLatency。Ruling 29）。
  // frame() の経過時間にだけ効き、予約（scheduleAhead・scheduleClick・start の戻り値）には使わない。
  constructor(audioContext, { voicePack, onFrame = () => {}, lookaheadSeconds = DEFAULT_LOOKAHEAD_SECONDS, displayLatencySeconds = () => 0 } = {}) {
    this.audioContext = audioContext;
    this.voicePack = voicePack;
    this.onFrame = onFrame;
    this.displayLatencySeconds = displayLatencySeconds;
    this.lookaheadSeconds = lookaheadSeconds;
    this.sources = new Set();
    this.playing = false;
    this.volumes = { voice: 1, click: 1 };
    this.buses = null;
  }

  // 声・メトロノームの出口（最初に鳴らす時に 1 回だけ作る。同じ AudioContext ではエンジンを使い回す）
  ensureBuses() {
    if (this.buses) return this.buses;
    const voice = this.audioContext.createGain();
    const click = this.audioContext.createGain();
    voice.gain.value = this.volumes.voice;
    click.gain.value = this.volumes.click;
    voice.connect(this.audioContext.destination);
    click.connect(this.audioContext.destination);
    this.buses = { voice, click };
    return this.buses;
  }

  // 鳴っている最中でもすぐ効く（出口の倍率を替えるだけ）
  setVolumes({ voice = this.volumes.voice, click = this.volumes.click } = {}) {
    this.volumes = { voice: clampVolume(voice), click: clampVolume(click) };
    if (this.buses) {
      this.buses.voice.gain.value = this.volumes.voice;
      this.buses.click.gain.value = this.volumes.click;
    }
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
    rangeEndTick = compiled.durationTicks,
    tempo,
    barCounting = false,
    voiceVolume,
    clickVolume
  }) {
    this.stop();
    if (voiceVolume !== undefined || clickVolume !== undefined) this.setVolumes({ voice: voiceVolume, click: clickVolume });
    if (!this.voicePack) throw new Error('Voice pack is not loaded');
    if (!(rangeStartTick >= 0 && rangeEndTick > rangeStartTick && rangeEndTick <= compiled.durationTicks)) {
      throw new RangeError('Invalid playback range');
    }
    const countInBeats = countInBeatCount(compiled.profile.beatsPerBar, countInBars);
    // 既定のテンポは stop() と既存の検査（範囲・はじめの合図の小節数）の後で作る。
    // 拍の地図（beatMap）はまだ再生に使えない: 下の計算は「範囲の頭からの tick」を位置として
    // tickToSeconds に渡しており、一定テンポでしか正しくない。対応するまでは黙って誤った時刻にせず止める。
    if (tempo != null && tempo.kind !== 'constant') {
      throw new Error('beat-map tempo is not supported by the playback engine yet');
    }
    tempo ??= constantTempo(bpm);
    this.ensureBuses();   // 検査（範囲・テンポ）の後に作る（エラーの順番を変えない）
    const beatSeconds = tempo.tickToSeconds(TICKS_PER_BEAT);
    const patternStartTime = this.audioContext.currentTime + 0.12 + countInBeats * beatSeconds;
    const countInStartTime = patternStartTime - countInBeats * beatSeconds;

    this.state = {
      compiled,
      bpm,
      tempo,
      loop,
      metronome,
      voiceOffsetMs,
      wordOffsetsMs,
      rangeStartTick,
      rangeEndTick,
      rangeDurationTicks: rangeEndTick - rangeStartTick,
      barCounting: barCounting === true,
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
    const { bpm, tempo, loop, startTime } = this.state;
    const duration = patternDurationSeconds(this.state.rangeDurationTicks, bpm, tempo);
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
    const { compiled, bpm, tempo, loop, metronome, voiceOffsetMs, wordOffsetsMs, startTime, rangeStartTick, rangeEndTick, rangeDurationTicks } = this.state;

    if (metronome) {
      const firstBeat = Math.ceil(rangeStartTick / TICKS_PER_BEAT);
      for (let beat = firstBeat; beat * TICKS_PER_BEAT < rangeEndTick; beat += 1) {
        const originalTick = beat * TICKS_PER_BEAT;
        const localTick = originalTick - rangeStartTick + iteration * rangeDurationTicks;
        const time = startTime + tempo.tickToSeconds(localTick);
        this.scheduleClick(time, beat % compiled.profile.beatsPerBar === 0);
      }
    }

    const voiceEvents = compiled.events.filter(item => item.voiceKey && item.absoluteTick >= rangeStartTick && item.absoluteTick < rangeEndTick);
    // D72: 鳴らす語（小節を数えない時はもとの語そのもの＝予約は前と同じ）。語ごとのタイミングは鳴らす語のもの
    const barOptions = { barCounting: this.state.barCounting, rangeStartTick, rangeDurationTicks, beatsPerBar: compiled.profile.beatsPerBar };
    const spoken = (event, eventIteration) => spokenVoiceKey(event, { ...barOptions, iteration: eventIteration });
    for (const [eventIndex, event] of voiceEvents.entries()) {
      const targetTime = rangeEventTimeSeconds({ event, iteration, rangeStartTick, rangeDurationTicks, bpm, startTime, tempo });
      const nextEvent = voiceEvents[eventIndex + 1] ?? (loop ? voiceEvents[0] : null);
      const nextIteration = eventIndex + 1 < voiceEvents.length ? iteration : iteration + 1;
      const endTime = nextEvent
        ? rangeEventTimeSeconds({ event: nextEvent, iteration: nextIteration, rangeStartTick, rangeDurationTicks, bpm, startTime, tempo })
          + effectiveVoiceOffsetMs(voiceOffsetMs, wordOffsetsMs, spoken(nextEvent, nextIteration)) / 1000
        : null;
      const voiceKey = spoken(event, iteration);
      const source = scheduleVoiceEvent({
        audioContext: this.audioContext,
        destination: this.ensureBuses().voice,
        voicePack: this.voicePack,
        event: voiceKey === event.voiceKey ? event : { ...event, voiceKey },
        targetTime,
        userOffsetMs: effectiveVoiceOffsetMs(voiceOffsetMs, wordOffsetsMs, voiceKey),
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
    oscillator.connect(gain).connect(this.ensureBuses().click);
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
    const { compiled, bpm, tempo, loop, startTime, rangeStartTick, rangeEndTick, rangeDurationTicks } = this.state;
    const duration = patternDurationSeconds(rangeDurationTicks, bpm, tempo);
    const elapsed = this.audioContext.currentTime - safeLatency(this.displayLatencySeconds()) - startTime;
    if (elapsed < 0) {
      // 夜間便 B-5（Ruling 124・監査 #8）: はじめの合図の進み＝最初の語までの tick（負の数。-1 拍なら -960）。同じ時計・同じ frame から出す（新しいタイマーは作らない）
      const leadTick = tempo.secondsToTick(elapsed);
      this.onFrame({ playing: true, event: null, progress: 0, countIn: true, originalTick: null, leadTick });
    } else {
      const localSeconds = loop ? elapsed % duration : Math.min(elapsed, duration);
      const localTick = tempo.secondsToTick(localSeconds);
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
        countIn: false,
        // D72: 小節を数える時だけ、今の小節の番号（1〜8）。同じ frame の tick から（新しい時計は作らない）
        ...(this.state.barCounting ? { bar: positiveModulo(barOrdinal({ tick: originalTick, iteration, rangeStartTick, rangeDurationTicks, beatsPerBar: compiled.profile.beatsPerBar }), BAR_COUNT_WORDS.length) + 1 } : {})
      });
    }
    this.frameId = requestAnimationFrame(() => this.frame());
  }
}

// 0 のときは currentTime - 0 - startTime が currentTime - startTime とビット単位で同じ（ゴールデン不変）。
function safeLatency(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}
