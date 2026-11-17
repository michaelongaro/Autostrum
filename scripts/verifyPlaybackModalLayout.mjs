// Pure-logic verification for playback modal layout / virtualization helpers.
//
// Usage:
//   node scripts/verifyPlaybackModalLayout.mjs
//
// Exits non-zero if any assertion fails.

import assert from "node:assert/strict";

import "./lib/registerTypeScript.mjs";

const { computePlaybackChordLayoutData } =
  await import("../src/utils/playbackModalLayout.ts");

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

if (process.exitCode) {
  console.error("\nSome playback modal layout checks failed.");
  process.exit(1);
}

console.log(`\nAll ${passed} playback modal layout checks passed.`);
