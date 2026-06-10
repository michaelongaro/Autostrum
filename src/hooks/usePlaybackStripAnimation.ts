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
  playing: boolean;
}

interface PlaybackStripAnimationData {
  chordCount: number;
  cumulativeChordTimesMs: number[];
  totalDurationMs: number;
}

const DRIFT_CORRECTION_THRESHOLD_MS = 125;
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

function usePlaybackStripAnimation({
  stripRef,
  chordLayoutData,
  currentChordIndex,
  currentRepetition,
  playing,
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
    if (currentAnimation) {
      currentAnimation.onfinish = null;
      currentAnimation.cancel();
      animationRef.current = null;
    }

    animationGenerationRef.current += 1;

    if (
      !playing ||
      !chordLayoutData ||
      !animationData ||
      animationData.totalDurationMs <= 0
    ) {
      return;
    }

    const generation = animationGenerationRef.current;
    const clampedAnchorIndex = Math.min(
      Math.max(anchorChordIndexRef.current, 0),
      animationData.chordCount - 1,
    );

    repetitionBaseRef.current =
      anchorRepetitionRef.current * chordLayoutData.totalWidth;

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

    startAnimation(
      animationData.cumulativeChordTimesMs[clampedAnchorIndex] ?? 0,
    );

    return () => {
      const activeAnimation = animationRef.current;
      if (activeAnimation) {
        activeAnimation.onfinish = null;
        activeAnimation.cancel();
        animationRef.current = null;
      }

      animationGenerationRef.current += 1;
    };
  }, [animationData, chordLayoutData, playing, stripRef]);

  useEffect(() => {
    if (!playing || !animationData) return;

    const animation = animationRef.current;
    if (!animation) return;

    const clampedChordIndex = Math.min(
      Math.max(currentChordIndex, 0),
      animationData.chordCount - 1,
    );
    const currentTimeMs = animation.currentTime;

    if (typeof currentTimeMs !== "number") return;

    if (
      clampedChordIndex === 0 &&
      currentTimeMs >=
        animationData.totalDurationMs - DRIFT_CORRECTION_THRESHOLD_MS
    ) {
      return;
    }

    const expectedTimeMs =
      animationData.cumulativeChordTimesMs[clampedChordIndex] ?? 0;

    if (
      Math.abs(currentTimeMs - expectedTimeMs) > DRIFT_CORRECTION_THRESHOLD_MS
    ) {
      animation.currentTime = expectedTimeMs;
    }
  }, [animationData, currentChordIndex, playing]);
}

export default usePlaybackStripAnimation;
