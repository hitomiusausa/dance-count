export function normalizeFigureRange(figureCount, startIndex = 0, endIndex = figureCount - 1) {
  if (!Number.isInteger(figureCount) || figureCount < 1) throw new RangeError('Figure count must be positive');
  const start = clampInteger(startIndex, 0, figureCount - 1);
  const end = Math.max(start, clampInteger(endIndex, 0, figureCount - 1));
  return { startIndex: start, endIndex: end };
}

export function figureRangeTicks(compiled, range) {
  const normalized = normalizeFigureRange(compiled.figures.length, range?.startIndex, range?.endIndex);
  return {
    ...normalized,
    startTick: compiled.figures[normalized.startIndex].startTick,
    endTick: compiled.figures[normalized.endIndex].endTick
  };
}

function clampInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number)) return min;
  return Math.max(min, Math.min(max, number));
}
