import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { VariableSizeList as List } from "react-window";
import PlaybackStrummingPattern from "~/components/Tab/Playback/PlaybackStrummingPattern";
import PlaybackTabMeasureLine from "~/components/Tab/Playback/PlaybackTabMeasureLine";
import PlaybackTabNotesColumn from "~/components/Tab/Playback/PlaybackTabNotesColumn";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { useTabStore } from "~/stores/TabStore";
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
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    expandedTabData: state.expandedTabData,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    playbackSpeed: state.playbackSpeed,
    setCurrentChordIndex: state.setCurrentChordIndex,
    fullCurrentlyPlayingMetadata: state.fullCurrentlyPlayingMetadata,
    playbackChordIndices: state.playbackChordIndices,
  }));

  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

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

  const [chords, setChords] = useState<string[][]>([]);
  // const [chordIndices, setChordIndices] = useState<number[]>([]);
  const [scrollPositions, setScrollPositions] = useState<number[]>([]);
  const [showPseudoChords, setShowPseudoChords] = useState(true);

  // TODO: eventually replace chords and all references below to directly use expandedTabData
  useEffect(() => {
    if (
      chords.length !== 0 ||
      expandedTabData === null ||
      expandedTabData.length === 0
    )
      return;

    console.log(expandedTabData);

    // Determine the length of a chord (number of strings)
    const chordLength = expandedTabData[0]?.length || 0;

    // Create 6 dummy chords
    const leadInChords = Array.from({ length: 16 }, () => {
      // Create a chord filled with empty strings
      const chord = new Array(chordLength).fill("");

      // Copy over the 8th and 9th indices from expandedTabData[0]
      chord[8] = expandedTabData[0]?.[8];
      chord[9] = expandedTabData[0]?.[9];

      return chord;
    });

    // Combine leadInChords and expandedTabData into a flat array
    setChords([...leadInChords, ...expandedTabData]);
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
      const positions: number[] = [];
      let initialOffset = 400;
      const arr = new Array(chords.length).fill(0);

      arr.map((_, index) => {
        const elem = document.getElementById(`${index}`);

        // let width = 0;
        // may need to add the +2 to the next chord if a measure line is found

        // console.log(elem?.clientWidth, elem?.getBoundingClientRect().width);

        if (elem) {
          // if (index < 6) {
          //   // console.log(
          //   //   index,
          //   //   elem.clientWidth !== 2 ? "chord" : "measure line",
          //   //   elem.offsetLeft,
          //   //   initialOffset,
          //   //   elem.offsetLeft - initialOffset,
          //   // );

          //   initialOffset += elem.clientWidth;
          //   positions.push(0);
          // } else {
          // console.log(
          //   index,
          //   elem.clientWidth !== 2 ? "chord" : "measure line",
          //   elem.offsetLeft,
          //   initialOffset,
          //   elem.offsetLeft - initialOffset,
          // );

          const elemScrollPosition = elem.offsetLeft;
          //- initialOffset; //getBoundingClientRect().width;  maybe still want bounding client for better precision?
          if (elem.clientWidth !== 2) positions.push(elemScrollPosition); // don't want to scroll to measure lines
          // }
        }
      });

      setScrollPositions(positions);
      setShowPseudoChords(false);
    }, 5000);
  }, [scrollPositions, chords, showPseudoChords, showingDialog]);

  // console.log(scrollPositions);

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

  // useEffect(() => {
  //   if (
  //     containerRef.current &&
  //     currentChordIndex > 5 &&
  //     currentChordIndex % 4 === 0
  //     // &&
  //     // currentChordIndex >= 0
  //   ) {
  //     // Trigger smoothScroll every four chords
  //     const startIndex = currentChordIndex;
  //     const endIndex = Math.min(
  //       startIndex + 3,
  //       playbackChordIndices.length - 1,
  //     );

  //     // Aggregate the durations for the next four chords
  //     const totalDuration = playbackChordIndices
  //       .slice(startIndex, endIndex + 1)
  //       .reduce((sum, idx) => sum + (chordDurations[idx] || 0), 0);

  //     // Use the scroll position of the last chord in the group
  //     const targetPosition = scrollPositions[endIndex] || 0;

  //     // console.log(
  //     //   "baseDuration",
  //     //   chordDurations[startIndex],
  //     //   (chordDurations[startIndex] || 0) * 5,
  //     //   totalDuration,
  //     // );
  //     smoothScroll({
  //       container: containerRef.current,
  //       targetPosition,
  //       totalDuration,
  //       animationFrameId,
  //     });
  //   }
  // }, [
  //   currentChordIndex,
  //   playbackChordIndices,
  //   scrollPositions,
  //   chordDurations,
  // ]);

  // console.log(
  //   "1st",
  //   chords[currentChordIndex],
  //   scrollPositions[currentChordIndex],
  //   chordDurations[currentChordIndex],
  // );
  // console.log(
  //   "2nd",
  //   chords[playbackChordIndices[currentChordIndex]!],
  //   scrollPositions[playbackChordIndices[currentChordIndex]!],
  //   chordDurations[playbackChordIndices[currentChordIndex]!],
  // );

  function columnIsBeingPlayed(columnIndex: number) {
    const measureLineAdjustedIndex =
      playbackChordIndices[currentChordIndex] === undefined
        ? 0
        : playbackChordIndices[currentChordIndex];

    if (
      !fullCurrentlyPlayingMetadata ||
      !fullCurrentlyPlayingMetadata[measureLineAdjustedIndex] ||
      !fullCurrentlyPlayingMetadata[columnIndex]
    )
      return false;

    const {
      sectionIndex,
      sectionRepeatIndex,
      subSectionIndex,
      subSectionRepeatIndex,
      chordIndex,
    } = fullCurrentlyPlayingMetadata[measureLineAdjustedIndex].location;

    const {
      sectionIndex: sectionIndex2,
      sectionRepeatIndex: sectionRepeatIndex2,
      subSectionIndex: subSectionIndex2,
      subSectionRepeatIndex: subSectionRepeatIndex2,
      chordIndex: chordIndex2,
    } = fullCurrentlyPlayingMetadata[columnIndex].location;

    // return (
    //   audioMetadata.playing &&
    //   audioMetadata.type === "Generated" &&
    //   measureLineAdjustedIndex === columnIndex
    // );

    // return measureLineAdjustedIndex === columnIndex;

    return (
      sectionIndex === sectionIndex2 &&
      sectionRepeatIndex === sectionRepeatIndex2 &&
      subSectionIndex === subSectionIndex2 &&
      subSectionRepeatIndex === subSectionRepeatIndex2 &&
      chordIndex === chordIndex2
    );
  }

  function columnHasBeenPlayed(columnIndex: number) {
    const measureLineAdjustedIndex =
      playbackChordIndices[currentChordIndex] === undefined
        ? 0
        : playbackChordIndices[currentChordIndex];

    // if (audioMetadata.editingLoopRange) {
    //   const isInSectionBeingLooped = currentlyPlayingMetadata.some(
    //     (metadata) => {
    //       return (
    //         sectionIndex === metadata.location.sectionIndex &&
    //         subSectionIndex === metadata.location.subSectionIndex &&
    //         columnIndex === metadata.location.chordIndex
    //       );
    //     }
    //   );
    //   return isInSectionBeingLooped;
    // }
    //     const correspondingChordIndex = currentlyPlayingMetadata.some(
    //   (metadata) => {
    //     return (
    //       sectionIndex === metadata.location.sectionIndex &&
    //       subSectionIndex === metadata.location.subSectionIndex &&
    //       columnIndex === metadata.location.chordIndex
    //     );
    //   }
    // );
    // if (!correspondingChordIndex) return false;
    // return measureLineAdjustedIndex > columnIndex;
    return measureLineAdjustedIndex > columnIndex;
  }

  // console.log(chordDurations, scrollPositions, chords);
  // console.log("scrollPositions", scrollPositions);

  const isCancelled = useRef(false);
  const isStarted = useRef(false);

  const startContinuousScroll = useCallback(
    (index: number) => {
      if (isCancelled.current) return;

      if (index >= playbackChordIndices.length - 1) return;

      isStarted.current = true;

      const measureLineAdjustedIndex = playbackChordIndices[index];
      const nextIndex = index + 1;
      const nextMeasureLineAdjustedIndex = playbackChordIndices[nextIndex];

      if (
        !containerRef.current ||
        measureLineAdjustedIndex === undefined ||
        nextMeasureLineAdjustedIndex === undefined
      )
        return;

      const startPosition =
        scrollPositionsRef.current[measureLineAdjustedIndex] || 0;
      const endPosition =
        scrollPositionsRef.current[nextMeasureLineAdjustedIndex] || 0;
      const duration = chordDurationsRef.current[measureLineAdjustedIndex] || 0;

      smoothScroll({
        container: containerRef.current,
        startPosition,
        endPosition,
        duration,
        isCancelled,
        onComplete: () => {
          startContinuousScroll(nextIndex);
        },
      });
    },
    [playbackChordIndices],
  );

  // useEffect(() => {
  //   if (
  //     // isStarted.current ||
  //     !showingDialog ||
  //     !containerRef.current
  //     // ||
  //     // scrollPositions.length === 0 ||
  //     // chordDurations.length === 0
  //   )
  //     return;

  //   isCancelled.current = false;

  //   startContinuousScroll(currentChordIndex);
  //   // isStarted.current = true;

  //   return () => {
  //     isCancelled.current = true;
  //   };
  // }, [
  //   showingDialog,
  //   // scrollPositions,
  //   // chordDurations,
  //   currentChordIndex,
  //   // playbackChordIndices,
  //   startContinuousScroll,
  // ]);

  useEffect(() => {
    if (isStarted.current || !showingDialog || !containerRef.current) return;

    isCancelled.current = false;

    startContinuousScroll(currentChordIndex);
    isStarted.current = true;

    return () => {
      isCancelled.current = true;
      isStarted.current = false; // Reset isStarted when component unmounts
    };
  }, [showingDialog, startContinuousScroll]);

  const scrollPositionsRef = useRef<number[]>([]);
  const chordDurationsRef = useRef<number[]>([]);

  useEffect(() => {
    scrollPositionsRef.current = scrollPositions;
  }, [scrollPositions]);

  useEffect(() => {
    chordDurationsRef.current = chordDurations;
  }, [chordDurations]);

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

        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        {/* <Button onClick={() => setCurrentChordIndex(currentChordIndex - 1)}>
          Previous
        </Button>
        <p>{currentChordIndex}</p>
        <Button
          onClick={() => {
            setCurrentChordIndex(currentChordIndex + 1);
          }}
        >
          Next
        </Button> */}

        {chords.length !== 0 && (
          <List
            // ref={testRef}
            outerRef={containerRef}
            height={271}
            // outerElementType={"div"}
            itemCount={chords.length}
            itemSize={(index) => {
              if (
                Array.isArray(chords[index]) &&
                chords[index]?.includes("|")
              ) {
                return 2;
              } else {
                return 35;
              }
            }}
            layout="horizontal"
            width={800} // precompute I guess to be 100% of available width of dialog right?
            itemData={{
              chords,
              columnIsBeingPlayed,
              columnHasBeenPlayed,
              chordDurations,
              playbackChordIndices,
            }}
            className="!h-[300px] will-change-scroll"
          >
            {PlaybackSectionRenderer}
          </List>
        )}

        {/* <div className="relative flex w-[800px] overflow-hidden">
          <div className="baseFlex absolute left-0 top-0 size-full">
            <div className="h-[165px] w-[2px] bg-pink-600"></div>
          </div>

          {chords.map((chord, index) => {
            return (
              <div
                key={index}
                id={`${index}`}
                style={{
                  transform: `translateX(-${scrollPositions[currentChordIndex] || 0}px)`,
                  transition: `transform ${
                    chordDurations[
                      playbackChordIndices[currentChordIndex] || 0
                    ] || 0
                  }ms linear`,
                }}
                // className="will-change-transform"
              >
                {Array.isArray(chord) ? (
                  <>
                    {chord.includes("|") ? (
                      <PlaybackTabMeasureLine columnData={chord} />
                    ) : (
                      <PlaybackTabNotesColumn
                        columnIndex={index}
                        currentChordIndex={0}
                        columnIsBeingPlayed={false}
                        columnHasBeenPlayed={false}
                        columnData={chord}
                        durationOfChord={0}
                        uniqueKey={index}
                      />
                    )}
                  </>
                ) : null}
              </div>
            );
          })}
        </div> */}

        {showPseudoChords && (
          <div className="relative flex">
            {chords.map((chord, index) => {
              return (
                <div key={index} id={`${index}`} style={{}}>
                  {Array.isArray(chord) ? (
                    <>
                      {chord.includes("|") ? (
                        <PlaybackTabMeasureLine columnData={chord} />
                      ) : (
                        <PlaybackTabNotesColumn
                          columnIndex={index}
                          currentChordIndex={0}
                          columnIsBeingPlayed={false}
                          columnHasBeenPlayed={false}
                          columnData={chord}
                          durationOfChord={0}
                          uniqueKey={index}
                        />
                      )}
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PlaybackDialog;

const PlaybackSectionRenderer = ({
  index,
  style,
  data,
}: {
  index: number;
  style: React.CSSProperties;
  data: {
    chords: string[][];
    columnIsBeingPlayed: (columnIndex: number) => boolean;
    columnHasBeenPlayed: (columnIndex: number) => boolean;
    chordDurations: number[];
    playbackChordIndices: number[];
  };
}) => {
  const {
    chords,
    columnIsBeingPlayed,
    columnHasBeenPlayed,
    chordDurations,
    playbackChordIndices,
  } = data;
  const grouping = chords[index]; // Retrieve the data for the current index
  return (
    <div
      // id={`${index}`}
      style={style}
    >
      {Array.isArray(grouping) ? (
        <>
          {grouping.includes("|") ? (
            <PlaybackTabMeasureLine columnData={grouping} />
          ) : (
            <PlaybackTabNotesColumn
              columnIndex={index}
              currentChordIndex={0}
              columnIsBeingPlayed={columnIsBeingPlayed(index)}
              columnHasBeenPlayed={columnHasBeenPlayed(index)}
              columnData={grouping}
              durationOfChord={chordDurations[index] || 0}
              uniqueKey={index}
            />
          )}
        </>
      ) : // <PlaybackStrummingPattern
      //   indices={chordSequenceData.indices}
      //   data={chordSequenceData.strummingPattern}
      //   chordSequenceData={chordSequenceData.data}
      //   currentChordIndex={currentChordIndex}
      // />
      null}
    </div>
  );
};

// function smoothScroll({
//   container,
//   targetPosition,
//   totalDuration,
//   animationFrameId,
// }: {
//   container: HTMLElement;
//   targetPosition: number;
//   totalDuration: number;
//   animationFrameId: React.MutableRefObject<number | null>;
// }) {
//   const start = container.scrollLeft;
//   const target = targetPosition;
//   const duration = totalDuration;

//   if (target === undefined || duration === undefined) return;

//   let startTime: number | null = null;

//   function step(timestamp: number) {
//     if (startTime === null) startTime = timestamp;
//     const progress = timestamp - startTime;
//     const scrollDistance = target - start;
//     const scrollProgress = Math.min(progress / duration, 1);
//     const currentScroll = start + scrollDistance * scrollProgress;

//     container.scrollLeft = currentScroll;

//     if (progress < duration) {
//       animationFrameId.current = window.requestAnimationFrame(step);
//     }
//   }

//   // Cancel any previous animation before starting a new one
//   if (animationFrameId.current) {
//     window.cancelAnimationFrame(animationFrameId.current);
//   }

//   animationFrameId.current = window.requestAnimationFrame(step);
// }

function smoothScroll({
  container,
  startPosition,
  endPosition,
  duration,
  onComplete,
  isCancelled,
}: {
  container: HTMLElement;
  startPosition: number;
  endPosition: number;
  duration: number;
  onComplete: () => void;
  isCancelled: React.MutableRefObject<boolean>;
}) {
  let startTime: number | null = null;

  console.count("smoothScroll");

  function step(timestamp: number) {
    if (isCancelled.current) return;

    if (startTime === null) startTime = timestamp;
    const progress = timestamp - startTime;
    const scrollProgress = Math.min(progress / duration, 1);
    const currentScroll =
      startPosition + (endPosition - startPosition) * scrollProgress;

    container.scrollLeft = currentScroll;

    if (progress < duration) {
      window.requestAnimationFrame(step);
    } else {
      // Call the onComplete callback when the animation finishes
      if (onComplete) onComplete();
    }
  }

  window.requestAnimationFrame(step);
}
