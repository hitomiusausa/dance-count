import { DANCE_PROFILES } from '../../engine/dance-profiles.js';
import { isRoutineId } from '../routines/ids.ts';
import { ROUTINES_MAX } from '../routines/limits.ts';
import { routinePlayability, type Routine } from '../routines/routine.ts';
import type { Route, RouteTarget, ScreenId } from './routes.ts';

// ハッシュから「実際に出す画面」を決める（純粋関数）。中身のある画面だけを出し、未実装の画面は表紙。
// S4 新規はルーティンが上限（ROUTINES_MAX）未満の時だけ（M1 のボタンの無効をハッシュ直打ちで越えさせない）。
// S4 編集・S5 は ID が正しく、そのルーティンがある時だけ。S5 はさらに鳴らせる時だけ（Ruling 37・40）。
// 外れたら一覧を出し、redirect でハッシュも置き換える（履歴を積まない）。S4（作る側）は M1、S5（使う側）は U2（D56・Ruling 116）。
// 古い経路（#/routines＝alias）は U2 を出し、ハッシュを #/use/routines に置き換える。
export const IMPLEMENTED_SCREENS: readonly ScreenId[] = ['S0', 'S1', 'U2', 'M0', 'M1', 'S2', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13'];

export interface Resolved { screen: ScreenId; redirect: RouteTarget | null }

const TO_MAKE_ROUTINES: Resolved = { screen: 'M1', redirect: { screen: 'M1', params: {} } };
const TO_USE_ROUTINES: Resolved = { screen: 'U2', redirect: { screen: 'U2', params: {} } };

export function resolveScreen(route: Route, routines: readonly Routine[]): Resolved {
  const { screen, params } = route;
  if (route.alias) return { screen, redirect: { screen, params } };
  if (screen === 'S2') return { screen: params.danceId && Object.hasOwn(DANCE_PROFILES, params.danceId) ? 'S2' : 'S1', redirect: null };
  if (screen === 'S4' || screen === 'S5') {
    const back = screen === 'S4' ? TO_MAKE_ROUTINES : TO_USE_ROUTINES;
    if (screen === 'S4' && params.routineId === undefined) return routines.length >= ROUTINES_MAX ? back : { screen: 'S4', redirect: null };
    const routine = isRoutineId(params.routineId) ? routines.find(item => item.id === params.routineId) : undefined;
    if (!routine) return back;
    if (screen === 'S5' && routinePlayability(routine) !== 'ok') return back;
    return { screen, redirect: null };
  }
  return { screen: IMPLEMENTED_SCREENS.includes(screen) ? screen : 'S0', redirect: null };
}
