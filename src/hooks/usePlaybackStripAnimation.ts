import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";

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

function preserveCurrentTransform(animatedElement: HTMLElement) {
  const computedTransform = window.getComputedStyle(animatedElement).transform;

  animatedElement.style.transform =
    computedTransform === "none" ? "" : computedTransform;
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

function findChordSegmentIndex({
  cumulativeChordTimesMs,
  chordCount,
  loopTimeMs,
}: {
  cumulativeChordTimesMs: number[];
  chordCount: number;
  loopTimeMs: number;
}) {
  let low = 0;
  let high = chordCount - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const startMs = cumulativeChordTimesMs[mid] ?? 0;
    const endMs = cumulativeChordTimesMs[mid + 1] ?? startMs;

    if (loopTimeMs < startMs) {
      high = mid - 1;
    } else if (loopTimeMs >= endMs) {
      low = mid + 1;
    } else {
      return mid;
    }
  }

  return Math.max(0, Math.min(chordCount - 1, low));
}

function getPlaybackStripTranslateX({
  chordLayoutData,
  animationData,
  baseRepetitionPx,
  totalElapsedMs,
}: {
  chordLayoutData: PlaybackStripLayoutData;
  animationData: PlaybackStripAnimationData;
  baseRepetitionPx: number;
  totalElapsedMs: number;
}) {
  const { chordCount, cumulativeChordTimesMs, totalDurationMs } = animationData;

  if (totalDurationMs <= 0) {
    const startPosition = chordLayoutData.scrollPositions[0] ?? 0;
    return (startPosition + baseRepetitionPx) * -1;
  }

  const completedLoops = Math.floor(totalElapsedMs / totalDurationMs);
  const loopTimeMs = normalizeModulo(totalElapsedMs, totalDurationMs);

  const segmentIndex = findChordSegmentIndex({
    cumulativeChordTimesMs,
    chordCount,
    loopTimeMs,
  });

  const segmentStartMs = cumulativeChordTimesMs[segmentIndex] ?? 0;
  const segmentEndMs =
    cumulativeChordTimesMs[segmentIndex + 1] ?? segmentStartMs;

  const segmentDurationMs = segmentEndMs - segmentStartMs;

  const startPosition = chordLayoutData.scrollPositions[segmentIndex] ?? 0;
  const endPosition =
    segmentIndex === chordCount - 1
      ? chordLayoutData.totalWidth
      : (chordLayoutData.scrollPositions[segmentIndex + 1] ?? startPosition);

  const progress =
    segmentDurationMs <= 0
      ? 1
      : Math.max(
          0,
          Math.min(1, (loopTimeMs - segmentStartMs) / segmentDurationMs),
        );

  const interpolatedPosition =
    startPosition + (endPosition - startPosition) * progress;

  const repetitionOffsetPx =
    baseRepetitionPx + completedLoops * chordLayoutData.totalWidth;

  return (interpolatedPosition + repetitionOffsetPx) * -1;
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
  const rafIdRef = useRef<number | null>(null);
  const playingRef = useRef(playing);
  const anchorChordIndexRef = useRef(currentChordIndex);
  const anchorRepetitionRef = useRef(currentRepetition);

  const animationData = useMemo(
    () => getPlaybackStripAnimationData(chordLayoutData),
    [chordLayoutData],
  );

  useLayoutEffect(() => {
    anchorChordIndexRef.current = currentChordIndex;
    anchorRepetitionRef.current = currentRepetition;
  }, [currentChordIndex, currentRepetition]);

  useLayoutEffect(() => {
    playingRef.current = playing;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const animatedElement = stripRef.current;

    if (!playing) {
      if (animatedElement) {
        preserveCurrentTransform(animatedElement);
      }

      return;
    }

    if (
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

    const normalizedAnchorChordIndex = normalizeModulo(
      rawAnchorChordIndex,
      animationData.chordCount,
    );

    const extraAnchorLoops = Math.floor(
      rawAnchorChordIndex / animationData.chordCount,
    );

    const anchorStartTimeMs =
      animationData.cumulativeChordTimesMs[normalizedAnchorChordIndex] ?? 0;

    const baseRepetitionPx =
      (anchorRepetitionRef.current + extraAnchorLoops) *
      chordLayoutData.totalWidth;

    const renderFrame = () => {
      if (!playingRef.current) return;

      const elapsedSincePlaybackStartMs = Math.max(
        0,
        (audioContext.currentTime - playbackStartedAtAudioTime) * 1000,
      );

      const totalElapsedMs = anchorStartTimeMs + elapsedSincePlaybackStartMs;

      const translateX = getPlaybackStripTranslateX({
        chordLayoutData,
        animationData,
        baseRepetitionPx,
        totalElapsedMs,
      });

      animatedElement.style.transform = `translateX(${translateX}px)`;

      rafIdRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      if (animatedElement) {
        preserveCurrentTransform(animatedElement);
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
