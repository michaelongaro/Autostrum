import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getPlaybackVisibleRange,
  type PlaybackVisibleRangeLayout,
} from "./playbackVisibleRange";

const CHORD_WIDTH = 34;
const CHORD_COUNT = 100;
const VIEWPORT_WIDTH = 800;

function buildUniformScrollPositions(count: number, chordWidth = CHORD_WIDTH) {
  return Array.from({ length: count }, (_, index) => index * chordWidth);
}

function buildLayout(
  scrollPositions: number[],
  viewportWidth = VIEWPORT_WIDTH,
): PlaybackVisibleRangeLayout {
  const totalWidth = scrollPositions[scrollPositions.length - 1]! + CHORD_WIDTH;
  const finalChordWidth = CHORD_WIDTH;
  const chordCount = scrollPositions.length;

  let virtualizationStartIndex = 0;
  for (let i = chordCount - 1; i >= 0; i--) {
    const currentPosition = scrollPositions[i]!;
    const lastChordPosition = scrollPositions[chordCount - 1]!;
    if (
      currentPosition + viewportWidth <=
      lastChordPosition + finalChordWidth
    ) {
      virtualizationStartIndex = i;
      break;
    }
  }

  let virtualizationCatchupIndex = 0;
  for (let i = 0; i < chordCount - 1; i++) {
    const currentPosition = scrollPositions[i]!;
    if (currentPosition - viewportWidth * 0.5 >= 0) {
      virtualizationCatchupIndex = i;
      break;
    }
  }

  return {
    scrollPositions,
    totalWidth,
    virtualizationStartIndex,
    virtualizationCatchupIndex,
  };
}

function buildSplitRepetitions(
  length: number,
  virtualizationStartIndex: number,
): number[] {
  const repetitions = Array.from({ length }, () => 1);
  for (let i = 0; i < virtualizationStartIndex; i++) {
    repetitions[i] = 2;
  }
  return repetitions;
}

function rangeIncludesTailIndices(
  range: { startIndex: number; endIndex: number },
  virtualizationStartIndex: number,
) {
  return range.startIndex <= virtualizationStartIndex;
}

void test("unified repetitions include chords around the playhead", () => {
  const scrollPositions = buildUniformScrollPositions(CHORD_COUNT);
  const layout = buildLayout(scrollPositions);
  const chordRepetitions = Array.from({ length: CHORD_COUNT }, () => 1);

  const range = getPlaybackVisibleRange({
    layout,
    chordCount: CHORD_COUNT,
    currentChordIndex: 50,
    chordRepetitions,
    visiblePlaybackContainerWidth: VIEWPORT_WIDTH,
  });

  assert.ok(range.startIndex < 50);
  assert.ok(range.endIndex > 50);
});

void test("split repetitions at index 0 include lower-rep tail chords", () => {
  const scrollPositions = buildUniformScrollPositions(CHORD_COUNT);
  const layout = buildLayout(scrollPositions);
  const chordRepetitions = buildSplitRepetitions(
    CHORD_COUNT,
    layout.virtualizationStartIndex,
  );

  const range = getPlaybackVisibleRange({
    layout,
    chordCount: CHORD_COUNT,
    currentChordIndex: 0,
    chordRepetitions,
    visiblePlaybackContainerWidth: VIEWPORT_WIDTH,
  });

  assert.ok(
    rangeIncludesTailIndices(range, layout.virtualizationStartIndex),
    `expected tail indices to be included, got startIndex=${range.startIndex}`,
  );
});

void test("split repetitions at catchup index behave like unified range scan", () => {
  const scrollPositions = buildUniformScrollPositions(CHORD_COUNT);
  const layout = buildLayout(scrollPositions);
  const chordRepetitions = buildSplitRepetitions(
    CHORD_COUNT,
    layout.virtualizationStartIndex,
  );

  const catchupIndex = layout.virtualizationCatchupIndex;
  const range = getPlaybackVisibleRange({
    layout,
    chordCount: CHORD_COUNT,
    currentChordIndex: catchupIndex,
    chordRepetitions,
    visiblePlaybackContainerWidth: VIEWPORT_WIDTH,
  });

  assert.ok(range.startIndex <= catchupIndex);
  assert.ok(range.endIndex >= catchupIndex);
});
