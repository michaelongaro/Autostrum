// Pure-logic verification for the playback strip WAAPI motion model.
//
// Usage:
//   node --experimental-strip-types scripts/verifyPlaybackStripMotion.mjs
//
// Exits non-zero if any assertion fails.

import assert from "node:assert/strict";
import {
  buildStripSegment,
  contentElapsedAtLocalMs,
  withStartHold,
  elapsedForAbsolutePositionPx,
  getAbsoluteScrollPositionPx,
  getPlaybackStripMotionModel,
  getScrollPositionForLoopTimeMs,
  getStripAnchor,
  parseStripPositionPx,
  parseTranslateX,
  warpContentForLocalMs,
} from "../src/utils/playbackStripMotion.ts";

let passed = 0;

function test(name, fn) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

function layoutFromChords(chords) {
  const scrollPositions = [];
  let offset = 0;
  for (const chord of chords) {
    scrollPositions.push(offset);
    offset += chord.width;
  }
  return {
    scrollPositions,
    durations: chords.map((chord) => chord.duration),
    totalWidth: offset,
  };
}

function interpolatedPosition(segment, localMs) {
  const offset = segment.durationMs <= 0 ? 0 : localMs / segment.durationMs;
  const frames = segment.keyframes;
  let index = 0;
  while (
    index < frames.length - 2 &&
    (frames[index + 1]?.offset ?? 0) < offset
  ) {
    index += 1;
  }
  const start = frames[index];
  const end = frames[Math.min(index + 1, frames.length - 1)];
  const startPosition = parseStripPositionPx(start.transform);
  const endPosition = parseStripPositionPx(end.transform);
  assert.notEqual(startPosition, null);
  assert.notEqual(endPosition, null);
  const span = end.offset - start.offset;
  const progress = span <= 0 ? 0 : (offset - start.offset) / span;
  return startPosition + (endPosition - startPosition) * progress;
}

const irregular = layoutFromChords([
  { width: 1, duration: 0 },
  { width: 40, duration: 0.4 },
  { width: 34, duration: 0.2 },
  { width: 34, duration: 0.2 },
  { width: 16, duration: 0 },
  { width: 40, duration: 0.5 },
  { width: 34, duration: 0.15 },
  { width: 34, duration: 0.15 },
  { width: 40, duration: 0.3 },
]);

const model = getPlaybackStripMotionModel(irregular);
assert.ok(model);

test("leading and mid zero-duration chords collapse without moving time 0", () => {
  assert.equal(model.timedBoundaryTimesMs[0], 0);
  assert.equal(model.timedBoundaryPositions[0], 0);
  assert.equal(
    model.timedBoundaryTimesMs[model.timedBoundaryTimesMs.length - 1],
    model.totalDurationMs,
  );
  assert.equal(
    model.timedBoundaryPositions[model.timedBoundaryPositions.length - 1],
    irregular.totalWidth,
  );
  assert.equal(getScrollPositionForLoopTimeMs(model, 0), 0);
  assert.equal(
    getScrollPositionForLoopTimeMs(model, model.totalDurationMs),
    irregular.totalWidth,
  );
  // Boundaries are strictly increasing in time.
  for (let index = 1; index < model.timedBoundaryTimesMs.length; index++) {
    assert.ok(
      model.timedBoundaryTimesMs[index] > model.timedBoundaryTimesMs[index - 1],
    );
  }
});

test("a time just under a loop multiple does not snap back to the origin", () => {
  const almost = model.totalDurationMs * (1 - Number.EPSILON);
  const justUnder = model.totalDurationMs - 2e-13 * model.totalDurationMs;
  for (const elapsedMs of [almost, justUnder, 1899.9999999999998]) {
    const position = getAbsoluteScrollPositionPx({
      model,
      totalWidth: irregular.totalWidth,
      anchorStartTimeMs: 0,
      baseRepetition: 0,
      elapsedMs,
    });
    assert.ok(
      Math.abs(position - irregular.totalWidth) < 0.05,
      `elapsed ${elapsedMs} position ${position}`,
    );
  }
});

test("absolute position is continuous across a loop wrap", () => {
  const duration = model.totalDurationMs;
  const before = getAbsoluteScrollPositionPx({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: 0,
    baseRepetition: 0,
    elapsedMs: duration - 0.25,
  });
  const at = getAbsoluteScrollPositionPx({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: 0,
    baseRepetition: 0,
    elapsedMs: duration,
  });
  const after = getAbsoluteScrollPositionPx({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: 0,
    baseRepetition: 0,
    elapsedMs: duration + 0.25,
  });
  assert.ok(Math.abs(at - before) < 0.2, `wrap jump before ${at - before}`);
  assert.ok(Math.abs(after - at) < 0.2, `wrap jump after ${after - at}`);
  assert.ok(after > before);
  assert.equal(
    getAbsoluteScrollPositionPx({
      model,
      totalWidth: irregular.totalWidth,
      anchorStartTimeMs: 0,
      baseRepetition: 1,
      elapsedMs: 0,
    }),
    irregular.totalWidth,
  );
});

test("resume anchor uses that chord's start, not the strip origin", () => {
  const anchor = getStripAnchor({
    chordCount: model.chordCount,
    anchorChordIndex: 5,
    anchorRepetition: 2,
    cumulativeChordTimesMs: model.cumulativeChordTimesMs,
  });
  assert.ok(anchor);
  const position = getAbsoluteScrollPositionPx({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: anchor.anchorStartTimeMs,
    baseRepetition: anchor.baseRepetition,
    elapsedMs: 0,
  });
  assert.equal(
    position,
    (irregular.scrollPositions[5] ?? 0) + 2 * irregular.totalWidth,
  );
});

test("identity keyframes match the position function and stay linear", () => {
  const segment = buildStripSegment({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: 0,
    baseRepetition: 0,
    fromElapsedMs: 0,
    targetDurationMs: 1800,
  });
  assert.ok(segment);
  assert.equal(segment.keyframes[0].offset, 0);
  assert.equal(segment.keyframes[segment.keyframes.length - 1].offset, 1);
  assert.ok(segment.keyframes.length >= 2);
  for (let index = 1; index < segment.keyframes.length; index++) {
    assert.ok(
      segment.keyframes[index].offset > segment.keyframes[index - 1].offset,
    );
    assert.equal(segment.keyframes[index].easing, "linear");
  }

  const samples = 48;
  for (let step = 0; step <= samples; step++) {
    const localMs = (segment.durationMs * step) / samples;
    const contentMs = contentElapsedAtLocalMs(segment, localMs);
    const expected = getAbsoluteScrollPositionPx({
      model,
      totalWidth: irregular.totalWidth,
      anchorStartTimeMs: 0,
      baseRepetition: 0,
      elapsedMs: contentMs,
    });
    const actual = interpolatedPosition(segment, localMs);
    assert.ok(
      Math.abs(actual - expected) < 0.08,
      `local ${localMs} actual ${actual} expected ${expected}`,
    );
  }
});

test("chained segments meet at the same position", () => {
  const first = buildStripSegment({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: 120,
    baseRepetition: 1,
    fromElapsedMs: 40,
    targetDurationMs: 900,
  });
  assert.ok(first);
  const second = buildStripSegment({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: 120,
    baseRepetition: 1,
    fromElapsedMs: first.endElapsedMs,
    targetDurationMs: 900,
  });
  assert.ok(second);
  const firstEnd = parseStripPositionPx(
    first.keyframes[first.keyframes.length - 1].transform,
  );
  const secondStart = parseStripPositionPx(second.keyframes[0].transform);
  assert.ok(Math.abs(firstEnd - secondStart) < 0.001);
  assert.equal(second.fromElapsedMs, first.endElapsedMs);
});

test("uniform chords collapse to a single linear span", () => {
  const uniform = layoutFromChords(
    Array.from({ length: 8 }, () => ({ width: 34, duration: 0.25 })),
  );
  const uniformModel = getPlaybackStripMotionModel(uniform);
  assert.ok(uniformModel);
  const segment = buildStripSegment({
    model: uniformModel,
    totalWidth: uniform.totalWidth,
    anchorStartTimeMs: 0,
    baseRepetition: 0,
    fromElapsedMs: 0,
    targetDurationMs: uniformModel.totalDurationMs,
  });
  assert.ok(segment);
  assert.equal(segment.keyframes.length, 2);
});

test("warp across a loop boundary never rewinds", () => {
  const segment = buildStripSegment({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: 0,
    baseRepetition: 0,
    fromElapsedMs: 318.4048,
    targetDurationMs: 2062,
    warp: {
      visualElapsedMs: 318.4048,
      audioElapsedMs: 212.2,
      windowMs: 1062,
    },
  });
  assert.ok(segment);
  let previous = parseStripPositionPx(segment.keyframes[0].transform);
  for (const frame of segment.keyframes) {
    const position = parseStripPositionPx(frame.transform);
    assert.ok(
      position + 0.05 >= previous,
      `rewind ${previous} -> ${position} at offset ${frame.offset}`,
    );
    previous = position;
  }
});

test("start hold keeps the anchor parked, then matches the motion curve", () => {
  const base = buildStripSegment({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: 0,
    baseRepetition: 0,
    fromElapsedMs: 0,
    targetDurationMs: 1200,
  });
  assert.ok(base);
  const held = withStartHold(base, 80);
  assert.equal(contentElapsedAtLocalMs(held, 0), 0);
  assert.equal(contentElapsedAtLocalMs(held, 79), 0);
  assert.equal(contentElapsedAtLocalMs(held, 80), 0);
  assert.ok(Math.abs(contentElapsedAtLocalMs(held, 180) - 100) < 0.001);

  const startPosition = parseStripPositionPx(held.keyframes[0].transform);
  const holdEnd = held.keyframes[1];
  assert.equal(parseStripPositionPx(holdEnd.transform), startPosition);
  assert.ok(holdEnd.offset > 0 && holdEnd.offset < 1);

  for (let index = 1; index < held.keyframes.length; index++) {
    assert.ok(held.keyframes[index].offset > held.keyframes[index - 1].offset);
  }

  const laterLocal = 80 + 250;
  const offset = laterLocal / held.durationMs;
  let frameIndex = 0;
  while (
    frameIndex < held.keyframes.length - 2 &&
    held.keyframes[frameIndex + 1].offset < offset
  ) {
    frameIndex += 1;
  }
  const start = held.keyframes[frameIndex];
  const end = held.keyframes[frameIndex + 1];
  const span = end.offset - start.offset;
  const progress = (offset - start.offset) / span;
  const startPos = parseStripPositionPx(start.transform);
  const endPos = parseStripPositionPx(end.transform);
  const painted = startPos + (endPos - startPos) * progress;
  const expected = getAbsoluteScrollPositionPx({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: 0,
    baseRepetition: 0,
    elapsedMs: 250,
  });
  assert.ok(Math.abs(painted - expected) < 0.08, `held ${painted} expected ${expected}`);
});

test("warp holds the painted frame and reaches the audio clock", () => {
  const visualElapsedMs = 500;
  const audioElapsedMs = 420;
  const windowMs = 800;
  const painted = getAbsoluteScrollPositionPx({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: 0,
    baseRepetition: 0,
    elapsedMs: visualElapsedMs,
  });
  const segment = buildStripSegment({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: 0,
    baseRepetition: 0,
    fromElapsedMs: visualElapsedMs,
    targetDurationMs: 1600,
    warp: { visualElapsedMs, audioElapsedMs, windowMs },
    firstPositionPx: painted + 0.25,
  });
  assert.ok(segment);
  assert.equal(parseStripPositionPx(segment.keyframes[0].transform), painted + 0.25);
  assert.equal(warpContentForLocalMs(segment.warp, 0), visualElapsedMs);
  assert.equal(
    warpContentForLocalMs(segment.warp, windowMs),
    audioElapsedMs + windowMs,
  );
  assert.equal(
    contentElapsedAtLocalMs(segment, windowMs + 100),
    audioElapsedMs + windowMs + 100,
  );

  // After the pinned first frame, motion does not run backwards.
  let previous = parseStripPositionPx(segment.keyframes[0].transform);
  for (const frame of segment.keyframes.slice(1)) {
    const position = parseStripPositionPx(frame.transform);
    assert.ok(position + 0.05 >= previous, `backward ${previous} -> ${position}`);
    previous = position;
  }
});

test("elapsed lookup round-trips through absolute position", () => {
  const elapsedMs = 842.5;
  const position = getAbsoluteScrollPositionPx({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: 80,
    baseRepetition: 3,
    elapsedMs,
  });
  const recovered = elapsedForAbsolutePositionPx({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: 80,
    baseRepetition: 3,
    positionPx: position,
    estimateElapsedMs: 100,
  });
  assert.ok(Math.abs(recovered - elapsedMs) < 0.05, `recovered ${recovered}`);
});

test("transform parsing understands WAAPI matrix and translate forms", () => {
  assert.equal(parseTranslateX("none"), null);
  assert.equal(parseTranslateX("translate3d(-12.5px, 0px, 0px)"), -12.5);
  assert.equal(parseTranslateX("translateX(4px)"), 4);
  assert.equal(parseTranslateX("matrix(1, 0, 0, 1, -8, 0)"), -8);
  assert.equal(
    parseTranslateX(
      "matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -19.25, 0, 0, 1)",
    ),
    -19.25,
  );
  assert.equal(parseStripPositionPx("translate3d(-19.25px, 0, 0)"), 19.25);
});

test("keyframe budget ends a segment early instead of dropping corners", () => {
  const segment = buildStripSegment({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: 0,
    baseRepetition: 0,
    fromElapsedMs: 0,
    targetDurationMs: model.totalDurationMs * 6,
    maxKeyframes: 4,
  });
  assert.ok(segment);
  assert.ok(segment.keyframes.length <= 4);
  assert.ok(segment.durationMs < model.totalDurationMs * 6);
  const endPosition = parseStripPositionPx(
    segment.keyframes[segment.keyframes.length - 1].transform,
  );
  const expected = getAbsoluteScrollPositionPx({
    model,
    totalWidth: irregular.totalWidth,
    anchorStartTimeMs: 0,
    baseRepetition: 0,
    elapsedMs: segment.endElapsedMs,
  });
  assert.ok(Math.abs(endPosition - expected) < 0.08);
});

console.log(`\n${passed} tests passed`);
