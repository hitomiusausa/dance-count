import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const appDir = path.resolve(import.meta.dirname, '../../src/app');

// 端末依存の入口。ここ以外の src/app から直接触ったら落とす（仕様 §10「lint で禁止」の代わり）。
// - 常に禁止（前に . があっても）: storage 系・indexedDB・matchMedia・clipboard・URL.createObjectURL/revokeObjectURL・new AudioContext/MediaRecorder/Audio・webkitAudioContext・
//   document.defaultView・document の可視状態とイベント（visibilityState・hidden・add/removeEventListener）
// - 裸の識別子だけ禁止（obj.history / obj.addEventListener のような他人のプロパティは許す）: window・navigator・globalThis・self・
//   location・history・addEventListener・removeEventListener・requestAnimationFrame・cancelAnimationFrame・fetch・caches（段5）
//   → `const history = []` のような同名ローカル変数も検出する（紛らわしいので別名にする方針）。
// - 文字列の中身を見て禁止: document.createElement('audio')・'visibilitychange'（iOS の音声解除と WakeLock 再取得の経路）
// - document は描画の入口 main.tsx が使うので対象外（上の document.* だけ禁止）。
const ALWAYS = /\b(localStorage|sessionStorage|indexedDB|webkitAudioContext|matchMedia|clipboard)\b|\bURL\s*\.\s*(createObjectURL|revokeObjectURL)\b|\bnew\s+(AudioContext|MediaRecorder|Audio)\b|\bdocument\s*\.\s*(defaultView|visibilityState|hidden|addEventListener|removeEventListener)\b/;
const BARE = /(?<![.\w$])(window|navigator|globalThis|self|location|history|addEventListener|removeEventListener|requestAnimationFrame|cancelAnimationFrame|fetch|caches)\b/;
const IN_STRINGS = /\bcreateElement\s*\(\s*['"`]audio['"`]|['"`]visibilitychange['"`]/;

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
    const withStrings = code;
    // 文字列は空にするが、テンプレート文字列の ${...} の中身はコードとして残す（`${window.innerWidth}` の見逃し防止）。
    code = code.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, literal =>
      literal.startsWith('`') ? ` "" ${[...literal.matchAll(/\$\{([^}]*)\}/g)].map(match => match[1]).join(' ; ')} "" ` : '""');
    if (ALWAYS.test(code) || BARE.test(code) || IN_STRINGS.test(withStrings)) found.push({ line: index + 1, text: raw.trim() });
  });
  return found;
}

async function sourceFiles(): Promise<string[]> {
  const entries = await fs.readdir(appDir, { recursive: true });
  return entries.filter(entry => /\.(ts|tsx|js|jsx|mjs)$/.test(entry)).map(entry => entry.split(path.sep).join('/'));
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
  'const a = new Audio(src);',
  "const el = document.createElement('audio');",
  'const el = document.createElement(`audio`);',
  "if (document.visibilityState === 'visible') {}",
  'if (document.hidden) return;',
  "document.addEventListener('visibilitychange', onVisible);",
  "target.addEventListener('visibilitychange', onVisible);",
  "addEventListener('resize', onResize);",
  'removeEventListener("resize", onResize);',
  'const id = requestAnimationFrame(draw);',
  'cancelAnimationFrame(id);',
  'const response = await fetch(url);',
  'const width = `${window.innerWidth}px`;',
  'const label = `${a} and ${navigator.language}`;',
  'const cache = await caches.open("dance-count-inbox");',
  'const url = URL.createObjectURL(blob);',
  'URL.revokeObjectURL(url);',
  'await nav.clipboard.writeText(text);',
  'const { clipboard } = nav;',
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
  'button.addEventListener("click", onClick);',
  'const label = `${count} beats`;',
  'const audioLabel = "audio";',
  "document.createElement('div');",
  'const { fetchImpl } = options;',
  'engine.requestAnimationFrame;',
  'const url = new URL(base);',
  'store.caches.length;',
  'const clipboardText = text;',
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

// 段7（Fable の答え 6・Ruling 88-4）: Service Worker の登録は 1 か所。virtual:pwa-register は platform/pwa-register.ts だけが import し、
// pwa-register.ts を import するのは main.tsx だけ。navigator.serviceWorker（serviceWorker）は src/app/platform/ の外に現れない
// （src/sw.ts は SW そのものなので対象外。SW の中から navigator.serviceWorker は使わない）。
test('the service worker is registered in one place: main.tsx → platform/pwa-register.ts → virtual:pwa-register', async () => {
  const importers: string[] = [];
  const virtualImporters: string[] = [];
  const serviceWorkerOutside: string[] = [];
  for (const file of await sourceFiles()) {
    const source = await fs.readFile(path.join(appDir, file), 'utf8');
    if (/(from\s+|import\s*\(\s*)['"]\.{1,2}\/[^'"]*pwa-register(\.ts)?['"]/.test(source)) importers.push(file);
    if (/['"]virtual:pwa-register(\/[^'"]*)?['"]/.test(source)) virtualImporters.push(file);
    if (!file.startsWith('platform/') && /\bserviceWorker\b/.test(source)) serviceWorkerOutside.push(file);
  }
  assert.deepEqual(importers, ['main.tsx']);
  assert.deepEqual(virtualImporters, ['platform/pwa-register.ts']);
  assert.deepEqual(serviceWorkerOutside, []);
});
