import { memo } from "react";
import PlaybackVisibleChords from "~/components/Tab/Playback/PlaybackVisibleChords";
import usePlaybackStripAnimation from "~/hooks/usePlaybackStripAnimation";
import {
  type PlaybackLoopDelaySpacerChord,
  type PlaybackStrummedChord,
  type PlaybackTabChord,
  getTabStoreState,
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
  scrollContainerTransform: string;
  currentRepetition: number;
  initialPlaceholderWidth: number;
  expandedTabData: (
    | PlaybackTabChord
    | PlaybackStrummedChord
    | PlaybackLoopDelaySpacerChord
  )[];
  chordRepetitions: number[];
  loopDelay: number;
  playbackSpeed: number;
  renderChord: (props: {
    chord:
      | PlaybackTabChord
      | PlaybackStrummedChord
      | PlaybackLoopDelaySpacerChord;
    index: number;
    prevChord?:
      | PlaybackTabChord
      | PlaybackStrummedChord
      | PlaybackLoopDelaySpacerChord;
    nextChord?:
      | PlaybackTabChord
      | PlaybackStrummedChord
      | PlaybackLoopDelaySpacerChord;
    isFirstChordInSection: boolean;
    isDimmed: boolean;
    isHighlighted: boolean;
  }) => React.ReactNode;
}

const PlaybackAnimatedStrip = memo(function PlaybackAnimatedStrip({
  chordLayoutData,
  playing,
  scrollContainerTransform,
  currentRepetition,
  initialPlaceholderWidth,
  expandedTabData,
  chordRepetitions,
  loopDelay,
  playbackSpeed,
  renderChord,
}: PlaybackAnimatedStrip) {
  const scrollStripRef = useRef<HTMLDivElement | null>(null);

  const audioContext = useTabStore((state) => state.audioContext);
  const playbackStartedAtAudioTime = useTabStore(
    (state) => state.playbackStartedAtAudioTime,
  );

  usePlaybackStripAnimation({
    stripRef: scrollStripRef,
    chordLayoutData,
    currentChordIndex: getTabStoreState().currentChordIndex,
    currentRepetition,
    audioContext,
    playbackStartedAtAudioTime,
    playing,
  });

  return (
    <div
      ref={scrollStripRef}
      style={{
        width: `${chordLayoutData.totalWidth}px`,
        transform: playing ? "" : scrollContainerTransform,
        transition: playing ? "none" : "transform 0.2s linear",
      }}
      className="relative flex items-center will-change-transform [contain:layout_style]"
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
      />
    </div>
  );
});

export default PlaybackAnimatedStrip;
