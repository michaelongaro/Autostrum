import { Fragment, useState, useEffect } from "react";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore, type TabSection } from "~/stores/TabStore";
import { parse, toString } from "~/utils/tunings";
import { PreviewTabMeasureLine } from "./TabScreenshotPreview";

export interface LastModifiedPalmMuteNodeLocation {
  columnIndex: number;
  prevValue: string;
  currentValue: string;
}

interface HighlightTabColumnWrapper {
  sectionIndex: number;
  subSectionIndex: number;
  subSectionData: TabSection;
}

function HighlightTabColumnWrapper({
  sectionIndex,
  subSectionIndex,
  subSectionData,
}: HighlightTabColumnWrapper) {
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const {
    tuning,
    bpm,
    currentlyPlayingMetadata,
    currentChordIndex,
    playbackSpeed,
    audioMetadata,
  } = useTabStore((state) => ({
    tuning: state.tuning,
    bpm: state.bpm,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    currentChordIndex: state.currentChordIndex,
    playbackSpeed: state.playbackSpeed,
    audioMetadata: state.audioMetadata,
  }));

  function columnIsBeingPlayed(columnIndex: number) {
    const location = currentlyPlayingMetadata?.[currentChordIndex]?.location;
    if (
      !currentlyPlayingMetadata ||
      !location ||
      audioMetadata.editingLoopRange
    )
      return false;

    const isSameSection =
      location.sectionIndex === sectionIndex &&
      location.subSectionIndex === subSectionIndex;

    const columnIsBeingPlayed =
      isSameSection && location.chordIndex === columnIndex;

    return columnIsBeingPlayed && audioMetadata.playing;
  }

  function columnHasBeenPlayed(columnIndex: number) {
    const location = currentlyPlayingMetadata?.[currentChordIndex]?.location;
    if (!currentlyPlayingMetadata || !location) return false;

    if (audioMetadata.editingLoopRange) {
      const isInSectionBeingLooped = currentlyPlayingMetadata.some(
        (metadata) => {
          return (
            sectionIndex === metadata.location.sectionIndex &&
            subSectionIndex === metadata.location.subSectionIndex &&
            columnIndex === metadata.location.chordIndex
          );
        },
      );

      return isInSectionBeingLooped;
    }

    const correspondingChordIndex = currentlyPlayingMetadata.some(
      (metadata) => {
        return (
          sectionIndex === metadata.location.sectionIndex &&
          subSectionIndex === metadata.location.subSectionIndex &&
          columnIndex === metadata.location.chordIndex
        );
      },
    );

    if (!correspondingChordIndex) return false;

    const isSameSection =
      location.sectionIndex === sectionIndex &&
      location.subSectionIndex === subSectionIndex;

    return isSameSection && location.chordIndex > columnIndex;
  }

  function getDurationOfCurrentChord() {
    const location = currentlyPlayingMetadata?.[currentChordIndex]?.location;
    if (!currentlyPlayingMetadata || !location) return 0;

    const { bpm, noteLengthMultiplier } =
      currentlyPlayingMetadata[currentChordIndex]!;

    return 60 / ((bpm / Number(noteLengthMultiplier)) * playbackSpeed);
  }

  function getPaddingBottom(
    chordEffects: string,
    showingNoteLengthIcon?: boolean,
  ) {
    let paddingBottom = 0;

    switch (chordEffects.length) {
      case 0:
        paddingBottom = 0;
        break;
      case 1:
        paddingBottom = 18;
        break;
      case 2:
        paddingBottom = 32;
        break;
      case 3:
        paddingBottom = 46;
        break;
      default:
        paddingBottom = 0;
        break;
    }

    if (showingNoteLengthIcon) {
      if (chordEffects.length === 0) paddingBottom += 26;
      else paddingBottom += 22;
    }

    return `${paddingBottom}px`;
  }

  return (
    <div
      style={{
        padding: aboveMediumViewportWidth ? "0 2rem" : "0 1rem",
      }}
      className="baseVertFlex absolute left-0 top-0 h-full !justify-start rounded-md"
    >
      <div className="baseFlex relative w-full !items-start !justify-start pb-8 pt-4">
        <div className="baseVertFlex relative mb-[-1px] h-[168px] rounded-l-2xl border-2 border-pink-100 p-2 opacity-0">
          {toString(parse(tuning), { pad: 1 })
            .split("")
            .reverse()
            .map((note, index) => (
              <div key={index}>{note}</div>
            ))}
        </div>

        {subSectionData.data.map((column, index) => (
          <Fragment key={column[9]}>
            {column.includes("|") ? (
              <div className="baseFlex opacity-0">
                <PreviewTabMeasureLine
                  columnData={column}
                  tabSectionData={subSectionData}
                  baselineBpm={bpm}
                  columnIndex={index}
                />
              </div>
            ) : (
              <HighlightTabNoteColumn
                sectionIndex={sectionIndex}
                subSectionIndex={subSectionIndex}
                columnIndex={index}
                columnIsBeingPlayed={columnIsBeingPlayed(index)}
                columnHasBeenPlayed={columnHasBeenPlayed(index)}
                durationOfChord={getDurationOfCurrentChord()}
                highlightPaddingBottom={getPaddingBottom(
                  column[7]!,
                  column[8] === "1/8th" || column[8] === "1/16th",
                )}
              />
            )}
          </Fragment>
        ))}

        <div className="mb-[-1px] h-[168px] rounded-r-2xl border-2 border-pink-100 p-1 opacity-0"></div>
      </div>
    </div>
  );
}

export default HighlightTabColumnWrapper;

interface HighlightTabNoteColumn {
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;
  columnIsBeingPlayed: boolean;
  columnHasBeenPlayed: boolean;
  durationOfChord: number;
  highlightPaddingBottom: string;
}

function HighlightTabNoteColumn({
  sectionIndex,
  subSectionIndex,
  columnIndex,
  columnIsBeingPlayed,
  columnHasBeenPlayed,
  durationOfChord,
  highlightPaddingBottom,
}: HighlightTabNoteColumn) {
  const [highlightChord, setHighlightChord] = useState(false);
  const [heightOfActualColumn, setHeightOfActualColumn] = useState("0px");

  useEffect(() => {
    const actualColumnElement = document.getElementById(
      `section${sectionIndex}-subSection${subSectionIndex}-chord${columnIndex}`,
    );

    if (actualColumnElement) {
      setHeightOfActualColumn(`${actualColumnElement.offsetHeight}px`);
    }
  }, [sectionIndex, subSectionIndex, columnIndex]);

  // ideally don't need this and can just use prop values passed in, but need to have
  // [0] index special case since when looping it would keep the [0] index at 100% width
  // immediately, so we need this semi hacky solution
  useEffect(() => {
    if (columnIndex === 0) {
      if (columnIsBeingPlayed) {
        setHighlightChord(false);

        setTimeout(() => {
          setHighlightChord(true);
        }, 0);
      } else {
        setHighlightChord(false);
      }
    } else {
      setHighlightChord(columnIsBeingPlayed);
    }
  }, [columnIndex, columnIsBeingPlayed]);

  return (
    <div
      style={{
        minHeight: heightOfActualColumn,
        opacity: heightOfActualColumn === "0px" ? 0 : 1,
      }}
      className="baseVertFlex w-[35px] !justify-end"
    >
      <div className="baseFlex relative w-full">
        <div
          style={{
            transform:
              highlightChord || columnHasBeenPlayed ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "left center",
            transitionDuration: highlightChord ? `${durationOfChord}s` : "0s",
            msTransitionProperty: "transform",
            transitionTimingFunction: "linear",
            bottom: highlightPaddingBottom,
          }}
          className="absolute left-0 z-[-1] h-[168px] w-full bg-pink-700"
        ></div>
      </div>
    </div>
  );
}
