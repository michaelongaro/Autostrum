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
