import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { recordSchedule, SCHEDULE_CASES } from './engine-schedule-harness.js';

const golden = JSON.parse(await fs.readFile(path.join(import.meta.dirname, 'fixtures', 'engine-schedule-golden.json'), 'utf8'));

test('golden fixture covers every schedule case', () => {
  assert.deepEqual(Object.keys(golden).sort(), SCHEDULE_CASES.map(item => item.name).sort());
});

for (const testCase of SCHEDULE_CASES) {
  test(`engine schedule is bit-identical to the pre-move golden: ${testCase.name}`, async () => {
    // JSON を往復させて比べる（-0 と 0 を区別しないため。ゴールデンも JSON）
    const actual = JSON.parse(JSON.stringify(await recordSchedule(testCase)));
    assert.deepStrictEqual(actual, golden[testCase.name]);
  });
}
