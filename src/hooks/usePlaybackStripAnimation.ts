import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";

// WAAPI owns `transform` while playback is running, but React owns the inline
// `transform` while paused/scrubbing. Calling `animation.cancel()` immediately
// removes the WAAPI-computed transform, so the strip can snap back to React's
// last inline transform. With virtualized/repeated chord content, that snap can
// land on an empty/out-of-range repetition and make the tab appear to disappear.
//
// Before canceling, we snapshot the current computed transform into the element's
// inline style so the visual position survives the WAAPI -> React handoff.
// We also cancel every animation created by this hook, because finished animations
// with `fill: "both"` can otherwise keep stale transforms alive and resurface
// when the active animation is canceled.

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
  audioContext,
  playbackStartedAtAudioTime,
  playing,
}: UsePlaybackStripAnimationArgs) {
  const animationRef = useRef<Animation | null>(null);
  const animationsRef = useRef<Set<Animation>>(new Set());
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
    cancelPlaybackStripAnimations({
      animations: animationsRef.current,
      animatedElement: stripRef.current,
      preserveTransform: true,
    });

    animationRef.current = null;

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

      animationsRef.current.add(animation);

      animation.onfinish = () => {
        if (
          generation !== animationGenerationRef.current ||
          !playingRef.current
        ) {
          animation.onfinish = null;
          animationsRef.current.delete(animation);

          if (animationRef.current === animation) {
            animationRef.current = null;
          }

          animation.cancel();

          return;
        }

        animation.onfinish = null;
        animationsRef.current.delete(animation);

        if (animationRef.current === animation) {
          animationRef.current = null;
        }

        // This animation used fill: "both". If we leave it alive, it can
        // resurface later when the next animation is canceled during pause.
        animation.cancel();

        repetitionBaseRef.current += chordLayoutData.totalWidth;
        startAnimation(0);
      };

      animation.play();
      animationRef.current = animation;
    };

    startAnimation(initialCurrentTimeMs);

    return () => {
      cancelPlaybackStripAnimations({
        animations: animationsRef.current,
        animatedElement: stripRef.current,
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
