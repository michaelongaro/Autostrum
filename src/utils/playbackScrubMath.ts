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
