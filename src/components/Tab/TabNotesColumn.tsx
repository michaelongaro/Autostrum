import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import isEqual from "lodash.isequal";
import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  memo,
  type Dispatch,
  type SetStateAction,
} from "react";
import { IoClose } from "react-icons/io5";
import { RxDragHandleDots2 } from "react-icons/rx";
import { shallow } from "zustand/shallow";
import { useTabStore } from "~/stores/TabStore";
import { Button } from "../ui/button";
import PalmMuteNode from "./PalmMuteNode";
import TabNote from "./TabNote";
import type { LastModifiedPalmMuteNodeLocation } from "./TabSection";

interface TabNotesColumn {
  columnData: string[];
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;

  columnIsBeingPlayed: boolean;
  columnHasBeenPlayed: boolean;
  durationOfChord: number;

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

  columnIsBeingPlayed,
  columnHasBeenPlayed,
  durationOfChord,

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
    disabled: !reorderingColumns, // hopefully this is a performance improvement?
  });

  const { editing, chordPulse, setChordPulse, getTabData, setTabData } =
    useTabStore(
      (state) => ({
        editing: state.editing,
        chordPulse: state.chordPulse,
        setChordPulse: state.setChordPulse,
        getTabData: state.getTabData,
        setTabData: state.setTabData,
      }),
      shallow
    );

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

  function relativelyGetColumn(indexRelativeToCurrentCombo: number): string[] {
    return (columnData[columnIndex + indexRelativeToCurrentCombo] ??
      []) as string[];
  }

  function lineBeforeNoteOpacity(index: number): boolean {
    const colMinus1 = relativelyGetColumn(-1);
    const colMinus2 = relativelyGetColumn(-2);
    const col0 = relativelyGetColumn(0);

    return (
      editing ||
      colMinus1[index] === "" ||
      (colMinus1[index] === "|" &&
        (colMinus2[index] === "" || col0[index] === "")) ||
      colMinus1[index] === "~" ||
      colMinus1[index] === undefined
    );
  }

  function lineAfterNoteOpacity(index: number): boolean {
    const col0 = relativelyGetColumn(0);
    const col1 = relativelyGetColumn(1);
    const col2 = relativelyGetColumn(2);

    return (
      editing ||
      col1[index] === "" ||
      (col1[index] === "|" && (col2[index] === "" || col0[index] === "")) ||
      col1[index] === "~" ||
      col1[index] === undefined
    );
  }

  function deleteColumnButtonDisabled() {
    let disabled = false;

    const currentSection = getTabData()[sectionIndex]?.data[subSectionIndex];

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
  }

  function handleDeletePalmMutedChord() {
    const newTabData = getTabData();
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
    const newTabData = handleDeletePalmMutedChord();

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
      style={{
        transform: CSS.Transform.toString(
          transform && { ...transform, scaleY: 1, scaleX: 1 }
        ),
        transition,
        zIndex: isDragging ? 50 : "auto",
        height: editing ? "400px" : "271px",
      }}
      className="baseVertFlex cursor-default"
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

        <div
          onAnimationEnd={() => {
            setChordPulse(null);
          }}
          className={`absolute h-[270px] w-[95%] rounded-full bg-pink-300 opacity-0 ${
            isEqual(chordPulse?.location, {
              sectionIndex,
              subSectionIndex,
              chordIndex: columnIndex,
            })
              ? chordPulse!.type === "copy"
                ? "animate-copyChordPulse"
                : "animate-pasteChordPulse"
              : ""
          }
        } `}
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
                    paddingTop: `${index === 1 ? "7px" : "0"}`,
                    borderBottom: `${
                      index === 6 ? "2px solid rgb(253 242 248)" : "none"
                    }`,
                    paddingBottom: `${index === 6 ? "7px" : "0"}`,
                    width: editing ? "50px" : "35px",
                    transition: "width 0.15s ease-in-out",
                    // maybe also need "flex-basis: content" here if editing?
                  }}
                  className="baseFlex relative basis-[content]"
                >
                  <div
                    style={{
                      opacity: lineBeforeNoteOpacity(index) ? 1 : 0,
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
                      opacity: lineAfterNoteOpacity(index) ? 1 : 0,
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
                    {columnData.includes("^") && (
                      <div className="relative top-1 rotate-180">v</div>
                    )}
                    {columnData.includes("v") && <div>v</div>}
                    {columnData.includes("s") && <div>s</div>}
                    {columnData.includes(">") && <div>{">"}</div>}
                    {columnData.includes(".") && (
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
            disabled={deleteColumnButtonDisabled()}
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

export default memo(TabNotesColumn, (prevProps, nextProps) => {
  const {
    columnData: prevColumnData,
    lastModifiedPalmMuteNode: prevLastModifiedPMNode,
    ...restPrev
  } = prevProps;
  const {
    columnData: nextColumnData,
    lastModifiedPalmMuteNode: nextLastModifiedPMNode,
    ...restNext
  } = nextProps;

  // Custom comparison for getTabData() related prop + lastModifiedPalmMuteNode since their memory addresses
  // could change across renders, even if values are the same
  if (
    !isEqual(prevColumnData, nextColumnData) ||
    !isEqual(prevLastModifiedPMNode, nextLastModifiedPMNode)
  ) {
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
