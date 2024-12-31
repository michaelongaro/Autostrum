import { useEffect, useRef, useState } from "react";
import PlaybackAudioControls from "~/components/Tab/Playback/PlaybackAudio/PlaybackAudioControls";
import PlaybackBottomMetadata from "~/components/Tab/Playback/PlaybackBottomMetadata";
import PlaybackStrummedChord from "~/components/Tab/Playback/PlaybackStrummedChord";
import PlaybackTabChord from "~/components/Tab/Playback/PlaybackTabChord";
import PlaybackTabMeasureLine from "~/components/Tab/Playback/PlaybackTabMeasureLine";
import PlaybackTopMetadata from "~/components/Tab/Playback/PlaybackTopMetadata";
import { AnimatePresence, motion } from "framer-motion";
import FocusTrap from "focus-trap-react";
import {
  type AudioMetadata,
  type PlaybackTabChord as PlaybackTabChordType,
  type PlaybackStrummedChord as PlaybackStrummedChordType,
  useTabStore,
} from "~/stores/TabStore";
import PlaybackMenuContent from "~/components/Tab/Playback/PlaybackMenuContent";
import PlaybackScrollingContainer from "~/components/Tab/Playback/PlaybackScrollingContainer";
import { X } from "lucide-react";
import { Button } from "~/components/ui/button";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

function PlaybackModal() {
  const {
    expandedTabData,
    currentChordIndex,
    playbackSpeed,
    setCurrentChordIndex,
    playbackMetadata,
    audioMetadata,
    showPlaybackModal,
    setShowPlaybackModal,
    visiblePlaybackContainerWidth,
    setVisiblePlaybackContainerWidth,
    playbackDialogViewingState,
    viewportLabel,
    loopDelay,
    setAudioMetadata,
    setPlaybackModalViewingState,
    pauseAudio,
    setPreventFramerLayoutShift,
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    expandedTabData: state.expandedTabData,
    playbackSpeed: state.playbackSpeed,
    setCurrentChordIndex: state.setCurrentChordIndex,
    playbackMetadata: state.playbackMetadata,
    audioMetadata: state.audioMetadata,
    showPlaybackModal: state.showPlaybackModal,
    setShowPlaybackModal: state.setShowPlaybackModal,
    visiblePlaybackContainerWidth: state.visiblePlaybackContainerWidth,
    setVisiblePlaybackContainerWidth: state.setVisiblePlaybackContainerWidth,
    playbackDialogViewingState: state.playbackDialogViewingState,
    viewportLabel: state.viewportLabel,
    loopDelay: state.loopDelay,
    setAudioMetadata: state.setAudioMetadata,
    setPlaybackModalViewingState: state.setPlaybackModalViewingState,
    pauseAudio: state.pauseAudio,
    setPreventFramerLayoutShift: state.setPreventFramerLayoutShift,
  }));

  const [translateX, setTranslateX] = useState(0);
  const [isManuallyScrolling, setIsManuallyScrolling] = useState(false);

  const containerRef = (element: HTMLDivElement | null) => {
    if (element && !containerElement) setContainerElement(element);
  };
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);

  const [chordDurations, setChordDurations] = useState<number[]>([]);
  const [initialPlaceholderWidth, setInitialPlaceholderWidth] = useState(0);

  const [fullChordWidths, setFullChordWidths] = useState<number[]>([]);
  const [fullScrollPositions, setFullScrollPositions] = useState<
    {
      originalPosition: number;
      currentPosition: number | null;
    }[]
  >([]);

  const [scrollContainerWidth, setScrollContainerWidth] = useState(0);
  const [loopCount, setLoopCount] = useState(0);
  const prevCurrentChordIndexRef = useRef<number | null>(null);
  const overrideNewTranslateXRef = useRef<number | null>(null);

  // below two are just here to avoid polluting the store with these extra semi-local values
  const [loopRange, setLoopRange] = useState<[number, number]>([
    audioMetadata.startLoopIndex,
    audioMetadata.endLoopIndex === -1
      ? audioMetadata.fullCurrentlyPlayingMetadataLength - 1
      : audioMetadata.endLoopIndex,
  ]);
  const [tabProgressValue, setTabProgressValue] = useState(0); // TODO: maybe need to reset this on open/close of dialog?

  // gates computation of chord widths + positions + duplication to only when
  // expandedTabData has changed or looping has changed
  const [expandedTabDataHasChanged, setExpandedTabDataHasChanged] =
    useState(true);

  useEffect(() => {
    setPreventFramerLayoutShift(true);

    setTimeout(() => {
      const offsetY = window.scrollY;
      document.body.style.top = `${-offsetY}px`;
      document.body.classList.add("noScroll");
    }, 50);

    return () => {
      setPreventFramerLayoutShift(false);

      setTimeout(() => {
        const offsetY = Math.abs(
          parseInt(`${document.body.style.top || 0}`, 10),
        );
        document.body.classList.remove("noScroll");
        document.body.style.removeProperty("top");
        window.scrollTo(0, offsetY || 0);
      }, 50);
    };
  }, [setPreventFramerLayoutShift]);

  // manually scrolling: need to update currentChordIndex to match
  // the translateX value relative to fullScrollPositions
  useEffect(() => {
    // setTimeout of 0 to avoid blocking the main thread while scrolling
    const handler = setTimeout(() => {
      if (!isManuallyScrolling) return;

      let index = 0;
      while (index < fullScrollPositions.length) {
        const currentPosition =
          fullScrollPositions[index]?.currentPosition ||
          fullScrollPositions[index]?.originalPosition ||
          0;

        const nextPosition =
          fullScrollPositions[index + 1]?.currentPosition ||
          fullScrollPositions[index + 1]?.originalPosition ||
          0;

        if (currentPosition <= translateX && nextPosition > translateX) {
          if (scrollContainerWidth % currentPosition === 0) {
            setCurrentChordIndex(0);
            return;
          }

          setCurrentChordIndex(
            index + (currentPosition === translateX ? 0 : 1),
          );
          return;
        }

        index++;
      }
    }, 0);

    return () => {
      clearTimeout(handler);
    };
  }, [
    fullScrollPositions,
    setCurrentChordIndex,
    translateX,
    isManuallyScrolling,
    scrollContainerWidth,
  ]);

  // not manually scrolling: need to update translateX value to match
  // the currentChordIndex relative to fullScrollPositions
  useEffect(() => {
    if (isManuallyScrolling) return;

    const currentPosition =
      fullScrollPositions[currentChordIndex]?.currentPosition ||
      fullScrollPositions[currentChordIndex]?.originalPosition ||
      0;

    setTranslateX(currentPosition);
  }, [currentChordIndex, fullScrollPositions, isManuallyScrolling]);

  useEffect(() => {
    // this feels a bit like a bandaid fix
    function handleResize() {
      if (
        dialogContentRef.current === null ||
        dialogContentRef.current.clientWidth === 0 ||
        dialogContentRef.current.clientHeight === 0
        // ||
        // (prevDimensions?.width === dialogContentRef.current.clientWidth &&
        //   prevDimensions?.height === dialogContentRef.current.clientHeight)
      ) {
        return;
      }

      setInitialPlaceholderWidth(dialogContentRef.current.clientWidth / 2 - 5);
      setVisiblePlaybackContainerWidth(dialogContentRef.current.clientWidth);
      // setPrevDimensions(dialogContentRef.current.getBoundingClientRect());
    }

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [
    expandedTabData,
    showPlaybackModal,
    containerElement,
    // prevDimensions,
    setVisiblePlaybackContainerWidth,
  ]);

  useEffect(() => {
    const currentScrollPosition =
      fullScrollPositions[currentChordIndex]?.currentPosition ||
      fullScrollPositions[currentChordIndex]?.originalPosition ||
      0;

    const prevScrollPosition =
      prevCurrentChordIndexRef.current !== null
        ? fullScrollPositions[prevCurrentChordIndexRef.current]
            ?.currentPosition ||
          fullScrollPositions[prevCurrentChordIndexRef.current]
            ?.originalPosition ||
          0
        : null;

    if (
      prevCurrentChordIndexRef.current !== null &&
      prevScrollPosition !== null &&
      prevCurrentChordIndexRef.current > currentChordIndex &&
      prevScrollPosition < currentScrollPosition
    ) {
      setLoopCount((prev) => prev + 1);
    } else if (
      prevCurrentChordIndexRef.current !== null && // Ensure it's not the initial render
      prevCurrentChordIndexRef.current > currentChordIndex && // User scrolled backward
      !audioMetadata.playing // Playback is not active
    ) {
      // Reset all currentPosition to null
      const newFullScrollPositions = fullScrollPositions.map((position) => ({
        ...position,
        currentPosition: null,
      }));

      const currentPosition =
        fullScrollPositions[currentChordIndex]?.originalPosition || 0;

      setFullScrollPositions(newFullScrollPositions);

      if (loopCount > 0) {
        overrideNewTranslateXRef.current = currentPosition;
        setTranslateX(currentPosition);
        setLoopCount(0);
      }
    }

    // Update previous value refs
    prevCurrentChordIndexRef.current = currentChordIndex;
  }, [
    currentChordIndex,
    translateX,
    audioMetadata.playing,
    fullScrollPositions,
    loopCount,
  ]);

  useEffect(() => {
    setExpandedTabDataHasChanged(true);
  }, [expandedTabData]);

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

    const chordElems = new Array(expandedTabData.length).fill(0);

    const fullScrollPositions: {
      originalPosition: number;
      currentPosition: number | null;
    }[] = [];
    const fullChordWidths: number[] = [];
    let finalElementWidth = 0;
    let offsetLeft = 0;

    chordElems.map((_, index) => {
      const chord = expandedTabData[index];

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

      fullScrollPositions.push({
        originalPosition: offsetLeft,
        currentPosition: null,
      });
      fullChordWidths.push(chordWidth);

      if (index === expandedTabData.length - 1) {
        finalElementWidth = chordWidth;
      }

      offsetLeft += chordWidth;
    });

    const durations = playbackMetadata.map((metadata) => {
      const { bpm, noteLengthMultiplier } = metadata;
      return 60 / ((bpm / Number(noteLengthMultiplier)) * playbackSpeed);
    });

    let scrollContainerWidth =
      (fullScrollPositions.at(-1)?.originalPosition || 0) + finalElementWidth;

    const newChordDurations = [...durations];

    setExpandedTabDataHasChanged(false);
    setTimeout(() => {
      setFullScrollPositions(fullScrollPositions);
      setFullChordWidths(fullChordWidths);
      setScrollContainerWidth(scrollContainerWidth);
      setChordDurations(newChordDurations);
    }, 1000); // TODO: this is a bandaid fix. this looks to be a syncing issue with zustand state updates, should be fixed in react 19/next 15 though
  }, [
    containerElement,
    visiblePlaybackContainerWidth,
    expandedTabData,
    expandedTabDataHasChanged,
    chordDurations,
    playbackMetadata,
    playbackSpeed,
  ]);

  // TODO: 99% sure this is useless/should be refactored into different effect, maybe not even
  // in this component
  useEffect(() => {
    if (viewportLabel.includes("mobile")) {
      setPlaybackModalViewingState("Practice");
    }
  }, [viewportLabel, setPlaybackModalViewingState]);

  const fullVisibleChordIndices = getFullVisibleChordIndices({
    fullScrollPositions,
    currentChordIndex,
    visiblePlaybackContainerWidth,
    fullChordWidths,
    buffer: 100,
    initialPlaceholderWidth,
    setFullScrollPositions,
  });

  function highlightChord({
    chordIndex,
    type,
  }: {
    chordIndex: number;
    type: "isBeingPlayed" | "hasBeenPlayed";
  }) {
    const scrollPosition =
      fullScrollPositions[chordIndex]?.currentPosition ||
      fullScrollPositions[chordIndex]?.originalPosition;
    const startPositionOfCurrentLoop = scrollContainerWidth * (loopCount + 1);

    if (
      scrollPosition === undefined ||
      scrollPosition >= startPositionOfCurrentLoop
    ) {
      return false;
    }

    return type === "isBeingPlayed"
      ? currentChordIndex === chordIndex
      : currentChordIndex >= chordIndex + 1;
  }

  return (
    <motion.div
      key={"PlaybackModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setShowPlaybackModal(false);
          pauseAudio(true);
          setPlaybackModalViewingState("Practice");
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
          allowOutsideClick: true,
          initialFocus: false,
        }}
      >
        <div
          ref={dialogContentRef}
          className="baseVertFlex relative h-dvh w-screen max-w-none !justify-between gap-0 !rounded-none bg-black p-0 narrowMobileLandscape:!justify-center tablet:h-[650px] tablet:max-w-6xl tablet:!rounded-lg"
        >
          <PlaybackTopMetadata
            tabProgressValue={tabProgressValue}
            setTabProgressValue={setTabProgressValue}
          />

          <AnimatePresence mode="popLayout">
            {playbackDialogViewingState === "Practice" && (
              <motion.div
                key="PracticeTab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="baseVertFlex relative size-full select-none"
              >
                <div
                  style={{
                    mask: "linear-gradient(90deg, transparent, white 5%, white 95%, transparent)",
                  }}
                  className="w-full overflow-hidden"
                >
                  <PlaybackScrollingContainer
                    translateX={translateX}
                    setTranslateX={setTranslateX}
                    setIsManuallyScrolling={setIsManuallyScrolling}
                    overrideNewTranslateXRef={overrideNewTranslateXRef}
                  >
                    <div
                      ref={containerRef}
                      className="relative flex h-[247px] w-full overflow-hidden mobilePortrait:h-[267px]"
                    >
                      <div className="baseFlex absolute left-0 top-0 size-full">
                        <div className="mb-6 h-[140px] w-full mobilePortrait:h-[165px]"></div>
                        {/* currently this fixes the highlight line extending past rounded borders of
                        sections, but puts it behind measure lines. maybe this is a fine tradeoff? */}
                        <div className="z-0 mb-6 h-[140px] w-[2px] shrink-0 bg-pink-600 mobilePortrait:h-[164px]"></div>
                        <div className="mb-6 h-[140px] w-full mobilePortrait:h-[165px]"></div>
                      </div>

                      <div
                        style={{
                          width: `${scrollContainerWidth}px`,
                          transform: isManuallyScrolling
                            ? `translateX(-${translateX}px)`
                            : getScrollContainerTransform({
                                fullScrollPositions,
                                currentChordIndex,
                                audioMetadata,
                                numberOfChords: playbackMetadata?.length || 0,
                              }),
                          transition: `transform ${
                            audioMetadata.playing
                              ? chordDurations[currentChordIndex] || 0
                              : isManuallyScrolling
                                ? "none"
                                : 0.2
                          }s linear`,
                        }}
                        className="relative flex items-center will-change-transform"
                      >
                        <>
                          <div
                            style={{
                              position: "absolute",
                              zIndex: 2,
                              backgroundColor: "black",
                              left: 0,
                              width: `${initialPlaceholderWidth}px`,
                            }}
                          ></div>

                          {expandedTabData &&
                            fullVisibleChordIndices.map((fullVisibleIndex) => {
                              return (
                                <div
                                  key={fullVisibleIndex}
                                  style={{
                                    position: "absolute",
                                    width: `${fullChordWidths[fullVisibleIndex] || 0}px`,
                                    left: getChordLeftValue({
                                      index: fullVisibleIndex,
                                      fullScrollPositions,
                                      initialPlaceholderWidth,
                                    }),
                                  }}
                                >
                                  {/* TODO: probably should make measureLine have its own interface
                                so that we can just directly use the type field rather than logic below */}
                                  <RenderChordByType
                                    type={
                                      expandedTabData[fullVisibleIndex]
                                        ?.type === "strum"
                                        ? "strum"
                                        : expandedTabData[fullVisibleIndex]
                                              ?.type === "tab"
                                          ? expandedTabData[
                                              fullVisibleIndex
                                            ]?.data.chordData.includes("|")
                                            ? "measureLine"
                                            : "tab"
                                          : "loopDelaySpacer"
                                    }
                                    fullVisibleIndex={fullVisibleIndex}
                                    expandedTabData={
                                      expandedTabData as
                                        | PlaybackTabChordType[]
                                        | PlaybackStrummedChordType[]
                                    }
                                    fullScrollPositions={fullScrollPositions}
                                    audioMetadata={audioMetadata}
                                    loopDelay={loopDelay}
                                    highlightChord={highlightChord}
                                  />
                                </div>
                              );
                            })}
                        </>
                      </div>
                    </div>
                  </PlaybackScrollingContainer>
                </div>
              </motion.div>
            )}

            {!viewportLabel.includes("mobile") && <PlaybackMenuContent />}
          </AnimatePresence>

          {playbackDialogViewingState === "Practice" && (
            <div className="baseVertFlex w-full gap-1 lg:gap-2">
              <PlaybackAudioControls
                chordDurations={chordDurations}
                loopRange={loopRange}
                setLoopRange={setLoopRange}
                tabProgressValue={tabProgressValue}
                setTabProgressValue={setTabProgressValue}
              />
              <PlaybackBottomMetadata
                loopRange={loopRange}
                setLoopRange={setLoopRange}
                tabProgressValue={tabProgressValue}
                setTabProgressValue={setTabProgressValue}
              />
            </div>
          )}

          <Button
            variant={"text"}
            className="baseFlex absolute right-2 top-2 size-8 rounded-sm !p-0 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            onClick={() => {
              setShowPlaybackModal(false);
              pauseAudio(true);
              setPlaybackModalViewingState("Practice");
              if (audioMetadata.editingLoopRange) {
                setAudioMetadata({
                  ...audioMetadata,
                  editingLoopRange: false,
                });
              }
            }}
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default PlaybackModal;

const getFullVisibleChordIndices = ({
  fullScrollPositions: originalFullScrollPositions,
  currentChordIndex,
  visiblePlaybackContainerWidth,
  fullChordWidths,
  buffer,
  initialPlaceholderWidth,
  setFullScrollPositions,
}: {
  fullScrollPositions: {
    originalPosition: number;
    currentPosition: number | null;
  }[];
  currentChordIndex: number;
  visiblePlaybackContainerWidth: number;
  fullChordWidths: number[];
  buffer: number;
  initialPlaceholderWidth: number;
  setFullScrollPositions: React.Dispatch<
    React.SetStateAction<
      {
        originalPosition: number;
        currentPosition: number | null;
      }[]
    >
  >;
}) => {
  const fullScrollPositions = [...originalFullScrollPositions];

  if (fullScrollPositions[currentChordIndex] === undefined) {
    return [];
  }

  let fullVisibleChordIndices = [];

  const adjustedCurrentPosition =
    (fullScrollPositions[currentChordIndex]?.currentPosition ||
      fullScrollPositions[currentChordIndex].originalPosition) +
    initialPlaceholderWidth;

  // Start and end points of the visible range
  const rangeStart =
    adjustedCurrentPosition - visiblePlaybackContainerWidth / 2 - buffer;
  const rangeEnd =
    adjustedCurrentPosition + visiblePlaybackContainerWidth / 2 + buffer;

  const chordIndicesBeforeRangeStart = [];

  // FYI: if possible reimplement this with binary search, but it's not a top priority
  // ^ "adjustedScrollPositions" was just regular fullScrollPositions + initialPlaceholderWidth btw.
  // const startIndex = binarySearchStart(adjustedScrollPositions, rangeStart);
  // const endIndex = binarySearchEnd(adjustedScrollPositions, rangeEnd);
  // for (let i = startIndex; i <= endIndex; i++) {

  for (let i = 0; i < fullScrollPositions.length; i++) {
    const pos =
      fullScrollPositions[i]?.currentPosition ||
      fullScrollPositions[i]?.originalPosition ||
      0;
    const itemStart = pos + initialPlaceholderWidth;
    const chordWidth = fullChordWidths[i] || 0;
    const itemEnd = itemStart + chordWidth;

    // console.log(itemStart, itemEnd, rangeStart, rangeEnd);

    // Ensure the item is within the visible range
    if (itemEnd > rangeStart && itemStart < rangeEnd) {
      fullVisibleChordIndices.push(i);
    } else if (itemEnd < rangeStart) {
      chordIndicesBeforeRangeStart.push(i);
    }
  }

  let fullScrollPositionsWasUpdated = false;

  // need to have baseline largest scroll position so we can add the chord width
  // to get the current position in loop below
  let largestScrollPosition = 0;

  // getting largest chord scroll position
  for (let i = 0; i < fullScrollPositions.length; i++) {
    const scrollPosition =
      fullScrollPositions[i]?.currentPosition ||
      fullScrollPositions[i]?.originalPosition ||
      0;
    const chordWidth = fullChordWidths[i] || 0;

    if (scrollPosition + chordWidth > largestScrollPosition) {
      largestScrollPosition = scrollPosition + chordWidth;
    }
  }

  // increasing currentPosition of expandedTabData that are farther left than start of visible range
  for (const chordIndex of chordIndicesBeforeRangeStart) {
    const chordWidth = fullChordWidths[chordIndex] || 0;

    fullScrollPositions[chordIndex]!.currentPosition = largestScrollPosition;

    largestScrollPosition += chordWidth;
    fullScrollPositionsWasUpdated = true;
  }

  if (fullScrollPositionsWasUpdated) {
    setFullScrollPositions(fullScrollPositions);
  }

  return fullVisibleChordIndices;
};

// Binary search helper to find the first element >= value
const binarySearchStart = (arr: number[], value: number) => {
  let low = 0;
  let high = arr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midValue = arr[mid];
    if (midValue === undefined || midValue < value) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return low;
};

// Binary search helper to find the last element <= value
const binarySearchEnd = (arr: number[], value: number) => {
  let low = 0;
  let high = arr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midValue = arr[mid];
    if (midValue === undefined || midValue > value) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return high;
};

// saving for later, if choosing to get rid of the artificial gaps between strumming sections.
function getBpmToShow(
  previousBpm: number | undefined,
  currentBpm: number | undefined,
) {
  if (previousBpm !== undefined) {
    return previousBpm !== currentBpm ? currentBpm : undefined;
  }

  return currentBpm;
}

function getScrollContainerTransform({
  fullScrollPositions,
  currentChordIndex,
  audioMetadata,
  numberOfChords,
}: {
  fullScrollPositions: {
    originalPosition: number;
    currentPosition: number | null;
  }[];
  currentChordIndex: number;
  audioMetadata: AudioMetadata;
  numberOfChords: number;
}) {
  // when looping, you want to go back to the first chord position, since it
  // will already be translated to the right side of last chord position in main tab
  const index =
    audioMetadata.playing && currentChordIndex === numberOfChords - 1
      ? 0
      : currentChordIndex + (audioMetadata.playing ? 1 : 0);

  // needed(?) to prevent index from going out of bounds when looping
  const clampedIndex = Math.min(index, fullScrollPositions.length - 1);

  if (
    fullScrollPositions[clampedIndex]?.currentPosition !== null &&
    fullScrollPositions[clampedIndex]?.currentPosition !== undefined
  ) {
    return `translateX(${
      fullScrollPositions[clampedIndex].currentPosition * -1
    }px)`;
  }

  return `translateX(${
    (fullScrollPositions[clampedIndex]?.originalPosition || 0) * -1
  }px)`;
}

function getChordLeftValue({
  index,
  fullScrollPositions,
  initialPlaceholderWidth,
}: {
  index: number;
  fullScrollPositions: {
    originalPosition: number;
    currentPosition: number | null;
  }[];
  initialPlaceholderWidth: number;
}) {
  return `${
    (fullScrollPositions[index]?.currentPosition ||
      fullScrollPositions[index]?.originalPosition ||
      0) + initialPlaceholderWidth
  }px`;
}

interface RenderChordByType {
  type: "tab" | "measureLine" | "strum" | "loopDelaySpacer";
  fullVisibleIndex: number;
  expandedTabData: PlaybackTabChordType[] | PlaybackStrummedChordType[];
  fullScrollPositions: {
    originalPosition: number;
    currentPosition: number | null;
  }[];
  audioMetadata: AudioMetadata;
  loopDelay: number;
  highlightChord: (args: {
    chordIndex: number;
    type: "isBeingPlayed" | "hasBeenPlayed";
  }) => boolean;
}

function RenderChordByType({
  type,
  fullVisibleIndex,
  expandedTabData,
  fullScrollPositions,
  audioMetadata,
  loopDelay,
  highlightChord,
}: RenderChordByType) {
  if (type === "tab" && expandedTabData[fullVisibleIndex]?.type === "tab") {
    return (
      <PlaybackTabChord
        columnData={expandedTabData[fullVisibleIndex]?.data.chordData}
        isFirstChordInSection={
          fullVisibleIndex === 0 &&
          (loopDelay !== 0 || fullScrollPositions[0]?.currentPosition === null)
        }
        isLastChordInSection={
          expandedTabData[fullVisibleIndex]?.isLastChord && loopDelay !== 0
        }
        isHighlighted={
          !audioMetadata.editingLoopRange &&
          ((audioMetadata.playing &&
            highlightChord({
              chordIndex: fullVisibleIndex,
              type: "isBeingPlayed",
            })) ||
            highlightChord({
              chordIndex: fullVisibleIndex,
              type: "hasBeenPlayed",
            }))
        }
        isDimmed={
          audioMetadata.editingLoopRange &&
          (fullVisibleIndex < audioMetadata.startLoopIndex ||
            (audioMetadata.endLoopIndex !== -1 &&
              fullVisibleIndex > audioMetadata.endLoopIndex))
        }
      />
    );
  }

  if (
    type === "measureLine" &&
    expandedTabData[fullVisibleIndex]?.type === "tab"
  ) {
    return (
      <PlaybackTabMeasureLine
        columnData={expandedTabData[fullVisibleIndex]!.data.chordData}
        isDimmed={
          audioMetadata.editingLoopRange &&
          (fullVisibleIndex < audioMetadata.startLoopIndex ||
            (audioMetadata.endLoopIndex !== -1 &&
              fullVisibleIndex > audioMetadata.endLoopIndex))
        }
      />
    );
  }

  if (type === "strum" && expandedTabData[fullVisibleIndex]?.type === "strum") {
    return (
      <PlaybackStrummedChord
        strumIndex={expandedTabData[fullVisibleIndex]?.data.strumIndex || 0}
        strum={expandedTabData[fullVisibleIndex]?.data.strum || ""}
        palmMute={expandedTabData[fullVisibleIndex]?.data.palmMute || ""}
        isFirstChordInSection={
          fullVisibleIndex === 0 &&
          (loopDelay !== 0 || fullScrollPositions[0]?.currentPosition === null)
        }
        isLastChordInSection={
          expandedTabData[fullVisibleIndex]?.isLastChord && loopDelay !== 0
        }
        noteLength={
          expandedTabData[fullVisibleIndex]?.data.noteLength || "1/4th"
        }
        bpmToShow={
          expandedTabData[fullVisibleIndex]?.data.showBpm
            ? expandedTabData[fullVisibleIndex]?.data.bpm
            : undefined
        }
        chordName={expandedTabData[fullVisibleIndex]?.data.chordName || ""}
        isHighlighted={
          !audioMetadata.editingLoopRange &&
          ((audioMetadata.playing &&
            highlightChord({
              chordIndex: fullVisibleIndex,
              type: "isBeingPlayed",
            })) ||
            highlightChord({
              chordIndex: fullVisibleIndex,
              type: "hasBeenPlayed",
            }))
        }
        isDimmed={
          audioMetadata.editingLoopRange &&
          (fullVisibleIndex < audioMetadata.startLoopIndex ||
            (audioMetadata.endLoopIndex !== -1 &&
              fullVisibleIndex > audioMetadata.endLoopIndex))
        }
        isRaised={expandedTabData[fullVisibleIndex]?.data.isRaised || false}
      />
    );
  }

  if (type === "loopDelaySpacer") {
    return (
      <div
        style={{
          position: "absolute",
          width: "35px",
          height: "100%",
          backgroundColor: "black",
          left: 0,
        }}
      ></div>
    );
  }
}
