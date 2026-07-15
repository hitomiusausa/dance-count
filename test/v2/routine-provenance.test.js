import test from 'node:test';
import assert from 'node:assert/strict';

import { beginnerPresetEligible, legacyRoutineProvenance, validateRoutineProvenance } from '../../src/v2/routine-provenance.js';

test('legacy labels never become verified authority claims automatically', () => {
  const metadata = legacyRoutineProvenance('dance-count-B_215.html');
  assert.equal(metadata.authority, null);
  assert.equal(metadata.authorityClaimStatus, 'unverified');
  assert.equal(metadata.reviewStatus, 'unreviewed');
  assert.equal(beginnerPresetEligible(metadata), false);
});

test('verified authority claims require evidence and reviewed presets require reviewer evidence', () => {
  assert.throws(() => validateRoutineProvenance({
    ...legacyRoutineProvenance('source.html'),
    authority: 'ISTD',
    authorityClaimStatus: 'verified'
  }), /source reference/);

  const reviewed = {
    ...legacyRoutineProvenance('source.html'),
    sourceKind: 'reviewed-preset',
    authority: 'ISTD',
    authorityClaimStatus: 'verified',
    sourceReference: 'review-record-001',
    reviewStatus: 'reviewed',
    reviewedAt: '2026-07-13T00:00:00.000Z',
    reviewerEvidence: 'review-record-001'
  };
  assert.equal(validateRoutineProvenance(reviewed), true);
  assert.equal(beginnerPresetEligible(reviewed), true);
});
