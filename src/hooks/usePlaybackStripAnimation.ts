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
  onPauseTransform?: (positionPx: number) => void;
}

interface PlaybackStripAnimationData {
  chordCount: number;
  cumulativeChordTimesMs: number[];
  totalDurationMs: number;
}

const VELOCITY_EPSILON = 0.0001;

function getPlaybackStripAnimationData(
  chordLayoutData: PlaybackStripLayoutData | null,
): PlaybackStripAnimationData | null {
  if (!chordLayoutData) return null;

  const chordCount = Math.min(
    chordLayoutData.scrollPositions.length,
    chordLayoutData.durations.length,
  );

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

function getTranslateXFromTransform(transform: string): number | null {
  if (!transform || transform === "none") return 0;

  const matrixMatch = /^matrix\((.+)\)$/.exec(transform);
  if (matrixMatch) {
    const values = matrixMatch[1]!.split(",").map((value) => Number(value.trim()));
    return Number.isFinite(values[4]) ? values[4]! : null;
  }

  const matrix3dMatch = /^matrix3d\((.+)\)$/.exec(transform);
  if (matrix3dMatch) {
    const values = matrix3dMatch[1]!
      .split(",")
      .map((value) => Number(value.trim()));
    return Number.isFinite(values[12]) ? values[12]! : null;
  }

  return null;
}

function usePlaybackStripAnimation({
  stripRef,
  chordLayoutData,
  currentChordIndex,
  currentRepetition,
  audioContext,
  playbackStartedAtAudioTime,
  playing,
  onPauseTransform,
}: UsePlaybackStripAnimationArgs) {
  const animationRef = useRef<Animation | null>(null);
  const animationGenerationRef = useRef(0);
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
    const currentAnimation = animationRef.current;
    const animatedElement = stripRef.current;

    if (currentAnimation) {
      if (!playing && animatedElement && onPauseTransform) {
        const computedTransform = window.getComputedStyle(animatedElement).transform;
        const translateX = getTranslateXFromTransform(computedTransform);
        if (translateX !== null) {
          onPauseTransform(Math.abs(translateX));
        }
      }

      currentAnimation.onfinish = null;
      currentAnimation.cancel();
      animationRef.current = null;
    }

    animationGenerationRef.current += 1;

    if (
      !playing ||
      !chordLayoutData ||
      !animationData ||
      animationData.totalDurationMs <= 0 ||
      !audioContext ||
      playbackStartedAtAudioTime === null
    ) {
      return;
    }

    const generation = animationGenerationRef.current;
    const clampedAnchorIndex = Math.min(
      Math.max(anchorChordIndexRef.current, 0),
      animationData.chordCount - 1,
    );

    const anchorStartTimeMs =
      animationData.cumulativeChordTimesMs[clampedAnchorIndex] ?? 0;
    const elapsedSincePlaybackStartMs = Math.max(
      0,
      (audioContext.currentTime - playbackStartedAtAudioTime) * 1000,
    );
    const totalElapsedMs = anchorStartTimeMs + elapsedSincePlaybackStartMs;
    const completedLoops = Math.floor(
      totalElapsedMs / animationData.totalDurationMs,
    );
    const initialCurrentTimeMs = totalElapsedMs % animationData.totalDurationMs;

    // Use the audio clock as the anchor so occasional JS timer jitter on mobile
    // does not force visible snaps in the strip animation.
    repetitionBaseRef.current =
      (anchorRepetitionRef.current + completedLoops) *
      chordLayoutData.totalWidth;

    const startAnimation = (startTimeMs: number) => {
      const animatedElement = stripRef.current;
      if (!animatedElement) return;

      const animation = animatedElement.animate(
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
      animation.onfinish = () => {
        if (
          generation !== animationGenerationRef.current ||
          !playingRef.current
        ) {
          return;
        }

        repetitionBaseRef.current += chordLayoutData.totalWidth;
        startAnimation(0);
      };

      animation.play();
      animationRef.current = animation;
    };

    startAnimation(initialCurrentTimeMs);

    return () => {
      const activeAnimation = animationRef.current;
      if (activeAnimation) {
        activeAnimation.onfinish = null;
        activeAnimation.cancel();
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
    onPauseTransform,
    stripRef,
  ]);
}

export default usePlaybackStripAnimation;
