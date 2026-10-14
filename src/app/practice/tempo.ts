import { DANCE_PROFILES } from '../../engine/dance-profiles.js';

// D71: テンポ＝1 分間の小節数（MPM＝bars per minute）。社交ダンスの曲の速さの言い方（「ワルツはテンポ 28〜30」）。
// 値は ♩（1 分間の拍数）÷ 1 小節の拍数。小節の拍数は dance-profiles.js の beatsPerBar（カウントの 1 小節）を使う。
// 例外はパソドブレだけ: 音楽は 2/4 拍子で、競技の決まり（WDSF・JDSF）のテンポ 60〜62 は ♩÷2。
// dance-profiles の beatsPerBar=4 は「1 2 3 4」で数える練習のまとまり（メトロノームの強拍・帯）なので、そちらは変えずにここだけで直す。
const MUSIC_BEATS_PER_BAR: Readonly<Record<string, number>> = Object.freeze({ pasodoble: 2 });

const PROFILES = DANCE_PROFILES as Record<string, { beatsPerBar: number }>;

export function musicBeatsPerBar(danceId: string): number {
  const override = MUSIC_BEATS_PER_BAR[danceId];
  if (override !== undefined) return override;
  const profile = PROFILES[danceId];
  if (!profile) throw new Error(`Unknown dance profile: ${danceId}`);
  return profile.beatsPerBar;
}

// テンポ（小節／分）。数値のまま返す（丸めは表示の formatTempo だけ）。
export function barsPerMinute(danceId: string, bpm: number): number {
  return bpm / musicBeatsPerBar(danceId);
}

// 表示の丸め（D71）: 割り切れれば整数（84÷3＝28・200÷4＝50）、割り切れなければ小数 1 桁に四捨五入（67÷3＝22.3・123÷4＝30.8）。
// 小数 1 桁で .0 になる時は整数で出す（「28.0」と書かない）。
export function formatTempo(value: number): string {
  if (!Number.isFinite(value)) return '';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function tempoText(danceId: string, bpm: number): string {
  return formatTempo(barsPerMinute(danceId, bpm));
}
