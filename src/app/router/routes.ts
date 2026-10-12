// ハッシュ ↔ 画面の対応表（仕様 §3）。純粋関数だけ。window には触らない（platform/hash.ts の役目）。
export type ScreenId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10' | 'S11' | 'S12' | 'S13';
export type ScreenKind = 'root' | 'focus' | 'list';
export type TabId = 'practice' | 'routines' | 'settings';
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
export interface Route { screen: ScreenId; params: RouteParams; query: RouteQuery }
export type RouteTarget = Pick<Route, 'screen' | 'params'>;

interface ScreenSpec { kind: ScreenKind; parent: ScreenId | null; tab: TabId; path: string }

// path の ":name" は ID 1区切り（英数字・ハイフン・下線のみ）。
export const SCREENS: Record<ScreenId, ScreenSpec> = {
  S1: { kind: 'root', parent: null, tab: 'practice', path: '/' },
  S2: { kind: 'focus', parent: 'S1', tab: 'practice', path: '/practice/:danceId' },
  S3: { kind: 'root', parent: null, tab: 'routines', path: '/routines' },
  S4: { kind: 'focus', parent: 'S3', tab: 'routines', path: '/routines/new' },
  S5: { kind: 'focus', parent: 'S3', tab: 'routines', path: '/routines/:routineId/play' },
  S6: { kind: 'root', parent: null, tab: 'settings', path: '/settings' },
  S7: { kind: 'list', parent: 'S6', tab: 'settings', path: '/voices' },
  S8: { kind: 'focus', parent: 'S7', tab: 'settings', path: '/voices/record' },
  S9: { kind: 'focus', parent: 'S7', tab: 'settings', path: '/share' },
  S10: { kind: 'focus', parent: 'S7', tab: 'settings', path: '/receive' },
  S11: { kind: 'focus', parent: 'S6', tab: 'settings', path: '/help/sound' },
  S12: { kind: 'list', parent: 'S6', tab: 'settings', path: '/help/install' },
  S13: { kind: 'list', parent: 'S6', tab: 'settings', path: '/about' }
};

// S4 は「新規」と「編集」の2つの形を持つので、編集の形をここで足す。
const EXTRA_PATHS: Array<{ screen: ScreenId; path: string }> = [{ screen: 'S4', path: '/routines/:routineId/edit' }];

const ID_SEGMENT = /^[A-Za-z0-9_-]+$/;
const UI_STATES: readonly UiState[] = ['no-sound', 'wakelock-tip', 'confirm-delete', 'mic-denied', 'no-voice', 'no-recorder', 'update-ready', 'confirm-delete-all',
  'save-failed', 'stopped', 'voice-missing', 'mic-failed', 'no-https'];

const PATTERNS = [
  ...(Object.entries(SCREENS) as Array<[ScreenId, ScreenSpec]>).map(([screen, spec]) => ({ screen, path: spec.path })),
  ...EXTRA_PATHS
].map(({ screen, path }) => ({ screen, segments: path.split('/').filter(Boolean) }));

export function parseHash(hash: string): Route {
  const [rawPath = '', rawQuery = ''] = hash.replace(/^#/, '').split('?');
  const query = parseQuery(rawQuery);
  const segments = rawPath.split('/').filter(Boolean);
  for (const pattern of PATTERNS) {
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
    if (matched) return { screen: pattern.screen, params, query };
  }
  return { screen: 'S1', params: {}, query };
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

export function showsTabs(screen: ScreenId): boolean {
  return SCREENS[screen].kind !== 'focus';
}

export function parentScreen(screen: ScreenId): ScreenId | null {
  return SCREENS[screen].parent;
}

export function tabOf(screen: ScreenId): TabId {
  return SCREENS[screen].tab;
}
