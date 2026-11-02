import { ROUTINES_MAX } from '../routines/limits.ts';
import { USER_PROVENANCE, type Routine } from '../routines/routine.ts';
import { VOICE_KEYS, VOICE_LIMITS, type VoicePackRecord } from '../voices/store.ts';
import { readTimestamp, type Distributor, type ParsedBundle } from './bundle.ts';
import { RECEIVED_WORD_OFFSET_MAX_MS } from './limits.ts';

// 受け取る前の計画（S10 の「確認」の中身。Ruling 83-2・84。純粋）: ID を付け直し、同じ物は置き換え、上限で止める。
type ParsedOk = Extract<ParsedBundle, { ok: true }>;

export interface ImportPlan {
  voice: { pack: VoicePackRecord; replaces: VoicePackRecord | null } | null;
  voiceBlocked: boolean;           // 声が 20 に当たる（置き換えでない追加）＝このファイルは受け取らない（選ぶ画面の枠）
  routines: Array<{ routine: Routine; replaces: string | null }>;
  routinesOverLimit: number;       // 200 本に入らなかった本数
  rejected: Array<{ name: string | null }>;
  distributor: Distributor | null;
  note: string | null;             // 生徒へのひとこと（D68）。S10 の「受け取りました」に出し、受け取ったルーティンにも持たせる
}

export interface PlanContext {
  now: string;
  newId(prefix: 'v' | 'r' | 'f'): string;
}

export function planImport(parsed: ParsedOk, packs: readonly VoicePackRecord[], routines: readonly Routine[], { now, newId }: PlanContext): ImportPlan {
  let voice: ImportPlan['voice'] = null;
  let voiceBlocked = false;
  if (parsed.voice) {
    const same = sameVoice(parsed, packs);
    if (!same && packs.length >= VOICE_LIMITS.packs) voiceBlocked = true;
    else voice = { pack: receivedPack(parsed, now, newId('v')), replaces: same };
  }

  const planned: ImportPlan['routines'] = [];
  let room = ROUTINES_MAX - routines.length;
  let routinesOverLimit = 0;
  for (const routine of parsed.routines) {
    const same = sameRoutine(routine, parsed.distributor?.id ?? null, routines);
    if (!same && room <= 0) { routinesOverLimit += 1; continue; }
    if (!same) room -= 1;
    planned.push({ routine: receivedRoutine(routine, parsed.distributor, parsed.note, now, newId), replaces: same?.id ?? null });
  }
  return { voice, voiceBlocked, routines: planned, routinesOverLimit, rejected: parsed.rejected, distributor: parsed.distributor, note: parsed.note };
}

// 同じ先生の同じ言葉の声（D76（ひとみうさ承認 2026-10-15）。D40・Ruling 84-4 を置き換え）。相手は受け取った声だけ（自分の録音は置き換えない）。
// 鍵: 先生の端末の声の ID（sourceId）と言葉は常に同じであること。その上で配る人を
//   ファイルに番号あり × 番号の同じ声がある          → それ（名前は見ない＝名前を変えた先生も置き換わる。新しい声は新しい名前）
//   ファイルに番号あり × 同じ番号の声が無い          → 番号の無い声のうち名前が同じ物（D40。番号の前のファイルで受け取った同じ先生を 1 度だけ置き換える）
//   ファイルに番号なし（旧アプリ・旧単体パック）     → 番号の無い声のうち名前が同じ物（D40。旧単体パックは名前なし同士）
//   番号の違う声・ファイルに番号が無い時の番号つきの声 → 置き換えない（同じ名前の別の先生かもしれない。消すより 2 つ残る方が安全＝S7 で消せる）
function sameVoice(parsed: ParsedOk, packs: readonly VoicePackRecord[]): VoicePackRecord | null {
  const source = parsed.voice!.pack;
  const candidates = packs.filter(pack => pack.origin === 'received' && pack.sourceId === source.id && pack.locale === source.locale);
  const id = parsed.distributor?.id ?? null;
  if (id) {
    const byId = candidates.find(pack => pack.distributor?.id === id);
    if (byId) return byId;
  }
  const name = parsed.distributor?.name ?? null;
  return candidates.find(pack => !pack.distributor?.id && (pack.distributor?.name ?? null) === name) ?? null;
}

// 同じルーティン＝先生の端末のルーティンの ID（でたらめな r- の ID）が同じ受け取った物（Ruling 84-4）。
// D76: 両方に番号があれば番号も同じこと（片方に無ければ今までどおり ID だけ。番号の前に受け取った物も置き換わる）。
function sameRoutine(routine: Routine, distributorId: string | null, routines: readonly Routine[]): Routine | null {
  return routines.find(item => item.receivedFrom?.sourceId === routine.id
    && (!distributorId || !item.receivedFrom.distributorId || item.receivedFrom.distributorId === distributorId)) ?? null;
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
    // ずれはアプリが作れる幅に収める（最終レビュー I1）
    const clamped = typeof value === 'number' && Number.isFinite(value)
      ? Math.max(-RECEIVED_WORD_OFFSET_MAX_MS, Math.min(RECEIVED_WORD_OFFSET_MAX_MS, value)) : 0;
    if (clamped !== 0) wordOffsetsMs[key] = clamped;
  }
  const keepWords = Object.keys(wordOffsetsMs).length > 0;
  const adjustedAt = readTimestamp(source.timingAdjustments?.adjustedAt) ?? now;
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
    ...(parsed.distributor ? { distributor: { name: parsed.distributor.name, ...(parsed.distributor.id ? { id: parsed.distributor.id } : {}) } } : {}),
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
    const { blob, mimeType, onsetMs, sourceOnsetMs, durationMs, normalized } = word;
    // 音量はファイルの値を使わない（アプリは 0 しか書かない。gainDb:120 のファイルで耳元に爆音を出させない。最終レビュー I1）
    clean[key] = { blob, mimeType, onsetMs, sourceOnsetMs, durationMs, normalized, gainDb: 0 };
  }
  return clean;
}

// 受け取ったルーティン（Ruling 84-2）: ルーティンもフィガーも新しい ID・source:'received'・誰から（先生の端末の ID を sourceId に）。
function receivedRoutine(routine: Routine, distributor: Distributor | null, note: string | null, now: string, newId: PlanContext['newId']): Routine {
  return {
    ...routine,
    id: newId('r'),
    figures: routine.figures.map(figure => ({ ...figure, id: newId('f') })),
    source: 'received',
    provenance: { ...USER_PROVENANCE, sourceKind: 'received' },
    receivedFrom: {
      distributor: distributor?.name ?? '', receivedAt: now, sourceId: routine.id,
      ...(distributor?.id ? { distributorId: distributor.id } : {}), ...(note ? { note } : {})
    },
    createdAt: now,
    updatedAt: now
  };
}

export interface ImportWriter {
  saveVoice(pack: VoicePackRecord): Promise<boolean>;
  voiceSaved?(pack: VoicePackRecord): void;   // 書けたらすぐ選ぶ（古い声を消した後でルーティンが書けなくても、選択が消えた声を指さない。段5 Task 7 M2）
  deleteVoice(id: string): Promise<boolean>;
  saveRoutine(routine: Routine): Promise<boolean>;
  removeRoutine(id: string): Promise<boolean>;
}

// 「使う」: 新しい物を先に書き、書けてから古い物を消す（途中で失敗しても、前から持っていた物は消えない）。
// 1 つでも書けなければ false（S10 は確認の画面に留まり「保存できませんでした」。Ruling 83-3）。
export async function commitImport(plan: ImportPlan, writer: ImportWriter): Promise<boolean> {
  if (plan.voice) {
    if (!(await writer.saveVoice(plan.voice.pack))) return false;
    writer.voiceSaved?.(plan.voice.pack);
    if (plan.voice.replaces) await writer.deleteVoice(plan.voice.replaces.id);
  }
  for (const { routine, replaces } of plan.routines) {
    if (!(await writer.saveRoutine(routine))) return false;
    if (replaces) await writer.removeRoutine(replaces);
  }
  return true;
}
