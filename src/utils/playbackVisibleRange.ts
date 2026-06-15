export interface PlaybackVisibleRange {
  startIndex: number;
  endIndex: number;
}

interface ComputePlaybackVisibleRangeArgs {
  scrollPositions: number[];
  chordRepetitions: number[];
  totalWidth: number;
  currentChordIndex: number;
  visiblePlaybackContainerWidth: number;
  virtualizationBuffer: number;
}

function getChordPosition(
  index: number,
  scrollPositions: number[],
  chordRepetitions: number[],
  totalWidth: number,
) {
  return (
    (scrollPositions[index] ?? 0) + (chordRepetitions[index] ?? 0) * totalWidth
  );
}

/** Binary search for the first index whose position is >= target. */
function lowerBound(
  positions: number[],
  target: number,
  start: number,
  end: number,
) {
  let lo = start;
  let hi = end;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((positions[mid] ?? 0) < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
}

/** Binary search for the last index whose position is <= target. */
function upperBound(
  positions: number[],
  target: number,
  start: number,
  end: number,
) {
  let lo = start;
  let hi = end;

  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if ((positions[mid] ?? 0) > target) {
      hi = mid - 1;
    } else {
      lo = mid;
    }
  }

  return lo;
}

export function computePlaybackVisibleRange({
  scrollPositions,
  chordRepetitions,
  totalWidth,
  currentChordIndex,
  visiblePlaybackContainerWidth,
  virtualizationBuffer,
}: ComputePlaybackVisibleRangeArgs): PlaybackVisibleRange {
  const chordCount = scrollPositions.length;
  if (chordCount === 0) {
    return { startIndex: 0, endIndex: 0 };
  }

  const positions = scrollPositions.map((position, index) =>
    getChordPosition(index, scrollPositions, chordRepetitions, totalWidth),
  );

  const currentScrollPosition = positions[currentChordIndex] ?? 0;
  const halfViewport = visiblePlaybackContainerWidth / 2;
  const minVisiblePosition =
    currentScrollPosition - halfViewport - virtualizationBuffer;
  const maxVisiblePosition =
    currentScrollPosition + halfViewport + virtualizationBuffer;

  const rawStart = lowerBound(positions, minVisiblePosition, 0, chordCount - 1);
  const rawEnd = upperBound(positions, maxVisiblePosition, 0, chordCount - 1);

  return {
    startIndex: Math.max(0, rawStart - 1),
    endIndex: Math.min(chordCount - 1, rawEnd + 1),
  };
}
