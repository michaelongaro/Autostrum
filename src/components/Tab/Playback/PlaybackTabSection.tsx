import { Fragment } from "react";
import { parse, toString } from "~/utils/tunings";
import PlaybackTabMeasureLine from "~/components/Tab/Playback/PlaybackTabMeasureLine";
import PlaybackTabNotesColumn from "~/components/Tab/Playback/PlaybackTabNotesColumn";
import type { PlaybackTabSection as PlaybackTabSectionType } from "~/utils/experimentalChordCompilationHelpers";
import { useTabStore } from "~/stores/TabStore";

interface PlaybackTabSection {
  subSectionData: PlaybackTabSectionType;
  uniqueKey: number;
}

function PlaybackTabSection({ subSectionData, uniqueKey }: PlaybackTabSection) {
  const {
    tuning,
    currentChordIndex,
    currentlyPlayingMetadata,
    playbackSpeed,
    audioMetadata,
  } = useTabStore((state) => ({
    tuning: state.tuning,
    currentChordIndex: state.currentChordIndex,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    playbackSpeed: state.playbackSpeed,
    audioMetadata: state.audioMetadata,
  }));

  function columnIsBeingPlayed(columnIndex: number) {
    const adjustedIndex =
      subSectionData.indices[currentChordIndex] === undefined
        ? 0
        : subSectionData.indices[currentChordIndex];

    return (
      audioMetadata.playing &&
      audioMetadata.type === "Generated" &&
      adjustedIndex === columnIndex
    );
  }

  function columnHasBeenPlayed(columnIndex: number) {
    const adjustedIndex =
      subSectionData.indices[currentChordIndex] === undefined
        ? 0
        : subSectionData.indices[currentChordIndex];

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

    return adjustedIndex > columnIndex;
  }

  function getDurationOfCurrentChord() {
    const location = currentlyPlayingMetadata?.[currentChordIndex]?.location;
    if (!currentlyPlayingMetadata || !location) return 0;

    const { bpm, noteLengthMultiplier } =
      currentlyPlayingMetadata[currentChordIndex]!;

    return 60 / ((bpm / Number(noteLengthMultiplier)) * playbackSpeed);
  }

  return (
    <>
      {/* <div
        style={{
          height: "168px",
          gap:  "0",
          marginBottom: "-1px",
        }}
        className="baseVertFlex relative rounded-l-2xl border-2 border-pink-100 p-2"
      >
        {toString(parse(tuning), { pad: 1 })
          .split(" ")
          .reverse()
          .map((note, index) => (
            <div key={index}>{note}</div>
          ))}
      </div> */}

      {subSectionData.data.map((column, index) => (
        <Fragment key={column[9]}>
          {column.includes("|") ? null : (
            <PlaybackTabNotesColumn
              columnIndex={index}
              currentChordIndex={currentChordIndex}
              columnIsBeingPlayed={columnIsBeingPlayed(index)}
              columnHasBeenPlayed={columnHasBeenPlayed(index)}
              columnData={column}
              durationOfChord={getDurationOfCurrentChord()}
              uniqueKey={uniqueKey}
            />
          )}
        </Fragment>
      ))}

      {/* right tab "cap" */}
      {/* <div
            style={{
              height: "168px",
              marginBottom: "-1px",
            }}
            className="rounded-r-2xl border-2 border-pink-100 p-1"
          ></div> */}
    </>
  );
}

export default PlaybackTabSection;
