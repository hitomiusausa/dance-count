import { getDanceProfile, TICKS_PER_BEAT } from '../../engine/dance-profiles.js';
import { compileRhythm, compileRoutine } from '../../engine/rhythm-compiler.js';

// 小節の注意（D16・Ruling 52）。止めずに知らせるだけ（入力・保存・再生は止めない）。
// 拍数はエンジンの tick から（compileRhythm／compileRoutine の durationTicks ÷ TICKS_PER_BEAT）。ここで時間は計算しない。
// 行ごとの注意はワルツ・ヴィエニーズワルツだけ: 3拍子で3拍の倍数でないカウントは打ち間違いの確率が高い。
// ほかの種目は小節をまたぐフィガーが普通にある（タンゴのプログレッシブリンク Q Q・クイックステップ S Q Q S・ジャイブのベーシック 6拍）ので出さない。
export const BAR_NOTE_DANCES: readonly string[] = Object.freeze(['waltz', 'vwaltz']);

interface Counted { counts: string }

// 1小節の拍数（文言の {beats}）。
export function beatsPerBar(danceId: string): number {
  return (getDanceProfile(danceId) as { beatsPerBar: number }).beatsPerBar;
}

// 1フィガーの拍数。数えられないカウントは null。
export function figureBeats(danceId: string, counts: string): number | null {
  try {
    const { durationTicks } = compileRhythm({ danceId, counts }) as { durationTicks: number };
    return durationTicks / TICKS_PER_BEAT;
  } catch {
    return null;
  }
}

export function isOffBar(danceId: string, counts: string): boolean {
  if (!BAR_NOTE_DANCES.includes(danceId)) return false;
  const beats = figureBeats(danceId, counts);
  return beats !== null && beats % beatsPerBar(danceId) !== 0;
}

// 注意を出す行の番号（昇順）。画面は先頭を全文、残りを短い形で出す。
export function offBarIndexes(danceId: string, figures: readonly Counted[]): number[] {
  return figures.flatMap((figure, index) => (isOffBar(danceId, figure.counts) ? [index] : []));
}

// ルーティン全体が小節の途中で終わるか（全種目）。0件・数えられない時は false。
export function routineEndsMidBar(danceId: string, figures: readonly (Counted & { id: string; name: string })[]): boolean {
  if (figures.length === 0) return false;
  try {
    const { durationTicks } = compileRoutine({ danceId, figures }) as { durationTicks: number };
    return durationTicks % (beatsPerBar(danceId) * TICKS_PER_BEAT) !== 0;
  } catch {
    return false;
  }
}
