import { Fragment, useEffect, useRef, useState } from "react";
import PlaybackStrummedChord from "~/components/Tab/Playback/PlaybackStrummedChord";
import PlaybackTabEndcap from "~/components/Tab/Playback/PlaybackTabEndcap";
import PlaybackTabMeasureLine from "~/components/Tab/Playback/PlaybackTabMeasureLine";
import PlaybackTabNotesColumn from "~/components/Tab/Playback/PlaybackTabNotesColumn";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import {
  type PlaybackStrummedChord as PlaybackStrummedChordType,
  PlaybackTabChord,
  useTabStore,
} from "~/stores/TabStore";
// import type { PlaybackChordSequence } from "~/utils/experimentalChordCompilationHelpers";

function PlaybackDialog() {
  const {
    expandedTabData,
    currentChordIndex,
    currentlyPlayingMetadata,
    playbackSpeed,
    setCurrentChordIndex,
    fullCurrentlyPlayingMetadata,
    playbackChordIndices,
    tuning,
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    expandedTabData: state.expandedTabData,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    playbackSpeed: state.playbackSpeed,
    setCurrentChordIndex: state.setCurrentChordIndex,
    fullCurrentlyPlayingMetadata: state.fullCurrentlyPlayingMetadata,
    playbackChordIndices: state.playbackChordIndices,
    tuning: state.tuning,
  }));

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [showingDialog, setShowingDialog] = useState(false);

  const [chordDurations, setChordDurations] = useState<number[]>([]);

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

  const [chords, setChords] = useState<
    (PlaybackTabChord | PlaybackStrummedChordType)[]
  >([]);

  const [chordWidths, setChordWidths] = useState<number[]>([]);
  const [scrollPositions, setScrollPositions] = useState<number[]>([]);

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
      if (containerRef.current === null) return;
      setVisibleContainerWidth(containerRef.current.clientWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // TODO: eventually replace chords and all references below to directly use expandedTabData
  useEffect(() => {
    if (
      chords.length !== 0 ||
      expandedTabData === null ||
      expandedTabData.length === 0
    )
      return;

    // console.log(expandedTabData);

    // // Determine the length of a chord (number of strings)
    // const chordLength = expandedTabData[0]?.length || 0;

    // // Create 6 dummy chords
    // const leadInChords = Array.from({ length: 16 }, () => {
    //   // Create a chord filled with empty strings
    //   const chord = new Array(chordLength).fill("");

    //   // Copy over the 8th and 9th indices from expandedTabData[0]
    //   chord[8] = expandedTabData[0]?.[8];
    //   chord[9] = expandedTabData[0]?.[9];

    //   return chord;
    // });

    // // Combine leadInChords and expandedTabData into a flat array
    // setChords([...leadInChords, ...expandedTabData]);

    setChords(expandedTabData);
  }, [expandedTabData, chords.length]);

  useEffect(() => {
    // console.log(scrollPositions.length, chords.length, showPseudoChords);

    if (
      !showingDialog ||
      scrollPositions.length !== 0 ||
      chords.length === 0 ||
      !showPseudoChords
    )
      return;

    setTimeout(() => {
      const arr = new Array(chords.length).fill(0);
      const elements: HTMLCollectionOf<HTMLDivElement> =
        document.getElementsByClassName(
          "playbackElem",
        ) as HTMLCollectionOf<HTMLDivElement>;

      const scrollPositions: number[] = [];
      const chordWidths: number[] = [];

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
            chordWidths.push(width);
          }

          // include all DOM nodes in fullScrollPositions and fullChordWidths
          fullScrollPositions.push(offsetLeft);
          fullChordWidths.push(width);

          realChordsToFullChordsMap[index] =
            index - domElementDifferentialCount;

          if (index === chords.length - 1) {
            finalElementWidth = width;
          }
        }
      });

      const scrollContainerWidth =
        (scrollPositions.at(-1) || 0) + finalElementWidth;

      setScrollPositions(scrollPositions);
      setChordWidths(chordWidths);

      setFullScrollPositions(fullScrollPositions);
      setFullChordWidths(fullChordWidths);

      setRealChordsToFullChordsMap(realChordsToFullChordsMap);

      setScrollContainerWidth(scrollContainerWidth);
      setShowPseudoChords(false);
    }, 5000);
  }, [scrollPositions, chords, showPseudoChords, showingDialog]);

  const fullVisibleChordIndices = getFullVisibleChordIndices({
    fullScrollPositions,
    realChordsToFullChordsMap,
    currentChordIndex,
    visibleContainerWidth,
    fullChordWidths,
    buffer: 1000,
  });

  // console.log(
  //   scrollPositions,
  //   fullScrollPositions,
  //   chordWidths,
  //   fullChordWidths,
  //   fullVisibleChordIndices,
  //   realChordsToFullChordsMap,
  // );

  console.log(chordDurations.length, scrollPositions.length);
  console.log(fullChordWidths, fullScrollPositions, realChordsToFullChordsMap);

  console.log(chords);

  // useEffect(() => {
  //   if (
  //     containerRef.current &&
  //     currentChordIndex > 5 &&
  //     currentChordIndex % 15 === 0
  //   ) {
  //     smoothScroll({
  //       container: containerRef.current,
  //       playbackChordIndices,
  //       scrollPositions,
  //       chordDurations,
  //       currentChordIndex,
  //       animationFrameId,
  //     });
  //   }

  //   // const animationFrameIdCopy = animationFrameId.current;

  //   // unsure if this is beneficial v since it will be called on every render
  //   // Cleanup on unmount
  //   // return () => {
  //   //   if (animationFrameIdCopy) {
  //   //     console.log("cancelling");
  //   //     window.cancelAnimationFrame(animationFrameIdCopy);
  //   //   }
  //   // };
  // }, [
  //   currentChordIndex,
  //   playbackChordIndices,
  //   scrollPositions,
  //   chordDurations,
  // ]);

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

        <div
          ref={containerRef}
          className="relative flex h-[271px] w-[800px] overflow-hidden"
        >
          <div className="baseFlex absolute left-0 top-0 size-full">
            <div className="h-[165px] w-[2px] bg-pink-600"></div>
          </div>

          <div
            style={{
              width: `${scrollContainerWidth}px`,
              transform: `translateX(-${scrollPositions[currentChordIndex] || 0}px)`,
              transition: `transform ${
                chordDurations[currentChordIndex] || 0
              }ms linear`,
              // ^^ 99% keep this the same no matter what, meaning you have to keep scrollPositions
              // and chordDurations as is

              // need to bring back fullChordWidths and fullScrollPositions
              // and make a map between "full" indicies and the regular indicies so that you can do
              // fullScrollPositions[mappedIndicies[currentChordIndex]] to get the scroll position
              // of the corresponding full index, since we will *NEVER* change currentChordIndex from being
              // tied to a specific chord being played, never anything ornamental.

              // very first "placeholder" chord to take up the first 50% of the screen will be added
              // to start of chords in effect above. It will not have "ornamental" or "playbackElem" classes
              // since
            }}
            className="relative flex items-center will-change-transform"
          >
            {fullVisibleChordIndices.map((index) => {
              return (
                <div
                  key={index}
                  style={{
                    position: "absolute",
                    width: `${fullChordWidths[index]}px`,
                    left: `${fullScrollPositions[index]}px`,
                  }}
                >
                  {chords[index]?.type === "tab" ? (
                    <>
                      {chords[index]?.data.includes("|") ? (
                        <PlaybackTabMeasureLine
                          columnData={chords[index]?.data}
                        />
                      ) : (
                        // TODO: rename file to PlaybackTabChord
                        // and delete current PlaybackTabChord v

                        <PlaybackTabNotesColumn
                          columnData={chords[index]?.data}
                          isFirstChordInSection={
                            index === 0 || chords[index - 1]?.type === "strum"
                          }
                          isLastChordInSection={
                            index === chords.length - 1 ||
                            chords[index + 1]?.type === "strum"

                            // maybe you would only want to use the isLastChord prop
                            // to render the closing vertical line to act as a built in measure line?
                            // first chord leave as is?
                          }
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
                      isLastChordInSection={chords[index]?.isLastChord || false}
                      noteLength={chords[index]?.data.noteLength || "1/4th"}
                      chordName={chords[index]?.data.chordName || ""}
                      isHighlighted={false}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {true && (
          <div className="relative flex">
            {chords.map((chord, index) => {
              return (
                <Fragment key={index}>
                  {chords[index]?.type === "tab" ? (
                    <>
                      {chords[index]?.data.includes("|") ? (
                        <PlaybackTabMeasureLine
                          columnData={chords[index]?.data}
                        />
                      ) : (
                        <PlaybackTabNotesColumn
                          columnData={chords[index]?.data}
                          isFirstChordInSection={
                            index === 0 || chords[index - 1]?.type === "strum" // why not use the isFirstChord prop?
                          }
                          isLastChordInSection={
                            index === chords.length - 1 ||
                            chords[index + 1]?.type === "strum" // why not use the isLastChord prop?
                          }
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
                      isLastChordInSection={chords[index]?.isLastChord || false}
                      noteLength={chords[index]?.data.noteLength || "1/4th"}
                      chordName={chords[index]?.data.chordName || ""}
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
  // feels like *whenever* using currentChordIndex you kinda need t put throuhg
  // playbackChordIndices right?

  const adjustedCurrentChordIndex =
    realChordsToFullChordsMap[currentChordIndex];

  console.log(adjustedCurrentChordIndex);

  if (
    adjustedCurrentChordIndex === undefined ||
    fullScrollPositions[adjustedCurrentChordIndex] === undefined
  )
    return [];

  const fullVisibleIndices = [];

  // TODO: this needs to be adjusted to account for the playback vertical line
  // being in the middle of the screen, not at the start of the container
  const rangeStart = fullScrollPositions[adjustedCurrentChordIndex] - buffer;
  const rangeEnd =
    fullScrollPositions[adjustedCurrentChordIndex] +
    visibleContainerWidth +
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

// function columnIsBeingPlayed(columnIndex: number) {
//   const measureLineAdjustedIndex =
//     playbackChordIndices[currentChordIndex] === undefined
//       ? 0
//       : playbackChordIndices[currentChordIndex];

//   if (
//     !fullCurrentlyPlayingMetadata ||
//     !fullCurrentlyPlayingMetadata[measureLineAdjustedIndex] ||
//     !fullCurrentlyPlayingMetadata[columnIndex]
//   )
//     return false;

//   const {
//     sectionIndex,
//     sectionRepeatIndex,
//     subSectionIndex,
//     subSectionRepeatIndex,
//     chordIndex,
//   } = fullCurrentlyPlayingMetadata[measureLineAdjustedIndex].location;

//   const {
//     sectionIndex: sectionIndex2,
//     sectionRepeatIndex: sectionRepeatIndex2,
//     subSectionIndex: subSectionIndex2,
//     subSectionRepeatIndex: subSectionRepeatIndex2,
//     chordIndex: chordIndex2,
//   } = fullCurrentlyPlayingMetadata[columnIndex].location;

//   // return (
//   //   audioMetadata.playing &&
//   //   audioMetadata.type === "Generated" &&
//   //   measureLineAdjustedIndex === columnIndex
//   // );

//   // return measureLineAdjustedIndex === columnIndex;

//   return (
//     sectionIndex === sectionIndex2 &&
//     sectionRepeatIndex === sectionRepeatIndex2 &&
//     subSectionIndex === subSectionIndex2 &&
//     subSectionRepeatIndex === subSectionRepeatIndex2 &&
//     chordIndex === chordIndex2
//   );
// }

// function columnHasBeenPlayed(columnIndex: number) {
//   const measureLineAdjustedIndex =
//     playbackChordIndices[currentChordIndex] === undefined
//       ? 0
//       : playbackChordIndices[currentChordIndex];

//   // if (audioMetadata.editingLoopRange) {
//   //   const isInSectionBeingLooped = currentlyPlayingMetadata.some(
//   //     (metadata) => {
//   //       return (
//   //         sectionIndex === metadata.location.sectionIndex &&
//   //         subSectionIndex === metadata.location.subSectionIndex &&
//   //         columnIndex === metadata.location.chordIndex
//   //       );
//   //     }
//   //   );
//   //   return isInSectionBeingLooped;
//   // }
//   //     const correspondingChordIndex = currentlyPlayingMetadata.some(
//   //   (metadata) => {
//   //     return (
//   //       sectionIndex === metadata.location.sectionIndex &&
//   //       subSectionIndex === metadata.location.subSectionIndex &&
//   //       columnIndex === metadata.location.chordIndex
//   //     );
//   //   }
//   // );
//   // if (!correspondingChordIndex) return false;
//   // return measureLineAdjustedIndex > columnIndex;
//   return measureLineAdjustedIndex > columnIndex;
// }
