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

/** Check drift often enough to react without querying WAAPI every frame. */
const AUDIO_SYNC_INTERVAL_MS = 50;

/** Ignore sub-frame clock differences so playbackRate does not hunt. */
const DRIFT_DEADBAND_MS = 40;

/** Recover ordinary drift gradually over roughly this interval. */
const AUDIO_SLEW_TIME_MS = 500;

/** Keep drift correction subtle enough that the motion still looks natural. */
const MAX_PLAYBACK_RATE_CORRECTION = 0.12;

/** Large drift is better recovered with one seek than prolonged wrong chords. */
const HARD_RESYNC_THRESHOLD_MS = 250;

/** Reject an output timestamp that is clearly stale or from another clock. */
const MAX_OUTPUT_TIMESTAMP_ERROR_SECONDS = 1;

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

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * AudioContext.currentTime can advance in coarse steps on iOS. When available,
 * getOutputTimestamp supplies a context/performance clock pair that can be
 * extrapolated to this frame without quantizing the visual sync target.
 */
function getAudioTimeAtPerformanceTime(
  audioContext: AudioContext,
  performanceTimeMs: number,
): number {
  if (
    audioContext.state === "running" &&
    typeof audioContext.getOutputTimestamp === "function"
  ) {
    try {
      const timestamp = audioContext.getOutputTimestamp();
      const { contextTime, performanceTime } = timestamp;

      if (
        Number.isFinite(contextTime) &&
        Number.isFinite(performanceTime) &&
        performanceTime > 0
      ) {
        const mappedAudioTime =
          contextTime + (performanceTimeMs - performanceTime) / 1000;

        // Some Safari versions initially return an all-zero or stale pair.
        // The mapped output clock may legitimately trail currentTime by output
        // latency, so only reject discrepancies large enough to be invalid.
        if (
          mappedAudioTime >= 0 &&
          Math.abs(mappedAudioTime - audioContext.currentTime) <=
            MAX_OUTPUT_TIMESTAMP_ERROR_SECONDS
        ) {
          return mappedAudioTime;
        }
      }
    } catch {
      // Fall through for partial/buggy getOutputTimestamp implementations.
    }
  }

  return audioContext.currentTime;
}

function buildPlaybackStripKeyframes({
  animationData,
  repetitionBasePx,
}: {
  animationData: PlaybackStripAnimationData;
  repetitionBasePx: number;
}): Keyframe[] {
  return animationData.timedBoundaryTimesMs.map((timeMs, index) => ({
    offset: timeMs / animationData.totalDurationMs,
    transform: `translateX(${
      ((animationData.timedBoundaryPositions[index] ?? 0) + repetitionBasePx) *
      -1
    }px)`,
    easing: "linear",
  }));
}

/**
 * updatePlaybackRate preserves the animation's current position while changing
 * velocity. Assigning playbackRate directly caused jumps on iOS compositor
 * animations, so only use it as a compatibility fallback.
 */
function setPlaybackRate(animation: Animation, playbackRate: number) {
  if (Math.abs(animation.playbackRate - playbackRate) < 0.002) {
    return;
  }

  if (typeof animation.updatePlaybackRate === "function") {
    animation.updatePlaybackRate(playbackRate);
  } else {
    animation.playbackRate = playbackRate;
  }
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
  const animationRef = useRef<Animation | null>(null);
  const animationGenerationRef = useRef(0);

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

    const previousAnimation = animationRef.current;
    if (previousAnimation) {
      previousAnimation.onfinish = null;
      previousAnimation.cancel();
      animationRef.current = null;
    }
    animationGenerationRef.current += 1;

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
    const generation = animationGenerationRef.current;

    const startPositionPx =
      (chordLayoutData.scrollPositions[normalizedAnchorChordIndex] ?? 0) +
      baseRepetition * chordLayoutData.totalWidth;
    animatedElement.style.transition = "none";
    animatedElement.style.transform = `translateX(${startPositionPx * -1}px)`;
    if (scrollPositionRef) {
      scrollPositionRef.current = startPositionPx;
    }

    let completedLoops = 0;
    let motionStarted = false;
    let lastSyncPerformanceTimeMs = Number.NEGATIVE_INFINITY;

    const updateScrollPosition = (
      loopIndex: number,
      loopTimeMs: number,
    ) => {
      const loopPositionPx = getScrollPositionForLoopTimeMs(
        animationData,
        loopTimeMs,
      );
      const absolutePositionPx =
        loopPositionPx +
        (baseRepetition + loopIndex) * chordLayoutData.totalWidth;

      if (scrollPositionRef) {
        scrollPositionRef.current = absolutePositionPx;
      }
    };

    const startAnimationForLoop = ({
      loopIndex,
      loopTimeMs,
      autoplay,
    }: {
      loopIndex: number;
      loopTimeMs: number;
      autoplay: boolean;
    }): Animation => {
      const animation = animatedElement.animate(
        buildPlaybackStripKeyframes({
          animationData,
          repetitionBasePx:
            (baseRepetition + loopIndex) * chordLayoutData.totalWidth,
        }),
        {
          duration: loopDurationMs,
          easing: "linear",
          fill: "both",
        },
      );

      animation.pause();
      animation.currentTime = clamp(loopTimeMs, 0, loopDurationMs);
      setPlaybackRate(animation, 1);

      const replacedAnimation = animationRef.current;
      animationRef.current = animation;
      completedLoops = loopIndex;

      animation.onfinish = () => {
        if (
          generation !== animationGenerationRef.current ||
          !playingRef.current ||
          animationRef.current !== animation
        ) {
          animation.onfinish = null;
          animation.cancel();
          return;
        }

        // Both frames resolve to the same absolute transform: the old loop's
        // totalWidth endpoint and the new loop's zero endpoint plus one width.
        startAnimationForLoop({
          loopIndex: completedLoops + 1,
          loopTimeMs: 0,
          autoplay: true,
        });
      };

      if (autoplay) {
        animation.play();
      }

      if (replacedAnimation && replacedAnimation !== animation) {
        replacedAnimation.onfinish = null;
        replacedAnimation.cancel();
      }

      updateScrollPosition(loopIndex, loopTimeMs);
      return animation;
    };

    const seekToTotalElapsedTime = (
      targetTotalElapsedMs: number,
      autoplay: boolean,
    ) => {
      const targetLoop = Math.floor(targetTotalElapsedMs / loopDurationMs);
      const targetLoopTimeMs = normalizeModulo(
        targetTotalElapsedMs,
        loopDurationMs,
      );

      startAnimationForLoop({
        loopIndex: targetLoop,
        loopTimeMs: targetLoopTimeMs,
        autoplay,
      });
    };

    const getTargetTotalElapsedMs = (performanceTimeMs: number) => {
      const audioTime = getAudioTimeAtPerformanceTime(
        audioContext,
        performanceTimeMs,
      );
      const audioElapsedMs =
        (audioTime - playbackStartAudioTime) * 1000;

      return {
        audioHasStarted: audioElapsedMs >= 0,
        targetTotalElapsedMs:
          anchorStartTimeMs + Math.max(0, audioElapsedMs),
      };
    };

    const synchronizeAnimation = (performanceTimeMs: number) => {
      const target = getTargetTotalElapsedMs(performanceTimeMs);

      if (!target.audioHasStarted) {
        if (!animationRef.current) {
          seekToTotalElapsedTime(anchorStartTimeMs, false);
        }
        return;
      }

      if (!motionStarted) {
        seekToTotalElapsedTime(target.targetTotalElapsedMs, true);
        motionStarted = true;
        return;
      }

      const animation = animationRef.current;
      const currentTime = animation?.currentTime;
      if (!animation || typeof currentTime !== "number") {
        seekToTotalElapsedTime(target.targetTotalElapsedMs, true);
        return;
      }

      const visualTotalElapsedMs =
        completedLoops * loopDurationMs + currentTime;
      const driftMs =
        target.targetTotalElapsedMs - visualTotalElapsedMs;
      const hardResyncThresholdMs = Math.min(
        HARD_RESYNC_THRESHOLD_MS,
        Math.max(DRIFT_DEADBAND_MS, loopDurationMs / 2),
      );

      if (Math.abs(driftMs) >= hardResyncThresholdMs) {
        // rAF may be suspended in the background while audio continues. A
        // single recovery seek is preferable to showing the wrong chord while
        // a bounded rate correction catches up.
        seekToTotalElapsedTime(target.targetTotalElapsedMs, true);
        return;
      }

      updateScrollPosition(completedLoops, currentTime);

      if (Math.abs(driftMs) <= DRIFT_DEADBAND_MS) {
        setPlaybackRate(animation, 1);
        return;
      }

      // Positive drift means the visual is behind the audio, so speed it up.
      const correction = clamp(
        driftMs / AUDIO_SLEW_TIME_MS,
        -MAX_PLAYBACK_RATE_CORRECTION,
        MAX_PLAYBACK_RATE_CORRECTION,
      );
      setPlaybackRate(animation, 1 + correction);
    };

    const initialPerformanceTimeMs = performance.now();
    const initialTarget = getTargetTotalElapsedMs(initialPerformanceTimeMs);
    seekToTotalElapsedTime(
      initialTarget.audioHasStarted
        ? initialTarget.targetTotalElapsedMs
        : anchorStartTimeMs,
      initialTarget.audioHasStarted,
    );
    motionStarted = initialTarget.audioHasStarted;
    lastSyncPerformanceTimeMs = initialPerformanceTimeMs;

    const tick = (performanceTimeMs: number) => {
      if (
        generation !== animationGenerationRef.current ||
        !playingRef.current
      ) {
        rafIdRef.current = null;
        return;
      }

      if (
        performanceTimeMs < lastSyncPerformanceTimeMs ||
        performanceTimeMs - lastSyncPerformanceTimeMs >=
          AUDIO_SYNC_INTERVAL_MS
      ) {
        lastSyncPerformanceTimeMs = performanceTimeMs;
        synchronizeAnimation(performanceTimeMs);
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      const animation = animationRef.current;
      if (animation) {
        animation.onfinish = null;
        animation.cancel();
        animationRef.current = null;
      }
      animationGenerationRef.current += 1;
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
