import { useLayoutEffect, useMemo, useState, type RefObject } from "react";
import {
  type PlaybackLoopDelaySpacerChord,
  type PlaybackStrummedChord,
  type PlaybackTabChord,
  useTabStore,
} from "~/stores/TabStore";
import { isLoopRangeChordDimmed } from "~/utils/loopRangeHelpers";
import {
  closestPlaybackChordPosition,
  playbackOverscanPx,
  visiblePlaybackCopies,
  type PlaybackViewportLayout,
} from "~/utils/playbackViewport";

interface PlaybackVisibleChords {
  chordLayoutData: PlaybackViewportLayout;
  expandedTabData: (
    PlaybackTabChord | PlaybackStrummedChord | PlaybackLoopDelaySpacerChord
  )[];
  chordRepetitions: number[];
  initialPlaceholderWidth: number;
  loopDelay: number;
  scrollPositionRef: RefObject<number>;
  positionReaderRef: RefObject<(() => number | null) | null>;
  isGlideScrubbing: boolean;
  renderChord: (props: {
    chord:
      PlaybackTabChord | PlaybackStrummedChord | PlaybackLoopDelaySpacerChord;
    index: number;
    prevChord?:
      PlaybackTabChord | PlaybackStrummedChord | PlaybackLoopDelaySpacerChord;
    nextChord?:
      PlaybackTabChord | PlaybackStrummedChord | PlaybackLoopDelaySpacerChord;
    isFirstChordInTab: boolean;
    isLastChordInTab: boolean;
    isDimmed: boolean;
    isHighlighted: boolean;
  }) => React.ReactNode;
}

function PlaybackVisibleChords({
  chordLayoutData,
  expandedTabData,
  chordRepetitions,
  initialPlaceholderWidth,
  loopDelay,
  scrollPositionRef,
  positionReaderRef,
  isGlideScrubbing,
  renderChord,
}: PlaybackVisibleChords) {
  const {
    currentChordIndex,
    audioMetadata,
    currentlyPlayingMetadata,
    visiblePlaybackContainerWidth,
    draftLoopStartIndex,
    draftLoopEndIndex,
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    audioMetadata: state.audioMetadata,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    visiblePlaybackContainerWidth: state.visiblePlaybackContainerWidth,
    draftLoopStartIndex: state.draftLoopStartIndex,
    draftLoopEndIndex: state.draftLoopEndIndex,
  }));

  const { scrollPositions, totalWidth, chordWidths } = chordLayoutData;
  const pausedPosition =
    (scrollPositions[currentChordIndex] ?? 0) +
    (chordRepetitions[currentChordIndex] ?? 0) * totalWidth;
  const moving = audioMetadata.playing || isGlideScrubbing;
  const anchorPosition = moving ? null : pausedPosition;
  const overscan = useMemo(
    () => playbackOverscanPx(chordLayoutData),
    [chordLayoutData],
  );
  const [windowCenter, setWindowCenter] = useState(pausedPosition);

  useLayoutEffect(() => {
    let rafId = 0;
    const refresh = (force: boolean) => {
      const position = audioMetadata.playing
        ? (positionReaderRef.current?.() ?? scrollPositionRef.current)
        : (anchorPosition ?? scrollPositionRef.current);
      // Fresh timeline sampling is cheap. React only moves the mounted window
      // after consuming a third of its buffer, leaving headroom for the commit.
      setWindowCenter((previous) =>
        force || Math.abs(position - previous) >= overscan / 3
          ? position
          : previous,
      );
      if (moving) rafId = requestAnimationFrame(() => refresh(false));
    };
    refresh(true);
    return () => cancelAnimationFrame(rafId);
  }, [
    anchorPosition,
    audioMetadata.playing,
    chordLayoutData,
    moving,
    overscan,
    positionReaderRef,
    scrollPositionRef,
  ]);

  const center = anchorPosition ?? windowCenter;
  const visibleChords = useMemo(
    () =>
      visiblePlaybackCopies(
        chordLayoutData,
        center,
        visiblePlaybackContainerWidth,
        overscan,
      ),
    [chordLayoutData, center, visiblePlaybackContainerWidth, overscan],
  );
  const activePosition = closestPlaybackChordPosition(
    currentChordIndex,
    scrollPositions,
    totalWidth,
    center,
  );
  const activeRepetition =
    totalWidth > 0
      ? Math.round(
          (activePosition - (scrollPositions[currentChordIndex] ?? 0)) /
            totalWidth,
        )
      : 0;

  return (
    <>
      {visibleChords.map(({ index, repetition, left }) => {
        const chord = expandedTabData[index];
        if (!chord) return null;
        const isDimmed = audioMetadata.editingLoopRange
          ? isLoopRangeChordDimmed({
              index,
              draftStartIndex: draftLoopStartIndex,
              draftEndIndex: draftLoopEndIndex,
            })
          : false;
        const isHighlighted =
          !!currentlyPlayingMetadata &&
          !audioMetadata.editingLoopRange &&
          (repetition < activeRepetition ||
            (repetition === activeRepetition &&
              (index < currentChordIndex ||
                (index === currentChordIndex && audioMetadata.playing))));
        return (
          <div
            key={repetition + ":" + index}
            style={{
              position: "absolute",
              width: (chordWidths[index] ?? 0) + "px",
              left: left + initialPlaceholderWidth + "px",
            }}
          >
            {renderChord({
              chord,
              index,
              prevChord: expandedTabData[index - 1],
              nextChord: expandedTabData[index + 1],
              isFirstChordInTab:
                chord.isFirstChordInTab === true &&
                (loopDelay !== 0 || (index === 0 && repetition === 0)),
              isLastChordInTab:
                chord.isLastChordInTab === true && loopDelay !== 0,
              isDimmed,
              isHighlighted,
            })}
          </div>
        );
      })}
    </>
  );
}

export default PlaybackVisibleChords;
