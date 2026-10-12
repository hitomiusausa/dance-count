// 段7（Ruling 93-3・95-1）: 受け口の契約の値は src/share-inbox-contract.ts 1 か所。画面（files.ts）と SW（sw.ts）がそこから import し、
// manifest の share_target も同じ欄の名前を使う。どちらかが文字列を書き写したら落ちる。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { INBOX_CACHE, INBOX_FILE_HEADER, INBOX_KEY, SHARE_TARGET_FIELD } from '../../../src/share-inbox-contract.ts';
import * as files from '../../../src/app/platform/files.ts';
import * as contract from '../../../src/share-inbox-contract.ts';
import { BUNDLE_MAX_BYTES } from '../../../src/app/share/limits.ts';

const root = path.resolve(import.meta.dirname, '../../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

test('the inbox contract keeps the stage-5 values (Ruling 79-2)', () => {
  assert.equal(INBOX_CACHE, 'dance-count-inbox');
  assert.equal(INBOX_KEY, './inbox/bundle');
  assert.equal(INBOX_FILE_HEADER, 'X-File-Name');
  assert.equal(SHARE_TARGET_FIELD, 'bundle');
  assert.equal(files.INBOX_CACHE, INBOX_CACHE);
  assert.equal(files.INBOX_KEY, INBOX_KEY);
});

test('files.ts, sw.ts and vite.config.ts import the contract instead of copying its strings', () => {
  for (const file of ['src/app/platform/files.ts', 'src/sw.ts', 'vite.config.ts']) {
    const source = read(file);
    assert.match(source, /from '(\.\.\/\.\.\/|\.\/|\.\/src\/)share-inbox-contract\.ts'/, `${file} imports the contract`);
    for (const literal of ["'dance-count-inbox'", "'./inbox/bundle'", "'X-File-Name'"]) assert.ok(!source.includes(literal), `${file} copies ${literal}`);
  }
  assert.ok(!read('vite.config.ts').includes("name: 'bundle'"), 'the share_target field name comes from the contract');
});

test('the service worker sits at the root next to index.html so the relative key resolves to the same URL (Ruling 93-4)', () => {
  const config = read('vite.config.ts');
  assert.match(config, /srcDir: 'src'/);
  assert.match(config, /filename: 'sw\.ts'/);
  assert.match(config, /base: '\.\/'/);
});

test('the service worker side does not read src/app; the byte limit lives in the contract and limits.ts re-exports it (review m-5)', () => {
  assert.equal(contract.BUNDLE_MAX_BYTES, 20 * 1024 * 1024);
  assert.equal(BUNDLE_MAX_BYTES, contract.BUNDLE_MAX_BYTES);
  for (const file of ['src/sw.ts', 'src/sw-navigation.ts', 'src/share-inbox-contract.ts']) {
    assert.ok(!/from '\.\/app\//.test(read(file)), `${file} imports from src/app`);
  }
});
