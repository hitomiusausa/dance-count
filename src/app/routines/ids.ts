// ルーティン・フィガーの ID（Ruling 37）。`r-`／`f-` ＋ UUID。ハッシュの ID 区切り（英数字・ハイフン）に収まり、
// 予約語 'new'（#/routines/new）にはなり得ない。
const ID_PATTERN: Record<'r' | 'f', RegExp> = { r: /^r-[A-Za-z0-9-]{8,}$/, f: /^f-[A-Za-z0-9-]{8,}$/ };
const FALLBACK_RANDOM_DIGITS = 8;

export interface IdSource { randomUUID?: () => string; now(): number; random(): number }

// crypto.randomUUID が無い環境（古い Safari）は時刻＋乱数で作る。
function defaultSource(): IdSource {
  const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? () => crypto.randomUUID() : undefined;
  return { randomUUID: uuid, now: () => Date.now(), random: () => Math.random() };
}

// 'v' は受け取った声（`v-<uuid>`。voices/ids.ts の isVoiceId を通る。Ruling 84-1）。
export function makeId(prefix: 'r' | 'f' | 'v', source: IdSource = defaultSource()): string {
  const uuid = source.randomUUID?.();
  if (uuid && /^[A-Za-z0-9-]+$/.test(uuid)) return `${prefix}-${uuid}`;
  const random = Math.floor(source.random() * 36 ** FALLBACK_RANDOM_DIGITS).toString(36).padStart(FALLBACK_RANDOM_DIGITS, '0');
  return `${prefix}-${source.now().toString(36)}-${random}`;
}

export function isRoutineId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.r.test(value);
}

export function isFigureId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.f.test(value);
}
