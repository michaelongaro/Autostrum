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
    playbackMetadata,
    audioMetadata,
    showPlaybackDialog,
    setShowPlaybackDialog,
    title,
    looping,
    description,
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    expandedTabData: state.expandedTabData,
    playbackSpeed: state.playbackSpeed,
    setCurrentChordIndex: state.setCurrentChordIndex,
    playbackMetadata: state.playbackMetadata,
    audioMetadata: state.audioMetadata,
    showPlaybackDialog: state.showPlaybackDialog,
    setShowPlaybackDialog: state.setShowPlaybackDialog,
    title: state.title,
    looping: state.looping,
    description: state.description,
  }));

  const containerRef = (element: HTMLDivElement | null) => {
    if (element && !containerElement) setContainerElement(element);
  };
  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);
  const [prevDimensions, setPrevDimensions] = useState<DOMRect | null>(null);

  const [prevCurrentChordIndex, setPrevCurrentChordIndex] = useState(0);

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

  // ideally don't need this state and compute directly ixn the getFullVisibleChordIndices function, but initial attempts didn't work out
  const [completedLoops, setCompletedLoops] = useState(1);
  const [currentLoopCounter, setCurrentLoopCounter] = useState(0);

  const [realChordsToFullChordsMap, setRealChordsToFullChordsMap] = useState<{
    [key: number]: number;
  }>({});
  const [fullChordsToRealChordsMap, setFullChordsToRealChordsMap] = useState<{
    [key: number]: number;
  }>({});

  const [scrollContainerWidth, setScrollContainerWidth] = useState(0);
  const [showPseudoChords, setShowPseudoChords] = useState(true);
  const [visibleContainerWidth, setVisibleContainerWidth] = useState(0);

  const [selectedTab, setSelectedTab] = useState<
    "Practice" | "Section progression" | "Chords" | "Strumming patterns"
  >("Practice");

  // hacky
  const [tempGate, setTempGate] = useState(false);

  useEffect(() => {
    if (tempGate || expandedTabData === null) return;

    setTempGate(true);
    setChords(expandedTabData);
  }, [tempGate, expandedTabData, chords]);

  const test = useRef(false);

  useEffect(() => {
    console.log("turned false");
    test.current = false;
  }, [currentLoopCounter]);

  useLayoutEffect(() => {
    // this effect is only for tabs/sections that do not fill up the viewport entirely,
    // and need to have their indexing offset
    if (
      test.current ||
      chords?.length === undefined ||
      chords.length === expandedTabData?.length
    )
      return;

    if (
      looping &&
      audioMetadata.playing &&
      prevCurrentChordIndex !== 0 &&
      currentChordIndex === 0
    ) {
      // trying to increment the loop index, and checking if this incremented value
      // causes the effective currentChordIndex (which is adjusted for any duplications
      // of the tab that are present due to the tab being too short to fill the viewport)
      const baselineTabLength = expandedTabData?.length || 0;
      const adjustedCurrentChordIndex =
        currentChordIndex + (currentLoopCounter + 1) * baselineTabLength;

      // console.log(
      //   "adjCurrChordIdx",
      //   adjustedCurrentChordIndex,
      //   chords.length,
      //   currentLoopCounter,
      // );

      console.log(
        "adjusted vs chords",
        adjustedCurrentChordIndex,
        chords.length,
      );

      // there are no more further chords to index to, so we need to reset the loop counter
      if (adjustedCurrentChordIndex > chords.length) {
        console.log("resetting loop counter");
        setCurrentLoopCounter(0);
      } else {
        console.log("incrementing loop counter", currentLoopCounter);
        setCurrentLoopCounter(currentLoopCounter + 1);
      }

      test.current = true;

      // setCompletedLoops(completedLoops + 1);
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
    chords?.length,
    currentLoopCounter,
    expandedTabData?.length,
  ]);

  useEffect(() => {
    // this feels a bit like a bandaid fix
    function handleResize() {
      if (
        expandedTabData === null ||
        containerElement === null ||
        containerElement.clientWidth === 0 ||
        containerElement.clientHeight === 0 ||
        (prevDimensions?.width === containerElement.clientWidth &&
          prevDimensions?.height === containerElement.clientHeight)
      ) {
        return;
      }

      setInitialPlaceholderWidth(containerElement.clientWidth / 2 - 5);
      setVisibleContainerWidth(containerElement.clientWidth);
      setPrevDimensions(containerElement.getBoundingClientRect());
    }

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [expandedTabData, showPlaybackDialog, containerElement, prevDimensions]);

  // split this into separate effect to reduce scope
  useEffect(() => {
    if (
      // is this even necessary?
      currentChordIndex === prevCurrentChordIndex
    )
      return;

    setPrevCurrentChordIndex(currentChordIndex);
  }, [currentChordIndex, prevCurrentChordIndex]);

  useEffect(() => {
    if (
      // is this even necessary?
      currentChordIndex === prevCurrentChordIndex ||
      fullScrollPositions.every((position) => position.currentPosition === null)
    )
      return;

    if (prevCurrentChordIndex > currentChordIndex && !audioMetadata.playing) {
      console.log("going left", currentChordIndex, prevCurrentChordIndex);

      // asserting that it is safe/reasonably wanted to just clear all of the current positions
      // whenever the user scrolls left through the tab. the current positions will be recalculated
      // anyway, and it simplifies the logic within getFullVisibleChordIndices().

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
    // TODO: this is a hack, maybe you should combine this with below effect that handles the
    // setting of chord widths + positions + duplication
    if (!playbackMetadata || chordDurations.length !== 0) return;

    const durations = playbackMetadata.map((metadata) => {
      const { bpm, noteLengthMultiplier } = metadata;
      return (
        (60 / ((bpm / Number(noteLengthMultiplier)) * playbackSpeed)) * 1000
      ); // requestAnimationFrame uses milliseconds
    });

    setChordDurations(durations);
  }, [playbackMetadata, playbackSpeed, chordDurations.length]);

  // TODO: separate effect (if needed) to keep track of a previous expandedTabData.length
  // value, so if it changes then we can showPseudoChords again which should retrigger below effect
  useEffect(() => {
    if (
      !containerElement ||
      !expandedTabData ||
      visibleContainerWidth === 0 ||
      expandedTabData.length === 0 ||
      !showPseudoChords
    )
      return;

    const chordElems = new Array(expandedTabData.length).fill(0);
    const elements: HTMLCollectionOf<HTMLDivElement> =
      document.getElementsByClassName(
        "playbackElem",
      ) as HTMLCollectionOf<HTMLDivElement>;

    const fullScrollPositions: {
      originalPosition: number;
      currentPosition: number | null;
    }[] = [];
    const fullChordWidths: number[] = [];

    const realChordsToFullChordsMap: { [key: number]: number } = {};
    const fullChordsToRealChordsMap: { [key: number]: number } = {};

    let finalElementWidth = 0;

    // increments every time an ornamental element is found
    let domElementDifferentialCount = 0;

    chordElems.map((_, index) => {
      const elem = elements[index];

      if (elem) {
        const offsetLeft = elem.offsetLeft;
        const width = elem.getBoundingClientRect().width;

        // exclude ornamental DOM nodes, instead increment domElementDifferentialCount
        if (elem?.classList.contains("ornamental")) {
          domElementDifferentialCount++;
        } else {
          realChordsToFullChordsMap[index - domElementDifferentialCount] =
            index;
          fullChordsToRealChordsMap[index] =
            index - domElementDifferentialCount;
        }

        // include all DOM nodes in fullScrollPositions and fullChordWidths
        fullScrollPositions.push({
          originalPosition: offsetLeft,
          currentPosition: null,
        });
        fullChordWidths.push(width);

        if (index === expandedTabData.length - 1) {
          finalElementWidth = width;
        }
      }
    });

    let scrollContainerWidth =
      (fullScrollPositions.at(-1)?.originalPosition || 0) + finalElementWidth;

    const lastScrollPosition =
      fullScrollPositions.at(-1)?.originalPosition || 0;

    const newChords = [...expandedTabData];

    // if not looping, need to add a "ghost" chord so that the last chord is
    // scrolled just like every other chord
    if (!looping) {
      console.log("adding ghost chord");
      fullScrollPositions.push({
        originalPosition: lastScrollPosition + finalElementWidth,
        currentPosition: null,
      });
    } else {
      // Looping logic

      console.log(
        scrollContainerWidth,
        visibleContainerWidth,
        fullScrollPositions,
      );

      const originalChordDurations = [...chordDurations];
      const newChordDurations = [...chordDurations];

      console.dir(realChordsToFullChordsMap, { depth: null });
      console.dir(fullChordsToRealChordsMap, { depth: null });

      const originalScrollContainerWidth = scrollContainerWidth;
      const originalRCtoFCMap = { ...realChordsToFullChordsMap };
      const originalFCtoRCMap = { ...fullChordsToRealChordsMap };

      let loopIndex = 1;

      while (scrollContainerWidth < visibleContainerWidth) {
        console.log("new scrollContainerWidth", scrollContainerWidth);

        chordElems.forEach((_, index) => {
          const originalPosition =
            scrollContainerWidth +
            (fullScrollPositions[index]?.originalPosition || 0);

          // Push new scroll position and chord widths
          fullScrollPositions.push({ originalPosition, currentPosition: null });
          newChords.push(expandedTabData[index]!);
          fullChordWidths.push(fullChordWidths[index] || 0);

          console.log(
            "adding",
            index,
            scrollContainerWidth,
            fullScrollPositions[index]?.originalPosition,
            originalPosition,
          );

          // Update maps
          const newFullIndex = fullScrollPositions.length - 1;

          // Offset by the loopIndex to ensure new chords/chords mappings are incremented correctly
          if (originalRCtoFCMap.hasOwnProperty(index)) {
            // If the original index exists in the map, calculate the new positions for the duplicated chords
            const newRealChordIndex =
              index + loopIndex * expandedTabData.length; // Offset by loopIndex

            realChordsToFullChordsMap[newRealChordIndex] = newFullIndex;
            fullChordsToRealChordsMap[newFullIndex] = newRealChordIndex;
          }
        });

        // duplicating the chord durations to match the new chords
        newChordDurations.push(...originalChordDurations);

        scrollContainerWidth += originalScrollContainerWidth;
        loopIndex++;
      }

      setChordDurations(newChordDurations);
    }

    setFullScrollPositions(fullScrollPositions);
    setFullChordWidths(fullChordWidths);

    setRealChordsToFullChordsMap(realChordsToFullChordsMap);
    setFullChordsToRealChordsMap(fullChordsToRealChordsMap);

    setScrollContainerWidth(scrollContainerWidth);
    setShowPseudoChords(false);
    setChords(newChords);
  }, [
    containerElement,
    visibleContainerWidth,
    expandedTabData,
    showPseudoChords,
    chordDurations,
    looping,
  ]);

  const fullVisibleChordIndices = getFullVisibleChordIndices({
    fullScrollPositions,
    realChordsToFullChordsMap,
    currentChordIndex,
    visibleContainerWidth,
    fullChordWidths,
    buffer: audioMetadata.playing ? 100 : 10000, // gets rid of slight rendering delay when quickly scrubbing through tab
    initialPlaceholderWidth,
    setFullScrollPositions,
  });

  // console.log(
  //   "currentChordIndex",
  //   realChordsToFullChordsMap,
  //   fullChordsToRealChordsMap,
  //   currentChordIndex,
  //   currentLoopCounter,
  //   currentChordIndex + currentLoopCounter * (expandedTabData?.length || 0),
  // );

  // console.log(
  //   chords,
  //   chordDurations,
  //   fullScrollPositions,
  //   fullChordWidths,
  //   realChordsToFullChordsMap,
  //   fullChordsToRealChordsMap,
  // );

  function highlightChord(
    index: number,
    type: "isBeingPlayed" | "hasBeenPlayed",
  ) {
    // chordType: "tab" | "strum",
    // ^ currently you are combining tab subsections visually to be one subsection,
    // so when going from one to the next, the subsectionIndex changes, which de-highlights
    // the previous subsection. If you want to change this later you prob need a prop like this

    if (
      !playbackMetadata ||
      !playbackMetadata[currentChordIndex] ||
      !playbackMetadata[index]
    )
      return false;

    // TODO: below logic is not correct, but I think that it is a decent starting point

    const adjScrollPositionIndex = index; //realChordsToFullChordsMap[index] || 0; // prob adjust this later, feels jank

    const scrollPosition =
      fullScrollPositions[adjScrollPositionIndex]?.currentPosition ||
      fullScrollPositions[adjScrollPositionIndex]?.originalPosition;
    const startPositionOfEntireTabLoop = scrollContainerWidth * completedLoops;

    if (
      scrollPosition === undefined ||
      scrollPosition > startPositionOfEntireTabLoop
    ) {
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
    } = playbackMetadata[index].location;

    return (
      audioMetadata.type === "Generated" &&
      currSectionIndex === renderedSectionIndex &&
      currSectionRepeatIndex === renderedSectionRepeatIndex &&
      currSubSectionIndex === renderedSubSectionIndex &&
      currSubSectionRepeatIndex === renderedSubSectionRepeatIndex &&
      currChordSequenceIndex === renderedChordSequenceIndex &&
      currChordSequenceRepeatIndex === renderedChordSequenceRepeatIndex &&
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
      <DialogContent className="baseVertFlex h-dvh w-screen max-w-none !justify-between gap-0 !rounded-none bg-black p-0 tablet:h-[650px] tablet:max-w-6xl tablet:!rounded-lg">
        <VisuallyHidden>
          <DialogTitle>Practice tab for {title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </VisuallyHidden>

        <PlaybackTopMetadata
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
          realChordsToFullChordsMap={realChordsToFullChordsMap}
        />

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
              <div className="baseFlex gap-2">
                <Button
                  onClick={() => setCurrentChordIndex(currentChordIndex - 1)}
                >
                  Previous chord
                </Button>
                <div>{currentChordIndex}</div>
                <Button
                  onClick={() => setCurrentChordIndex(currentChordIndex + 1)}
                >
                  Next chord
                </Button>
              </div>

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
                        realChordsToFullChordsMap,
                        currentChordIndex:
                          currentChordIndex +
                          currentLoopCounter * (expandedTabData?.length || 0),
                        audioMetadata,
                      }),
                      transition: `transform ${
                        audioMetadata.playing
                          ? chordDurations[
                              currentChordIndex +
                                currentLoopCounter *
                                  (expandedTabData?.length || 0)
                            ] || 0
                          : !looping &&
                              prevCurrentChordIndex > 0 &&
                              currentChordIndex === 0 // instantly resetting scroll position when going from last chord to first chord, and not looping
                            ? 0
                            : 200 // TODO: play around with this value
                      }ms linear`,
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
                        fullVisibleChordIndices.map((index) => {
                          return (
                            <div
                              key={index}
                              style={{
                                position: "absolute",
                                width: `${fullChordWidths[index] || 0}px`,
                                left: getChordLeftValue({
                                  index,
                                  fullScrollPositions,
                                  initialPlaceholderWidth,
                                }),
                              }}
                            >
                              {chords[index]?.type === "tab" ? (
                                <>
                                  {chords[index]?.data.chordData.includes(
                                    "|",
                                  ) ? (
                                    <PlaybackTabMeasureLine
                                      columnData={chords[index]?.data.chordData}
                                    />
                                  ) : (
                                    <PlaybackTabChord
                                      columnData={chords[index]?.data.chordData}
                                      isFirstChordInSection={
                                        index === 0 ||
                                        (chords[index - 1]?.type === "tab" &&
                                          chords[index - 1]?.data
                                            .chordData?.[0] === "-1")
                                        // TODO: come back to why this type isn't narrowed
                                      }
                                      isLastChordInSection={
                                        index === chords.length - 1 ||
                                        chords[index + 1]?.type === "strum"
                                      }
                                      isHighlighted={
                                        (audioMetadata.playing &&
                                          highlightChord(
                                            fullChordsToRealChordsMap[index] ||
                                              0,
                                            "isBeingPlayed",
                                          )) ||
                                        highlightChord(
                                          fullChordsToRealChordsMap[index] || 0,
                                          "hasBeenPlayed",
                                        )
                                      }
                                    />
                                  )}
                                </>
                              ) : (
                                <PlaybackStrummedChord
                                  strumIndex={
                                    chords[index]?.data.strumIndex || 0
                                  }
                                  strum={chords[index]?.data.strum || ""}
                                  palmMute={chords[index]?.data.palmMute || ""}
                                  isFirstChordInSection={
                                    chords[index]?.isFirstChord || false
                                  }
                                  isLastChordInSection={
                                    chords[index]?.isLastChord || false
                                  }
                                  noteLength={
                                    chords[index]?.data.noteLength || "1/4th"
                                  }
                                  bpmToShow={
                                    (chords[index]?.data.strumIndex || 0) ===
                                      0 && chords[index]?.data.bpm
                                      ? chords[index]?.data.bpm
                                      : undefined
                                  }
                                  chordName={
                                    chords[index]?.data.chordName || ""
                                  }
                                  isHighlighted={
                                    (audioMetadata.playing &&
                                      highlightChord(
                                        fullChordsToRealChordsMap[index] || 0,
                                        "isBeingPlayed",
                                      )) ||
                                    highlightChord(
                                      fullChordsToRealChordsMap[index] || 0,
                                      "hasBeenPlayed",
                                    )
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

              {chords && showPseudoChords && (
                <div className="absolute left-0 top-0 flex opacity-0">
                  {chords.map((chord, index) => {
                    return (
                      <Fragment key={index}>
                        {chords[index]?.type === "tab" ? (
                          <>
                            {chords[index]?.data.chordData.includes("|") ? (
                              <PlaybackTabMeasureLine
                                columnData={chords[index]?.data.chordData}
                              />
                            ) : (
                              <PlaybackTabChord
                                columnData={chords[index]?.data.chordData}
                                isFirstChordInSection={
                                  index === 0 ||
                                  (chords[index - 1]?.type === "tab" &&
                                    chords[index - 1]?.data.chordData?.[0] ===
                                      "-1")
                                  // TODO: come back to why this type isn't narrowed
                                }
                                isLastChordInSection={
                                  index === chords.length - 1 ||
                                  chords[index + 1]?.type === "strum"
                                }
                                isHighlighted={false}
                              />
                            )}
                          </>
                        ) : (
                          <PlaybackStrummedChord
                            strumIndex={chords[index]?.data.strumIndex || 0}
                            strum={chords[index]?.data.strum || ""}
                            palmMute={chords[index]?.data.palmMute || ""}
                            isFirstChordInSection={
                              chords[index]?.isFirstChord || false
                            }
                            isLastChordInSection={
                              chords[index]?.isLastChord || false
                            }
                            noteLength={
                              chords[index]?.data.noteLength || "1/4th"
                            }
                            bpmToShow={
                              (chords[index]?.data.strumIndex || 0) === 0 &&
                              chords[index]?.data.bpm
                                ? chords[index]?.data.bpm
                                : undefined
                            }
                            chordName={chords[index]?.data.chordName || ""}
                            isHighlighted={false}
                          />
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="baseVertFlex w-full gap-2">
          <PlaybackAudioControls />
          <PlaybackBottomMetadata
            realChordsToFullChordsMap={realChordsToFullChordsMap}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PlaybackDialog;

const getFullVisibleChordIndices = ({
  fullScrollPositions: originalFullScrollPositions,
  realChordsToFullChordsMap,
  currentChordIndex,
  visibleContainerWidth,
  fullChordWidths,
  buffer,
  initialPlaceholderWidth,
  setFullScrollPositions,
}: {
  fullScrollPositions: {
    originalPosition: number;
    currentPosition: number | null;
  }[];
  realChordsToFullChordsMap: { [key: number]: number };
  currentChordIndex: number;
  visibleContainerWidth: number;
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

  // consider: can maybe get by with two arrays for scroll positions (one original, one current)
  // instead of object approach that you currently have

  const adjustedCurrentChordIndex =
    realChordsToFullChordsMap[currentChordIndex];

  if (
    adjustedCurrentChordIndex === undefined ||
    fullScrollPositions[adjustedCurrentChordIndex] === undefined
  )
    return [];

  let fullVisibleIndices = [];

  const adjustedScrollPositions = fullScrollPositions.map(
    (pos) =>
      (pos?.currentPosition || pos.originalPosition) + initialPlaceholderWidth,
  );

  const adjustedCurrentPosition =
    (fullScrollPositions[adjustedCurrentChordIndex]?.currentPosition ||
      fullScrollPositions[adjustedCurrentChordIndex].originalPosition) +
    initialPlaceholderWidth;

  // Start and end points of the visible range
  const rangeStart = Math.max(
    0,
    adjustedCurrentPosition - visibleContainerWidth / 2 - buffer,
  );
  const rangeEnd = Math.max(
    0,
    adjustedCurrentPosition + visibleContainerWidth / 2 + buffer,
  );

  // const startIndex = binarySearchStart(adjustedScrollPositions, rangeStart);
  // const endIndex = binarySearchEnd(adjustedScrollPositions, rangeEnd);

  // for (let i = startIndex; i <= endIndex; i++) {
  const chordIndicesBeforeRangeStart = [];

  for (let i = 0; i < adjustedScrollPositions.length; i++) {
    const itemStart = adjustedScrollPositions[i] || 0;
    const chordWidth = fullChordWidths[i] || 0;
    const itemEnd = itemStart + chordWidth;

    // console.log(i, itemEnd, rangeStart);

    // Ensure the item is within the visible range
    if (itemEnd > rangeStart && itemStart < rangeEnd) {
      fullVisibleIndices.push(i);
    } else if (itemEnd < rangeStart) {
      // console.log("adding one", i, itemEnd, rangeStart);
      chordIndicesBeforeRangeStart.push(i);
    }
  }

  let fullScrollPositionsWasUpdated = false;

  // need to have baseline largest scroll position so we can add the chord width
  // to get the current position in loop below
  let largestScrollPosition = 0;

  // getting largest scroll position (currentPosition if available, originalPosition otherwise)
  for (let i = 0; i < adjustedScrollPositions.length; i++) {
    const scrollPosition =
      fullScrollPositions[i]?.currentPosition ||
      fullScrollPositions[i]?.originalPosition ||
      0;
    if (scrollPosition > largestScrollPosition) {
      largestScrollPosition = scrollPosition; // + initialPlaceholderWidth;
    }
  }

  // adjusting currentPosition of chords that are before the visible range
  for (const chordIndex of chordIndicesBeforeRangeStart) {
    const chordWidth = fullChordWidths[chordIndex] || 0;

    fullScrollPositions[chordIndex]!.currentPosition =
      largestScrollPosition + chordWidth;

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
  realChordsToFullChordsMap,
  currentChordIndex,
  audioMetadata,
}: {
  fullScrollPositions: {
    originalPosition: number;
    currentPosition: number | null;
  }[];
  realChordsToFullChordsMap: { [key: number]: number };
  currentChordIndex: number;
  audioMetadata: AudioMetadata;
}) {
  // console.log(
  //   fullScrollPositions,
  //   realChordsToFullChordsMap,
  //   currentChordIndex,
  //   audioMetadata,
  // );

  const index =
    realChordsToFullChordsMap[
      currentChordIndex + (audioMetadata.playing ? 1 : 0)
    ] || 0;

  // needed to prevent index from going out of bounds when looping
  const clampedIndex = Math.min(index, fullScrollPositions.length - 1);

  if (fullScrollPositions[clampedIndex]?.currentPosition) {
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
