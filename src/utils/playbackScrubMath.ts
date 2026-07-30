/**
 * Shared helpers for playback scrub modes (velocity discrete + glide snap).
 */

export type PlaybackScrubMode = "legacy" | "velocity" | "glide";

export const PLAYBACK_SCRUB_MODE_LABELS: Record<PlaybackScrubMode, string> = {
  legacy: "Legacy",
  velocity: "Velocity",
  glide: "Glide",
};

/** Clamp helper. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Absolute strip position for a chord, including per-chord loop repetitions.
 */
export function getAbsoluteChordPosition(
  index: number,
  scrollPositions: number[],
  chordRepetitions: number[],
  totalWidth: number,
) {
  return (
    (scrollPositions[index] ?? 0) + (chordRepetitions[index] ?? 0) * totalWidth
  );
}

/**
 * Min/max absolute chord positions for the current repetition layout.
 *
 * IMPORTANT: after primary virtualization half-shifts early chords onto the
 * next loop, index 0 can sit *ahead* of the last index. Never assume
 * index 0 = min / last index = max or bounds invert and scrubbing sticks.
 */
export function getAbsoluteChordPositionBounds(
  scrollPositions: number[],
  chordRepetitions: number[],
  totalWidth: number,
) {
  const chordCount = scrollPositions.length;
  if (chordCount === 0) {
    return { min: 0, max: 0 };
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < chordCount; index++) {
    const absPos = getAbsoluteChordPosition(
      index,
      scrollPositions,
      chordRepetitions,
      totalWidth,
    );
    min = Math.min(min, absPos);
    max = Math.max(max, absPos);
  }

  const firstRep = chordRepetitions[0] ?? 0;
  const lastRep = chordRepetitions[chordCount - 1] ?? 0;

  // Uniform reps: next-loop chord 0 is not placed yet. Extend max so the user
  // can scrub past the final chord into the following loop continuously.
  if (firstRep === lastRep && totalWidth > 0) {
    const nextLoopFirst =
      getAbsoluteChordPosition(0, scrollPositions, chordRepetitions, totalWidth) +
      totalWidth;
    max = Math.max(max, nextLoopFirst);
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 0 };
  }

  return { min, max };
}

/**
 * True when an index decrease is still visually forward (loop wrap), e.g.
 * last chord → first chord of the next artificial loop after half-shift.
 */
export function isVisuallyForwardIndexChange(
  previousIndex: number,
  nextIndex: number,
  scrollPositions: number[],
  chordRepetitions: number[],
  totalWidth: number,
) {
  if (nextIndex >= previousIndex) return nextIndex > previousIndex;

  const previousAbs = getAbsoluteChordPosition(
    previousIndex,
    scrollPositions,
    chordRepetitions,
    totalWidth,
  );
  const nextAbs = getAbsoluteChordPosition(
    nextIndex,
    scrollPositions,
    chordRepetitions,
    totalWidth,
  );

  return nextAbs > previousAbs;
}

/**
 * Half-shift repetitions the same way PlaybackModal's primary virtualization
 * does, so scrubbing past the strip end can enter the next loop continuously.
 */
export function halfShiftRepetitionsForNextLoop(
  chordRepetitions: number[],
  virtualizationStartIndex: number,
) {
  const length = chordRepetitions.length;
  if (length === 0) return chordRepetitions;

  const firstRep = chordRepetitions[0] ?? 0;
  const lastRep = chordRepetitions[length - 1] ?? 0;
  if (firstRep !== lastRep) {
    return chordRepetitions;
  }

  const startIndex = Math.min(Math.max(0, virtualizationStartIndex), length);
  const nextRep = firstRep + 1;

  return [
    ...(new Array(startIndex).fill(nextRep) as number[]),
    ...(new Array(length - startIndex).fill(firstRep) as number[]),
  ];
}

/**
 * Chord whose start is at or just before the playhead (highlight line).
 * Prefer this over "nearest" while dragging so highlighting matches playback.
 */
export function getChordIndexAtPlayhead(
  positionPx: number,
  scrollPositions: number[],
  chordRepetitions: number[],
  totalWidth: number,
) {
  const chordCount = scrollPositions.length;
  if (chordCount === 0) return 0;

  let bestIndex = 0;
  let bestPos = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < chordCount; index++) {
    const absPos = getAbsoluteChordPosition(
      index,
      scrollPositions,
      chordRepetitions,
      totalWidth,
    );

    if (absPos <= positionPx + 0.5 && absPos >= bestPos) {
      bestPos = absPos;
      bestIndex = index;
    }
  }

  return bestIndex;
}

/**
 * Nearest chord start to a projected landing position (used for release snap).
 */
export function getNearestChordIndex(
  positionPx: number,
  scrollPositions: number[],
  chordRepetitions: number[],
  totalWidth: number,
) {
  const chordCount = scrollPositions.length;
  if (chordCount === 0) return 0;

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < chordCount; index++) {
    const absPos = getAbsoluteChordPosition(
      index,
      scrollPositions,
      chordRepetitions,
      totalWidth,
    );
    const distance = Math.abs(absPos - positionPx);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

/**
 * Container-relative pixels required to earn one discrete chord step.
 * Keeps phone vs desktop scrubbing feeling similar.
 */
export function getVelocityPixelsPerChord(containerWidthPx: number) {
  return clamp(containerWidthPx * 0.03, 10, 28);
}

/**
 * Faster finger motion earns chords with less travel.
 * velocityPxPerMs is absolute horizontal finger speed.
 */
export function getVelocityAdjustedPixelsPerChord(
  basePixelsPerChord: number,
  velocityPxPerMs: number,
) {
  // ~0.5px/ms (moderate flick) halves the threshold; harder flicks go lower.
  const speedBoost = 1 + velocityPxPerMs / 0.5;
  return clamp(basePixelsPerChord / speedBoost, 4, basePixelsPerChord);
}

export function getStripTransform(positionPx: number) {
  return `translate3d(${positionPx * -1}px, 0, 0)`;
}

/**
 * Exponential coast projection: integral of v0 * e^(-k t) = v0 / k.
 * velocityPxPerMs is in strip-position space (positive = forward through tab).
 */
export function projectCoastPosition(
  positionPx: number,
  velocityPxPerMs: number,
  frictionPerMs: number,
) {
  if (frictionPerMs <= 0 || Math.abs(velocityPxPerMs) < 0.001) {
    return positionPx;
  }

  return positionPx + velocityPxPerMs / frictionPerMs;
}
