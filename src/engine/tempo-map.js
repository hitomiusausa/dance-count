// テンポ写像（Ruling 20）: 整数 tick ↔ 時刻 の変換はこのファイルだけで行う。
// constant の式は移設前の audio-engine.js / dance-timing-audit.js と演算順まで同じにしてある
// （浮動小数の丸めまで一致させ、tempo-map 集約で鳴る時刻が1ビットも変わらないようにするため）。
import { TICKS_PER_BEAT } from './dance-profiles.js';

/**
 * 曲の口（Ruling 20・型だけ。v1 は実データなし）。
 * @typedef {{ kind: 'constant', bpm: number, firstBeatMs: number } | { kind: 'beatMap', beatsMs: number[] }} TrackTempo
 * @typedef {{ kind: 'CC0' | 'PD-recording' | 'CC-BY', source: string, url: string, note: string }} TrackLicense
 * @typedef {{ id: string, danceId: string, title: string, file: string, durationMs: number, beatsPerBar: number,
 *   tempo: TrackTempo, license: TrackLicense, measuredAt: string }} TrackProfile
 */

/**
 * @typedef {object} TempoMap
 * @property {'constant' | 'beatMap'} kind
 * @property {(tick: number) => number} tickToMs
 * @property {(ms: number) => number} msToTick
 * @property {(tick: number) => number} tickToSeconds
 * @property {(seconds: number) => number} secondsToTick
 */

/** @returns {TempoMap & { kind: 'constant', bpm: number }} */
export function constantTempo(bpm) {
  if (!(bpm > 0) || !Number.isFinite(Number(bpm))) throw new RangeError('BPM must be greater than zero');
  return Object.freeze({
    kind: 'constant',
    bpm,
    tickToMs: tick => tick / TICKS_PER_BEAT * 60_000 / bpm,
    msToTick: ms => ms / (60_000 / bpm) * TICKS_PER_BEAT,
    tickToSeconds: tick => tick / TICKS_PER_BEAT * 60 / bpm,
    secondsToTick: seconds => seconds / (60 / bpm) * TICKS_PER_BEAT
  });
}

/**
 * 実測した拍の時刻（ms）の間を区分線形で補間する。範囲外は端の拍間隔で外挿する
 * （最後の拍より後は最後の間隔、最初の拍より前＝弱起は最初の間隔）。
 * @returns {TempoMap & { kind: 'beatMap', beatsPerBar: number }}
 */
export function beatMapTempo(beatsMs, beatsPerBar) {
  if (!Array.isArray(beatsMs) || beatsMs.length < 2) throw new RangeError('A beat map needs at least two beats');
  if (!Number.isInteger(beatsPerBar) || beatsPerBar < 1) throw new RangeError('beatsPerBar must be a positive integer');
  for (let index = 0; index < beatsMs.length; index += 1) {
    if (!Number.isFinite(beatsMs[index])) throw new RangeError(`Beat ${index} is not a finite time`);
    if (index > 0 && !(beatsMs[index] > beatsMs[index - 1])) throw new RangeError(`Beat ${index} is not after beat ${index - 1}`);
  }
  const beats = Object.freeze([...beatsMs]);
  const last = beats.length - 1;

  const tickToMs = tick => {
    const beat = tick / TICKS_PER_BEAT;
    const index = Math.min(Math.max(Math.floor(beat), 0), last - 1);
    return beats[index] + (beat - index) * (beats[index + 1] - beats[index]);
  };
  const msToTick = ms => {
    let index = 0;
    if (ms >= beats[last]) index = last - 1;
    else if (ms > beats[0]) while (beats[index + 1] <= ms) index += 1;
    return (index + (ms - beats[index]) / (beats[index + 1] - beats[index])) * TICKS_PER_BEAT;
  };

  return Object.freeze({
    kind: 'beatMap',
    beatsPerBar,
    tickToMs,
    msToTick,
    tickToSeconds: tick => tickToMs(tick) / 1000,
    secondsToTick: seconds => msToTick(seconds * 1000)
  });
}
