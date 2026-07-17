// Pure-logic verification for playback modal layout / virtualization helpers.
//
// Usage:
//   node scripts/verifyPlaybackModalLayout.mjs
//
// Exits non-zero if any assertion fails.

import assert from "node:assert/strict";

function getChordWidth(chord) {
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

function fillRepetitions(length, value) {
  return new Array(length).fill(value);
}

function halfShiftedRepetitions(
  length,
  virtualizationStartIndex,
  firstHalfValue,
  secondHalfValue,
) {
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

function computePlaybackChordLayoutData({
  expandedTabData,
  playbackMetadata,
  playbackSpeed,
  visiblePlaybackContainerWidth,
}) {
  if (
    !expandedTabData ||
    !playbackMetadata ||
    expandedTabData.length === 0 ||
    visiblePlaybackContainerWidth <= 0
  ) {
    return null;
  }

  const scrollPositions = [];
  const chordWidths = [];
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
    if (isZeroDurationMeasureLine || isZeroDurationTypeSpacer) return 0;
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
    if (currentPosition === undefined) continue;
    if (currentPosition - visiblePlaybackContainerWidth * 0.5 >= 0) {
      virtualizationCatchupIndex = i;
      break;
    }
  }

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

function resyncChordRepetitionsAfterIndexJump({
  length,
  previousRepetitions,
  currentChordIndex,
  virtualizationIndex,
  virtualizationStartIndex,
  virtualizationCatchupIndex,
  canVirtualize,
  wrappedForward,
}) {
  if (length <= 0) return [];

  const prevFirst = previousRepetitions[0] ?? 0;
  const prevLast =
    previousRepetitions[previousRepetitions.length - 1] ?? prevFirst;
  const wasPrimaryPending = prevFirst !== prevLast;

  if (!canVirtualize) {
    const base = Math.max(prevFirst, prevLast) + (wrappedForward ? 1 : 0);
    return fillRepetitions(length, base);
  }

  if (wrappedForward) {
    const postLoopFirstHalf = wasPrimaryPending ? prevFirst : prevFirst + 1;
    const postLoopSecondHalf = postLoopFirstHalf - 1;

    if (currentChordIndex >= virtualizationCatchupIndex) {
      return fillRepetitions(length, postLoopFirstHalf);
    }

    return halfShiftedRepetitions(
      length,
      virtualizationStartIndex,
      postLoopFirstHalf,
      postLoopSecondHalf,
    );
  }

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

  if (currentChordIndex >= virtualizationCatchupIndex && wasPrimaryPending) {
    return fillRepetitions(length, prevFirst);
  }

  if (previousRepetitions.length === length) {
    return previousRepetitions;
  }

  return fillRepetitions(length, prevFirst);
}

function makeTabChords(count) {
  return Array.from({ length: count }, () => ({
    type: "tab",
    data: {
      chordData: ["0", "0", "0", "0", "0", "0", "", "", "1/4", "120"],
    },
  }));
}

function makeMetadata(count) {
  return Array.from({ length: count }, () => ({
    type: "note",
    bpm: 120,
    noteLengthMultiplier: 1,
  }));
}

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (error) {
    console.error(`  FAIL  ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

console.log("playback modal layout helpers");

check("returns null when width is unset", () => {
  const layout = computePlaybackChordLayoutData({
    expandedTabData: makeTabChords(8),
    playbackMetadata: makeMetadata(8),
    playbackSpeed: 1,
    visiblePlaybackContainerWidth: 0,
  });
  assert.equal(layout, null);
});

check("marks short strips as not virtualizable", () => {
  // 4 chords * 34px = 136px, viewport 400 → too short, indices collapse
  const layout = computePlaybackChordLayoutData({
    expandedTabData: makeTabChords(4),
    playbackMetadata: makeMetadata(4),
    playbackSpeed: 1,
    visiblePlaybackContainerWidth: 400,
  });
  assert.ok(layout);
  assert.equal(layout.canVirtualize, false);
  assert.equal(layout.virtualizationIndex, 0);
});

check("marks sufficiently long strips as virtualizable", () => {
  // Need >= 2x viewport for real playback; 40 chords * 34 = 1360, viewport 400
  const layout = computePlaybackChordLayoutData({
    expandedTabData: makeTabChords(40),
    playbackMetadata: makeMetadata(40),
    playbackSpeed: 1,
    visiblePlaybackContainerWidth: 400,
  });
  assert.ok(layout);
  assert.equal(layout.canVirtualize, true);
  assert.ok(layout.virtualizationIndex > 0);
  assert.ok(layout.virtualizationStartIndex > 0);
  assert.ok(layout.virtualizationCatchupIndex > 0);
});

check("forward index jump applies primary half-shift once", () => {
  const length = 20;
  const previous = fillRepetitions(length, 2);
  const next = resyncChordRepetitionsAfterIndexJump({
    length,
    previousRepetitions: previous,
    currentChordIndex: 18,
    previousChordIndex: 3,
    virtualizationIndex: 15,
    virtualizationStartIndex: 17,
    virtualizationCatchupIndex: 4,
    canVirtualize: true,
    wrappedForward: false,
  });

  assert.deepEqual(
    next,
    halfShiftedRepetitions(length, 17, 3, 2),
  );
});

check("wrapped jump before catchup keeps primary shape", () => {
  const length = 20;
  const previous = fillRepetitions(length, 2);
  const next = resyncChordRepetitionsAfterIndexJump({
    length,
    previousRepetitions: previous,
    currentChordIndex: 1,
    previousChordIndex: 18,
    virtualizationIndex: 15,
    virtualizationStartIndex: 17,
    virtualizationCatchupIndex: 4,
    canVirtualize: true,
    wrappedForward: true,
  });

  assert.deepEqual(
    next,
    halfShiftedRepetitions(length, 17, 3, 2),
  );
});

check("wrapped jump past catchup fully catches up", () => {
  const length = 20;
  const previous = fillRepetitions(length, 2);
  const next = resyncChordRepetitionsAfterIndexJump({
    length,
    previousRepetitions: previous,
    currentChordIndex: 6,
    previousChordIndex: 18,
    virtualizationIndex: 15,
    virtualizationStartIndex: 17,
    virtualizationCatchupIndex: 4,
    canVirtualize: true,
    wrappedForward: true,
  });

  assert.deepEqual(next, fillRepetitions(length, 3));
});

check("degenerate layout stays uniform after jump", () => {
  const length = 8;
  const previous = fillRepetitions(length, 1);
  const next = resyncChordRepetitionsAfterIndexJump({
    length,
    previousRepetitions: previous,
    currentChordIndex: 0,
    previousChordIndex: 7,
    virtualizationIndex: 0,
    virtualizationStartIndex: 0,
    virtualizationCatchupIndex: 0,
    canVirtualize: false,
    wrappedForward: true,
  });

  assert.deepEqual(next, fillRepetitions(length, 2));
});

if (process.exitCode) {
  console.error("\nSome playback modal layout checks failed.");
  process.exit(1);
}

console.log(`\nAll ${passed} playback modal layout checks passed.`);
