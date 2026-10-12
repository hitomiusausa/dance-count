import { TICKS_PER_BEAT } from '../../engine/dance-profiles.js';
import { compileRhythm } from '../../engine/rhythm-compiler.js';
import { displayForVoiceKey } from '../lib/count-display.ts';

// カウントの型の帯（D55・Ruling 114）。丸は小節の拍でなく「型 1 周の語」を 1 つずつ並べ、鳴っている語の丸が琥珀。
// 時間はエンジンの tick（onFrame の originalTick）だけを使う（時刻から拍を計算し直さない・setTimeout で進めない＝第2の時間計算を作らない）。
// 型はセッションがエンジンに渡した compiled（SessionView.program）をそのまま読む。止まっている間だけ、表示のために compileRhythm を呼ぶ（idleProgram）。
export const MAX_STRIP_CELLS = 12;   // 13 語以上のフィガーは 12 語ずつの頁（Ruling 114-3。COUNTS_MAX 32 文字なので最大 3 頁）
const SUB_TOKENS = new Set(['a', '&', 'e']);

export interface StripEvent { token?: string; voiceKey?: string | null; absoluteTick: number; figureIndex?: number }
export interface StripProgram { events: readonly StripEvent[]; figures?: readonly { startTick: number; endTick: number }[]; endTick: number }
export interface StripCell { label: string; kind: 'beat' | 'sub' | 'rest'; beats: number; tick: number }
export interface StripView { cells: StripCell[]; lit: number | null }

// 型（S2）またはルーティンの 1 フィガー（S5。figureIndex で絞る）の語を 1 語 1 丸に。beats＝次の語までの拍数（最後は型・フィガーの終わりまで）
export function stripCells(program: StripProgram, figureIndex: number | null = null): StripCell[] {
  const events = figureIndex === null ? program.events : program.events.filter(event => event.figureIndex === figureIndex);
  const end = figureIndex === null ? program.endTick : program.figures?.[figureIndex]?.endTick ?? program.endTick;
  return events.map((event, index) => {
    const next = events[index + 1]?.absoluteTick ?? end;
    const rest = !event.voiceKey;
    return {
      label: rest ? '' : displayForVoiceKey(event.voiceKey),
      kind: rest ? 'rest' : SUB_TOKENS.has(event.token ?? '') ? 'sub' : 'beat',
      beats: (next - event.absoluteTick) / TICKS_PER_BEAT,
      tick: event.absoluteTick
    };
  });
}

// 点く丸＝tick が originalTick 以下の最後の語（エンジンの activeEvent と同じ決め方）。tick が無い（停止・はじめの合図）・最初の語より前は点けない。
// 12 語を超える時は、点く語の頁（止まっている間は 1 頁目）の 12 語だけを返す
export function stripView(cells: readonly StripCell[], originalTick: number | null | undefined): StripView {
  let index: number | null = null;
  if (typeof originalTick === 'number' && Number.isFinite(originalTick)) {
    for (let i = 0; i < cells.length; i += 1) if (cells[i]!.tick <= originalTick) index = i;
  }
  const page = index === null ? 0 : Math.floor(index / MAX_STRIP_CELLS);
  const start = page * MAX_STRIP_CELLS;
  return { cells: cells.slice(start, start + MAX_STRIP_CELLS), lit: index === null ? null : index - start };
}

// 止まっている間の帯（表示のためだけ。時間の計算ではない）: カウントの文字列を compileRhythm で語にする
export function idleProgram(danceId: string, counts: string): StripProgram {
  const compiled = compileRhythm({ danceId, counts }) as { events: StripEvent[]; durationTicks: number };
  return { events: compiled.events, endTick: compiled.durationTicks };
}
