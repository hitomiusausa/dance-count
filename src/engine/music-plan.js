import { compileRhythm } from './rhythm-compiler.js';
import { beatMapTempo, sectionTransport } from './tempo-map.js';
import { TICKS_PER_BEAT } from './dance-profiles.js';

export function compileMusicPlan(track, sectionId, rate = 1) {
  const section = track.sections.find(item => item.id === sectionId);
  if (!section || !track.rates.includes(rate)) throw new RangeError('Unknown music section or speed');
  const { startTick, endTick } = section;
  const anchorTick = section.anchorTick ?? track.anchorTick;
  const maxTick = (track.beatsMs.length - 1) * TICKS_PER_BEAT;
  if (endTick > maxTick || !Number.isInteger(anchorTick)) throw new RangeError('Music range exceeds measured coverage');
  const tempo = beatMapTempo(track.beatsMs, track.beatsPerBar);
  const transport = sectionTransport(tempo, startTick, endTick, rate);
  const pattern = compileRhythm({ danceId: track.danceId, counts: track.counts });
  if (pattern.profile.beatsPerBar !== track.beatsPerBar) throw new RangeError('Music meter does not match dance');
  const events = [], leadEvents = [];
  const first = Math.floor((startTick - 2 * track.beatsPerBar * TICKS_PER_BEAT - anchorTick) / pattern.durationTicks) - 1;
  const last = Math.ceil((endTick - anchorTick) / pattern.durationTicks);
  for (let cycle = first; cycle <= last; cycle++) {
    for (const event of pattern.events) {
      const absoluteTick = anchorTick + cycle * pattern.durationTicks + event.absoluteTick;
      if (absoluteTick >= startTick && absoluteTick < endTick) events.push({ ...event, absoluteTick });
      if (absoluteTick < startTick && absoluteTick >= startTick - 2 * track.beatsPerBar * TICKS_PER_BEAT) leadEvents.push({ ...event, absoluteTick });
    }
  }
  events.sort((a,b) => a.absoluteTick - b.absoluteTick);
  leadEvents.sort((a,b) => a.absoluteTick - b.absoluteTick);
  if (!events.length) throw new RangeError('Empty music range');
  return { profile: pattern.profile, events, leadEvents, startTick, endTick, durationTicks: endTick - startTick, tempo, transport, sectionId };
}

export function musicJobs(plan, repetitions, { countInBars = 0, countEnabled = true, metronome = false, voiceOffsetMs = 0, wordOffsetsMs = {}, startMode, delayBeats = plan.profile.beatsPerBar * 2 } = {}) {
  if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 4 || ![0,1,2].includes(countInBars)) {
    throw new RangeError('Invalid music repetitions or lead-in');
  }
  if (startMode !== undefined && !['together','music-first','count-first'].includes(startMode)) throw new RangeError('Invalid music start order');
  if (!Number.isInteger(delayBeats) || delayBeats < 1 || delayBeats > 2 * plan.profile.beatsPerBar) throw new RangeError('Invalid music start delay');
  const voicedLead = countEnabled && startMode === 'count-first';
  const listening = countEnabled && startMode === 'music-first';
  const leadBeats = voicedLead ? delayBeats : startMode === undefined ? countInBars * plan.profile.beatsPerBar : 0;
  const leadSeconds = plan.transport.leadTimeAt(leadBeats * TICKS_PER_BEAT);
  const countStartOffset = listening ? plan.transport.timeAt(plan.startTick + delayBeats * TICKS_PER_BEAT) : 0;
  if (countStartOffset >= plan.transport.duration) throw new RangeError('Listening time exceeds music section');
  const jobs = [];
  const globalOffset=Number.isFinite(voiceOffsetMs)?voiceOffsetMs:0;
  const minimumOffset=Math.min(0,globalOffset,...Object.values(wordOffsetsMs).filter(Number.isFinite).map(ms=>globalOffset+ms));
  const preroll = .12 - minimumOffset/1000;
  const start = preroll + leadSeconds;
  if (voicedLead) {
    const events = plan.leadEvents.filter(event => event.absoluteTick >= plan.startTick-leadBeats*TICKS_PER_BEAT);
    events.forEach((event,index) => jobs.push({ kind:'voice', at:start+plan.transport.leadTimeAt(event.absoluteTick-plan.startTick),
      end:index+1<events.length?start+plan.transport.leadTimeAt(events[index+1].absoluteTick-plan.startTick):start,
      sectionEnd:start, event, nextVoiceKey:events[index+1]?.voiceKey ?? plan.events[0]?.voiceKey ?? null }));
  }
  for (let beat = 0; !voicedLead && beat < leadBeats; beat++) {
    jobs.push({ kind: 'click', at: preroll + plan.transport.leadTimeAt(beat * TICKS_PER_BEAT),
      accent: beat % plan.profile.beatsPerBar === 0 });
  }
  for (let iteration = 0; iteration < repetitions; iteration++) {
    const at = start + plan.transport.timeAt(plan.startTick, iteration);
    const end = start + plan.transport.timeAt(plan.endTick, iteration);
    jobs.push({ kind: 'music', at, end });
    plan.events.forEach((event,index) => {
      const target = start + plan.transport.timeAt(event.absoluteTick, iteration);
      const next = plan.events[index+1];
      const nextTarget = next ? start + plan.transport.timeAt(next.absoluteTick, iteration) : end;
      if (countEnabled && (iteration > 0 || target >= start + countStartOffset - 1e-9)) jobs.push({ kind: 'voice', at: target, end: nextTarget, sectionEnd: end, event, nextVoiceKey: next?.voiceKey ?? null });
    });
    if (metronome) {
      for (let tick = Math.ceil(plan.startTick/TICKS_PER_BEAT)*TICKS_PER_BEAT; tick < plan.endTick; tick += TICKS_PER_BEAT) {
        jobs.push({ kind: 'click', at: start + plan.transport.timeAt(tick, iteration), accent: tick/TICKS_PER_BEAT % plan.profile.beatsPerBar === 0 });
      }
    }
  }
  jobs.sort((a,b) => a.at-b.at);
  return { jobs, start, countStart: start + countStartOffset, startMode, end: start + repetitions * plan.transport.duration, repetitions };
}
