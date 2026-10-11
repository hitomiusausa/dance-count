import { exportRecordedVoicePack, importRecordedVoicePack } from '../../engine/recorded-voice-pack.js';
import { APP_VERSION } from '../app-version.ts';
import { USER_PROVENANCE, normalizeRoutine, routinePlayability, type Routine } from '../routines/routine.ts';
import { ROUTINE_NAME_MAX } from '../routines/limits.ts';
import { isCompletePack, normalizeVoicePackRecord, type VoicePackRecord } from '../voices/store.ts';
import { BUNDLE_ROUTINES_MAX, BUNDLE_SCHEMA_VERSION, BUNDLE_TYPE, DISTRIBUTOR_NAME_MAX } from './limits.ts';

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
}

// 配れるのは録音した完成の声だけ（受け取った声は配れない。D37）。S9 は声を選んだ時に 1 回だけ呼び、結果を持っておく
// （名前・同意・ルーティンが変わるたびに 1MB の base64 を作り直さない）。
export async function exportVoiceForBundle(pack: VoicePackRecord): Promise<ExportedVoice> {
  if (pack.origin !== 'recorded' || !isCompletePack(pack)) throw new Error('only a complete recorded voice can be shared');
  return JSON.parse(await exportRecordedVoicePack(pack)) as ExportedVoice;
}

export function cleanDistributorName(name: string): string {
  return [...name.trim()].slice(0, DISTRIBUTOR_NAME_MAX).join('');
}

// 束の JSON 文字列。名前が空・何も入っていない・上限を超える時は投げる（S9 は主ボタンを押せなくしているので、ここに来ない）。
export function buildBundle({ distributorName, voice, routines, now }: BundleInput): string {
  const name = cleanDistributorName(distributorName);
  if (!name) throw new Error('distributor name is required');
  if (!voice && routines.length === 0) throw new Error('nothing to share');
  if (routines.length > BUNDLE_ROUTINES_MAX) throw new Error('too many routines');
  const bundle: Record<string, unknown> = {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    type: BUNDLE_TYPE,
    createdAt: now,
    createdWith: { app: 'dance-count', version: APP_VERSION },
    distributor: { name }
  };
  if (voice) {
    bundle.consent = { voiceDistribution: true, consentedAt: now } satisfies Consent;
    bundle.voicePack = voice;
  }
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
      distributor: { name: string } | null;   // 旧単体パックだけ null
      consent: Consent | null;
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
  let distributor: { name: string } | null = null;
  let consent: Consent | null = null;
  if (data.type === BUNDLE_TYPE) {
    if (Number.isInteger(data.schemaVersion) && (data.schemaVersion as number) > BUNDLE_SCHEMA_VERSION) return { ok: false, problem: 'too-new' };
    if (data.schemaVersion !== BUNDLE_SCHEMA_VERSION) return BROKEN;
    const name = isRecord(data.distributor) && typeof data.distributor.name === 'string' ? cleanDistributorName(data.distributor.name) : '';
    if (!name) return BROKEN;
    distributor = { name };
    rawVoice = data.voicePack ?? null;
    rawRoutines = data.routines;
    if (rawVoice !== null) {
      if (!isRecord(data.consent) || data.consent.voiceDistribution !== true) return BROKEN;
      consent = { voiceDistribution: true, consentedAt: typeof data.consent.consentedAt === 'string' ? data.consent.consentedAt : '' };
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
    for (const raw of rawRoutines) {
      const routine = normalizeRoutine(raw);
      if (routine && routinePlayability(routine) === 'ok') routines.push(routine);
      else rejected.push({ name: readableName(raw) });
    }
  }
  if (!voice && routines.length === 0) return BROKEN;   // 空の束・全部読めない束は「読めなかった」と同じ（Ruling 80-5-5）
  return { ok: true, legacy, distributor, consent, voice, routines, rejected };
}

// 声はエンジンの import（base64 → Blob・形の検査）→ 12 語そろい → 端末に保存できる形（名前・語ごと 2MB・合計 20MB）。
function readVoice(raw: unknown): ParsedVoice | null {
  if (!isRecord(raw)) return null;
  let imported: Record<string, unknown>;
  try { imported = importRecordedVoicePack(JSON.stringify(raw)) as Record<string, unknown>; } catch { return null; }
  const pack = normalizeVoicePackRecord({ ...imported, origin: 'recorded' });
  if (!pack || !isCompletePack(pack)) return null;
  return { pack, sourceUpdatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null };
}

function readableName(raw: unknown): string | null {
  if (!isRecord(raw) || typeof raw.name !== 'string' || !raw.name.trim()) return null;
  return [...raw.name.trim()].slice(0, ROUTINE_NAME_MAX).join('');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
