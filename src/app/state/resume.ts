import { unlockAudioInsideTap } from '../platform/audio-context.ts';
import { requestAutoplay } from './autoplay.ts';
import { navigate } from './route.ts';

// 「前回」の 1 タップ（U1 の前回カード・表紙 C の「続きから」。G2・Ruling 32・115-1）。このタップの中で音を解除し、一回限りの印を付けてから S2 へ。
export function resumePractice(danceId: string): void {
  try { unlockAudioInsideTap(); } catch { /* 音が使えない端末は S2 の2秒判定で案内する */ }
  requestAutoplay({ kind: 'dance', id: danceId });
  navigate({ screen: 'S2', params: { danceId } });
}
