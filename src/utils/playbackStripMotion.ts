/**
 * Pure timing model for the playback-modal strip.
 *
 * The Web Animations API plays these keyframes on the compositor. Nothing in
 * this module reads a clock or writes the DOM, so segment shape can be tested
 * without a browser. Callers must not "correct" a running animation by seeking
 * `currentTime` or changing `playbackRate` — those writes are what made the
 * earlier WAAPI attempt stutter, especially on iOS.
 */

export interface PlaybackStripLayoutInput {
  scrollPositions: number[];
  durations: number[];
  totalWidth: number;
}

export interface PlaybackStripMotionModel {
  chordCount: number;
  cumulativeChordTimesMs: number[];
  totalDurationMs: number;
  timedBoundaryTimesMs: number[];
  timedBoundaryPositions: number[];
}

export interface StripSegmentWarp {
  /** Content elapsed shown at local time 0. Matches the pixels already on screen. */
  visualElapsedMs: number;
  /** Audio elapsed the segment converges to by the end of `windowMs`. */
  audioElapsedMs: number;
  windowMs: number;
}

export interface StripSegmentKeyframe {
  offset: number;
  easing: "linear";
  transform: string;
}

export interface StripSegment {
  keyframes: StripSegmentKeyframe[];
  durationMs: number;
  /** Content elapsed at the end of `holdMs` (local time 0 when there is no hold). */
  fromElapsedMs: number;
  /** Content elapsed at local time `durationMs`. */
  endElapsedMs: number;
  /**
   * Local time spent on the first position before content time advances.
   * Covers the audio lead-in so motion begins on the compositor clock.
   */
  holdMs: number;
  warp: StripSegmentWarp | null;
}

/** How much strip to prebuild so a main-thread stall cannot reach the segment end. */
export const STRIP_SEGMENT_TARGET_MS = 12000;

export const STRIP_MAX_KEYFRAMES = 480;

/** Ignore clock disagreement smaller than a couple of audio quanta plus scheduler jitter. */
export const STRIP_DRIFT_DEADBAND_MS = 20;

/** Above this, slewing would be a visible tempo change, so snap to the audio clock. */
export const STRIP_DRIFT_HARD_SEEK_MS = 300;

/** Collinear keyframes within this many pixels are dropped. */
const COLLINEAR_TOLERANCE_PX = 0.05;

const BOUNDARY_EPSILON_MS = 0.01;

export function getPlaybackStripTransform(positionPx: number) {
  return `translate3d(${positionPx * -1}px, 0, 0)`;
}

export function parseTranslateX(transform: string): number | null {
  if (!transform || transform === "none") return null;

  const translate3d = /translate3d\(\s*(-?[\d.eE+-]+)px/i.exec(transform);
  if (translate3d) {
    const value = Number(translate3d[1]);
    return Number.isFinite(value) ? value : null;
  }

  const translateX = /translateX\(\s*(-?[\d.eE+-]+)px/i.exec(transform);
  if (translateX) {
    const value = Number(translateX[1]);
    return Number.isFinite(value) ? value : null;
  }

  const matrix3d = /^matrix3d\((.+)\)$/.exec(transform.trim());
  if (matrix3d?.[1]) {
    const parts = matrix3d[1].split(",").map((part) => Number(part.trim()));
    const translate = parts[12];
    return translate !== undefined && Number.isFinite(translate)
      ? translate
      : null;
  }

  const matrix = /^matrix\((.+)\)$/.exec(transform.trim());
  if (matrix?.[1]) {
    const parts = matrix[1].split(",").map((part) => Number(part.trim()));
    const translate = parts[4];
    return translate !== undefined && Number.isFinite(translate)
      ? translate
      : null;
  }

  return null;
}

export function parseStripPositionPx(transform: string): number | null {
  const translateX = parseTranslateX(transform);
  if (translateX === null) return null;
  return translateX * -1;
}

export function getPlaybackStripMotionModel(
  layout: PlaybackStripLayoutInput | null,
): PlaybackStripMotionModel | null {
  if (!layout) return null;

  const chordCount = layout.scrollPositions.length;
  if (chordCount === 0) return null;

  const cumulativeChordTimesMs = new Array(chordCount + 1).fill(0) as number[];

  for (let index = 0; index < chordCount; index++) {
    cumulativeChordTimesMs[index + 1] =
      cumulativeChordTimesMs[index]! +
      Math.max(0, (layout.durations[index] ?? 0) * 1000);
  }

  const totalDurationMs = cumulativeChordTimesMs[chordCount] ?? 0;
  const boundaryPositions = [
    ...layout.scrollPositions.slice(0, chordCount),
    layout.totalWidth,
  ];

  // Time 0 must map to position 0 and time totalDurationMs to totalWidth.
  // Never collapse index 0 — leading zero-duration ornaments are absorbed into
  // the first timed segment so a loop wrap has no jump.
  const timedBoundaryIndices = [0];

  for (let index = 1; index <= chordCount; index++) {
    const currentTimeMs = cumulativeChordTimesMs[index] ?? 0;
    const lastTimedBoundaryIndex =
      timedBoundaryIndices[timedBoundaryIndices.length - 1] ?? 0;
    const lastTimeMs = cumulativeChordTimesMs[lastTimedBoundaryIndex] ?? 0;

    if (currentTimeMs === lastTimeMs) {
      if (lastTimedBoundaryIndex === 0 && timedBoundaryIndices.length === 1) {
        continue;
      }

      timedBoundaryIndices[timedBoundaryIndices.length - 1] = index;
      continue;
    }

    timedBoundaryIndices.push(index);
  }

  const timedBoundaryTimesMs = timedBoundaryIndices.map(
    (index) => cumulativeChordTimesMs[index] ?? 0,
  );
  const timedBoundaryPositions = timedBoundaryIndices.map(
    (index) => boundaryPositions[index] ?? 0,
  );

  if (timedBoundaryPositions.length > 0) {
    timedBoundaryPositions[0] = 0;
    timedBoundaryTimesMs[0] = 0;
    timedBoundaryPositions[timedBoundaryPositions.length - 1] =
      layout.totalWidth;
    timedBoundaryTimesMs[timedBoundaryTimesMs.length - 1] = totalDurationMs;
  }

  return {
    chordCount,
    cumulativeChordTimesMs,
    totalDurationMs,
    timedBoundaryTimesMs,
    timedBoundaryPositions,
  };
}

export function normalizeModulo(value: number, modulus: number) {
  if (modulus === 0) return 0;
  return ((value % modulus) + modulus) % modulus;
}

/**
 * Continuous scroll position for elapsed time within one loop.
 * Piecewise-linear between timed chord boundaries.
 */
export function getScrollPositionForLoopTimeMs(
  model: PlaybackStripMotionModel,
  loopTimeMs: number,
): number {
  const { timedBoundaryTimesMs, timedBoundaryPositions, totalDurationMs } =
    model;

  if (totalDurationMs <= 0 || timedBoundaryPositions.length === 0) {
    return 0;
  }

  const clampedTimeMs = Math.max(0, Math.min(loopTimeMs, totalDurationMs));

  if (clampedTimeMs <= (timedBoundaryTimesMs[0] ?? 0)) {
    return timedBoundaryPositions[0] ?? 0;
  }

  const lastIndex = timedBoundaryTimesMs.length - 1;

  if (clampedTimeMs >= (timedBoundaryTimesMs[lastIndex] ?? 0)) {
    return timedBoundaryPositions[lastIndex] ?? 0;
  }

  let low = 0;
  let high = lastIndex;

  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if ((timedBoundaryTimesMs[mid] ?? 0) <= clampedTimeMs) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const startTimeMs = timedBoundaryTimesMs[low] ?? 0;
  const endTimeMs = timedBoundaryTimesMs[high] ?? startTimeMs;
  const startPosition = timedBoundaryPositions[low] ?? 0;
  const endPosition = timedBoundaryPositions[high] ?? startPosition;
  const segmentDurationMs = endTimeMs - startTimeMs;

  if (segmentDurationMs <= 0) {
    return endPosition;
  }

  const progress = (clampedTimeMs - startTimeMs) / segmentDurationMs;
  return startPosition + (endPosition - startPosition) * progress;
}

export function getAbsoluteScrollPositionPx({
  model,
  totalWidth,
  anchorStartTimeMs,
  baseRepetition,
  elapsedMs,
}: {
  model: PlaybackStripMotionModel;
  totalWidth: number;
  anchorStartTimeMs: number;
  baseRepetition: number;
  elapsedMs: number;
}): number {
  const loopDurationMs = model.totalDurationMs;
  if (loopDurationMs <= 0) return 0;

  const safeElapsedMs = Math.max(0, elapsedMs);
  const totalElapsedMs = anchorStartTimeMs + safeElapsedMs;
  // A time a few ulps under a loop multiple can modulo to 0 while floor()
  // still reports the previous loop, which snaps the strip back to position 0.
  const ratio = totalElapsedMs / loopDurationMs;
  const nearestLoop = Math.round(ratio);
  const onLoopBoundary =
    nearestLoop > 0 &&
    Math.abs(totalElapsedMs - nearestLoop * loopDurationMs) < 1e-3;
  const completedLoops = onLoopBoundary ? nearestLoop : Math.floor(ratio);
  let loopTimeMs = onLoopBoundary
    ? 0
    : totalElapsedMs - completedLoops * loopDurationMs;
  if (loopTimeMs < 0) loopTimeMs = 0;
  if (loopTimeMs > loopDurationMs) loopTimeMs = loopDurationMs;
  const loopPositionPx = getScrollPositionForLoopTimeMs(model, loopTimeMs);

  return loopPositionPx + (baseRepetition + completedLoops) * totalWidth;
}

export function elapsedForAbsolutePositionPx({
  model,
  totalWidth,
  anchorStartTimeMs,
  baseRepetition,
  positionPx,
  estimateElapsedMs,
}: {
  model: PlaybackStripMotionModel;
  totalWidth: number;
  anchorStartTimeMs: number;
  baseRepetition: number;
  positionPx: number;
  estimateElapsedMs: number;
}): number {
  const positionAt = (elapsedMs: number) =>
    getAbsoluteScrollPositionPx({
      model,
      totalWidth,
      anchorStartTimeMs,
      baseRepetition,
      elapsedMs,
    });

  if (positionPx <= positionAt(0)) return 0;

  let low = 0;
  let high = Math.max(1000, estimateElapsedMs + 1000, 1);
  let guard = 0;

  while (positionAt(high) < positionPx && guard < 48) {
    high *= 2;
    guard += 1;
  }

  for (let iteration = 0; iteration < 48; iteration++) {
    const mid = (low + high) / 2;
    if (positionAt(mid) < positionPx) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

export function correctionWindowMs(errorMs: number) {
  return Math.min(2000, Math.max(700, Math.abs(errorMs) * 10));
}

export function warpContentForLocalMs(
  warp: StripSegmentWarp,
  localMs: number,
): number {
  const windowMs = Math.max(1, warp.windowMs);
  if (localMs <= 0) return warp.visualElapsedMs;
  if (localMs <= windowMs) {
    const rate =
      (warp.audioElapsedMs + windowMs - warp.visualElapsedMs) / windowMs;
    return warp.visualElapsedMs + rate * localMs;
  }
  return warp.audioElapsedMs + localMs;
}

export function warpLocalForContentMs(
  warp: StripSegmentWarp,
  contentElapsedMs: number,
): number {
  const windowMs = Math.max(1, warp.windowMs);
  const windowEndContentMs = warp.audioElapsedMs + windowMs;
  if (contentElapsedMs <= warp.visualElapsedMs) return 0;
  if (contentElapsedMs <= windowEndContentMs) {
    const contentSpan = windowEndContentMs - warp.visualElapsedMs;
    if (contentSpan === 0) return windowMs;
    return (
      ((contentElapsedMs - warp.visualElapsedMs) / contentSpan) * windowMs
    );
  }
  return windowMs + (contentElapsedMs - windowEndContentMs);
}

function nextBoundaryElapsedMs({
  model,
  anchorStartTimeMs,
  elapsedMs,
}: {
  model: PlaybackStripMotionModel;
  anchorStartTimeMs: number;
  elapsedMs: number;
}): number | null {
  const loopDurationMs = model.totalDurationMs;
  if (loopDurationMs <= 0) return null;

  const loopTimeMs = normalizeModulo(
    anchorStartTimeMs + elapsedMs,
    loopDurationMs,
  );

  let nextLoopTimeMs: number | null = null;
  for (const boundaryMs of model.timedBoundaryTimesMs) {
    if (boundaryMs > loopTimeMs + BOUNDARY_EPSILON_MS) {
      nextLoopTimeMs = boundaryMs;
      break;
    }
  }

  if (nextLoopTimeMs !== null) {
    return elapsedMs + (nextLoopTimeMs - loopTimeMs);
  }

  const deltaToLoopEndMs = loopDurationMs - loopTimeMs;
  if (deltaToLoopEndMs > BOUNDARY_EPSILON_MS) {
    return elapsedMs + deltaToLoopEndMs;
  }

  let firstNextLoopBoundaryMs = loopDurationMs;
  for (const boundaryMs of model.timedBoundaryTimesMs) {
    if (boundaryMs > BOUNDARY_EPSILON_MS) {
      firstNextLoopBoundaryMs = boundaryMs;
      break;
    }
  }

  return elapsedMs + Math.max(deltaToLoopEndMs, 0) + firstNextLoopBoundaryMs;
}

function collectContentSamples({
  model,
  anchorStartTimeMs,
  fromElapsedMs,
  toElapsedMs,
  maxSamples,
}: {
  model: PlaybackStripMotionModel;
  anchorStartTimeMs: number;
  fromElapsedMs: number;
  toElapsedMs: number;
  maxSamples: number;
}): number[] {
  const samples = [fromElapsedMs];
  let elapsedMs = fromElapsedMs;
  let guard = 0;

  while (
    elapsedMs < toElapsedMs - BOUNDARY_EPSILON_MS &&
    samples.length < maxSamples &&
    guard < 100000
  ) {
    const nextElapsedMs = nextBoundaryElapsedMs({
      model,
      anchorStartTimeMs,
      elapsedMs,
    });
    guard += 1;

    if (nextElapsedMs === null || nextElapsedMs <= elapsedMs + BOUNDARY_EPSILON_MS) {
      break;
    }

    const sampleMs = Math.min(nextElapsedMs, toElapsedMs);
    samples.push(sampleMs);
    elapsedMs = sampleMs;

    if (sampleMs >= toElapsedMs - BOUNDARY_EPSILON_MS) break;
  }

  const lastSampleMs = samples[samples.length - 1] ?? fromElapsedMs;
  if (
    lastSampleMs < toElapsedMs - BOUNDARY_EPSILON_MS &&
    samples.length < maxSamples
  ) {
    samples.push(toElapsedMs);
  }

  return samples;
}

function mergeCollinearSamples(
  samples: { localMs: number; contentElapsedMs: number; positionPx: number }[],
) {
  if (samples.length <= 2) return samples;

  const kept = [samples[0]!];

  for (let index = 1; index < samples.length - 1; index++) {
    const previous = kept[kept.length - 1]!;
    const current = samples[index]!;
    const next = samples[index + 1]!;
    const spanMs = next.localMs - previous.localMs;

    if (spanMs <= BOUNDARY_EPSILON_MS) {
      kept.push(current);
      continue;
    }

    const predictedPositionPx =
      previous.positionPx +
      ((next.positionPx - previous.positionPx) *
        (current.localMs - previous.localMs)) /
        spanMs;

    if (Math.abs(predictedPositionPx - current.positionPx) > COLLINEAR_TOLERANCE_PX) {
      kept.push(current);
    }
  }

  kept.push(samples[samples.length - 1]!);
  return kept;
}

export function buildStripSegment({
  model,
  totalWidth,
  anchorStartTimeMs,
  baseRepetition,
  fromElapsedMs,
  targetDurationMs,
  maxKeyframes = STRIP_MAX_KEYFRAMES,
  warp = null,
  firstPositionPx,
}: {
  model: PlaybackStripMotionModel;
  totalWidth: number;
  anchorStartTimeMs: number;
  baseRepetition: number;
  fromElapsedMs: number;
  targetDurationMs: number;
  maxKeyframes?: number;
  warp?: StripSegmentWarp | null;
  firstPositionPx?: number;
}): StripSegment | null {
  if (model.totalDurationMs <= 0 || targetDurationMs <= 0 || totalWidth < 0) {
    return null;
  }

  const activeWarp =
    warp && warp.windowMs > 0
      ? {
          visualElapsedMs: warp.visualElapsedMs,
          audioElapsedMs: warp.audioElapsedMs,
          windowMs: Math.max(1, warp.windowMs),
        }
      : null;

  const contentStartMs = activeWarp
    ? activeWarp.visualElapsedMs
    : Math.max(0, fromElapsedMs);
  const contentEndMs = activeWarp
    ? warpContentForLocalMs(activeWarp, targetDurationMs)
    : contentStartMs + targetDurationMs;

  const contentSamples = collectContentSamples({
    model,
    anchorStartTimeMs,
    fromElapsedMs: contentStartMs,
    toElapsedMs: Math.max(contentStartMs, contentEndMs),
    maxSamples: maxKeyframes,
  });

  const positionFor = (elapsedMs: number) =>
    getAbsoluteScrollPositionPx({
      model,
      totalWidth,
      anchorStartTimeMs,
      baseRepetition,
      elapsedMs,
    });

  let mapped = contentSamples.map((contentElapsedMs) => {
    const localMs = activeWarp
      ? warpLocalForContentMs(activeWarp, contentElapsedMs)
      : contentElapsedMs - contentStartMs;
    return {
      localMs,
      contentElapsedMs,
      positionPx: positionFor(contentElapsedMs),
    };
  });

  mapped = mapped.filter((sample, index) => {
    if (index === 0) return true;
    return sample.localMs > mapped[index - 1]!.localMs + BOUNDARY_EPSILON_MS;
  });

  if (mapped.length === 0) return null;

  mapped[0] = {
    localMs: 0,
    contentElapsedMs: contentStartMs,
    positionPx:
      firstPositionPx !== undefined ? firstPositionPx : mapped[0].positionPx,
  };

  const lastMapped = mapped[mapped.length - 1]!;
  const durationMs = lastMapped.localMs;
  if (durationMs <= 0) return null;

  mapped = mergeCollinearSamples(mapped);

  const keyframes: StripSegmentKeyframe[] = mapped.map((sample, index) => {
    const offset =
      index === 0
        ? 0
        : index === mapped.length - 1
          ? 1
          : sample.localMs / durationMs;
    return {
      offset,
      easing: "linear",
      transform: getPlaybackStripTransform(sample.positionPx),
    };
  });

  const lastKeyframeIndex = keyframes.length - 1;
  for (let index = 1; index < lastKeyframeIndex; index++) {
    const previousOffset = keyframes[index - 1]!.offset;
    if (keyframes[index]!.offset <= previousOffset) {
      keyframes[index]!.offset = Math.min(0.999999, previousOffset + 1e-6);
    }
  }
  if (lastKeyframeIndex > 0) {
    const beforeLastOffset = keyframes[lastKeyframeIndex - 1]!.offset;
    if (beforeLastOffset >= 1) {
      keyframes[lastKeyframeIndex - 1]!.offset = 1 - 1e-6;
    }
  }
  keyframes[lastKeyframeIndex]!.offset = 1;

  return {
    keyframes,
    durationMs,
    fromElapsedMs: contentStartMs,
    endElapsedMs: lastMapped.contentElapsedMs,
    holdMs: 0,
    warp: activeWarp,
  };
}

/**
 * Repeat the first frame for `holdMs` so the strip can be scheduled before
 * audio begins and start moving on the compositor, without a JS catch-up jump.
 */
export function withStartHold(
  segment: StripSegment,
  holdMs: number,
): StripSegment {
  if (holdMs <= 0) return { ...segment, holdMs: 0 };

  const durationMs = segment.durationMs + holdMs;
  const keyframes = segment.keyframes.map((frame, index) => ({
    offset:
      index === segment.keyframes.length - 1
        ? 1
        : (holdMs + frame.offset * segment.durationMs) / durationMs,
    easing: "linear" as const,
    transform: frame.transform,
  }));
  const first = segment.keyframes[0];
  if (first) {
    keyframes.unshift({
      offset: 0,
      easing: "linear",
      transform: first.transform,
    });
  }

  for (let index = 1; index < keyframes.length - 1; index++) {
    const previousOffset = keyframes[index - 1]!.offset;
    if (keyframes[index]!.offset <= previousOffset) {
      keyframes[index]!.offset = Math.min(0.999999, previousOffset + 1e-6);
    }
  }

  return {
    ...segment,
    keyframes,
    durationMs,
    holdMs,
  };
}

export function contentElapsedAtLocalMs(
  segment: Pick<StripSegment, "fromElapsedMs" | "warp" | "holdMs">,
  localMs: number,
): number {
  const motionLocalMs = Math.max(0, localMs - (segment.holdMs ?? 0));
  if (segment.warp) return warpContentForLocalMs(segment.warp, motionLocalMs);
  return segment.fromElapsedMs + motionLocalMs;
}

/**
 * Anchor normalization shared with the audio-backed strip. `currentChordIndex`
 * can briefly point past the expanded strip; extra loops stay in the absolute
 * scroll coordinate system that chord virtualization uses.
 */
export function getStripAnchor({
  chordCount,
  anchorChordIndex,
  anchorRepetition,
  cumulativeChordTimesMs,
}: {
  chordCount: number;
  anchorChordIndex: number;
  anchorRepetition: number;
  cumulativeChordTimesMs: number[];
}): {
  normalizedChordIndex: number;
  anchorStartTimeMs: number;
  baseRepetition: number;
} | null {
  if (chordCount <= 0) return null;

  const normalizedChordIndex = normalizeModulo(anchorChordIndex, chordCount);
  const extraAnchorLoops = Math.floor(anchorChordIndex / chordCount);
  const anchorStartTimeMs = cumulativeChordTimesMs[normalizedChordIndex] ?? 0;
  const baseRepetition = anchorRepetition + extraAnchorLoops;

  return {
    normalizedChordIndex,
    anchorStartTimeMs,
    baseRepetition,
  };
}
