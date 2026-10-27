/** Geometry for a continuous, repeating playback strip. Positions stay absolute
 * across forward and backward gestures; only visible copies are mounted. */
export interface PlaybackViewportLayout {
  scrollPositions: number[];
  chordWidths: number[];
  durations: number[];
  totalWidth: number;
}

function lowerBound(values: number[], target: number) {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (values[middle]! < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function upperBound(values: number[], target: number) {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (values[middle]! <= target) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function playbackRepetitionAtPosition(
  position: number,
  totalWidth: number,
) {
  return totalWidth > 0 ? Math.max(0, Math.floor(position / totalWidth)) : 0;
}

export function closestPlaybackChordPosition(
  index: number,
  scrollPositions: number[],
  totalWidth: number,
  nearPosition: number,
) {
  const start = scrollPositions[index] ?? 0;
  const repetition =
    totalWidth > 0
      ? Math.max(0, Math.round((nearPosition - start) / totalWidth))
      : 0;
  return start + repetition * totalWidth;
}

export function playbackChordIndexAtPosition(
  position: number,
  scrollPositions: number[],
  totalWidth: number,
) {
  if (scrollPositions.length === 0 || totalWidth <= 0) return 0;
  const absolute = Math.max(0, position);
  const local =
    absolute - playbackRepetitionAtPosition(absolute, totalWidth) * totalWidth;
  return Math.max(0, upperBound(scrollPositions, local) - 1);
}

export function nearestPlaybackChordIndex(
  position: number,
  scrollPositions: number[],
  totalWidth: number,
) {
  if (scrollPositions.length === 0 || totalWidth <= 0) return 0;
  const absolute = Math.max(0, position);
  const local =
    absolute - playbackRepetitionAtPosition(absolute, totalWidth) * totalWidth;
  const next = lowerBound(scrollPositions, local);
  const candidates = [
    Math.max(0, next - 1),
    Math.min(next, scrollPositions.length - 1),
    0,
    scrollPositions.length - 1,
  ];
  let best = candidates[0]!;
  let distance = Infinity;
  for (const index of candidates) {
    const candidateDistance = Math.abs(
      closestPlaybackChordPosition(
        index,
        scrollPositions,
        totalWidth,
        absolute,
      ) - absolute,
    );
    if (
      candidateDistance < distance ||
      (candidateDistance === distance && index < best)
    ) {
      distance = candidateDistance;
      best = index;
    }
  }
  return best;
}

export function playbackOverscanPx(layout: PlaybackViewportLayout) {
  let speed = 0;
  for (let index = 0; index < layout.durations.length; index++) {
    const duration = layout.durations[index] ?? 0;
    if (duration <= 0) continue;
    // Include zero-duration measure/spacer widths crossed after this note.
    let end = index + 1;
    while (end < layout.durations.length && layout.durations[end] === 0) end++;
    const endPosition = layout.scrollPositions[end] ?? layout.totalWidth;
    speed = Math.max(
      speed,
      (endPosition - (layout.scrollPositions[index] ?? 0)) / (duration * 1000),
    );
  }
  return Math.max(200, speed * 150);
}

export function visiblePlaybackCopies(
  layout: PlaybackViewportLayout,
  position: number,
  viewportWidth: number,
  overscan: number,
) {
  const copies: { index: number; repetition: number; left: number }[] = [];
  const { scrollPositions, chordWidths, totalWidth } = layout;
  if (totalWidth <= 0 || scrollPositions.length === 0 || viewportWidth <= 0)
    return copies;
  const minimum = Math.max(0, position - viewportWidth / 2 - overscan);
  const maximum = Math.max(0, position + viewportWidth / 2 + overscan);
  const firstLoop = playbackRepetitionAtPosition(minimum, totalWidth);
  const lastLoop = playbackRepetitionAtPosition(maximum, totalWidth);
  for (let repetition = firstLoop; repetition <= lastLoop; repetition++) {
    const offset = repetition * totalWidth;
    const start = Math.max(
      0,
      upperBound(scrollPositions, minimum - offset) - 1,
    );
    const end = upperBound(scrollPositions, maximum - offset);
    for (let index = start; index < end; index++) {
      const left = scrollPositions[index]! + offset;
      if (left + (chordWidths[index] ?? 0) >= minimum)
        copies.push({ index, repetition, left });
    }
  }
  return copies;
}
