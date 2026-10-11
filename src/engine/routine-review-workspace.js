export const REVIEW_WORKSPACE_SCHEMA_VERSION = 1;
export const REVIEW_STATES = Object.freeze(['unreviewed', 'researching', 'evidence-collected', 'expert-review-needed']);

export function createReviewWorkspace() {
  return { schemaVersion: REVIEW_WORKSPACE_SCHEMA_VERSION, updatedAt: null, routines: {} };
}

export function normalizeReviewWorkspace(value) {
  const workspace = createReviewWorkspace();
  if (!value || typeof value !== 'object') return workspace;
  for (const [routineId, entry] of Object.entries(value.routines ?? {})) {
    if (!routineId || !entry || typeof entry !== 'object') continue;
    workspace.routines[routineId] = normalizeReviewEntry(entry);
  }
  workspace.updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;
  return workspace;
}

export function normalizeReviewEntry(entry = {}) {
  return {
    status: REVIEW_STATES.includes(entry.status) ? entry.status : 'unreviewed',
    region: cleanText(entry.region, 80),
    authority: cleanText(entry.authority, 120),
    evidenceUrls: normalizeEvidenceUrls(entry.evidenceUrls),
    notes: cleanText(entry.notes, 4000)
  };
}

export function updateReviewEntry(workspace, routineId, entry, now = new Date().toISOString()) {
  const next = normalizeReviewWorkspace(workspace);
  next.routines[routineId] = normalizeReviewEntry(entry);
  next.updatedAt = now;
  return next;
}

export function reviewWorkspaceSummary(workspace) {
  const entries = Object.values(normalizeReviewWorkspace(workspace).routines);
  return {
    recorded: entries.length,
    researching: entries.filter(entry => entry.status === 'researching').length,
    evidenceCollected: entries.filter(entry => entry.status === 'evidence-collected').length,
    expertReviewNeeded: entries.filter(entry => entry.status === 'expert-review-needed').length,
    evidenceUrls: entries.reduce((sum, entry) => sum + entry.evidenceUrls.length, 0)
  };
}

function normalizeEvidenceUrls(value) {
  const candidates = Array.isArray(value) ? value : String(value ?? '').split(/\r?\n/);
  const urls = [];
  for (const candidate of candidates) {
    const text = String(candidate).trim();
    if (!text || urls.includes(text)) continue;
    try {
      const parsed = new URL(text);
      if (!['http:', 'https:'].includes(parsed.protocol)) continue;
      urls.push(parsed.href);
    } catch {}
  }
  return urls.slice(0, 30);
}

function cleanText(value, limit) {
  return String(value ?? '').trim().slice(0, limit);
}
