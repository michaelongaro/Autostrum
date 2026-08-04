/**
 * Shared helpers for playback glide scrubbing (iOS-like scroll + chord snap).
 */

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
 *
 * Backward scrub intentionally resets repetitions to zero (see glide hook),
 * so we only extend max into the next loop — never min into a previous loop.
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
    const loopFirst = getAbsoluteChordPosition(
      0,
      scrollPositions,
      chordRepetitions,
      totalWidth,
    );
    max = Math.max(max, loopFirst + totalWidth);
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
 * Hard cap on scrub/coast velocity (px/ms). Uncapped finger samples can exceed
 * 1px/ms and make flings feel uncontrollably fast.
 */
export const MAX_SCRUB_VELOCITY_PX_PER_MS = 0.32;

/**
 * Release speeds below this are treated as a precise stop — no inertial glide.
 * Kept relatively high so only intentional flicks coast.
 */
export const FLING_START_VELOCITY_PX_PER_MS = 0.16;

/**
 * If no significant pointer movement has occurred for this long before lift,
 * fling velocity is zeroed (precise scrub → stop → release).
 *
 * Measured from wall-clock time, not sample timestamps — pointermove stops
 * firing while the finger is still, so sample-only stillness checks miss pauses.
 */
export const RELEASE_STILLNESS_MS = 70;

/** Movement (px) that counts as "significant" for stillness / fling intent. */
export const RELEASE_STILLNESS_MOVEMENT_PX = 1.25;

/**
 * Faster than UIScrollView.normal so post-release coasts end quickly and the
 * user can press Play again sooner.
 */
export const SCRUB_COAST_DECELERATION_RATE = 0.993;

/**
 * Coast travel budget at the weakest fling (just above FLING_START).
 * Aggressive releases scale up toward MAX_COAST_DISTANCE_PX.
 */
export const MIN_COAST_DISTANCE_PX = 18;

/**
 * Max inertial travel after release. Kept short so after-release glides do not
 * delay returning to Play.
 */
export const MAX_COAST_DISTANCE_PX = 120;

/** Hard cap on coast+settle duration after release (ms). */
export const MAX_COAST_DURATION_MS = 280;

/** Clamp a scrub/coast velocity to the configured max speed. */
export function clampScrubVelocity(
  velocityPxPerMs: number,
  maxVelocityPxPerMs = MAX_SCRUB_VELOCITY_PX_PER_MS,
) {
  if (!Number.isFinite(velocityPxPerMs)) return 0;
  return clamp(velocityPxPerMs, -maxVelocityPxPerMs, maxVelocityPxPerMs);
}

/**
 * How far inertia may continue after release, based on release aggressiveness.
 * Returns 0 when the release is below the fling threshold (precise stop).
 */
export function coastDistanceBudgetForVelocity(
  velocityPxPerMs: number,
  {
    flingStartVelocityPxPerMs = FLING_START_VELOCITY_PX_PER_MS,
    maxVelocityPxPerMs = MAX_SCRUB_VELOCITY_PX_PER_MS,
    minCoastDistancePx = MIN_COAST_DISTANCE_PX,
    maxCoastDistancePx = MAX_COAST_DISTANCE_PX,
  }: {
    flingStartVelocityPxPerMs?: number;
    maxVelocityPxPerMs?: number;
    minCoastDistancePx?: number;
    maxCoastDistancePx?: number;
  } = {},
) {
  const speed = Math.abs(velocityPxPerMs);
  if (speed < flingStartVelocityPxPerMs) return 0;

  const span = Math.max(1e-6, maxVelocityPxPerMs - flingStartVelocityPxPerMs);
  const t = clamp((speed - flingStartVelocityPxPerMs) / span, 0, 1);
  // Ease-in so calm scrubs stay short; aggressive flings open the budget.
  const shaped = t * t;
  return (
    minCoastDistancePx + shaped * (maxCoastDistancePx - minCoastDistancePx)
  );
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
 * Project a scrub coast end, then clamp travel to an aggressiveness budget.
 * Direction follows velocity; zero velocity returns the current position.
 */
export function projectCoastPositionWithDistanceBudget(
  positionPx: number,
  velocityPxPerMs: number,
  distanceBudgetPx: number,
  decelerationRate = SCRUB_COAST_DECELERATION_RATE,
) {
  if (
    distanceBudgetPx <= 0 ||
    Math.abs(velocityPxPerMs) < IOS_REST_VELOCITY_PX_PER_MS
  ) {
    return positionPx;
  }

  const naturalProjected = projectIosCoastPosition(
    positionPx,
    velocityPxPerMs,
    decelerationRate,
  );
  const naturalTravel = naturalProjected - positionPx;
  if (naturalTravel === 0) return positionPx;

  const cappedTravel =
    Math.min(Math.abs(naturalTravel), distanceBudgetPx) *
    Math.sign(naturalTravel);
  return positionPx + cappedTravel;
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
 * Initial velocity (px/ms) that lands exactly on `destinationPx` under iOS
 * exponential deceleration: v0 = (x∞ - x0) * -ln(d).
 *
 * Used for destination-locked paging so coast→snap is one continuous curve
 * instead of a separate blend/settle phase.
 */
export function velocityToReachIosCoastDestination(
  positionPx: number,
  destinationPx: number,
  decelerationRate = IOS_DECELERATION_RATE,
) {
  const lnRate = Math.log(decelerationRate);
  if (lnRate >= 0) return 0;
  return (destinationPx - positionPx) * -lnRate;
}

/**
 * Integrate one frame of a critically damped spring toward a target.
 * Preserves velocity continuity when handing off from a decelerating coast.
 *
 * x'' + 2ωx' + ω²x = 0, with x = position - target.
 */
export function integrateCriticallyDampedSpringStep(
  positionPx: number,
  velocityPxPerMs: number,
  targetPx: number,
  deltaMs: number,
  omegaPerMs: number,
) {
  if (deltaMs <= 0 || omegaPerMs <= 0) {
    return { position: positionPx, velocity: velocityPxPerMs };
  }

  const x = positionPx - targetPx;
  const v = velocityPxPerMs;
  // Semi-implicit Euler is stable enough at rAF timesteps for this ω range.
  const accel = -omegaPerMs * omegaPerMs * x - 2 * omegaPerMs * v;
  const velocity = v + accel * deltaMs;
  const position = positionPx + velocity * deltaMs;

  return { position, velocity };
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
  return sign * (1 - 1 / ((x * coefficient) / dimensionPx + 1)) * dimensionPx;
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
