import { DANCE_PROFILES } from '../../engine/dance-profiles.js';
import { compileRoutine } from '../../engine/rhythm-compiler.js';
import { validateRoutineProvenance } from '../../engine/routine-provenance.js';
import { APP_VERSION } from '../app-version.ts';
import { BPM_MAX, BPM_MIN } from '../practice/speed.ts';
import { isFigureId, isRoutineId } from './ids.ts';
import { COUNTS_MAX, FIGURE_NAME_MAX, FIGURES_MAX, ROUTINE_NAME_MAX } from './limits.ts';

// 端末に保存するルーティン（仕様 §7・Ruling 37・44）。既存のキーは変えず、createdAt を足す。
// 自分で作ったもの（source:'user-created'）と、配布ファイルから受け取ったもの（source:'received'・段5・Ruling 84-2）。
// 受け取ったものは receivedFrom が必須で、編集しても source と receivedFrom は変わらない（Ruling 84-3）。
export type RoutineSource = 'user-created' | 'received';
export interface RoutineFigure { id: string; name: string; counts: string }
export interface RoutineProvenance {
  sourceKind: RoutineSource; authority: null; authorityClaimStatus: 'not-applicable'; reviewStatus: 'unreviewed';
}
// sourceId＝先生の端末でのルーティンの ID（同じルーティンを受け取り直した時に置き換えるため。Ruling 84-4）
export interface ReceivedFrom { distributor: string; receivedAt: string; sourceId?: string }
export interface Routine {
  id: string;
  danceId: string;
  name: string;
  bpm: number | null;          // null = 種目の標準（practiceBpm）
  countInBars: 1 | 2;          // はじめの合図がオンの時の小節数（オン/オフは設定。Ruling 40）
  source: RoutineSource;
  status: 'ready';
  figures: RoutineFigure[];
  provenance: RoutineProvenance;
  receivedFrom?: ReceivedFrom;
  createdWith: { app: 'dance-count'; version: string };
  createdAt: string;
  updatedAt: string;
}

export const USER_PROVENANCE: RoutineProvenance = Object.freeze({
  sourceKind: 'user-created', authority: null, authorityClaimStatus: 'not-applicable', reviewStatus: 'unreviewed'
}) as RoutineProvenance;

export function createRoutine({ id, danceId, name, now }: { id: string; danceId: string; name: string; now: string }): Routine {
  return {
    id, danceId, name, bpm: null, countInBars: 2, source: 'user-created', status: 'ready', figures: [],
    provenance: { ...USER_PROVENANCE }, createdWith: { app: 'dance-count', version: APP_VERSION }, createdAt: now, updatedAt: now
  };
}

// 既定の名前「ワルツのルーティン」。同じ名前があれば「 2」「 3」…（Ruling 37）。
export function uniqueRoutineName(base: string, existing: readonly string[]): string {
  if (!existing.includes(base)) return base;
  for (let number = 2; ; number += 1) {
    const candidate = `${base} ${number}`;
    if (!existing.includes(candidate)) return candidate;
  }
}

// 'empty' = フィガー0件 / 'invalid' = 保存されていたカウントが通らない / 'ok' = 鳴らせる（Ruling 40）。
export function routinePlayability(routine: Pick<Routine, 'danceId' | 'figures'>): 'empty' | 'invalid' | 'ok' {
  if (routine.figures.length === 0) return 'empty';
  try {
    compileRoutine({ danceId: routine.danceId, figures: routine.figures });
    return 'ok';
  } catch {
    return 'invalid';
  }
}

// 保存領域から読んだ値を信用しない（Ruling 44）。型・ID・種目・上限・出どころを確かめ、外れたら null（一覧に出さない）。
// 余計なキーは落とす。createdAt が無い古い値は updatedAt で代用する。
export function normalizeRoutine(raw: unknown): Routine | null {
  if (!isRecord(raw)) return null;
  const { id, danceId, name, bpm, countInBars, source, status, figures, provenance, receivedFrom, createdWith, createdAt, updatedAt } = raw;
  if (!isRoutineId(id) || typeof danceId !== 'string' || !Object.hasOwn(DANCE_PROFILES, danceId)) return null;
  if (!isName(name, ROUTINE_NAME_MAX)) return null;
  if (!(bpm === null || (Number.isInteger(bpm) && (bpm as number) >= BPM_MIN && (bpm as number) <= BPM_MAX))) return null;
  if (countInBars !== 1 && countInBars !== 2) return null;
  if ((source !== 'user-created' && source !== 'received') || status !== 'ready') return null;
  if (!isRecord(provenance) || provenance.sourceKind !== source) return null;
  const from = readReceivedFrom(receivedFrom);
  if (source === 'received' && !from) return null;   // 受け取ったものは「誰から」が無ければ出さない（Ruling 84-2）
  try { validateRoutineProvenance(provenance); } catch { return null; }
  if (!Array.isArray(figures) || figures.length > FIGURES_MAX) return null;
  const cleanFigures: RoutineFigure[] = [];
  for (const figure of figures) {
    if (!isRecord(figure) || !isFigureId(figure.id) || !isName(figure.name, FIGURE_NAME_MAX)) return null;
    if (typeof figure.counts !== 'string' || figure.counts === '' || figure.counts.length > COUNTS_MAX) return null;
    cleanFigures.push({ id: figure.id, name: figure.name, counts: figure.counts });
  }
  if (typeof updatedAt !== 'string' || !isRecord(createdWith) || createdWith.app !== 'dance-count' || typeof createdWith.version !== 'string') return null;
  const routine: Routine = {
    id, danceId, name: name as string, bpm: bpm as number | null, countInBars, source, status, figures: cleanFigures,
    provenance: { ...USER_PROVENANCE, sourceKind: source },
    createdWith: { app: 'dance-count', version: createdWith.version },
    createdAt: typeof createdAt === 'string' ? createdAt : updatedAt,
    updatedAt
  };
  if (from) routine.receivedFrom = from;
  return routine;
}

function readReceivedFrom(value: unknown): ReceivedFrom | null {
  if (!isRecord(value) || typeof value.distributor !== 'string' || typeof value.receivedAt !== 'string') return null;
  return { distributor: value.distributor, receivedAt: value.receivedAt, ...(isRoutineId(value.sourceId) ? { sourceId: value.sourceId } : {}) };
}

function isName(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim() !== '' && value.length <= max;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
