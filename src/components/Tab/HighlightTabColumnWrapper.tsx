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
    editing,
    currentlyPlayingMetadata,
    currentChordIndex,
    playbackSpeed,
    audioMetadata,
  } = useTabStore(
    (state) => ({
      tuning: state.tuning,
      editing: state.editing,
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

  function getDurationOfChord(columnIndex: number) {
    const location = currentlyPlayingMetadata?.[columnIndex]?.location;
    if (!currentlyPlayingMetadata || !location) return 0;

    const { bpm, noteLengthMultiplier } =
      currentlyPlayingMetadata[columnIndex]!;

    return 60 / ((bpm / Number(noteLengthMultiplier)) * playbackSpeed);
  }

  const sectionPadding = useMemo(() => {
    let padding = "0 1rem";

    if (aboveMediumViewportWidth) {
      if (editing) {
        padding = "2rem";
      } else {
        padding = "0 2rem";
      }
    } else {
      if (editing) {
        padding = "1rem 0.5rem 1rem 0.5rem";
      } else {
        padding = "0 1rem";
      }
    }

    return padding;
  }, [editing, aboveMediumViewportWidth]);

  console.log("rerendering");

  return (
    <div
      style={{
        gap: editing ? "1rem" : "0",
        padding: sectionPadding,
        width: editing ? "100%" : "auto",
        borderTopLeftRadius:
          !editing && subSectionData.repetitions > 1 ? 0 : "0.375rem",
      }}
      className="baseVertFlex absolute left-0 top-0 h-full !justify-start rounded-md"
    >
      <div className="baseFlex relative w-full !justify-start">
        <div
          style={{
            height: editing ? "280px" : "168px",
            gap: editing ? "1.35rem" : "0",
            marginBottom: editing ? "0" : "-1px",
          }}
          className="baseVertFlex relative rounded-l-2xl border-2 border-pink-50 p-2 opacity-0"
        >
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
                editing={editing}
                columnIndex={index}
                columnIsBeingPlayed={columnIsBeingPlayed(index)}
                columnHasBeenPlayed={columnHasBeenPlayed(index)}
                durationOfChord={getDurationOfChord(index)}
                reorderingColumns={false}
                showingDeleteColumnsButtons={false}
              />
            )}
          </Fragment>
        ))}

        <div
          style={{
            height: editing ? "280px" : "168px",
            marginBottom: editing ? "0" : "-1px",
          }}
          className="rounded-r-2xl border-2 border-pink-50 p-1 opacity-0"
        ></div>
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
  editing: boolean;
  columnIndex: number;

  columnIsBeingPlayed: boolean;
  columnHasBeenPlayed: boolean;
  durationOfChord: number;

  reorderingColumns: boolean;
  showingDeleteColumnsButtons: boolean;
}

function HighlightTabNoteColumn({
  editing,
  columnIndex,

  columnIsBeingPlayed,
  columnHasBeenPlayed,
  durationOfChord,

  reorderingColumns,
  showingDeleteColumnsButtons,
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
    <div
      style={{
        height: editing ? "400px" : "271px",
      }}
      className="baseVertFlex w-[35px] cursor-default"
    >
      <div className="baseFlex relative">
        <div
          style={{
            marginTop:
              reorderingColumns || showingDeleteColumnsButtons ? "4px" : "0",
            height: editing ? "276px" : "164px",
            width: highlightChord || columnHasBeenPlayed ? "100%" : "0%",
            transitionDuration: highlightChord ? `${durationOfChord}s` : "0s",
            msTransitionProperty: "width",
            transitionTimingFunction: "linear",
          }}
          className="absolute left-0 top-1/2 w-0 -translate-y-1/2 bg-pink-600"
        ></div>
      </div>
    </div>
  );
}
