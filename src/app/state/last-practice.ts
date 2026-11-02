import { reviewedFigureBySlug, type ReviewedFigure } from '../routines/reviewed-counts.ts';
import { routinePlayability, type Routine } from '../routines/routine.ts';
import type { AppSettings } from '../settings/settings.ts';

// 「前回」（U1 の前回カード・表紙 C の「続きから」。G2・Ruling 32・115-1・121）。
// 前回のフィガーは監修表にある時だけ（訂正で外れた・別の端末の設定なら種目だけ＝「ウィスク」と書いて基本が鳴る食い違いを作らない。Ruling 121-4）
// 夜間便 B-1（Ruling 124・監査 #2）: 前回が S5 のルーティンなら、そのルーティン（あって鳴らせる時だけ）。消えていれば種目の記憶へ落ちる（無ければ null）
export type LastPractice =
  | { kind: 'dance'; danceId: string; figure: ReviewedFigure | null }
  | { kind: 'routine'; routine: Routine };
export function lastPractice(settings: Pick<AppSettings, 'lastDanceId' | 'lastFigure' | 'lastKind' | 'lastRoutineId'>, routines: readonly Routine[] = []): LastPractice | null {
  if (settings.lastKind === 'routine' && settings.lastRoutineId) {
    const routine = routines.find(item => item.id === settings.lastRoutineId);
    if (routine && routinePlayability(routine) === 'ok') return { kind: 'routine', routine };
  }
  if (!settings.lastDanceId) return null;
  return { kind: 'dance', danceId: settings.lastDanceId, figure: settings.lastFigure ? reviewedFigureBySlug(settings.lastDanceId, settings.lastFigure) : null };
}
