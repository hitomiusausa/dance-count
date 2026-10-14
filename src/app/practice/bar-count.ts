import { TICKS_PER_BEAT, DANCE_PROFILES } from '../../engine/dance-profiles.js';
import { compileRhythm } from '../../engine/rhythm-compiler.js';

// D72 小節を数える — どの種目で出すか（トグルを出す種目）。表は持たず、種目のデータから決める（1 か所）:
// (1) カウントが数字だけ（使える字に S・Q が無い）、(2) 種目のどの型でも、すべての小節の頭（強拍）に「1」がある。
// → ワルツ・ヴィエニーズワルツ。外れる種目と理由:
//   タンゴ・スローフォックス・クイックステップ＝スロー・クイック（S・Q）で数える／サンバ＝S・Q も使う／
//   ルンバ「2 3 4 1」・チャチャ「2 3 4 & 1」＝小節の頭が「2」（番号を言うと「2」と区別できない）／
//   パソドブレ「1〜8」＝2 小節目の頭が「5」／ジャイブ「1 2 3 a 4 5 a 6」＝1 周が 1.5 小節で頭の語が替わる。
interface BarProfile { beatsPerBar: number; templates: readonly string[]; allowedTokens: readonly string[] }
const PROFILES = DANCE_PROFILES as Record<string, BarProfile>;

function everyDownbeatIsOne(danceId: string, counts: string, beatsPerBar: number): boolean {
  const compiled = compileRhythm({ danceId, counts }) as { durationTicks: number; events: Array<{ absoluteTick: number; voiceKey?: string | null }> };
  const barTicks = beatsPerBar * TICKS_PER_BEAT;
  if (compiled.durationTicks % barTicks !== 0) return false;
  for (let tick = 0; tick < compiled.durationTicks; tick += barTicks) {
    if (!compiled.events.some(event => event.absoluteTick === tick && event.voiceKey === 'one')) return false;
  }
  return true;
}

const AVAILABLE: ReadonlySet<string> = new Set(Object.entries(PROFILES)
  .filter(([danceId, profile]) => !profile.allowedTokens.some(token => token === 'S' || token === 'Q')
    && profile.templates.every(counts => everyDownbeatIsOne(danceId, counts, profile.beatsPerBar)))
  .map(([danceId]) => danceId));

export function barCountingAvailable(danceId: string): boolean {
  return AVAILABLE.has(danceId);
}

// 小節の番号の上限（1〜8 で 1 周）。表示「3 / 8 小節」の分母と同じ（engine の BAR_COUNT_WORDS の長さ）。
export const BARS_PER_CYCLE = 8;
