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
  /** When true, glide scrub owns transform; React must not overwrite it. */
  isGlideScrubbing?: boolean;
  scrubPositionRef?: React.RefObject<number>;
  stripRef?: React.RefObject<HTMLDivElement | null>;
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

// React Compiler escape hatch: custom compare intentionally ignores
// currentChordIndex/scrollContainerTransform/currentRepetition while playing
// so rAF owns transform without per-chord React re-renders.
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
    isGlideScrubbing = false,
    scrubPositionRef: externalScrubPositionRef,
    stripRef: externalStripRef,
    renderChord,
  }: PlaybackAnimatedStrip) {
    const internalStripRef = useRef<HTMLDivElement | null>(null);
    const internalScrollPositionRef = useRef(0);
    const scrollStripRef = externalStripRef ?? internalStripRef;
    const scrollPositionRef =
      externalScrubPositionRef ?? internalScrollPositionRef;

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

    // While paused, React owns transform for scrubbing. On the paused→playing
    // edge, pin the current transform so React does not clear it to identity
    // for a frame before rAF takes ownership. While playing, do not write
    // transform from React or it will fight the continuous scroll.
    // While glide-scrubbing, re-apply the scrub position after React commits
    // so highlight-driven re-renders cannot clear the inline transform.
    useLayoutEffect(() => {
      const stripElement = scrollStripRef.current;
      if (!stripElement) return;

      if (isGlideScrubbing) {
        stripElement.style.transition = "none";
        stripElement.style.transform = `translate3d(${scrollPositionRef.current * -1}px, 0, 0)`;
        return;
      }

      if (!playing) {
        // Avoid retaining a speculative compositor layer between sessions.
        // The animation hook promotes and synchronously primes a fresh 3D
        // transform layer on the next paused→playing edge.
        stripElement.style.backfaceVisibility = "";
        stripElement.style.webkitBackfaceVisibility = "";
        stripElement.style.transform = scrollContainerTransform;
        return;
      }

      // Pin whatever is currently painted (inline or mid-CSS-transition scrub)
      // so the play handoff never flashes identity before rAF reseeds.
      if (!stripElement.style.transform) {
        const computedTransform =
          window.getComputedStyle(stripElement).transform;
        stripElement.style.transition = "none";
        stripElement.style.transform =
          computedTransform === "none"
            ? scrollContainerTransform
            : computedTransform;
      }
    }, [
      isGlideScrubbing,
      playing,
      scrollContainerTransform,
      scrollPositionRef,
      scrollStripRef,
    ]);

    const reactOwnsTransform = !playing && !isGlideScrubbing;

    return (
      <div
        ref={scrollStripRef}
        style={{
          width: `${chordLayoutData.totalWidth}px`,
          // Omit transform while playing/glide-scrubbing so React cannot clear
          // the imperative inline value. While paused (discrete scrub), React
          // drives scrubbing via currentChordIndex.
          ...(reactOwnsTransform
            ? { transform: scrollContainerTransform }
            : {}),
          transition: reactOwnsTransform ? "transform 0.1s linear" : "none",
        }}
        className="relative flex items-center"
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
    if (previousProps.isGlideScrubbing !== nextProps.isGlideScrubbing) {
      return false;
    }
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

    // During glide scrubbing, still re-render on chord index so highlights
    // track the playhead, but transform stays imperative.
    return (
      previousProps.currentChordIndex === nextProps.currentChordIndex &&
      previousProps.scrollContainerTransform ===
        nextProps.scrollContainerTransform &&
      previousProps.currentRepetition === nextProps.currentRepetition
    );
  },
);

export default PlaybackAnimatedStrip;
