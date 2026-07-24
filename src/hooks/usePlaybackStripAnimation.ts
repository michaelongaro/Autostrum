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

/**
 * Cap a single rAF delta so a background→foreground gap (iOS throttles rAF
 * while suspended) cannot jump translateX by seconds of wall-clock time before
 * the visibility pause handler finishes tearing down playback.
 */
const MAX_FRAME_DELTA_MS = 100;

const WRITER_WATCHDOG_INTERVAL_MS = 250;
const WRITER_STALL_THRESHOLD_MS = 180;
const WATCHDOG_AUDIO_ADVANCE_THRESHOLD_MS = 40;

// WebKit can retain the first promoted transform layer after a cold page load
// even while JS and getComputedStyle report changing transforms. Rebuild that
// layer at most once per page lifetime; subsequent sessions keep the warm layer.
let firstWebKitPlaybackLayerRefreshed = false;

function getStripTransform(positionPx: number) {
  return `translate3d(${positionPx * -1}px, 0, 0)`;
}

function isTouchWebKit() {
  return (
    navigator.maxTouchPoints > 0 &&
    navigator.userAgent.includes("AppleWebKit")
  );
}

function refreshWebKitTransformLayer(
  element: HTMLDivElement,
  transform: string,
) {
  element.style.transition = "none";
  element.style.backfaceVisibility = "visible";
  element.style.webkitBackfaceVisibility = "visible";
  element.style.transform = "none";
  void element.getBoundingClientRect();

  element.style.backfaceVisibility = "hidden";
  element.style.webkitBackfaceVisibility = "hidden";
  element.style.transform = transform;
  void window.getComputedStyle(element).transform;
}

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
  const writerGenerationRef = useRef(0);

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
    writerGenerationRef.current += 1;
    const writerGeneration = writerGenerationRef.current;
    let writerActive = true;
    let scheduledRafId: number | null = null;

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
    animatedElement.style.backfaceVisibility = "hidden";
    animatedElement.style.webkitBackfaceVisibility = "hidden";
    if (typeof animatedElement.getAnimations === "function") {
      for (const animation of animatedElement.getAnimations()) {
        animation.cancel();
      }
    }

    // Cold iOS WebKit can defer activation of the first transform compositor
    // layer. Seed a 3D transform and synchronously flush style/layout before the
    // first rAF so the layer exists before continuous writes begin.
    animatedElement.style.transform = getStripTransform(startPositionPx);
    void window.getComputedStyle(animatedElement).transform;
    void animatedElement.getBoundingClientRect();
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
    const animationStartTransform = animatedElement.style.transform;
    let lastWriterPerfMs = lastPerfMs;
    let watchdogPreviousAudioTime = audioContext.currentTime;
    let watchdogPreviousTransform = animationStartTransform;
    let isFirstWatchdogCheck = true;

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

      const nextTransform = getStripTransform(absolutePositionPx);
      animatedElement.style.transform = nextTransform;
      lastWriterPerfMs = performance.now();
      if (scrollPositionRef) {
        scrollPositionRef.current = absolutePositionPx;
      }
    };

    const scheduleNextFrame = () => {
      if (
        !writerActive ||
        writerGenerationRef.current !== writerGeneration ||
        !playingRef.current ||
        scheduledRafId !== null
      ) {
        return;
      }

      const nextRafId = requestAnimationFrame(() => {
        if (scheduledRafId === nextRafId) {
          scheduledRafId = null;
        }
        if (rafIdRef.current === nextRafId) {
          rafIdRef.current = null;
        }

        if (
          !writerActive ||
          writerGenerationRef.current !== writerGeneration
        ) {
          return;
        }

        tick();
      });

      scheduledRafId = nextRafId;
      rafIdRef.current = nextRafId;
    };

    const tick = () => {
      if (
        !writerActive ||
        writerGenerationRef.current !== writerGeneration
      ) {
        return;
      }

      if (!playingRef.current) {
        return;
      }

      const nowPerfMs = performance.now();
      const deltaMs = Math.min(
        MAX_FRAME_DELTA_MS,
        Math.max(0, nowPerfMs - lastPerfMs),
      );
      lastPerfMs = nowPerfMs;

      // Suspended AudioContext freezes currentTime. After a real mid-playback
      // suspend (app switch race), hold position. On a cold start that somehow
      // began while suspended, keep polling — do not permanently freeze the
      // strip; resume() here can complete once iOS unlocks audio.
      if (audioContext.state !== "running") {
        if (audioHasStarted) {
          applyTransformForElapsedMs(displayedElapsedMs);
          scheduleNextFrame();
          return;
        }

        void audioContext.resume().catch(() => undefined);
      }

      const rawAudioElapsedMs =
        (audioContext.currentTime - playbackStartAudioTime) * 1000;

      if (!audioHasStarted) {
        if (rawAudioElapsedMs < 0) {
          applyTransformForElapsedMs(0);
          scheduleNextFrame();
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
      scheduleNextFrame();
    };

    applyTransformForElapsedMs(displayedElapsedMs);
    scheduleNextFrame();

    const watchdogIntervalId = window.setInterval(() => {
      const nowPerfMs = performance.now();
      const currentAudioTime = audioContext.currentTime;
      const currentInlineTransform = animatedElement.style.transform;
      const audioAdvanceSinceWatchdogMs =
        (currentAudioTime - watchdogPreviousAudioTime) * 1000;
      const writerAgeMs = nowPerfMs - lastWriterPerfMs;
      const audioIsAdvancing =
        audioAdvanceSinceWatchdogMs >= WATCHDOG_AUDIO_ADVANCE_THRESHOLD_MS;
      const writerMissedDeadline =
        writerAgeMs >= WRITER_STALL_THRESHOLD_MS;
      const transformDidNotAdvance =
        currentInlineTransform === watchdogPreviousTransform;
      const recoveryEligible =
        writerActive &&
        writerGenerationRef.current === writerGeneration &&
        playingRef.current &&
        audioContext.state === "running" &&
        currentAudioTime >= playbackStartAudioTime &&
        document.visibilityState === "visible" &&
        animatedElement.isConnected &&
        stripRef.current === animatedElement;
      const shouldRecover =
        recoveryEligible &&
        audioIsAdvancing &&
        (writerMissedDeadline || transformDidNotAdvance);

      if (shouldRecover) {
        const directAudioElapsedMs = Math.max(
          0,
          (currentAudioTime - playbackStartAudioTime) * 1000,
        );
        audioHasStarted = true;
        displayedElapsedMs = directAudioElapsedMs;
        lastPerfMs = nowPerfMs;
        applyTransformForElapsedMs(directAudioElapsedMs);

        if (scheduledRafId !== null) {
          cancelAnimationFrame(scheduledRafId);
          if (rafIdRef.current === scheduledRafId) {
            rafIdRef.current = null;
          }
          scheduledRafId = null;
        }
        scheduleNextFrame();
      }

      const shouldRefreshLayer =
        recoveryEligible &&
        !firstWebKitPlaybackLayerRefreshed &&
        isTouchWebKit() &&
        isFirstWatchdogCheck &&
        audioIsAdvancing &&
        animatedElement.style.transform !== animationStartTransform;

      if (shouldRefreshLayer) {
        refreshWebKitTransformLayer(
          animatedElement,
          animatedElement.style.transform,
        );
        firstWebKitPlaybackLayerRefreshed = true;
      }

      isFirstWatchdogCheck = false;
      watchdogPreviousAudioTime = currentAudioTime;
      watchdogPreviousTransform = animatedElement.style.transform;
    }, WRITER_WATCHDOG_INTERVAL_MS);

    return () => {
      writerActive = false;
      window.clearInterval(watchdogIntervalId);
      if (scheduledRafId !== null) {
        cancelAnimationFrame(scheduledRafId);
        if (rafIdRef.current === scheduledRafId) {
          rafIdRef.current = null;
        }
        scheduledRafId = null;
      }
      if (writerGenerationRef.current === writerGeneration) {
        writerGenerationRef.current += 1;
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
