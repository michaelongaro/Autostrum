import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  PlaybackStripDriver,
  createAudioContextClock,
} from "~/hooks/playbackStripDriver";

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
  /**
   * Test seam. Production callers leave this unset. The anchor captured for a
   * play session is the chord index from the render that set
   * `playbackStartedAtAudioTime`, not the index advancing during playback.
   */
  driverRef?: RefObject<PlaybackStripDriver | null>;
  /** Test seam. Production uses the long default horizon. */
  segmentTargetMs?: number;
}

const MAX_TIMELINE_RETRIES = 30;

function usePlaybackStripAnimation({
  stripRef,
  chordLayoutData,
  currentChordIndex,
  currentRepetition,
  audioContext,
  playbackStartedAtAudioTime,
  playing,
  scrollPositionRef,
  driverRef,
  segmentTargetMs,
}: UsePlaybackStripAnimationArgs) {
  const latestChordIndexRef = useRef(currentChordIndex);
  const latestRepetitionRef = useRef(currentRepetition);
  const anchorChordIndexRef = useRef(currentChordIndex);
  const anchorRepetitionRef = useRef(currentRepetition);
  const capturedStartTokenRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    latestChordIndexRef.current = currentChordIndex;
    latestRepetitionRef.current = currentRepetition;
  });

  useLayoutEffect(() => {
    if (!playing || playbackStartedAtAudioTime === null) {
      capturedStartTokenRef.current = null;
      return;
    }

    // Re-capture only when playback (re)starts. Layout changes restart the
    // driver below without retargeting the anchor, so elapsed audio time stays
    // in the same coordinate system.
    if (capturedStartTokenRef.current !== playbackStartedAtAudioTime) {
      capturedStartTokenRef.current = playbackStartedAtAudioTime;
      anchorChordIndexRef.current = latestChordIndexRef.current;
      anchorRepetitionRef.current = latestRepetitionRef.current;
    }
  }, [playbackStartedAtAudioTime, playing]);

  useLayoutEffect(() => {
    if (driverRef) driverRef.current = null;

    if (
      !playing ||
      playbackStartedAtAudioTime === null ||
      !audioContext ||
      !chordLayoutData
    ) {
      return;
    }

    const anchorChordIndex = anchorChordIndexRef.current;
    const anchorRepetition = anchorRepetitionRef.current;
    const startedAtAudioTime = playbackStartedAtAudioTime;
    let driver: PlaybackStripDriver | null = null;
    let retryId: number | null = null;
    let retries = 0;
    let cancelled = false;

    const clearRetry = () => {
      if (retryId !== null) {
        cancelAnimationFrame(retryId);
        retryId = null;
      }
    };

    const tryStart = () => {
      if (cancelled) return;

      const element = stripRef.current;
      if (!element) {
        if (retries < MAX_TIMELINE_RETRIES) {
          retries += 1;
          retryId = requestAnimationFrame(tryStart);
        }
        return;
      }

      driver?.stop();
      driver = new PlaybackStripDriver({
        element,
        layout: chordLayoutData,
        anchorChordIndex,
        anchorRepetition,
        playbackStartedAtAudioTime: startedAtAudioTime,
        clock: createAudioContextClock(audioContext),
        onScrollPosition: (positionPx) => {
          if (scrollPositionRef) scrollPositionRef.current = positionPx;
        },
        segmentTargetMs,
      });

      const started = driver.start();
      if (driverRef) driverRef.current = started ? driver : null;

      if (!started && retries < MAX_TIMELINE_RETRIES) {
        retries += 1;
        retryId = requestAnimationFrame(tryStart);
      }
    };

    tryStart();

    return () => {
      cancelled = true;
      clearRetry();
      driver?.stop();
      driver = null;
      if (driverRef) driverRef.current = null;
    };
  }, [
    audioContext,
    chordLayoutData,
    driverRef,
    playbackStartedAtAudioTime,
    playing,
    scrollPositionRef,
    segmentTargetMs,
    stripRef,
  ]);
}

export default usePlaybackStripAnimation;
