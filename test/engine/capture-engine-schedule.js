// 使い方: node <このファイル>  → 同じフォルダの fixtures/engine-schedule-golden.json を書き直す。
// 段1 Task 1 で「移設前」に1回だけ実行して固定する。以後は書き直さない（書き直すと比較の意味がなくなる）。
// 書き直しの決まり: 書き直してよいのは docs/app-v1/rulings.md に裁定を記録したときだけ。
// その裁定には「何が変わったか（どのケースのどの時刻か）」と「なぜ変わってよいか」の要約を必ず書く。
// テストを通すために書き直すのは禁止（ゴールデンを直すのではなく、エンジンを直す）。
import fs from 'node:fs/promises';
import path from 'node:path';
import { recordSchedule, SCHEDULE_CASES } from './engine-schedule-harness.js';

const output = {};
for (const testCase of SCHEDULE_CASES) output[testCase.name] = await recordSchedule(testCase);
const target = path.join(import.meta.dirname, 'fixtures', 'engine-schedule-golden.json');
await fs.mkdir(path.dirname(target), { recursive: true });
await fs.writeFile(target, `${JSON.stringify(output)}\n`);
console.log(`wrote ${Object.keys(output).length} cases to ${path.relative(process.cwd(), target)}`);
