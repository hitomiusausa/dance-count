import test from 'node:test';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import { CANONICAL_APP_URL, QR_QUIET_ZONE, posterAddressText, posterAppUrl, qrModules, qrSvg } from '../../../src/app/poster/qr.ts';
import { SCHOOL_NAME_MAX, cleanSchoolName } from '../../../src/app/poster/school-name.ts';

// 黒いマスの表を画像（RGBA）にして、本物の QR 読み取り（jsQR）で読む。1 マス 4px・静かな域つき
function decode(modules: boolean[][]): string | null {
  const scale = 4;
  const size = (modules.length + QR_QUIET_ZONE * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  modules.forEach((row, y) => row.forEach((dark, x) => {
    if (!dark) return;
    for (let dy = 0; dy < scale; dy += 1) for (let dx = 0; dx < scale; dx += 1) {
      const index = (((y + QR_QUIET_ZONE) * scale + dy) * size + (x + QR_QUIET_ZONE) * scale + dx) * 4;
      data[index] = 0; data[index + 1] = 0; data[index + 2] = 0;
    }
  }));
  return jsQR(data, size, size)?.data ?? null;
}

test('D74: the poster QR opens the public app URL, outside LINE (same mark as the student message)', () => {
  assert.equal(posterAppUrl('https://count.dancemap.jp'), 'https://count.dancemap.jp/?openExternalBrowser=1');
  assert.equal(decode(qrModules(posterAppUrl('https://count.dancemap.jp'))), 'https://count.dancemap.jp/?openExternalBrowser=1');
  assert.equal(decode(qrModules(posterAppUrl('https://dance-count-preview.hitomiusausa.workers.dev'))), 'https://dance-count-preview.hitomiusausa.workers.dev/?openExternalBrowser=1');
});

test('D74: without a build URL (development) the QR still points at the official address', () => {
  assert.equal(CANONICAL_APP_URL, 'https://count.dancemap.jp');
  assert.equal(posterAppUrl(''), 'https://count.dancemap.jp/?openExternalBrowser=1');
  assert.equal(posterAddressText(''), 'count.dancemap.jp');
  assert.equal(posterAddressText('https://count.dancemap.jp/'), 'count.dancemap.jp');
});

test('D74: the SVG is one path on white, sized by the modules plus the quiet zone, with a readable name', () => {
  const text = posterAppUrl('https://count.dancemap.jp');
  const svg = qrSvg(text, { title: 'QR コード："count"<x>' });
  const size = qrModules(text).length + QR_QUIET_ZONE * 2;
  assert.match(svg, new RegExp(`viewBox="0 0 ${size} ${size}"`));
  assert.match(svg, /role="img" aria-label="QR コード：&quot;count&quot;&lt;x>"/);
  assert.equal((svg.match(/<path/g) ?? []).length, 1);
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(svg.replace(text, '')), 'nothing is loaded from the network');
});

test('D74: the class name is optional, one line, at most 30 characters, without invisible characters', () => {
  assert.equal(cleanSchoolName('  さくら\nダンス教室‮ '), 'さくら ダンス教室');
  assert.equal(cleanSchoolName('  さくら ', { keepEdges: true }), '  さくら ');
  assert.equal([...cleanSchoolName('あ'.repeat(40))].length, SCHOOL_NAME_MAX);
  assert.equal(cleanSchoolName('👨‍👩‍👧'.repeat(31)), '👨‍👩‍👧'.repeat(30));
  assert.equal(cleanSchoolName(''), '');
});
