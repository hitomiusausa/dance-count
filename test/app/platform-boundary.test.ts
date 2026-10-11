import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const appDir = path.resolve(import.meta.dirname, '../../src/app');

// 端末依存の入口。ここ以外の src/app から直接触ったら落とす（仕様 §10「lint で禁止」の代わり）。
// - 常に禁止（前に . があっても）: storage 系・indexedDB・matchMedia・new AudioContext/MediaRecorder・webkitAudioContext・document.defaultView
// - 裸の識別子だけ禁止（obj.history / obj.location のような他人のプロパティは許す）: window・navigator・globalThis・self・location・history
//   → `const history = []` のような同名ローカル変数も検出する（紛らわしいので別名にする方針）。
// - document は描画の入口 main.tsx が使うので対象外（document.defaultView だけ禁止）。
const ALWAYS = /\b(localStorage|sessionStorage|indexedDB|webkitAudioContext|matchMedia)\b|\bnew\s+(AudioContext|MediaRecorder)\b|\bdocument\s*\.\s*defaultView\b/;
const BARE = /(?<![.\w$])(window|navigator|globalThis|self|location|history)\b/;

// コメントと文字列の中身を落とす（ブロックコメントは行をまたいで追う）。
export function findDeviceAccess(source: string): { line: number; text: string }[] {
  const found: { line: number; text: string }[] = [];
  let inBlock = false;
  source.split('\n').forEach((raw, index) => {
    let code = '';
    let rest = raw;
    while (rest.length > 0) {
      if (inBlock) {
        const close = rest.indexOf('*/');
        if (close < 0) { rest = ''; break; }
        inBlock = false;
        rest = rest.slice(close + 2);
        continue;
      }
      const open = rest.indexOf('/*');
      const lineComment = rest.search(/(^|\s)\/\//);
      if (lineComment >= 0 && (open < 0 || lineComment < open)) { code += rest.slice(0, lineComment); rest = ''; break; }
      if (open < 0) { code += rest; rest = ''; break; }
      code += rest.slice(0, open);
      inBlock = true;
      rest = rest.slice(open + 2);
    }
    code = code.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, '""');
    if (ALWAYS.test(code) || BARE.test(code)) found.push({ line: index + 1, text: raw.trim() });
  });
  return found;
}

async function sourceFiles(): Promise<string[]> {
  const entries = await fs.readdir(appDir, { recursive: true });
  return entries.filter(entry => /\.(ts|tsx|js|mjs)$/.test(entry)).map(entry => entry.split(path.sep).join('/'));
}

const MUST_FLAG = [
  'const { localStorage } = window;',
  'const nav = navigator;',
  'if (typeof navigator === "undefined") return;',
  "if ('x' in navigator) {}",
  'const w = globalThis.window;',
  'self.localStorage.getItem(k);',
  'const v = document.defaultView;',
  'const m = matchMedia("(prefers-color-scheme: dark)");',
  'const c = new AudioContext();',
  'const C = webkitAudioContext;',
  'const r = new MediaRecorder(stream);',
  'await navigator.wakeLock.request("screen");',
  'indexedDB.open("x");',
  'sessionStorage.setItem(a, b);',
  'window.location.hash = h;',
  'history.pushState(null, "", h);',
  'const history = [];',
];

const MUST_NOT_FLAG = [
  'state.history.push(x);',
  'item.location.name',
  '// window.location.hash is read in platform only',
  '   // navigator.language',
  '/* window.innerWidth */',
  'const label = "history";',
  'document.getElementById("app");',
  'const route = "#/history";',
];

test('detector flags every realistic device access', () => {
  for (const line of MUST_FLAG) assert.equal(findDeviceAccess(line).length, 1, `should flag: ${line}`);
});

test('detector ignores other objects\' properties, comments and strings', () => {
  for (const line of MUST_NOT_FLAG) assert.deepEqual(findDeviceAccess(line), [], `should not flag: ${line}`);
  assert.deepEqual(findDeviceAccess('/*\n window.x\n navigator.y\n*/\nconst a = 1;'), []);
  assert.deepEqual(findDeviceAccess('/* c */ const w = window;').map(f => f.line), [1]);
});

test('only src/app/platform touches window, navigator, storage, location or history', async () => {
  const offenders: string[] = [];
  for (const file of await sourceFiles()) {
    if (file.startsWith('platform/')) continue;
    const source = await fs.readFile(path.join(appDir, file), 'utf8');
    for (const hit of findDeviceAccess(source)) offenders.push(`${file}:${hit.line}: ${hit.text}`);
  }
  assert.deepEqual(offenders, []);
});

test('platform adapters named in spec §10 exist', async () => {
  const files = await sourceFiles();
  for (const name of ['audio-context.ts', 'recorder.ts', 'storage.ts', 'files.ts', 'wake-lock.ts']) {
    assert.ok(files.includes(`platform/${name}`), `missing platform/${name}`);
  }
});
