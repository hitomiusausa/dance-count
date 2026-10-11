import { useEffect, useRef, useState } from 'preact/hooks';
import { stepVoice, voiceOffsetFor, type VoiceOffsetStep } from '../practice/voice-offset.ts';
import { useSettings } from '../state/settings.ts';
import { useStorage } from '../state/storage.ts';
import { resolveVoiceSelection, standardSelection, type VoiceSelection } from './selection.ts';
import { saveVoicePack } from './store.ts';

// 再生画面（S2・S5）と S4 の試聴が鳴らす声（Ruling 61-4）。画面のマウント時（と選択が変わった時）に解く。
// 標準の声は最初の描画から決まっている。録音・受け取った声は端末から読み終えるまで null（▶ はその間も標準で鳴らせる）。
export interface PlaybackVoice {
  voice: VoiceSelection | null;
  offsetMs: number;
  // 「‹ 早く」「遅く ›」: 声と差分を返す（設定の差分は画面が change で書く。録音の声はここで端末へ保存する）。
  step(settings: Parameters<typeof stepVoice>[0], direction: -1 | 1): VoiceOffsetStep | null;
}

export function usePlaybackVoice(): PlaybackVoice {
  const { settings } = useSettings();
  const storage = useStorage();
  const [voice, setVoice] = useState<VoiceSelection | null>(() => standardSelection(settings.selectedVoiceId));
  const latest = useRef(voice);
  latest.current = voice;
  useEffect(() => {
    let alive = true;
    void resolveVoiceSelection(storage, settings.selectedVoiceId).then(resolved => { if (alive) setVoice(resolved); });
    return () => { alive = false; };
  }, [storage, settings.selectedVoiceId]);
  return {
    voice,
    offsetMs: voice ? voiceOffsetFor(settings, voice) : 0,
    step(current, direction) {
      const now = latest.current;
      if (!now) return null;
      const result = stepVoice(current, now, direction, new Date().toISOString());
      latest.current = result.voice;
      setVoice(result.voice);
      if (result.pack) void saveVoicePack(storage, result.pack);
      return result;
    }
  };
}
