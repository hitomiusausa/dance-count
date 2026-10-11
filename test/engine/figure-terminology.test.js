import test from 'node:test';
import assert from 'node:assert/strict';

import report from '../../src/engine/data/legacy-routines-report.json' with { type: 'json' };
import { figureDisplayName, figureTerminologyEvidence, terminologyCoverage } from '../../src/engine/figure-terminology.js';

test('verified terminology is dance-specific and never translates an unknown composite', () => {
  assert.equal(figureDisplayName('tango', 'プログレッシブリンク', 'en'), 'Progressive Link');
  assert.equal(figureDisplayName('tango', 'プログレッシブリンク', 'ja-JP'), 'プログレッシブリンク');
  assert.equal(figureDisplayName('waltz', 'プログレッシブリンク', 'en'), 'プログレッシブリンク');
  assert.equal(figureDisplayName('tango', 'アウトサイドスウィブル トゥ リンク', 'en'), 'アウトサイドスウィブル トゥ リンク');
});

test('every translated term carries primary-source evidence', () => {
  const evidence = figureTerminologyEvidence('rumba', 'アレマーナ');
  assert.equal(evidence.englishName, 'Alemana');
  assert.equal(evidence.terminologyAuthority, 'ISTD');
  assert.equal(evidence.claimStatus, 'verified');
  assert.match(evidence.sourceReference, /^https:\/\/www\.istd\.org\//);
});

test('terminology coverage is measurable and leaves unmatched names unchanged', () => {
  const coverage = terminologyCoverage(report.routines);
  assert.equal(coverage.figures, report.routines.reduce((sum, routine) => sum + routine.figureCount, 0));
  assert.ok(coverage.figures >= 304, 'legacy dataset must remain covered');
  assert.ok(coverage.verified > 100);
  assert.ok(coverage.unverified > 0);
  assert.ok(coverage.verifiedUnique < coverage.unique);
});
