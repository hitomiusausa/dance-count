import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Routine } from '../routines/routine.ts';

// 画面からルーティンを読む・保存する・消す入口。一覧はメモリが正で、変更はすぐ画面に出してから端末へ書く
// （App が受け持つ。書き込みの成否は Promise<boolean> で返し、S4 は失敗を [data-alert] に出す）。
export interface RoutinesValue {
  routines: Routine[];
  save(routine: Routine): Promise<boolean>;
  remove(id: string): Promise<boolean>;
}

export const RoutinesContext = createContext<RoutinesValue>({ routines: [], save: async () => false, remove: async () => false });

export function useRoutines(): RoutinesValue {
  return useContext(RoutinesContext);
}
