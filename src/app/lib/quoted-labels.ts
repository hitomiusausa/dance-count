// 文の中の「…」“…” を、折らない塊として切り出す（段7 fix 1・レビュー I1）。純粋。
// 60〜70代は画面の語（「ホーム画面に追加」など）の形をそのまま探すので、語の途中で行を折らない。
// auto-phrase は Chrome だけで、iPhone の Safari（WebKit）では「ホーム／画面に追加」と折れたため、括弧ごと white-space: nowrap の塊にする。
// 手順の動詞「押します。」「押し、」も塊にする（段7 Task 12: Android の手順 2 が 375 幅で「押しま／す。」と折れた）。
export interface TextPart { text: string; label: boolean }

const LABEL = /「[^「」]*」|“[^“”]*”|押し(?:ます。|、)/g;

export function splitQuotedLabels(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(LABEL)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start), label: false });
    parts.push({ text: match[0], label: true });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), label: false });
  return parts;
}
