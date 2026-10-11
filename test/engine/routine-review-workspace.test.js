import test from 'node:test';
import assert from 'node:assert/strict';

import { createReviewWorkspace, normalizeReviewEntry, reviewWorkspaceSummary, updateReviewEntry } from '../../src/engine/routine-review-workspace.js';

test('review workspace keeps research evidence separate from source routines', () => {
  const source = createReviewWorkspace();
  const updated = updateReviewEntry(source, 'jive_silver', {
    status: 'evidence-collected',
    region: 'United Kingdom',
    authority: 'ISTD',
    evidenceUrls: ['https://www.istd.org/example', 'javascript:alert(1)', 'https://www.istd.org/example'],
    notes: 'Confirm QaQ timing with an instructor.'
  }, '2026-07-13T00:00:00.000Z');

  assert.deepEqual(source.routines, {});
  assert.equal(updated.routines.jive_silver.status, 'evidence-collected');
  assert.deepEqual(updated.routines.jive_silver.evidenceUrls, ['https://www.istd.org/example']);
  assert.equal(updated.updatedAt, '2026-07-13T00:00:00.000Z');
});

test('invalid status falls back safely and summary counts evidence', () => {
  assert.equal(normalizeReviewEntry({ status: 'reviewed' }).status, 'unreviewed');
  const summary = reviewWorkspaceSummary({ routines: {
    a: { status: 'researching', evidenceUrls: ['https://example.com/a'] },
    b: { status: 'expert-review-needed', evidenceUrls: ['https://example.com/b', 'https://example.com/c'] }
  } });
  assert.deepEqual(summary, { recorded: 2, researching: 1, evidenceCollected: 0, expertReviewNeeded: 1, evidenceUrls: 3 });
});
