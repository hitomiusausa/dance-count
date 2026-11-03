import test from 'node:test';
import assert from 'node:assert/strict';
import { dropWoffFallback, withoutWoffFallback } from '../../tools/fonts/drop-woff-fallback.ts';

// iOS アプリの書体は .woff2 だけ（tools/fonts/drop-woff-fallback.ts）
test('the iOS build keeps only the woff2 source of each font face', () => {
  const fontsource = "url(./files/noto-sans-jp-0-700-normal.woff2) format('woff2'), url(./files/noto-sans-jp-0-700-normal.woff) format('woff')";
  assert.equal(withoutWoffFallback(fontsource), "url(./files/noto-sans-jp-0-700-normal.woff2) format('woff2')");
  // .woff2 が無い時・.woff だけの時は触らない（書体を消さない）
  assert.equal(withoutWoffFallback("url(a.woff) format('woff')"), "url(a.woff) format('woff')");
  assert.equal(withoutWoffFallback("url(a.ttf) format('truetype')"), "url(a.ttf) format('truetype')");
  const decl = { value: fontsource, parent: { type: 'atrule', name: 'font-face' } };
  dropWoffFallback.Declaration.src(decl);
  assert.doesNotMatch(decl.value, /\.woff\)/);
  // @font-face の外の src は触らない
  const other = { value: fontsource, parent: { type: 'rule' } };
  dropWoffFallback.Declaration.src(other);
  assert.equal(other.value, fontsource);
});
