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

// 夜間便 A-3（Ruling 123・監査 #6）: 置き換える値のうち「この値は折らない」物（例 S8 の {word}＝「スロー」）。
// 値は 1 つの塊（label＝.dc-nowrap）として描く。文字列には何も入れない（textContent は translator.t() と同じ。Ruling 97）。
export interface NowrapValue { text: string; nowrap: true }
export type PhraseVariables = Record<string, string | number | NowrapValue>;

const valueText = (value: string | number | NowrapValue) => (typeof value === 'object' ? value.text : String(value));

function fill(template: string, variables: PhraseVariables): string {
  return template.replace(PLACEHOLDER, (whole, name: string) => (variables[name] === undefined ? whole : valueText(variables[name]!)));
}

// 1 つの部品（置き換える前の文）を、折らない値の所で分ける。値は label の塊・前後は元の部品の性質のまま・分けた所では折らない
function splitNowrap(piece: string, base: Omit<PhrasePart, 'text'>, variables: PhraseVariables): PhrasePart[] {
  const parts: PhrasePart[] = [];
  let start = 0;
  for (const match of piece.matchAll(PLACEHOLDER)) {
    const value = variables[match[1]!];
    if (typeof value !== 'object') continue;
    const before = piece.slice(start, match.index);
    if (before) parts.push({ ...base, text: fill(before, variables), breakBefore: parts.length === 0 && base.breakBefore });
    parts.push({ text: value.text, label: true, breakBefore: parts.length === 0 && base.breakBefore });
    start = match.index! + match[0].length;
  }
  if (!parts.length) return [{ ...base, text: fill(piece, variables) }];
  const after = piece.slice(start);
  if (after) parts.push({ ...base, text: fill(after, variables), breakBefore: false });
  return parts;
}

// chunks が template を作り直せない（古い JSON）時は句を使わない（折り方が今までに戻るだけ。番人は test/app/i18n-phrases.test.ts）
// 置き換えの印は句の途中でも「…」の途中でも切れない（道具が保証）ので、部品ごとに置き換えても translator.t() と同じ文になる。
export function phraseParts(template: string, chunks: readonly string[] | undefined, variables: PhraseVariables = {}): PhrasePart[] {
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
      parts.push(...splitNowrap(part.text, { label: !free, breakBefore: breaks.has(position), ...(free ? { free } : {}) }, variables));
    } else {
      let start = position;
      for (const cut of [...breaks].filter(at => at > position && at < end).sort((a, b) => a - b)) {
        parts.push(...splitNowrap(template.slice(start, cut), { label: false, breakBefore: breaks.has(start) }, variables));
        start = cut;
      }
      parts.push(...splitNowrap(template.slice(start, end), { label: false, breakBefore: breaks.has(start) }, variables));
    }
    position = end;
  }
  if (parts[0]) parts[0].breakBefore = false;
  return parts;
}
