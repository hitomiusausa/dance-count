// 旧画面が localStorage に残した表示言語（'dance-count-v2-ui-locale'）を1回だけ取り出す（Ruling 26）。
// 読めたら消す。消すのは呼び出し側が新しい保存に成功した後（移せたものだけ消す。仕様 §7）。
export const LEGACY_UI_LOCALE_KEY = 'dance-count-v2-ui-locale';

export function readLegacyUiLocale(): string | null {
  try { return localStorage.getItem(LEGACY_UI_LOCALE_KEY); } catch { return null; }
}

export function forgetLegacyUiLocale(): void {
  try { localStorage.removeItem(LEGACY_UI_LOCALE_KEY); } catch { /* 読めない端末では何もしない */ }
}
