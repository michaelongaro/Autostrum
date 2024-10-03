import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { VariableSizeList as List } from "react-window";
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
import type { PlaybackChordSequence } from "~/utils/experimentalChordCompilationHelpers";

function PlaybackDialog() {
  const {
    expandedTabData,
    currentChordIndex,
    currentlyPlayingMetadata,
    playbackSpeed,
    setCurrentChordIndex,
    fullCurrentlyPlayingMetadata,
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    expandedTabData: state.expandedTabData,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    playbackSpeed: state.playbackSpeed,
    setCurrentChordIndex: state.setCurrentChordIndex,
    fullCurrentlyPlayingMetadata: state.fullCurrentlyPlayingMetadata,
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

  const [chords, setChords] = useState<(string[] | PlaybackChordSequence)[]>(
    [],
  );
  const [chordIndices, setChordIndices] = useState<number[]>([]);
  const [scrollPositions, setScrollPositions] = useState<number[]>([]);
  const [showPseudoChords, setShowPseudoChords] = useState(true);

  useEffect(() => {
    if (expandedTabData === null || chords.length > 0) return;

    const flattenedData: (string[] | PlaybackChordSequence)[] = [];
    const chordIndices: number[] = [];

    expandedTabData.forEach((section) => {
      section.data.forEach((sectionData) => {
        if (sectionData.type === "tab") {
          // For tab sections, push all the string arrays
          sectionData.indices.forEach((index) => {
            chordIndices.push(index);
          });
          sectionData.data.forEach((tabData) => {
            // console.log("adding tab data", tabData);
            flattenedData.push(tabData);
          });
        } else if (sectionData.type === "chord") {
          // For chord sections, push all the PlaybackChordSequences
          sectionData.data.forEach((chordSequence) => {
            chordSequence.indices.forEach((index) => {
              chordIndices.push(index);
            });
          });
          sectionData.data.forEach((chordSequence) => {
            flattenedData.push(chordSequence);
          });
        }
      });
    });

    setChords(flattenedData);
    setChordIndices(chordIndices);
  }, [expandedTabData, chords.length]);

  // console.log(chordIndices);

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
      let initialOffset = 0;
      const arr = new Array(chords.length).fill(0);

      arr.map((_, index) => {
        const elem = document.getElementById(`${index}`);

        // let width = 0;
        // may need to add the +2 to the next chord if a measure line is found

        // console.log(elem?.clientWidth, elem?.getBoundingClientRect().width);

        if (elem) {
          if (index < 6) {
            console.log(
              index,
              elem.clientWidth !== 2 ? "chord" : "measure line",
              elem.offsetLeft,
              initialOffset,
              elem.offsetLeft - initialOffset,
            );

            initialOffset += elem.clientWidth;
            positions.push(0);
          } else {
            console.log(
              index,
              elem.clientWidth !== 2 ? "chord" : "measure line",
              elem.offsetLeft,
              initialOffset,
              elem.offsetLeft - initialOffset,
            );

            const elemScrollPosition = elem.offsetLeft - initialOffset; //getBoundingClientRect().width;  maybe still want bounding client for better precision?
            if (elem.clientWidth !== 2) positions.push(elemScrollPosition); // don't want to scroll to measure lines
          }
        }
      });

      setScrollPositions(positions);
      setShowPseudoChords(false);
    }, 5000);
  }, [scrollPositions, chords, showPseudoChords, showingDialog]);

  useEffect(() => {
    if (
      containerRef.current &&
      currentChordIndex > 5
      //  &&
      // currentChordIndex % 15 === 0
    ) {
      smoothScroll({
        container: containerRef.current,
        chordIndices,
        scrollPositions,
        chordDurations,
        currentChordIndex,
        animationFrameId,
      });
    }

    // const animationFrameIdCopy = animationFrameId.current;

    // unsure if this is beneficial v since it will be called on every render
    // Cleanup on unmount
    // return () => {
    //   if (animationFrameIdCopy) {
    //     console.log("cancelling");
    //     window.cancelAnimationFrame(animationFrameIdCopy);
    //   }
    // };
  }, [currentChordIndex, chordIndices, scrollPositions, chordDurations]);

  // console.log(
  //   "1st",
  //   chords[currentChordIndex],
  //   scrollPositions[currentChordIndex],
  //   chordDurations[currentChordIndex],
  // );
  // console.log(
  //   "2nd",
  //   chords[chordIndices[currentChordIndex]!],
  //   scrollPositions[chordIndices[currentChordIndex]!],
  //   chordDurations[chordIndices[currentChordIndex]!],
  // );

  function columnIsBeingPlayed(columnIndex: number) {
    const measureLineAdjustedIndex =
      chordIndices[currentChordIndex] === undefined
        ? 0
        : chordIndices[currentChordIndex];

    // return (
    //   audioMetadata.playing &&
    //   audioMetadata.type === "Generated" &&
    //   measureLineAdjustedIndex === columnIndex
    // );

    return measureLineAdjustedIndex === columnIndex;
  }

  function columnHasBeenPlayed(columnIndex: number) {
    const measureLineAdjustedIndex =
      chordIndices[currentChordIndex] === undefined
        ? 0
        : chordIndices[currentChordIndex];

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
              chordIndices,
            }}
            className="!h-[300px] will-change-scroll"
          >
            {PlaybackSectionRenderer}
          </List>
        )}

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
    chords: (string[] | PlaybackChordSequence)[];
    columnIsBeingPlayed: (columnIndex: number) => boolean;
    columnHasBeenPlayed: (columnIndex: number) => boolean;
    chordDurations: number[];
    chordIndices: number[];
  };
}) => {
  const {
    chords,
    columnIsBeingPlayed,
    columnHasBeenPlayed,
    chordDurations,
    chordIndices,
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
      ) : null}
      {/* <PlaybackSectionContainer
        key={index}
        sectionData={section}
        uniqueKey={index}
      /> */}
    </div>
  );
};

function smoothScroll({
  container,
  chordIndices,
  scrollPositions,
  chordDurations,
  currentChordIndex,
  animationFrameId,
}: {
  container: HTMLElement;
  chordIndices: number[];
  scrollPositions: number[];
  chordDurations: number[];
  currentChordIndex: number;
  animationFrameId: React.MutableRefObject<number | null>;
}) {
  if (!chordIndices[currentChordIndex]) return;

  const start = container.scrollLeft;
  const target = scrollPositions[currentChordIndex];
  const duration = chordDurations[chordIndices[currentChordIndex]];
  // const duration = 150;

  if (target === undefined || duration === undefined) return;

  let startTime: number | null = null;

  function step(timestamp: number) {
    if (target === undefined || duration === undefined) return;

    if (startTime === null) startTime = timestamp;
    const progress = timestamp - startTime;
    const scrollDistance = target - start;
    const scrollProgress = Math.min(progress / duration, 1);
    const currentScroll = start + scrollDistance * scrollProgress;

    container.scrollLeft = currentScroll;

    if (progress < duration) {
      animationFrameId.current = window.requestAnimationFrame(step);
    }
  }

  // Cancel any previous animation before starting a new one
  if (animationFrameId.current) {
    window.cancelAnimationFrame(animationFrameId.current);
  }

  animationFrameId.current = window.requestAnimationFrame(step);
}

// idea: what we need is to do currentlyPlayingMetadata[currentChordIndex]!.location
// to get id to get position of, and if that position is close enough to the right side of
// the container, then and only then call the smooth scroll function

// maybe for now just ignore the overscan stuff and immediately call the smooth scroll function
// when currentChordIndex equals 0 (does it reset to -1? I don't think so).

// also btw you can techincally (with extra work) still incldue the tab "endcaps" + chord border...
