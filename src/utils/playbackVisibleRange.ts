export const PLAYBACK_VIRTUALIZATION_BUFFER = 100;

export interface PlaybackVisibleRangeLayout {
  scrollPositions: number[];
  totalWidth: number;
  virtualizationStartIndex: number;
  virtualizationCatchupIndex: number;
}

export interface PlaybackVisibleRangeInput {
  layout: PlaybackVisibleRangeLayout;
  chordCount: number;
  currentChordIndex: number;
  chordRepetitions: number[];
  visiblePlaybackContainerWidth: number;
  virtualizationBuffer?: number;
}

export interface PlaybackVisibleRange {
  startIndex: number;
  endIndex: number;
}

function getChordPosition(
  index: number,
  scrollPositions: number[],
  totalWidth: number,
  chordRepetitions: number[],
): number {
  return (scrollPositions[index] ?? 0) + (chordRepetitions[index] ?? 0) * totalWidth;
}

export function getPlaybackVisibleRange({
  layout,
  chordCount,
  currentChordIndex,
  chordRepetitions,
  visiblePlaybackContainerWidth,
  virtualizationBuffer = PLAYBACK_VIRTUALIZATION_BUFFER,
}: PlaybackVisibleRangeInput): PlaybackVisibleRange {
  if (
    chordCount === 0 ||
    visiblePlaybackContainerWidth === 0 ||
    chordRepetitions.length === 0
  ) {
    return { startIndex: 0, endIndex: 0 };
  }

  const { scrollPositions, totalWidth, virtualizationStartIndex, virtualizationCatchupIndex } =
    layout;

  const currentScrollPosition = getChordPosition(
    currentChordIndex,
    scrollPositions,
    totalWidth,
    chordRepetitions,
  );

  const halfViewport = visiblePlaybackContainerWidth / 2;
  const minVisiblePosition =
    currentScrollPosition - halfViewport - virtualizationBuffer;
  const maxVisiblePosition =
    currentScrollPosition + halfViewport + virtualizationBuffer;

  let startIndex = 0;
  let endIndex = chordCount - 1;

  for (let i = 0; i < chordCount; i++) {
    const chordPosition = getChordPosition(
      i,
      scrollPositions,
      totalWidth,
      chordRepetitions,
    );
    if (chordPosition >= minVisiblePosition) {
      startIndex = Math.max(0, i - 1);
      break;
    }
  }

  for (let i = chordCount - 1; i >= 0; i--) {
    const chordPosition = getChordPosition(
      i,
      scrollPositions,
      totalWidth,
      chordRepetitions,
    );
    if (chordPosition <= maxVisiblePosition) {
      endIndex = Math.min(chordCount - 1, i + 1);
      break;
    }
  }

  const repsAreSplit =
    (chordRepetitions[0] ?? 0) !== (chordRepetitions[chordCount - 1] ?? 0);

  if (repsAreSplit && currentChordIndex < virtualizationCatchupIndex) {
    const currentRep = chordRepetitions[currentChordIndex] ?? 0;
    for (let i = virtualizationStartIndex; i < chordCount; i++) {
      if ((chordRepetitions[i] ?? 0) < currentRep) {
        startIndex = Math.min(startIndex, Math.max(0, i - 1));
      }
    }
  }

  return { startIndex, endIndex };
}
