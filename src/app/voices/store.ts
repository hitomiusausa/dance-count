import { REQUIRED_VOICE_KEYS, createRecordedVoicePack, recordedPackProgress, validateRecordedVoicePack } from '../../engine/recorded-voice-pack.js';
import type { AppStorage } from '../platform/storage.ts';
import { isVoiceId, recordedPackIdFor, toVoiceLocale, type VoiceLocale } from './ids.ts';

// 声の保存（Ruling 56）。IndexedDB `dance-count-v2` v2 の voice-packs ストアに platform/storage 経由で読み書きする。
// エンジンの recorded-voice-store.js（v1 を直接開く）は使わない。形の検査はエンジンの validateRecordedVoicePack。
export const VOICE_LIMITS = Object.freeze({
  packs: 20,                       // 声の数（受け取りが増える段5で効く）
  nameLength: 40,                  // 名前（ルーティンと同じ）
  wordBytes: 2 * 1024 * 1024,      // 1 語の WAV（録音は 1 語 ≒ 70KB）
  packBytes: 20 * 1024 * 1024      // 1 つの声の合計
});

export type VoiceKey = 'slow' | 'quick' | 'one' | 'two' | 'three' | 'four' | 'five' | 'six' | 'seven' | 'eight' | 'and' | 'ah';
// S8 の語の順（仕様 §4 S8: スロー・クイック・1〜8・アンド・ア）
export const VOICE_KEYS = REQUIRED_VOICE_KEYS as readonly VoiceKey[];

export interface RecordedWord {
  blob: Blob;
  mimeType: string;
  onsetMs: number;
  sourceOnsetMs: number;
  durationMs: number;
  normalized: true;
  gainDb: number;
}

export interface VoiceTimingAdjustments { globalOffsetMs: number; wordOffsetsMs: Record<string, number>; adjustedAt: string }

export interface VoicePackRecord {
  schemaVersion: 1;
  type: 'dance-count-recorded-voice-pack';
  id: string;
  name: string;
  locale: VoiceLocale;
  vocabularyId: VoiceLocale;
  updatedAt: string;                       // 語を録るたびに更新（再生用に decode した声の記憶の鍵。Ruling 56-7）
  words: Partial<Record<VoiceKey, RecordedWord>>;
  timingAdjustments?: VoiceTimingAdjustments;
  origin: 'recorded' | 'received';
  distributor?: { name: string };          // 受け取った声（段5が書く）
  consent?: { voiceDistribution: true; consentedAt: string };   // 段5が書く
  // 受け取った声だけ（段5・Ruling 84-1）: 先生の端末での ID と更新時刻（同じ先生の声を受け取り直した時に置き換える）・受け取った時刻
  sourceId?: string;
  sourceUpdatedAt?: string;
  receivedAt?: string;
}

// 保存されていた値を信用しない。形が外れた物は null（一覧に出さない・消さない。段3の normalizeRoutine と同じ）。
export function normalizeVoicePackRecord(raw: unknown): VoicePackRecord | null {
  if (!isRecord(raw)) return null;
  try { validateRecordedVoicePack(raw, { requireComplete: false }); } catch { return null; }
  if (!isVoiceId(raw.id)) return null;
  if (typeof raw.name !== 'string' || raw.name.trim().length === 0 || [...raw.name].length > VOICE_LIMITS.nameLength) return null;
  const words = raw.words as Record<string, { blob: Blob }>;
  let total = 0;
  for (const word of Object.values(words)) {
    if (word.blob.size > VOICE_LIMITS.wordBytes) return null;
    total += word.blob.size;
  }
  if (total > VOICE_LIMITS.packBytes) return null;
  const origin = raw.origin === 'received' ? 'received' : 'recorded';
  const distributor = isRecord(raw.distributor) && typeof raw.distributor.name === 'string' && raw.distributor.name.trim()
    ? { name: raw.distributor.name.trim().slice(0, VOICE_LIMITS.nameLength) } : undefined;
  const locale = toVoiceLocale(raw.locale);
  const { distributor: _drop, ...rest } = raw;
  return {
    ...(rest as unknown as VoicePackRecord),
    locale,
    vocabularyId: toVoiceLocale(raw.vocabularyId ?? locale),
    origin,
    ...(distributor ? { distributor } : {})
  };
}

// 録音した声が先、受け取った声が後。同じ種類の中は古い順（Ruling 56-1）。
export function sortVoicePacks(packs: readonly VoicePackRecord[]): VoicePackRecord[] {
  const rank = (pack: VoicePackRecord) => (pack.origin === 'recorded' ? 0 : 1);
  return [...packs].sort((a, b) => rank(a) - rank(b) || a.updatedAt.localeCompare(b.updatedAt) || a.id.localeCompare(b.id));
}

export async function listVoicePacks(storage: AppStorage | null): Promise<VoicePackRecord[]> {
  if (!storage) return [];
  let raw: unknown[];
  try { raw = await storage.getAll('voice-packs'); } catch { return []; }
  return sortVoicePacks(raw.map(normalizeVoicePackRecord).filter((pack): pack is VoicePackRecord => pack !== null));
}

export async function loadVoicePack(storage: AppStorage | null, id: string): Promise<VoicePackRecord | null> {
  if (!storage || !isVoiceId(id)) return null;
  try { return normalizeVoicePackRecord(await storage.get('voice-packs', id)); } catch { return null; }
}

// 失敗は投げずに false（S8 の「保存できませんでした」の根拠。書きはトランザクションの完了まで待つ＝platform/storage.ts）。
export async function saveVoicePack(storage: AppStorage | null, pack: VoicePackRecord): Promise<boolean> {
  if (!storage) return false;
  try { await storage.put('voice-packs', pack); return true; } catch { return false; }
}

export async function deleteVoicePack(storage: AppStorage | null, id: string): Promise<boolean> {
  if (!storage) return false;
  try { await storage.delete('voice-packs', id); return true; } catch { return false; }
}

// 一覧から消す（最終レビュー M4）。端末から消えたと確かめてから、消した後の一覧を返す。消せなければ null（行は残す）。
export async function removeVoicePack(storage: AppStorage | null, packs: readonly VoicePackRecord[], id: string): Promise<VoicePackRecord[] | null> {
  if (!(await deleteVoicePack(storage, id))) return null;
  return packs.filter(pack => pack.id !== id);
}

// その言語の録音の声を新しく作る（まだ語は無い）。名前は既定名（D23「自分の声（英語）」）を呼び出し側が渡す。
export function newRecordedPack(locale: VoiceLocale, name: string, now: string): VoicePackRecord {
  const base = createRecordedVoicePack(name, { id: recordedPackIdFor(locale), locale });
  return { ...base, locale, vocabularyId: locale, updatedAt: now, words: {}, origin: 'recorded' } as VoicePackRecord;
}

// 1 語を入れる（取り直しは上書き）。updatedAt を進める＝再生用の decode の記憶を捨てさせる。
export function withWord(pack: VoicePackRecord, key: VoiceKey, word: RecordedWord, now: string): VoicePackRecord {
  return { ...pack, words: { ...pack.words, [key]: word }, updatedAt: now };
}

// 名前を変える（前後の空白を落とし 40 字まで。空なら null＝呼び出し側が既定名に戻す）。音は変わらないので updatedAt は進めない。
export function renamePack(pack: VoicePackRecord, name: string): VoicePackRecord | null {
  const trimmed = [...name.trim()].slice(0, VOICE_LIMITS.nameLength).join('');
  return trimmed ? { ...pack, name: trimmed } : null;
}

export function packProgress(pack: VoicePackRecord | null): { recorded: number; total: number; complete: boolean } {
  return recordedPackProgress(pack) as { recorded: number; total: number; complete: boolean };
}

// 「完成」＝12 語そろい、エンジンの検査（requireComplete）も通る（Ruling 59-5）。S7 で選べる・S2 で鳴るのはこれだけ。
export function isCompletePack(pack: VoicePackRecord | null): boolean {
  if (!pack || !packProgress(pack).complete) return false;
  try { return validateRecordedVoicePack(pack, { requireComplete: true }); } catch { return false; }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
