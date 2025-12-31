import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import PlaybackAudioControls from "~/components/Tab/Playback/PlaybackAudio/PlaybackAudioControls";
import PlaybackBottomMetadata from "~/components/Tab/Playback/PlaybackBottomMetadata";
import PlaybackStrummedChord from "~/components/Tab/Playback/PlaybackStrummedChord";
import PlaybackTabChord from "~/components/Tab/Playback/PlaybackTabChord";
import PlaybackTabMeasureLine from "~/components/Tab/Playback/PlaybackTabMeasureLine";
import PlaybackTopMetadata from "~/components/Tab/Playback/PlaybackTopMetadata";
import { AnimatePresence, motion } from "framer-motion";
import { FocusTrap } from "focus-trap-react";
import {
  type AudioMetadata,
  type PlaybackTabChord as PlaybackTabChordType,
  type PlaybackStrummedChord as PlaybackStrummedChordType,
  type PlaybackLoopDelaySpacerChord,
  useTabStore,
  type FullNoteLengths,
} from "~/stores/TabStore";
import PlaybackMenuContent from "~/components/Tab/Playback/PlaybackMenuContent";
import PlaybackScrollingContainer from "~/components/Tab/Playback/PlaybackScrollingContainer";
import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import useModalScrollbarHandling from "~/hooks/useModalScrollbarHandling";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

const virtualizationBuffer = 100;

function PlaybackModal() {
  const {
    currentChordIndex,
    expandedTabData,
    playbackSpeed,
    playbackMetadata,
    audioMetadata,
    showPlaybackModal,
    setShowPlaybackModal,
    visiblePlaybackContainerWidth,
    setVisiblePlaybackContainerWidth,
    playbackModalViewingState,
    viewportLabel,
    loopDelay,
    currentlyPlayingMetadata,
    setAudioMetadata,
    setPlaybackModalViewingState,
    pauseAudio,
    setCurrentChordIndex,
    chords,
    chordDisplayMode,
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    expandedTabData: state.expandedTabData,
    playbackSpeed: state.playbackSpeed,
    playbackMetadata: state.playbackMetadata,
    audioMetadata: state.audioMetadata,
    showPlaybackModal: state.showPlaybackModal,
    setShowPlaybackModal: state.setShowPlaybackModal,
    visiblePlaybackContainerWidth: state.visiblePlaybackContainerWidth,
    setVisiblePlaybackContainerWidth: state.setVisiblePlaybackContainerWidth,
    playbackModalViewingState: state.playbackModalViewingState,
    viewportLabel: state.viewportLabel,
    loopDelay: state.loopDelay,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    setAudioMetadata: state.setAudioMetadata,
    setPlaybackModalViewingState: state.setPlaybackModalViewingState,
    pauseAudio: state.pauseAudio,
    setCurrentChordIndex: state.setCurrentChordIndex,
    chords: state.chords,
    chordDisplayMode: state.chordDisplayMode,
  }));

  const containerRef = (element: HTMLDivElement | null) => {
    if (element && !containerElement) setContainerElement(element);
  };
  const modalContentRef = useRef<HTMLDivElement | null>(null);

  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);
  const [showBackgroundBlur, setShowBackgroundBlur] = useState(false);

  const [chordDurations, setChordDurations] = useState<number[]>([]);
  const [initialPlaceholderWidth, setInitialPlaceholderWidth] = useState(0);

  const [chordWidths, setChordWidths] = useState<number[]>([]);
  const [finalChordWidth, setFinalChordWidth] = useState(0); // used so we don't need to pass entire chordWidths into the effect to get new currentPosition values
  const [scrollPositions, setScrollPositions] = useState<number[]>([]);
  const [chordRepetitions, setChordRepetitions] = useState<number[]>([]);

  const [chordHighlightRanges, setChordHighlightRanges] = useState<
    Array<[number, number]>
  >([]); // inclusive ranges of chord indices to highlight

  // virtualization related indices
  const [virtualizationIndex, setVirtualizationIndex] = useState<number>(0);
  const [virtualizationStartIndex, setVirtualizationStartIndex] =
    useState<number>(0);
  const [virtualizationCatchupIndex, setVirtualizationCatchupIndex] =
    useState<number>(0);

  const [scrollContainerWidth, setScrollContainerWidth] = useState(0);

  // v avoids polluting the store with these extra semi-local values
  const [loopRange, setLoopRange] = useState<[number, number]>([
    audioMetadata.startLoopIndex,
    audioMetadata.endLoopIndex === -1
      ? audioMetadata.fullCurrentlyPlayingMetadataLength - 1
      : audioMetadata.endLoopIndex,
  ]);
  const [tabProgressValue, setTabProgressValue] = useState(0);

  // gates computation of chord widths + positions + duplication to only when
  // expandedTabData has changed or looping has changed
  const [expandedTabDataHasChanged, setExpandedTabDataHasChanged] =
    useState(true);

  const loopCount = Math.floor(
    currentChordIndex / (currentlyPlayingMetadata?.length ?? 1),
  );

  useModalScrollbarHandling(true);

  useEffect(() => {
    // this feels a bit like a bandaid fix
    function handleResize() {
      if (
        modalContentRef.current === null ||
        modalContentRef.current.clientWidth === 0 ||
        modalContentRef.current.clientHeight === 0
      ) {
        return;
      }

      setInitialPlaceholderWidth(modalContentRef.current.clientWidth / 2 - 5);
      setVisiblePlaybackContainerWidth(modalContentRef.current.clientWidth);
    }

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [
    expandedTabData,
    showPlaybackModal,
    containerElement,
    setVisiblePlaybackContainerWidth,
  ]);

  // reset on modal close
  useEffect(() => {
    return () => {
      setPlaybackModalViewingState("Practice");
      setCurrentChordIndex(0);
    };
  }, []);

  // initialization effect
  useEffect(() => {
    if (
      !expandedTabDataHasChanged ||
      !containerElement ||
      !expandedTabData ||
      !playbackMetadata ||
      visiblePlaybackContainerWidth === 0 ||
      expandedTabData.length === 0
    )
      return;

    const localScrollPositions: number[] = [];
    const chordWidths: number[] = [];
    const localChordHighlightRanges: Array<[number, number]> = [];
    let localFinalChordWidth = 0;
    let offsetLeft = 0;

    expandedTabData.map((chord, index) => {
      const isMeasureLine =
        chord?.type === "tab" && chord?.data.chordData.includes("|");

      const isSpacerChord =
        (chord?.type === "tab" && chord?.data.chordData[0] === "-1") ||
        (chord?.type === "strum" && chord?.data.strumIndex === -1);

      const chordWidth = isMeasureLine
        ? 2
        : isSpacerChord
          ? 16
          : chord?.type === "tab"
            ? 35
            : 40;

      localScrollPositions[index] = offsetLeft;

      chordWidths.push(chordWidth);

      if (index === expandedTabData.length - 1) {
        localFinalChordWidth = chordWidth;
      }

      offsetLeft += chordWidth;
    });

    const durations = playbackMetadata.map((metadata) => {
      const { bpm, noteLengthMultiplier } = metadata;

      return 60 / ((bpm / noteLengthMultiplier) * playbackSpeed);
    });

    const scrollContainerWidth =
      (localScrollPositions.at(-1) ?? 0) + localFinalChordWidth;

    const newChordRepetitions = new Array(expandedTabData.length).fill(0);

    // loop backwards through scrollPositions to find the earliest chord index that
    // would show the final chord in the loop
    let localVirtualizationIndex = 0;
    for (let i = expandedTabData.length - 1; i >= 0; i--) {
      const currentPosition = localScrollPositions[i];
      const lastChordPosition = localScrollPositions.at(-1);

      if (currentPosition === undefined || lastChordPosition === undefined) {
        continue;
      }

      if (
        currentPosition + visiblePlaybackContainerWidth * 0.5 <=
        lastChordPosition + localFinalChordWidth
      ) {
        localVirtualizationIndex = i;
        break;
      }
    }

    let localVirtualizationStartIndex = 0;
    for (let i = expandedTabData.length - 1; i >= 0; i--) {
      const currentPosition = localScrollPositions[i];
      const lastChordPosition = localScrollPositions.at(-1);

      if (currentPosition === undefined || lastChordPosition === undefined) {
        continue;
      }

      if (
        currentPosition + visiblePlaybackContainerWidth <=
        lastChordPosition + localFinalChordWidth
      ) {
        localVirtualizationStartIndex = i;
        break;
      }
    }

    let localVirtualizationCatchupIndex = 0;
    for (let i = 0; i < expandedTabData.length - 1; i++) {
      const currentPosition = localScrollPositions[i];

      if (currentPosition === undefined) {
        continue;
      }

      if (currentPosition - visiblePlaybackContainerWidth * 0.5 >= 0) {
        localVirtualizationCatchupIndex = i;
        break;
      }
    }

    // compute chordHighlightRanges
    for (let i = 0; i < expandedTabData.length; i++) {
      let startRangeIndex = 0;
      let endRangeIndex = 0;
      let leftIndex = i;
      let rightIndex = i;
      const baselineScrollPosition = localScrollPositions[i];

      if (baselineScrollPosition === undefined) {
        localChordHighlightRanges[i] = [0, 0];
        continue;
      }

      // check left of current index
      while (leftIndex >= 0) {
        const scrollPosition = localScrollPositions[leftIndex];
        if (scrollPosition === undefined) {
          leftIndex--;
          continue;
        }

        if (
          scrollPosition <
          baselineScrollPosition -
            (0.5 * visiblePlaybackContainerWidth + virtualizationBuffer)
        ) {
          startRangeIndex = leftIndex + 1; // TOOD: maybe drop the +1?
          break;
        }

        leftIndex--;
      }

      // check right of current index
      while (rightIndex < expandedTabData.length) {
        const scrollPosition = localScrollPositions[rightIndex];
        if (scrollPosition === undefined) {
          rightIndex++;
          continue;
        }

        if (
          scrollPosition >
          baselineScrollPosition +
            (0.5 * visiblePlaybackContainerWidth + virtualizationBuffer)
        ) {
          endRangeIndex = rightIndex - 1; // TOOD: maybe drop the -1?
          break;
        }

        rightIndex++;
      }

      // fallbacks in case the above conditions never get met
      if (startRangeIndex === 0 && leftIndex < 0) startRangeIndex = 0;
      if (endRangeIndex === 0) endRangeIndex = expandedTabData.length - 1;

      localChordHighlightRanges[i] = [startRangeIndex, endRangeIndex];
    }

    setVirtualizationIndex(localVirtualizationIndex);
    setVirtualizationStartIndex(localVirtualizationStartIndex);
    setVirtualizationCatchupIndex(localVirtualizationCatchupIndex);

    setChordRepetitions(newChordRepetitions);
    setExpandedTabDataHasChanged(false);
    setScrollPositions(localScrollPositions);
    setChordWidths(chordWidths);
    setScrollContainerWidth(scrollContainerWidth);
    setChordDurations(durations);
    setFinalChordWidth(localFinalChordWidth);
    setChordHighlightRanges(localChordHighlightRanges);
  }, [
    containerElement,
    visiblePlaybackContainerWidth,
    expandedTabData,
    expandedTabDataHasChanged,
    playbackMetadata,
    playbackSpeed,
  ]);

  // TODO: is this necessary?
  useEffect(() => {
    setExpandedTabDataHasChanged(true);
  }, [expandedTabData]);

  // primary chord virtualization effect
  useEffect(() => {
    if (
      currentChordIndex < virtualizationIndex ||
      chordRepetitions[0] !== chordRepetitions.at(-1) // primary virtualization already happened
    ) {
      return;
    }

    setChordRepetitions((prev) => {
      const newRepetitions = (prev[0] ?? 0) + 1;
      const oldRepetitions = prev[0] ?? 0;
      const secondHalfLength = prev.length - virtualizationStartIndex;

      const firstNewHalf = new Array(virtualizationStartIndex).fill(
        newRepetitions,
      ) as number[];
      const secondNewHalf = new Array(secondHalfLength).fill(
        oldRepetitions,
      ) as number[];

      return [...firstNewHalf, ...secondNewHalf];
    });
  }, [
    chordRepetitions,
    currentChordIndex,
    virtualizationIndex,
    virtualizationStartIndex,
  ]);

  // catchup chord virtualization effect
  useEffect(() => {
    if (
      // making sure that this only happens post-primary virtualization and not
      // before the virtualizationCatchupIndex has been reached
      currentChordIndex >= virtualizationIndex ||
      currentChordIndex < virtualizationCatchupIndex ||
      chordRepetitions[0] === chordRepetitions.at(-1) // all chords are already caught up
    ) {
      return;
    }

    setChordRepetitions((prev) => {
      const newRepetitions = prev[0] ?? 0;

      const newChordRepetitions = new Array(prev.length).fill(
        newRepetitions,
      ) as number[];

      return newChordRepetitions;
    });
  }, [
    chordRepetitions,
    currentChordIndex,
    virtualizationIndex,
    virtualizationCatchupIndex,
  ]);

  // TODO: maybe increase buffer if you want to get rid of the blank space
  // when scrubbing quickly?
  function chordIsVisible(index: number) {
    if (scrollPositions === null) return false;

    const chordPosition = getScrollPosition({
      scrollPositions,
      chordRepetitions,
      scrollContainerWidth,
      index,
    });
    const currentPosition = getScrollPosition({
      scrollPositions,
      chordRepetitions,
      scrollContainerWidth,
      index: currentChordIndex,
    });

    const minVisiblePosition =
      currentPosition -
      visiblePlaybackContainerWidth / 2 -
      virtualizationBuffer;
    const maxVisiblePosition =
      currentPosition +
      visiblePlaybackContainerWidth / 2 +
      virtualizationBuffer;

    return (
      chordPosition >= minVisiblePosition && chordPosition <= maxVisiblePosition
    );
  }

  function highlightChord({
    chordIndex,
    type,
  }: {
    chordIndex: number;
    type: "isBeingPlayed" | "hasBeenPlayed";
  }) {
    if (
      scrollPositions === null ||
      expandedTabData === null ||
      currentlyPlayingMetadata === null
    )
      return false;

    if (type === "isBeingPlayed") {
      return currentChordIndex === chordIndex;
    }

    const rangeStart = chordHighlightRanges[currentChordIndex]?.[0];
    const rangeEnd = chordHighlightRanges[currentChordIndex]?.[1];

    if (rangeStart === undefined || rangeEnd === undefined) return false;

    // FYI: these two vars are only necessary/relevant if the tab has been artificially
    // extended, otherwise the rangeStart/rangeEnd checks are sufficient
    const startingChordIndexForCurrentLoop =
      loopCount * currentlyPlayingMetadata.length;
    const endingChordIndexForCurrentLoop =
      (loopCount + 1) * currentlyPlayingMetadata.length - 1;

    if (
      startingChordIndexForCurrentLoop <= chordIndex &&
      chordIndex <= endingChordIndexForCurrentLoop &&
      chordIndex >= rangeStart &&
      chordIndex <= rangeEnd &&
      currentChordIndex >= chordIndex + 1
    ) {
      return true;
    }

    return false;
  }

  return (
    <motion.div
      key={"PlaybackModalBackdrop"}
      // FYI: made this bg-black/70 instead of bg-black/60 since the backdrop-blur-sm caused unfortunate
      // smearing of the noise texture background
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/70 backdrop-blur-sm"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setShowPlaybackModal(false);
          pauseAudio(true);
          setTimeout(() => {
            setPlaybackModalViewingState("Practice");
          }, 150); // waiting for the modal to actually close before changing state
          if (audioMetadata.editingLoopRange) {
            setAudioMetadata({
              ...audioMetadata,
              editingLoopRange: false,
            });
          }
        }
      }}
    >
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true, // to click on the effect dialog "x"
          initialFocus: false,
        }}
      >
        <div
          ref={modalContentRef}
          tabIndex={-1}
          className="baseVertFlex playbackModalGradient relative h-dvh w-screen max-w-none !justify-between gap-0 !rounded-none p-0 mobileNarrowLandscape:!justify-center tablet:h-[650px] tablet:max-w-6xl tablet:!rounded-lg"
        >
          <PlaybackTopMetadata
            tabProgressValue={tabProgressValue}
            setTabProgressValue={setTabProgressValue}
          />

          <AnimatePresence mode="popLayout">
            {showBackgroundBlur && (
              <motion.div
                key="BackgroundBlur"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 top-0 z-10 size-full bg-black/60 backdrop-blur-sm"
                onClick={() => {
                  setShowBackgroundBlur(false);
                }}
              ></motion.div>
            )}

            {playbackModalViewingState === "Practice" && (
              <motion.div
                key="PracticeTab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="baseVertFlex relative size-full select-none"
              >
                <div className="w-full overflow-hidden">
                  <PlaybackScrollingContainer
                    loopCount={loopCount}
                    setChordRepetitions={setChordRepetitions}
                    scrollPositionsLength={scrollPositions.length}
                  >
                    <div
                      ref={containerRef}
                      className="relative flex h-[255px] w-full overflow-hidden mobilePortrait:h-[280px]"
                    >
                      <div className="baseFlex absolute left-0 top-0 size-full">
                        <div className="mb-[72px] h-[140px] w-full mobilePortrait:h-[165px]"></div>
                        {/* currently this fixes the highlight line extending past rounded borders of
                        sections, but puts it behind measure lines. maybe this is a fine tradeoff? */}
                        <div className="z-0 mb-[72px] ml-1 h-[140px] w-[2px] shrink-0 bg-primary mobilePortrait:h-[164px]"></div>
                        <div className="mb-[72px] h-[140px] w-full mobilePortrait:h-[165px]"></div>
                      </div>

                      {scrollPositions && expandedTabData && (
                        <div
                          style={{
                            width: `${scrollContainerWidth}px`,
                            transform: getScrollContainerTransform({
                              scrollPositions,
                              chordRepetitions,
                              scrollContainerWidth,
                              currentChordIndex,
                              audioMetadata,
                              chordCount: playbackMetadata?.length ?? 0,
                            }),
                            transition: `transform ${
                              audioMetadata.playing
                                ? (chordDurations[currentChordIndex] ?? 0)
                                : 0.2
                            }s linear`,
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
                          ></div>

                          {expandedTabData.map((chord, index) => (
                            <Fragment key={index}>
                              {chordIsVisible(index) && (
                                <div
                                  style={{
                                    position: "absolute",
                                    width: `${chordWidths[index] ?? 0}px`,
                                    left: `${
                                      getScrollPosition({
                                        scrollPositions,
                                        chordRepetitions,
                                        scrollContainerWidth,
                                        index,
                                      }) + initialPlaceholderWidth
                                    }px`,
                                  }}
                                >
                                  {/* TODO: probably should make measureLine have its own interface
                                so that we can just directly use the type field rather than logic below */}
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
                                    prevChord={expandedTabData[index - 1]}
                                    chord={chord}
                                    nextChord={expandedTabData[index + 1]}
                                    chordRepetitions={chordRepetitions}
                                    audioMetadata={audioMetadata}
                                    loopDelay={loopDelay}
                                    isHighlighted={
                                      !audioMetadata.editingLoopRange &&
                                      ((audioMetadata.playing &&
                                        highlightChord({
                                          chordIndex: index,
                                          type: "isBeingPlayed",
                                        })) ||
                                        highlightChord({
                                          chordIndex: index,
                                          type: "hasBeenPlayed",
                                        }))
                                    }
                                  />
                                </div>
                              )}
                            </Fragment>
                          ))}
                        </div>
                      )}
                    </div>
                  </PlaybackScrollingContainer>
                </div>
              </motion.div>
            )}

            {!viewportLabel.includes("mobile") && <PlaybackMenuContent />}
          </AnimatePresence>

          {playbackModalViewingState === "Practice" && (
            <div className="baseVertFlex w-full gap-1 lg:gap-2">
              <PlaybackAudioControls
                chordDurations={chordDurations}
                loopRange={loopRange}
                setLoopRange={setLoopRange}
                tabProgressValue={tabProgressValue}
                setTabProgressValue={setTabProgressValue}
                setChordRepetitions={setChordRepetitions}
                scrollPositionsLength={scrollPositions.length}
              />

              <PlaybackBottomMetadata
                loopRange={loopRange}
                setLoopRange={setLoopRange}
                tabProgressValue={tabProgressValue}
                setTabProgressValue={setTabProgressValue}
                showBackgroundBlur={showBackgroundBlur}
                setShowBackgroundBlur={setShowBackgroundBlur}
              />
            </div>
          )}

          <Button
            variant={"modalClose"}
            onClick={() => {
              setShowPlaybackModal(false);
              pauseAudio();

              if (audioMetadata.editingLoopRange) {
                setAudioMetadata({
                  ...audioMetadata,
                  editingLoopRange: false,
                });
              }
            }}
          >
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default PlaybackModal;

function getScrollPosition({
  scrollPositions,
  chordRepetitions,
  scrollContainerWidth,
  index,
}: {
  scrollPositions: number[];
  chordRepetitions: number[];
  scrollContainerWidth: number;
  index: number;
}) {
  return (
    (scrollPositions[index] ?? 0) +
    (chordRepetitions[index] ?? 0) * scrollContainerWidth
  );
}

function getScrollContainerTransform({
  scrollPositions,
  chordRepetitions,
  scrollContainerWidth,
  currentChordIndex,
  audioMetadata,
  chordCount,
}: {
  scrollPositions: number[];
  chordRepetitions: number[];
  scrollContainerWidth: number;
  currentChordIndex: number;
  audioMetadata: AudioMetadata;
  chordCount: number;
}) {
  // when looping, you want to go back to the first chord position, since it
  // will already be translated to the right side of last chord position in main tab
  const index =
    audioMetadata.playing && currentChordIndex === chordCount - 1
      ? 0
      : currentChordIndex + (audioMetadata.playing ? 1 : 0);

  // needed(?) to prevent index from going out of bounds when looping
  const clampedIndex = Math.min(index, scrollPositions.length - 1);

  return `translateX(${
    getScrollPosition({
      scrollPositions,
      chordRepetitions,
      scrollContainerWidth,
      index: clampedIndex,
    }) * -1
  }px)`;
}

interface RenderChordByType {
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
  chordRepetitions: number[];
  audioMetadata: AudioMetadata;
  loopDelay: number;
  isHighlighted: boolean;
}

function RenderChordByType({
  type,
  index,
  prevChord,
  chord,
  nextChord,
  chordRepetitions,
  audioMetadata,
  loopDelay,
  isHighlighted,
}: RenderChordByType) {
  const prevChordNoteLength = prevChord
    ? prevChord.type === "strum" && !prevChord.isLastChord // don't want to have separate strumming patterns' strumming guides be connected
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
      (chord.type !== "strum" || !chord.isLastChord) // don't want to have separate strumming patterns' strumming guides be connected
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
        isFirstChordInSection={
          index === 0 && (loopDelay !== 0 || chordRepetitions[0] === 0)
        }
        isLastChordInSection={chord?.isLastChord && loopDelay !== 0}
        isHighlighted={isHighlighted}
        isDimmed={
          audioMetadata.editingLoopRange &&
          (index < audioMetadata.startLoopIndex ||
            (audioMetadata.endLoopIndex !== -1 &&
              index > audioMetadata.endLoopIndex))
        }
        prevChordNoteLength={prevChordNoteLength}
        currentChordNoteLength={currentChordNoteLength}
        nextChordNoteLength={nextChordNoteLength}
        prevChordIsRest={prevChordIsRest}
        currentChordIsRest={currentChordIsRest}
        nextChordIsRest={nextChordIsRest}
      />
    );
  }

  if (type === "measureLine" && chord?.type === "tab") {
    return (
      <PlaybackTabMeasureLine
        columnData={chord.data.chordData}
        isDimmed={
          audioMetadata.editingLoopRange &&
          (index < audioMetadata.startLoopIndex ||
            (audioMetadata.endLoopIndex !== -1 &&
              index > audioMetadata.endLoopIndex))
        }
      />
    );
  }

  if (type === "strum" && chord?.type === "strum") {
    return (
      <PlaybackStrummedChord
        strumIndex={chord?.data.strumIndex || 0}
        strum={chord?.data.strum || ""}
        palmMute={chord?.data.palmMute || ""}
        isFirstChordInSection={
          index === 0 && (loopDelay !== 0 || chordRepetitions[0] === 0)
        }
        isLastChordInSection={chord?.isLastChord && loopDelay !== 0}
        noteLength={chord?.data.noteLength || "quarter"}
        bpmToShow={chord?.data.showBpm ? chord?.data.bpm : undefined}
        chordName={chord?.data.chordName || ""}
        chordColor={chord?.data.chordColor || ""}
        isHighlighted={isHighlighted}
        beatIndicator={chord?.data.beatIndicator}
        isDimmed={
          audioMetadata.editingLoopRange &&
          (index < audioMetadata.startLoopIndex ||
            (audioMetadata.endLoopIndex !== -1 &&
              index > audioMetadata.endLoopIndex))
        }
        prevChordNoteLength={prevChordNoteLength}
        currentChordNoteLength={currentChordNoteLength}
        nextChordNoteLength={nextChordNoteLength}
        prevChordIsRest={prevChordIsRest}
        currentChordIsRest={currentChordIsRest}
        nextChordIsRest={nextChordIsRest}
      />
    );
  }

  if (type === "loopDelaySpacer") {
    return <div className="absolute left-0 h-full w-[35px]"></div>;
  }
}
