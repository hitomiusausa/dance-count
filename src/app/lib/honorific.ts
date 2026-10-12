// D49（代理決定・ひとみうさ確認待ち）: 配る人（先生）の名前の呼び方。日本語は「山田さん」、名前が「先生」「さん」「様」で終わる時は「さん」を付けない
// （「山田先生」「山田さん」「山田様」。Fable OQ6: 「山田さんさん」「山田様さん」も出さない）。
// 英語はそのまま（“Yamada-sensei's voice” のように打った名前を出す）。純粋。文言の鍵（distributorVoice・receivedFrom・madeBy・fileVoiceFrom・
// replaceVoiceFrom・receivedVoiceFrom）の ja は「{name}の声」の形で、{name} にこの関数の結果を入れる。
const NO_SAN_SUFFIXES = ['先生', 'さん', '様'] as const;

export function honorific(name: string, locale: string): string {
  if (locale !== 'ja-JP') return name;
  return NO_SAN_SUFFIXES.some(suffix => name.endsWith(suffix)) ? name : `${name}さん`;
}
