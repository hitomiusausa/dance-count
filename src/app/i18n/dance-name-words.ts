import { danceName, type AppLocale } from './index.ts';

// 段8 Task 12（final-review I1・Ruling 97 の仕組みの適用）: 種目タイルの名前を語の境でだけ折る。
// 日本語のカタカナの名前は 1 語に見えるので、折ってよい所をここに 1 か所で持つ（engine の DANCE_NAMES は変えない）。
// 表に無い名前（短い名前・英語）は 1 塊。英語は空白で折れる（keep-all は空白の折れを止めない）。
const JA_DANCE_NAME_WORDS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  vwaltz: ['ヴィエニーズ', 'ワルツ'],
  slowfox: ['スロー', 'フォックス'],
  quickstep: ['クイック', 'ステップ'],
  chacha: ['チャチャ', 'チャ'],
  pasodoble: ['パソ', 'ドブレ']
});

export function danceNameWords(danceId: string, locale: AppLocale): readonly string[] {
  const name = danceName(danceId, locale);
  const words = locale === 'ja-JP' ? JA_DANCE_NAME_WORDS[danceId] : undefined;
  return words && words.join('') === name ? words : [name];
}
