import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { assessLegacyRoutines } from '../../src/v2/legacy-routine-migration.js';
import { getDanceProfile, TICKS_PER_BEAT } from '../../src/v2/dance-profiles.js';

const sourcesPath = path.resolve(import.meta.dirname, '../../src/v2/data/imported-routine-sources.json');

async function loadImportedSources() {
  return JSON.parse(await fs.readFile(sourcesPath, 'utf8'));
}

test('imported routine sources declare their provenance fields', async () => {
  const data = await loadImportedSources();
  assert.equal(data.schemaVersion, 1);
  assert.ok(Array.isArray(data.routines) && data.routines.length > 0);
  for (const routine of data.routines) {
    assert.ok(routine.sourceFile, `${routine.id}: sourceFile is required`);
    assert.ok(routine.sourceReference, `${routine.id}: sourceReference is required`);
    assert.ok(data.sources.some(source => source.file === routine.sourceFile),
      `${routine.id}: sourceFile must be described in sources[]`);
  }
});

test('imported routines compile without errors and keep their source in the report', async () => {
  const data = await loadImportedSources();
  const report = assessLegacyRoutines(data.routines);
  for (const routine of report.routines) {
    const errors = routine.issues.filter(item => item.severity === 'error');
    assert.deepEqual(errors, [], `${routine.id}: ${JSON.stringify(errors)}`);
    assert.notEqual(routine.source, 'dance-count-B_215.html');
    assert.equal(routine.provenance.authorityClaimStatus, 'unverified');
  }
});

test('new final waltz matches the printed sheet bar structure', async () => {
  const data = await loadImportedSources();
  const routine = data.routines.find(item => item.id === 'waltz_new_final');
  assert.ok(routine, 'waltz_new_final exists');
  assert.equal(routine.figures.length, 13);

  const report = assessLegacyRoutines([routine]);
  const assessed = report.routines[0];
  assert.equal(assessed.status, 'mechanically-valid-unreviewed');

  const barTicks = getDanceProfile('waltz').beatsPerBar * TICKS_PER_BEAT;
  assert.equal(assessed.durationTicks, 32 * barTicks, 'sheet total is 32 bars');
  assert.ok(!assessed.issues.some(item => item.code === 'ROUTINE_INCOMPLETE_BAR'));
  assert.ok(!assessed.issues.some(item => item.code === 'FIGURE_PHASE_CONTINUES'),
    'every printed row ends on a bar boundary');

  for (const figure of routine.figures) {
    const joined = figure.printedCounts.replace(/[,\s]/g, '');
    assert.equal(figure.counts, joined,
      `${figure.name}: counts must equal the concatenated printed bar groups`);
  }
});
