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

function getPatternVisualScrollX(itemIndex, patternLength) {
  return getPatternGroupIndex(itemIndex, patternLength) * TOTAL_CHORD_WIDTH;
}

assert.equal(getPatternGroupIndex(0, 4), 0);
assert.equal(getPatternGroupIndex(3, 4), 0);
assert.equal(getPatternGroupIndex(4, 4), 1);
assert.equal(getPatternVisualScrollX(0, 4), 0);
assert.equal(getPatternVisualScrollX(3, 4), 0);
assert.equal(getPatternVisualScrollX(4, 4), TOTAL_CHORD_WIDTH);
assert.equal(getPatternVisualScrollX(9, 8), TOTAL_CHORD_WIDTH);

console.log("verifyChordTrainerSnap: all assertions passed");
