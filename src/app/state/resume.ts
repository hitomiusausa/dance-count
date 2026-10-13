import { unlockAudioInsideTap } from '../platform/audio-context.ts';
import type { LastPractice } from './last-practice.ts';
import { requestAutoplay } from './autoplay.ts';
import { navigate } from './route.ts';

// 「前回」の中身は last-practice.ts（純粋。テストはそちら）。ここは押した時の動きだけ（画面の経路に触る）
export { lastPractice, type LastPractice } from './last-practice.ts';

// このタップの中で音を解除し、一回限りの印を付けてから S2／S5 へ（開いてすぐ鳴る＝Ruling 121 と同じ約束）。フィガーは経路が運ぶ（Ruling 121-3）
export function resumePractice(last: LastPractice): void {
  try { unlockAudioInsideTap(); } catch { /* 音が使えない端末は S2・S5 の2秒判定で案内する */ }
  if (last.kind === 'routine') {
    requestAutoplay({ kind: 'routine', id: last.routine.id });
    navigate({ screen: 'S5', params: { routineId: last.routine.id } });
    return;
  }
  const { danceId, figure } = last;
  requestAutoplay({ kind: 'dance', id: danceId });
  navigate({ screen: 'S2', params: figure ? { danceId, figureSlug: figure.slug } : { danceId } });
}
