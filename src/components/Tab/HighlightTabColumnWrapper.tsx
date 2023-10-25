import isEqual from "lodash.isequal";
import { Fragment, memo, useMemo, useState, useEffect } from "react";
import { shallow } from "zustand/shallow";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore, type TabSection } from "~/stores/TabStore";
import { parse, toString } from "~/utils/tunings";
import TabMeasureLine from "./TabMeasureLine";

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
    currentlyPlayingMetadata,
    currentChordIndex,
    playbackSpeed,
    audioMetadata,
  } = useTabStore(
    (state) => ({
      tuning: state.tuning,
      currentlyPlayingMetadata: state.currentlyPlayingMetadata,
      currentChordIndex: state.currentChordIndex,
      playbackSpeed: state.playbackSpeed,
      audioMetadata: state.audioMetadata,
    }),
    shallow
  );

  function columnIsBeingPlayed(columnIndex: number) {
    const location = currentlyPlayingMetadata?.[currentChordIndex]?.location;
    if (!currentlyPlayingMetadata || !location) return false;

    const isSameSection =
      location.sectionIndex === sectionIndex &&
      location.subSectionIndex === subSectionIndex;

    const columnIsBeingPlayed =
      isSameSection && location.chordIndex === columnIndex;

    return (
      columnIsBeingPlayed &&
      audioMetadata.playing &&
      audioMetadata.type === "Generated"
    );
  }

  function columnHasBeenPlayed(columnIndex: number) {
    const location = currentlyPlayingMetadata?.[currentChordIndex]?.location;
    if (!currentlyPlayingMetadata || !location) return false;

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

  return (
    <div
      style={{
        padding: aboveMediumViewportWidth ? "0 2rem" : "0 1rem",
      }}
      className="baseVertFlex absolute left-0 top-0 h-full !justify-start rounded-md"
    >
      <div className="baseFlex relative w-full !justify-start">
        <div className="baseVertFlex relative mb-[-1px] h-[168px] rounded-l-2xl border-2 border-pink-50 p-2 opacity-0">
          {toString(parse(tuning), { pad: 1 })
            .split(" ")
            .reverse()
            .map((note, index) => (
              <div key={index}>{note}</div>
            ))}
        </div>

        {subSectionData.data.map((column, index) => (
          <Fragment key={column[9]}>
            {column.includes("|") ? (
              <div className="baseFlex opacity-0">
                <TabMeasureLine
                  columnData={column}
                  sectionIndex={sectionIndex}
                  subSectionIndex={subSectionIndex}
                  columnIndex={index}
                  reorderingColumns={false}
                  showingDeleteColumnsButtons={false}
                />
              </div>
            ) : (
              <HighlightTabNoteColumn
                columnIndex={index}
                columnIsBeingPlayed={columnIsBeingPlayed(index)}
                columnHasBeenPlayed={columnHasBeenPlayed(index)}
                durationOfChord={getDurationOfCurrentChord()}
              />
            )}
          </Fragment>
        ))}

        <div className="mb-[-1px] h-[168px] rounded-r-2xl border-2 border-pink-50 p-1 opacity-0"></div>
      </div>
    </div>
  );
}

export default memo(HighlightTabColumnWrapper, (prevProps, nextProps) => {
  const { subSectionData: prevSubSectionData, ...restPrev } = prevProps;
  const { subSectionData: nextSubSectionDataData, ...restNext } = nextProps;

  // Custom comparison for getTabData() related prop
  if (!isEqual(prevSubSectionData, nextSubSectionDataData)) {
    return false; // props are not equal, so component should re-render
  }

  // Default shallow comparison for other props using Object.is()
  const allKeys = new Set([...Object.keys(restPrev), ...Object.keys(restNext)]);
  for (const key of allKeys) {
    // @ts-expect-error we know that these keys are in the objects
    if (!Object.is(restPrev[key], restNext[key])) {
      return false; // props are not equal, so component should re-render
    }
  }

  return true;
});

interface HighlightTabNoteColumn {
  columnIndex: number;
  columnIsBeingPlayed: boolean;
  columnHasBeenPlayed: boolean;
  durationOfChord: number;
}

function HighlightTabNoteColumn({
  columnIndex,
  columnIsBeingPlayed,
  columnHasBeenPlayed,
  durationOfChord,
}: HighlightTabNoteColumn) {
  const [highlightChord, setHighlightChord] = useState(false);

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
    <div className="baseVertFlex h-[271px] w-[35px] cursor-default">
      <div className="baseFlex relative h-full w-full">
        <div
          style={{
            width: highlightChord || columnHasBeenPlayed ? "100%" : "0%",
            transitionDuration: highlightChord ? `${durationOfChord}s` : "0s",
            msTransitionProperty: "width",
            transitionTimingFunction: "linear",
          }}
          className="absolute left-0 top-1/2 z-[-1] h-[164px] w-0 -translate-y-1/2 bg-pink-600"
        ></div>
      </div>
    </div>
  );
}
