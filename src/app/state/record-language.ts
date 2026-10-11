import type { VoiceLocale } from '../voices/ids.ts';

// S7 の途中の声の「続きを録音する」から S8 へ渡す一回限りの印（その言葉を選んだ状態で S8 を開く）。URL・保存には書かない。
let pending: VoiceLocale | null = null;

export function requestRecordLanguage(locale: VoiceLocale): void {
  pending = locale;
}

export function takeRecordLanguage(): VoiceLocale | null {
  const value = pending;
  pending = null;
  return value;
}
