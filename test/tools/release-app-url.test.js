// 段8 Task 12（final-review I2）: 公開ビルド（RELEASE=1）は PUBLIC_APP_URL が空なら失敗。普段のビルドは空のまま通り、最後の行に URL を出す。
import test from 'node:test';
import assert from 'node:assert/strict';
import { appUrlLine, isRelease, releaseAppUrlProblem } from '../../tools/release/app-url.js';

test('a normal build passes with or without a URL', () => {
  assert.equal(releaseAppUrlProblem({ release: false, url: '' }), null);
  assert.equal(releaseAppUrlProblem({ release: false, url: 'https://example.invalid/' }), null);
});

test('a release build fails without a URL, with a broken one, or with http', () => {
  assert.match(releaseAppUrlProblem({ release: true, url: '' }), /RELEASE=1 needs PUBLIC_APP_URL/);
  assert.match(releaseAppUrlProblem({ release: true, url: 'example.invalid' }), /not a URL/);
  assert.match(releaseAppUrlProblem({ release: true, url: 'http://example.invalid/' }), /https/);
  assert.equal(releaseAppUrlProblem({ release: true, url: 'https://example.invalid/' }), null);
});

test('the check-dist line names the URL or says it is missing; RELEASE accepts 1 / true only', () => {
  assert.equal(appUrlLine('https://example.invalid/'), 'app url: https://example.invalid/');
  assert.match(appUrlLine(''), /^app url: \(none/);
  assert.ok(isRelease('1') && isRelease('true'));
  assert.ok(!isRelease(undefined) && !isRelease('') && !isRelease('0'));
});
