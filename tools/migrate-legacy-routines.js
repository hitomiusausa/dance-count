#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { assessLegacyRoutines } from '../src/engine/legacy-routine-migration.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(ROOT, 'dance-count-B_215.html');
const importedSourcesPath = path.join(ROOT, 'src/engine/data/imported-routine-sources.json');
const outputPath = path.join(ROOT, 'src/engine/data/legacy-routines-report.json');

const source = await fs.readFile(sourcePath, 'utf8');
const routines = extractArrayLiteral(source, 'const SAMPLE_ROUTINES =');
const imported = JSON.parse(await fs.readFile(importedSourcesPath, 'utf8'));
const report = assessLegacyRoutines([...routines, ...imported.routines]);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Routines: ${report.summary.routineCount}`);
console.log(`Figures: ${report.summary.figureCount}`);
console.log(`Mechanically valid, unreviewed: ${report.summary.mechanicallyValidUnreviewed}`);
console.log(`Needs review: ${report.summary.needsReview}`);
for (const [code, count] of Object.entries(report.summary.issueCounts)) console.log(`${code}: ${count}`);
console.log(`Report: ${outputPath}`);

export function extractArrayLiteral(sourceText, declaration) {
  const declarationIndex = sourceText.indexOf(declaration);
  if (declarationIndex < 0) throw new Error(`Declaration not found: ${declaration}`);
  const start = sourceText.indexOf('[', declarationIndex + declaration.length);
  if (start < 0) throw new Error(`Array start not found: ${declaration}`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = start; index < sourceText.length; index += 1) {
    const character = sourceText[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '[') depth += 1;
    if (character === ']') {
      depth -= 1;
      if (depth === 0) {
        const literal = sourceText.slice(start, index + 1);
        return vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 });
      }
    }
  }
  throw new Error(`Array end not found: ${declaration}`);
}
