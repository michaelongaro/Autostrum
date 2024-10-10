import { Fragment, useEffect, useRef, useState } from "react";
import PlaybackStrummedChord from "~/components/Tab/Playback/PlaybackStrummedChord";
import PlaybackTabChord from "~/components/Tab/Playback/PlaybackTabChord";
import PlaybackTabMeasureLine from "~/components/Tab/Playback/PlaybackTabMeasureLine";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { useTabStore } from "~/stores/TabStore";

function PlaybackDialog() {
  const {
    expandedTabData,
    currentChordIndex,
    playbackSpeed,
    setCurrentChordIndex,
    fullCurrentlyPlayingMetadata,
    audioMetadata,
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    expandedTabData: state.expandedTabData,
    playbackSpeed: state.playbackSpeed,
    setCurrentChordIndex: state.setCurrentChordIndex,
    fullCurrentlyPlayingMetadata: state.fullCurrentlyPlayingMetadata,
    audioMetadata: state.audioMetadata,
  }));

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [showingDialog, setShowingDialog] = useState(false);

  const [chordDurations, setChordDurations] = useState<number[]>([]);
  const [scrollPositions, setScrollPositions] = useState<number[]>([]);

  const [initialPlaceholderWidth, setInitialPlaceholderWidth] = useState(0);

  const [fullChordWidths, setFullChordWidths] = useState<number[]>([]);
  const [fullScrollPositions, setFullScrollPositions] = useState<number[]>([]);

  const [realChordsToFullChordsMap, setRealChordsToFullChordsMap] = useState<{
    [key: number]: number;
  }>({});

  const [scrollContainerWidth, setScrollContainerWidth] = useState(0);
  const [showPseudoChords, setShowPseudoChords] = useState(true);
  const [visibleContainerWidth, setVisibleContainerWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        if (expandedTabData === null || containerRef.current === null) return;

        setInitialPlaceholderWidth(containerRef.current.clientWidth / 2 - 5);
        setVisibleContainerWidth(containerRef.current.clientWidth);
      }, 500);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [expandedTabData]);

  useEffect(() => {
    if (!fullCurrentlyPlayingMetadata) return;

    const durations = fullCurrentlyPlayingMetadata.map((metadata) => {
      const { bpm, noteLengthMultiplier } = metadata;
      return (
        (60 / ((bpm / Number(noteLengthMultiplier)) * playbackSpeed)) * 1000
      ); // requestAnimationFrame uses milliseconds
    });

    setChordDurations(durations);
  }, [fullCurrentlyPlayingMetadata, playbackSpeed]);

  useEffect(() => {
    if (
      !showingDialog ||
      !expandedTabData ||
      scrollPositions.length !== 0 ||
      expandedTabData.length === 0 ||
      !showPseudoChords
    )
      return;

    setTimeout(() => {
      const arr = new Array(expandedTabData.length).fill(0);
      const elements: HTMLCollectionOf<HTMLDivElement> =
        document.getElementsByClassName(
          "playbackElem",
        ) as HTMLCollectionOf<HTMLDivElement>;

      const scrollPositions: number[] = [];

      const fullScrollPositions: number[] = [];
      const fullChordWidths: number[] = [];

      const realChordsToFullChordsMap: { [key: number]: number } = {};

      let finalElementWidth = 0;

      // increments every time an ornamental element is found
      let domElementDifferentialCount = 0;

      arr.map((_, index) => {
        const elem = elements[index];

        if (elem) {
          const offsetLeft = elem.offsetLeft;
          const width = elem.getBoundingClientRect().width;

          // exclude ornamental DOM nodes from scrollPositions and chordWidths,
          // increment domElementDifferentialCount otherwise
          if (elem?.classList.contains("ornamental")) {
            domElementDifferentialCount++;
          } else {
            scrollPositions.push(offsetLeft);
          }

          // include all DOM nodes in fullScrollPositions and fullChordWidths
          fullScrollPositions.push(offsetLeft);
          fullChordWidths.push(width);

          realChordsToFullChordsMap[index] =
            index - domElementDifferentialCount;

          if (index === expandedTabData.length - 1) {
            finalElementWidth = width;
          }
        }
      });

      const scrollContainerWidth =
        (scrollPositions.at(-1) || 0) + finalElementWidth;

      const lastScrollPosition = scrollPositions.at(-1) || 0;

      // adding a "ghost" chord so that the last chord is scrolled past just
      // like every other chord
      scrollPositions.push(lastScrollPosition + finalElementWidth);

      setScrollPositions(scrollPositions);

      setFullScrollPositions(fullScrollPositions);
      setFullChordWidths(fullChordWidths);

      setRealChordsToFullChordsMap(realChordsToFullChordsMap);

      setScrollContainerWidth(scrollContainerWidth);
      setShowPseudoChords(false);
    }, 5000);
  }, [scrollPositions, expandedTabData, showPseudoChords, showingDialog]);

  const fullVisibleChordIndices = getFullVisibleChordIndices({
    fullScrollPositions,
    realChordsToFullChordsMap,
    currentChordIndex,
    visibleContainerWidth,
    fullChordWidths,
    buffer: 1000,
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
      !fullCurrentlyPlayingMetadata ||
      !fullCurrentlyPlayingMetadata[currentChordIndex] ||
      !fullCurrentlyPlayingMetadata[index]
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
    } = fullCurrentlyPlayingMetadata[currentChordIndex].location;

    const {
      sectionIndex: renderedSectionIndex,
      sectionRepeatIndex: renderedSectionRepeatIndex,
      subSectionIndex: renderedSubSectionIndex,
      subSectionRepeatIndex: renderedSubSectionRepeatIndex,
      chordSequenceIndex: renderedChordSequenceIndex,
      chordSequenceRepeatIndex: renderedChordSequenceRepeatIndex,
      chordIndex: renderedChordIndex,
    } = fullCurrentlyPlayingMetadata[index].location;

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

  if (expandedTabData === null) return;

  return (
    <Dialog
      open={showingDialog}
      onOpenChange={(open) => setShowingDialog(open)}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Practice tab</Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-6xl bg-black">
        {/* <VisuallyHidden>
          <DialogTitle>
            Shuffling deck for round {gameData.currentRound}
          </DialogTitle>
          <DialogDescription>
            The decks are being shuffled for the upcoming round
          </DialogDescription>
        </VisuallyHidden> */}

        <div className="baseFlex">
          <Button
            onClick={() => {
              setCurrentChordIndex(
                currentChordIndex === 0 ? 0 : currentChordIndex - 1,
              );
            }}
          >
            -
          </Button>
          <Button
            onClick={() => {
              setCurrentChordIndex(
                currentChordIndex === expandedTabData.length - 1
                  ? expandedTabData.length - 1
                  : currentChordIndex + 1,
              );
            }}
          >
            +
          </Button>
        </div>

        <div
          ref={containerRef}
          // TODO: 50vw is not a great metric
          className="relative flex h-[271px] max-w-[50vw] overflow-hidden"
        >
          <div className="baseFlex absolute left-0 top-0 size-full">
            <div className="h-[165px] w-full bg-pink-600/25"></div>
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
                  left: 0,
                  width: `${initialPlaceholderWidth}px`,
                }}
              ></div>

              {fullVisibleChordIndices.map((index) => {
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
                            isHighlighted={
                              (audioMetadata.playing &&
                                highlightChord(
                                  realChordsToFullChordsMap[index] || 0,
                                  "isBeingPlayed",
                                )) ||
                              highlightChord(
                                realChordsToFullChordsMap[index] || 0,
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
                          (expandedTabData[index]?.data.strumIndex || 0) ===
                            0 && expandedTabData[index]?.data.bpm
                            ? expandedTabData[index]?.data.bpm
                            : undefined
                        }
                        chordName={expandedTabData[index]?.data.chordName || ""}
                        isHighlighted={
                          (audioMetadata.playing &&
                            highlightChord(
                              realChordsToFullChordsMap[index] || 0,
                              "isBeingPlayed",
                            )) ||
                          highlightChord(
                            realChordsToFullChordsMap[index] || 0,
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

        {showPseudoChords && (
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
}: {
  fullScrollPositions: number[];
  realChordsToFullChordsMap: { [key: number]: number };
  currentChordIndex: number;
  visibleContainerWidth: number;
  fullChordWidths: number[];
  buffer: number;
}) => {
  const adjustedCurrentChordIndex =
    realChordsToFullChordsMap[currentChordIndex];

  if (
    adjustedCurrentChordIndex === undefined ||
    fullScrollPositions[adjustedCurrentChordIndex] === undefined
  )
    return [];

  const fullVisibleIndices = [];

  // start and end points of the visible range
  const rangeStart =
    fullScrollPositions[adjustedCurrentChordIndex] -
    visibleContainerWidth / 2 -
    buffer;
  const rangeEnd =
    fullScrollPositions[adjustedCurrentChordIndex] +
    visibleContainerWidth / 2 +
    buffer;

  // can probably be optimized in some way since you know the fullScrollPositions are sorted
  for (let i = 0; i < fullScrollPositions.length; i++) {
    const itemStart = fullScrollPositions[i] || 0;
    const chordWidth = fullChordWidths[i] || 0;
    const itemEnd = itemStart + chordWidth;

    // If the item is within the visible range
    if (itemEnd > rangeStart && itemStart < rangeEnd) {
      fullVisibleIndices.push(i);
    }
  }

  return fullVisibleIndices;
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
