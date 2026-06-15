import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PlaybackAudioControls from "~/components/Tab/Playback/PlaybackAudio/PlaybackAudioControls";
import PlaybackBottomMetadata from "~/components/Tab/Playback/PlaybackBottomMetadata";
import PlaybackStrummedChord from "~/components/Tab/Playback/PlaybackStrummedChord";
import PlaybackTabChord from "~/components/Tab/Playback/PlaybackTabChord";
import PlaybackTabMeasureLine from "~/components/Tab/Playback/PlaybackTabMeasureLine";
import PlaybackTopMetadata from "~/components/Tab/Playback/PlaybackTopMetadata";
import { AnimatePresence, motion } from "framer-motion";
import { FocusTrap } from "focus-trap-react";
import {
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
import usePlaybackStripAnimation from "~/hooks/usePlaybackStripAnimation";

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
  trailingEdges: number[];
  chordWidths: number[];
  totalWidth: number;
  durations: number[];
}

interface VisibleChordInstance {
  absoluteLeft: number;
  chord:
    | PlaybackTabChordType
    | PlaybackStrummedChordType
    | PlaybackLoopDelaySpacerChord;
  cycle: number;
  index: number;
  nextChord?:
    | PlaybackTabChordType
    | PlaybackStrummedChordType
    | PlaybackLoopDelaySpacerChord;
  prevChord?:
    | PlaybackTabChordType
    | PlaybackStrummedChordType
    | PlaybackLoopDelaySpacerChord;
}

function lowerBound(values: number[], target: number) {
  let low = 0;
  let high = values.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if ((values[middle] ?? 0) < target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}

function upperBound(values: number[], target: number) {
  let low = 0;
  let high = values.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if ((values[middle] ?? 0) <= target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}

function PlaybackModal() {
  const {
    currentChordIndex,
    expandedTabData,
    playbackSpeed,
    playbackMetadata,
    audioMetadata,
    audioContext,
    showPlaybackModal,
    setShowPlaybackModal,
    visiblePlaybackContainerWidth,
    setVisiblePlaybackContainerWidth,
    playbackModalViewingState,
    viewportLabel,
    loopDelay,
    currentlyPlayingMetadata,
    playbackStartedAtAudioTime,
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
    audioContext: state.audioContext,
    showPlaybackModal: state.showPlaybackModal,
    setShowPlaybackModal: state.setShowPlaybackModal,
    visiblePlaybackContainerWidth: state.visiblePlaybackContainerWidth,
    setVisiblePlaybackContainerWidth: state.setVisiblePlaybackContainerWidth,
    playbackModalViewingState: state.playbackModalViewingState,
    viewportLabel: state.viewportLabel,
    loopDelay: state.loopDelay,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    playbackStartedAtAudioTime: state.playbackStartedAtAudioTime,
    setAudioMetadata: state.setAudioMetadata,
    setPlaybackModalViewingState: state.setPlaybackModalViewingState,
    pauseAudio: state.pauseAudio,
    setCurrentChordIndex: state.setCurrentChordIndex,
  }));
  const scrollStripRef = useRef<HTMLDivElement | null>(null);

  const containerRef = (element: HTMLDivElement | null) => {
    if (element && !containerElement) setContainerElement(element);
  };
  const modalContentRef = useRef<HTMLDivElement | null>(null);

  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);
  const [showBackgroundBlur, setShowBackgroundBlur] = useState(false);

  const [initialPlaceholderWidth, setInitialPlaceholderWidth] = useState(0);
  const [stripLoopCycle, setStripLoopCycle] = useState(0);

  // v avoids polluting the store with these extra semi-local values
  const [loopRange, setLoopRange] = useState<[number, number]>([
    audioMetadata.startLoopIndex,
    audioMetadata.endLoopIndex === -1
      ? audioMetadata.fullCurrentlyPlayingMetadataLength - 1
      : audioMetadata.endLoopIndex,
  ]);
  const [tabProgressValue, setTabProgressValue] = useState(0);

  useModalScrollbarHandling(true);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("disablePullToRefresh");

    return () => {
      html.classList.remove("disablePullToRefresh");
    };
  }, []);

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
    const trailingEdges: number[] = [];
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
            ? 34
            : 40;

      scrollPositions[i] = offsetLeft;
      chordWidths[i] = chordWidth;
      offsetLeft += chordWidth;
      trailingEdges[i] = offsetLeft;
    }

    const totalWidth = offsetLeft;

    const durations = expandedTabData.map((chord, index) => {
      const metadata = playbackMetadata[index];

      if (!metadata) return 0;

      const isZeroDurationMeasureLine =
        chord?.type === "tab" && chord?.data.chordData.includes("|");
      const isZeroDurationTypeSpacer =
        (chord?.type === "tab" && chord?.data.chordData[0] === "-1") ||
        (chord?.type === "strum" && chord?.data.strumIndex === -1);

      if (isZeroDurationMeasureLine || isZeroDurationTypeSpacer) {
        return 0;
      }

      const { bpm, noteLengthMultiplier } = metadata;
      return 60 / ((bpm / noteLengthMultiplier) * playbackSpeed);
    });

    return {
      scrollPositions,
      trailingEdges,
      chordWidths,
      totalWidth,
      durations,
    };
  }, [
    expandedTabData,
    playbackMetadata,
    playbackSpeed,
    visiblePlaybackContainerWidth,
  ]);

  const resetPlaybackVirtualization = useCallback(
    (nextLoopCycle = 0) => {
      setStripLoopCycle(Math.max(0, nextLoopCycle));
    },
    [setStripLoopCycle],
  );

  const seekPlaybackChord = useCallback(
    (nextChordIndex: number) => {
      if (!currentlyPlayingMetadata || currentlyPlayingMetadata.length === 0) {
        return;
      }

      const clampedChordIndex = Math.min(
        Math.max(nextChordIndex, 0),
        currentlyPlayingMetadata.length - 1,
      );

      resetPlaybackVirtualization();
      setCurrentChordIndex(clampedChordIndex);
    },
    [
      currentlyPlayingMetadata,
      resetPlaybackVirtualization,
      setCurrentChordIndex,
    ],
  );

  const stepPlaybackChord = useCallback(
    (direction: 1 | -1) => {
      if (!expandedTabData || expandedTabData.length === 0) return;

      if (direction === 1) {
        if (currentChordIndex >= expandedTabData.length - 1) {
          setStripLoopCycle((previousLoopCycle) => previousLoopCycle + 1);
          setCurrentChordIndex(0);
          return;
        }

        const nextChordIndex = currentChordIndex + 1;
        setCurrentChordIndex(nextChordIndex);
        return;
      }

      if (currentChordIndex === 0) {
        if (stripLoopCycle === 0) return;

        resetPlaybackVirtualization(stripLoopCycle - 1);
        setCurrentChordIndex(expandedTabData.length - 1);
        return;
      }

      const nextChordIndex = currentChordIndex - 1;
      setCurrentChordIndex(nextChordIndex);
    },
    [
      currentChordIndex,
      expandedTabData,
      resetPlaybackVirtualization,
      setCurrentChordIndex,
      stripLoopCycle,
    ],
  );

  // Helper to compute scroll position for a chord using the strip loop cycle
  const getChordScrollPosition = useCallback(
    (index: number, cycle = stripLoopCycle) => {
      if (!chordLayoutData) return 0;
      const { scrollPositions, totalWidth } = chordLayoutData;
      return (scrollPositions[index] ?? 0) + cycle * totalWidth;
    },
    [chordLayoutData, stripLoopCycle],
  );

  const currentAbsoluteScrollPosition = useMemo(() => {
    if (
      !chordLayoutData ||
      !expandedTabData ||
      currentChordIndex >= expandedTabData.length
    ) {
      return 0;
    }

    return getChordScrollPosition(currentChordIndex);
  }, [
    chordLayoutData,
    expandedTabData,
    currentChordIndex,
    getChordScrollPosition,
  ]);

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

  usePlaybackStripAnimation({
    stripRef: scrollStripRef,
    chordLayoutData,
    currentChordIndex,
    currentLoopCycle: stripLoopCycle,
    audioContext,
    playbackStartedAtAudioTime,
    onLoopCycle: () =>
      setStripLoopCycle((previousLoopCycle) => previousLoopCycle + 1),
    playing: audioMetadata.playing,
  });

  // Keep the inline transform at the current chord boundary.
  // While playing, WAAPI owns motion; while paused, this preserves the existing settle/scrub path.
  const scrollContainerTransform = useMemo(() => {
    if (
      !chordLayoutData ||
      !expandedTabData ||
      currentChordIndex >= expandedTabData.length
    )
      return "translateX(0px)";

    return `translateX(${currentAbsoluteScrollPosition * -1}px)`;
  }, [
    chordLayoutData,
    expandedTabData,
    currentChordIndex,
    currentAbsoluteScrollPosition,
  ]);

  const isChordHighlighted = useCallback(
    (chordIndex: number, cycle: number): boolean => {
      if (!expandedTabData) return false;

      if (
        currentChordIndex === chordIndex &&
        cycle === stripLoopCycle &&
        audioMetadata.playing
      ) {
        return true;
      }

      if (cycle < stripLoopCycle) {
        return true;
      }

      if (cycle === stripLoopCycle && chordIndex < currentChordIndex) {
        return true;
      }

      return false;
    },
    [
      expandedTabData,
      currentChordIndex,
      audioMetadata.playing,
      stripLoopCycle,
    ],
  );

  const visibleChordInstances = useMemo<VisibleChordInstance[]>(() => {
    if (
      !expandedTabData ||
      !chordLayoutData ||
      visiblePlaybackContainerWidth === 0
    ) {
      return [];
    }

    const { scrollPositions, trailingEdges, totalWidth } = chordLayoutData;
    const halfViewport = visiblePlaybackContainerWidth / 2;
    const minVisiblePosition =
      currentAbsoluteScrollPosition - halfViewport - VIRTUALIZATION_BUFFER;
    const maxVisiblePosition =
      currentAbsoluteScrollPosition + halfViewport + VIRTUALIZATION_BUFFER;

    const result: VisibleChordInstance[] = [];

    for (
      let cycle = Math.max(0, stripLoopCycle - 1);
      cycle <= stripLoopCycle + 1;
      cycle++
    ) {
      const cycleBasePosition = cycle * totalWidth;
      const cycleStartIndex = lowerBound(
        trailingEdges,
        minVisiblePosition - cycleBasePosition,
      );
      const cycleEndIndex =
        upperBound(
          scrollPositions,
          maxVisiblePosition - cycleBasePosition,
        ) - 1;

      if (
        cycleStartIndex >= expandedTabData.length ||
        cycleEndIndex < 0 ||
        cycleStartIndex > cycleEndIndex
      ) {
        continue;
      }

      for (let index = cycleStartIndex; index <= cycleEndIndex; index++) {
        const chord = expandedTabData[index];
        if (!chord) continue;

        result.push({
          absoluteLeft: getChordScrollPosition(index, cycle),
          chord,
          cycle,
          index,
          prevChord: expandedTabData[index - 1],
          nextChord: expandedTabData[index + 1],
        });
      }
    }

    return result;
  }, [
    chordLayoutData,
    currentAbsoluteScrollPosition,
    expandedTabData,
    getChordScrollPosition,
    stripLoopCycle,
    visiblePlaybackContainerWidth,
  ]);

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
          resetPlaybackVirtualization();
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
                    canWrapBackward={stripLoopCycle > 0}
                    stepPlaybackChord={stepPlaybackChord}
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
                          ref={scrollStripRef}
                          style={{
                            width: `${chordLayoutData.totalWidth}px`,
                            transform: scrollContainerTransform,
                            transition: audioMetadata.playing
                              ? "none"
                              : "transform 0.2s linear",
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

                          {/* Only render visible chords in ordered loop space */}
                          {visibleChordInstances.map(
                            ({
                              absoluteLeft,
                              chord,
                              cycle,
                              index,
                              prevChord,
                              nextChord,
                            }) => {
                              const isDimmed =
                                audioMetadata.editingLoopRange &&
                                (index < audioMetadata.startLoopIndex ||
                                  (audioMetadata.endLoopIndex !== -1 &&
                                    index > audioMetadata.endLoopIndex));

                              const isFirstChordInSection =
                                index === 0 &&
                                (loopDelay !== 0 || cycle === 0);

                              return (
                                <div
                                  key={`${cycle}-${index}`}
                                  style={{
                                    position: "absolute",
                                    width: `${chordLayoutData.chordWidths[index] ?? 0}px`,
                                    left: `${absoluteLeft + initialPlaceholderWidth}px`,
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
                                    isFirstChordInSection={
                                      isFirstChordInSection
                                    }
                                    isDimmed={isDimmed}
                                    loopDelay={loopDelay}
                                    isHighlighted={
                                      !audioMetadata.editingLoopRange &&
                                      isChordHighlighted(index, cycle)
                                    }
                                  />
                                </div>
                              );
                            },
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
                resetPlaybackVirtualization={resetPlaybackVirtualization}
                seekPlaybackChord={seekPlaybackChord}
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
              resetPlaybackVirtualization();
              setShowPlaybackModal(false);
              pauseAudio();

              if (audioMetadata.editingLoopRange) {
                setAudioMetadata({
                  ...audioMetadata,
                  editingLoopRange: false,
                });
              }
            }}
            className="shadow-none"
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
  isFirstChordInSection: boolean;
  isDimmed: boolean;
  loopDelay: number;
  isHighlighted: boolean;
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
}: RenderChordByTypeProps) {
  const prevChordNoteLength = prevChord
    ? prevChord.type === "strum" && !prevChord.isLastChord // don't want to have separate strumming patterns' note length guides be connected
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
      (chord.type !== "strum" || !chord.isLastChord) // don't want to have separate strumming patterns' note length guides be connected
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
      />
    );
  }

  if (type === "loopDelaySpacer") {
    return <div className="absolute left-0 h-full w-[34px]"></div>;
  }
});
