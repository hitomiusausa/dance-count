import { PracticeAudioEngine } from '../../engine/audio-engine.js';
import { loadStandardVoice, type VoicePack } from '../platform/assets.ts';
import { onAudioStateChange, outputLatencySeconds, unlockAudioInsideTap } from '../platform/audio-context.ts';
import { keepScreenOn } from '../platform/wake-lock.ts';
import { STANDARD_VOICE_ID } from '../settings/settings.ts';
import type { EngineFrame, EngineLike, SessionDeps } from './session.ts';

// エンジンは JS のまま（Ruling 1）で、引数の既定値から推論される型が狭すぎるため、使う形だけをここで宣言する。
type EngineConstructor = new (audio: AudioContext, options: {
  voicePack: VoicePack;
  onFrame(frame: EngineFrame): void;
  displayLatencySeconds(): number;
}) => EngineLike;
const Engine = PracticeAudioEngine as unknown as EngineConstructor;

// 本物の端末で使う deps。段2の声は英語の標準音声だけ（段4で選んだ声に替える）。
export const browserSessionDeps: SessionDeps<AudioContext, VoicePack> = {
  unlock: unlockAudioInsideTap,
  loadVoice: audio => loadStandardVoice(audio, STANDARD_VOICE_ID),
  createEngine: (audio, voicePack, onFrame) => new Engine(audio, {
    voicePack,
    onFrame,
    displayLatencySeconds: () => outputLatencySeconds(audio)
  }),
  keepScreenOn,
  onStateChange: onAudioStateChange,
  setTimer(callback, ms) {
    const id = setTimeout(callback, ms);
    return () => clearTimeout(id);
  }
};
