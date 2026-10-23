import { routinePlayability, type Routine } from '../routines/routine.ts';

export interface MusicFigureRange { startIndex: number; endIndex: number }

// Read the existing collection. Choosing music must never add or rewrite routines.
export function musicRoutineChoices(routines: readonly Routine[], danceId: string): Routine[] {
  return routines.filter(routine => routine.danceId === danceId && routinePlayability(routine) === 'ok');
}

// Like S5, the range belongs to this visit only. Clamp after an edited routine
// shrinks; never alter its figures or silently shorten it to the song's coverage.
export function musicFigureRange(routine: Pick<Routine, 'figures'>, range?: MusicFigureRange): MusicFigureRange {
  const last = Math.max(0, routine.figures.length - 1);
  const startIndex = Math.min(last, Math.max(0, Number.isInteger(range?.startIndex) ? range!.startIndex : 0));
  const endIndex = Math.min(last, Math.max(startIndex, Number.isInteger(range?.endIndex) ? range!.endIndex : last));
  return { startIndex, endIndex };
}
