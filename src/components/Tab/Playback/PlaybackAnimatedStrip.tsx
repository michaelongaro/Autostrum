import { memo, useLayoutEffect, useRef } from "react";
import PlaybackVisibleChords from "~/components/Tab/Playback/PlaybackVisibleChords";
import usePlaybackStripAnimation from "~/hooks/usePlaybackStripAnimation";
import {
  type PlaybackLoopDelaySpacerChord,
  type PlaybackStrummedChord,
  type PlaybackTabChord,
  useTabStore,
} from "~/stores/TabStore";

interface ChordLayoutData {
  scrollPositions: number[];
  chordWidths: number[];
  totalWidth: number;
  durations: number[];
  virtualizationIndex: number;
  virtualizationStartIndex: number;
  virtualizationCatchupIndex: number;
}

interface PlaybackAnimatedStrip {
  chordLayoutData: ChordLayoutData;
  playing: boolean;
  currentChordIndex: number;
  scrollContainerTransform: string;
  currentRepetition: number;
  initialPlaceholderWidth: number;
  expandedTabData: (
    PlaybackTabChord | PlaybackStrummedChord | PlaybackLoopDelaySpacerChord
  )[];
  chordRepetitions: number[];
  loopDelay: number;
  playbackSpeed: number;
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

const PlaybackAnimatedStrip = memo(
  function PlaybackAnimatedStrip({
    chordLayoutData,
    playing,
    currentChordIndex,
    scrollContainerTransform,
    currentRepetition,
    initialPlaceholderWidth,
    expandedTabData,
    chordRepetitions,
    loopDelay,
    // v still used in memo comparison
    playbackSpeed, // eslint-disable-line @typescript-eslint/no-unused-vars
    renderChord,
  }: PlaybackAnimatedStrip) {
    const scrollStripRef = useRef<HTMLDivElement | null>(null);
    const scrollPositionRef = useRef(0);

    const audioContext = useTabStore((state) => state.audioContext);
    const playbackStartedAtAudioTime = useTabStore(
      (state) => state.playbackStartedAtAudioTime,
    );

    usePlaybackStripAnimation({
      stripRef: scrollStripRef,
      chordLayoutData,
      currentChordIndex,
      currentRepetition,
      audioContext,
      playbackStartedAtAudioTime,
      playing,
      scrollPositionRef,
    });

    // While paused, React owns transform for scrubbing. While playing, the
    // animation hook owns it via rAF — do not write transform from React or it
    // will fight the continuous scroll and hitch on re-render.
    useLayoutEffect(() => {
      const stripElement = scrollStripRef.current;
      if (!stripElement || playing) return;

      stripElement.style.transform = scrollContainerTransform;
    }, [playing, scrollContainerTransform]);

    return (
      <div
        ref={scrollStripRef}
        style={{
          width: `${chordLayoutData.totalWidth}px`,
          // While playing, leave transform undefined so React does not manage it
          // (rAF owns the property). While paused, React drives scrubbing.
          transform: playing ? undefined : scrollContainerTransform,
          transition: playing ? "none" : "transform 0.2s linear",
        }}
        className="relative flex items-center will-change-transform"
      >
        <div
          style={{
            position: "absolute",
            zIndex: 2,
            backgroundColor: "transparent",
            left: 0,
            width: `${initialPlaceholderWidth}px`,
          }}
        />
        <PlaybackVisibleChords
          chordLayoutData={chordLayoutData}
          expandedTabData={expandedTabData}
          chordRepetitions={chordRepetitions}
          initialPlaceholderWidth={initialPlaceholderWidth}
          loopDelay={loopDelay}
          renderChord={renderChord}
          scrollPositionRef={scrollPositionRef}
        />
      </div>
    );
  },
  (previousProps, nextProps) => {
    if (previousProps.playing !== nextProps.playing) return false;
    if (previousProps.chordLayoutData !== nextProps.chordLayoutData) {
      return false;
    }
    if (previousProps.expandedTabData !== nextProps.expandedTabData) {
      return false;
    }
    if (previousProps.chordRepetitions !== nextProps.chordRepetitions) {
      return false;
    }
    if (
      previousProps.initialPlaceholderWidth !==
      nextProps.initialPlaceholderWidth
    ) {
      return false;
    }
    if (previousProps.renderChord !== nextProps.renderChord) return false;
    if (previousProps.loopDelay !== nextProps.loopDelay) return false;
    if (previousProps.playbackSpeed !== nextProps.playbackSpeed) return false;

    // During playback the strip should stay mounted without per-chord re-renders.
    if (nextProps.playing) {
      return true;
    }

    return (
      previousProps.currentChordIndex === nextProps.currentChordIndex &&
      previousProps.scrollContainerTransform ===
        nextProps.scrollContainerTransform &&
      previousProps.currentRepetition === nextProps.currentRepetition
    );
  },
);

export default PlaybackAnimatedStrip;
