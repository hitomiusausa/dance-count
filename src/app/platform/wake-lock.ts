import { PlatformNotReadyError } from './not-ready.ts';

// 再生中の画面スリープ防止（仕様 §9）。段2で実装。
export interface ScreenWakeLock { release(): Promise<void> }

export async function keepScreenOn(): Promise<ScreenWakeLock | null> {
  throw new PlatformNotReadyError('screen wake lock', 2);
}
