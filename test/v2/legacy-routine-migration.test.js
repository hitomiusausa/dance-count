import test from 'node:test';
import assert from 'node:assert/strict';
import { assessLegacyRoutine, assessLegacyRoutines } from '../../src/v2/legacy-routine-migration.js';

test('complete legacy routine is mechanically valid but remains unreviewed', () => {
  const result = assessLegacyRoutine({
    id: 'waltz-safe',
    danceId: 'waltz',
    name: 'Test Waltz',
    figures: [{ name: 'Natural Turn', counts: '123' }]
  });
  assert.equal(result.status, 'mechanically-valid-unreviewed');
  assert.equal(result.durationTicks, 2880);
  assert.equal(result.provenance.authorityClaimStatus, 'unverified');
  assert.equal(result.provenance.reviewStatus, 'unreviewed');
});

test('leading subdivision is not guessed during migration', () => {
  const result = assessLegacyRoutine({
    id: 'tango-review',
    danceId: 'tango',
    name: 'Test Tango',
    figures: [{ name: 'Unknown pickup', counts: '&QQ' }]
  });
  assert.equal(result.status, 'needs-review');
  assert.equal(result.issues[0].code, 'AMBIGUOUS_LEADING_SUBDIVISION');
});

test('legacy jive timing always requires dance review', () => {
  const result = assessLegacyRoutine({
    id: 'jive-old',
    danceId: 'jive',
    name: 'Old Jive',
    figures: [{ name: 'Basic', counts: '12&3&4' }]
  });
  assert.equal(result.status, 'needs-review');
  assert.ok(result.issues.some(issue => issue.code === 'LEGACY_JIVE_TIMING'));
});

test('figure boundaries may continue through a bar when the whole routine closes the bar', () => {
  const result = assessLegacyRoutine({
    id: 'tango-continuation',
    danceId: 'tango',
    name: 'Continuous Tango',
    figures: [
      { name: 'Half one', counts: 'S' },
      { name: 'Half two', counts: 'S' }
    ]
  });
  assert.equal(result.status, 'mechanically-valid-unreviewed');
  assert.ok(result.issues.some(issue => issue.code === 'FIGURE_PHASE_CONTINUES'));
  assert.ok(!result.issues.some(issue => issue.code === 'ROUTINE_INCOMPLETE_BAR'));
});

test('routine ending in the middle of a bar requires loop review', () => {
  const result = assessLegacyRoutine({
    id: 'tango-incomplete',
    danceId: 'tango',
    name: 'Incomplete Tango',
    figures: [{ name: 'Half', counts: 'S' }]
  });
  assert.equal(result.status, 'needs-review');
  assert.ok(result.issues.some(issue => issue.code === 'ROUTINE_INCOMPLETE_BAR'));
});

test('routine may declare its own source file and reference for provenance', () => {
  const result = assessLegacyRoutine({
    id: 'waltz-imported',
    danceId: 'waltz',
    name: 'Imported Waltz',
    sourceFile: '新ファイナル級ワルツ.pdf',
    sourceReference: '紙資料スキャン（2026-07-15受領）',
    figures: [{ name: 'Natural Turn', counts: '123' }]
  });
  assert.equal(result.source, '新ファイナル級ワルツ.pdf');
  assert.equal(result.provenance.sourceFile, '新ファイナル級ワルツ.pdf');
  assert.equal(result.provenance.sourceReference, '紙資料スキャン（2026-07-15受領）');
  assert.equal(result.provenance.authorityClaimStatus, 'unverified');
});

test('routine without source file keeps the legacy default', () => {
  const result = assessLegacyRoutine({
    id: 'waltz-default',
    danceId: 'waltz',
    name: 'Default Waltz',
    figures: [{ name: 'Natural Turn', counts: '123' }]
  });
  assert.equal(result.source, 'dance-count-B_215.html');
  assert.equal(result.provenance.sourceFile, 'dance-count-B_215.html');
  assert.equal(result.provenance.sourceReference, null);
});

test('assessment summary counts routines and figures', () => {
  const report = assessLegacyRoutines([
    { id: 'a', danceId: 'waltz', name: 'A', figures: [{ name: 'One', counts: '123' }] },
    { id: 'b', danceId: 'samba', name: 'B', figures: [{ name: 'Bad', counts: '&&&&' }] }
  ]);
  assert.equal(report.summary.routineCount, 2);
  assert.equal(report.summary.figureCount, 2);
  assert.equal(report.summary.mechanicallyValidUnreviewed, 1);
  assert.equal(report.summary.needsReview, 1);
});
