import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import ProgressSlider from "~/components/AudioControls/ProgressSlider";
import PlaybackAudioControls from "~/components/Tab/Playback/PlaybackAudio/PlaybackAudioControls";
import PlaybackBottomMetadata from "~/components/Tab/Playback/PlaybackBottomMetadata";
import PlaybackStrummedChord from "~/components/Tab/Playback/PlaybackStrummedChord";
import PlaybackTabChord from "~/components/Tab/Playback/PlaybackTabChord";
import PlaybackTabMeasureLine from "~/components/Tab/Playback/PlaybackTabMeasureLine";
import PlaybackTopMetadata from "~/components/Tab/Playback/PlaybackTopMetadata";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "~/components/ui/button";
import { getTrackBackground, Range } from "react-range";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  type AudioMetadata,
  type PlaybackTabChord as PlaybackTabChordType,
  type PlaybackStrummedChord as PlaybackStrummedChordType,
  useTabStore,
} from "~/stores/TabStore";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import PlaybackMenuContent from "~/components/Tab/Playback/PlaybackMenuContent";

function PlaybackDialog() {
  const {
    expandedTabData,
    currentChordIndex,
    playbackSpeed,
    setCurrentChordIndex,
    currentlyPlayingMetadata,
    playbackMetadata,
    setPlaybackMetadata,
    audioMetadata,
    showPlaybackDialog,
    setShowPlaybackDialog,
    title,
    looping,
    setLooping,
    description,
    visiblePlaybackContainerWidth,
    setVisiblePlaybackContainerWidth,
    playbackDialogViewingState,
    viewportLabel,
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    expandedTabData: state.expandedTabData,
    playbackSpeed: state.playbackSpeed,
    setCurrentChordIndex: state.setCurrentChordIndex,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    playbackMetadata: state.playbackMetadata,
    setPlaybackMetadata: state.setPlaybackMetadata,
    audioMetadata: state.audioMetadata,
    showPlaybackDialog: state.showPlaybackDialog,
    setShowPlaybackDialog: state.setShowPlaybackDialog,
    title: state.title,
    looping: state.looping,
    setLooping: state.setLooping,
    description: state.description,
    visiblePlaybackContainerWidth: state.visiblePlaybackContainerWidth,
    setVisiblePlaybackContainerWidth: state.setVisiblePlaybackContainerWidth,
    playbackDialogViewingState: state.playbackDialogViewingState,
    viewportLabel: state.viewportLabel,
  }));

  const [values, setValues] = useState([currentChordIndex]);

  const containerRef = (element: HTMLDivElement | null) => {
    if (element && !containerElement) setContainerElement(element);
  };
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);
  const [prevDimensions, setPrevDimensions] = useState<DOMRect | null>(null);

  // const [prevCurrentChordIndex, setPrevCurrentChordIndex] = useState(0); // should this start at -1?

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
  const prevChordIndexRef = useRef<number | null>(null);
  const [loopCount, setLoopCount] = useState(0);

  // gates computation of chord widths + positions + duplication to only when
  // expandedTabData has changed or looping has changed
  const [expandedTabDataHasChanged, setExpandedTabDataHasChanged] =
    useState(true);

  useEffect(() => {
    setLoopCount(0);
    if (showPlaybackDialog) {
      setLooping(true);
    }
  }, [showPlaybackDialog, setLooping]);

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
    showPlaybackDialog,
    containerElement,
    // prevDimensions,
    setVisiblePlaybackContainerWidth,
  ]);

  // // split this into separate effect to reduce scope
  // useEffect(() => {
  //   if (
  //     // is this even necessary?
  //     currentChordIndex === 0 &&
  //     prevCurrentChordIndex > 0
  //   )
  //     return;

  //   setPrevCurrentChordIndex(currentChordIndex - 1);
  // }, [currentChordIndex, prevCurrentChordIndex]);

  useEffect(() => {
    if (!expandedTabData || expandedTabData.length === 0) return;

    const lastChordIndex = expandedTabData.length - 1;

    if (
      prevChordIndexRef.current === lastChordIndex &&
      currentChordIndex === 0
    ) {
      setLoopCount((prev) => prev + 1);
      // console.log(`Loop completed: ${loopCount + 1}`);
      // Perform additional actions here if needed
    }

    if (
      prevChordIndexRef.current !== null && // Ensure it's not the initial render
      prevChordIndexRef.current > currentChordIndex && // User scrolled backward
      !audioMetadata.playing && // Playback is not active
      fullScrollPositions.some((position) => position.currentPosition !== null) // At least one currentPosition value isn't null
    ) {
      console.log(
        "Scrolling backward. Resetting scroll positions and loop count.",
      );

      // Reset all currentPosition to null
      const newFullScrollPositions = fullScrollPositions.map((position) => ({
        ...position,
        currentPosition: null,
      }));

      setFullScrollPositions(newFullScrollPositions);

      // Reset loop count
      setLoopCount(0);
    }

    // Update the ref after loop detection
    prevChordIndexRef.current = currentChordIndex;
  }, [
    currentChordIndex,
    expandedTabData,
    audioMetadata.playing,
    fullScrollPositions,
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

    // const lastScrollPosition =
    //   fullScrollPositions.at(-1)?.originalPosition || 0;

    // const newChords = [...expandedTabData];
    const newChordDurations = [...durations];

    setExpandedTabDataHasChanged(false);
    setTimeout(() => {
      setFullScrollPositions(fullScrollPositions);
      setFullChordWidths(fullChordWidths);
      setScrollContainerWidth(scrollContainerWidth);
      setChordDurations(newChordDurations);
    }, 1000); // bandaid fix: this looks to be a syncing issue with zustand state updates, should be fixed
    // in react 19/next 15 though
  }, [
    containerElement,
    visiblePlaybackContainerWidth,
    expandedTabData,
    expandedTabDataHasChanged,
    chordDurations,
    playbackMetadata,
    playbackSpeed,
  ]);

  const fullVisibleChordIndices = getFullVisibleChordIndices({
    fullScrollPositions,
    currentChordIndex,
    visiblePlaybackContainerWidth,
    fullChordWidths,
    buffer: audioMetadata.playing ? 100 : 10000, // gets rid of slight rendering delay when quickly scrubbing through tab
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
    <Dialog
      open={showPlaybackDialog}
      onOpenChange={(open) => setShowPlaybackDialog(open)}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Practice tab</Button>
      </DialogTrigger>
      <DialogContent
        ref={dialogContentRef}
        className="baseVertFlex h-dvh w-screen max-w-none !justify-between gap-0 !rounded-none bg-black p-0 tablet:h-[650px] tablet:max-w-6xl tablet:!rounded-lg"
      >
        <VisuallyHidden>
          <DialogTitle>Practice tab for {title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </VisuallyHidden>
        <PlaybackTopMetadata />

        <AnimatePresence mode="popLayout">
          {playbackDialogViewingState === "Practice" && (
            <motion.div
              key="PracticeTab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="baseVertFlex w-full"
            >
              <div
                style={{
                  mask: "linear-gradient(90deg, transparent, white 5%, white 95%, transparent)",
                }}
                className="w-full overflow-hidden"
              >
                <div
                  ref={containerRef}
                  className="relative flex h-[240px] w-full overflow-hidden"
                >
                  <div className="baseFlex absolute left-0 top-0 size-full">
                    <div className="h-[165px] w-full"></div>
                    {/* currently this fixes the highlight line extending past rounded borders of
              sections, but puts it behind measure lines. maybe this is a fine tradeoff? */}
                    <div className="z-0 mb-2 h-[164px] w-[2px] shrink-0 bg-pink-600"></div>
                    <div className="h-[165px] w-full"></div>
                  </div>

                  <div
                    style={{
                      width: `${scrollContainerWidth}px`,
                      transform: getScrollContainerTransform({
                        fullScrollPositions,
                        currentChordIndex,
                        audioMetadata,
                        numberOfChords: playbackMetadata?.length || 0,
                        isPlaying: audioMetadata.playing,
                      }),
                      transition: `transform ${
                        audioMetadata.playing
                          ? chordDurations[currentChordIndex] || 0
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
                              {expandedTabData[fullVisibleIndex]?.type ===
                              "tab" ? (
                                <>
                                  {expandedTabData[
                                    fullVisibleIndex
                                  ]?.data.chordData.includes("|") ? (
                                    <PlaybackTabMeasureLine
                                      columnData={
                                        expandedTabData[fullVisibleIndex]?.data
                                          .chordData
                                      }
                                      isDimmed={
                                        audioMetadata.editingLoopRange &&
                                        (fullVisibleIndex <
                                          audioMetadata.startLoopIndex ||
                                          (audioMetadata.endLoopIndex !== -1 &&
                                            fullVisibleIndex >
                                              audioMetadata.endLoopIndex))
                                      }
                                    />
                                  ) : (
                                    <PlaybackTabChord
                                      columnData={
                                        expandedTabData[fullVisibleIndex]?.data
                                          .chordData
                                      }
                                      isFirstChordInSection={
                                        fullVisibleIndex === 0 &&
                                        fullScrollPositions[0]
                                          ?.currentPosition === null
                                      }
                                      isLastChordInSection={false}
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
                                        (fullVisibleIndex <
                                          audioMetadata.startLoopIndex ||
                                          (audioMetadata.endLoopIndex !== -1 &&
                                            fullVisibleIndex >
                                              audioMetadata.endLoopIndex))
                                      }
                                    />
                                  )}
                                </>
                              ) : (
                                <PlaybackStrummedChord
                                  strumIndex={
                                    expandedTabData[fullVisibleIndex]?.data
                                      .strumIndex || 0
                                  }
                                  strum={
                                    expandedTabData[fullVisibleIndex]?.data
                                      .strum || ""
                                  }
                                  palmMute={
                                    expandedTabData[fullVisibleIndex]?.data
                                      .palmMute || ""
                                  }
                                  isFirstChordInSection={
                                    fullVisibleIndex === 0 &&
                                    fullScrollPositions[0]?.currentPosition ===
                                      null
                                  }
                                  isLastChordInSection={false}
                                  noteLength={
                                    expandedTabData[fullVisibleIndex]?.data
                                      .noteLength || "1/4th"
                                  }
                                  bpmToShow={
                                    expandedTabData[fullVisibleIndex]?.data
                                      .showBpm
                                      ? expandedTabData[fullVisibleIndex]?.data
                                          .bpm
                                      : undefined
                                  }
                                  chordName={
                                    expandedTabData[fullVisibleIndex]?.data
                                      .chordName || ""
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
                                    (fullVisibleIndex <
                                      audioMetadata.startLoopIndex ||
                                      (audioMetadata.endLoopIndex !== -1 &&
                                        fullVisibleIndex >
                                          audioMetadata.endLoopIndex))
                                  }
                                  isRaised={
                                    expandedTabData[fullVisibleIndex]?.data
                                      .isRaised || false
                                  }
                                />
                              )}
                            </div>
                          );
                        })}
                    </>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {!viewportLabel.includes("mobile") && <PlaybackMenuContent />}
        </AnimatePresence>
        <div className="baseVertFlex w-full gap-2">
          <PlaybackAudioControls chordDurations={chordDurations} />
          <PlaybackBottomMetadata />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PlaybackDialog;

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

  const adjustedScrollPositions = fullScrollPositions.map(
    (pos) =>
      (pos?.currentPosition || pos.originalPosition) + initialPlaceholderWidth,
  );

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
  // const startIndex = binarySearchStart(adjustedScrollPositions, rangeStart);
  // const endIndex = binarySearchEnd(adjustedScrollPositions, rangeEnd);
  // for (let i = startIndex; i <= endIndex; i++) {

  for (let i = 0; i < adjustedScrollPositions.length; i++) {
    const itemStart = adjustedScrollPositions[i] || 0;
    const chordWidth = fullChordWidths[i] || 0;
    const itemEnd = itemStart + chordWidth;

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
  for (let i = 0; i < adjustedScrollPositions.length; i++) {
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
  isPlaying,
}: {
  fullScrollPositions: {
    originalPosition: number;
    currentPosition: number | null;
  }[];
  currentChordIndex: number;
  audioMetadata: AudioMetadata;
  numberOfChords: number;
  isPlaying: boolean;
}) {
  // when looping, you want to go back to the first chord position, since it
  // will already be translated to the right side of last chord position in main tab
  const index =
    isPlaying && currentChordIndex === numberOfChords - 1
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
