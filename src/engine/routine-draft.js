export function validRoutineDraft(draft, source) {
  if (!draft || draft.id !== source.id || draft.danceId !== source.danceId) return false;
  if (!Array.isArray(draft.figures) || draft.figures.length < 1) return false;
  return draft.figures.every(figure =>
    typeof figure?.id === 'string' && figure.id.length > 0 &&
    typeof figure?.name === 'string' && figure.name.trim().length > 0 &&
    typeof figure?.counts === 'string' && figure.counts.trim().length > 0
  );
}

export function readRoutineDraft(storage, key, source) {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return source;
    const draft = JSON.parse(raw);
    return validRoutineDraft(draft, source) ? draft : source;
  } catch {
    return source;
  }
}
