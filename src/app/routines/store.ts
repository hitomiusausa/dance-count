import type { AppStorage } from '../platform/storage.ts';
import { normalizeRoutine, type Routine } from './routine.ts';

// ルーティンの読み書き（仕様 §7・Ruling 37・44）。IndexedDB の routines ストア（keyPath 'id'）。
// 読んだ値は normalizeRoutine を通し、外れたものは一覧に出さない（消さない・上書きもしない）。並びは作った順。
export async function loadRoutines(storage: AppStorage | null): Promise<Routine[]> {
  if (!storage) return [];
  let raw: unknown[];
  try { raw = await storage.getAll<unknown>('routines'); } catch { return []; }
  return sortRoutines(raw.map(normalizeRoutine).filter((routine): routine is Routine => routine !== null));
}

export function sortRoutines(routines: readonly Routine[]): Routine[] {
  return [...routines].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

// 書き込みは1本の列で順番に（連続した自動保存が前後しないように。設定の保存と同じ考え）。失敗は投げずに false。
let chain: Promise<unknown> = Promise.resolve();

function enqueue(write: () => Promise<void>): Promise<boolean> {
  const result = chain.then(write).then(() => true, () => false);
  chain = result;
  return result;
}

export function saveRoutine(storage: AppStorage | null, routine: Routine): Promise<boolean> {
  if (!storage) return Promise.resolve(false);
  return enqueue(() => storage.put('routines', routine));
}

export function deleteRoutine(storage: AppStorage | null, id: string): Promise<boolean> {
  if (!storage) return Promise.resolve(false);
  return enqueue(() => storage.delete('routines', id));
}
