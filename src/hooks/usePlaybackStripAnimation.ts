import {
  useEffect,
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
}

const VELOCITY_EPSILON = 0.0001;

/** Ignore tiny error so playbackRate does not hunt. */
const RATE_DEADBAND_MS = 8;

/** Max |playbackRate - 1| while soft-correcting. */
const MAX_RATE_CORRECTION = 0.04;

/** Convert error (ms) into a rate delta; ~1s error → full correction. */
const RATE_CORRECTION_GAIN = 1 / 1000;

/** How often to re-sample AudioContext into the smoothed clock. */
const AUDIO_RESAMPLE_INTERVAL_MS = 250;

/** Only hard-seek if drift is catastrophic (seek recovery). */
const HARD_RESYNC_THRESHOLD_MS = 250;

function preserveCurrentTransform(animatedElement: HTMLElement) {
  const computedTransform = window.getComputedStyle(animatedElement).transform;

  animatedElement.style.transform =
    computedTransform === "none" ? "" : computedTransform;
}

function cancelPlaybackStripAnimations({
  animations,
  animatedElement,
  preserveTransform,
}: {
  animations: Set<Animation>;
  animatedElement: HTMLElement | null;
  preserveTransform: boolean;
}) {
  if (preserveTransform && animatedElement && animations.size > 0) {
    preserveCurrentTransform(animatedElement);
  }

  for (const animation of Array.from(animations)) {
    animation.onfinish = null;
    animation.cancel();
  }

  animations.clear();
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

  return {
    chordCount,
    cumulativeChordTimesMs,
    totalDurationMs: cumulativeChordTimesMs[chordCount] ?? 0,
  };
}

function normalizeModulo(value: number, modulus: number) {
  return ((value % modulus) + modulus) % modulus;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function shortestSignedErrorMs(errorMs: number, loopDurationMs: number) {
  let wrapped = normalizeModulo(errorMs + loopDurationMs / 2, loopDurationMs);
  wrapped -= loopDurationMs / 2;
  return wrapped;
}

function buildPlaybackStripKeyframes({
  chordLayoutData,
  animationData,
  repetitionBase,
}: {
  chordLayoutData: PlaybackStripLayoutData;
  animationData: PlaybackStripAnimationData;
  repetitionBase: number;
}) {
  const boundaryPositions = [
    ...chordLayoutData.scrollPositions.slice(0, animationData.chordCount),
    chordLayoutData.totalWidth,
  ];
  const timedBoundaryIndices = [0];

  for (let index = 1; index <= animationData.chordCount; index++) {
    const currentTimeMs = animationData.cumulativeChordTimesMs[index] ?? 0;
    const lastTimedBoundaryIndex =
      timedBoundaryIndices[timedBoundaryIndices.length - 1] ?? 0;
    const lastTimeMs =
      animationData.cumulativeChordTimesMs[lastTimedBoundaryIndex] ?? 0;

    if (currentTimeMs === lastTimeMs) {
      timedBoundaryIndices[timedBoundaryIndices.length - 1] = index;
      continue;
    }

    timedBoundaryIndices.push(index);
  }

  const keyframeIndices = [timedBoundaryIndices[0] ?? 0];

  for (let index = 1; index < timedBoundaryIndices.length - 1; index++) {
    const currentBoundaryIndex = timedBoundaryIndices[index] ?? 0;
    const previousBoundaryIndex = timedBoundaryIndices[index - 1] ?? 0;
    const nextBoundaryIndex = timedBoundaryIndices[index + 1] ?? 0;
    const previousStartTimeMs =
      animationData.cumulativeChordTimesMs[previousBoundaryIndex] ?? 0;
    const currentStartTimeMs =
      animationData.cumulativeChordTimesMs[currentBoundaryIndex] ??
      previousStartTimeMs;
    const nextStartTimeMs =
      animationData.cumulativeChordTimesMs[nextBoundaryIndex] ??
      currentStartTimeMs;
    const previousDurationMs = currentStartTimeMs - previousStartTimeMs;
    const nextDurationMs = nextStartTimeMs - currentStartTimeMs;

    if (previousDurationMs <= 0 || nextDurationMs <= 0) {
      keyframeIndices.push(currentBoundaryIndex);
      continue;
    }

    const previousVelocity =
      (boundaryPositions[currentBoundaryIndex]! -
        boundaryPositions[previousBoundaryIndex]!) /
      previousDurationMs;
    const nextVelocity =
      (boundaryPositions[nextBoundaryIndex]! -
        boundaryPositions[currentBoundaryIndex]!) /
      nextDurationMs;

    if (Math.abs(previousVelocity - nextVelocity) > VELOCITY_EPSILON) {
      keyframeIndices.push(currentBoundaryIndex);
    }
  }

  keyframeIndices.push(
    timedBoundaryIndices[timedBoundaryIndices.length - 1] ??
      animationData.chordCount,
  );

  return keyframeIndices.map((index) => ({
    offset:
      animationData.totalDurationMs <= 0
        ? 0
        : animationData.cumulativeChordTimesMs[index]! /
          animationData.totalDurationMs,
    transform: `translateX(${(boundaryPositions[index]! + repetitionBase) * -1}px)`,
    easing: "linear",
  }));
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
  const animationRef = useRef<Animation | null>(null);
  const animationsRef = useRef<Set<Animation>>(new Set());
  const animationGenerationRef = useRef(0);
  const playingRef = useRef(playing);
  const repetitionBaseRef = useRef(0);
  const completedLoopsRef = useRef(0);
  const anchorChordIndexRef = useRef(currentChordIndex);
  const anchorRepetitionRef = useRef(currentRepetition);
  const playbackStartedAtAudioTimeRef = useRef(playbackStartedAtAudioTime);
  const rafIdRef = useRef<number | null>(null);

  const animationData = useMemo(
    () => getPlaybackStripAnimationData(chordLayoutData),
    [chordLayoutData],
  );

  useLayoutEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    playbackStartedAtAudioTimeRef.current = playbackStartedAtAudioTime;
  }, [playbackStartedAtAudioTime]);

  useLayoutEffect(() => {
    anchorChordIndexRef.current = currentChordIndex;
    anchorRepetitionRef.current = currentRepetition;
  }, [currentChordIndex, currentRepetition]);

  useLayoutEffect(() => {
    const animatedElement = stripRef.current;
    const animations = animationsRef.current;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    cancelPlaybackStripAnimations({
      animations,
      animatedElement,
      preserveTransform: playingRef.current,
    });

    animationRef.current = null;
    animationGenerationRef.current += 1;
    completedLoopsRef.current = 0;

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

    const generation = animationGenerationRef.current;
    const rawAnchorChordIndex = anchorChordIndexRef.current;
    const normalizedAnchorChordIndex = normalizeModulo(
      rawAnchorChordIndex,
      animationData.chordCount,
    );
    const extraAnchorLoops = Math.floor(
      rawAnchorChordIndex / animationData.chordCount,
    );
    const anchorStartTimeMs =
      animationData.cumulativeChordTimesMs[normalizedAnchorChordIndex] ?? 0;
    const playbackStartAudioTime = playbackStartedAtAudioTime;
    const loopDurationMs = animationData.totalDurationMs;

    // Smooth audio clock: sample AudioContext periodically, extrapolate with
    // performance.now() between samples so the sync target is continuous.
    let audioElapsedAtSampleMs = Math.max(
      0,
      (audioContext.currentTime - playbackStartAudioTime) * 1000,
    );
    let audioSamplePerfMs = performance.now();

    const resampleAudioClock = (nowPerfMs: number) => {
      audioElapsedAtSampleMs = Math.max(
        0,
        (audioContext.currentTime - playbackStartAudioTime) * 1000,
      );
      audioSamplePerfMs = nowPerfMs;
    };

    const getSmoothedAudioElapsedMs = (nowPerfMs: number) =>
      Math.max(0, audioElapsedAtSampleMs + (nowPerfMs - audioSamplePerfMs));

    const getTargetTotalElapsedMs = (nowPerfMs: number) =>
      anchorStartTimeMs + getSmoothedAudioElapsedMs(nowPerfMs);

    const initialTotalElapsedMs = getTargetTotalElapsedMs(performance.now());
    completedLoopsRef.current = Math.floor(initialTotalElapsedMs / loopDurationMs);
    const initialCurrentTimeMs = normalizeModulo(
      initialTotalElapsedMs,
      loopDurationMs,
    );

    repetitionBaseRef.current =
      (anchorRepetitionRef.current +
        extraAnchorLoops +
        completedLoopsRef.current) *
      chordLayoutData.totalWidth;

    const startAnimation = (startTimeMs: number) => {
      const currentAnimatedElement = stripRef.current;
      if (!currentAnimatedElement) return;

      const animation = currentAnimatedElement.animate(
        buildPlaybackStripKeyframes({
          chordLayoutData,
          animationData,
          repetitionBase: repetitionBaseRef.current,
        }),
        {
          duration: loopDurationMs,
          fill: "both",
        },
      );

      animation.pause();
      animation.currentTime = Math.max(0, Math.min(startTimeMs, loopDurationMs));
      animation.playbackRate = 1;

      animations.add(animation);

      animation.onfinish = () => {
        if (
          generation !== animationGenerationRef.current ||
          !playingRef.current
        ) {
          animation.onfinish = null;
          animations.delete(animation);

          if (animationRef.current === animation) {
            animationRef.current = null;
          }

          animation.cancel();
          return;
        }

        animation.onfinish = null;
        animations.delete(animation);

        if (animationRef.current === animation) {
          animationRef.current = null;
        }

        animation.cancel();

        completedLoopsRef.current += 1;
        repetitionBaseRef.current += chordLayoutData.totalWidth;
        startAnimation(0);
      };

      animation.play();
      animationRef.current = animation;
    };

    startAnimation(initialCurrentTimeMs);

    const tick = () => {
      if (
        generation !== animationGenerationRef.current ||
        !playingRef.current
      ) {
        rafIdRef.current = null;
        return;
      }

      const animation = animationRef.current;
      const nowPerfMs = performance.now();

      if (
        nowPerfMs - audioSamplePerfMs >= AUDIO_RESAMPLE_INTERVAL_MS ||
        nowPerfMs < audioSamplePerfMs
      ) {
        resampleAudioClock(nowPerfMs);
      }

      if (animation && typeof animation.currentTime === "number") {
        const targetTotalElapsedMs = getTargetTotalElapsedMs(nowPerfMs);
        const visualTotalElapsedMs =
          completedLoopsRef.current * loopDurationMs + animation.currentTime;
        const rawErrorMs = visualTotalElapsedMs - targetTotalElapsedMs;
        const errorMs = shortestSignedErrorMs(rawErrorMs, loopDurationMs);

        if (Math.abs(errorMs) >= HARD_RESYNC_THRESHOLD_MS) {
          // Catastrophic desync only (tab backgrounding, etc.). Soft rate
          // correction cannot recover this quickly without a seek.
          const targetCurrentTimeMs = normalizeModulo(
            targetTotalElapsedMs,
            loopDurationMs,
          );
          const targetLoops = Math.floor(targetTotalElapsedMs / loopDurationMs);

          if (targetLoops !== completedLoopsRef.current) {
            animation.onfinish = null;
            animations.delete(animation);
            animation.cancel();
            animationRef.current = null;

            completedLoopsRef.current = targetLoops;
            repetitionBaseRef.current =
              (anchorRepetitionRef.current +
                extraAnchorLoops +
                completedLoopsRef.current) *
              chordLayoutData.totalWidth;
            startAnimation(targetCurrentTimeMs);
          } else {
            animation.currentTime = Math.max(
              0,
              Math.min(targetCurrentTimeMs, loopDurationMs),
            );
            animation.playbackRate = 1;
          }
        } else if (Math.abs(errorMs) <= RATE_DEADBAND_MS) {
          if (animation.playbackRate !== 1) {
            animation.playbackRate = 1;
          }
        } else {
          // Visual ahead (error > 0) → slow down; behind → speed up.
          // Keep WAAPI free-running so motion stays continuous.
          animation.playbackRate =
            1 -
            clamp(
              errorMs * RATE_CORRECTION_GAIN,
              -MAX_RATE_CORRECTION,
              MAX_RATE_CORRECTION,
            );
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      cancelPlaybackStripAnimations({
        animations,
        animatedElement,
        preserveTransform: playingRef.current,
      });

      animationRef.current = null;
      animationGenerationRef.current += 1;
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
