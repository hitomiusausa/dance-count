// 段7（Ruling 89-3）: 端末に先に入れておく（precache）書体のサブセットを、アプリの文字から決める。純粋・Node だけ。
// @fontsource の CSS は 1 つの太さを unicode-range で 124（Noto Sans JP）・7（Inter）に分けている。全部を precache すると 28MB になるので、
// アプリが画面に出す文字（文言・種目名・フィガー名・カウントの語）が入るサブセットだけを選ぶ（約 1.8MB）。
// 文言を足せば一覧も自動で変わる。ユーザーが打った珍しい字は一覧に無いことがある（オフラインでは端末の書体になる。Ruling 89-4）。
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');

// アプリの文字の出どころ（Ruling 89-3・103-1）。ファイルの全文字を集める（コメントの字が混ざっても多めになるだけ）。
// 段8: 文言は src/app/i18n/*.ts の全部（messages.ts・about.ts・将来の鍵）を glob で拾う＝別のファイルに文を書いても漏れない（段7 M1）
export const TEXT_SOURCES = Object.freeze([
  'src/app/i18n/*.ts',
  'src/engine/ui-messages.js',
  'src/engine/figure-terminology.js',
  'src/engine/count-vocabularies.js',
  'src/engine/dance-profiles.js'
]);
export const FONT_FAMILIES = Object.freeze(['noto-sans-jp', 'inter']);
// fonts.css が import する太さと同じ（test/tools/fonts.test.js が fonts.css と一致を固定する）。
export const FONT_WEIGHTS = Object.freeze([400, 600, 700, 800]);

// 「/* noto-sans-jp-[59]-400-normal */ @font-face { … unicode-range: U+…; }」を { name: 'noto-sans-jp-59', ranges } に。
// 形が読めない（@fontsource の版上げで CSS が変わった）時は投げる＝黙って空の一覧にしない。
export function parseFontsourceCss(css) {
  const faces = [];
  for (const match of css.matchAll(/\/\*\s*([\w[\]-]+?)-(\d{3})-normal\s*\*\/\s*@font-face\s*{([^}]*)}/g)) {
    const range = match[3].match(/unicode-range:\s*([^;]+);/);
    if (!range) throw new Error(`no unicode-range for ${match[1]}`);
    const ranges = range[1].split(',').map(part => {
      const [from, to] = part.trim().replace(/^U\+/i, '').split('-');
      const a = Number.parseInt(from, 16);
      const b = Number.parseInt(to ?? from, 16);
      if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error(`bad unicode-range "${part}" in ${match[1]}`);
      return [a, b];
    });
    faces.push({ name: match[1].replace(/[[\]]/g, ''), ranges });
  }
  if (faces.length === 0) throw new Error('no @font-face with a unicode-range was found (has the @fontsource CSS changed?)');
  return faces;
}

// 文字列の文字が 1 つでも入るサブセットの名前（CSS の順）。
export function subsetsForText(text, faces) {
  const codes = new Set([...text].map(char => char.codePointAt(0)));
  return faces.filter(face => [...codes].some(code => face.ranges.some(([a, b]) => code >= a && code <= b))).map(face => face.name);
}

// TEXT_SOURCES の glob を今の木のファイルに広げる（順は決まった並び）。1 つも当たらない形は投げる＝黙って文字を落とさない
export function textSourceFiles(root = ROOT) {
  return TEXT_SOURCES.flatMap(pattern => {
    const files = fs.globSync(pattern, { cwd: root }).map(file => file.split(path.sep).join('/')).sort();
    if (files.length === 0) throw new Error(`no file matches ${pattern}`);
    return files;
  });
}

// コメント（// と /* */）の字は画面に出ない: サブセット（precache の量）を決めない。'https://' の「//」は文字列なので消さない（直前が空白か行頭の時だけ行コメント）
export function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

export function readAppText(root = ROOT) {
  return textSourceFiles(root).map(file => stripComments(fs.readFileSync(path.join(root, file), 'utf8'))).join('');
}

// アプリの文字が要るサブセット名（Noto → Inter の順）。サブセットの番号と範囲は太さをまたいで同じなので 400 の CSS で決める。
export function neededFontSubsets(root = ROOT) {
  const text = readAppText(root);
  return FONT_FAMILIES.flatMap(family =>
    subsetsForText(text, parseFontsourceCss(fs.readFileSync(path.join(root, 'node_modules/@fontsource', family, '400.css'), 'utf8'))));
}

// fonts.css の @import から太さを読む（FONT_WEIGHTS と一致することをテストで固定する）。
export function weightsInFontsCss(css) {
  return [...new Set([...css.matchAll(/@import\s+'@fontsource\/[\w-]+\/(\d{3})\.css'/g)].map(match => Number(match[1])))].sort((a, b) => a - b);
}

// dist の書体のファイル名（Vite がハッシュを付ける）: assets/noto-sans-jp-59-400-normal-<hash>.woff2・assets/inter-latin-400-normal-<hash>.woff2
export function fontFileMatches(file, subsets, weights = FONT_WEIGHTS) {
  const match = file.match(/^assets\/([\w-]+?)-(\d{3})-normal-[\w-]+\.woff2$/);
  return Boolean(match && subsets.includes(match[1]) && weights.includes(Number(match[2])));
}

// injectManifest.globPatterns に渡す 1 本の glob（160 ファイル）。
export function neededFontGlob(subsets, weights = FONT_WEIGHTS) {
  if (subsets.length === 0) throw new Error('no font subsets');
  return `assets/{${subsets.join(',')}}-{${weights.join(',')}}-normal-*.woff2`;
}
