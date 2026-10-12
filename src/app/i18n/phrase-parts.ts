import { splitQuotedLabels } from '../lib/quoted-labels.ts';

// 段8（Ruling 97）: 文を「折ってよい所」つきの部品に分ける（純粋。描くのは phrased.tsx）。
// 日本語は ja-phrases.json の句の境（BudouX）で折る。英語は句を持たない（空白で折れる）。
// どちらも「…」“…”（画面の語）と「押します。」は折らない塊（段7 fix 1 の LabeledText と同じ規則）。
// 塊と句の境は「置き換える前の文（template）」で決める（段8 Task 2 fix 1・レビュー I1／M1）。
// {name}・{file} を含む「…」“…” は塊にしない（利用者の名前・ファイル名は長さが分からない。nowrap だと画面からはみ出す）。
// その括弧は free（.dc-free＝word-break: normal）: 中は普通の日本語の折り方で行を埋め、英数字の長い所は overflow-wrap: anywhere が折る。
// keep-all のままだと名前全体が 1 語になり、Safari は「 だけを行末に残して次の行へ送る。名前の中の「」も塊にならない（M1）。
export interface PhrasePart {
  text: string;
  label: boolean;        // 折らない塊（white-space: nowrap）
  breakBefore: boolean;  // この部品の前で折ってよい（<wbr>）
  free?: boolean;        // 置き換えを含む「…」“…”（word-break: normal で普通に折る）
}

const PLACEHOLDER = /\{(\w+)\}/g;
const HAS_PLACEHOLDER = /\{\w+\}/;

function fill(template: string, variables: Record<string, string | number>): string {
  return template.replace(PLACEHOLDER, (whole, name: string) => (variables[name] === undefined ? whole : String(variables[name])));
}

// chunks が template を作り直せない（古い JSON）時は句を使わない（折り方が今までに戻るだけ。番人は test/app/i18n-phrases.test.ts）
// 置き換えの印は句の途中でも「…」の途中でも切れない（道具が保証）ので、部品ごとに置き換えても translator.t() と同じ文になる。
export function phraseParts(template: string, chunks: readonly string[] | undefined, variables: Record<string, string | number> = {}): PhrasePart[] {
  const pieces = chunks && chunks.join('') === template ? chunks : [template];
  const breaks = new Set<number>();
  let offset = 0;
  for (const piece of pieces.slice(0, -1)) {
    offset += piece.length;
    breaks.add(offset);
  }
  const parts: PhrasePart[] = [];
  let position = 0;
  for (const part of splitQuotedLabels(template)) {
    const end = position + part.text.length;
    if (part.label) {
      // 置き換えを含む括弧は塊にしない（中に <wbr> も足さない。折り方は free の CSS に任せる）
      const free = HAS_PLACEHOLDER.test(part.text);
      parts.push({ text: fill(part.text, variables), label: !free, breakBefore: breaks.has(position), ...(free ? { free } : {}) });
    } else {
      let start = position;
      for (const cut of [...breaks].filter(at => at > position && at < end).sort((a, b) => a - b)) {
        parts.push({ text: fill(template.slice(start, cut), variables), label: false, breakBefore: breaks.has(start) });
        start = cut;
      }
      parts.push({ text: fill(template.slice(start, end), variables), label: false, breakBefore: breaks.has(start) });
    }
    position = end;
  }
  if (parts[0]) parts[0].breakBefore = false;
  return parts;
}
