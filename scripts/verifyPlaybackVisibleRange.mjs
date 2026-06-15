// Verifies computePlaybackVisibleRange matches a brute-force reference implementation.

function getChordPosition(index, scrollPositions, chordRepetitions, totalWidth) {
  return (
    (scrollPositions[index] ?? 0) + (chordRepetitions[index] ?? 0) * totalWidth
  );
}

function lowerBound(positions, target, start, end) {
  let lo = start;
  let hi = end;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((positions[mid] ?? 0) < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(positions, target, start, end) {
  let lo = start;
  let hi = end;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if ((positions[mid] ?? 0) > target) hi = mid - 1;
    else lo = mid;
  }
  return lo;
}

function computePlaybackVisibleRange(args) {
  const {
    scrollPositions,
    chordRepetitions,
    totalWidth,
    currentChordIndex,
    visiblePlaybackContainerWidth,
    virtualizationBuffer,
  } = args;

  const chordCount = scrollPositions.length;
  if (chordCount === 0) return { startIndex: 0, endIndex: 0 };

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

function bruteForceVisibleRange(args) {
  const {
    scrollPositions,
    chordRepetitions,
    totalWidth,
    currentChordIndex,
    visiblePlaybackContainerWidth,
    virtualizationBuffer,
  } = args;
  const chordCount = scrollPositions.length;
  const currentScrollPosition =
    (scrollPositions[currentChordIndex] ?? 0) +
    (chordRepetitions[currentChordIndex] ?? 0) * totalWidth;

  const halfViewport = visiblePlaybackContainerWidth / 2;
  const minVisiblePosition =
    currentScrollPosition - halfViewport - virtualizationBuffer;
  const maxVisiblePosition =
    currentScrollPosition + halfViewport + virtualizationBuffer;

  let startIndex = 0;
  let endIndex = chordCount - 1;

  for (let i = 0; i < chordCount; i++) {
    const chordPosition =
      (scrollPositions[i] ?? 0) + (chordRepetitions[i] ?? 0) * totalWidth;
    if (chordPosition >= minVisiblePosition) {
      startIndex = Math.max(0, i - 1);
      break;
    }
  }

  for (let i = chordCount - 1; i >= 0; i--) {
    const chordPosition =
      (scrollPositions[i] ?? 0) + (chordRepetitions[i] ?? 0) * totalWidth;
    if (chordPosition <= maxVisiblePosition) {
      endIndex = Math.min(chordCount - 1, i + 1);
      break;
    }
  }

  return { startIndex, endIndex };
}

function buildScrollPositions(chordCount, chordWidth = 34) {
  return Array.from({ length: chordCount }, (_, index) => index * chordWidth);
}

let passed = 0;
let failed = 0;

function assertEqual(label, actual, expected) {
  if (
    actual.startIndex === expected.startIndex &&
    actual.endIndex === expected.endIndex
  ) {
    passed++;
    return;
  }
  failed++;
  console.error(`FAIL ${label}`, { actual, expected });
}

const chordCounts = [1, 8, 64, 200];
const viewports = [320, 768, 1200];

for (const chordCount of chordCounts) {
  const scrollPositions = buildScrollPositions(chordCount);
  const totalWidth = scrollPositions.at(-1) + 34;

  for (const visiblePlaybackContainerWidth of viewports) {
    for (let currentChordIndex = 0; currentChordIndex < chordCount; currentChordIndex++) {
      for (const repetition of [0, 1, 3]) {
        const chordRepetitions = new Array(chordCount).fill(repetition);
        const args = {
          scrollPositions,
          chordRepetitions,
          totalWidth,
          currentChordIndex,
          visiblePlaybackContainerWidth,
          virtualizationBuffer: 100,
        };

        assertEqual(
          `chords=${chordCount} idx=${currentChordIndex} rep=${repetition}`,
          computePlaybackVisibleRange(args),
          bruteForceVisibleRange(args),
        );
      }
    }
  }
}

console.log(`playbackVisibleRange: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
