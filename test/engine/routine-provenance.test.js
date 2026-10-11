import test from 'node:test';
import assert from 'node:assert/strict';

import { beginnerPresetEligible, legacyRoutineProvenance, validateRoutineProvenance } from '../../src/engine/routine-provenance.js';

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

test('a received routine (stage 5, Ruling 84-2) is a known source kind and never a beginner preset', () => {
  const received = { sourceKind: 'received', authority: null, authorityClaimStatus: 'not-applicable', reviewStatus: 'unreviewed' };
  assert.equal(validateRoutineProvenance(received), true);
  assert.equal(beginnerPresetEligible(received), false);
  assert.throws(() => validateRoutineProvenance({ ...received, sourceKind: 'shared' }), /Unknown source kind/);
});
