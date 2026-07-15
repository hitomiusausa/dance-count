import { getDanceProfile, TICKS_PER_BEAT } from './dance-profiles.js';
import { parseRhythm, RhythmSyntaxError } from './rhythm-parser.js';

const SUBDIVISION_TICKS = Object.freeze({ '&': 480, e: 480, a: 240 });

export function compileRhythm({ danceId, counts, startTick = 0, leadingSubdivision = null }) {
  const profile = getDanceProfile(danceId);
  const tokens = parseRhythm(counts);
  for (const token of tokens) {
    if (!profile.allowedTokens.includes(token.value)) {
      throw new RhythmSyntaxError(`Count "${token.value}" is not valid for ${profile.name}`, {
        index: token.sourceIndex,
        token: token.value,
        danceId,
        code: 'TOKEN_NOT_ALLOWED_FOR_DANCE'
      });
    }
  }
  const events = [];
  const warnings = [];
  let cursor = startTick;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const value = token.value;

    if (isSubdivision(value)) {
      if (index === 0) {
        cursor = compileLeadingSubdivision({
          value,
          cursor,
          leadingSubdivision,
          events,
          token,
          profile
        });
        continue;
      }
      throw new RhythmSyntaxError(`Subdivision "${value}" must follow a beat token`, {
        index: token.sourceIndex,
        token: value
      });
    }

    const baseTicks = baseDurationTicks(value, profile);
    const next = tokens[index + 1]?.value;
    const subdivisionTicks = isSubdivision(next) ? SUBDIVISION_TICKS[next] : 0;
    const primaryTicks = baseTicks - subdivisionTicks;

    if (primaryTicks <= 0) {
      throw new RhythmSyntaxError(
        `"${value}${next}" leaves no duration for "${value}" in ${profile.name}`,
        { index: token.sourceIndex, token: value, next }
      );
    }

    events.push(makeEvent(value, cursor, profile));
    cursor += primaryTicks;

    if (subdivisionTicks) {
      const modifier = tokens[index + 1];
      events.push(makeEvent(modifier.value, cursor, profile));
      cursor += subdivisionTicks;
      index += 1;
    }
  }

  const barTicks = profile.beatsPerBar * TICKS_PER_BEAT;
  const consumedTicks = cursor - startTick;
  if (consumedTicks % barTicks !== 0) {
    warnings.push({
      code: 'INCOMPLETE_BAR',
      remainderTicks: consumedTicks % barTicks,
      message: `${profile.name}の小節途中でカウントが終わります`
    });
  }

  return { profile, events, startTick, endTick: cursor, durationTicks: consumedTicks, warnings };
}

export function compileRoutine({ danceId, figures, leadingSubdivision = null }) {
  const profile = getDanceProfile(danceId);
  const events = [];
  const warnings = [];
  const compiledFigures = [];
  let cursor = 0;

  for (const [figureIndex, figure] of figures.entries()) {
    let compiled;
    try {
      compiled = compileRhythm({
        danceId,
        counts: figure.counts,
        startTick: cursor,
        leadingSubdivision: figureIndex === 0 ? leadingSubdivision : null
      });
    } catch (error) {
      error.details = { ...error.details, figureId: figure.id, figureIndex };
      throw error;
    }
    const figureEvents = compiled.events.map(event => ({
      ...event,
      figureId: figure.id,
      figureIndex,
      figureName: figure.name
    }));
    events.push(...figureEvents);
    warnings.push(...compiled.warnings.map(warning => ({ ...warning, figureId: figure.id, figureIndex })));
    compiledFigures.push({
      id: figure.id,
      name: figure.name,
      startTick: cursor,
      endTick: compiled.endTick
    });
    cursor = compiled.endTick;
  }

  return {
    profile,
    events,
    figures: compiledFigures,
    durationTicks: cursor,
    warnings
  };
}

export function eventTimeSeconds(event, bpm, transportStartTime = 0) {
  if (!(bpm > 0)) throw new RangeError('BPM must be greater than zero');
  return transportStartTime + (event.absoluteTick / TICKS_PER_BEAT) * (60 / bpm);
}

function compileLeadingSubdivision({ value, cursor, leadingSubdivision, events, token, profile }) {
  const ticks = SUBDIVISION_TICKS[value];
  if (leadingSubdivision !== 'pickup' && leadingSubdivision !== 'currentBeatSubdivision') {
    throw new RhythmSyntaxError(
      `Leading "${value}" is ambiguous; specify pickup or currentBeatSubdivision`,
      { index: token.sourceIndex, token: value, code: 'AMBIGUOUS_LEADING_SUBDIVISION' }
    );
  }
  if (leadingSubdivision === 'pickup') cursor -= ticks;
  events.push(makeEvent(value, cursor, profile, leadingSubdivision));
  return cursor + ticks;
}

function baseDurationTicks(token, profile) {
  if (token === '@' || /^[1-9]$/.test(token)) return TICKS_PER_BEAT;
  if (token === 'S') return TICKS_PER_BEAT * (profile.sambaSQ ? 1 : 2);
  if (token === 'Q') return TICKS_PER_BEAT * (profile.sambaSQ ? 0.5 : 1);
  throw new RhythmSyntaxError(`Cannot determine duration for "${token}"`);
}

function isSubdivision(token) {
  return Object.hasOwn(SUBDIVISION_TICKS, token);
}

function makeEvent(token, absoluteTick, profile, placement = null) {
  const barTicks = profile.beatsPerBar * TICKS_PER_BEAT;
  const normalized = ((absoluteTick % barTicks) + barTicks) % barTicks;
  return {
    token,
    voiceKey: voiceKey(token),
    absoluteTick,
    barIndex: Math.floor(absoluteTick / barTicks),
    tickInBar: normalized,
    beatInBar: normalized / TICKS_PER_BEAT,
    placement
  };
}

function voiceKey(token) {
  const numbers = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  if (/^[1-9]$/.test(token)) return numbers[Number(token)];
  if (token === 'S') return 'slow';
  if (token === 'Q') return 'quick';
  if (token === '&' || token === 'e') return 'and';
  if (token === 'a') return 'ah';
  return null;
}
