import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BOOT_FIGURE, BRAND_AMBER, BRAND_IVORY, BRAND_NAVY, ICON_PLACEMENT, bootMark, pairArt, rabbitArt, rabbitIconSvg } from '../../src/app/brand/rabbit.ts';

const root = path.resolve(import.meta.dirname, '../..');

test('the rabbit uses only the three brand colours and no raster or external reference (D62)', () => {
  for (const svg of [rabbitIconSvg({ shape: 'square' }), rabbitIconSvg({ shape: 'rounded', placement: 'maskable' }),
    rabbitIconSvg({ shape: 'circle', placement: 'coin', figure: 'gent' }), bootMark('pair').svg, bootMark('solo').svg]) {
    const colours = new Set([...svg.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map(match => match[0].toUpperCase()));
    assert.deepEqual([...colours].sort(), [BRAND_AMBER, BRAND_IVORY, BRAND_NAVY].sort());
    assert.doesNotMatch(svg, /<image|data:|href=|https?:\/\/(?!www\.w3\.org)/);
  }
});

test('the maskable placement keeps the whole figure inside the 80% safe circle (D62)', () => {
  // 絵の座標は「絵を囲む最小の円」の半径 100。512 の安全域は半径 0.4 × 512 = 204.8
  const { x, y, scale } = ICON_PLACEMENT.maskable;
  assert.equal(x, 256);
  assert.equal(y, 256);
  assert.ok(100 * scale <= 0.4 * 512, `figure radius ${100 * scale} > safe radius ${0.4 * 512}`);
});

test('only the animated variants group the moving parts (D62)', () => {
  assert.doesNotMatch(rabbitArt(), /dc-sway|dc-ears/);
  assert.doesNotMatch(pairArt(), /dc-sway|dc-pair/);
  assert.equal([...rabbitArt({ motion: 'hem' }).matchAll(/class="dc-sway"/g)].length, 1);
  assert.equal([...rabbitArt({ motion: 'ears' }).matchAll(/class="dc-ears"/g)].length, 1);
  // 二人: 二人ごと傾く群れ 1 つ＋女性の裾。耳は揺らさない（D62 確認）
  const pair = pairArt({ animate: true });
  assert.equal([...pair.matchAll(/class="dc-pair"/g)].length, 1);
  assert.equal([...pair.matchAll(/class="dc-sway"/g)].length, 1);
  assert.doesNotMatch(pair, /dc-ears/);
});

test('the boot shell shows the pair and only ships the keyframes it uses (D62)', () => {
  assert.equal(BOOT_FIGURE, 'pair');
  const { svg, css } = bootMark();
  assert.match(svg, /^<svg viewBox="0 0 /);
  assert.match(css, /@keyframes dc-pair/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css, /dc-ears/);
});

test('the app icon keeps a margin around the figure (D62: a little smaller than first proposed)', () => {
  // 絵を囲む円（半径 100）の直径が 512 の 85% 以下
  assert.ok(200 * ICON_PLACEMENT.any.scale <= 0.85 * 512);
});

test('public/icons/icon.svg is generated from rabbit.ts (run node tools/make-icons.js after changing the art)', () => {
  const onDisk = fs.readFileSync(path.join(root, 'public/icons/icon.svg'), 'utf8').trim();
  assert.equal(onDisk, rabbitIconSvg({ shape: 'rounded' }));
});
