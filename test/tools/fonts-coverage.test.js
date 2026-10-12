// 段8（Ruling 103-1）: アプリが画面に出す文字（messages.ts・about.ts の全文）は、precache する書体サブセットの範囲に全部入る。
// 入らない字はオフラインで端末の書体に化ける。わざと端末の書体で描く字だけを SYSTEM_FONT_CHARS に理由つきで置く。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FONT_FAMILIES, neededFontSubsets, parseFontsourceCss, textSourceFiles } from '../../tools/fonts/needed-subsets.js';
import { APP_MESSAGES } from '../../src/app/i18n/messages.ts';
import { ABOUT_TEXT } from '../../src/app/i18n/about.ts';

const root = path.resolve(import.meta.dirname, '../..');
// '⋮'（U+22EE）: Android の Chrome の右上のメニューの形を文字で見せる（S12 の手順 1）。Inter にも Noto Sans JP にも無い＝どの端末でも端末の書体
const SYSTEM_FONT_CHARS = new Set(['⋮']);

test('every character the app shows is inside a precached font subset (no glyph falls back offline)', () => {
  const needed = new Set(neededFontSubsets(root));
  const faces = FONT_FAMILIES.flatMap(family => parseFontsourceCss(fs.readFileSync(path.join(root, 'node_modules/@fontsource', family, '400.css'), 'utf8')))
    .filter(face => needed.has(face.name));
  const text = [APP_MESSAGES, ABOUT_TEXT].flatMap(messages => Object.values(messages).flatMap(strings => Object.values(strings))).join('');
  const missing = [...new Set(text)].filter(char => !SYSTEM_FONT_CHARS.has(char))
    .filter(char => !faces.some(face => face.ranges.some(([a, b]) => char.codePointAt(0) >= a && char.codePointAt(0) <= b)));
  assert.deepEqual(missing.map(char => `${char} U+${char.codePointAt(0).toString(16).toUpperCase()}`), []);
});

test('the text sources are a glob over src/app/i18n, so about.ts and any new message file are read (段7 M1)', () => {
  const files = textSourceFiles(root);
  assert.ok(files.includes('src/app/i18n/messages.ts'));
  assert.ok(files.includes('src/app/i18n/about.ts'));
  assert.ok(files.includes('src/engine/figure-terminology.js'));
});

test('comments do not decide which subsets are precached, but strings (even with "//") do', async () => {
  const { stripComments } = await import('../../tools/fonts/needed-subsets.js');
  const out = stripComments("const a = 'https://x.y/弧'; // 塊の説明\n/* 粋\n償 */ const b = '賠';\n");
  assert.ok(out.includes('https://x.y/弧') && out.includes('賠'));
  assert.ok(!/[塊粋償]/.test(out));
});
