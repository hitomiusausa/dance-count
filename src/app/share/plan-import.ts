import { ROUTINES_MAX } from '../routines/limits.ts';
import { USER_PROVENANCE, type Routine } from '../routines/routine.ts';
import { VOICE_KEYS, VOICE_LIMITS, type VoicePackRecord } from '../voices/store.ts';
import type { ParsedBundle } from './bundle.ts';

// 受け取る前の計画（S10 の「確認」の中身。Ruling 83-2・84。純粋）: ID を付け直し、同じ物は置き換え、上限で止める。
type ParsedOk = Extract<ParsedBundle, { ok: true }>;

export interface ImportPlan {
  voice: { pack: VoicePackRecord; replaces: VoicePackRecord | null } | null;
  voiceBlocked: boolean;           // 声が 20 に当たる（置き換えでない追加）＝このファイルは受け取らない（選ぶ画面の枠）
  routines: Array<{ routine: Routine; replaces: string | null }>;
  routinesOverLimit: number;       // 200 本に入らなかった本数
  rejected: Array<{ name: string | null }>;
  distributor: { name: string } | null;
}

export interface PlanContext {
  now: string;
  newId(prefix: 'v' | 'r' | 'f'): string;
}

export function planImport(parsed: ParsedOk, packs: readonly VoicePackRecord[], routines: readonly Routine[], { now, newId }: PlanContext): ImportPlan {
  let voice: ImportPlan['voice'] = null;
  let voiceBlocked = false;
  if (parsed.voice) {
    const source = parsed.voice.pack;
    // 同じ先生の同じ言葉の声＝受け取った声のうち、配る人の名前・先生の端末の ID・言葉が同じ物（旧単体パックは名前なし同士。Ruling 84-4）。
    const same = packs.find(pack => pack.origin === 'received' && pack.sourceId === source.id && pack.locale === source.locale
      && (pack.distributor?.name ?? null) === (parsed.distributor?.name ?? null)) ?? null;
    if (!same && packs.length >= VOICE_LIMITS.packs) voiceBlocked = true;
    else voice = { pack: receivedPack(parsed, now, newId('v')), replaces: same };
  }

  const planned: ImportPlan['routines'] = [];
  let room = ROUTINES_MAX - routines.length;
  let routinesOverLimit = 0;
  for (const routine of parsed.routines) {
    const same = routines.find(item => item.receivedFrom?.sourceId === routine.id) ?? null;
    if (!same && room <= 0) { routinesOverLimit += 1; continue; }
    if (!same) room -= 1;
    planned.push({ routine: receivedRoutine(routine, parsed.distributor?.name ?? '', now, newId), replaces: same?.id ?? null });
  }
  return { voice, voiceBlocked, routines: planned, routinesOverLimit, rejected: parsed.rejected, distributor: parsed.distributor };
}

// 受け取った声（Ruling 84-1）: 新しい v- の ID・origin:'received'・誰から・同意・先生の端末の ID と時刻。
// 声のタイミングは先生の端末の遅れ（globalOffsetMs）を捨て、語ごとの癖（wordOffsetsMs）だけ残す。両方 0 なら持たない。
// ファイルから来た値は決まった項目だけを写す（知らない項目を端末に保存しない。後で VoicePackRecord に足す項目を
// ファイルが先に埋めることもできない。段5 Tasks 1–3 レビュー 1）。
function receivedPack(parsed: ParsedOk, now: string, id: string): VoicePackRecord {
  const source = parsed.voice!.pack;
  const wordOffsetsMs: Record<string, number> = {};
  for (const key of VOICE_KEYS) {
    const value = source.timingAdjustments?.wordOffsetsMs?.[key];
    if (typeof value === 'number' && value !== 0) wordOffsetsMs[key] = value;
  }
  const keepWords = Object.keys(wordOffsetsMs).length > 0;
  const adjustedAt = typeof source.timingAdjustments?.adjustedAt === 'string' ? source.timingAdjustments.adjustedAt : now;
  return {
    schemaVersion: 1,
    type: 'dance-count-recorded-voice-pack',
    id,
    name: source.name,
    locale: source.locale,
    vocabularyId: source.vocabularyId,
    updatedAt: now,
    words: receivedWords(source.words),
    ...(keepWords ? { timingAdjustments: { globalOffsetMs: 0, wordOffsetsMs, adjustedAt } } : {}),
    origin: 'received',
    ...(parsed.distributor ? { distributor: { name: parsed.distributor.name } } : {}),
    ...(parsed.consent ? { consent: { voiceDistribution: true, consentedAt: parsed.consent.consentedAt } } : {}),
    sourceId: source.id,
    ...(parsed.voice!.sourceUpdatedAt ? { sourceUpdatedAt: parsed.voice!.sourceUpdatedAt } : {}),
    receivedAt: now
  };
}

function receivedWords(words: VoicePackRecord['words']): VoicePackRecord['words'] {
  const clean: VoicePackRecord['words'] = {};
  for (const key of VOICE_KEYS) {
    const word = words[key];
    if (!word) continue;
    const { blob, mimeType, onsetMs, sourceOnsetMs, durationMs, normalized, gainDb } = word;
    clean[key] = { blob, mimeType, onsetMs, sourceOnsetMs, durationMs, normalized, gainDb };
  }
  return clean;
}

// 受け取ったルーティン（Ruling 84-2）: ルーティンもフィガーも新しい ID・source:'received'・誰から（先生の端末の ID を sourceId に）。
function receivedRoutine(routine: Routine, distributor: string, now: string, newId: PlanContext['newId']): Routine {
  return {
    ...routine,
    id: newId('r'),
    figures: routine.figures.map(figure => ({ ...figure, id: newId('f') })),
    source: 'received',
    provenance: { ...USER_PROVENANCE, sourceKind: 'received' },
    receivedFrom: { distributor, receivedAt: now, sourceId: routine.id },
    createdAt: now,
    updatedAt: now
  };
}

export interface ImportWriter {
  saveVoice(pack: VoicePackRecord): Promise<boolean>;
  deleteVoice(id: string): Promise<boolean>;
  saveRoutine(routine: Routine): Promise<boolean>;
  removeRoutine(id: string): Promise<boolean>;
}

// 「使う」: 新しい物を先に書き、書けてから古い物を消す（途中で失敗しても、前から持っていた物は消えない）。
// 1 つでも書けなければ false（S10 は確認の画面に留まり「保存できませんでした」。Ruling 83-3）。
export async function commitImport(plan: ImportPlan, writer: ImportWriter): Promise<boolean> {
  if (plan.voice) {
    if (!(await writer.saveVoice(plan.voice.pack))) return false;
    if (plan.voice.replaces) await writer.deleteVoice(plan.voice.replaces.id);
  }
  for (const { routine, replaces } of plan.routines) {
    if (!(await writer.saveRoutine(routine))) return false;
    if (replaces) await writer.removeRoutine(replaces);
  }
  return true;
}
