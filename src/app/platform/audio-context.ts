import { PlatformNotReadyError } from './not-ready.ts';

// iOS 対策（仕様 §9: audioSession・タップ内の解除・2秒判定）はこの面に閉じる。段2で実装。
export interface PlaybackAudio {
  context: AudioContext;
  unlockInsideTap(): Promise<void>;
}

export function getPlaybackAudio(): PlaybackAudio {
  throw new PlatformNotReadyError('playback audio', 2);
}
