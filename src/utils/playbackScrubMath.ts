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

  // Uniform reps: neighboring loops are not placed yet. Extend both edges so
  // forward/backward scrubbing can cross loop seams at the same pixel rate.
  if (firstRep === lastRep && totalWidth > 0) {
    const loopFirst = getAbsoluteChordPosition(
      0,
      scrollPositions,
      chordRepetitions,
      totalWidth,
    );
    max = Math.max(max, loopFirst + totalWidth);
    if (firstRep > 0) {
      min = Math.min(min, loopFirst - totalWidth);
    }
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
 * UIScrollView.DecelerationRate.normal — velocity retained per millisecond.
 * See: https://medium.com/@esskeetit/scrolling-mechanics-of-uiscrollview-142adee1142c
 */
export const IOS_DECELERATION_RATE = 0.998;

/** Stop coasting once |velocity| falls below this (px/ms). */
export const IOS_REST_VELOCITY_PX_PER_MS = 0.02;

/**
 * Undo PlaybackModal's primary half-shift (first half on next loop → uniform).
 */
export function undoHalfShiftRepetitions(chordRepetitions: number[]) {
  const length = chordRepetitions.length;
  if (length === 0) return chordRepetitions;

  const lastRep = chordRepetitions[length - 1] ?? 0;
  return new Array(length).fill(lastRep) as number[];
}

/**
 * iOS coast end position: x∞ = x0 + v0 / -ln(d), with v0 in px/ms.
 */
export function projectIosCoastPosition(
  positionPx: number,
  velocityPxPerMs: number,
  decelerationRate = IOS_DECELERATION_RATE,
) {
  if (Math.abs(velocityPxPerMs) < IOS_REST_VELOCITY_PX_PER_MS) {
    return positionPx;
  }

  const lnRate = Math.log(decelerationRate);
  if (lnRate >= 0) return positionPx;

  return positionPx + velocityPxPerMs / -lnRate;
}

/**
 * Exact position delta over dtMs under iOS exponential deceleration.
 * Also returns the decayed velocity at the end of the frame.
 */
export function integrateIosCoastStep(
  velocityPxPerMs: number,
  deltaMs: number,
  decelerationRate = IOS_DECELERATION_RATE,
) {
  if (deltaMs <= 0) {
    return { positionDelta: 0, velocity: velocityPxPerMs };
  }

  const lnRate = Math.log(decelerationRate);
  const velocityEnd = velocityPxPerMs * Math.pow(decelerationRate, deltaMs);
  // Integral of v0 * d^t from 0..dt = v0 / ln(d) * (d^dt - 1)
  const positionDelta =
    lnRate === 0
      ? velocityPxPerMs * deltaMs
      : (velocityPxPerMs / lnRate) * (Math.pow(decelerationRate, deltaMs) - 1);

  return { positionDelta, velocity: velocityEnd };
}

/**
 * UIScrollView rubber-band when pulling past an edge.
 * coefficient 0.55 matches UIScrollView's default feel.
 */
export function iosRubberBandOffset(
  offsetPx: number,
  dimensionPx: number,
  coefficient = 0.55,
) {
  if (offsetPx === 0 || dimensionPx <= 0) return 0;

  const sign = offsetPx < 0 ? -1 : 1;
  const x = Math.abs(offsetPx);
  return (
    sign * (1 - 1 / ((x * coefficient) / dimensionPx + 1)) * dimensionPx
  );
}

/**
 * Map an unconstrained position into bounds with iOS rubber-banding outside.
 */
export function applyIosRubberBandPosition(
  positionPx: number,
  min: number,
  max: number,
  dimensionPx: number,
) {
  if (positionPx < min) {
    return min - iosRubberBandOffset(min - positionPx, dimensionPx);
  }
  if (positionPx > max) {
    return max + iosRubberBandOffset(positionPx - max, dimensionPx);
  }
  return positionPx;
}

/**
 * Exponential coast projection: integral of v0 * e^(-k t) = v0 / k.
 * velocityPxPerMs is in strip-position space (positive = forward through tab).
 * @deprecated Prefer projectIosCoastPosition for Glide mode.
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
