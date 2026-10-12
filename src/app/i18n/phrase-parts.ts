import { splitQuotedLabels } from '../lib/quoted-labels.ts';

// 段8（Ruling 97）: 文を「折ってよい所」つきの部品に分ける（純粋。描くのは phrased.tsx）。
// 日本語は ja-phrases.json の句の境（BudouX）で折る。英語は句を持たない（空白で折れる）。
// どちらも「…」“…”（画面の語）と「押します。」は折らない塊（段7 fix 1 の LabeledText と同じ規則）。
// 置き換え（{name} など）は句の中で行うので、名前は折らない塊のまま入る（長い名前は CSS の overflow-wrap: anywhere が最後に折る）。
export interface PhrasePart {
  text: string;
  label: boolean;        // 折らない塊（white-space: nowrap）
  breakBefore: boolean;  // この部品の前で折ってよい（<wbr>）
}

const PLACEHOLDER = /\{(\w+)\}/g;

function fill(template: string, variables: Record<string, string | number>): string {
  return template.replace(PLACEHOLDER, (whole, name: string) => (variables[name] === undefined ? whole : String(variables[name])));
}

// chunks が template を作り直せない（古い JSON）時は句を使わない（折り方が今までに戻るだけ。番人は test/app/i18n-phrases.test.ts）
export function phraseParts(template: string, chunks: readonly string[] | undefined, variables: Record<string, string | number> = {}): PhrasePart[] {
  const pieces = chunks && chunks.join('') === template ? chunks.map(chunk => fill(chunk, variables)) : [fill(template, variables)];
  const text = pieces.join('');
  const breaks = new Set<number>();
  let offset = 0;
  for (const piece of pieces.slice(0, -1)) {
    offset += piece.length;
    breaks.add(offset);
  }
  const parts: PhrasePart[] = [];
  let position = 0;
  for (const part of splitQuotedLabels(text)) {
    const end = position + part.text.length;
    if (part.label) {
      parts.push({ text: part.text, label: true, breakBefore: breaks.has(position) });
    } else {
      let start = position;
      for (const cut of [...breaks].filter(at => at > position && at < end).sort((a, b) => a - b)) {
        parts.push({ text: text.slice(start, cut), label: false, breakBefore: breaks.has(start) });
        start = cut;
      }
      parts.push({ text: text.slice(start, end), label: false, breakBefore: breaks.has(start) });
    }
    position = end;
  }
  if (parts[0]) parts[0].breakBefore = false;
  return parts;
}
