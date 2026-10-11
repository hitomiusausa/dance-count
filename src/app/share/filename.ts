import type { AppLocale } from '../i18n/index.ts';
import { BUNDLE_EXTENSION } from './limits.ts';

// 配布ファイルの名前（Ruling 80-3・D36）: 声-<先生名>-<YYYY-MM-DD>.dancecount.txt（声が無ければ ルーティン-…）。英語の画面は voice-／routines-。
// ファイル名に使えない文字（/ \ : * ? " < > | と制御文字）は _。名前が空なら 名前なし／unnamed。日付は端末の時計の日付。
// 文字の向きを変える見えない文字（U+202E など）は取り除く（名前の表示が逆向きに化けない。段5 Tasks 1–3 レビュー 6）。
const UNSAFE = /[/\\:*?"<>|\u0000-\u001f\u007f-\u009f]/g;
const BIDI_CONTROLS = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;
const CONTROLS = /[\u0000-\u001f\u007f-\u009f]/g;

export function bundleFileName({ locale, distributorName, hasVoice, now }: { locale: AppLocale; distributorName: string; hasVoice: boolean; now: Date }): string {
  const ja = locale === 'ja-JP';
  const prefix = hasVoice ? (ja ? '声' : 'voice') : (ja ? 'ルーティン' : 'routines');
  const name = distributorName.replace(BIDI_CONTROLS, '').trim().replace(UNSAFE, '_') || (ja ? '名前なし' : 'unnamed');
  return `${prefix}-${name}-${localDate(now)}${BUNDLE_EXTENSION}`;
}

function localDate(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// 受け取ったファイルの名前（選んだファイル・Android の受け口）を画面に出す前に、制御文字と向きを変える見えない文字を除く。
// 何も残らなければ fallback（エラー文の「（ファイル名）」が空にならない）。
export const RECEIVED_FILE_FALLBACK = 'bundle.dancecount.txt';

export function cleanReceivedFileName(name: string, fallback: string): string {
  return name.replace(BIDI_CONTROLS, '').replace(CONTROLS, '').trim() || fallback;
}
