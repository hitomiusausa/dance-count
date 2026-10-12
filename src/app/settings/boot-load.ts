import { DEFAULT_SETTINGS, type AppSettings } from './settings.ts';

// 段8 Task 12（final-review m1）: 起動時の「保存領域を開く → 設定とルーティンを読む」を、どこが reject しても既定値で終える。
// 起動の殻のまま白い画面で止まらない（開けない＝保存なし・設定が読めない＝既定値・ルーティンが読めない＝空）。純粋（読む関数は渡す）。
export interface BootLoaded<S, R> { storage: S | null; settings: AppSettings; routines: R[] }

export async function bootLoad<S, R>(steps: {
  open(): Promise<S | null>;
  loadSettings(storage: S | null): Promise<AppSettings>;
  loadRoutines(storage: S | null): Promise<R[]>;
}): Promise<BootLoaded<S, R>> {
  const storage = await steps.open().catch(() => null);
  const [settings, routines] = await Promise.all([
    steps.loadSettings(storage).catch(() => DEFAULT_SETTINGS),
    steps.loadRoutines(storage).catch(() => [] as R[])
  ]);
  return { storage, settings, routines };
}
