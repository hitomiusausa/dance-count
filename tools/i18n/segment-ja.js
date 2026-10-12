#!/usr/bin/env node
// 段8（Ruling 97）: 日本語の文言を BudouX（budoux 0.9.3・devDependency）で句に切り、src/app/i18n/ja-phrases.json に書く。
// 画面は句の境に <wbr> を入れ、word-break: keep-all で「語の途中」では折らない（Safari は auto-phrase を持たない＝F42）。
// 実行時に BudouX は動かさない（モデル 23.6KB を precache に足さない）。文字列そのものには何も入れない（クリップボード・aria-label・テストの比較は今のまま）。
// 使い方: npm run i18n:phrases（messages.ts・about.ts を変えたら必ず。test/app/i18n-phrases.test.ts が古い JSON を落とす）
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadDefaultJapaneseParser } from 'budoux';

const ROOT = path.resolve(import.meta.dirname, '../..');
export const PHRASES_PATH = 'src/app/i18n/ja-phrases.json';
// 手で折らないと決めた所（折らない空白 U+00A0・折らない印 U+2060）の前後では切らない（Ruling 97-1 の読み替え。
// 文ごと 1 句にすると、keep-all の下では overflow-wrap: anywhere の任意の所でしか折れなくなる＝段8 計画者の発見 2）
const HAND_SET = /[\u00A0\u2060]/;

// 1 つの文を句に切る（純粋。parser は BudouX の Parser）。{…} の置き換えの印を句の途中で切らない（切れていたら前後を結ぶ）。
export function segmentText(parser, text) {
  const merged = [];
  for (const chunk of parser.parse(text)) {
    const last = merged.at(-1);
    if (last !== undefined && (openPlaceholder(last) || HAND_SET.test(last.at(-1)) || HAND_SET.test(chunk[0]))) merged[merged.length - 1] = last + chunk;
    else merged.push(chunk);
  }
  if (merged.join('') !== text) throw new Error(`BudouX changed the text: ${text}`);
  return merged;
}

// 「{」が開いたまま（閉じる「}」が後に無い）
function openPlaceholder(text) {
  return text.lastIndexOf('{') > text.lastIndexOf('}');
}

// { 鍵: 句の配列 }。1 句の文は載せない（画面はそのまま描く）
export function buildPhrases(parser, entries) {
  const phrases = {};
  for (const [key, text] of entries) {
    const chunks = segmentText(parser, text);
    if (chunks.length > 1) phrases[key] = chunks;
  }
  return phrases;
}

export function formatPhrases(phrases) {
  // 折らない空白・折らない印は見えないので \u の形で書く（JSON として同じ値）
  const visible = value => JSON.stringify(value).replace(/[\u00A0\u2060]/g, char => `\\u${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
  const lines = Object.entries(phrases).map(([key, chunks]) => `  ${JSON.stringify(key)}: ${visible(chunks)}`);
  return `{\n${lines.join(',\n')}\n}\n`;
}

// 句に切る日本語の文（messages.ts の ja-JP。段8 Task 4 で about.ts も足す）
export async function jaEntries(root = ROOT) {
  const { APP_MESSAGES } = await import(path.join(root, 'src/app/i18n/messages.ts'));
  return Object.entries(APP_MESSAGES['ja-JP']);
}

export async function renderPhrases(root = ROOT) {
  return formatPhrases(buildPhrases(loadDefaultJapaneseParser(), await jaEntries(root)));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const text = await renderPhrases();
  fs.writeFileSync(path.join(ROOT, PHRASES_PATH), text);
  console.log(`wrote ${PHRASES_PATH} (${text.split('\n').length - 3} keys)`);
}
