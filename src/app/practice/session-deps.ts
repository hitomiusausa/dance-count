import { PracticeAudioEngine } from '../../engine/audio-engine.js';
import { MusicAudioEngine } from '../../engine/music-audio-engine.js';
import { loadMusicAsset } from '../platform/music.ts';
import { loadRecordedVoice, loadStandardVoice, type VoicePack } from '../platform/assets.ts';
import { onAudioStateChange, outputLatencySeconds, unlockAudioInsideTap } from '../platform/audio-context.ts';
import { keepScreenOn } from '../platform/wake-lock.ts';
import type { EngineFrame, EngineLike, SessionDeps } from './session.ts';

// エンジンは JS のまま（Ruling 1）で、引数の既定値から推論される型が狭すぎるため、使う形だけをここで宣言する。
type EngineConstructor = new (audio: AudioContext, options: {
  voicePack: VoicePack;
  onFrame(frame: EngineFrame): void;
  displayLatencySeconds(): number;
}) => EngineLike;
const Engine = PracticeAudioEngine as unknown as EngineConstructor;

// 本物の端末で使う deps。声は画面が解いた VoiceSelection（標準は同梱の音声、録音・受け取りは端末の声を decode。Ruling 61-3）。
export const browserSessionDeps: SessionDeps<AudioContext, VoicePack> = {
  unlock: unlockAudioInsideTap,
  loadVoice: (audio, voice) => (voice.kind === 'standard' ? loadStandardVoice(audio, voice.id) : loadRecordedVoice(audio, voice.pack)),
  createEngine: (audio, voicePack, onFrame) => new Engine(audio, {
    voicePack,
    onFrame,
    displayLatencySeconds: () => outputLatencySeconds(audio)
  }),
  loadMusic: loadMusicAsset,
  createMusicEngine: (audio,voicePack,onFrame) => new (MusicAudioEngine as unknown as EngineConstructor)(audio,{
    voicePack,onFrame,displayLatencySeconds:()=>outputLatencySeconds(audio)
  }),
  keepScreenOn,
  onStateChange: onAudioStateChange,
  setTimer(callback, ms) {
    const id = setTimeout(callback, ms);
    return () => clearTimeout(id);
  }
};
