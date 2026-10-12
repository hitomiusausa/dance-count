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
