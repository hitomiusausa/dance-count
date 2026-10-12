import type { PlatformKind } from '../platform/pwa.ts';

// S1 の「ホーム画面に追加すると、アプリのように使えます ›」カードを出すか（段7・Ruling 92-7・D42・仕様 §3-3）。純粋。
// 初めて鳴った後・× で閉じていない・iPhone か Android のブラウザ（PC には出さない）・ホーム画面から開いていない、の全部。
export interface InstallCardInput {
  hints: { firstPlaybackDone: boolean; homeScreenCardDismissed: boolean };
  kind: PlatformKind;
  standalone: boolean;
}

export function showsInstallCard({ hints, kind, standalone }: InstallCardInput): boolean {
  return hints.firstPlaybackDone && !hints.homeScreenCardDismissed && kind !== 'desktop' && !standalone;
}

// S12 に出す 1 通り（Ruling 92-1〜92-6）。ホーム画面から開いていれば端末に関わらず「追加は済んでいます」。
export type InstallGuide = 'done' | PlatformKind;

export function installGuideFor(kind: PlatformKind, standalone: boolean): InstallGuide {
  return standalone ? 'done' : kind;
}

// S8 の最初の画面の 1 行「ホーム画面に追加してから録音するのがおすすめです。…」を出すか（D46・F34）。純粋。
// iPhone のブラウザ（Safari・他のブラウザ）だけ・ホーム画面から開いていない・まだ 1 語も録っていない（録った後では遅くて混乱する）の全部。
// Android は Chrome と追加したアプリで保存領域が同じ（推測・実機確認表 15）なので出さない。
export function showsRecordInstallHint({ kind, standalone, recorded }: { kind: PlatformKind; standalone: boolean; recorded: boolean }): boolean {
  return (kind === 'ios-safari' || kind === 'ios-other') && !standalone && !recorded;
}

// ホーム画面のアプリを起動した時の最初のハッシュ（段7 fix 1・レビュー I2）。S12 を開いたまま追加すると、iOS がその時の URL を
// 保存して毎回 S12（「追加は済んでいます」）から開く恐れがあるので、ホーム画面から開いた時に限り練習（#/）に置き換える。
// 置き換えない時は null。iOS が start_url を使うなら、元々 #/ なので何も起きない。
export const INSTALL_HELP_HASH = '#/help/install';

export function launchHashFor({ hash, standalone }: { hash: string; standalone: boolean }): string | null {
  if (!standalone) return null;
  const path = hash.split('?')[0];
  return path === INSTALL_HELP_HASH ? '#/' : null;
}
