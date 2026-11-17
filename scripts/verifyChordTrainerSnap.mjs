// Pure-logic verification for chord trainer pause/snap helpers.
//
// Usage:
//   node scripts/verifyChordTrainerSnap.mjs
//
// Exits non-zero if any assertion fails.

import assert from "node:assert/strict";

import "./lib/registerTypeScript.mjs";

const {
  TOTAL_CHORD_WIDTH,
  PATTERN_TOTAL_CHORD_WIDTH,
  getCenteredChordIndex,
  getChordStartScrollX,
  getPatternGroupIndex,
  getPatternVisualScrollX,
  getPatternPlayheadProgress,
  getPatternTrimCount,
} = await import("../src/utils/chordTrainerQueue.ts");

function snapScrollXToCurrentChordStart(scrollX) {
  return getChordStartScrollX(getCenteredChordIndex(scrollX));
}

assert.equal(getCenteredChordIndex(0), 0);
assert.equal(getChordStartScrollX(0), 0);
assert.equal(snapScrollXToCurrentChordStart(0), 0);

assert.equal(getCenteredChordIndex(TOTAL_CHORD_WIDTH * 0.5), 0);
assert.equal(snapScrollXToCurrentChordStart(TOTAL_CHORD_WIDTH * 0.5), 0);

assert.equal(getCenteredChordIndex(TOTAL_CHORD_WIDTH - 1), 0);
assert.equal(snapScrollXToCurrentChordStart(TOTAL_CHORD_WIDTH - 1), 0);

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
