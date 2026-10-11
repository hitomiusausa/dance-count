import { DANCE_PROFILES } from '../../engine/dance-profiles.js';
import { compileRhythm } from '../../engine/rhythm-compiler.js';

// カウント欄の正規化と検証（仕様 §4 S4・Ruling 38）。パーサのトークンは変えない（表記ゆれを吸収するだけ）。
// 'symbols' = その種目で使えない記号がある / 'leading' = & か a で始まる / 'invalid' = 記号は正しいが数えられない並び。
// 空欄は問題として見せない（「決定」が押せないだけ。打つ前から赤くしない）。
export type CountsProblem = 'symbols' | 'leading' | 'invalid';
export interface CountsCheck { counts: string; empty: boolean; problem: CountsProblem | null }

const PROFILES = DANCE_PROFILES as Record<string, { allowedTokens: readonly string[] }>;
// 使える文字の区切り（Ruling 50 D14-1）: 日本語は「・」（U+30FB・空白なし）、英語は「 · 」（U+00B7・前後に空白）。
const SYMBOL_SEPARATOR: Record<'en' | 'ja-JP', string> = { 'ja-JP': '\u30FB', en: ' \u00B7 ' };

// NFKC（全角→半角）→ s/q は大文字・A は小文字 → 空白と | と「・」を除く（Ruling 38・50 D14-5。半角「･」は NFKC で「・」になる）。
export function normalizeCounts(input: string): string {
  return input.normalize('NFKC').replace(/[sq]/g, letter => letter.toUpperCase()).replace(/A/g, 'a').replace(/[\s|\u30FB]/g, '');
}

// 「使える文字：1・2・3・&」の中身（Ruling 50 D14-1）。@（声なしの1拍）は受け付けるが案内に出さない。
export function allowedSymbols(danceId: string, locale: 'en' | 'ja-JP'): string {
  return (PROFILES[danceId]?.allowedTokens ?? []).filter(token => token !== '@').join(SYMBOL_SEPARATOR[locale]);
}

export function checkCounts(danceId: string, input: string): CountsCheck {
  const counts = normalizeCounts(input);
  if (counts === '') return { counts, empty: true, problem: null };
  const allowed = PROFILES[danceId]?.allowedTokens ?? [];
  if ([...counts].some(token => !allowed.includes(token))) return { counts, empty: false, problem: 'symbols' };
  if (counts[0] === '&' || counts[0] === 'a') return { counts, empty: false, problem: 'leading' };
  try {
    compileRhythm({ danceId, counts });
  } catch {
    return { counts, empty: false, problem: 'invalid' };
  }
  return { counts, empty: false, problem: null };
}
