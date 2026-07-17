import type {
  PlaybackLoopDelaySpacerChord,
  PlaybackMetadata,
  PlaybackStrummedChord,
  PlaybackTabChord,
} from "~/stores/TabStore";

export interface PlaybackChordLayoutData {
  scrollPositions: number[];
  chordWidths: number[];
  totalWidth: number;
  durations: number[];
  /** Index where the last visible chord comes into view. */
  virtualizationIndex: number;
  /** Index where the full viewport ends (start of catchup zone). */
  virtualizationStartIndex: number;
  /** Index where the beginning of the tab leaves the viewport. */
  virtualizationCatchupIndex: number;
  /** False when the strip is too short for infinite-scroll virtualization. */
  canVirtualize: boolean;
}

type PlaybackChord =
  | PlaybackTabChord
  | PlaybackStrummedChord
  | PlaybackLoopDelaySpacerChord;

function getChordWidth(chord: PlaybackChord | undefined): number {
  const isMeasureLine =
    chord?.type === "tab" && chord?.data.chordData.includes("|");

  const isSpacerChord =
    (chord?.type === "tab" && chord?.data.chordData[0] === "-1") ||
    (chord?.type === "strum" && chord?.data.strumIndex === -1);

  if (isMeasureLine) return 2;
  if (isSpacerChord) return 16;
  if (chord?.type === "tab" || chord?.type === "loopDelaySpacer") return 34;
  return 40;
}

function fillRepetitions(length: number, value: number): number[] {
  return new Array(length).fill(value) as number[];
}

function halfShiftedRepetitions(
  length: number,
  virtualizationStartIndex: number,
  firstHalfValue: number,
  secondHalfValue: number,
): number[] {
  const firstHalfLength = Math.min(
    Math.max(0, virtualizationStartIndex),
    length,
  );
  const secondHalfLength = Math.max(0, length - firstHalfLength);

  return [
    ...fillRepetitions(firstHalfLength, firstHalfValue),
    ...fillRepetitions(secondHalfLength, secondHalfValue),
  ];
}

/**
 * Compute absolute chord positions and the loop-virtualization thresholds used
 * by PlaybackModal. Returns null until the modal has a real measured width and
 * compiled playback data.
 */
export function computePlaybackChordLayoutData({
  expandedTabData,
  playbackMetadata,
  playbackSpeed,
  visiblePlaybackContainerWidth,
}: {
  expandedTabData: PlaybackChord[] | null | undefined;
  playbackMetadata: PlaybackMetadata[] | null | undefined;
  playbackSpeed: number;
  visiblePlaybackContainerWidth: number;
}): PlaybackChordLayoutData | null {
  if (
    !expandedTabData ||
    !playbackMetadata ||
    expandedTabData.length === 0 ||
    visiblePlaybackContainerWidth <= 0
  ) {
    return null;
  }

  const scrollPositions: number[] = [];
  const chordWidths: number[] = [];
  let offsetLeft = 0;

  for (let i = 0; i < expandedTabData.length; i++) {
    const chordWidth = getChordWidth(expandedTabData[i]);
    scrollPositions[i] = offsetLeft;
    chordWidths[i] = chordWidth;
    offsetLeft += chordWidth;
  }

  const totalWidth = offsetLeft;
  const finalChordWidth = chordWidths[chordWidths.length - 1] ?? 0;

  const durations = expandedTabData.map((chord, index) => {
    const metadata = playbackMetadata[index];
    if (!metadata) return 0;

    const isZeroDurationMeasureLine =
      chord?.type === "tab" && chord?.data.chordData.includes("|");
    const isZeroDurationTypeSpacer =
      (chord?.type === "tab" && chord?.data.chordData[0] === "-1") ||
      (chord?.type === "strum" && chord?.data.strumIndex === -1);

    if (isZeroDurationMeasureLine || isZeroDurationTypeSpacer) {
      return 0;
    }

    const { bpm, noteLengthMultiplier } = metadata;
    return 60 / ((bpm / noteLengthMultiplier) * playbackSpeed);
  });

  let virtualizationIndex = 0;
  for (let i = expandedTabData.length - 1; i >= 0; i--) {
    const currentPosition = scrollPositions[i];
    const lastChordPosition = scrollPositions[scrollPositions.length - 1];

    if (currentPosition === undefined || lastChordPosition === undefined) {
      continue;
    }

    if (
      currentPosition + visiblePlaybackContainerWidth * 0.5 <=
      lastChordPosition + finalChordWidth
    ) {
      virtualizationIndex = i;
      break;
    }
  }

  let virtualizationStartIndex = 0;
  for (let i = expandedTabData.length - 1; i >= 0; i--) {
    const currentPosition = scrollPositions[i];
    const lastChordPosition = scrollPositions[scrollPositions.length - 1];

    if (currentPosition === undefined || lastChordPosition === undefined) {
      continue;
    }

    if (
      currentPosition + visiblePlaybackContainerWidth <=
      lastChordPosition + finalChordWidth
    ) {
      virtualizationStartIndex = i;
      break;
    }
  }

  let virtualizationCatchupIndex = 0;
  for (let i = 0; i < expandedTabData.length - 1; i++) {
    const currentPosition = scrollPositions[i];

    if (currentPosition === undefined) {
      continue;
    }

    if (currentPosition - visiblePlaybackContainerWidth * 0.5 >= 0) {
      virtualizationCatchupIndex = i;
      break;
    }
  }

  // Artificial loops should keep the strip >= 2x viewport. If measurement or
  // compilation raced and left us short, virtualizationIndex collapses to 0 and
  // the primary effect would immediately half-shift reps at index 0 — killing
  // highlights and viewport culling. Treat that as "not ready to virtualize".
  const canVirtualize =
    totalWidth >= visiblePlaybackContainerWidth &&
    virtualizationIndex > 0 &&
    virtualizationStartIndex > 0;

  return {
    scrollPositions,
    chordWidths,
    totalWidth,
    durations,
    virtualizationIndex,
    virtualizationStartIndex,
    virtualizationCatchupIndex,
    canVirtualize,
  };
}

/**
 * After a large currentChordIndex jump (background-tab timer throttling),
 * reconstruct the chordRepetitions shape that the incremental primary/catchup
 * effects would have reached by walking through every index.
 */
export function resyncChordRepetitionsAfterIndexJump({
  length,
  previousRepetitions,
  currentChordIndex,
  previousChordIndex,
  virtualizationIndex,
  virtualizationStartIndex,
  virtualizationCatchupIndex,
  canVirtualize,
  wrappedForward,
}: {
  length: number;
  previousRepetitions: number[];
  currentChordIndex: number;
  previousChordIndex: number;
  virtualizationIndex: number;
  virtualizationStartIndex: number;
  virtualizationCatchupIndex: number;
  canVirtualize: boolean;
  wrappedForward: boolean;
}): number[] {
  if (length <= 0) return [];

  const prevFirst = previousRepetitions[0] ?? 0;
  const prevLast =
    previousRepetitions[previousRepetitions.length - 1] ?? prevFirst;
  const wasPrimaryPending = prevFirst !== prevLast;

  if (!canVirtualize) {
    const base = Math.max(prevFirst, prevLast) + (wrappedForward ? 1 : 0);
    return fillRepetitions(length, base);
  }

  // Completed at least one visual loop without stepping through thresholds.
  if (wrappedForward) {
    // Post-loop first-half value: if primary already ran, keep that bump;
    // otherwise advance from the previous caught-up base.
    const postLoopFirstHalf = wasPrimaryPending ? prevFirst : prevFirst + 1;
    const postLoopSecondHalf = postLoopFirstHalf - 1;

    if (currentChordIndex >= virtualizationCatchupIndex) {
      // Past catchup — fully caught up on the new loop.
      return fillRepetitions(length, postLoopFirstHalf);
    }

    // Still before catchup — primary shape for the new loop.
    return halfShiftedRepetitions(
      length,
      virtualizationStartIndex,
      postLoopFirstHalf,
      postLoopSecondHalf,
    );
  }

  // Forward jump within the same loop.
  if (currentChordIndex >= virtualizationIndex) {
    if (wasPrimaryPending) {
      return previousRepetitions.slice(0, length);
    }

    return halfShiftedRepetitions(
      length,
      virtualizationStartIndex,
      prevFirst + 1,
      prevFirst,
    );
  }

  if (
    currentChordIndex >= virtualizationCatchupIndex &&
    wasPrimaryPending
  ) {
    return fillRepetitions(length, prevFirst);
  }

  // No threshold crossed by the jump — keep prior reps (resized if needed).
  if (previousRepetitions.length === length) {
    return previousRepetitions;
  }

  return fillRepetitions(length, prevFirst);

  // previousChordIndex is accepted for API clarity / future multi-wrap math.
  void previousChordIndex;
}
