// Pure-logic verification for chord trainer pause/snap helpers.
//
// Usage:
//   node scripts/verifyChordTrainerSnap.mjs
//
// Exits non-zero if any assertion fails.

import assert from "node:assert/strict";

const CHORD_ITEM_WIDTH = 136;
const CHORD_ITEM_GAP = 40;
const TOTAL_CHORD_WIDTH = CHORD_ITEM_WIDTH + CHORD_ITEM_GAP;
const CENTER_TRIGGER_EPSILON = 0.001;

function getCenteredChordIndex(scrollX) {
  return Math.max(
    0,
    Math.floor(scrollX / TOTAL_CHORD_WIDTH + CENTER_TRIGGER_EPSILON),
  );
}

function getChordStartScrollX(chordIndex) {
  return chordIndex * TOTAL_CHORD_WIDTH;
}

function snapScrollXToCurrentChordStart(scrollX) {
  return getChordStartScrollX(getCenteredChordIndex(scrollX));
}

assert.equal(getCenteredChordIndex(0), 0);
assert.equal(getChordStartScrollX(0), 0);
assert.equal(snapScrollXToCurrentChordStart(0), 0);

assert.equal(getCenteredChordIndex(TOTAL_CHORD_WIDTH * 0.5), 0);
assert.equal(snapScrollXToCurrentChordStart(TOTAL_CHORD_WIDTH * 0.5), 0);

assert.equal(getCenteredChordIndex(TOTAL_CHORD_WIDTH - 1), 0);
assert.equal(
  snapScrollXToCurrentChordStart(TOTAL_CHORD_WIDTH - 1),
  0,
);

assert.equal(getCenteredChordIndex(TOTAL_CHORD_WIDTH), 1);
assert.equal(
  snapScrollXToCurrentChordStart(TOTAL_CHORD_WIDTH),
  TOTAL_CHORD_WIDTH,
);

assert.equal(getCenteredChordIndex(TOTAL_CHORD_WIDTH * 2.8), 2);
assert.equal(
  snapScrollXToCurrentChordStart(TOTAL_CHORD_WIDTH * 2.8),
  TOTAL_CHORD_WIDTH * 2,
);

assert.equal(getCenteredChordIndex(TOTAL_CHORD_WIDTH * 5 - 1), 4);
assert.equal(getCenteredChordIndex(TOTAL_CHORD_WIDTH * 5), 5);

assert.equal(
  snapScrollXToCurrentChordStart(TOTAL_CHORD_WIDTH * 5.99),
  TOTAL_CHORD_WIDTH * 5,
);

function getPatternGroupIndex(itemIndex, patternLength) {
  if (patternLength <= 0) return 0;
  return Math.floor(Math.max(0, itemIndex) / patternLength);
}

const PATTERN_CHORD_ITEM_GAP = 16;
const PATTERN_TOTAL_CHORD_WIDTH = CHORD_ITEM_WIDTH + PATTERN_CHORD_ITEM_GAP;
const PATTERN_KEEP_PAST_GROUPS = 8;

function getPatternVisualScrollX(
  itemIndex,
  patternLength,
  stride = PATTERN_TOTAL_CHORD_WIDTH,
) {
  return getPatternGroupIndex(itemIndex, patternLength) * stride;
}

function getPatternPlayheadProgress(scrollX, patternLength) {
  if (patternLength <= 0) return 0;
  const groupWidth = patternLength * TOTAL_CHORD_WIDTH;
  const groupIndex = Math.floor(Math.max(0, scrollX) / groupWidth);
  const groupStartX = groupIndex * groupWidth;
  return Math.max(0, Math.min(1, (scrollX - groupStartX) / groupWidth));
}

function getPatternTrimCount(currentCenterIndex, patternLength) {
  if (patternLength <= 0) return 0;
  const keepPastItems = PATTERN_KEEP_PAST_GROUPS * patternLength;
  const raw = currentCenterIndex - keepPastItems;
  if (raw <= 0) return 0;
  return Math.floor(raw / patternLength) * patternLength;
}

assert.equal(getPatternGroupIndex(0, 4), 0);
assert.equal(getPatternGroupIndex(3, 4), 0);
assert.equal(getPatternGroupIndex(4, 4), 1);
assert.equal(getPatternVisualScrollX(0, 4), 0);
assert.equal(getPatternVisualScrollX(3, 4), 0);
assert.equal(getPatternVisualScrollX(4, 4), PATTERN_TOTAL_CHORD_WIDTH);
assert.equal(getPatternVisualScrollX(9, 8), PATTERN_TOTAL_CHORD_WIDTH);

assert.equal(getPatternPlayheadProgress(0, 4), 0);
assert.equal(getPatternPlayheadProgress(TOTAL_CHORD_WIDTH, 4), 0.25);
assert.equal(getPatternPlayheadProgress(TOTAL_CHORD_WIDTH * 2, 4), 0.5);
assert.equal(getPatternPlayheadProgress(TOTAL_CHORD_WIDTH * 4, 4), 0);

assert.equal(getPatternTrimCount(0, 4), 0);
assert.equal(getPatternTrimCount(31, 4), 0);
assert.equal(getPatternTrimCount(32, 4), 0);
assert.equal(getPatternTrimCount(36, 4), 4);
assert.equal(getPatternTrimCount(16, 8), 0);
assert.equal(getPatternTrimCount(72, 8), 8);

console.log("verifyChordTrainerSnap: all assertions passed");
