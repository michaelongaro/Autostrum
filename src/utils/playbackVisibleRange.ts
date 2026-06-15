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

type PositionLookup = (index: number) => number;

function lowerBound(
  getPosition: PositionLookup,
  target: number,
  start: number,
  end: number,
) {
  let lo = start;
  let hi = end;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (getPosition(mid) < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
}

function upperBound(
  getPosition: PositionLookup,
  target: number,
  start: number,
  end: number,
) {
  let lo = start;
  let hi = end;

  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (getPosition(mid) > target) {
      hi = mid - 1;
    } else {
      lo = mid;
    }
  }

  return lo;
}

/** Build absolute chord positions once; reuse across visible-range queries. */
export function buildPlaybackChordPositions({
  scrollPositions,
  chordRepetitions,
  totalWidth,
}: Pick<
  ComputePlaybackVisibleRangeArgs,
  "scrollPositions" | "chordRepetitions" | "totalWidth"
>): number[] {
  return scrollPositions.map((position, index) =>
    getChordPosition(index, scrollPositions, chordRepetitions, totalWidth),
  );
}

export function computePlaybackVisibleRange({
  scrollPositions,
  chordRepetitions,
  totalWidth,
  currentChordIndex,
  visiblePlaybackContainerWidth,
  virtualizationBuffer,
  chordPositions,
}: ComputePlaybackVisibleRangeArgs & {
  chordPositions?: number[];
}): PlaybackVisibleRange {
  const chordCount = scrollPositions.length;
  if (chordCount === 0) {
    return { startIndex: 0, endIndex: 0 };
  }

  const getPosition: PositionLookup =
    chordPositions !== undefined
      ? (index) => chordPositions[index] ?? 0
      : (index) =>
          getChordPosition(index, scrollPositions, chordRepetitions, totalWidth);

  const currentScrollPosition = getPosition(currentChordIndex);
  const halfViewport = visiblePlaybackContainerWidth / 2;
  const minVisiblePosition =
    currentScrollPosition - halfViewport - virtualizationBuffer;
  const maxVisiblePosition =
    currentScrollPosition + halfViewport + virtualizationBuffer;

  const rawStart = lowerBound(getPosition, minVisiblePosition, 0, chordCount - 1);
  const rawEnd = upperBound(getPosition, maxVisiblePosition, 0, chordCount - 1);

  return {
    startIndex: Math.max(0, rawStart - 1),
    endIndex: Math.min(chordCount - 1, rawEnd + 1),
  };
}
