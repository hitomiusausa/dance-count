export function dropDestination(fromIndex, targetIndex, placeAfter, figureCount) {
  if (![fromIndex, targetIndex, figureCount].every(Number.isInteger) || figureCount < 1) return fromIndex;
  let insertionIndex = targetIndex + (placeAfter ? 1 : 0);
  if (fromIndex < insertionIndex) insertionIndex -= 1;
  return Math.max(0, Math.min(figureCount - 1, insertionIndex));
}
