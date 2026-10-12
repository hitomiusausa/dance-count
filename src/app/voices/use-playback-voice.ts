import { useEffect, useRef, useState } from 'preact/hooks';
import type { AppStorage } from '../platform/storage.ts';
import type { VoiceChoice } from '../practice/session.ts';
import { stepVoice, voiceOffsetFor, type VoiceOffsetStep } from '../practice/voice-offset.ts';
import { useSettings } from '../state/settings.ts';
import { useStorage } from '../state/storage.ts';
import { resolveVoiceSelection, standardSelection, type VoiceSelection } from './selection.ts';
import { saveVoicePack } from './store.ts';

type OffsetSettings = Parameters<typeof stepVoice>[0];

// 再生画面（S2・S5）と S4 の試聴が鳴らす声（Ruling 61-4）。画面のマウント時（と選択が変わった時）に解く。
// 標準の声は最初の描画から決まっている。録音・受け取った声は端末から読み終えるまで null。
// その間に ▶ が押されたら、画面は pending() を session.play に渡す（解けるのを待ってその声で鳴らす。Ruling 61-2）。
export interface PlaybackVoice {
  voice: VoiceSelection | null;
  offsetMs: number;
  // 声がまだ解けていない時だけ、解けた声とその声のタイミングの Promise（解けていれば undefined）。
  pending(settings: OffsetSettings & { selectedVoiceId: string }): Promise<VoiceChoice> | undefined;
  // 「‹ 早く」「遅く ›」: 声と差分を返す（設定の差分は画面が change で書く。録音の声はここで端末へ保存する）。
  step(settings: OffsetSettings, direction: -1 | 1): VoiceOffsetStep | null;
  // 録音の声のタイミングを端末に保存できなかった（画面は「保存できませんでした」を出す。次に保存できたら消える）
  saveFailed: boolean;
  // 「保存できませんでした」の枠の「閉じる」（段8 Ruling 103-3）
  dismissSaveFailed(): void;
}

export function usePlaybackVoice(): PlaybackVoice {
  const { settings } = useSettings();
  const storage = useStorage();
  const [voice, setVoice] = useState<VoiceSelection | null>(() => standardSelection(settings.selectedVoiceId));
  const [saveFailed, setSaveFailed] = useState(false);
  const latest = useRef(voice);
  latest.current = voice;
  // 解決は 1 つの選択につき 1 回（マウント直後の effect と、その前に押された ▶ が同じ Promise を共有する）
  const inflight = useRef<{ storage: AppStorage | null; id: string; promise: Promise<VoiceSelection> } | null>(null);
  const resolving = (id: string): Promise<VoiceSelection> => {
    const now = inflight.current;
    if (now && now.storage === storage && now.id === id) return now.promise;
    const promise = resolveVoiceSelection(storage, id);
    inflight.current = { storage, id, promise };
    return promise;
  };
  useEffect(() => {
    let alive = true;
    void resolving(settings.selectedVoiceId).then(resolved => { if (alive) setVoice(resolved); });
    return () => { alive = false; };
  }, [storage, settings.selectedVoiceId]);
  return {
    voice,
    offsetMs: voice ? voiceOffsetFor(settings, voice) : 0,
    pending(current) {
      if (latest.current) return undefined;
      return resolving(current.selectedVoiceId).then(resolved => ({ voice: resolved, voiceOffsetMs: voiceOffsetFor(current, resolved) }));
    },
    step(current, direction) {
      const now = latest.current;
      if (!now) return null;
      const result = stepVoice(current, now, direction, new Date().toISOString());
      latest.current = result.voice;
      setVoice(result.voice);
      if (result.pack) void saveVoicePack(storage, result.pack).then(ok => setSaveFailed(!ok));
      return result;
    },
    saveFailed,
    dismissSaveFailed() { setSaveFailed(false); }
  };
}
