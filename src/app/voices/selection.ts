import type { AppTranslator } from '../i18n/index.ts';
import { honorific } from '../lib/honorific.ts';
import type { AppStorage } from '../platform/storage.ts';
import { STANDARD_VOICE_ID, type AppSettings } from '../settings/settings.ts';
import type { VoiceLocale } from './ids.ts';
import { findStandardVoice } from './standard.ts';
import { isCompletePack, loadVoicePack, type VoicePackRecord } from './store.ts';

// 選んだ声（Ruling 60-3・61）。再生・声チップ・S7 の選択中の行は、保存された selectedVoiceId をここで解いた物だけを使う。
export type VoiceSelection =
  | { kind: 'standard'; id: string; locale: VoiceLocale }
  | { kind: 'pack'; id: string; pack: VoicePackRecord };

export const DEFAULT_VOICE: VoiceSelection = Object.freeze({ kind: 'standard', id: STANDARD_VOICE_ID, locale: 'en' }) as VoiceSelection;

// 標準の声の ID なら、端末を見ずにすぐ決まる（S2 を開いた最初の描画から使える）。
export function standardSelection(id: string): VoiceSelection | null {
  const voice = findStandardVoice(id);
  return voice ? { kind: 'standard', id: voice.id, locale: voice.locale } : null;
}

// 再生時・画面のマウント時に解く。録音・受け取った声が無い・途中・壊れていれば、黙って標準（英語）（設定は書き換えない。Ruling 61-2）。
export async function resolveVoiceSelection(storage: AppStorage | null, selectedVoiceId: string): Promise<VoiceSelection> {
  const standard = standardSelection(selectedVoiceId);
  if (standard) return standard;
  const pack = await loadVoicePack(storage, selectedVoiceId);
  return pack && isCompletePack(pack) ? { kind: 'pack', id: pack.id, pack } : DEFAULT_VOICE;
}

export function packSelection(pack: VoicePackRecord): VoiceSelection {
  return { kind: 'pack', id: pack.id, pack };
}

// 選ぶ＝selectedVoiceId と、そこから導く voiceLocale を必ず一緒に書く（Ruling 60-3）。
export function chooseVoice(voice: VoiceSelection): Partial<AppSettings> {
  return { selectedVoiceId: voice.id, voiceLocale: voice.kind === 'standard' ? voice.locale : voice.pack.locale };
}

// 声を消した時の設定の差分（Ruling 60-4。Ruling 44 の forgetRoutineSettings と同じ型）。選択中なら標準（英語）へ戻す。
export function forgetVoiceSettings(settings: Pick<AppSettings, 'selectedVoiceId' | 'voiceOffsetMsByVoiceId'>, voiceId: string): Partial<AppSettings> {
  const { [voiceId]: _old, ...voiceOffsetMsByVoiceId } = settings.voiceOffsetMsByVoiceId;
  if (settings.selectedVoiceId !== voiceId) return { voiceOffsetMsByVoiceId };
  return { voiceOffsetMsByVoiceId, ...chooseVoice(DEFAULT_VOICE) };
}

// 語ごとのずれ（旧画面で調整した受け取りの声だけが持つ。つまみは globalOffsetMs だけを動かす。Ruling 62-5）。
export function wordOffsetsFor(voice: VoiceSelection): Record<string, number> {
  return voice.kind === 'pack' ? { ...(voice.pack.timingAdjustments?.wordOffsetsMs ?? {}) } : {};
}

// 表示名。S7 の行は長い形（「標準の声（英語）」）、声チップは短い形（「標準（英語）」）。
// 受け取った声は「山田さんの声」（distributor が無ければ声の名前）。録音の声は先生が付けた名前（既定「自分の声（英語）」。D23）。
export function voiceDisplayName(translator: AppTranslator, voice: VoiceSelection, form: 'row' | 'chip'): string {
  if (voice.kind === 'standard') {
    if (voice.locale === 'ja-JP') return translator.t(form === 'row' ? 'standardVoiceJapanese' : 'standardVoiceJapaneseShort');
    return translator.t(form === 'row' ? 'standardVoiceEnglish' : 'standardVoiceShort');
  }
  return packDisplayName(translator, voice.pack);
}

export function packDisplayName(translator: AppTranslator, pack: VoicePackRecord): string {
  if (pack.origin === 'received' && pack.distributor) return translator.t('distributorVoice', { name: honorific(pack.distributor.name, translator.locale) });
  return pack.name;
}
