import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const VIRTUALIZATION_BUFFER = 100;

interface ChordLayoutData {
  scrollPositions: number[];
  chordWidths: number[];
  totalWidth: number;
  durations: number[];
  // Virtualization indices for smooth loop transitions
  virtualizationIndex: number; // Index where the last visible chord comes into view
  virtualizationStartIndex: number; // Index where the full viewport ends (start of "catchup" zone)
  virtualizationCatchupIndex: number; // Index where the beginning of the tab leaves the viewport
}

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
  }));

  const containerRef = (element: HTMLDivElement | null) => {
    if (element && !containerElement) setContainerElement(element);
  };
  const modalContentRef = useRef<HTMLDivElement | null>(null);

  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);
  const [showBackgroundBlur, setShowBackgroundBlur] = useState(false);

  const [initialPlaceholderWidth, setInitialPlaceholderWidth] = useState(0);

  // Per-chord repetition tracking for smooth infinite scroll without visual snapping
  // Each chord tracks how many times it has "looped" for positioning purposes
  const [chordRepetitions, setChordRepetitions] = useState<number[]>([]);

  // v avoids polluting the store with these extra semi-local values
  const [loopRange, setLoopRange] = useState<[number, number]>([
    audioMetadata.startLoopIndex,
    audioMetadata.endLoopIndex === -1
      ? audioMetadata.fullCurrentlyPlayingMetadataLength - 1
      : audioMetadata.endLoopIndex,
  ]);
  const [tabProgressValue, setTabProgressValue] = useState(0);

  // loopCount tracks how many full iterations through the tab we've completed
  // This is derived directly from currentChordIndex
  const loopCount = useMemo(() => {
    if (!currentlyPlayingMetadata) return 0;
    return Math.floor(currentChordIndex / currentlyPlayingMetadata.length);
  }, [currentChordIndex, currentlyPlayingMetadata]);

  useModalScrollbarHandling(true);

  // Initialize chordRepetitions when expandedTabData changes
  useEffect(() => {
    if (expandedTabData && expandedTabData.length > 0) {
      setChordRepetitions(new Array(expandedTabData.length).fill(0));
    }
  }, [expandedTabData]);

  // Compute chord layout data (positions, widths, durations) - memoized
  const chordLayoutData = useMemo<ChordLayoutData | null>(() => {
    if (
      !expandedTabData ||
      !playbackMetadata ||
      expandedTabData.length === 0 ||
      visiblePlaybackContainerWidth === 0
    ) {
      return null;
    }

    const scrollPositions: number[] = [];
    const chordWidths: number[] = [];
    let offsetLeft = 0;

    for (let i = 0; i < expandedTabData.length; i++) {
      const chord = expandedTabData[i];

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

      scrollPositions[i] = offsetLeft;
      chordWidths[i] = chordWidth;
      offsetLeft += chordWidth;
    }

    const totalWidth = offsetLeft;
    const finalChordWidth = chordWidths[chordWidths.length - 1] ?? 0;

    const durations = playbackMetadata.map((metadata) => {
      const { bpm, noteLengthMultiplier } = metadata;
      return 60 / ((bpm / noteLengthMultiplier) * playbackSpeed);
    });

    // Compute virtualization indices for smooth loop transitions
    // virtualizationIndex: the earliest chord index where the final chord becomes visible
    let virtualizationIndex = 0;
    for (let i = expandedTabData.length - 1; i >= 0; i--) {
      const currentPosition = scrollPositions[i];
      const lastChordPosition = scrollPositions[scrollPositions.length - 1];

      if (currentPosition === undefined || lastChordPosition === undefined) {
        continue;
      }

      if (
        currentPosition + visiblePlaybackContainerWidth * 0.5 <=
        lastChordPosition + finalChordWidth
      ) {
        virtualizationIndex = i;
        break;
      }
    }

    // virtualizationStartIndex: where the full viewport ends (chords after this won't be incremented in first phase)
    let virtualizationStartIndex = 0;
    for (let i = expandedTabData.length - 1; i >= 0; i--) {
      const currentPosition = scrollPositions[i];
      const lastChordPosition = scrollPositions[scrollPositions.length - 1];

      if (currentPosition === undefined || lastChordPosition === undefined) {
        continue;
      }

      if (
        currentPosition + visiblePlaybackContainerWidth <=
        lastChordPosition + finalChordWidth
      ) {
        virtualizationStartIndex = i;
        break;
      }
    }

    // virtualizationCatchupIndex: where the beginning of the tab leaves the viewport
    let virtualizationCatchupIndex = 0;
    for (let i = 0; i < expandedTabData.length - 1; i++) {
      const currentPosition = scrollPositions[i];

      if (currentPosition === undefined) {
        continue;
      }

      if (currentPosition - visiblePlaybackContainerWidth * 0.5 >= 0) {
        virtualizationCatchupIndex = i;
        break;
      }
    }

    return {
      scrollPositions,
      chordWidths,
      totalWidth,
      durations,
      virtualizationIndex,
      virtualizationStartIndex,
      virtualizationCatchupIndex,
    };
  }, [
    expandedTabData,
    playbackMetadata,
    playbackSpeed,
    visiblePlaybackContainerWidth,
  ]);

  // Helper to compute scroll position for a chord using chordRepetitions
  const getChordScrollPosition = useCallback(
    (index: number) => {
      if (!chordLayoutData) return 0;
      const { scrollPositions, totalWidth } = chordLayoutData;
      return (
        (scrollPositions[index] ?? 0) +
        (chordRepetitions[index] ?? 0) * totalWidth
      );
    },
    [chordLayoutData, chordRepetitions],
  );

  // Compute visible chord range using binary search with chordRepetitions
  const visibleRange = useMemo<{
    startIndex: number;
    endIndex: number;
  }>(() => {
    if (
      !chordLayoutData ||
      !expandedTabData ||
      !currentlyPlayingMetadata ||
      visiblePlaybackContainerWidth === 0 ||
      chordRepetitions.length === 0
    ) {
      return {
        startIndex: 0,
        endIndex: 0,
      };
    }

    const { scrollPositions, totalWidth } = chordLayoutData;
    const chordCount = expandedTabData.length;

    // Get current chord's scroll position using its repetition count
    const currentScrollPosition =
      (scrollPositions[currentChordIndex] ?? 0) +
      (chordRepetitions[currentChordIndex] ?? 0) * totalWidth;

    const halfViewport = visiblePlaybackContainerWidth / 2;
    const minVisiblePosition =
      currentScrollPosition - halfViewport - VIRTUALIZATION_BUFFER;
    const maxVisiblePosition =
      currentScrollPosition + halfViewport + VIRTUALIZATION_BUFFER;

    // Find visible range - we need to check each chord's actual position with its repetition
    let startIndex = 0;
    let endIndex = chordCount - 1;

    // Find start index
    for (let i = 0; i < chordCount; i++) {
      const chordPosition =
        (scrollPositions[i] ?? 0) + (chordRepetitions[i] ?? 0) * totalWidth;
      if (chordPosition >= minVisiblePosition) {
        startIndex = Math.max(0, i - 1);
        break;
      }
    }

    // Find end index
    for (let i = chordCount - 1; i >= 0; i--) {
      const chordPosition =
        (scrollPositions[i] ?? 0) + (chordRepetitions[i] ?? 0) * totalWidth;
      if (chordPosition <= maxVisiblePosition) {
        endIndex = Math.min(chordCount - 1, i + 1);
        break;
      }
    }

    return {
      startIndex,
      endIndex,
    };
  }, [
    chordLayoutData,
    expandedTabData,
    currentlyPlayingMetadata,
    visiblePlaybackContainerWidth,
    currentChordIndex,
    chordRepetitions,
  ]);

  // Primary chord virtualization effect - increments all chords except the last visible portion
  // Triggers when current chord index reaches the point where the last chord becomes visible
  useEffect(() => {
    if (
      !chordLayoutData ||
      chordRepetitions.length === 0 ||
      currentChordIndex < chordLayoutData.virtualizationIndex ||
      chordRepetitions[0] !== chordRepetitions[chordRepetitions.length - 1] // primary virtualization already happened
    ) {
      return;
    }

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
  }, [chordLayoutData, chordRepetitions, currentChordIndex]);

  // Catchup chord virtualization effect - increments the remaining chords after they leave the viewport
  // Triggers after the beginning of the tab leaves the viewport on a new loop
  useEffect(() => {
    if (
      !chordLayoutData ||
      chordRepetitions.length === 0 ||
      // making sure that this only happens post-primary virtualization and not
      // before the virtualizationCatchupIndex has been reached
      currentChordIndex >= chordLayoutData.virtualizationIndex ||
      currentChordIndex < chordLayoutData.virtualizationCatchupIndex ||
      chordRepetitions[0] === chordRepetitions[chordRepetitions.length - 1] // all chords are already caught up
    ) {
      return;
    }

    setChordRepetitions((prev) => {
      const newRepetitions = prev[0] ?? 0;
      return new Array(prev.length).fill(newRepetitions) as number[];
    });
  }, [chordLayoutData, chordRepetitions, currentChordIndex]);

  // Handle resize
  useEffect(() => {
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

  // Reset on modal close
  useEffect(() => {
    return () => {
      setPlaybackModalViewingState("Practice");
      setCurrentChordIndex(0);
    };
  }, [setPlaybackModalViewingState, setCurrentChordIndex]);

  // Compute transform for scroll container using chordRepetitions
  const scrollContainerTransform = useMemo(() => {
    if (
      !chordLayoutData ||
      !expandedTabData ||
      !currentlyPlayingMetadata ||
      chordRepetitions.length === 0
    )
      return "translateX(0px)";

    const { scrollPositions, totalWidth } = chordLayoutData;
    const chordCount = expandedTabData.length;

    // When playing, we animate toward the NEXT chord position
    // Use chordRepetitions to determine the correct iteration offset
    const isAtLastChord = currentChordIndex === chordCount - 1;

    let targetIndex: number;
    let targetRepetition: number;

    if (audioMetadata.playing) {
      if (isAtLastChord) {
        // Transition to first chord of next iteration
        // The first chord will have already been incremented by virtualization
        targetIndex = 0;
        targetRepetition = chordRepetitions[0] ?? 0;
      } else {
        // Transition to next chord in same iteration
        targetIndex = currentChordIndex + 1;
        targetRepetition = chordRepetitions[targetIndex] ?? 0;
      }
    } else {
      // Not playing - stay at current position
      targetIndex = currentChordIndex;
      targetRepetition = chordRepetitions[currentChordIndex] ?? 0;
    }

    const position =
      (scrollPositions[targetIndex] ?? 0) + targetRepetition * totalWidth;

    return `translateX(${position * -1}px)`;
  }, [
    chordLayoutData,
    expandedTabData,
    currentlyPlayingMetadata,
    currentChordIndex,
    audioMetadata.playing,
    chordRepetitions,
  ]);

  // Determine if a chord should be highlighted based on its position and the current chord
  const isChordHighlighted = useCallback(
    (chordIndex: number): boolean => {
      if (
        !expandedTabData ||
        !currentlyPlayingMetadata ||
        chordRepetitions.length === 0
      )
        return false;

      // Currently playing chord
      if (currentChordIndex === chordIndex) return true;

      // A chord is highlighted if:
      // 1. It has the same repetition count as the current chord AND comes before it
      // 2. OR it has a lower repetition count (it's from the "past" but still visible)
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
      expandedTabData,
      currentlyPlayingMetadata,
      currentChordIndex,
      chordRepetitions,
    ],
  );

  // Get visible chords - uses chordRepetitions for positioning
  const visibleChords = useMemo(() => {
    if (!expandedTabData || !chordLayoutData) return [];

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
  }, [expandedTabData, chordLayoutData, visibleRange]);

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
                    scrollPositionsLength={
                      chordLayoutData?.scrollPositions.length ?? 0
                    }
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

                      {chordLayoutData && expandedTabData && (
                        <div
                          style={{
                            width: `${chordLayoutData.totalWidth}px`,
                            transform: scrollContainerTransform,
                            transition: `transform ${
                              audioMetadata.playing
                                ? (chordLayoutData.durations[
                                    currentChordIndex
                                  ] ?? 0)
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

                          {/* Only render visible chords - true virtualization with chordRepetitions for smooth looping */}
                          {visibleChords.map(
                            ({ chord, index, prevChord, nextChord }) => (
                              <div
                                key={`${index}-${chordRepetitions[index] ?? 0}`}
                                style={{
                                  position: "absolute",
                                  width: `${chordLayoutData.chordWidths[index] ?? 0}px`,
                                  left: `${
                                    getChordScrollPosition(index) +
                                    initialPlaceholderWidth
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
                                  chordRepetitions={chordRepetitions}
                                  audioMetadata={audioMetadata}
                                  loopDelay={loopDelay}
                                  isHighlighted={
                                    !audioMetadata.editingLoopRange &&
                                    isChordHighlighted(index)
                                  }
                                />
                              </div>
                            ),
                          )}
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
                chordDurations={chordLayoutData?.durations ?? []}
                loopRange={loopRange}
                setLoopRange={setLoopRange}
                tabProgressValue={tabProgressValue}
                setTabProgressValue={setTabProgressValue}
                setChordRepetitions={setChordRepetitions}
                scrollPositionsLength={
                  chordLayoutData?.scrollPositions.length ?? 0
                }
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
}: RenderChordByTypeProps) {
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
          index === 0 && (loopDelay !== 0 || (chordRepetitions[0] ?? 0) === 0)
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
          index === 0 && (loopDelay !== 0 || (chordRepetitions[0] ?? 0) === 0)
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
