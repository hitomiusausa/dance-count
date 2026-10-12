import { splitQuotedLabels } from '../lib/quoted-labels.ts';

// 文の中の「…」“…”（画面の語）を折らずに描く（段7 fix 1・レビュー I1。S12 の手順・S8 の「先に追加」の 1 行）。
export function LabeledText({ text }: { text: string }) {
  return <>{splitQuotedLabels(text).map((part, index) => (part.label ? <span key={index} class="dc-nowrap">{part.text}</span> : part.text))}</>;
}
