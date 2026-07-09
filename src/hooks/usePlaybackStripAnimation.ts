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
    const animations = animationsRef.current;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Always preserve the last visual frame when tearing down so pause/resume
    // and dependency churn never flash an identity transform.
    cancelPlaybackStripAnimations({
      animations,
      animatedElement,
      preserveTransform: true,
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

    // Resume/play always begins at a chord boundary (paused scrub position).
    completedLoopsRef.current = 0;
    repetitionBaseRef.current =
      (anchorRepetitionRef.current + extraAnchorLoops) *
      chordLayoutData.totalWidth;

    const startPositionPx =
      (chordLayoutData.scrollPositions[normalizedAnchorChordIndex] ?? 0) +
      repetitionBaseRef.current;

    // Kill any pause-settle CSS transition and pin the resume position before
    // WAAPI takes over so the first painted frame cannot hitch.
    animatedElement.style.transition = "none";
    animatedElement.style.transform = `translateX(${startPositionPx * -1}px)`;

    // Smooth audio clock: only advances after audio start. Sample AudioContext
    // periodically and extrapolate with performance.now() between samples.
    let audioHasStarted = audioContext.currentTime >= playbackStartAudioTime;
    let audioElapsedAtSampleMs = audioHasStarted
      ? (audioContext.currentTime - playbackStartAudioTime) * 1000
      : 0;
    let audioSamplePerfMs = performance.now();
    let motionStarted = false;

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

    const getTargetTotalElapsedMs = (nowPerfMs: number) =>
      anchorStartTimeMs + getSmoothedAudioElapsedMs(nowPerfMs);

    const startAnimation = (startTimeMs: number, autoplay: boolean) => {
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

        // Capture end-of-loop transform before cancel so the next iteration's
        // first frame is continuous (no blank/identity flash).
        preserveCurrentTransform(currentAnimatedElement);

        animation.onfinish = null;
        animations.delete(animation);

        if (animationRef.current === animation) {
          animationRef.current = null;
        }

        animation.cancel();

        completedLoopsRef.current += 1;
        repetitionBaseRef.current += chordLayoutData.totalWidth;
        startAnimation(0, true);
      };

      animationRef.current = animation;

      if (autoplay) {
        animation.play();
      }
    };

    // Paused WAAPI at the chord boundary so fill:both matches the pinned CSS
    // transform for the lead-in hold (no motion until audio starts).
    startAnimation(normalizeModulo(anchorStartTimeMs, loopDurationMs), false);

    const beginMotionIfReady = (
      nowPerfMs: number,
      { allowPrePaintSeek }: { allowPrePaintSeek: boolean },
    ) => {
      if (motionStarted) return;

      resampleAudioClock(nowPerfMs);

      if (!audioHasStarted) {
        return;
      }

      const animation = animationRef.current;
      if (!animation) return;

      // Seeking is only invisible before the browser has painted the hold frame.
      // After a painted hold, play() from the boundary with soft rate correction.
      if (allowPrePaintSeek) {
        const elapsedMs = getSmoothedAudioElapsedMs(nowPerfMs);

        if (elapsedMs > RATE_DEADBAND_MS) {
          const totalElapsedMs = anchorStartTimeMs + elapsedMs;
          completedLoopsRef.current = Math.floor(
            totalElapsedMs / loopDurationMs,
          );
          const currentTimeMs = normalizeModulo(totalElapsedMs, loopDurationMs);
          const expectedRepetitionBase =
            (anchorRepetitionRef.current +
              extraAnchorLoops +
              completedLoopsRef.current) *
            chordLayoutData.totalWidth;

          if (expectedRepetitionBase !== repetitionBaseRef.current) {
            repetitionBaseRef.current = expectedRepetitionBase;
            animation.onfinish = null;
            animations.delete(animation);
            animation.cancel();
            animationRef.current = null;
            startAnimation(currentTimeMs, true);
            motionStarted = true;
            resampleAudioClock(performance.now());
            return;
          }

          animation.currentTime = Math.max(
            0,
            Math.min(currentTimeMs, loopDurationMs),
          );
        }
      }

      animation.playbackRate = 1;
      animation.play();
      motionStarted = true;
      resampleAudioClock(performance.now());
    };

    const tick = () => {
      if (
        generation !== animationGenerationRef.current ||
        !playingRef.current
      ) {
        rafIdRef.current = null;
        return;
      }

      const nowPerfMs = performance.now();

      if (!motionStarted) {
        // Hold frame has been painted; never seek from here.
        beginMotionIfReady(nowPerfMs, { allowPrePaintSeek: false });
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      if (
        nowPerfMs - audioSamplePerfMs >= AUDIO_RESAMPLE_INTERVAL_MS ||
        nowPerfMs < audioSamplePerfMs
      ) {
        resampleAudioClock(nowPerfMs);
      }

      const animation = animationRef.current;

      if (animation && typeof animation.currentTime === "number") {
        const targetTotalElapsedMs = getTargetTotalElapsedMs(nowPerfMs);
        const visualTotalElapsedMs =
          completedLoopsRef.current * loopDurationMs + animation.currentTime;
        const errorMs = shortestSignedErrorMs(
          visualTotalElapsedMs - targetTotalElapsedMs,
          loopDurationMs,
        );

        // Never hard-seek after motion starts: only soft playbackRate correction.
        if (Math.abs(errorMs) <= RATE_DEADBAND_MS) {
          if (animation.playbackRate !== 1) {
            animation.playbackRate = 1;
          }
        } else {
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

    // If audio is already past the scheduled start (slow React commit), seek
    // and start in this layout effect before the browser paints — invisible.
    beginMotionIfReady(performance.now(), { allowPrePaintSeek: true });
    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      cancelPlaybackStripAnimations({
        animations,
        animatedElement,
        preserveTransform: true,
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
