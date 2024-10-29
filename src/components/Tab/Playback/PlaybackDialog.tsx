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
    description,
    visiblePlaybackContainerWidth,
    setVisiblePlaybackContainerWidth,
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
    description: state.description,
    visiblePlaybackContainerWidth: state.visiblePlaybackContainerWidth,
    setVisiblePlaybackContainerWidth: state.setVisiblePlaybackContainerWidth,
  }));

  const containerRef = (element: HTMLDivElement | null) => {
    if (element && !containerElement) setContainerElement(element);
  };
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);
  const [prevDimensions, setPrevDimensions] = useState<DOMRect | null>(null);

  const [prevCurrentChordIndex, setPrevCurrentChordIndex] = useState(0); // should this start at -1?

  const [chordDurations, setChordDurations] = useState<number[]>([]);
  const [initialPlaceholderWidth, setInitialPlaceholderWidth] = useState(0);

  const [chords, setChords] = useState<
    (PlaybackTabChordType | PlaybackStrummedChordType)[] | null
  >(null);

  const [fullChordWidths, setFullChordWidths] = useState<number[]>([]);
  const [fullScrollPositions, setFullScrollPositions] = useState<
    {
      originalPosition: number;
      currentPosition: number | null;
    }[]
  >([]);

  // ideally don't need this state and compute directly in the getFullVisibleChordIndices
  // function, but initial attempts didn't work out
  const [completedLoops, setCompletedLoops] = useState(0);
  const [currentLoopCounter, setCurrentLoopCounter] = useState(0);

  const [scrollContainerWidth, setScrollContainerWidth] = useState(0);

  // gates computation of chord widths + positions + duplication to only when
  // expandedTabData has changed or looping has changed
  const [expandedTabDataHasChanged, setExpandedTabDataHasChanged] =
    useState(true);

  const [selectedTab, setSelectedTab] = useState<
    "Practice" | "Section progression" | "Chords" | "Strumming patterns"
  >("Practice");

  // not happy about this, but seems necessary to keep useLayoutEffect
  // from infinitely rerendering upon completion of a loop
  const preventRerenderAfterLoopCompletion = useRef(false);

  useEffect(() => {
    preventRerenderAfterLoopCompletion.current = false;
  }, [currentLoopCounter]);

  useLayoutEffect(() => {
    if (preventRerenderAfterLoopCompletion.current) return;

    if (
      looping &&
      audioMetadata.playing &&
      expandedTabData?.length &&
      prevCurrentChordIndex !== 0 &&
      currentChordIndex === 0
    ) {
      // trying to increment the loop index, and checking if this incremented value
      // causes the effective currentChordIndex (which is adjusted for any duplications
      // of the tab that are present due to the tab being too short to fill the viewport)

      const adjustedCurrentChordIndex =
        currentChordIndex + (currentLoopCounter + 1) * expandedTabData.length;

      // there are no more further chords to index to, so we need to reset the loop counter
      if (adjustedCurrentChordIndex >= expandedTabData.length) {
        setCurrentLoopCounter(0);
      } else {
        setCurrentLoopCounter((prev) => prev + 1);
      }

      preventRerenderAfterLoopCompletion.current = true;

      setCompletedLoops((prev) => prev + 1);
    }

    // need logic to reset/decrement when going backward, should this just be handled in
    // scrubbing left effect below?
    // ^ temporarily doing this, idk if best approach
  }, [
    looping,
    completedLoops,
    currentChordIndex,
    prevCurrentChordIndex,
    audioMetadata.playing,
    currentLoopCounter,
    expandedTabData?.length,
  ]);

  useEffect(() => {
    setCurrentLoopCounter(0);
    setCompletedLoops(0);
  }, [showPlaybackDialog]);

  console.log("completedLoops", completedLoops);

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

  // split this into separate effect to reduce scope
  useEffect(() => {
    if (
      // is this even necessary?
      currentChordIndex === 0 &&
      prevCurrentChordIndex > 0
    )
      return;

    setPrevCurrentChordIndex(currentChordIndex - 1);
  }, [currentChordIndex, prevCurrentChordIndex]);

  useEffect(() => {
    if (
      // is this even necessary?
      currentChordIndex === prevCurrentChordIndex ||
      fullScrollPositions.every((position) => position.currentPosition === null)
    )
      return;

    if (prevCurrentChordIndex > currentChordIndex && !audioMetadata.playing) {
      // asserting that it is safe/reasonably wanted to just clear all of the current positions
      // whenever the user scrolls left through the tab. the current positions will be recalculated
      // anyway, and it simplifies the logic within getFullVisibleChordIndices().

      console.log("going backwords");

      const newFullScrollPositions = [...fullScrollPositions];
      newFullScrollPositions.forEach((position) => {
        if (position) position.currentPosition = null;
      });

      setFullScrollPositions(newFullScrollPositions);
      setCompletedLoops(0);
    }
  }, [
    prevCurrentChordIndex,
    currentChordIndex,
    fullScrollPositions,
    audioMetadata.playing,
  ]);

  useEffect(() => {
    setExpandedTabDataHasChanged(true);
  }, [expandedTabData, looping]);

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

    const lastScrollPosition =
      fullScrollPositions.at(-1)?.originalPosition || 0;

    const newChords = [...expandedTabData];
    const newChordDurations = [...durations];

    // if not looping, need to add a "ghost" chord so that the last chord is
    // scrolled just like every other chord
    if (!looping) {
      fullScrollPositions.push({
        originalPosition: lastScrollPosition + finalElementWidth,
        currentPosition: null,
      });
    }

    setExpandedTabDataHasChanged(false);
    setTimeout(() => {
      setFullScrollPositions(fullScrollPositions);
      setFullChordWidths(fullChordWidths);
      setScrollContainerWidth(scrollContainerWidth);
      setChordDurations(newChordDurations);
      setChords(newChords);
    }, 1000); // bandaid fix: this looks to be a syncing issue with zustand state updates, should be fixed
    // in react 19/next 15 though
  }, [
    containerElement,
    visiblePlaybackContainerWidth,
    expandedTabData,
    expandedTabDataHasChanged,
    chordDurations,
    looping,
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
    // chordType: "tab" | "strum",
    // ^ currently you are combining tab subsections visually to be one subsection,
    // so when going from one to the next, the subsectionIndex changes, which de-highlights
    // the previous subsection. If you want to change this later you prob need a prop like this

    if (
      !playbackMetadata ||
      !playbackMetadata[currentChordIndex] ||
      !playbackMetadata[chordIndex]
    ) {
      // console.log('returning false")');
      return false;
    }

    const scrollPosition =
      fullScrollPositions[chordIndex]?.currentPosition ||
      fullScrollPositions[chordIndex]?.originalPosition;
    const startPositionOfCurrentLoop =
      scrollContainerWidth * (completedLoops + 1);

    if (
      scrollPosition === undefined ||
      scrollPosition > startPositionOfCurrentLoop
    ) {
      // console.log('returning false2222")', completedLoops + 1);

      return false;
    }

    const {
      sectionIndex: currSectionIndex,
      sectionRepeatIndex: currSectionRepeatIndex,
      subSectionIndex: currSubSectionIndex,
      subSectionRepeatIndex: currSubSectionRepeatIndex,
      chordSequenceIndex: currChordSequenceIndex,
      chordSequenceRepeatIndex: currChordSequenceRepeatIndex,
      chordIndex: currChordIndex,
    } = playbackMetadata[currentChordIndex].location;

    const {
      sectionIndex: renderedSectionIndex,
      sectionRepeatIndex: renderedSectionRepeatIndex,
      subSectionIndex: renderedSubSectionIndex,
      subSectionRepeatIndex: renderedSubSectionRepeatIndex,
      chordSequenceIndex: renderedChordSequenceIndex,
      chordSequenceRepeatIndex: renderedChordSequenceRepeatIndex,
      chordIndex: renderedChordIndex,
    } = playbackMetadata[chordIndex].location;

    // TODO: chords still aren't highlighting like you want them to, aka
    // no matter what staying highlighted if they have already been played (are
    // farther left than currently played chord).
    // hmm could you even do just a direct index comparison then with the current chord index?
    // I feel like this could maybe work

    const adjCurrSeqIndex = currChordSequenceIndex ?? 0;
    const adjCurrSeqRepeatIndex = currChordSequenceRepeatIndex ?? 0;
    const adjRenderedSeqIndex = renderedChordSequenceIndex ?? 0;
    const adjRenderedSeqRepeatIndex = renderedChordSequenceRepeatIndex ?? 0;

    return (
      audioMetadata.type === "Generated" &&
      currSectionIndex >= renderedSectionIndex &&
      currSectionRepeatIndex >= renderedSectionRepeatIndex &&
      currSubSectionIndex >= renderedSubSectionIndex &&
      currSubSectionRepeatIndex >= renderedSubSectionRepeatIndex &&
      adjCurrSeqIndex >= adjRenderedSeqIndex &&
      adjCurrSeqRepeatIndex >= adjRenderedSeqRepeatIndex &&
      (type === "isBeingPlayed"
        ? currChordIndex === renderedChordIndex
        : currChordIndex > renderedChordIndex)
    );
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

        <PlaybackTopMetadata
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
        />

        {/* <div>{`${prevCurrentChordIndex} | ${currentChordIndex}`}</div> */}

        <AnimatePresence mode="popLayout">
          {selectedTab === "Practice" && (
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
                  className="relative flex h-[250px] w-full overflow-hidden"
                >
                  <div className="baseFlex absolute left-0 top-0 size-full">
                    <div className="h-[165px] w-full"></div>
                    {/* currently this fixes the highlight line extending past rounded borders of
              sections, but puts it behind measure lines. maybe this is a fine tradeoff? */}
                    <div className="z-0 h-[164px] w-[2px] shrink-0 bg-pink-600"></div>
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
                        looping,
                      }),
                      transition: `transform ${
                        audioMetadata.playing
                          ? chordDurations[currentChordIndex] || 0
                          : !looping &&
                              prevCurrentChordIndex > 0 &&
                              currentChordIndex === 0 // instantly resetting scroll position when going from last chord to first chord, and not looping
                            ? 0
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

                      {chords &&
                        fullVisibleChordIndices.map((fullVisibleIndex) => {
                          return (
                            <div
                              key={fullVisibleIndex}
                              id={fullVisibleIndex.toString()}
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
                              {chords[fullVisibleIndex]?.type === "tab" ? (
                                <>
                                  {chords[
                                    fullVisibleIndex
                                  ]?.data.chordData.includes("|") ? (
                                    <PlaybackTabMeasureLine
                                      columnData={
                                        chords[fullVisibleIndex]?.data.chordData
                                      }
                                    />
                                  ) : (
                                    <PlaybackTabChord
                                      columnData={
                                        chords[fullVisibleIndex]?.data.chordData
                                      }
                                      isFirstChordInSection={
                                        fullVisibleIndex === 0 ||
                                        (chords[fullVisibleIndex - 1]?.type ===
                                          "tab" &&
                                          chords[fullVisibleIndex - 1]?.data
                                            .chordData?.[0] === "-1")
                                        // TODO: come back to why this type isn't narrowed
                                      }
                                      isLastChordInSection={
                                        fullVisibleIndex ===
                                          chords.length - 1 ||
                                        chords[fullVisibleIndex + 1]?.type ===
                                          "strum"
                                      }
                                      isHighlighted={
                                        (audioMetadata.playing &&
                                          highlightChord({
                                            chordIndex: fullVisibleIndex,
                                            type: "isBeingPlayed",
                                          })) ||
                                        highlightChord({
                                          chordIndex: fullVisibleIndex,
                                          type: "hasBeenPlayed",
                                        })
                                      }
                                    />
                                  )}
                                </>
                              ) : (
                                <PlaybackStrummedChord
                                  strumIndex={
                                    chords[fullVisibleIndex]?.data.strumIndex ||
                                    0
                                  }
                                  strum={
                                    chords[fullVisibleIndex]?.data.strum || ""
                                  }
                                  palmMute={
                                    chords[fullVisibleIndex]?.data.palmMute ||
                                    ""
                                  }
                                  isFirstChordInSection={
                                    chords[fullVisibleIndex]?.isFirstChord ||
                                    false
                                  }
                                  isLastChordInSection={
                                    chords[fullVisibleIndex]?.isLastChord ||
                                    false
                                  }
                                  noteLength={
                                    chords[fullVisibleIndex]?.data.noteLength ||
                                    "1/4th"
                                  }
                                  bpmToShow={
                                    (chords[fullVisibleIndex]?.data
                                      .strumIndex || 0) === 0 &&
                                    chords[fullVisibleIndex]?.data.bpm
                                      ? chords[fullVisibleIndex]?.data.bpm
                                      : undefined
                                  }
                                  chordName={
                                    chords[fullVisibleIndex]?.data.chordName ||
                                    ""
                                  }
                                  isHighlighted={
                                    (audioMetadata.playing &&
                                      highlightChord({
                                        chordIndex: fullVisibleIndex,
                                        type: "isBeingPlayed",
                                      })) ||
                                    highlightChord({
                                      chordIndex: fullVisibleIndex,
                                      type: "hasBeenPlayed",
                                    })
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
        </AnimatePresence>

        <div className="baseVertFlex w-full gap-2">
          <PlaybackAudioControls />
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

  let fullVisibleIndices = [];

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
      fullVisibleIndices.push(i);
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

  // increasing currentPosition of chords that are farther left than start of visible range
  for (const chordIndex of chordIndicesBeforeRangeStart) {
    const chordWidth = fullChordWidths[chordIndex] || 0;

    fullScrollPositions[chordIndex]!.currentPosition = largestScrollPosition;

    largestScrollPosition += chordWidth;
    fullScrollPositionsWasUpdated = true;
  }

  if (fullScrollPositionsWasUpdated) {
    setFullScrollPositions(fullScrollPositions);
  }

  return fullVisibleIndices;
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
  looping,
}: {
  fullScrollPositions: {
    originalPosition: number;
    currentPosition: number | null;
  }[];
  currentChordIndex: number;
  audioMetadata: AudioMetadata;
  numberOfChords: number;
  looping: boolean;
}) {
  // when looping, you want to go back to the first chord position, since it
  // will already be translated to the right side of last chord position in main tab
  const index =
    looping && currentChordIndex === numberOfChords - 1
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
