import { checkCounts } from './counts.ts';
import { figureIdentity } from './figure-names.ts';
import { reviewedCounts } from './reviewed-counts.ts';
import type { Routine } from './routine.ts';

// フィガーを選んだらカウントを自動で入れる（D52・Ruling 106）。純粋関数。画面・editor は結果を入れるだけ。
// 順: (A) 自分が前に使ったカウント → (B) 監修済みの表。(A) があれば (B) は見ない（先生の手元が正しい）。
// (A) の範囲: 端末の全ルーティン（受け取った物も含む）から今開いているルーティンを除く（同じルーティン内は D13/D19 の複製が受け持つ）。
// 同じフィガーかは figureIdentity（D22）。checkCounts を通らない保存値は使わない。
// 違う値が複数あれば updatedAt が最新のルーティン、その中では番号の若い行（Ruling 50-1 の「代表」と同じ）。
export type AutoCountsFrom = 'history' | 'reviewed';
export interface AutoCounts { counts: string; from: AutoCountsFrom }
export interface AutoCountsInput {
  danceId: string;
  name: string;
  routines: readonly Routine[];
  excludeRoutineId: string | null;
  // 監修表の引き方（テストで差し替える。既定は出荷される REVIEWED_COUNTS）
  reviewed?: (danceId: string, name: string) => { counts: string } | null;
}

export function autoCounts({ danceId, name, routines, excludeRoutineId, reviewed = reviewedCounts }: AutoCountsInput): AutoCounts | null {
  if (name.trim() === '') return null;
  const identity = figureIdentity(danceId, name);
  const pastRoutines = routines
    .filter(routine => routine.danceId === danceId && routine.id !== excludeRoutineId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  for (const routine of pastRoutines) {
    for (const figure of routine.figures) {
      if (figureIdentity(danceId, figure.name) !== identity) continue;
      const check = checkCounts(danceId, figure.counts);
      if (!check.empty && !check.problem) return { counts: check.counts, from: 'history' };
    }
  }
  const entry = reviewed(danceId, name);
  if (!entry) return null;
  const check = checkCounts(danceId, entry.counts);
  return check.empty || check.problem ? null : { counts: check.counts, from: 'reviewed' };
}
