import { TICKS_PER_BEAT } from './dance-profiles.js';

export function buildFigureTimeline(compiled, figureIndex) {
  const figure = compiled.figures[figureIndex];
  if (!figure) throw new RangeError(`Figure ${figureIndex} does not exist`);

  const barTicks = compiled.profile.beatsPerBar * TICKS_PER_BEAT;
  const firstBeatTick = Math.floor(figure.startTick / TICKS_PER_BEAT) * TICKS_PER_BEAT;
  const endBeatTick = Math.ceil(figure.endTick / TICKS_PER_BEAT) * TICKS_PER_BEAT;
  const figureEvents = compiled.events.filter(event => event.figureIndex === figureIndex);
  const beats = [];

  for (let beatTick = firstBeatTick; beatTick < endBeatTick; beatTick += TICKS_PER_BEAT) {
    const tickInBar = ((beatTick % barTicks) + barTicks) % barTicks;
    beats.push({
      startTick: beatTick,
      beatInBar: Math.floor(tickInBar / TICKS_PER_BEAT) + 1,
      barIndex: Math.floor(beatTick / barTicks),
      startsBar: tickInBar === 0,
      events: figureEvents
        .filter(event => event.absoluteTick >= beatTick && event.absoluteTick < beatTick + TICKS_PER_BEAT)
        .map(event => ({
          token: event.token,
          offset: (event.absoluteTick - beatTick) / TICKS_PER_BEAT
        }))
    });
  }

  return { figure, beats };
}

export function beatPositionAtTick(tick) {
  if (!Number.isFinite(tick)) return null;
  const startTick = Math.floor(tick / TICKS_PER_BEAT) * TICKS_PER_BEAT;
  return {
    startTick,
    progress: (tick - startTick) / TICKS_PER_BEAT
  };
}
