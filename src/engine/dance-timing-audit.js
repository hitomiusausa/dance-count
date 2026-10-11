import { DANCE_PROFILES } from './dance-profiles.js';
import { compileRhythm } from './rhythm-compiler.js';
import { constantTempo } from './tempo-map.js';

const SUBDIVISIONS = new Set(['&', 'a', 'e']);

export function atomicRhythmCases(profile) {
  const bases = profile.allowedTokens.filter(token => !SUBDIVISIONS.has(token));
  const modifiers = profile.allowedTokens.filter(token => SUBDIVISIONS.has(token));
  const candidates = new Set(bases);

  for (const first of bases) {
    for (const next of bases) {
      candidates.add(`${first}${next}`);
      for (const modifier of modifiers) candidates.add(`${first}${modifier}${next}`);
    }
  }

  return [...candidates].filter(counts => {
    try {
      compileRhythm({ danceId: profile.id, counts });
      return true;
    } catch {
      return false;
    }
  }).sort();
}

export function allDanceAtomicCases(profiles = DANCE_PROFILES) {
  return Object.values(profiles).flatMap(profile => atomicRhythmCases(profile).map(counts => ({ danceId: profile.id, counts })));
}

export function auditCompiledTransitions(compiled, bpm, postOnsetMsByVoice, { loop = false } = {}) {
  const transitions = [];
  const events = compiled.events.filter(event => event.voiceKey);
  for (let index = 0; index < events.length - 1; index += 1) {
    transitions.push(transition(events[index], events[index + 1], bpm, postOnsetMsByVoice));
  }
  if (loop && events.length) {
    const firstNextLoop = { ...events[0], absoluteTick: events[0].absoluteTick + compiled.durationTicks };
    transitions.push(transition(events.at(-1), firstNextLoop, bpm, postOnsetMsByVoice));
  }
  return transitions;
}

export function expectedEventTimeMs(event, bpm) {
  return constantTempo(bpm).tickToMs(event.absoluteTick);
}

function transition(from, to, bpm, postOnsetMsByVoice) {
  const gapTicks = to.absoluteTick - from.absoluteTick;
  const gapMs = constantTempo(bpm).tickToMs(gapTicks);
  const activeAfterOnsetMs = Number(postOnsetMsByVoice[from.voiceKey] ?? 0);
  return {
    from: from.voiceKey,
    to: to.voiceKey,
    gapTicks,
    gapMs,
    overlapMs: Math.max(0, activeAfterOnsetMs - gapMs)
  };
}
