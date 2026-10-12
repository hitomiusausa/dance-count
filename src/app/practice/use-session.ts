import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { VoicePack } from '../platform/assets.ts';
import { useSettings } from '../state/settings.ts';
import { browserSessionDeps } from './session-deps.ts';
import { IDLE_VIEW, PracticeSession, type SessionView } from './session.ts';

// 再生画面（S2・S5）と S4 の試聴が共通で使う再生セッション。key が変わると作り直す。
// 画面を離れたら必ず止める（Ruling 32）。WakeLock の案内を出したか（Ruling 30）・初めて鳴ったか（段7・Ruling 92-7）は設定に覚える。
export function usePracticeSession(key: string): { session: PracticeSession<AudioContext, VoicePack>; view: SessionView } {
  const { settings, update } = useSettings();
  const latest = useRef({ settings, update });
  latest.current = { settings, update };
  const session = useMemo(() => new PracticeSession(browserSessionDeps, {
    wakeTipAlreadyShown: () => latest.current.settings.hints.wakeLockTipShown,
    markWakeTipShown: () => latest.current.update({ hints: { ...latest.current.settings.hints, wakeLockTipShown: true } }),
    firstPlaybackDone: () => latest.current.settings.hints.firstPlaybackDone,
    markFirstPlayback: () => latest.current.update({ hints: { ...latest.current.settings.hints, firstPlaybackDone: true } })
  }), [key]);
  const [view, setView] = useState<SessionView>(IDLE_VIEW);
  useEffect(() => {
    const unsubscribe = session.subscribe(setView);
    return () => { unsubscribe(); session.dispose(); };
  }, [session]);
  return { session, view };
}
