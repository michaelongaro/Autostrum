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
const CURRENT_TIME_SYNC_THRESHOLD_MS = 12;

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

function getCircularTimeDeltaMs({
  currentTimeMs,
  targetTimeMs,
  durationMs,
}: {
  currentTimeMs: number;
  targetTimeMs: number;
  durationMs: number;
}) {
  if (durationMs <= 0) {
    return targetTimeMs - currentTimeMs;
  }

  const normalizedDelta = normalizeModulo(
    targetTimeMs - currentTimeMs + durationMs / 2,
    durationMs,
  );

  return normalizedDelta - durationMs / 2;
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
  const keyframeIndices = [0];

  for (let index = 1; index < animationData.chordCount; index++) {
    const previousStartTimeMs =
      animationData.cumulativeChordTimesMs[index - 1] ?? 0;
    const currentStartTimeMs =
      animationData.cumulativeChordTimesMs[index] ?? previousStartTimeMs;
    const nextStartTimeMs =
      animationData.cumulativeChordTimesMs[index + 1] ?? currentStartTimeMs;
    const previousDurationMs = currentStartTimeMs - previousStartTimeMs;
    const nextDurationMs = nextStartTimeMs - currentStartTimeMs;

    if (previousDurationMs <= 0 || nextDurationMs <= 0) {
      keyframeIndices.push(index);
      continue;
    }

    const previousVelocity =
      (boundaryPositions[index]! - boundaryPositions[index - 1]!) /
      previousDurationMs;
    const nextVelocity =
      (boundaryPositions[index + 1]! - boundaryPositions[index]!) /
      nextDurationMs;

    if (Math.abs(previousVelocity - nextVelocity) > VELOCITY_EPSILON) {
      keyframeIndices.push(index);
    }
  }

  keyframeIndices.push(animationData.chordCount);

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
  const rafIdRef = useRef<number | null>(null);
  const playingRef = useRef(playing);
  const repetitionBaseRef = useRef(0);
  const anchorChordIndexRef = useRef(currentChordIndex);
  const anchorRepetitionRef = useRef(currentRepetition);

  const animationData = useMemo(
    () => getPlaybackStripAnimationData(chordLayoutData),
    [chordLayoutData],
  );

  useEffect(() => {
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

    cancelPlaybackStripAnimations({
      animations,
      animatedElement,
      preserveTransform: true,
    });

    animationRef.current = null;
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
    const elapsedSincePlaybackStartMs = Math.max(
      0,
      (audioContext.currentTime - playbackStartedAtAudioTime) * 1000,
    );
    const totalElapsedMs = anchorStartTimeMs + elapsedSincePlaybackStartMs;
    const completedLoops = Math.floor(
      totalElapsedMs / animationData.totalDurationMs,
    );
    const initialCurrentTimeMs = normalizeModulo(
      totalElapsedMs,
      animationData.totalDurationMs,
    );

    repetitionBaseRef.current =
      (anchorRepetitionRef.current + extraAnchorLoops + completedLoops) *
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
          duration: animationData.totalDurationMs,
          fill: "both",
        },
      );

      animation.pause();
      animation.currentTime = Math.max(
        0,
        Math.min(startTimeMs, animationData.totalDurationMs),
      );

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

        repetitionBaseRef.current += chordLayoutData.totalWidth;
        startAnimation(0);
      };

      animation.play();
      animationRef.current = animation;
    };

    startAnimation(initialCurrentTimeMs);

    const syncAnimationToAudioClock = () => {
      if (
        generation !== animationGenerationRef.current ||
        !playingRef.current ||
        !audioContext
      ) {
        return;
      }

      const activeAnimation = animationRef.current;

      if (activeAnimation) {
        const syncedElapsedSincePlaybackStartMs = Math.max(
          0,
          (audioContext.currentTime - playbackStartedAtAudioTime) * 1000,
        );
        const syncedTotalElapsedMs =
          anchorStartTimeMs + syncedElapsedSincePlaybackStartMs;
        const targetCurrentTimeMs = normalizeModulo(
          syncedTotalElapsedMs,
          animationData.totalDurationMs,
        );
        const actualCurrentTimeMs = Number(activeAnimation.currentTime ?? 0);
        const driftMs = getCircularTimeDeltaMs({
          currentTimeMs: actualCurrentTimeMs,
          targetTimeMs: targetCurrentTimeMs,
          durationMs: animationData.totalDurationMs,
        });

        if (Math.abs(driftMs) > CURRENT_TIME_SYNC_THRESHOLD_MS) {
          activeAnimation.currentTime = Math.max(
            0,
            Math.min(targetCurrentTimeMs, animationData.totalDurationMs),
          );
        }
      }

      rafIdRef.current = requestAnimationFrame(syncAnimationToAudioClock);
    };

    rafIdRef.current = requestAnimationFrame(syncAnimationToAudioClock);

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
