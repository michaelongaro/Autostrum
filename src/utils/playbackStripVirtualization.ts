export function readStripScrollPosition(element: HTMLElement): number | null {
  const transform = getComputedStyle(element).transform;
  if (!transform || transform === "none") return null;

  return -new DOMMatrixReadOnly(transform).m41;
}

export function getEffectiveRepetitionFromScrollPosition({
  scrollPosition,
  chordIndex,
  scrollPositions,
  totalWidth,
}: {
  scrollPosition: number;
  chordIndex: number;
  scrollPositions: number[];
  totalWidth: number;
}): number {
  if (totalWidth <= 0) return 0;

  const basePosition = scrollPositions[chordIndex] ?? 0;
  return Math.max(0, Math.round((scrollPosition - basePosition) / totalWidth));
}
