// 段7の番人（Ruling 89-2・89-3・93-6・95-6）: 作り物の dist で、正しい形は通り、1 項目ずつ壊すと落ちる。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BOOT_STYLE_MAX_BYTES, PRECACHE_MAX_BYTES, RENDER_BLOCKING_CSS_MAX_BYTES, checkPwaDist, readPrecacheList, stylesheetLinks } from '../../tools/pwa/check-pwa.js';

const VOICES = [{ id: 'default-en-female-v1', locale: 'en' }];
const SUBSETS = ['noto-sans-jp-59', 'inter-latin'];
const WORDS = ['slow', 'quick', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'and', 'ah'];
const HTML = '<head><meta name="apple-mobile-web-app-title" content="Dance Count"><link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">'
  + '<link rel="manifest" href="./manifest.webmanifest"><style>.dc-boot{color:#1B2A4A}</style>'
  + '<link rel="stylesheet" crossorigin href="./assets/index-AbC.css">'
  + '<link rel="stylesheet" href="./assets/fonts-F0.css" media="print" onload="this.media=&#39;all&#39;"></head>'
  + '<body><div id="app"><div class="dc-boot" aria-hidden="true"><svg viewBox="0 0 200 200"></svg><b>Dance Count</b></div></div></body>';
const MANIFEST = {
  name: 'Dance Count', short_name: 'Dance Count', start_url: './', scope: './', display: 'standalone',
  icons: [{ src: 'icons/icon-192.png' }, { src: 'icons/icon-512-maskable.png', purpose: 'maskable' }],
  share_target: { action: './receive', method: 'POST', enctype: 'multipart/form-data', params: { files: [{ name: 'bundle', accept: ['text/plain'] }] } }
};

function goodFiles() {
  const files = {
    'index.html': HTML,
    'manifest.webmanifest': JSON.stringify(MANIFEST),
    'assets/index-AbC.js': 'js', 'assets/index-AbC.css': '.dc-screen{color:#000}', 'assets/fonts-F0.css': '@font-face{font-family:Inter}',
    'icons/icon-192.png': 'png', 'icons/icon-512-maskable.png': 'png', 'icons/apple-touch-icon.png': 'png',
    'audio/default-en-female-v1/manifest.json': '{}',
    'assets/noto-sans-jp-1-400-normal-X.woff2': 'unused subset (not precached)',
    'assets/noto-sans-jp-59-400-normal-X.woff': 'woff (not precached)'
  };
  for (const word of WORDS) files[`audio/default-en-female-v1/${word}.wav`] = 'wav';
  for (const subset of SUBSETS) for (const weight of [400, 600, 700, 800]) files[`assets/${subset}-${weight}-normal-H${weight}.woff2`] = 'font';
  return files;
}

const precached = files => Object.keys(files).filter(file => !file.includes('noto-sans-jp-1-') && !file.endsWith('.woff'));

async function makeDist({ files = goodFiles(), precache = precached(files), sw } = {}) {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-pwa-'));
  const swText = sw ?? `self.addEventListener("message",()=>{}),xe(),we(${JSON.stringify(precache.map(url => ({ revision: 'r', url })))},{ignoreURLParametersMatching:Ne});`;
  const all = { ...files, 'sw.js': swText };
  for (const [file, text] of Object.entries(all)) {
    await fs.mkdir(path.dirname(path.join(dist, file)), { recursive: true });
    await fs.writeFile(path.join(dist, file), text);
  }
  return { dist, files: Object.keys(all) };
}

const check = async options => checkPwaDist({ ...(await makeDist(options)), standardVoices: VOICES, fontSubsets: SUBSETS });

test('the precache list is read out of the built sw.js', () => {
  assert.deepEqual(readPrecacheList('a(),we([{"revision":"1","url":"index.html"},{"revision":null,"url":"a]b.js"}],{x:1})'),
    [{ revision: '1', url: 'index.html' }, { revision: null, url: 'a]b.js' }]);
  assert.equal(readPrecacheList('no list here'), null);
});

test('a correct dist passes', async () => {
  assert.deepEqual(await check(), []);
});

test('sw.js and the manifest must sit at the root of dist (Ruling 93-4)', async () => {
  const files = goodFiles();
  delete files['manifest.webmanifest'];
  assert.deepEqual(await check({ files, precache: precached(goodFiles()).filter(file => file !== 'manifest.webmanifest') }), ['missing manifest.webmanifest at the root of dist']);
});

test('the manifest keeps the name, standalone, relative scope and the share_target of stage 5 (Ruling 93)', async () => {
  for (const [patch, expected] of [
    [{ short_name: 'DanceCount…' }, /name\/short_name/],
    [{ display: 'browser' }, /standalone/],
    [{ start_url: '/' }, /start_url/],
    [{ share_target: { ...MANIFEST.share_target, action: '/receive' } }, /share_target/],
    [{ icons: [{ src: 'icons/missing.png', purpose: 'maskable' }] }, /icons\/missing\.png is not in dist/]
  ]) {
    const files = { ...goodFiles(), 'manifest.webmanifest': JSON.stringify({ ...MANIFEST, ...patch }) };
    const problems = await check({ files, precache: precached(files) });
    assert.ok(problems.some(problem => expected.test(problem)), `${JSON.stringify(patch)} → ${problems.join(' / ')}`);
  }
});

test('index.html links the manifest and the iPhone icon and names the app', async () => {
  const files = { ...goodFiles(), 'index.html': '<head></head>' };
  const problems = await check({ files, precache: precached(files) });
  assert.deepEqual(problems, ['index.html has no manifest link', 'index.html has no apple-touch-icon link', 'index.html has no apple-mobile-web-app-title',
    'index.html has no boot shell inside #app', 'index.html must load exactly one fonts stylesheet without blocking (media="print" onload), found 0']);
});

test('the boot shell shows the rabbit mark and no placeholder is left (D62)', async () => {
  const unreplaced = { ...goodFiles(), 'index.html': HTML.replace('<svg viewBox="0 0 200 200"></svg>', '%DC_BOOT_MARK%') };
  assert.deepEqual(await check({ files: unreplaced, precache: precached(unreplaced) }), ['index.html still has a build placeholder (%DC_…%)']);
  const noMark = { ...goodFiles(), 'index.html': HTML.replace('<svg viewBox="0 0 200 200"></svg>', '') };
  assert.deepEqual(await check({ files: noMark, precache: precached(noMark) }), ['index.html boot shell has no rabbit mark']);
});

test('the boot shell sits inside #app and its inline style stays small (段8 Ruling 101)', async () => {
  const big = { ...goodFiles(), 'index.html': HTML.replace('.dc-boot{color:#1B2A4A}', `.dc-boot{color:#1B2A4A}${'.x{}'.repeat(BOOT_STYLE_MAX_BYTES)}`) };
  assert.deepEqual(await check({ files: big, precache: precached(big) }), [`index.html boot style is ${'.dc-boot{color:#1B2A4A}'.length + 4 * BOOT_STYLE_MAX_BYTES} bytes > ${BOOT_STYLE_MAX_BYTES}`]);
});

test('stylesheet links are read with their media and onload, in any attribute order', () => {
  assert.deepEqual(stylesheetLinks('<link rel="icon" href="a.svg"><link media="print" onload="this.media=&#39;all&#39;" href="./f.css" rel="stylesheet"><link rel="stylesheet" crossorigin href="./i.css">'),
    [{ href: './f.css', media: 'print', onload: "this.media='all'" }, { href: './i.css', media: undefined, onload: undefined }]);
});

test('the render-blocking CSS stays small and has no @font-face; fonts load from one deferred stylesheet (段8 Task 9b)', async () => {
  const fontsInApp = { ...goodFiles(), 'assets/index-AbC.css': '@font-face{font-family:Inter}.dc-screen{}' };
  assert.deepEqual(await check({ files: fontsInApp, precache: precached(fontsInApp) }),
    ['the render-blocking stylesheet assets/index-AbC.css contains @font-face (move fonts to the deferred fonts stylesheet)']);
  const big = { ...goodFiles(), 'assets/index-AbC.css': 'x'.repeat(RENDER_BLOCKING_CSS_MAX_BYTES + 1) };
  assert.deepEqual(await check({ files: big, precache: precached(big) }), [`render-blocking CSS is ${RENDER_BLOCKING_CSS_MAX_BYTES + 1} bytes > ${RENDER_BLOCKING_CSS_MAX_BYTES}`]);
  const blockingFonts = { ...goodFiles(), 'index.html': HTML.replace(' media="print" onload="this.media=&#39;all&#39;"', '') };
  assert.deepEqual(await check({ files: blockingFonts, precache: precached(blockingFonts) }), [
    'the render-blocking stylesheet assets/fonts-F0.css contains @font-face (move fonts to the deferred fonts stylesheet)',
    'index.html must load exactly one fonts stylesheet without blocking (media="print" onload), found 0']);
  const inlineFonts = { ...goodFiles(), 'index.html': HTML.replace('.dc-boot{color:#1B2A4A}', '@font-face{font-family:X}') };
  assert.deepEqual(await check({ files: inlineFonts, precache: precached(inlineFonts) }), ['index.html inline style must not contain @font-face']);
  const noFile = goodFiles();
  delete noFile['assets/fonts-F0.css'];
  assert.deepEqual(await check({ files: noFile, precache: precached(noFile) }), ['index.html links the fonts stylesheet ./assets/fonts-F0.css but dist has no such file']);
  const notPrecached = goodFiles();
  assert.deepEqual(await check({ files: notPrecached, precache: precached(notPrecached).filter(file => file !== 'assets/fonts-F0.css') }), ['precache is missing assets/fonts-F0.css']);
});

test('every standard voice is precached with its manifest and 12 words (Ruling 89-2: a Japanese pack is required the day it ships)', async () => {
  const files = goodFiles();
  const precache = precached(files).filter(file => file !== 'audio/default-en-female-v1/six.wav');
  assert.deepEqual(await check({ files, precache }), ['precache has 11 word files for default-en-female-v1, expected 12']);
  const ja = await checkPwaDist({ ...(await makeDist()), standardVoices: [...VOICES, { id: 'default-ja-female-v1', locale: 'ja-JP' }], fontSubsets: SUBSETS });
  assert.deepEqual(ja, ['precache is missing audio/default-ja-female-v1/manifest.json', 'precache has 0 word files for default-ja-female-v1, expected 12']);
});

test('fonts: every needed subset × weight, no .woff, no unneeded subset (Ruling 89-3)', async () => {
  const files = goodFiles();
  const missing = await check({ files, precache: precached(files).filter(file => file !== 'assets/inter-latin-700-normal-H700.woff2') });
  assert.deepEqual(missing, ['precache is missing the font assets/inter-latin-700-normal-H700.woff2']);
  const extra = await check({ files, precache: [...precached(files), 'assets/noto-sans-jp-1-400-normal-X.woff2', 'assets/noto-sans-jp-59-400-normal-X.woff'] });
  assert.deepEqual(extra, ['precache includes a font subset the app text does not need (assets/noto-sans-jp-1-400-normal-X.woff2)', 'precache must not include .woff (assets/noto-sans-jp-59-400-normal-X.woff)']);
  const notBuilt = { ...files };
  delete notBuilt['assets/noto-sans-jp-59-800-normal-H800.woff2'];
  assert.ok((await check({ files: notBuilt, precache: precached(notBuilt) })).includes('dist has 7 needed font files, expected 8 (2 subsets × 4 weights)'));
});

test('the shell, icons and listed files must all be there, once', async () => {
  const files = goodFiles();
  const problems = await check({ files, precache: [...precached(files).filter(file => file !== 'assets/index-AbC.js'), 'assets/gone.js', 'index.html'] });
  assert.deepEqual(problems, ['precache lists index.html twice', 'precache lists assets/gone.js but dist has no such file', 'precache is missing assets/index-AbC.js']);
});

test(`the precache stays under ${PRECACHE_MAX_BYTES} bytes`, async () => {
  const files = { ...goodFiles(), 'assets/index-AbC.js': 'x'.repeat(PRECACHE_MAX_BYTES) };
  const problems = await check({ files, precache: precached(files) });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^precache is \d+ bytes > 6291456$/);
});

test('dist must not ship source maps (stage-7 review M6)', async () => {
  const files = { ...goodFiles(), 'assets/index-AbC.js.map': '{}', 'sw.js.map': '{}' };
  assert.deepEqual(await check({ files, precache: precached(files).filter(file => !file.endsWith('.map')) }),
    ['dist must not include source maps (assets/index-AbC.js.map)', 'dist must not include source maps (sw.js.map)']);
});
