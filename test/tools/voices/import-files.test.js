// 外で作った声（VOICEPEAK の番号つきの書き出し）を語に割り当てる（tools/voices/import-files.js・2026-11-03）
import test from 'node:test';
import assert from 'node:assert/strict';
import { FILE_INDEX, assignFiles } from '../../../tools/voices/import-files.js';

const names = (suffix) => ['00-スロー', '01-クイッ', '02-1', '03-2', '04-3', '05-4', '06-シ！', '07-5', '08-6', '09-7', '10-8', '11-アン', '12-ア'].map(stem => `${stem}-${suffix}.mp3`);

test('four is the "し" take (06) and the "よん" take (05) is left out (D77)', () => {
  assert.equal(FILE_INDEX.four, '06');
  const { files, unused } = assignFiles(names('dance_male'));
  assert.equal(files.four, '06-シ！-dance_male.mp3');
  assert.equal(files.slow, '00-スロー-dance_male.mp3');
  assert.equal(files.ah, '12-ア-dance_male.mp3');
  assert.equal(Object.keys(files).length, 12);
  assert.equal(unused.length, 1);
  assert.match(unused[0], /^05-4-dance_male\.mp3（4（よん）/);
});

test('a folder with both voices is split by the suffix, and a missing or doubled number stops the import', () => {
  const both = [...names('dance_male'), ...names('dance_female')];
  assert.throws(() => assignFiles(both), /2 つあります/);
  assert.equal(assignFiles(both, { suffix: 'dance_female' }).files.one, '02-1-dance_female.mp3');
  assert.throws(() => assignFiles(names('dance_male').filter(name => !name.startsWith('06-'))), /four（06）/);
  assert.deepEqual(Object.keys(assignFiles([...names('x'), 'notes.txt', 'cover.png']).files).length, 12);
});
