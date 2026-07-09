import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  type PlaybackLoopDelaySpacerChord,
  type PlaybackStrummedChord,
  type PlaybackTabChord,
  useTabStore,
} from "~/stores/TabStore";

/** Extra pixels beyond the viewport for chord mount/unmount hysteresis. */
const VIRTUALIZATION_BUFFER = 100;

/**
 * While playing, refresh the visibility window from the rAF scroll position
 * at this interval so we are not tied to the 25ms-polled currentChordIndex
 * (which lags the strip at loop wraps).
 */
const PLAYING_VISIBILITY_REFRESH_MS = 100;

interface ChordLayoutData {
  scrollPositions: number[];
  chordWidths: number[];
  totalWidth: number;
  durations: number[];
}

interface PlaybackVisibleChords {
  chordLayoutData: ChordLayoutData;
  expandedTabData: (
    PlaybackTabChord | PlaybackStrummedChord | PlaybackLoopDelaySpacerChord
  )[];
  chordRepetitions: number[];
  initialPlaceholderWidth: number;
  loopDelay: number;
  scrollPositionRef?: React.RefObject<number>;
  renderChord: (props: {
    chord:
      PlaybackTabChord | PlaybackStrummedChord | PlaybackLoopDelaySpacerChord;
    index: number;
    prevChord?:
      PlaybackTabChord | PlaybackStrummedChord | PlaybackLoopDelaySpacerChord;
    nextChord?:
      PlaybackTabChord | PlaybackStrummedChord | PlaybackLoopDelaySpacerChord;
    isFirstChordInSection: boolean;
    isDimmed: boolean;
    isHighlighted: boolean;
  }) => React.ReactNode;
}

const PlaybackVisibleChords = memo(function PlaybackVisibleChords({
  chordLayoutData,
  expandedTabData,
  chordRepetitions,
  initialPlaceholderWidth,
  loopDelay,
  scrollPositionRef,
  renderChord,
}: PlaybackVisibleChords) {
  const {
    currentChordIndex,
    audioMetadata,
    currentlyPlayingMetadata,
    visiblePlaybackContainerWidth,
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    audioMetadata: state.audioMetadata,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    visiblePlaybackContainerWidth: state.visiblePlaybackContainerWidth,
  }));

  // Throttled mirror of the rAF scroll position for visibility culling while
  // playing. Avoids depending on lagged currentChordIndex at loop wraps.
  const [playingScrollPosition, setPlayingScrollPosition] = useState(0);

  useEffect(() => {
    if (!audioMetadata.playing || !scrollPositionRef) {
      return;
    }

    setPlayingScrollPosition(scrollPositionRef.current);

    const intervalId = window.setInterval(() => {
      setPlayingScrollPosition(scrollPositionRef.current);
    }, PLAYING_VISIBILITY_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [audioMetadata.playing, scrollPositionRef]);

  const getChordScrollPosition = useCallback(
    (index: number) => {
      const { scrollPositions, totalWidth } = chordLayoutData;
      return (
        (scrollPositions[index] ?? 0) +
        (chordRepetitions[index] ?? 0) * totalWidth
      );
    },
    [chordLayoutData, chordRepetitions],
  );

  const isChordHighlighted = useCallback(
    (chordIndex: number): boolean => {
      if (!currentlyPlayingMetadata || chordRepetitions.length === 0) {
        return false;
      }

      if (currentChordIndex === chordIndex && audioMetadata.playing) {
        return true;
      }

      const chordRep = chordRepetitions[chordIndex] ?? 0;
      const currentRep = chordRepetitions[currentChordIndex] ?? 0;

      if (chordRep < currentRep) {
        return true;
      }

      if (chordRep === currentRep && chordIndex < currentChordIndex) {
        return true;
      }

      return false;
    },
    [
      currentlyPlayingMetadata,
      currentChordIndex,
      chordRepetitions,
      audioMetadata.playing,
    ],
  );

  const visibleChords = useMemo(() => {
    const { scrollPositions, chordWidths, totalWidth } = chordLayoutData;

    const currentPosition = audioMetadata.playing
      ? playingScrollPosition
      : (scrollPositions[currentChordIndex] ?? 0) +
        (chordRepetitions[currentChordIndex] ?? 0) * totalWidth;

    const dynamicVirtualizationBuffer = audioMetadata.playing
      ? VIRTUALIZATION_BUFFER
      : VIRTUALIZATION_BUFFER * 10;

    const halfViewport = visiblePlaybackContainerWidth / 2;

    const minVisiblePosition =
      currentPosition - halfViewport - dynamicVirtualizationBuffer;

    const maxVisiblePosition =
      currentPosition + halfViewport + dynamicVirtualizationBuffer;

    return expandedTabData.flatMap((chord, index) => {
      const left =
        (scrollPositions[index] ?? 0) +
        (chordRepetitions[index] ?? 0) * totalWidth;
      const right = left + (chordWidths[index] ?? 0);

      if (right < minVisiblePosition || left > maxVisiblePosition) {
        return [];
      }

      return [
        {
          chord,
          index,
          prevChord: expandedTabData[index - 1],
          nextChord: expandedTabData[index + 1],
        },
      ];
    });
  }, [
    expandedTabData,
    chordLayoutData,
    currentChordIndex,
    chordRepetitions,
    visiblePlaybackContainerWidth,
    audioMetadata.playing,
    playingScrollPosition,
  ]);

  return (
    <>
      {visibleChords.map(({ chord, index, prevChord, nextChord }) => {
        const isDimmed =
          audioMetadata.editingLoopRange &&
          (index < audioMetadata.startLoopIndex ||
            (audioMetadata.endLoopIndex !== -1 &&
              index > audioMetadata.endLoopIndex));

        const isFirstChordInSection =
          index === 0 && (loopDelay !== 0 || (chordRepetitions[0] ?? 0) === 0);

        return (
          <div
            // Stable key: remounting on chordRepetitions changes caused loop
            // hitches when virtualization bumped repetition counts.
            key={index}
            style={{
              position: "absolute",
              width: `${chordLayoutData.chordWidths[index] ?? 0}px`,
              left: `${getChordScrollPosition(index) + initialPlaceholderWidth}px`,
            }}
          >
            {renderChord({
              chord,
              index,
              prevChord,
              nextChord,
              isFirstChordInSection,
              isDimmed,
              isHighlighted:
                !audioMetadata.editingLoopRange && isChordHighlighted(index),
            })}
          </div>
        );
      })}
    </>
  );
});

export default PlaybackVisibleChords;
