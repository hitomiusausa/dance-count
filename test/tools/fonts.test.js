// 段7（Ruling 89-3・95-1）: precache する書体のサブセットはアプリの文字から決まる。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  FONT_WEIGHTS, fontFileMatches, neededFontGlob, neededFontSubsets, parseFontsourceCss, subsetsForText, weightsInFontsCss
} from '../../tools/fonts/needed-subsets.js';

const root = path.resolve(import.meta.dirname, '../..');
const notoCss = fs.readFileSync(path.join(root, 'node_modules/@fontsource/noto-sans-jp/400.css'), 'utf8');

test('the @fontsource CSS splits Noto Sans JP into 124 named subsets with unicode ranges', () => {
  const faces = parseFontsourceCss(notoCss);
  assert.equal(faces.length, 124);
  assert.equal(faces[0].name, 'noto-sans-jp-0');
  assert.ok(faces.every(face => face.ranges.length > 0 && face.ranges.every(([a, b]) => a <= b)));
});

test('a subset is needed only when the text has one of its characters', () => {
  const faces = parseFontsourceCss(notoCss);
  const waltz = subsetsForText('ワルツ', faces);
  assert.ok(waltz.length >= 1);
  const ranges = name => faces.find(face => face.name === name).ranges;
  for (const char of 'ワルツ') assert.ok(waltz.some(name => ranges(name).some(([a, b]) => char.codePointAt(0) >= a && char.codePointAt(0) <= b)), char);
  assert.deepEqual(subsetsForText('', faces), []);
  assert.ok(!subsetsForText('ワルツ', faces).includes('noto-sans-jp-0'), 'the rare-kanji subset 0 is not needed for ワルツ');
});

test('the app needs about 40 subsets: Noto Sans JP pieces plus Inter latin only (Ruling 89-3)', () => {
  const subsets = neededFontSubsets(root);
  const noto = subsets.filter(name => name.startsWith('noto-sans-jp-'));
  const inter = subsets.filter(name => name.startsWith('inter-'));
  assert.deepEqual(inter, ['inter-latin']);
  assert.ok(noto.length >= 30 && noto.length <= 50, `Noto subsets ${noto.length}`);
  assert.ok(noto.includes('noto-sans-jp-latin'), 'latin digits and punctuation in Noto as well');
});

test('the weights are the ones fonts.css imports (400・600・700・800)', () => {
  const css = fs.readFileSync(path.join(root, 'src/app/styles/fonts.css'), 'utf8');
  assert.deepEqual(weightsInFontsCss(css), [...FONT_WEIGHTS]);
});

test('the glob and the matcher pick the hashed dist names of those subsets and weights only', () => {
  assert.equal(neededFontGlob(['noto-sans-jp-59', 'inter-latin']), 'assets/{noto-sans-jp-59,inter-latin}-{400,600,700,800}-normal-*.woff2');
  const subsets = ['noto-sans-jp-59', 'inter-latin'];
  assert.equal(fontFileMatches('assets/noto-sans-jp-59-700-normal-AbC_12-x.woff2', subsets), true);
  assert.equal(fontFileMatches('assets/inter-latin-800-normal-Zz9.woff2', subsets), true);
  assert.equal(fontFileMatches('assets/inter-latin-ext-400-normal-Zz9.woff2', subsets), false);
  assert.equal(fontFileMatches('assets/noto-sans-jp-5-400-normal-Zz9.woff2', subsets), false);
  assert.equal(fontFileMatches('assets/noto-sans-jp-59-400-normal-Zz9.woff', subsets), false);
  assert.equal(fontFileMatches('assets/noto-sans-jp-59-500-normal-Zz9.woff2', subsets), false);
  assert.throws(() => neededFontGlob([]));
});

test('an unreadable CSS throws instead of returning an empty list', () => {
  assert.throws(() => parseFontsourceCss('@font-face { font-family: x; }'), /no @font-face/);
});
