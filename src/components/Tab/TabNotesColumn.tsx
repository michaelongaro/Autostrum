import {
  useState,
  useEffect,
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
  type Section,
} from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { useSortable } from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { IoClose } from "react-icons/io5";
import { RxDragHandleDots2 } from "react-icons/rx";

const initialStyles = {
  x: 0,
  y: 0,
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
  const [highlightChord, setHighlightChord] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: columnData[9]!,
  });

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
      (columnIndex === currentSection.data.length - 1 &&
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

    if (
      currentlyPlayingMetadata[currentChordIndex]?.location.sectionIndex ===
        sectionIndex &&
      currentlyPlayingMetadata[currentChordIndex]?.location.subSectionIndex ===
        subSectionIndex
    ) {
      if (
        // edge case to show the last chord as played when the song is paused and
        // the audio controls progress bar is all the way completed. Won't work normally
        // since the columnIndex has to be greater than the last chord index
        !audioMetadata.playing &&
        currentChordIndex === currentlyPlayingMetadata.length
      ) {
        return true;
      } else if (
        currentlyPlayingMetadata[currentChordIndex]?.location.chordIndex! >
        columnIndex
      ) {
        return true;
      }
    }

    return false;
  }, [
    audioMetadata,
    currentlyPlayingMetadata,
    currentChordIndex,
    sectionIndex,
    subSectionIndex,
    columnIndex,
  ]);

  useEffect(() => {
    if (
      !columnIsBeingPlayed ||
      !audioMetadata.playing ||
      audioMetadata.type !== "Generated"
    ) {
      setHighlightChord(false);
    } else if (
      columnIndex === 0 &&
      columnIsBeingPlayed &&
      audioMetadata.playing &&
      audioMetadata.type === "Generated"
    ) {
      setHighlightChord(false);

      setTimeout(() => {
        setHighlightChord(true);
      }, 0);
    } else if (
      columnIndex !== 0 &&
      columnIsBeingPlayed &&
      audioMetadata.playing &&
      audioMetadata.type === "Generated"
    ) {
      setHighlightChord(true);
    }
  }, [
    columnIsBeingPlayed,
    columnIndex,
    audioMetadata.type,
    audioMetadata.playing,
  ]);

  const durationOfCurrentChord = useMemo(() => {
    if (currentlyPlayingMetadata === null) return 0;

    const bpm = currentlyPlayingMetadata[currentChordIndex]?.bpm;
    const noteLengthMultiplier =
      currentlyPlayingMetadata[currentChordIndex]?.noteLengthMultiplier;

    if (bpm === undefined || noteLengthMultiplier === undefined) return 0;

    return 60 / ((bpm / Number(noteLengthMultiplier)) * playbackSpeed);
  }, [currentlyPlayingMetadata, currentChordIndex, playbackSpeed]);

  function handleDeletePalmMutedChord(tabData: Section[]) {
    const newTabData = [...tabData];
    const currentPalmMuteNodeValue =
      newTabData[sectionIndex]?.data[subSectionIndex]?.data[columnIndex]?.[0];
    const currentTabSectionLength =
      newTabData[sectionIndex]?.data[subSectionIndex]?.data.length ?? 0;

    if (currentPalmMuteNodeValue === "start") {
      let index = 0;
      while (index < currentTabSectionLength) {
        if (
          newTabData[sectionIndex]?.data[subSectionIndex]?.data[index]?.[0] ===
          "end"
        ) {
          newTabData[sectionIndex].data[subSectionIndex].data[index][0] = "";
          break;
        }

        newTabData[sectionIndex].data[subSectionIndex].data[index][0] = "";

        index++;
      }
    } else if (currentPalmMuteNodeValue === "end") {
      let index = currentTabSectionLength - 1;
      while (index >= 0) {
        if (
          newTabData[sectionIndex]?.data[subSectionIndex]?.data[index]?.[0] ===
          "start"
        ) {
          newTabData[sectionIndex].data[subSectionIndex].data[index][0] = "";
          break;
        }

        newTabData[sectionIndex].data[subSectionIndex].data[index][0] = "";

        index--;
      }
    }

    return newTabData;
  }

  function handleDeleteChord() {
    const newTabData = handleDeletePalmMutedChord(tabData);

    newTabData[sectionIndex]?.data[subSectionIndex]?.data.splice(
      columnIndex,
      1
    );

    setTabData(newTabData);
  }

  return (
    <motion.div
      key={columnData[9]}
      id={`section${sectionIndex}-subSection${subSectionIndex}-chord${columnIndex}`}
      ref={setNodeRef}
      // layout={"position"}
      style={initialStyles}
      animate={
        transform
          ? {
              x: transform.x,
              y: transform.y,
              zIndex: isDragging ? 1 : 0,
            }
          : initialStyles
      }
      transition={{
        duration: !isDragging ? 0.15 : 0,
        easings: {
          type: "spring",
        },
        x: {
          duration: !isDragging ? 0.3 : 0,
        },
        y: {
          duration: !isDragging ? 0.3 : 0,
        },
        zIndex: {
          delay: isDragging ? 0 : 0.25,
        },
      }}
      className="baseVertFlex cursor-default scroll-m-8"
    >
      <div className="baseFlex relative">
        <div
          style={{
            height: editing ? "280px" : "164px",
            width: highlightChord || columnHasBeenPlayed ? "100%" : "0%",
            transitionDuration: highlightChord
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
            className={`hover:box-shadow-md absolute bottom-4 left-1/2 right-1/2 w-[1.5rem] -translate-x-1/2 cursor-grab rounded-md text-pink-50 ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            onMouseEnter={() => setHoveringOnHandle(true)}
            onMouseDown={() => setGrabbingHandle(true)}
            onMouseLeave={() => {
              setGrabbingHandle(false);
              setHoveringOnHandle(false);
            }}
            onMouseUp={() => {
              setGrabbingHandle(false);
              setHoveringOnHandle(false);
            }}
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
            className="absolute bottom-4 left-1/2 right-1/2 h-[1.75rem] w-[1.75rem] -translate-x-1/2 p-1"
            onClick={handleDeleteChord}
          >
            <IoClose className="h-6 w-6" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default TabNotesColumn;
