import { DANCE_PROFILES } from '../../engine/dance-profiles.js';
import { normalizeCounts } from './counts.ts';
import type { DraftAction } from './editor.ts';

// カウントの形（D18・Ruling 53）。プロファイルの数（templates・beatsPerBar・allowedTokens）だけから規則で作る「形」の一覧。
// 特定のフィガーの正しいカウントは名乗らない（Ruling 3）。フィガーのデータは読まない。
// 8 を超えても切らない（切ると形が黙って消える）。超えたらテストが落ちる。
export const COUNT_PATTERNS_MAX = 8;
export const SQ_HALF_BAR: readonly string[] = Object.freeze(['S', 'QQ']);
export const SQ_FULL_BAR: readonly string[] = Object.freeze(['SS', 'SQQ', 'QSQ', 'QQS', 'QQQQ']);

interface Profile { templates: readonly string[]; beatsPerBar: number; allowedTokens: readonly string[] }
const PROFILES = DANCE_PROFILES as Record<string, Profile>;

export function countPatterns(danceId: string): string[] {
  const profile = PROFILES[danceId];
  if (!profile) return [];
  const generated = /\d/.test(profile.templates[0] ?? '') ? numberPatterns(profile) : [...SQ_HALF_BAR, ...SQ_FULL_BAR];
  return [...new Set([...profile.templates, ...generated])];
}

// 押された見た目にする形（最終レビュー M2）。主ボタンが「複製して追加」の時は欄のカウントを捨てるので、どの形も押さない。
// それ以外は欄の中身（正規化後）と同じ形を押す。
export function pressedPattern(draftCounts: string, action: DraftAction): string | null {
  return action === 'addCopy' ? null : normalizeCounts(draftCounts);
}

// 数字の種目: 基本形（templates[0] から & と a を除いた先頭 beatsPerBar 文字）の各拍の後ろに副音を付ける／付けない。
function numberPatterns(profile: Profile): string[] {
  const beats = [...profile.templates[0]!.replace(/[&a]/g, '')].slice(0, profile.beatsPerBar);
  const extra = profile.allowedTokens.includes('&') ? '&' : 'a';
  const build = (marked: readonly number[]) => beats.map((beat, index) => (marked.includes(index) ? beat + extra : beat)).join('');
  const indexes = beats.map((_, index) => index);
  if (2 ** beats.length <= COUNT_PATTERNS_MAX) {
    // 全通り: 副音の数が少ない順 → 同じ数なら左の拍に付いた形から。
    return indexes.flatMap((_, size) => combinations(indexes, size)).concat([indexes]).map(build);
  }
  // 多すぎる時: 基本形・副音 1 か所（左から）・全部。
  return [build([]), ...indexes.map(index => build([index])), build(indexes)];
}

function combinations(items: readonly number[], size: number): number[][] {
  if (size === 0) return [[]];
  return items.flatMap((item, index) => combinations(items.slice(index + 1), size - 1).map(rest => [item, ...rest]));
}
