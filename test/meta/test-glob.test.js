// npm test のグロブから漏れたテストが黙って実行されないことを防ぐ。
// test/ の下の *.test.* はすべて package.json の test スクリプトのグロブに一致していなければならない。
// （.tsx は Node の型除去で実行できないため対象外。.tsx のテストを置くとここで落ちる。）
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const script = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts.test;

test('npm test script runs every *.test.* file under test/', () => {
  const match = script.match(/^node --test "([^"]+)"$/);
  assert.ok(match, `unexpected test script shape: ${script}`);
  const pattern = match[1];
  const globbed = new Set(fs.globSync(pattern, { cwd: root }).map(file => file.split(path.sep).join('/')));
  const all = fs.globSync('test/**/*.test.*', { cwd: root }).map(file => file.split(path.sep).join('/')).sort();
  assert.ok(all.length > 0);
  assert.deepEqual(all.filter(file => !globbed.has(file)), [], `test files not matched by "${pattern}"`);
});
