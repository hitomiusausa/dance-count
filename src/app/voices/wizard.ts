import { COUNT_VOCABULARIES } from '../../engine/count-vocabularies.js';
import type { AppTranslator } from '../i18n/index.ts';
import type { VoiceLocale } from './ids.ts';
import { VOICE_KEYS, renamePack, type VoicePackRecord, type VoiceKey } from './store.ts';

// S8 の進み方（Ruling 59・D25）の純粋な部分。語は VOICE_KEYS の順に 1 つずつ・飛ばせない。
export type RecordStep = { kind: 'intro' } | { kind: 'word'; index: number } | { kind: 'done' };

// 最初の未録音の語。全部録れていれば null（完成画面から。D25）。
export function firstMissingIndex(pack: VoicePackRecord | null): number | null {
  const index = VOICE_KEYS.findIndex(key => !pack?.words[key]);
  return index < 0 ? null : index;
}

export function stepAfterStart(pack: VoicePackRecord | null): RecordStep {
  const index = firstMissingIndex(pack);
  return index === null ? { kind: 'done' } : { kind: 'word', index };
}

// 「次へ」はその語が録れている時だけ。12 語目の次は完成（Ruling 59-4）。
export function nextStep(pack: VoicePackRecord | null, index: number): RecordStep | null {
  if (!pack?.words[VOICE_KEYS[index]!]) return null;
  return index + 1 >= VOICE_KEYS.length ? { kind: 'done' } : { kind: 'word', index: index + 1 };
}

// 録音の途中（語の画面）の失敗の行き先（Ruling 57-6・58-2）。拒否と非対応だけ説明の画面の枠へ。
// 'failed'（使用中・録音が作れない・空の Blob 等）と種類の分からない失敗は、その語に留まって「声が入っていませんでした」。
// ステップ0（「録音をはじめる」）の 'failed' は別（Fable Q2 の micFailed）で、ここは通らない。
export type TakeErrorOutcome = 'denied' | 'unsupported' | 'no-voice';
export function takeErrorOutcome(kind: string | null): TakeErrorOutcome {
  return kind === 'denied' || kind === 'unsupported' ? kind : 'no-voice';
}

export function previousStep(index: number): RecordStep | null {
  return index > 0 ? { kind: 'word', index: index - 1 } : null;
}

// 見出しの語（56px）＝選んだ言葉の語彙の第一表記、下の小さい語（20px）＝もう一方の語彙の第一表記（Ruling 0-1 の訂正）。
// D60（2026-10-14）: 下の小さい語は日本語の画面だけ。英語の画面では出さない（英語の声に「いち」、日本語の声に「One」と
// 2 つ並ぶと、どちらを言うのか迷う）。英語の画面で日本語の声を録る時は、言う語（いち）が見出しに 1 回だけ出る。
export function wordPrompts(locale: VoiceLocale, key: VoiceKey, uiLocale: string): { main: string; other: string | null } {
  const vocabularies = COUNT_VOCABULARIES as Record<VoiceLocale, { prompts: Record<string, readonly string[]> }>;
  const other: VoiceLocale = locale === 'ja-JP' ? 'en' : 'ja-JP';
  return { main: vocabularies[locale].prompts[key]![0]!, other: uiLocale === 'ja-JP' ? vocabularies[other].prompts[key]![0]! : null };
}

// 既定名（D23）「自分の声（英語）」「自分の声（日本語）」。録り始めた時の表示言語で付ける。
export function defaultVoiceName(translator: AppTranslator, locale: VoiceLocale): string {
  return translator.t(locale === 'ja-JP' ? 'defaultVoiceNameJa' : 'defaultVoiceNameEn');
}

// 完成画面の名前の欄（最終レビュー M1）。空にしたら既定名に戻す。shown は欄に書き戻す名前＝保存される名前
// （名前が変わらない時も書き戻す。欄が空のまま見えるのを防ぐ）。next は保存する声（変わらなければ null）。
export function nameAfterEdit(pack: VoicePackRecord, typed: string, defaultName: string): { next: VoicePackRecord | null; shown: string } {
  const renamed = renamePack(pack, typed) ?? { ...pack, name: defaultName };
  return { next: renamed.name === pack.name ? null : renamed, shown: renamed.name };
}

// 検査用の ui-state（見た目だけ。Ruling 63-3）の S8 は端末の声にも設定にも書かない（最終レビュー M5）。
// 録った語・名前は画面の中だけ（使い捨て）。ui-state の無い普通の S8 だけが保存する。
export function savesVoices(uiState: string | undefined): boolean {
  return uiState === undefined;
}

// ui-state=no-voice の 1 語目の声: 端末に英語の声があればその写し（録れた語の上に枠が出る形を見るため）、無ければ新しい空の声。
export function uiStateStartPack(savedEn: VoicePackRecord | null, fresh: VoicePackRecord): VoicePackRecord {
  return savedEn ?? fresh;
}
