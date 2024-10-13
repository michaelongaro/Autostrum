import { Fragment, useEffect, useState } from "react";
import ProgressSlider from "~/components/AudioControls/ProgressSlider";
import PlaybackAudioControls from "~/components/Tab/Playback/PlaybackAudio/PlaybackAudioControls";
import PlaybackStrummedChord from "~/components/Tab/Playback/PlaybackStrummedChord";
import PlaybackTabChord from "~/components/Tab/Playback/PlaybackTabChord";
import PlaybackTabMeasureLine from "~/components/Tab/Playback/PlaybackTabMeasureLine";
import PlaybackTopMetadata from "~/components/Tab/Playback/PlaybackTopMetadata";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { useTabStore } from "~/stores/TabStore";

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
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    expandedTabData: state.expandedTabData,
    playbackSpeed: state.playbackSpeed,
    setCurrentChordIndex: state.setCurrentChordIndex,
    playbackMetadata: state.playbackMetadata,
    audioMetadata: state.audioMetadata,
    showPlaybackDialog: state.showPlaybackDialog,
    setShowPlaybackDialog: state.setShowPlaybackDialog,
  }));

  const containerRef = (element: HTMLDivElement | null) => {
    if (element && !containerElement) setContainerElement(element);
  };

  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);

  const [chordDurations, setChordDurations] = useState<number[]>([]);
  const [scrollPositions, setScrollPositions] = useState<number[]>([]);

  const [initialPlaceholderWidth, setInitialPlaceholderWidth] = useState(0);

  const [fullChordWidths, setFullChordWidths] = useState<number[]>([]);
  const [fullScrollPositions, setFullScrollPositions] = useState<number[]>([]);

  const [realChordsToFullChordsMap, setRealChordsToFullChordsMap] = useState<{
    [key: number]: number;
  }>({});
  const [fullChordsToRealChordsMap, setFullChordsToRealChordsMap] = useState<{
    [key: number]: number;
  }>({});

  const [scrollContainerWidth, setScrollContainerWidth] = useState(0);
  const [showPseudoChords, setShowPseudoChords] = useState(true);
  const [visibleContainerWidth, setVisibleContainerWidth] = useState(0);

  useEffect(() => {
    function handleResize() {
      if (expandedTabData === null || containerElement === null) return;

      setInitialPlaceholderWidth(containerElement.clientWidth / 2 - 5);
      setVisibleContainerWidth(containerElement.clientWidth);
    }

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [expandedTabData, showPlaybackDialog, containerElement]);

  useEffect(() => {
    if (!playbackMetadata) return;

    const durations = playbackMetadata.map((metadata) => {
      const { bpm, noteLengthMultiplier } = metadata;
      return (
        (60 / ((bpm / Number(noteLengthMultiplier)) * playbackSpeed)) * 1000
      ); // requestAnimationFrame uses milliseconds
    });

    setChordDurations(durations);
  }, [playbackMetadata, playbackSpeed]);

  useEffect(() => {
    if (
      !containerElement ||
      !expandedTabData ||
      visibleContainerWidth === 0 ||
      scrollPositions.length !== 0 ||
      expandedTabData.length === 0 ||
      !showPseudoChords
    )
      return;

    const arr = new Array(expandedTabData.length).fill(0);
    const elements: HTMLCollectionOf<HTMLDivElement> =
      document.getElementsByClassName(
        "playbackElem",
      ) as HTMLCollectionOf<HTMLDivElement>;

    const newScrollPositions: number[] = [];

    const fullScrollPositions: number[] = [];
    const fullChordWidths: number[] = [];

    const realChordsToFullChordsMap: { [key: number]: number } = {};
    const fullChordsToRealChordsMap: { [key: number]: number } = {};

    let finalElementWidth = 0;

    // increments every time an ornamental element is found
    let domElementDifferentialCount = 0;

    arr.map((_, index) => {
      const elem = elements[index];

      if (elem) {
        const offsetLeft = elem.offsetLeft;
        const width = elem.getBoundingClientRect().width;

        // exclude ornamental DOM nodes from newScrollPositions and chordWidths,
        // increment domElementDifferentialCount otherwise
        if (elem?.classList.contains("ornamental")) {
          domElementDifferentialCount++;
        } else {
          newScrollPositions.push(offsetLeft);
          realChordsToFullChordsMap[index - domElementDifferentialCount] =
            index;
          fullChordsToRealChordsMap[index] =
            index - domElementDifferentialCount;
        }

        // include all DOM nodes in fullScrollPositions and fullChordWidths
        fullScrollPositions.push(offsetLeft);
        fullChordWidths.push(width);

        if (index === expandedTabData.length - 1) {
          finalElementWidth = width;
        }
      }
    });

    const scrollContainerWidth =
      (newScrollPositions.at(-1) || 0) + finalElementWidth;

    const lastScrollPosition = newScrollPositions.at(-1) || 0;

    // adding a "ghost" chord so that the last chord is scrolled past just
    // like every other chord
    newScrollPositions.push(lastScrollPosition + finalElementWidth);

    setScrollPositions(newScrollPositions);

    setFullScrollPositions(fullScrollPositions);
    setFullChordWidths(fullChordWidths);

    setRealChordsToFullChordsMap(realChordsToFullChordsMap);
    setFullChordsToRealChordsMap(fullChordsToRealChordsMap);

    setScrollContainerWidth(scrollContainerWidth);
    setShowPseudoChords(false);
  }, [
    containerElement,
    scrollPositions,
    visibleContainerWidth,
    expandedTabData,
    showPseudoChords,
  ]);

  const fullVisibleChordIndices = getFullVisibleChordIndices({
    fullScrollPositions,
    realChordsToFullChordsMap,
    currentChordIndex,
    visibleContainerWidth,
    fullChordWidths,
    buffer: 100,
    initialPlaceholderWidth,
  });

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
      <DialogContent className="baseVertFlex h-dvh w-screen max-w-none !rounded-none bg-black px-0 pb-2 pt-4 tablet:h-[650px] tablet:max-w-6xl tablet:!rounded-lg">
        {/* <VisuallyHidden>
          <DialogTitle>
            Shuffling deck for round {gameData.currentRound}
          </DialogTitle>
          <DialogDescription>
            The decks are being shuffled for the upcoming round
          </DialogDescription>
        </VisuallyHidden> */}

        <PlaybackTopMetadata
          realChordsToFullChordsMap={realChordsToFullChordsMap}
        />

        <div
          style={{
            mask: "linear-gradient(90deg, transparent, white 5%, white 95%, transparent)",
          }}
          className="size-full overflow-hidden"
        >
          <div
            ref={containerRef}
            className="relative flex h-[271px] w-full overflow-hidden"
          >
            <div className="baseFlex absolute left-0 top-0 size-full">
              <div className="h-[165px] w-full"></div>
              <div className="h-[165px] w-[2px] shrink-0 bg-pink-600"></div>
              <div className="h-[165px] w-full"></div>
            </div>

            <div
              style={{
                width: `${scrollContainerWidth}px`,
                transform: `translateX(${
                  (scrollPositions[
                    currentChordIndex + (audioMetadata.playing ? 1 : 0)
                  ] || 0) * -1
                }px)`,
                transition: `transform ${
                  chordDurations[currentChordIndex] || 0
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

                {expandedTabData &&
                  fullVisibleChordIndices.map((index) => {
                    return (
                      <div
                        key={index}
                        style={{
                          position: "absolute",
                          width: `${fullChordWidths[index] || 0}px`,
                          left: `${(fullScrollPositions[index] || 0) + initialPlaceholderWidth}px`,
                        }}
                      >
                        {expandedTabData[index]?.type === "tab" ? (
                          <>
                            {expandedTabData[index]?.data.chordData.includes(
                              "|",
                            ) ? (
                              <PlaybackTabMeasureLine
                                columnData={
                                  expandedTabData[index]?.data.chordData
                                }
                              />
                            ) : (
                              <PlaybackTabChord
                                columnData={
                                  expandedTabData[index]?.data.chordData
                                }
                                isFirstChordInSection={
                                  index === 0 ||
                                  (expandedTabData[index - 1]?.type === "tab" &&
                                    expandedTabData[index - 1]?.data
                                      .chordData?.[0] === "-1")
                                  // TODO: come back to why this type isn't narrowed
                                }
                                isLastChordInSection={
                                  index === expandedTabData.length - 1 ||
                                  expandedTabData[index + 1]?.type === "strum"
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
                          </>
                        ) : (
                          <PlaybackStrummedChord
                            strumIndex={
                              expandedTabData[index]?.data.strumIndex || 0
                            }
                            strum={expandedTabData[index]?.data.strum || ""}
                            palmMute={
                              expandedTabData[index]?.data.palmMute || ""
                            }
                            isFirstChordInSection={
                              expandedTabData[index]?.isFirstChord || false
                            }
                            isLastChordInSection={
                              expandedTabData[index]?.isLastChord || false
                            }
                            noteLength={
                              expandedTabData[index]?.data.noteLength || "1/4th"
                            }
                            bpmToShow={
                              (expandedTabData[index]?.data.strumIndex || 0) ===
                                0 && expandedTabData[index]?.data.bpm
                                ? expandedTabData[index]?.data.bpm
                                : undefined
                            }
                            chordName={
                              expandedTabData[index]?.data.chordName || ""
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

        {expandedTabData && showPseudoChords && (
          <div className="absolute left-0 top-0 flex opacity-0">
            {expandedTabData.map((chord, index) => {
              return (
                <Fragment key={index}>
                  {expandedTabData[index]?.type === "tab" ? (
                    <>
                      {expandedTabData[index]?.data.chordData.includes("|") ? (
                        <PlaybackTabMeasureLine
                          columnData={expandedTabData[index]?.data.chordData}
                        />
                      ) : (
                        <PlaybackTabChord
                          columnData={expandedTabData[index]?.data.chordData}
                          isFirstChordInSection={
                            index === 0 ||
                            (expandedTabData[index - 1]?.type === "tab" &&
                              expandedTabData[index - 1]?.data
                                .chordData?.[0] === "-1")
                            // TODO: come back to why this type isn't narrowed
                          }
                          isLastChordInSection={
                            index === expandedTabData.length - 1 ||
                            expandedTabData[index + 1]?.type === "strum"
                          }
                          isHighlighted={false}
                        />
                      )}
                    </>
                  ) : (
                    <PlaybackStrummedChord
                      strumIndex={expandedTabData[index]?.data.strumIndex || 0}
                      strum={expandedTabData[index]?.data.strum || ""}
                      palmMute={expandedTabData[index]?.data.palmMute || ""}
                      isFirstChordInSection={
                        expandedTabData[index]?.isFirstChord || false
                      }
                      isLastChordInSection={
                        expandedTabData[index]?.isLastChord || false
                      }
                      noteLength={
                        expandedTabData[index]?.data.noteLength || "1/4th"
                      }
                      bpmToShow={
                        (expandedTabData[index]?.data.strumIndex || 0) === 0 &&
                        expandedTabData[index]?.data.bpm
                          ? expandedTabData[index]?.data.bpm
                          : undefined
                      }
                      chordName={expandedTabData[index]?.data.chordName || ""}
                      isHighlighted={false}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>
        )}

        <div className="baseFlex w-full">
          <PlaybackAudioControls />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PlaybackDialog;

const getFullVisibleChordIndices = ({
  fullScrollPositions,
  realChordsToFullChordsMap,
  currentChordIndex,
  visibleContainerWidth,
  fullChordWidths,
  buffer,
  initialPlaceholderWidth,
}: {
  fullScrollPositions: number[];
  realChordsToFullChordsMap: { [key: number]: number };
  currentChordIndex: number;
  visibleContainerWidth: number;
  fullChordWidths: number[];
  buffer: number;
  initialPlaceholderWidth: number;
}) => {
  const adjustedCurrentChordIndex =
    realChordsToFullChordsMap[currentChordIndex];

  if (
    adjustedCurrentChordIndex === undefined ||
    fullScrollPositions[adjustedCurrentChordIndex] === undefined
  )
    return [];

  const fullVisibleIndices = [];

  const adjustedScrollPositions = fullScrollPositions.map(
    (pos) => pos + initialPlaceholderWidth,
  );

  const adjustedCurrentPosition =
    fullScrollPositions[adjustedCurrentChordIndex] + initialPlaceholderWidth;

  // Start and end points of the visible range
  const rangeStart =
    adjustedCurrentPosition - visibleContainerWidth / 2 - buffer;
  const rangeEnd = adjustedCurrentPosition + visibleContainerWidth / 2 + buffer;

  const startIndex = binarySearchStart(adjustedScrollPositions, rangeStart);

  const endIndex = binarySearchEnd(adjustedScrollPositions, rangeEnd);

  for (let i = startIndex; i <= endIndex; i++) {
    const itemStart = adjustedScrollPositions[i] || 0;
    const chordWidth = fullChordWidths[i] || 0;
    const itemEnd = itemStart + chordWidth;

    // Ensure the item is within the visible range
    if (itemEnd > rangeStart && itemStart < rangeEnd) {
      fullVisibleIndices.push(i);
    }
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
