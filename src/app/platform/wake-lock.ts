// 再生中の画面スリープ防止（仕様 §9）。▶ のクリック処理の中で await より前に呼ぶこと
// （request は最初の await より前に同期で発行される）。画面が裏から戻ったら取り直し、停止時に解放する。
export interface ScreenWakeLock { release(): Promise<void> }

export async function keepScreenOn(): Promise<ScreenWakeLock | null> {
  if (!('wakeLock' in navigator)) return null;
  let sentinel: WakeLockSentinel | null = null;
  let released = false;
  const acquire = async () => {
    try {
      const next = await navigator.wakeLock.request('screen');
      if (released) { await next.release().catch(() => {}); sentinel = null; } else sentinel = next;
    } catch { sentinel = null; }
  };
  const onVisibility = () => {
    if (!released && document.visibilityState === 'visible' && (!sentinel || sentinel.released)) void acquire();
  };
  await acquire();
  if (!sentinel) return null;
  document.addEventListener('visibilitychange', onVisibility);
  return {
    async release() {
      released = true;
      document.removeEventListener('visibilitychange', onVisibility);
      const current: WakeLockSentinel | null = sentinel;
      sentinel = null;
      await current?.release().catch(() => {});
    }
  };
}
