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
}

interface PlaybackStripAnimationData {
  chordCount: number;
  cumulativeChordTimesMs: number[];
  totalDurationMs: number;
  /** Timed boundary indices into scrollPositions (+ totalWidth at end). */
  timedBoundaryIndices: number[];
  timedBoundaryTimesMs: number[];
  timedBoundaryPositions: number[];
}

/**
 * How often to re-sample AudioContext into the smoothed clock.
 * AudioContext.currentTime on iOS updates in coarser quanta than rAF; we
 * extrapolate with performance.now() between samples for a continuous target.
 */
const AUDIO_RESAMPLE_INTERVAL_MS = 250;

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

  // Collapse zero-duration boundaries (measure lines / spacers) so position is
  // a continuous piecewise-linear function of time with no instantaneous jumps
  // in the time domain (spatial jumps of 0ms duration are still instantaneous,
  // but they match the intended ornamental layout).
  const timedBoundaryIndices = [0];

  for (let index = 1; index <= chordCount; index++) {
    const currentTimeMs = cumulativeChordTimesMs[index] ?? 0;
    const lastTimedBoundaryIndex =
      timedBoundaryIndices[timedBoundaryIndices.length - 1] ?? 0;
    const lastTimeMs = cumulativeChordTimesMs[lastTimedBoundaryIndex] ?? 0;

    if (currentTimeMs === lastTimeMs) {
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

  return {
    chordCount,
    cumulativeChordTimesMs,
    totalDurationMs,
    timedBoundaryIndices,
    timedBoundaryTimesMs,
    timedBoundaryPositions,
  };
}

function normalizeModulo(value: number, modulus: number) {
  return ((value % modulus) + modulus) % modulus;
}

/**
 * Continuous scroll position for elapsed time within one loop.
 * Piecewise-linear between timed chord boundaries — never discontinuous in
 * time, so a continuously advancing clock cannot produce a visual jump.
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

  // Binary search for the segment containing clampedTimeMs.
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
}: UsePlaybackStripAnimationArgs) {
  const playingRef = useRef(playing);
  const anchorChordIndexRef = useRef(currentChordIndex);
  const anchorRepetitionRef = useRef(currentRepetition);
  const rafIdRef = useRef<number | null>(null);

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
    const baseRepetition =
      anchorRepetitionRef.current + extraAnchorLoops;

    // Pin the chord-boundary position immediately (kill pause CSS transition).
    const startPositionPx =
      (chordLayoutData.scrollPositions[normalizedAnchorChordIndex] ?? 0) +
      baseRepetition * chordLayoutData.totalWidth;
    animatedElement.style.transition = "none";
    animatedElement.style.transform = `translateX(${startPositionPx * -1}px)`;

    // Smooth audio clock: hold at 0 until audio actually starts, then sample
    // AudioContext periodically and extrapolate with performance.now().
    // This avoids iOS AudioContext quantization stutter and never seeks a
    // compositor-threaded WAAPI animation (which jumps on Safari when
    // playbackRate/currentTime are written from a stale main-thread time).
    let audioHasStarted = audioContext.currentTime >= playbackStartAudioTime;
    let audioElapsedAtSampleMs = audioHasStarted
      ? (audioContext.currentTime - playbackStartAudioTime) * 1000
      : 0;
    let audioSamplePerfMs = performance.now();

    const resampleAudioClock = (nowPerfMs: number) => {
      const rawElapsedMs =
        (audioContext.currentTime - playbackStartAudioTime) * 1000;

      if (rawElapsedMs < 0) {
        audioHasStarted = false;
        audioElapsedAtSampleMs = 0;
        audioSamplePerfMs = nowPerfMs;
        return;
      }

      audioHasStarted = true;
      audioElapsedAtSampleMs = rawElapsedMs;
      audioSamplePerfMs = nowPerfMs;
    };

    const getSmoothedAudioElapsedMs = (nowPerfMs: number) => {
      if (!audioHasStarted) {
        return 0;
      }

      return Math.max(
        0,
        audioElapsedAtSampleMs + (nowPerfMs - audioSamplePerfMs),
      );
    };

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
    };

    const tick = () => {
      if (!playingRef.current) {
        rafIdRef.current = null;
        return;
      }

      const nowPerfMs = performance.now();

      if (
        nowPerfMs - audioSamplePerfMs >= AUDIO_RESAMPLE_INTERVAL_MS ||
        nowPerfMs < audioSamplePerfMs
      ) {
        resampleAudioClock(nowPerfMs);
      } else if (!audioHasStarted) {
        // Poll frequently during the lead-in so motion begins on the first
        // frame after audio start without waiting for the resample interval.
        resampleAudioClock(nowPerfMs);
      }

      applyTransformForElapsedMs(getSmoothedAudioElapsedMs(nowPerfMs));
      rafIdRef.current = requestAnimationFrame(tick);
    };

    // Apply once in layout (pre-paint) so the hold frame is correct, then rAF.
    resampleAudioClock(performance.now());
    applyTransformForElapsedMs(getSmoothedAudioElapsedMs(performance.now()));
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
    stripRef,
  ]);
}

export default usePlaybackStripAnimation;
