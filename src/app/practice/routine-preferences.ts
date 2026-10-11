import type { Routine } from '../routines/routine.ts';
import type { AppSettings } from '../settings/settings.ts';
import { BPM_MAX, BPM_MIN, SPEED_FAST_RATIO, SPEED_PRESETS, SPEED_SLOW_RATIO, clampBpm, speedPresetBpms, type SpeedChoice, type SpeedPreset, type SpeedProfile } from './speed.ts';

// S5・S4 の試聴の速さ（Ruling 40）。基準は routine.bpm（空なら種目の標準）。記憶はルーティンごと。
// 定数は practice/speed.ts と共通（第2の定義を作らない）。
export type RoutineSpeedPresets = Partial<Record<SpeedPreset, number>>;

// routine.bpm が空なら S2 と同じ3択。あるなら 基準×0.8 / 基準 / min(基準×1.1, 220)。競技上限では切らない。
// 端（40・220 付近）で「標準」と同じ値になる選択肢は出さない（2択になる）。
export function routineSpeedPresets(profile: SpeedProfile, routineBpm: number | null): RoutineSpeedPresets {
  if (routineBpm === null) return speedPresetBpms(profile);
  const slow = Math.max(BPM_MIN, Math.round(routineBpm * SPEED_SLOW_RATIO));
  const fast = Math.min(BPM_MAX, Math.round(routineBpm * SPEED_FAST_RATIO));
  return {
    ...(slow < routineBpm ? { slow } : {}),
    standard: routineBpm,
    ...(fast > routineBpm ? { fast } : {})
  };
}

// 試聴（S4）と S5 の「標準」の速さ。
export function routineBaseBpm(profile: SpeedProfile, routine: Pick<Routine, 'bpm'>): number {
  return routine.bpm ?? profile.practiceBpm;
}

export interface RoutineChoice {
  presets: RoutineSpeedPresets;
  speed: SpeedChoice;
  bpm: number;
  customBpm: number | null;   // 任意の速さのときだけ（「くわしく · ♩=値」。Ruling 31 を S5 でも）
}

export function routinePracticeChoice(profile: SpeedProfile, routine: Pick<Routine, 'id' | 'bpm'>, settings: AppSettings): RoutineChoice {
  const presets = routineSpeedPresets(profile, routine.bpm);
  const remembered = settings.speedPresetByRoutine[routine.id] ?? 'standard';
  const custom = settings.customBpmByRoutine[routine.id];
  if (remembered === 'custom' && custom !== undefined) {
    const bpm = clampBpm(custom) ?? presets.standard!;
    return { presets, speed: 'custom', bpm, customBpm: bpm };
  }
  // 記憶していた選択肢が今は無い（先生が基準を変えた等）・custom の値が無い → 標準
  const speed: SpeedPreset = remembered !== 'custom' && presets[remembered] !== undefined ? remembered : 'standard';
  return { presets, speed, bpm: presets[speed]!, customBpm: null };
}

export function chooseRoutinePreset(settings: AppSettings, routineId: string, preset: SpeedPreset): Partial<AppSettings> {
  const { [routineId]: _removed, ...customBpmByRoutine } = settings.customBpmByRoutine;
  return { speedPresetByRoutine: { ...settings.speedPresetByRoutine, [routineId]: preset }, customBpmByRoutine };
}

// 任意の値。3択のどれかと同じ値ならそのプリセットにする（Ruling 31 の追加規則を S5 でも）。
export function chooseRoutineCustomBpm(settings: AppSettings, profile: SpeedProfile, routine: Pick<Routine, 'id' | 'bpm'>, value: unknown): Partial<AppSettings> {
  const bpm = clampBpm(value);
  if (bpm === null) return {};
  const presets = routineSpeedPresets(profile, routine.bpm);
  const same = SPEED_PRESETS.find(preset => presets[preset] === bpm);
  if (same) return chooseRoutinePreset(settings, routine.id, same);
  return {
    speedPresetByRoutine: { ...settings.speedPresetByRoutine, [routine.id]: 'custom' },
    customBpmByRoutine: { ...settings.customBpmByRoutine, [routine.id]: bpm }
  };
}

// はじめの合図: オン/オフは設定（S2 と共通）、オンの時の小節数はルーティン（1 か 2）。
export function routineLeadInBars(settings: Pick<AppSettings, 'countInBars'>, routine: Pick<Routine, 'countInBars'>): 0 | 1 | 2 {
  return settings.countInBars === 0 ? 0 : routine.countInBars;
}
