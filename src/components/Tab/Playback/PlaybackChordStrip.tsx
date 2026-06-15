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
  buildPlaybackChordPositions,
  computePlaybackVisibleRange,
} from "~/utils/playbackVisibleRange";
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
  const currentChordIndex = useTabStore((state) => state.currentChordIndex);
  const expandedTabData = useTabStore((state) => state.expandedTabData);
  const visiblePlaybackContainerWidth = useTabStore(
    (state) => state.visiblePlaybackContainerWidth,
  );
  const audioMetadata = useTabStore((state) => state.audioMetadata);
  const audioContext = useTabStore((state) => state.audioContext);
  const playbackStartedAtAudioTime = useTabStore(
    (state) => state.playbackStartedAtAudioTime,
  );
  const currentlyPlayingMetadata = useTabStore(
    (state) => state.currentlyPlayingMetadata,
  );
  const loopDelay = useTabStore((state) => state.loopDelay);
  const editingLoopRange = useTabStore(
    (state) => state.audioMetadata.editingLoopRange,
  );
  const startLoopIndex = useTabStore(
    (state) => state.audioMetadata.startLoopIndex,
  );
  const endLoopIndex = useTabStore((state) => state.audioMetadata.endLoopIndex);
  const playing = useTabStore((state) => state.audioMetadata.playing);

  const devFlags = useMemo(() => getPlaybackStutterDevFlags(), []);
  const disableHighlightTransitions = devFlags.disableHighlightTransitions;

  const currentChordRepetition = chordRepetitions[currentChordIndex] ?? 0;

  usePlaybackStripAnimation({
    stripRef: scrollStripRef,
    chordLayoutData,
    currentChordIndex,
    currentRepetition: currentChordRepetition,
    audioContext,
    playbackStartedAtAudioTime,
    playing,
  });

  const chordPositions = useMemo(
    () =>
      buildPlaybackChordPositions({
        scrollPositions: chordLayoutData.scrollPositions,
        chordRepetitions,
        totalWidth: chordLayoutData.totalWidth,
      }),
    [chordLayoutData.scrollPositions, chordLayoutData.totalWidth, chordRepetitions],
  );

  const visibleRange = useMemo(() => {
    if (
      !expandedTabData ||
      visiblePlaybackContainerWidth === 0 ||
      chordRepetitions.length === 0
    ) {
      return { startIndex: 0, endIndex: 0 };
    }

    if (devFlags.disableVirtualization) {
      return { startIndex: 0, endIndex: expandedTabData.length - 1 };
    }

    return computePlaybackVisibleRange({
      scrollPositions: chordLayoutData.scrollPositions,
      chordRepetitions,
      totalWidth: chordLayoutData.totalWidth,
      currentChordIndex,
      visiblePlaybackContainerWidth,
      virtualizationBuffer: VIRTUALIZATION_BUFFER,
      chordPositions,
    });
  }, [
    chordLayoutData.scrollPositions,
    chordLayoutData.totalWidth,
    chordPositions,
    chordRepetitions,
    currentChordIndex,
    devFlags.disableVirtualization,
    expandedTabData,
    visiblePlaybackContainerWidth,
  ]);

  const firstRepetition = chordRepetitions[0] ?? 0;
  const lastRepetition = chordRepetitions[chordRepetitions.length - 1] ?? 0;
  const repetitionsAreSynced = firstRepetition === lastRepetition;

  // Only depend on currentChordIndex — guard before setState so we do not
  // schedule updater work on every chord tick.
  useEffect(() => {
    if (devFlags.freezeChordRepetitions) return;
    if (chordRepetitions.length === 0) return;
    if (currentChordIndex < chordLayoutData.virtualizationIndex) return;
    if (!repetitionsAreSynced) return;

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
    chordLayoutData.virtualizationIndex,
    chordLayoutData.virtualizationStartIndex,
    chordRepetitions.length,
    currentChordIndex,
    devFlags.freezeChordRepetitions,
    repetitionsAreSynced,
    setChordRepetitions,
  ]);

  useEffect(() => {
    if (devFlags.freezeChordRepetitions) return;
    if (chordRepetitions.length === 0) return;
    if (currentChordIndex >= chordLayoutData.virtualizationIndex) return;
    if (currentChordIndex < chordLayoutData.virtualizationCatchupIndex) return;
    if (repetitionsAreSynced) return;

    setChordRepetitions((prev) => {
      const newRepetitions = prev[0] ?? 0;
      return new Array(prev.length).fill(newRepetitions) as number[];
    });
  }, [
    chordLayoutData.virtualizationCatchupIndex,
    chordLayoutData.virtualizationIndex,
    chordRepetitions.length,
    currentChordIndex,
    devFlags.freezeChordRepetitions,
    repetitionsAreSynced,
    setChordRepetitions,
  ]);

  const scrollContainerTransform = useMemo(() => {
    const position = chordPositions[currentChordIndex] ?? 0;
    return `translateX(${position * -1}px)`;
  }, [chordPositions, currentChordIndex]);

  const applyInlineTransform =
    !playing || !shouldOmitInlineTransformWhilePlaying(playing);

  const isChordHighlighted = useCallback(
    (chordIndex: number): boolean => {
      if (
        !expandedTabData ||
        !currentlyPlayingMetadata ||
        chordRepetitions.length === 0
      ) {
        return false;
      }

      if (currentChordIndex === chordIndex && playing) {
        return true;
      }

      const chordRep = chordRepetitions[chordIndex] ?? 0;
      const currentRep = chordRepetitions[currentChordIndex] ?? 0;

      if (chordRep < currentRep) return true;
      if (chordRep === currentRep && chordIndex < currentChordIndex) return true;

      return false;
    },
    [
      chordRepetitions,
      currentChordIndex,
      currentlyPlayingMetadata,
      expandedTabData,
      playing,
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
              transition: playing ? "none" : "transform 0.2s linear",
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
          editingLoopRange &&
          (index < startLoopIndex ||
            (endLoopIndex !== -1 && index > endLoopIndex));

        const isFirstChordInSection =
          index === 0 &&
          (loopDelay !== 0 || (chordRepetitions[0] ?? 0) === 0);

        return (
          <div
            key={`${index}-${chordRepetitions[index] ?? 0}`}
            style={{
              position: "absolute",
              width: `${chordLayoutData.chordWidths[index] ?? 0}px`,
              left: `${(chordPositions[index] ?? 0) + initialPlaceholderWidth}px`,
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
              isHighlighted={!editingLoopRange && isChordHighlighted(index)}
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
