import { useEffect, useRef } from "react";
import { getElapsedPlaybackMs } from "~/utils/playbackAudioClock";

interface PlaybackAudioProgressLayout {
  durations: number[];
}

function getCumulativeChordTimesSeconds(durations: number[]) {
  const cumulativeTimes = [0];

  for (const duration of durations) {
    cumulativeTimes.push(
      (cumulativeTimes[cumulativeTimes.length - 1] ?? 0) +
        Math.max(0, duration),
    );
  }

  return cumulativeTimes;
}

function usePlaybackAudioProgressDomSync({
  enabled,
  audioContext,
  playbackStartedAtAudioTime,
  chordDurations,
  anchorChordIndex,
  trackElementId,
  thumbElementId,
  maxIndex,
}: {
  enabled: boolean;
  audioContext: AudioContext | null;
  playbackStartedAtAudioTime: number | null;
  chordDurations: number[];
  anchorChordIndex: number;
  trackElementId: string;
  thumbElementId: string;
  maxIndex: number;
}) {
  const anchorChordIndexRef = useRef(anchorChordIndex);
  const cumulativeTimesRef = useRef<number[]>([0]);
  const totalDurationRef = useRef(0);
  const wasEnabledRef = useRef(false);

  useEffect(() => {
    const cumulativeTimes = getCumulativeChordTimesSeconds(chordDurations);
    cumulativeTimesRef.current = cumulativeTimes;
    totalDurationRef.current =
      cumulativeTimes[cumulativeTimes.length - 1] ?? 0;
  }, [chordDurations]);

  useEffect(() => {
    if (enabled && !wasEnabledRef.current) {
      anchorChordIndexRef.current = anchorChordIndex;
    }

    wasEnabledRef.current = enabled;
  }, [enabled, anchorChordIndex]);

  useEffect(() => {
    if (
      !enabled ||
      !audioContext ||
      playbackStartedAtAudioTime === null ||
      totalDurationRef.current <= 0 ||
      maxIndex <= 0
    ) {
      return;
    }

    let rafId = 0;

    const updateProgressDom = () => {
      const track = document.getElementById(trackElementId);
      const thumb = document.getElementById(thumbElementId);

      const anchorStartSeconds =
        cumulativeTimesRef.current[anchorChordIndexRef.current] ?? 0;
      const elapsedSeconds =
        getElapsedPlaybackMs({
          audioContext,
          playbackStartedAtAudioTime,
        }) / 1000;
      const totalDurationSeconds = totalDurationRef.current;
      const totalElapsedSeconds = anchorStartSeconds + elapsedSeconds;
      const wrappedElapsed =
        ((totalElapsedSeconds % totalDurationSeconds) + totalDurationSeconds) %
        totalDurationSeconds;
      const progress = wrappedElapsed / totalDurationSeconds;

      if (track) {
        track.style.transform = `scaleX(${progress})`;
      }

      if (thumb) {
        const trackContainer = track?.parentElement?.parentElement;
        const trackWidth = trackContainer?.clientWidth ?? 0;
        const thumbOffset = progress * trackWidth;
        thumb.style.transform = `translate(${thumbOffset - 9}px, -5px)`;
      }

      rafId = requestAnimationFrame(updateProgressDom);
    };

    rafId = requestAnimationFrame(updateProgressDom);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [
    enabled,
    audioContext,
    playbackStartedAtAudioTime,
    maxIndex,
    trackElementId,
    thumbElementId,
  ]);
}

export default usePlaybackAudioProgressDomSync;
