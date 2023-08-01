import {
  useState,
  Fragment,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { LastModifiedPalmMuteNodeLocation } from "./TabSection";
import TabNote from "./TabNote";
import PalmMuteNode from "./PalmMuteNode";
import {
  useTabStore,
  type TabSection as TabSectionType,
  type ChordSection as ChordSectionType,
} from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { useSortable } from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { RxDragHandleDots2 } from "react-icons/rx";

const sectionVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
  },
  closed: {
    opacity: 0,
    scale: 0,
  },
};

const initialStyles = {
  x: 0,
  y: 0,
  scale: 1,
  opacity: 1,
  filter: "drop-shadow(0px 5px 5px transparent)",
};

interface TabNotesColumn {
  columnData: string[];
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;

  editingPalmMuteNodes: boolean;
  setEditingPalmMuteNodes: Dispatch<SetStateAction<boolean>>;
  lastModifiedPalmMuteNode: LastModifiedPalmMuteNodeLocation | null;
  setLastModifiedPalmMuteNode: Dispatch<
    SetStateAction<LastModifiedPalmMuteNodeLocation | null>
  >;
  reorderingColumns: boolean;
  showingDeleteColumnsButtons: boolean;
}

function TabNotesColumn({
  columnData,
  sectionIndex,
  subSectionIndex,
  columnIndex,

  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
  reorderingColumns,
  showingDeleteColumnsButtons,
}: TabNotesColumn) {
  const [hoveringOnHandle, setHoveringOnHandle] = useState(false);
  const [grabbingHandle, setGrabbingHandle] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } =
    // hoping that columnIndex is fine here. if you can drag across sections we will need to modify.
    useSortable({ id: `${columnIndex}` });

  const {
    editing,
    tabData,
    setTabData,
    currentlyPlayingMetadata,
    currentChordIndex,
    playbackSpeed,
    audioMetadata,
  } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
      setTabData: state.setTabData,
      currentlyPlayingMetadata: state.currentlyPlayingMetadata,
      currentChordIndex: state.currentChordIndex,
      playbackSpeed: state.playbackSpeed,
      audioMetadata: state.audioMetadata,
    }),
    shallow
  );

  function relativelyGetColumn(indexRelativeToCurrentCombo: number): string[] {
    return (tabData[sectionIndex]?.data[subSectionIndex]?.data[
      columnIndex + indexRelativeToCurrentCombo
    ] ?? []) as string[];
  }

  const deleteColumnButtonDisabled = useMemo(() => {
    let disabled = false;

    const currentSection = tabData[sectionIndex]?.data[subSectionIndex];

    if (currentSection === undefined) return true;

    if (currentSection?.data.length === 1) {
      disabled = true;
    }

    // if the current chord is the first/last "elem" in the section and there is a measure line
    // right after/before -> disable
    if (
      (columnIndex === 0 &&
        currentSection.data[columnIndex + 1]?.[8] === "measureLine") ||
      (columnIndex === currentSection.data.length - 2 &&
        currentSection.data[columnIndex - 1]?.[8] === "measureLine")
    ) {
      disabled = true;
    }

    // if the current chord is being flanked by two measure lines -> disable
    if (
      currentSection.data[columnIndex - 1]?.[8] === "measureLine" &&
      currentSection.data[columnIndex + 1]?.[8] === "measureLine"
    ) {
      disabled = true;
    }

    return disabled;
  }, [tabData, sectionIndex, subSectionIndex, columnIndex]);

  const columnIsBeingPlayed = useMemo(() => {
    if (currentlyPlayingMetadata === null) return false;

    // TOOD: clean up this logic later

    if (
      currentlyPlayingMetadata[currentChordIndex]?.location.sectionIndex !==
        sectionIndex ||
      currentlyPlayingMetadata[currentChordIndex]?.location.subSectionIndex !==
        subSectionIndex ||
      currentlyPlayingMetadata[currentChordIndex]?.location.chordIndex !==
        columnIndex
    ) {
      return false;
    }

    return true;
  }, [
    currentlyPlayingMetadata,
    currentChordIndex,
    sectionIndex,
    subSectionIndex,
    columnIndex,
  ]);

  const columnHasBeenPlayed = useMemo(() => {
    if (currentlyPlayingMetadata === null) return false;

    // TOOD: alright this was copilot generated, actually walk through what really needs to be
    // happening here, still think it's worthwhile to split up into above and this function.

    if (
      currentlyPlayingMetadata[currentChordIndex]?.location.sectionIndex !==
        sectionIndex ||
      currentlyPlayingMetadata[currentChordIndex]?.location.subSectionIndex !==
        subSectionIndex ||
      // TODO: wait shouldn't below only substitute for -1 if the val is undefined? because this will
      // trigger if it is 0 btw
      (currentlyPlayingMetadata[currentChordIndex]?.location.chordIndex ?? -1) <
        columnIndex
    ) {
      return false;
    }

    return true;
  }, [
    currentlyPlayingMetadata,
    currentChordIndex,
    sectionIndex,
    subSectionIndex,
    columnIndex,
  ]);

  const durationOfCurrentChord = useMemo(() => {
    if (currentlyPlayingMetadata === null) return 0;

    const bpm = currentlyPlayingMetadata[currentChordIndex]?.bpm;
    const noteLengthMultiplier =
      currentlyPlayingMetadata[currentChordIndex]?.noteLengthMultiplier;

    if (bpm === undefined || noteLengthMultiplier === undefined) return 0;

    return 60 / ((bpm / Number(noteLengthMultiplier)) * playbackSpeed);
  }, [currentlyPlayingMetadata, currentChordIndex, playbackSpeed]);

  function handleDeleteCombo() {
    const newTabData = [...tabData];

    newTabData[sectionIndex]?.data[subSectionIndex]?.data.splice(
      columnIndex,
      2
    );

    setTabData(newTabData);
  }

  return (
    <motion.div
      key={`tabSection${sectionIndex}subSection${subSectionIndex}tabColumn${columnIndex}`}
      ref={setNodeRef}
      layoutId={`tabSection${sectionIndex}subSection${subSectionIndex}tabColumn${columnIndex}`}
      style={initialStyles}
      initial="closed"
      animate={
        transform
          ? {
              x: transform.x,
              y: transform.y,
              opacity: 1,
              scale: isDragging ? 1.05 : 1,
              zIndex: isDragging ? 1 : 0,
              filter: isDragging
                ? "drop-shadow(0px 5px 5px rgba(0, 0, 0, 0.25)"
                : "drop-shadow(0px 5px 5px transparent)", // maybe try "none" if it allows for better performance
            }
          : initialStyles
      }
      exit="closed"
      transition={{
        duration: !isDragging ? 0.25 : 0,
        easings: {
          type: "spring",
        },
        x: {
          duration: !isDragging ? 0.3 : 0,
        },
        y: {
          duration: !isDragging ? 0.3 : 0,
        },
        scale: {
          duration: 0.25,
        },
        zIndex: {
          delay: isDragging ? 0 : 0.25,
        },
      }}
      variants={sectionVariants}
      className="baseVertFlex cursor-default"
    >
      <div className="baseFlex relative">
        <div
          style={{
            height: editing ? "280px" : "164px",
            width:
              audioMetadata.type === "Generated" &&
              audioMetadata.playing &&
              (columnIsBeingPlayed || columnHasBeenPlayed)
                ? "100%"
                : "0%",
            transitionDuration:
              audioMetadata.type === "Generated" &&
              audioMetadata.playing &&
              columnIsBeingPlayed
                ? `${durationOfCurrentChord}s`
                : "0s",
            msTransitionProperty: "width",
            transitionTimingFunction: "linear",
          }}
          className="absolute left-0 top-1/2 w-0 -translate-y-1/2 bg-pink-600"
        ></div>

        <div
          style={{
            gap: editing ? "0.5rem" : "0",
          }}
          className="baseVertFlex mb-[3.2rem] mt-4"
        >
          {columnData.map((note, index) => (
            <Fragment key={index}>
              {index === 0 && (
                <div className="baseFlex h-9 w-full">
                  <PalmMuteNode
                    value={note}
                    columnIndex={columnIndex}
                    sectionIndex={sectionIndex}
                    subSectionIndex={subSectionIndex}
                    editingPalmMuteNodes={editingPalmMuteNodes}
                    setEditingPalmMuteNodes={setEditingPalmMuteNodes}
                    lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                    setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
                  />
                </div>
              )}

              {index > 0 && index < 7 && (
                <div
                  style={{
                    borderTop: `${
                      index === 1 ? "2px solid rgb(253 242 248)" : "none"
                    }`,
                    paddingTop: `${index === 1 ? "0.45rem" : "0rem"}`,
                    borderBottom: `${
                      index === 6 ? "2px solid rgb(253 242 248)" : "none"
                    }`,
                    paddingBottom: `${index === 6 ? "0.45rem" : "0rem"}`,

                    // might need to refine these widths/values a bit if the sound playing overlay isn't
                    // as smooth/seamless as we want it to be.
                    width: editing ? "60px" : "35px",

                    // maybe also need "flex-basis: content" here if editing?
                  }}
                  className="baseFlex relative basis-[content]"
                >
                  <div
                    style={{
                      // width: editing
                      //   ? relativelyGetColumn(-1)?.[8] === "measureLine"
                      //     ? "4px"
                      //     : "8px"
                      //   : // need to fix logic below
                      //   // relativelyGetColumn(-1)?.[8] === "measureLine" &&
                      //   //   (relativelyGetColumn(0)?.[index]?.length ?? 0) < 2
                      //   (relativelyGetColumn(0)?.[index]?.length ?? 0) > 1
                      //   ? "0px"
                      //   : "1px",

                      opacity:
                        editing ||
                        relativelyGetColumn(-1)[index] === "" ||
                        (relativelyGetColumn(-1)[index] === "|" &&
                          (relativelyGetColumn(-2)[index] === "" ||
                            relativelyGetColumn(0)[index] === "")) ||
                        relativelyGetColumn(-1)[index] === "~" ||
                        relativelyGetColumn(-1)[index] === undefined
                          ? 1
                          : 0,
                    }}
                    className="h-[1px] flex-[1] bg-pink-50/50"
                  ></div>

                  <TabNote
                    note={note}
                    sectionIndex={sectionIndex}
                    subSectionIndex={subSectionIndex}
                    columnIndex={columnIndex}
                    noteIndex={index}
                  />

                  <div
                    style={{
                      // width: editing
                      //   ? "8px"
                      //   : `${
                      //       (relativelyGetColumn(0)?.[index]?.length ?? 0) > 1
                      //         ? "0px"
                      //         : "1px"
                      //     }`,
                      opacity:
                        editing ||
                        relativelyGetColumn(1)[index] === "" ||
                        (relativelyGetColumn(2)[index] === "|" &&
                          relativelyGetColumn(2)[index] === "") ||
                        relativelyGetColumn(1)[index] === undefined
                          ? 1
                          : 0,
                    }}
                    className="h-[1px] flex-[1] bg-pink-50/50"
                  ></div>
                </div>
              )}

              {editing &&
                index === 7 &&
                !reorderingColumns &&
                !showingDeleteColumnsButtons && (
                  <div className="relative h-0 w-full">
                    <div className="absolute left-1/2 right-1/2 top-2 w-[1.75rem] -translate-x-1/2">
                      <TabNote
                        note={note}
                        sectionIndex={sectionIndex}
                        subSectionIndex={subSectionIndex}
                        columnIndex={columnIndex}
                        noteIndex={index}
                      />
                    </div>
                  </div>
                )}

              {!editing && index === 7 && (
                <div className="relative h-0 w-full">
                  <div
                    style={{
                      top: editing ? "0.5rem" : "0.25rem",
                      lineHeight: editing ? "24px" : "16px",
                    }}
                    className="baseVertFlex absolute left-1/2 right-1/2 top-2 w-[1.5rem] -translate-x-1/2"
                  >
                    {tabData[sectionIndex]?.data[subSectionIndex]?.data[
                      columnIndex
                    ]?.[7]?.includes("^") && (
                      <div className="relative top-1 rotate-180">v</div>
                    )}
                    {tabData[sectionIndex]?.data[subSectionIndex]?.data[
                      columnIndex
                    ]?.[7]?.includes("v") && <div>v</div>}
                    {tabData[sectionIndex]?.data[subSectionIndex]?.data[
                      columnIndex
                    ]?.[7]?.includes("s") && <div>s</div>}
                    {tabData[sectionIndex]?.data[subSectionIndex]?.data[
                      columnIndex
                    ]?.[7]?.includes(">") && <div>{">"}</div>}
                    {tabData[sectionIndex]?.data[subSectionIndex]?.data[
                      columnIndex
                    ]?.[7]?.includes(".") && (
                      <div className="relative bottom-2">.</div>
                    )}
                  </div>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>

      {/* drag handle / delete button */}
      {reorderingColumns && (
        <div className="relative h-2 w-full">
          <div
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="hover:box-shadow-md absolute bottom-4 left-1/2 right-1/2 w-[1.5rem] -translate-x-1/2 cursor-grab rounded-md text-pink-50 active:cursor-grabbing"
            onMouseEnter={() => setHoveringOnHandle(true)}
            onMouseDown={() => setGrabbingHandle(true)}
            onMouseLeave={() => setHoveringOnHandle(false)}
            onMouseUp={() => setGrabbingHandle(false)}
          >
            <RxDragHandleDots2 className="h-8 w-6" />
            <div
              style={{
                opacity: hoveringOnHandle ? (grabbingHandle ? 0.5 : 1) : 0,
              }}
              className="absolute bottom-0 left-1/2 right-1/2 h-8 -translate-x-1/2 rounded-md bg-pink-200/30 p-4 transition-all"
            ></div>
          </div>
        </div>
      )}

      {showingDeleteColumnsButtons && (
        <div className="relative h-2 w-full">
          <Button
            variant={"destructive"}
            size="sm"
            disabled={deleteColumnButtonDisabled}
            className="absolute bottom-4 left-1/2 right-1/2 h-[1.75rem] w-[1.75rem] -translate-x-1/2"
            onClick={handleDeleteCombo}
          >
            x
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default TabNotesColumn;
