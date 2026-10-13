import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BRAND_AMBER, BRAND_IVORY, BRAND_NAVY, ICON_PLACEMENT, rabbitArt, rabbitIconSvg } from '../../src/app/brand/rabbit.ts';

const root = path.resolve(import.meta.dirname, '../..');

test('the rabbit uses only the three brand colours and no raster or external reference (D62)', () => {
  for (const svg of [rabbitIconSvg({ shape: 'square' }), rabbitIconSvg({ shape: 'rounded', placement: 'maskable', sway: true })]) {
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

test('only the swaying variant groups the hem for the waltz animation (D62)', () => {
  assert.doesNotMatch(rabbitArt(), /dc-sway/);
  assert.equal([...rabbitArt({ sway: true }).matchAll(/class="dc-sway"/g)].length, 1);
});

test('public/icons/icon.svg is generated from rabbit.ts (run node tools/make-icons.js after changing the art)', () => {
  const onDisk = fs.readFileSync(path.join(root, 'public/icons/icon.svg'), 'utf8').trim();
  assert.equal(onDisk, rabbitIconSvg({ shape: 'rounded' }));
});
