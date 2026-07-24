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
    writerGenerationRef.current += 1;
    const writerGeneration = writerGenerationRef.current;
    let writerActive = true;
    let scheduledRafId: number | null = null;
    let pollRafId: number | null = null;
    let watchdogIntervalId: number | null = null;
    let startedWriter = false;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Critical Safari fix: while `playing` is true, never bail permanently when
    // the strip/layout/clock is not ready yet. Cold first-play after a lazy
    // modal mount often races those prerequisites; a bare return left zero
    // writers and zero watchdog → frozen strip with healthy audio/highlights.
    if (!playing) {
      return;
    }

    const clearPolling = () => {
      if (pollRafId !== null) {
        cancelAnimationFrame(pollRafId);
        pollRafId = null;
      }
    };

    const clearWatchdog = () => {
      if (watchdogIntervalId !== null) {
        window.clearInterval(watchdogIntervalId);
        watchdogIntervalId = null;
      }
    };

    const startWriter = (
      animatedElement: HTMLDivElement,
      layoutData: PlaybackStripLayoutData,
      data: PlaybackStripAnimationData,
      ctx: AudioContext,
      playbackStartAudioTime: number,
    ) => {
      if (!writerActive || startedWriter) return;
      if (writerGenerationRef.current !== writerGeneration) return;
      startedWriter = true;
      clearPolling();

      const rawAnchorChordIndex = anchorChordIndexRef.current;
      const normalizedAnchorChordIndex =
        ((rawAnchorChordIndex % data.chordCount) + data.chordCount) %
        data.chordCount;
      const extraAnchorLoops = Math.floor(
        rawAnchorChordIndex / data.chordCount,
      );
      const anchorStartTimeMs =
        data.cumulativeChordTimesMs[normalizedAnchorChordIndex] ?? 0;
      const loopDurationMs = data.totalDurationMs;
      const baseRepetition = anchorRepetitionRef.current + extraAnchorLoops;

      const startPositionPx =
        (layoutData.scrollPositions[normalizedAnchorChordIndex] ?? 0) +
        baseRepetition * layoutData.totalWidth;

      // Kill any in-flight CSS scrub transitions before reseeding translateX.
      // Rapid Range / finger scrub leaves interrupted transitions that can keep
      // owning transform after React flips transition to none on play.
      animatedElement.style.transition = "none";
      animatedElement.style.willChange = "auto";
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
      const startTransform = getStripTransform(startPositionPx);
      animatedElement.style.transform = startTransform;
      void window.getComputedStyle(animatedElement).transform;
      void animatedElement.getBoundingClientRect();

      // Rebuild the layer immediately on every touch-WebKit play edge. Waiting
      // for the watchdog (and requiring transform !== start) skipped the exact
      // failure mode: first Play after reload with a frozen start layer. A
      // once-per-page gate also left later sessions stuck after app-switch.
      if (isTouchWebKit()) {
        refreshWebKitTransformLayer(animatedElement, startTransform);
      }

      if (scrollPositionRef) {
        scrollPositionRef.current = startPositionPx;
      }

      // Continuous displayed clock: advance by performance.now() delta each
      // frame, soft-slew toward AudioContext. Never hard-assign from audio so
      // iOS quantization / resample cannot snap translateX.
      let audioHasStarted = ctx.currentTime >= playbackStartAudioTime;
      let displayedElapsedMs = audioHasStarted
        ? Math.max(0, (ctx.currentTime - playbackStartAudioTime) * 1000)
        : 0;
      let lastPerfMs = performance.now();
      let lastWriterPerfMs = lastPerfMs;
      let lastMovedTransformPerfMs = lastPerfMs;
      let lastAppliedTransform = startTransform;
      let watchdogPreviousAudioTime = ctx.currentTime;
      let watchdogPreviousTransform = startTransform;

      const getAbsolutePositionForElapsedMs = (audioElapsedMs: number) => {
        const totalElapsedMs = anchorStartTimeMs + audioElapsedMs;
        const completedLoops = Math.floor(totalElapsedMs / loopDurationMs);
        const loopTimeMs = normalizeModulo(totalElapsedMs, loopDurationMs);
        const loopPositionPx = getScrollPositionForLoopTimeMs(data, loopTimeMs);
        return (
          loopPositionPx +
          (baseRepetition + completedLoops) * layoutData.totalWidth
        );
      };

      const applyTransformForElapsedMs = (audioElapsedMs: number) => {
        const absolutePositionPx = getAbsolutePositionForElapsedMs(audioElapsedMs);
        const nextTransform = getStripTransform(absolutePositionPx);
        animatedElement.style.transform = nextTransform;
        // Only treat the writer as "alive for motion" when the transform string
        // actually changes. Holding at start (apply 0 forever) used to refresh
        // lastWriterPerfMs and hide stuck-at-start freezes from the watchdog.
        if (nextTransform !== lastAppliedTransform) {
          lastMovedTransformPerfMs = performance.now();
          lastAppliedTransform = nextTransform;
        }
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
        if (ctx.state !== "running") {
          if (audioHasStarted) {
            applyTransformForElapsedMs(displayedElapsedMs);
            scheduleNextFrame();
            return;
          }

          void ctx.resume().catch(() => undefined);
        }

        const rawAudioElapsedMs =
          (ctx.currentTime - playbackStartAudioTime) * 1000;

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

      watchdogIntervalId = window.setInterval(() => {
        const nowPerfMs = performance.now();
        const currentAudioTime = ctx.currentTime;
        const currentInlineTransform = animatedElement.style.transform;
        const audioAdvanceSinceWatchdogMs =
          (currentAudioTime - watchdogPreviousAudioTime) * 1000;
        const writerAgeMs = nowPerfMs - lastWriterPerfMs;
        const motionAgeMs = nowPerfMs - lastMovedTransformPerfMs;
        const audioIsAdvancing =
          audioAdvanceSinceWatchdogMs >= WATCHDOG_AUDIO_ADVANCE_THRESHOLD_MS;
        const writerMissedDeadline =
          writerAgeMs >= WRITER_STALL_THRESHOLD_MS;
        const transformDidNotAdvance =
          currentInlineTransform === watchdogPreviousTransform;
        // Audio moved past the start hold but the strip transform never left
        // the seeded start value — classic Safari cold-layer / dead-writer case.
        const stuckAtStart =
          audioIsAdvancing &&
          currentAudioTime >= playbackStartAudioTime + 0.12 &&
          (currentInlineTransform === startTransform ||
            motionAgeMs >= WRITER_STALL_THRESHOLD_MS);
        const recoveryEligible =
          writerActive &&
          writerGenerationRef.current === writerGeneration &&
          playingRef.current &&
          ctx.state === "running" &&
          currentAudioTime >= playbackStartAudioTime &&
          document.visibilityState === "visible" &&
          animatedElement.isConnected &&
          stripRef.current === animatedElement;
        const shouldRecover =
          recoveryEligible &&
          audioIsAdvancing &&
          (writerMissedDeadline || transformDidNotAdvance || stuckAtStart);

        if (shouldRecover) {
          const directAudioElapsedMs = Math.max(
            0,
            (currentAudioTime - playbackStartAudioTime) * 1000,
          );
          audioHasStarted = true;
          displayedElapsedMs = directAudioElapsedMs;
          lastPerfMs = nowPerfMs;
          applyTransformForElapsedMs(directAudioElapsedMs);

          // Always rebuild the compositor layer on recovery — including when
          // still at the start transform. The previous "only if moved" gate
          // skipped the exact Safari cold-layer failure mode.
          if (isTouchWebKit()) {
            refreshWebKitTransformLayer(
              animatedElement,
              animatedElement.style.transform,
            );
          }

          if (scheduledRafId !== null) {
            cancelAnimationFrame(scheduledRafId);
            if (rafIdRef.current === scheduledRafId) {
              rafIdRef.current = null;
            }
            scheduledRafId = null;
          }
          scheduleNextFrame();
        }

        watchdogPreviousAudioTime = currentAudioTime;
        watchdogPreviousTransform = animatedElement.style.transform;
      }, WRITER_WATCHDOG_INTERVAL_MS);
    };

    const tryStart = () => {
      if (!writerActive || startedWriter) return;
      if (writerGenerationRef.current !== writerGeneration) return;

      const animatedElement = stripRef.current;
      if (
        !animatedElement ||
        !chordLayoutData ||
        !animationData ||
        animationData.totalDurationMs <= 0 ||
        !audioContext ||
        playbackStartedAtAudioTime === null
      ) {
        pollRafId = requestAnimationFrame(tryStart);
        return;
      }

      startWriter(
        animatedElement,
        chordLayoutData,
        animationData,
        audioContext,
        playbackStartedAtAudioTime,
      );
    };

    tryStart();

    return () => {
      writerActive = false;
      clearPolling();
      clearWatchdog();
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
