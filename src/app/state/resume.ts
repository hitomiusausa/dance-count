import { unlockAudioInsideTap } from '../platform/audio-context.ts';
import { reviewedFigureBySlug, type ReviewedFigure } from '../routines/reviewed-counts.ts';
import type { AppSettings } from '../settings/settings.ts';
import { requestAutoplay } from './autoplay.ts';
import { navigate } from './route.ts';

// 「前回」（U1 の前回カード・表紙 C の「続きから」。G2・Ruling 32・115-1・121）。
// 前回のフィガーは監修表にある時だけ（訂正で外れた・別の端末の設定なら種目だけ＝「ウィスク」と書いて基本が鳴る食い違いを作らない。Ruling 121-4）
export interface LastPractice { danceId: string; figure: ReviewedFigure | null }
export function lastPractice(settings: Pick<AppSettings, 'lastDanceId' | 'lastFigure'>): LastPractice | null {
  if (!settings.lastDanceId) return null;
  return { danceId: settings.lastDanceId, figure: settings.lastFigure ? reviewedFigureBySlug(settings.lastDanceId, settings.lastFigure) : null };
}

// このタップの中で音を解除し、一回限りの印（種目だけ）を付けてから S2 へ。フィガーは経路が運ぶ（Ruling 121-3）
export function resumePractice({ danceId, figure }: LastPractice): void {
  try { unlockAudioInsideTap(); } catch { /* 音が使えない端末は S2 の2秒判定で案内する */ }
  requestAutoplay({ kind: 'dance', id: danceId });
  navigate({ screen: 'S2', params: figure ? { danceId, figureSlug: figure.slug } : { danceId } });
}
