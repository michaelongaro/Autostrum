/**
 * Verifies measure-line neighbors no longer crash note-length guide parsing
 * in the playback path (mirrors fixed RenderChordByType helpers).
 *
 *   node scripts/verifyMeasureLineNoteLength.mjs
 */

import assert from "node:assert/strict";

const NOTE_BASES = ["whole", "half", "quarter", "eighth", "sixteenth"];

function parseFullNoteLength(note) {
  const normalizedNote = String(note).toLowerCase();
  const base = NOTE_BASES.find((candidate) =>
    normalizedNote.includes(candidate),
  );
  if (!base) {
    throw new Error(`Unsupported note length: ${String(note)}`);
  }
  return { base };
}

function supportsBeaming(note) {
  return note?.base === "eighth" || note?.base === "sixteenth";
}

function isPlaybackTabMeasureLine(playbackChord) {
  return (
    playbackChord?.type === "tab" &&
    (playbackChord.data.chordData.includes("|") ||
      playbackChord.data.chordData[8] === "measureLine")
  );
}

function getTabChordNoteLength(playbackChord) {
  if (isPlaybackTabMeasureLine(playbackChord)) {
    return undefined;
  }
  return playbackChord.data.chordData[8];
}

function renderGuideLike({
  previousNoteLength,
  currentNoteLength,
  nextNoteLength,
  isFirstInGroup,
  isLastInGroup,
  previousIsRestStrum = false,
  nextIsRestStrum = false,
}) {
  const parsedCurrent = parseFullNoteLength(currentNoteLength);
  const currentSupportsBeams = supportsBeaming(parsedCurrent);

  const parsedPrevious =
    currentSupportsBeams &&
    !isFirstInGroup &&
    previousNoteLength !== undefined &&
    !previousIsRestStrum
      ? parseFullNoteLength(previousNoteLength)
      : null;

  const parsedNext =
    currentSupportsBeams &&
    !isLastInGroup &&
    nextNoteLength !== undefined &&
    !nextIsRestStrum
      ? parseFullNoteLength(nextNoteLength)
      : null;

  return { parsedCurrent, parsedPrevious, parsedNext };
}

function resolveLikeRenderChordByType(prevChord, chord, nextChord) {
  const prevChordNoteLength =
    prevChord?.type === "tab" ? getTabChordNoteLength(prevChord) : undefined;
  const currentChordNoteLength =
    chord?.type === "tab" ? getTabChordNoteLength(chord) : undefined;
  const nextChordNoteLength =
    nextChord?.type === "tab" ? getTabChordNoteLength(nextChord) : undefined;

  const prevIsMeasureLine = isPlaybackTabMeasureLine(prevChord);
  const nextIsMeasureLine = isPlaybackTabMeasureLine(nextChord);

  const isFirstChord = (chord?.isFirstChord ?? false) || prevIsMeasureLine;
  const isLastChord = (chord?.isLastChord ?? false) || nextIsMeasureLine;

  return renderGuideLike({
    previousNoteLength: prevChordNoteLength,
    currentNoteLength: currentChordNoteLength,
    nextNoteLength: nextChordNoteLength,
    isFirstInGroup: isFirstChord,
    isLastInGroup: isLastChord,
  });
}

const measureLine = {
  type: "tab",
  isFirstChord: false,
  isLastChord: false,
  data: {
    chordData: ["", "|", "|", "|", "|", "|", "|", "-1", "measureLine", "id"],
  },
};

const eighthMid = {
  type: "tab",
  isFirstChord: false,
  isLastChord: false,
  data: {
    chordData: ["", "0", "", "", "", "", "", "", "eighth", "id"],
  },
};

const sixteenthMid = {
  type: "tab",
  isFirstChord: false,
  isLastChord: false,
  data: {
    chordData: ["", "0", "", "", "", "", "", "", "sixteenth", "id"],
  },
};

let passed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (error) {
    console.error(`  FAIL  ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

console.log("measure-line note length playback neighbors");

check("eighth before measure line does not throw", () => {
  const result = resolveLikeRenderChordByType(undefined, eighthMid, measureLine);
  assert.equal(result.parsedCurrent.base, "eighth");
  assert.equal(result.parsedNext, null);
});

check("eighth after measure line does not throw", () => {
  const result = resolveLikeRenderChordByType(measureLine, eighthMid, undefined);
  assert.equal(result.parsedCurrent.base, "eighth");
  assert.equal(result.parsedPrevious, null);
});

check("sixteenth between notes still beams", () => {
  const left = {
    ...eighthMid,
    data: { chordData: ["", "0", "", "", "", "", "", "", "sixteenth", "a"] },
  };
  const right = {
    ...eighthMid,
    data: { chordData: ["", "0", "", "", "", "", "", "", "sixteenth", "b"] },
  };
  const result = resolveLikeRenderChordByType(left, sixteenthMid, right);
  assert.equal(result.parsedPrevious?.base, "sixteenth");
  assert.equal(result.parsedNext?.base, "sixteenth");
});

check("raw measureLine still throws in parseFullNoteLength", () => {
  assert.throws(
    () => parseFullNoteLength("measureLine"),
    /Unsupported note length: measureLine/,
  );
});

if (process.exitCode) {
  console.error("\nSome measure-line note length checks failed.");
  process.exit(1);
}

console.log(`\nAll ${passed} measure-line note length checks passed.`);
