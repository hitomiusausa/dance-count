// ハッシュ ↔ 画面の対応表（仕様 §3）。純粋関数だけ。window には触らない（platform/hash.ts の役目）。
// D56（Ruling 116）: 表紙 S0（#/）・「使う」の U1（今の S1 の ID のまま #/use）と U2（#/use/routines）・「作る」の M0（#/make）と M1（#/make/routines）。
// S3 は廃止（古い #/routines は U2 へ置き換え）。深い画面（S2・S4・S5・S7〜S13）の path は変えない。
export type ScreenId = 'S0' | 'S1' | 'U2' | 'M0' | 'M1' | 'S2' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10' | 'S11' | 'S12' | 'S13';
// cover＝表紙（戻る無し・下タブ無し）。root＝側の入口（U1・U2・M0）。list＝一覧（M1・S6）。focus＝集中画面
export type ScreenKind = 'cover' | 'root' | 'focus' | 'list';
export type Side = 'use' | 'make';
export type TabId = 'practice' | 'routines';
export type RouteParams = { danceId?: string; routineId?: string };
// 画面の見た目だけを強制するテスト用クエリ（Ruling 23・33。confirm-delete は S3・S7 の削除確認・Ruling 43・60-4。
// mic-denied・no-voice・no-recorder は S8 の枠・Ruling 63-3（no-https は http で開いた時の非対応の枠・D53）。update-ready は S1・S3・S6・S7 の更新の帯・段7 Ruling 90-7）。
// confirm-delete-all は S13 の「データを全て消す」の確認（段8・Ruling 99-3・100-2。見た目だけで、消さない）。
// 段8（Ruling 100-2・§11 の全件）: save-failed（S2・S4・S5・S8・S10 確認の「保存できませんでした」）・stopped（S2・S5「再生が止まりました」）・
// voice-missing（S2・S5・S7「この声はまだ端末に入っていません」）・mic-failed（S8「マイクを使えませんでした」）。
// 設定・hints・再生状態・声・マイク・Service Worker には書かない。以後の追加は裁定が要る。
export type UiState = 'no-sound' | 'wakelock-tip' | 'confirm-delete' | 'mic-denied' | 'no-voice' | 'no-recorder' | 'update-ready' | 'confirm-delete-all'
  | 'save-failed' | 'stopped' | 'voice-missing' | 'mic-failed' | 'no-https';
export type RouteQuery = { uiState?: UiState };
// alias: 古い経路（#/routines）で来た。resolve.ts がハッシュを今の経路へ置き換える（Ruling 116-1）
export interface Route { screen: ScreenId; params: RouteParams; query: RouteQuery; alias?: true }
export type RouteTarget = Pick<Route, 'screen' | 'params'>;

// side は表紙の「使う／作る」のどちら側か（下タブは「使う」の root だけ＝showsTabs）。tab は下タブの「今の位置」（U1・U2 だけ）。
// parent は履歴が無い時の「戻る」の行き先（Ruling 17・116-2。表紙が親の画面の「戻る」は「‹ 表紙」）。
interface ScreenSpec { kind: ScreenKind; parent: ScreenId | null; side: Side | null; tab: TabId | null; path: string }

// path の ":name" は ID 1区切り（英数字・ハイフン・下線のみ）。
export const SCREENS: Record<ScreenId, ScreenSpec> = {
  S0: { kind: 'cover', parent: null, side: null, tab: null, path: '/' },
  S1: { kind: 'root', parent: 'S0', side: 'use', tab: 'practice', path: '/use' },
  U2: { kind: 'root', parent: 'S0', side: 'use', tab: 'routines', path: '/use/routines' },
  M0: { kind: 'root', parent: 'S0', side: 'make', tab: null, path: '/make' },
  M1: { kind: 'list', parent: 'M0', side: 'make', tab: null, path: '/make/routines' },
  S2: { kind: 'focus', parent: 'S1', side: 'use', tab: null, path: '/practice/:danceId' },
  S4: { kind: 'focus', parent: 'M1', side: 'make', tab: null, path: '/routines/new' },
  S5: { kind: 'focus', parent: 'U2', side: 'use', tab: null, path: '/routines/:routineId/play' },
  S6: { kind: 'list', parent: 'S0', side: null, tab: null, path: '/settings' },
  S7: { kind: 'focus', parent: 'S1', side: null, tab: null, path: '/voices' },
  S8: { kind: 'focus', parent: 'M0', side: 'make', tab: null, path: '/voices/record' },
  S9: { kind: 'focus', parent: 'M0', side: 'make', tab: null, path: '/share' },
  S10: { kind: 'focus', parent: 'U2', side: 'use', tab: null, path: '/receive' },
  S11: { kind: 'focus', parent: 'S6', side: null, tab: null, path: '/help/sound' },
  S12: { kind: 'focus', parent: 'S6', side: null, tab: null, path: '/help/install' },
  S13: { kind: 'focus', parent: 'S6', side: null, tab: null, path: '/about' }
};

// S4 は「新規」と「編集」の2つの形を持つので、編集の形をここで足す。
const EXTRA_PATHS: Array<{ screen: ScreenId; path: string }> = [{ screen: 'S4', path: '/routines/:routineId/edit' }];
// 古い経路（D56 より前の案内・ブックマーク）。今の画面に読み替え、resolve.ts がハッシュを置き換える
const ALIAS_PATHS: Array<{ screen: ScreenId; path: string }> = [{ screen: 'U2', path: '/routines' }];

const ID_SEGMENT = /^[A-Za-z0-9_-]+$/;
const UI_STATES: readonly UiState[] = ['no-sound', 'wakelock-tip', 'confirm-delete', 'mic-denied', 'no-voice', 'no-recorder', 'update-ready', 'confirm-delete-all',
  'save-failed', 'stopped', 'voice-missing', 'mic-failed', 'no-https'];

const toPattern = ({ screen, path }: { screen: ScreenId; path: string }) => ({ screen, segments: path.split('/').filter(Boolean) });
const PATTERNS = [
  ...(Object.entries(SCREENS) as Array<[ScreenId, ScreenSpec]>).map(([screen, spec]) => ({ screen, path: spec.path })),
  ...EXTRA_PATHS
].map(toPattern);
const ALIASES = ALIAS_PATHS.map(toPattern);

export function parseHash(hash: string): Route {
  const [rawPath = '', rawQuery = ''] = hash.replace(/^#/, '').split('?');
  const query = parseQuery(rawQuery);
  const segments = rawPath.split('/').filter(Boolean);
  for (const pattern of [...PATTERNS, ...ALIASES]) {
    if (pattern.segments.length !== segments.length) continue;
    const params: Record<string, string> = {};
    const matched = pattern.segments.every((expected, index) => {
      const actual = segments[index] ?? '';
      if (expected.startsWith(':')) {
        if (!ID_SEGMENT.test(actual)) return false;
        params[expected.slice(1)] = actual;
        return true;
      }
      return expected === actual;
    });
    if (matched) return ALIASES.includes(pattern) ? { screen: pattern.screen, params, query, alias: true } : { screen: pattern.screen, params, query };
  }
  return { screen: 'S0', params: {}, query };
}

// 知らないキー・値は捨てる。
function parseQuery(raw: string): RouteQuery {
  const value = new URLSearchParams(raw).get('ui-state');
  const uiState = UI_STATES.find(state => state === value);
  return uiState ? { uiState } : {};
}

// クエリは出さない（遷移すると ui-state は消える）。
export function buildHash(route: RouteTarget): string {
  const params = route.params as Record<string, string | undefined>;
  const candidates = PATTERNS.filter(pattern => pattern.screen === route.screen);
  for (const pattern of candidates) {
    const names = pattern.segments.filter(segment => segment.startsWith(':')).map(segment => segment.slice(1));
    const given = Object.keys(params).filter(name => params[name] !== undefined);
    if (names.length !== given.length || !names.every(name => given.includes(name))) continue;
    const path = pattern.segments.map(segment => (segment.startsWith(':') ? params[segment.slice(1)] : segment)).join('/');
    return `#/${path}`;
  }
  throw new Error(`No hash for ${route.screen} with params ${JSON.stringify(route.params)}`);
}

// 下タブは「使う」の 2 つの入口（U1・U2）だけ（Ruling 116-1）
export function showsTabs(screen: ScreenId): boolean {
  return SCREENS[screen].side === 'use' && SCREENS[screen].kind === 'root';
}

export function parentScreen(screen: ScreenId): ScreenId | null {
  return SCREENS[screen].parent;
}

export function tabOf(screen: ScreenId): TabId | null {
  return SCREENS[screen].tab;
}
