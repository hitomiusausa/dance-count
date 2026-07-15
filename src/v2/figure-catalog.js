export function buildFigureCatalog(routines, currentRoutine) {
  const seen = new Set();
  const catalog = [];
  const figures = [
    ...routines
      .filter(routine => routine.danceId === currentRoutine.danceId)
      .flatMap(routine => routine.figures ?? []),
    ...(currentRoutine.figures ?? [])
  ];

  for (const figure of figures) {
    const name = String(figure.name ?? '').trim();
    const counts = String(figure.counts ?? '').replaceAll(' ', '');
    const key = `${name}\u0000${counts}`;
    if (!name || !counts || seen.has(key)) continue;
    seen.add(key);
    catalog.push({ name, counts });
  }
  return catalog;
}
