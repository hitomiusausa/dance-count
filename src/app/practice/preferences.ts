import type { AppSettings } from '../settings/settings.ts';
import { SPEED_PRESETS, clampBpm, resolveBpm, speedPresetBpms, type SpeedChoice, type SpeedProfile } from './speed.ts';

// S2 の「はじめの合図」オンの小節数（D17。設定の countInBars 0|1 は「オフ／オン」として読む）。
export const LEAD_IN_BARS = 2;

// 種目ごとの記憶（仕様 §7）から S2 の現在の選択を作り、操作を設定の差分に直す（純粋関数）。
export interface DanceProfileLike extends SpeedProfile { id: string; templates: readonly string[] }

export interface PracticeChoice {
  counts: string;            // カウントの型（記憶が無ければ templates[0]。Ruling 18）
  speed: SpeedChoice;
  bpm: number;
  customBpm: number | null;  // 任意の速さのときだけ（「くわしく · ♩=値」。Ruling 31）
}

export function practiceChoice(profile: DanceProfileLike, settings: AppSettings): PracticeChoice {
  const remembered = settings.lastTemplateByDance[profile.id];
  const counts = remembered && profile.templates.includes(remembered) ? remembered : profile.templates[0]!;
  const speed = settings.speedPresetByDance[profile.id] ?? 'standard';
  const custom = settings.customBpmByDance[profile.id];
  const effective: SpeedChoice = speed === 'custom' && custom === undefined ? 'standard' : speed;
  const bpm = resolveBpm(profile, effective, custom);
  return { counts, speed: effective, bpm, customBpm: effective === 'custom' ? bpm : null };
}

// S2 の設定をエンジンへ渡す小節数にする（オフ=0、オン=LEAD_IN_BARS）。
export function practiceLeadInBars(settings: Pick<AppSettings, 'countInBars'>): 0 | 2 {
  return settings.countInBars === 1 ? LEAD_IN_BARS : 0;
}

export function choosePreset(settings: AppSettings, danceId: string, preset: Exclude<SpeedChoice, 'custom'>): Partial<AppSettings> {
  const { [danceId]: _removed, ...customBpmByDance } = settings.customBpmByDance;
  return { speedPresetByDance: { ...settings.speedPresetByDance, [danceId]: preset }, customBpmByDance };
}

// 任意の値。3択のどれかと同じ値ならそのプリセットにする（Ruling 31 の追加規則）。
export function chooseCustomBpm(settings: AppSettings, profile: DanceProfileLike, value: unknown): Partial<AppSettings> {
  const bpm = clampBpm(value);
  if (bpm === null) return {};
  const presets = speedPresetBpms(profile);
  const same = SPEED_PRESETS.find(preset => presets[preset] === bpm);
  if (same) return choosePreset(settings, profile.id, same);
  return {
    speedPresetByDance: { ...settings.speedPresetByDance, [profile.id]: 'custom' },
    customBpmByDance: { ...settings.customBpmByDance, [profile.id]: bpm }
  };
}

export function chooseTemplate(settings: AppSettings, profile: DanceProfileLike, counts: string): Partial<AppSettings> {
  if (!profile.templates.includes(counts)) return {};
  return { lastTemplateByDance: { ...settings.lastTemplateByDance, [profile.id]: counts } };
}
