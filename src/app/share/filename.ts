import type { AppLocale } from '../i18n/index.ts';
import { BUNDLE_EXTENSION } from './limits.ts';

// 配布ファイルの名前（Ruling 80-3・D36）: 声-<先生名>-<YYYY-MM-DD>.dancecount.txt（声が無ければ ルーティン-…）。英語の画面は voice-／routines-。
// ファイル名に使えない文字（/ \ : * ? " < > | と制御文字）は _。名前が空なら 名前なし／unnamed。日付は端末の時計の日付。
const UNSAFE = /[/\\:*?"<>|\u0000-\u001f\u007f]/g;

export function bundleFileName({ locale, distributorName, hasVoice, now }: { locale: AppLocale; distributorName: string; hasVoice: boolean; now: Date }): string {
  const ja = locale === 'ja-JP';
  const prefix = hasVoice ? (ja ? '声' : 'voice') : (ja ? 'ルーティン' : 'routines');
  const name = distributorName.trim().replace(UNSAFE, '_') || (ja ? '名前なし' : 'unnamed');
  return `${prefix}-${name}-${localDate(now)}${BUNDLE_EXTENSION}`;
}

function localDate(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
