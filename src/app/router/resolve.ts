import { DANCE_PROFILES } from '../../engine/dance-profiles.js';
import { isRoutineId } from '../routines/ids.ts';
import { ROUTINES_MAX } from '../routines/limits.ts';
import { REVIEWED_FIGURES, type ReviewedFigureTable } from '../routines/reviewed-counts.ts';
import { routinePlayability, type Routine } from '../routines/routine.ts';
import type { RedirectTarget, Route, ScreenId } from './routes.ts';

// ハッシュから「実際に出す画面」を決める（純粋関数）。中身のある画面だけを出し、未実装の画面は表紙。
// S4 新規はルーティンが上限（ROUTINES_MAX）未満の時だけ（M1 のボタンの無効をハッシュ直打ちで越えさせない）。
// S4 編集・S5 は ID が正しく、そのルーティンがある時だけ。S5 はさらに鳴らせる時だけ（Ruling 37・40）。
// 外れたら一覧を出し、redirect でハッシュも置き換える（履歴を積まない）。S4（作る側）は M1、S5（使う側）は U2（D56・Ruling 116）。
// D57（Ruling 119-6・120-4）: F1 は監修済みのフィガーが 1 件以上の種目だけ（0 件なら S2 の基本へ置き換え・知らない種目は U1）。
// S2 のフィガーの形は、監修表に無い slug（訂正で消えた・打ち間違い）なら S2 の基本へ置き換える（エラーは出さない）。
// 古い経路（#/routines＝alias）は U2 を出し、ハッシュを #/use/routines に置き換える（ui-state は持ち越す）。
export const IMPLEMENTED_SCREENS: readonly ScreenId[] = ['S0', 'S1', 'U2', 'M0', 'M1', 'F1', 'S2', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14'];

export interface Resolved { screen: ScreenId; redirect: RedirectTarget | null }

const TO_MAKE_ROUTINES: Resolved = { screen: 'M1', redirect: { screen: 'M1', params: {} } };
const TO_USE_ROUTINES: Resolved = { screen: 'U2', redirect: { screen: 'U2', params: {} } };

export function resolveScreen(route: Route, routines: readonly Routine[], figures: ReviewedFigureTable = REVIEWED_FIGURES): Resolved {
  const { screen, params } = route;
  // ui-state（?ui-state=…）は置き換えた先にも持ち越す（見た目の強制を古い経路で開いても効かせる）
  if (route.alias) return { screen, redirect: route.query.uiState ? { screen, params, query: route.query } : { screen, params } };
  if (screen === 'S2' || screen === 'F1') {
    const danceId = params.danceId;
    if (!danceId || !Object.hasOwn(DANCE_PROFILES, danceId)) return { screen: 'S1', redirect: null };
    const basic: Resolved = { screen: 'S2', redirect: { screen: 'S2', params: { danceId } } };
    if (screen === 'F1') return figures.reviewedFigures(danceId).length > 0 ? { screen: 'F1', redirect: null } : basic;
    if (params.figureSlug !== undefined && !figures.reviewedFigureBySlug(danceId, params.figureSlug)) return basic;
    return { screen: 'S2', redirect: null };
  }
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
