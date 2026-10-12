// 段8（Ruling 100）: §11 の全件表（docs/app-v1/stage8-error-matrix.md）の鍵は messages.ts にあり、検査の列の状態名は ui:check にある。
// 表を書き換えずに状態名を変えた・鍵を消した時に落ちる（「全件を見ている」が黙って崩れない）。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { APP_MESSAGES } from '../../src/app/i18n/messages.ts';

const root = path.resolve(import.meta.dirname, '../..');
const matrix = fs.readFileSync(path.join(root, 'docs/app-v1/stage8-error-matrix.md'), 'utf8');
const uiCheck = fs.readFileSync(path.join(root, 'tools/check-app-ui.js'), 'utf8');
const rows = matrix.split('\n').filter(line => /^\| \d+ \|/.test(line)).map(line => line.slice(2, -2).split(' | '));

test('the matrix has the 18 rows of spec §11 plus the stage 8 row, with no empty cell', () => {
  assert.equal(rows.length, 19);
  for (const cells of rows) {
    assert.equal(cells.length, 8, cells[1]);
    for (const cell of cells) assert.ok(cell.trim().length > 0, `empty cell in row ${cells[0]}`);
  }
});

test('every key in the matrix exists, and every ui:check state it names is a real state', () => {
  for (const cells of rows) {
    for (const [, key] of cells[2]!.matchAll(/`(\w+)`/g)) assert.ok(key! in APP_MESSAGES.en, `row ${cells[0]}: unknown key ${key}`);
    const checks = [...cells[6]!.matchAll(/ui:check(?:「[^」]+」)+/g)].flatMap(match => [...match[0].matchAll(/「([^」]+)」/g)].map(name => name[1]!));
    assert.ok(checks.length > 0, `row ${cells[0]} names no ui:check state`);
    for (const name of checks) assert.ok(uiCheck.includes(`name: '${name}'`), `row ${cells[0]}: ui:check has no state "${name}"`);
  }
});
