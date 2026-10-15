import { COUNT_VOCABULARIES } from '../../engine/count-vocabularies.js';
import type { AppTranslator } from '../i18n/index.ts';
import type { VoiceLocale } from './ids.ts';
import { VOICE_KEYS, packProgress, renamePack, type VoicePackRecord, type VoiceKey } from './store.ts';

// S8 の進み方（Ruling 59・D25）の純粋な部分。「次へ」は VOICE_KEYS の順に 1 つずつ（録れていない語は飛ばせない）。
// D64（ひとみうさ承認 2026-10-14）: 上の 12 語のチップを押すと、録れていない語も含めてどの語へも移れる（jumpStep）。
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

// 夜間便 A-1（Ruling 123・監査 #1a）: S8 の言葉の既定を決める 1 か所。入口（M0 の行・ほか）が何本あっても同じ答え。
// 途中（0 < 語数 < 12）の声がある言葉。両方とも途中なら updatedAt が新しい方。
// D75（ひとみうさ承認 2026-10-15）: S7 の「続きを録音する」を外したので、S7 からの一回限りの印（requested）は無くした。
// 途中が無ければ 'en'（今までの既定）。説明の画面で 2 択を押した後は呼ばない（画面が「まだ触っていない」で守る）。
export function defaultRecordLanguage(saved: Record<VoiceLocale, VoicePackRecord | null>): VoiceLocale {
  const inProgress = (['en', 'ja-JP'] as const)
    .map(locale => saved[locale])
    .filter((pack): pack is VoicePackRecord => pack !== null && !packProgress(pack).complete && packProgress(pack).recorded > 0);
  if (!inProgress.length) return 'en';
  return inProgress.reduce((newest, pack) => (pack.updatedAt > newest.updatedAt ? pack : newest)).locale as VoiceLocale;
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

// D64: 12 語のチップ（2 段 × 6）。押すとその語へ。合図（3・2・1・今）と録音のあいだ（busy）・今の語・範囲の外は動かない（null）。
// 移る時の片付け（録音をやめる・「聞く」を止める・枠を消す）は画面の goTo（「‹ 前の語」と同じ道）。
export function jumpStep(target: number, current: number, busy: boolean): RecordStep | null {
  if (busy || target === current || !Number.isInteger(target) || target < 0 || target >= VOICE_KEYS.length) return null;
  return { kind: 'word', index: target };
}

// D64: チップの中身。語は録っている声の言葉の第一表記（wordPrompts の main＝見出しと同じ。英語の画面で日本語の声なら「いち」＝D60 の例外と同じ）。
// 見た目: now（今の語。録れていても枠で示す＝前の 12 のますと同じ）・done（録音済み＝紺で塗る）・todo（まだ＝白）。
// 読み上げ: 「4番目・し・録音済み」「5番目・ご・まだ」（今の語は aria-current="step" を足す。録れたかどうかは今の語でも読む）。
export type WordChipState = 'now' | 'done' | 'todo';
export type WordChip = { key: VoiceKey; index: number; word: string; state: WordChipState; current: boolean; label: string };
export function wordChips(pack: VoicePackRecord, current: number, translator: AppTranslator): WordChip[] {
  const locale = pack.locale;
  return VOICE_KEYS.map((key, index) => {
    const recorded = Boolean(pack.words[key]);
    const word = wordPrompts(locale, key, translator.locale).main;
    const state: WordChipState = index === current ? 'now' : recorded ? 'done' : 'todo';
    const label = translator.t('recordWordChip', { index: index + 1, word, state: translator.t(recorded ? 'recordWordDone' : 'recordWordTodo') });
    return { key, index, word, state, current: index === current, label };
  });
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
