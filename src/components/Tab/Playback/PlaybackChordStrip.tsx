import {
  Profiler,
  memo,
  useCallback,
  useEffect,
  useMemo,
  type ProfilerOnRenderCallback,
} from "react";
import PlaybackStrummedChord from "~/components/Tab/Playback/PlaybackStrummedChord";
import PlaybackTabChord from "~/components/Tab/Playback/PlaybackTabChord";
import PlaybackTabMeasureLine from "~/components/Tab/Playback/PlaybackTabMeasureLine";
import {
  type PlaybackTabChord as PlaybackTabChordType,
  type PlaybackStrummedChord as PlaybackStrummedChordType,
  type PlaybackLoopDelaySpacerChord,
  useTabStore,
  type FullNoteLengths,
} from "~/stores/TabStore";
import {
  getPlaybackStutterDevFlags,
  shouldOmitInlineTransformWhilePlaying,
} from "~/utils/playbackStutterDevFlags";
import {
  markPlaybackStutter,
  measurePlaybackStutter,
  startPlaybackStutterDiagnostics,
} from "~/utils/playbackStutterDiagnostics";
import { computePlaybackVisibleRange } from "~/utils/playbackVisibleRange";
import usePlaybackStripAnimation from "~/hooks/usePlaybackStripAnimation";

const VIRTUALIZATION_BUFFER = 100;

interface ChordLayoutData {
  scrollPositions: number[];
  chordWidths: number[];
  totalWidth: number;
  durations: number[];
  virtualizationIndex: number;
  virtualizationStartIndex: number;
  virtualizationCatchupIndex: number;
}

interface PlaybackChordStripProps {
  scrollStripRef: React.RefObject<HTMLDivElement | null>;
  initialPlaceholderWidth: number;
  chordLayoutData: ChordLayoutData;
  chordRepetitions: number[];
  setChordRepetitions: React.Dispatch<React.SetStateAction<number[]>>;
}

const onProfilerRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
) => {
  if (actualDuration > 8) {
    console.warn(
      `[playback-stutter] React Profiler ${id} ${phase}: ${actualDuration.toFixed(1)}ms`,
    );
  }
};

function PlaybackChordStrip({
  scrollStripRef,
  initialPlaceholderWidth,
  chordLayoutData,
  chordRepetitions,
  setChordRepetitions,
}: PlaybackChordStripProps) {
  const {
    currentChordIndex,
    expandedTabData,
    visiblePlaybackContainerWidth,
    audioMetadata,
    audioContext,
    playbackStartedAtAudioTime,
    currentlyPlayingMetadata,
    loopDelay,
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    expandedTabData: state.expandedTabData,
    visiblePlaybackContainerWidth: state.visiblePlaybackContainerWidth,
    audioMetadata: state.audioMetadata,
    audioContext: state.audioContext,
    playbackStartedAtAudioTime: state.playbackStartedAtAudioTime,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    loopDelay: state.loopDelay,
  }));

  const devFlags = useMemo(() => getPlaybackStutterDevFlags(), []);
  const disableHighlightTransitions = devFlags.disableHighlightTransitions;

  useEffect(() => {
    startPlaybackStutterDiagnostics();
  }, []);

  const currentChordRepetition = chordRepetitions[currentChordIndex] ?? 0;

  usePlaybackStripAnimation({
    stripRef: scrollStripRef,
    chordLayoutData,
    currentChordIndex,
    currentRepetition: currentChordRepetition,
    audioContext,
    playbackStartedAtAudioTime,
    playing: audioMetadata.playing,
  });

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

  const visibleRange = useMemo(() => {
    markPlaybackStutter("visible-range-compute:start");

    if (
      !expandedTabData ||
      visiblePlaybackContainerWidth === 0 ||
      chordRepetitions.length === 0
    ) {
      return { startIndex: 0, endIndex: 0 };
    }

    const result = devFlags.disableVirtualization
      ? { startIndex: 0, endIndex: expandedTabData.length - 1 }
      : computePlaybackVisibleRange({
          scrollPositions: chordLayoutData.scrollPositions,
          chordRepetitions,
          totalWidth: chordLayoutData.totalWidth,
          currentChordIndex,
          visiblePlaybackContainerWidth,
          virtualizationBuffer: VIRTUALIZATION_BUFFER,
        });

    measurePlaybackStutter("visible-range-compute", "visible-range-compute", {
      startIndex: result.startIndex,
      endIndex: result.endIndex,
      chordCount: expandedTabData.length,
    });

    return result;
  }, [
    chordLayoutData,
    chordRepetitions,
    currentChordIndex,
    devFlags.disableVirtualization,
    expandedTabData,
    visiblePlaybackContainerWidth,
  ]);

  useEffect(() => {
    if (devFlags.freezeChordRepetitions) return;
    if (
      currentChordIndex < chordLayoutData.virtualizationIndex ||
      chordRepetitions[0] !== chordRepetitions[chordRepetitions.length - 1]
    ) {
      return;
    }

    markPlaybackStutter("chord-repetitions-primary");
    setChordRepetitions((prev) => {
      const newRepetitions = (prev[0] ?? 0) + 1;
      const oldRepetitions = prev[0] ?? 0;
      const secondHalfLength =
        prev.length - chordLayoutData.virtualizationStartIndex;

      const firstNewHalf = new Array(
        chordLayoutData.virtualizationStartIndex,
      ).fill(newRepetitions) as number[];
      const secondNewHalf = new Array(secondHalfLength).fill(
        oldRepetitions,
      ) as number[];

      return [...firstNewHalf, ...secondNewHalf];
    });
  }, [
    chordLayoutData,
    chordRepetitions,
    currentChordIndex,
    devFlags.freezeChordRepetitions,
    setChordRepetitions,
  ]);

  useEffect(() => {
    if (devFlags.freezeChordRepetitions) return;
    if (
      currentChordIndex >= chordLayoutData.virtualizationIndex ||
      currentChordIndex < chordLayoutData.virtualizationCatchupIndex ||
      chordRepetitions[0] === chordRepetitions[chordRepetitions.length - 1]
    ) {
      return;
    }

    markPlaybackStutter("chord-repetitions-catchup");
    setChordRepetitions((prev) => {
      const newRepetitions = prev[0] ?? 0;
      return new Array(prev.length).fill(newRepetitions) as number[];
    });
  }, [
    chordLayoutData,
    chordRepetitions,
    currentChordIndex,
    devFlags.freezeChordRepetitions,
    setChordRepetitions,
  ]);

  const scrollContainerTransform = useMemo(() => {
    const { scrollPositions, totalWidth } = chordLayoutData;
    const position =
      (scrollPositions[currentChordIndex] ?? 0) +
      (chordRepetitions[currentChordIndex] ?? 0) * totalWidth;

    return `translateX(${position * -1}px)`;
  }, [chordLayoutData, chordRepetitions, currentChordIndex]);

  const omitInlineTransform = shouldOmitInlineTransformWhilePlaying(
    audioMetadata.playing,
  );
  const applyInlineTransform =
    !audioMetadata.playing || !omitInlineTransform;

  const isChordHighlighted = useCallback(
    (chordIndex: number): boolean => {
      if (
        !expandedTabData ||
        !currentlyPlayingMetadata ||
        chordRepetitions.length === 0
      ) {
        return false;
      }

      if (currentChordIndex === chordIndex && audioMetadata.playing) {
        return true;
      }

      const chordRep = chordRepetitions[chordIndex] ?? 0;
      const currentRep = chordRepetitions[currentChordIndex] ?? 0;

      if (chordRep < currentRep) return true;
      if (chordRep === currentRep && chordIndex < currentChordIndex) return true;

      return false;
    },
    [
      audioMetadata.playing,
      chordRepetitions,
      currentChordIndex,
      currentlyPlayingMetadata,
      expandedTabData,
    ],
  );

  const visibleChords = useMemo(() => {
    if (!expandedTabData) return [];

    const { startIndex, endIndex } = visibleRange;
    const result: Array<{
      chord:
        | PlaybackTabChordType
        | PlaybackStrummedChordType
        | PlaybackLoopDelaySpacerChord;
      index: number;
      prevChord?:
        | PlaybackTabChordType
        | PlaybackStrummedChordType
        | PlaybackLoopDelaySpacerChord;
      nextChord?:
        | PlaybackTabChordType
        | PlaybackStrummedChordType
        | PlaybackLoopDelaySpacerChord;
    }> = [];

    for (let i = startIndex; i <= endIndex; i++) {
      const chord = expandedTabData[i];
      if (chord) {
        result.push({
          chord,
          index: i,
          prevChord: expandedTabData[i - 1],
          nextChord: expandedTabData[i + 1],
        });
      }
    }

    return result;
  }, [expandedTabData, visibleRange]);

  if (!expandedTabData) return null;

  const strip = (
    <div
      ref={scrollStripRef}
      style={{
        width: `${chordLayoutData.totalWidth}px`,
        ...(applyInlineTransform
          ? {
              transform: scrollContainerTransform,
              transition: audioMetadata.playing
                ? "none"
                : "transform 0.2s linear",
            }
          : {}),
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
      {visibleChords.map(({ chord, index, prevChord, nextChord }) => {
        const isDimmed =
          audioMetadata.editingLoopRange &&
          (index < audioMetadata.startLoopIndex ||
            (audioMetadata.endLoopIndex !== -1 &&
              index > audioMetadata.endLoopIndex));

        const isFirstChordInSection =
          index === 0 &&
          (loopDelay !== 0 || (chordRepetitions[0] ?? 0) === 0);

        return (
          <div
            key={`${index}-${chordRepetitions[index] ?? 0}`}
            style={{
              position: "absolute",
              width: `${chordLayoutData.chordWidths[index] ?? 0}px`,
              left: `${
                getChordScrollPosition(index) + initialPlaceholderWidth
              }px`,
            }}
          >
            <RenderChordByType
              type={
                chord.type === "strum"
                  ? "strum"
                  : chord.type === "tab"
                    ? chord.data.chordData.includes("|")
                      ? "measureLine"
                      : "tab"
                    : "loopDelaySpacer"
              }
              index={index}
              prevChord={prevChord}
              chord={chord}
              nextChord={nextChord}
              isFirstChordInSection={isFirstChordInSection}
              isDimmed={isDimmed}
              loopDelay={loopDelay}
              isHighlighted={
                !audioMetadata.editingLoopRange && isChordHighlighted(index)
              }
              disableHighlightTransitions={disableHighlightTransitions}
            />
          </div>
        );
      })}
    </div>
  );

  if (devFlags.reactProfiler) {
    return (
      <Profiler id="PlaybackChordStrip" onRender={onProfilerRender}>
        {strip}
      </Profiler>
    );
  }

  return strip;
}

interface RenderChordByTypeProps {
  type: "tab" | "measureLine" | "strum" | "loopDelaySpacer";
  index: number;
  prevChord?:
    | PlaybackTabChordType
    | PlaybackStrummedChordType
    | PlaybackLoopDelaySpacerChord;
  chord:
    | PlaybackTabChordType
    | PlaybackStrummedChordType
    | PlaybackLoopDelaySpacerChord;
  nextChord?:
    | PlaybackTabChordType
    | PlaybackStrummedChordType
    | PlaybackLoopDelaySpacerChord;
  isFirstChordInSection: boolean;
  isDimmed: boolean;
  loopDelay: number;
  isHighlighted: boolean;
  disableHighlightTransitions?: boolean;
}

const RenderChordByType = memo(function RenderChordByType({
  type,
  index: _index,
  prevChord,
  chord,
  nextChord,
  isFirstChordInSection,
  isDimmed,
  loopDelay,
  isHighlighted,
  disableHighlightTransitions,
}: RenderChordByTypeProps) {
  const prevChordNoteLength = prevChord
    ? prevChord.type === "strum" && !prevChord.isLastChord
      ? prevChord.data.noteLength
      : prevChord.type === "tab"
        ? (prevChord.data.chordData[8] as FullNoteLengths)
        : undefined
    : undefined;

  const currentChordNoteLength = chord
    ? chord.type === "strum"
      ? chord.data.noteLength
      : chord.type === "tab"
        ? (chord.data.chordData[8] as FullNoteLengths)
        : undefined
    : undefined;

  const nextChordNoteLength = nextChord
    ? nextChord.type === "strum" &&
      (chord.type !== "strum" || !chord.isLastChord)
      ? nextChord.data.noteLength
      : nextChord.type === "tab"
        ? (nextChord.data.chordData[8] as FullNoteLengths)
        : undefined
    : undefined;

  const prevChordIsRest =
    prevChord === undefined ||
    (prevChord.type === "tab" && prevChord.data.chordData[7] === "r") ||
    (prevChord.type === "strum" && prevChord.data.strum === "r");
  const currentChordIsRest =
    chord === undefined ||
    (chord.type === "tab" && chord.data.chordData[7] === "r") ||
    (chord.type === "strum" && chord.data.strum === "r");
  const nextChordIsRest =
    nextChord === undefined ||
    (nextChord.type === "tab" && nextChord.data.chordData[7] === "r") ||
    (nextChord.type === "strum" && nextChord.data.strum === "r");

  if (type === "tab" && chord?.type === "tab") {
    return (
      <PlaybackTabChord
        columnData={chord?.data.chordData}
        isFirstChordInSection={isFirstChordInSection}
        isLastChordInSection={chord?.isLastChord && loopDelay !== 0}
        isHighlighted={isHighlighted}
        isDimmed={isDimmed}
        prevChordNoteLength={prevChordNoteLength}
        currentChordNoteLength={currentChordNoteLength}
        nextChordNoteLength={nextChordNoteLength}
        prevChordIsRest={prevChordIsRest}
        currentChordIsRest={currentChordIsRest}
        nextChordIsRest={nextChordIsRest}
        disableHighlightTransitions={disableHighlightTransitions}
      />
    );
  }

  if (type === "measureLine" && chord?.type === "tab") {
    return (
      <PlaybackTabMeasureLine
        columnData={chord.data.chordData}
        isDimmed={isDimmed}
      />
    );
  }

  if (type === "strum" && chord?.type === "strum") {
    return (
      <PlaybackStrummedChord
        strumIndex={chord?.data.strumIndex || 0}
        strum={chord?.data.strum || ""}
        palmMute={chord?.data.palmMute || ""}
        isFirstChordInSection={isFirstChordInSection}
        isLastChordInSection={chord?.isLastChord && loopDelay !== 0}
        noteLength={chord?.data.noteLength || "quarter"}
        bpmToShow={chord?.data.showBpm ? chord?.data.bpm : undefined}
        chordName={chord?.data.chordName || ""}
        chordColor={chord?.data.chordColor || ""}
        isHighlighted={isHighlighted}
        beatIndicator={chord?.data.beatIndicator}
        isDimmed={isDimmed}
        prevChordNoteLength={prevChordNoteLength}
        currentChordNoteLength={currentChordNoteLength}
        nextChordNoteLength={nextChordNoteLength}
        prevChordIsRest={prevChordIsRest}
        currentChordIsRest={currentChordIsRest}
        nextChordIsRest={nextChordIsRest}
        disableHighlightTransitions={disableHighlightTransitions}
      />
    );
  }

  if (type === "loopDelaySpacer") {
    return <div className="absolute left-0 h-full w-[34px]"></div>;
  }

  return null;
});

export default memo(PlaybackChordStrip);
