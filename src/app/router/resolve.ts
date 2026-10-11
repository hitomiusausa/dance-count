import { DANCE_PROFILES } from '../../engine/dance-profiles.js';
import { isRoutineId } from '../routines/ids.ts';
import { ROUTINES_MAX } from '../routines/limits.ts';
import { routinePlayability, type Routine } from '../routines/routine.ts';
import type { Route, RouteTarget, ScreenId } from './routes.ts';

// ハッシュから「実際に出す画面」を決める（純粋関数）。中身のある画面だけを出し、未実装の画面はホーム。
// S4 新規はルーティンが上限（ROUTINES_MAX）未満の時だけ（S3 のボタンの無効をハッシュ直打ちで越えさせない）。
// S4 編集・S5 は ID が正しく、そのルーティンがある時だけ。S5 はさらに鳴らせる時だけ（Ruling 37・40）。
// 外れたら S3 を出し、redirect でハッシュも S3 に置き換える（履歴を積まない）。
export const IMPLEMENTED_SCREENS: readonly ScreenId[] = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S11'];

export interface Resolved { screen: ScreenId; redirect: RouteTarget | null }

const TO_ROUTINES: Resolved = { screen: 'S3', redirect: { screen: 'S3', params: {} } };

export function resolveScreen(route: Route, routines: readonly Routine[]): Resolved {
  const { screen, params } = route;
  if (screen === 'S2') return { screen: params.danceId && Object.hasOwn(DANCE_PROFILES, params.danceId) ? 'S2' : 'S1', redirect: null };
  if (screen === 'S4' || screen === 'S5') {
    if (screen === 'S4' && params.routineId === undefined) return routines.length >= ROUTINES_MAX ? TO_ROUTINES : { screen: 'S4', redirect: null };
    const routine = isRoutineId(params.routineId) ? routines.find(item => item.id === params.routineId) : undefined;
    if (!routine) return TO_ROUTINES;
    if (screen === 'S5' && routinePlayability(routine) !== 'ok') return TO_ROUTINES;
    return { screen, redirect: null };
  }
  return { screen: IMPLEMENTED_SCREENS.includes(screen) ? screen : 'S1', redirect: null };
}
