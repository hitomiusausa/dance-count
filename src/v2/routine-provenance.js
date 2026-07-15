export const DANCE_AUTHORITIES = Object.freeze(['ISTD', 'WDSF', 'NDCA', 'JDSF', 'studio']);
export const ROUTINE_REVIEW_STATUSES = Object.freeze(['unreviewed', 'in-review', 'reviewed']);
export const AUTHORITY_CLAIM_STATUSES = Object.freeze(['unverified', 'verified', 'not-applicable']);

export function legacyRoutineProvenance(sourceFile) {
  return {
    sourceKind: 'legacy-import',
    sourceFile,
    contentLocale: 'ja-JP',
    region: null,
    authority: null,
    authorityVersion: null,
    sourceReference: null,
    authorityClaimStatus: 'unverified',
    reviewStatus: 'unreviewed',
    reviewedAt: null,
    reviewerEvidence: null
  };
}

export function validateRoutineProvenance(metadata) {
  if (!metadata || typeof metadata !== 'object') throw new Error('Routine provenance is required');
  if (!['legacy-import', 'reviewed-preset', 'user-created'].includes(metadata.sourceKind)) throw new Error(`Unknown source kind: ${metadata.sourceKind}`);
  if (metadata.authority != null && !DANCE_AUTHORITIES.includes(metadata.authority)) throw new Error(`Unknown dance authority: ${metadata.authority}`);
  if (!AUTHORITY_CLAIM_STATUSES.includes(metadata.authorityClaimStatus)) throw new Error(`Unknown authority claim status: ${metadata.authorityClaimStatus}`);
  if (!ROUTINE_REVIEW_STATUSES.includes(metadata.reviewStatus)) throw new Error(`Unknown routine review status: ${metadata.reviewStatus}`);
  if (metadata.authorityClaimStatus === 'verified' && (!metadata.authority || !metadata.sourceReference)) throw new Error('Verified authority claims require an authority and source reference');
  if (metadata.reviewStatus === 'reviewed' && (!metadata.reviewedAt || !metadata.reviewerEvidence)) throw new Error('Reviewed routines require review date and reviewer evidence');
  return true;
}

export function beginnerPresetEligible(metadata) {
  validateRoutineProvenance(metadata);
  return metadata.reviewStatus === 'reviewed'
    && metadata.authorityClaimStatus !== 'unverified'
    && Boolean(metadata.reviewerEvidence);
}
