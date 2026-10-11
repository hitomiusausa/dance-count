// 使い方: node <このファイル>  → 同じフォルダの fixtures/engine-schedule-golden.json を書き直す。
// 段1 Task 1 で「移設前」に1回だけ実行して固定する。以後は書き直さない（書き直すと比較の意味がなくなる）。
import fs from 'node:fs/promises';
import path from 'node:path';
import { recordSchedule, SCHEDULE_CASES } from './engine-schedule-harness.js';

const output = {};
for (const testCase of SCHEDULE_CASES) output[testCase.name] = await recordSchedule(testCase);
const target = path.join(import.meta.dirname, 'fixtures', 'engine-schedule-golden.json');
await fs.mkdir(path.dirname(target), { recursive: true });
await fs.writeFile(target, `${JSON.stringify(output)}\n`);
console.log(`wrote ${Object.keys(output).length} cases to ${path.relative(process.cwd(), target)}`);
