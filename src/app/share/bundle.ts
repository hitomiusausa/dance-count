import { exportRecordedVoicePack, importRecordedVoicePack } from '../../engine/recorded-voice-pack.js';
import { APP_VERSION } from '../app-version.ts';
import { USER_PROVENANCE, normalizeRoutine, routinePlayability, type Routine } from '../routines/routine.ts';
import { ROUTINE_NAME_MAX } from '../routines/limits.ts';
import { isCompletePack, normalizeVoicePackRecord, type VoicePackRecord } from '../voices/store.ts';
import { stripInvisible } from './clean-text.ts';
import { readDistributorId } from './distributor-id.ts';
import { cleanNote } from './note.ts';
import {
  BUNDLE_ROUTINES_MAX, BUNDLE_SCHEMA_VERSION, BUNDLE_TYPE, DISTRIBUTOR_NAME_MAX,
  RECEIVED_MIME_MAX, RECEIVED_MIME_PATTERN, RECEIVED_TIMESTAMP_MAX, RECEIVED_WORD_MS_MAX
} from './limits.ts';

// 配布ファイル（仕様 §7・Ruling 80）を作る・読む純粋な部品。端末には触らない（ファイルの共有・保存・読みは platform/files.ts）。
// 声の形の正本はエンジンの exportRecordedVoicePack／importRecordedVoicePack だけ（アプリ側で base64 の形を書き直さない）。
const LEGACY_VOICE_TYPE = 'dance-count-recorded-voice-pack';

export type ExportedVoice = Record<string, unknown>;   // exportRecordedVoicePack の出力を JSON.parse した物

export interface Consent { voiceDistribution: true; consentedAt: string }

export interface BundleInput {
  distributorName: string;
  voice: ExportedVoice | null;       // exportVoiceForBundle の結果（声を入れない時は null）
  routines: readonly Routine[];
  now: string;
  note?: string | null;              // 生徒へのひとこと（D68・任意・80 字まで）。空なら書かない
  distributorId?: string | null;     // 見分け用の番号（D76・share/distributor-id.ts）。形が外れていれば書かない
}

// 配る人（D76: id は任意。旧アプリのファイル・旧単体パックには無い）
export interface Distributor { name: string; id?: string }

// 配れるのは録音した完成の声だけ（受け取った声は配れない。D37）。S9 は声を選んだ時に 1 回だけ呼び、結果を持っておく
// （名前・同意・ルーティンが変わるたびに 1MB の base64 を作り直さない）。
export async function exportVoiceForBundle(pack: VoicePackRecord): Promise<ExportedVoice> {
  if (pack.origin !== 'recorded' || !isCompletePack(pack)) throw new Error('only a complete recorded voice can be shared');
  return JSON.parse(await exportRecordedVoicePack(pack)) as ExportedVoice;
}

// 40 字で切った後にもう一度空白を落とす（切れ目が空白だと「山田 」になり、同じ先生の声の鍵（D40）がずれる。段5 最終レビューの持ち越し）
export function cleanDistributorName(name: string): string {
  return [...stripInvisible(name).trim()].slice(0, DISTRIBUTOR_NAME_MAX).join('').trim();
}

// 束の JSON 文字列。名前が空・何も入っていない・上限を超える時は投げる（S9 は主ボタンを押せなくしているので、ここに来ない）。
export function buildBundle({ distributorName, voice, routines, now, note = null, distributorId = null }: BundleInput): string {
  const name = cleanDistributorName(distributorName);
  if (!name) throw new Error('distributor name is required');
  if (!voice && routines.length === 0) throw new Error('nothing to share');
  if (routines.length > BUNDLE_ROUTINES_MAX) throw new Error('too many routines');
  const bundle: Record<string, unknown> = {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    type: BUNDLE_TYPE,
    createdAt: now,
    createdWith: { app: 'dance-count', version: APP_VERSION },
    // D76（ひとみうさ承認 2026-10-15）: distributor.id を足しても版（schemaVersion 1）は上げない＝今までのアプリは distributor.name だけを読む
    distributor: { name, ...(readDistributorId(distributorId) ? { id: distributorId } : {}) }
  };
  if (voice) {
    bundle.consent = { voiceDistribution: true, consentedAt: now } satisfies Consent;
    bundle.voicePack = voice;
  }
  // D68: 生徒へのひとこと。版（schemaVersion）は上げない＝今までのアプリは知らない項目として読み飛ばす（parseBundle は決まった項目だけを読む）
  const cleanedNote = cleanNote(note);
  if (cleanedNote) bundle.note = cleanedNote;
  // ルーティンは自分で作った物の形で書く（受け取った物を配り直す時も。元の先生の名前は残さない。Ruling 80-2）。
  if (routines.length > 0) bundle.routines = routines.map(toSharedRoutine);
  return JSON.stringify(bundle);
}

function toSharedRoutine(routine: Routine): Routine {
  const { receivedFrom: _from, ...rest } = routine;
  return { ...rest, source: 'user-created', provenance: { ...USER_PROVENANCE } };
}

export type BundleProblem = 'broken' | 'too-new';

export interface ParsedVoice {
  pack: VoicePackRecord;                 // 先生の端末の ID のまま（受け取る時に付け直す。Ruling 84-1）
  sourceUpdatedAt: string | null;        // 先生の声の更新時刻（importRecordedVoicePack は updatedAt を今に変えるので、その前に読む）
}

export type ParsedBundle =
  | {
      ok: true;
      legacy: boolean;                   // 旧画面の単体パック（dance-count-recorded-voice-pack）
      distributor: Distributor | null;   // 旧単体パックだけ null。id は D76（無い・形が外れていれば持たない）
      consent: Consent | null;
      note: string | null;               // 生徒へのひとこと（D68）。無い・文字列でない・空なら null（ファイルは壊れていない扱い）
      voice: ParsedVoice | null;
      routines: Routine[];               // 鳴らせる物だけ（ID は先生の端末のまま）
      rejected: Array<{ name: string | null }>;   // 読めなかったルーティン（名前が読めなければ null。画面が「（名前なし）」と出す）
    }
  | { ok: false; problem: BundleProblem };

const BROKEN = { ok: false, problem: 'broken' } as const;

// 読む順（Ruling 80-5）: JSON → 種類と版 → 声 → ルーティン → 空でないか。'too-large' は読む前（platform/files.ts）。
export function parseBundle(text: string): ParsedBundle {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return BROKEN; }
  if (!isRecord(data)) return BROKEN;

  let legacy = false;
  let rawVoice: unknown = null;
  let rawRoutines: unknown = undefined;
  let distributor: Distributor | null = null;
  let consent: Consent | null = null;
  let note: string | null = null;
  if (data.type === BUNDLE_TYPE) {
    if (Number.isInteger(data.schemaVersion) && (data.schemaVersion as number) > BUNDLE_SCHEMA_VERSION) return { ok: false, problem: 'too-new' };
    if (data.schemaVersion !== BUNDLE_SCHEMA_VERSION) return BROKEN;
    const name = isRecord(data.distributor) && typeof data.distributor.name === 'string' ? cleanDistributorName(data.distributor.name) : '';
    if (!name) return BROKEN;
    // D76: 番号の形が外れていても壊れたファイルにしない（番号なしとして読む）
    const id = readDistributorId((data.distributor as Record<string, unknown>).id);
    distributor = id ? { name, id } : { name };
    note = cleanNote(data.note);
    rawVoice = data.voicePack ?? null;
    rawRoutines = data.routines;
    if (rawVoice !== null) {
      if (!isRecord(data.consent) || data.consent.voiceDistribution !== true) return BROKEN;
      consent = { voiceDistribution: true, consentedAt: readTimestamp(data.consent.consentedAt) ?? '' };
    }
  } else if (data.type === LEGACY_VOICE_TYPE) {
    legacy = true;
    rawVoice = data;
  } else {
    return BROKEN;
  }

  let voice: ParsedVoice | null = null;
  if (rawVoice !== null) {
    voice = readVoice(rawVoice);
    if (!voice) return BROKEN;
  }

  const routines: Routine[] = [];
  const rejected: Array<{ name: string | null }> = [];
  if (rawRoutines !== undefined) {
    if (!Array.isArray(rawRoutines) || rawRoutines.length > BUNDLE_ROUTINES_MAX) return BROKEN;
    const seenIds = new Set<unknown>();
    for (const rawRoutine of rawRoutines) {
      // 同じ ID が 2 度あれば後の方は読まない（アプリは作らない。置き換えの時に片方だけ残って増えていくのを防ぐ。最終レビュー M1）
      if (isRecord(rawRoutine) && typeof rawRoutine.id === 'string') {
        if (seenIds.has(rawRoutine.id)) continue;
        seenIds.add(rawRoutine.id);
      }
      const raw = withCleanNames(rawRoutine);
      const routine = normalizeRoutine(raw);
      if (routine && routinePlayability(routine) === 'ok') routines.push(routine);
      else rejected.push({ name: readableName(raw) });
    }
  }
  if (!voice && routines.length === 0) return BROKEN;   // 空の束・全部読めない束は「読めなかった」と同じ（Ruling 80-5-5）
  return { ok: true, legacy, distributor, consent, note, voice, routines, rejected };
}

// 声はエンジンの import（base64 → Blob・形の検査）→ 12 語そろい → 端末に保存できる形（名前・語ごと 2MB・合計 20MB）。
function readVoice(raw: unknown): ParsedVoice | null {
  if (!isRecord(raw)) return null;
  let imported: Record<string, unknown>;
  try { imported = importRecordedVoicePack(JSON.stringify(raw)) as Record<string, unknown>; } catch { return null; }
  const name = typeof imported.name === 'string' ? stripInvisible(imported.name) : imported.name;
  const words = readWords(imported.words);
  if (!words) return null;
  const pack = normalizeVoicePackRecord({ ...imported, name, words, origin: 'recorded' });
  if (!pack || !isCompletePack(pack)) return null;
  return { pack, sourceUpdatedAt: readTimestamp(raw.updatedAt) };
}

// 語の値を確かめる（最終レビュー I1。ファイルの値で音を大きくしたり再生を壊したりさせない）:
// 音量（gainDb）はファイルの値を捨てて 0（アプリは 0 しか書かない）。形（mimeType）は録音が作る音声の形だけ（でなければ読めない）。
// 時間（開始・録音の中の開始・長さ）は有限で 0〜RECEIVED_WORD_MS_MAX（長さは 0 より大きい）。外れたら読めない。
// 未整形の語（旧画面）は録音の中の開始・長さを持たないことがある（無ければ無いまま）。
function readWords(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;
  const words: Record<string, unknown> = {};
  for (const [key, word] of Object.entries(raw)) {
    if (!isRecord(word)) return null;
    const mimeType = readMimeType(word.mimeType);
    if (!mimeType) return null;
    const optional = word.normalized !== true;
    if (!isMs(word.onsetMs, false)) return null;
    if (!(optional && word.sourceOnsetMs === undefined) && !isMs(word.sourceOnsetMs, false)) return null;
    if (!(optional && word.durationMs === undefined) && !isMs(word.durationMs, true)) return null;
    words[key] = { ...word, mimeType, gainDb: 0 };
  }
  return words;
}

function isMs(value: unknown, positive: boolean): value is number {
  return typeof value === 'number' && Number.isFinite(value) && (positive ? value > 0 : value >= 0) && value <= RECEIVED_WORD_MS_MAX;
}

// 受け付ける音声の形なら小文字・空白なしにそろえて返す。文字列でない・長すぎる・知らない形は null。
export function readMimeType(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > RECEIVED_MIME_MAX) return null;
  const canonical = value.toLowerCase().replace(/\s+/g, '');
  return RECEIVED_MIME_PATTERN.test(canonical) ? canonical : null;
}

// 時刻の文字列（同意の時刻・先生の声の更新時刻）。画面には出さないが、長い文字列を端末に保存しない（最終レビュー M4）。
export function readTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > RECEIVED_TIMESTAMP_MAX) return null;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : null;
}

// ルーティンとフィガーの名前から見えない文字を除いてから形を確かめる（除いて空になった名前は「読めない」）。
function withCleanNames(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  const clean = { ...raw };
  if (typeof raw.name === 'string') clean.name = stripInvisible(raw.name);
  if (Array.isArray(raw.figures)) {
    clean.figures = raw.figures.map(figure => isRecord(figure) && typeof figure.name === 'string' ? { ...figure, name: stripInvisible(figure.name) } : figure);
  }
  return clean;
}

function readableName(raw: unknown): string | null {
  if (!isRecord(raw) || typeof raw.name !== 'string' || !raw.name.trim()) return null;
  return [...raw.name.trim()].slice(0, ROUTINE_NAME_MAX).join('');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
