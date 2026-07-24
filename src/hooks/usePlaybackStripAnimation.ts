import {
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";

interface PlaybackStripLayoutData {
  scrollPositions: number[];
  durations: number[];
  totalWidth: number;
}

interface UsePlaybackStripAnimationArgs {
  stripRef: RefObject<HTMLDivElement | null>;
  chordLayoutData: PlaybackStripLayoutData | null;
  currentChordIndex: number;
  currentRepetition: number;
  audioContext: AudioContext | null;
  playbackStartedAtAudioTime: number | null;
  playing: boolean;
  /** Latest absolute scroll position in px (strip-local, before centering). */
  scrollPositionRef?: RefObject<number>;
}

interface PlaybackStripAnimationData {
  chordCount: number;
  cumulativeChordTimesMs: number[];
  totalDurationMs: number;
  timedBoundaryTimesMs: number[];
  timedBoundaryPositions: number[];
}

/** Soft-pull displayed elapsed toward AudioContext over this window. */
const AUDIO_SLEW_TIME_MS = 500;

function getPlaybackStripAnimationData(
  chordLayoutData: PlaybackStripLayoutData | null,
): PlaybackStripAnimationData | null {
  if (!chordLayoutData) return null;

  const chordCount = chordLayoutData.scrollPositions.length;

  if (chordCount === 0) return null;

  const cumulativeChordTimesMs = new Array(chordCount + 1).fill(0) as number[];

  for (let index = 0; index < chordCount; index++) {
    cumulativeChordTimesMs[index + 1] =
      cumulativeChordTimesMs[index]! +
      Math.max(0, (chordLayoutData.durations[index] ?? 0) * 1000);
  }

  const totalDurationMs = cumulativeChordTimesMs[chordCount] ?? 0;
  const boundaryPositions = [
    ...chordLayoutData.scrollPositions.slice(0, chordCount),
    chordLayoutData.totalWidth,
  ];

  // Build timed boundaries. Critical for loop continuity:
  // time 0 must map to position 0, and time totalDurationMs to totalWidth.
  // Never collapse away index 0 — leading zero-duration ornamentals are
  // absorbed into the first timed segment so the loop wraps without a jump.
  const timedBoundaryIndices = [0];

  for (let index = 1; index <= chordCount; index++) {
    const currentTimeMs = cumulativeChordTimesMs[index] ?? 0;
    const lastTimedBoundaryIndex =
      timedBoundaryIndices[timedBoundaryIndices.length - 1] ?? 0;
    const lastTimeMs = cumulativeChordTimesMs[lastTimedBoundaryIndex] ?? 0;

    if (currentTimeMs === lastTimeMs) {
      // Keep the true start at index 0 so loop-local t=0 => position 0.
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

  // Guarantee endpoints for seamless looping even if data is degenerate.
  if (timedBoundaryPositions.length > 0) {
    timedBoundaryPositions[0] = 0;
    timedBoundaryTimesMs[0] = 0;
    timedBoundaryPositions[timedBoundaryPositions.length - 1] =
      chordLayoutData.totalWidth;
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

function normalizeModulo(value: number, modulus: number) {
  return ((value % modulus) + modulus) % modulus;
}

/**
 * Continuous scroll position for elapsed time within one loop.
 * Piecewise-linear between timed chord boundaries. Endpoints are always
 * 0 → totalWidth so absolute position is continuous across loop wraps.
 */
function getScrollPositionForLoopTimeMs(
  animationData: PlaybackStripAnimationData,
  loopTimeMs: number,
): number {
  const { timedBoundaryTimesMs, timedBoundaryPositions, totalDurationMs } =
    animationData;

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

function usePlaybackStripAnimation({
  stripRef,
  chordLayoutData,
  currentChordIndex,
  currentRepetition,
  audioContext,
  playbackStartedAtAudioTime,
  playing,
  scrollPositionRef,
}: UsePlaybackStripAnimationArgs) {
  const playingRef = useRef(playing);
  const anchorChordIndexRef = useRef(currentChordIndex);
  const anchorRepetitionRef = useRef(currentRepetition);
  const rafIdRef = useRef<number | null>(null);

  // React Compiler escape hatch: layout-effect dep that starts/stops the rAF
  // scroll loop; identity must stay tied to chordLayoutData.
  const animationData = useMemo(
    () => getPlaybackStripAnimationData(chordLayoutData),
    [chordLayoutData],
  );

  useLayoutEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useLayoutEffect(() => {
    anchorChordIndexRef.current = currentChordIndex;
    anchorRepetitionRef.current = currentRepetition;
  }, [currentChordIndex, currentRepetition]);

  useLayoutEffect(() => {
    const animatedElement = stripRef.current;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (
      !playing ||
      !animatedElement ||
      !chordLayoutData ||
      !animationData ||
      animationData.totalDurationMs <= 0 ||
      !audioContext ||
      playbackStartedAtAudioTime === null
    ) {
      return;
    }

    const rawAnchorChordIndex = anchorChordIndexRef.current;
    const normalizedAnchorChordIndex =
      ((rawAnchorChordIndex % animationData.chordCount) +
        animationData.chordCount) %
      animationData.chordCount;
    const extraAnchorLoops = Math.floor(
      rawAnchorChordIndex / animationData.chordCount,
    );
    const anchorStartTimeMs =
      animationData.cumulativeChordTimesMs[normalizedAnchorChordIndex] ?? 0;
    const playbackStartAudioTime = playbackStartedAtAudioTime;
    const loopDurationMs = animationData.totalDurationMs;
    const baseRepetition = anchorRepetitionRef.current + extraAnchorLoops;

    const startPositionPx =
      (chordLayoutData.scrollPositions[normalizedAnchorChordIndex] ?? 0) +
      baseRepetition * chordLayoutData.totalWidth;

    // Kill any in-flight CSS scrub transitions before reseeding translateX.
    // Rapid Range / finger scrub leaves interrupted transitions that can keep
    // owning transform after React flips transition to none on play.
    animatedElement.style.transition = "none";
    if (typeof animatedElement.getAnimations === "function") {
      for (const animation of animatedElement.getAnimations()) {
        animation.cancel();
      }
    }

    animatedElement.style.transform = `translateX(${startPositionPx * -1}px)`;
    if (scrollPositionRef) {
      scrollPositionRef.current = startPositionPx;
    }

    // Continuous displayed clock: advance by performance.now() delta each
    // frame, soft-slew toward AudioContext. Never hard-assign from audio so
    // iOS quantization / resample cannot snap translateX.
    let audioHasStarted = audioContext.currentTime >= playbackStartAudioTime;
    let displayedElapsedMs = audioHasStarted
      ? Math.max(0, (audioContext.currentTime - playbackStartAudioTime) * 1000)
      : 0;
    let lastPerfMs = performance.now();

    const applyTransformForElapsedMs = (audioElapsedMs: number) => {
      const totalElapsedMs = anchorStartTimeMs + audioElapsedMs;
      const completedLoops = Math.floor(totalElapsedMs / loopDurationMs);
      const loopTimeMs = normalizeModulo(totalElapsedMs, loopDurationMs);
      const loopPositionPx = getScrollPositionForLoopTimeMs(
        animationData,
        loopTimeMs,
      );
      const absolutePositionPx =
        loopPositionPx +
        (baseRepetition + completedLoops) * chordLayoutData.totalWidth;

      animatedElement.style.transform = `translateX(${absolutePositionPx * -1}px)`;
      if (scrollPositionRef) {
        scrollPositionRef.current = absolutePositionPx;
      }
    };

    const tick = () => {
      if (!playingRef.current) {
        rafIdRef.current = null;
        return;
      }

      const nowPerfMs = performance.now();
      const deltaMs = Math.max(0, nowPerfMs - lastPerfMs);
      lastPerfMs = nowPerfMs;

      const rawAudioElapsedMs =
        (audioContext.currentTime - playbackStartAudioTime) * 1000;

      if (!audioHasStarted) {
        if (rawAudioElapsedMs < 0) {
          applyTransformForElapsedMs(0);
          rafIdRef.current = requestAnimationFrame(tick);
          return;
        }

        audioHasStarted = true;
        displayedElapsedMs = 0;
      }

      // Advance continuously with wall clock, then soft-pull toward audio.
      displayedElapsedMs += deltaMs;

      const errorMs = displayedElapsedMs - Math.max(0, rawAudioElapsedMs);
      if (deltaMs > 0 && Math.abs(errorMs) > 0.05) {
        const slewFraction = Math.min(1, deltaMs / AUDIO_SLEW_TIME_MS);
        displayedElapsedMs -= errorMs * slewFraction;
      }

      if (displayedElapsedMs < 0) {
        displayedElapsedMs = 0;
      }

      applyTransformForElapsedMs(displayedElapsedMs);
      rafIdRef.current = requestAnimationFrame(tick);
    };

    applyTransformForElapsedMs(displayedElapsedMs);
    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [
    animationData,
    audioContext,
    chordLayoutData,
    playbackStartedAtAudioTime,
    playing,
    scrollPositionRef,
    stripRef,
  ]);
}

export default usePlaybackStripAnimation;
