// 仕様 §6「言い換え規則」の禁止語。UI 文言に1つでも含まれたらテストで落とす（U14）。
// 英語は単語境界つき・大文字小文字を区別しない（Important や Synchronised は誤検出しない）。
const JAPANESE_FORBIDDEN = [
  'BPM', 'インポート', 'エクスポート', '読み込み', '書き出し', 'カウントイン', '音声パック', 'ボイスパック',
  '設定を保存', 'ストレージ', 'キャッシュ', '同期', 'エラーコード'
] as const;

const ENGLISH_FORBIDDEN = ['bpm', 'import', 'export', 'voice pack', 'storage', 'cache', 'sync', 'error code'] as const;

export function findForbiddenWords(text: string): string[] {
  const found: string[] = JAPANESE_FORBIDDEN.filter(word => text.includes(word));
  for (const word of ENGLISH_FORBIDDEN) {
    const pattern = new RegExp(`\\b${word.replace(/ /g, '\\s+')}\\b`, 'i');
    if (pattern.test(text)) found.push(word);
  }
  return found;
}
