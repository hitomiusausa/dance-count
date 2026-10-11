import fs from 'node:fs/promises';
import path from 'node:path';

import report from '../src/engine/data/legacy-routines-report.json' with { type: 'json' };
import { figureTerminologyEvidence, terminologyCoverage } from '../src/engine/figure-terminology.js';

const root = path.resolve(import.meta.dirname, '..');
const byDance = new Map();

for (const routine of report.routines) {
  const dance = byDance.get(routine.danceId) ?? {
    danceId: routine.danceId,
    routines: 0,
    figures: 0,
    verified: 0,
    unverified: 0,
    verifiedNames: new Map(),
    unverifiedNames: new Map()
  };
  dance.routines += 1;
  for (const figure of routine.figures) {
    dance.figures += 1;
    const evidence = figureTerminologyEvidence(routine.danceId, figure.name);
    const target = evidence ? dance.verifiedNames : dance.unverifiedNames;
    const current = target.get(figure.name) ?? { sourceName: figure.name, occurrences: 0 };
    current.occurrences += 1;
    if (evidence) {
      current.englishName = evidence.englishName;
      current.sourceTitle = evidence.sourceTitle;
      current.sourceReference = evidence.sourceReference;
      dance.verified += 1;
    } else {
      dance.unverified += 1;
    }
    target.set(figure.name, current);
  }
  byDance.set(routine.danceId, dance);
}

const dances = [...byDance.values()].map(dance => ({
  ...dance,
  coveragePercent: Number((dance.verified / dance.figures * 100).toFixed(1)),
  verifiedNames: sortNames(dance.verifiedNames),
  unverifiedNames: sortNames(dance.unverifiedNames)
}));

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  policy: {
    translationRule: 'Exact dance-specific source-name match only',
    unmatchedBehavior: 'Keep the original Japanese source name',
    scope: 'Terminology evidence only; does not verify routine composition, level, or organization authority'
  },
  summary: terminologyCoverage(report.routines),
  dances
};

const outputPath = path.join(root, 'output/figure-terminology-audit.json');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);

console.table(dances.map(dance => ({
  種目: dance.danceId,
  ルーティン: dance.routines,
  フィガー: dance.figures,
  確認済み: dance.verified,
  未確認: dance.unverified,
  確認率: `${dance.coveragePercent}%`
})));
console.log(JSON.stringify({ outputPath, ...result.summary }, null, 2));

function sortNames(names) {
  return [...names.values()].sort((a, b) => b.occurrences - a.occurrences || a.sourceName.localeCompare(b.sourceName, 'ja'));
}
