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
import { useTabStore } from "~/stores/TabStore";
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

interface TabNoteAndEffectCombo {
  noteColumnData: string[];
  effectColumnData: string[] | undefined;
  sectionIndex: number;
  noteColumnIndex: number;

  editingPalmMuteNodes: boolean;
  setEditingPalmMuteNodes: Dispatch<SetStateAction<boolean>>;
  lastModifiedPalmMuteNode: LastModifiedPalmMuteNodeLocation | null;
  setLastModifiedPalmMuteNode: Dispatch<
    SetStateAction<LastModifiedPalmMuteNodeLocation | null>
  >;
  reorderingColumns: boolean;
  showingDeleteColumnsButtons: boolean;
}

function TabNoteAndEffectCombo({
  noteColumnData,
  effectColumnData,
  sectionIndex,
  noteColumnIndex,

  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
  reorderingColumns,
  showingDeleteColumnsButtons,
}: TabNoteAndEffectCombo) {
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
    // hoping that noteColumnIndex is fine here. if you can drag across sections we will need to modify.
    useSortable({ id: `${noteColumnIndex}` });

  const { editing, tabData, setTabData } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
      setTabData: state.setTabData,
    }),
    shallow
  );

  function relativelyGetColumn(indexRelativeToCurrentCombo: number) {
    return (
      tabData[sectionIndex]?.data[
        noteColumnIndex + indexRelativeToCurrentCombo
      ] ?? []
    );
  }

  const deleteColumnButtonDisabled = useMemo(() => {
    let disabled = false;

    const currentSection = tabData[sectionIndex];

    if (currentSection === undefined) return true;

    if (currentSection?.data.length === 1) {
      disabled = true;
    }

    // if the current combo is the first/last "elem" in the section and there is a measure line right after/before
    // the combo -> disable
    if (
      (noteColumnIndex === 0 &&
        // +2 to account for the effect column
        currentSection.data[noteColumnIndex + 2]?.[8] === "measureLine") ||
      (noteColumnIndex === currentSection.data.length - 2 &&
        currentSection.data[noteColumnIndex - 1]?.[8] === "measureLine")
    ) {
      disabled = true;
    }

    // if the current combo is being flanked by two measure lines -> disable
    if (
      currentSection.data[noteColumnIndex - 1]?.[8] === "measureLine" &&
      currentSection.data[noteColumnIndex + 2]?.[8] === "measureLine"
    ) {
      disabled = true;
    }

    return disabled;
  }, [tabData, sectionIndex, noteColumnIndex]);

  function handleDeleteCombo() {
    const newTabData = [...tabData];

    newTabData[sectionIndex]?.data.splice(noteColumnIndex, 2);

    setTabData(newTabData);
  }

  return (
    <motion.div
      key={`tabSection${sectionIndex}tabColumn${noteColumnIndex}`}
      ref={setNodeRef}
      layoutId={`tabSection${sectionIndex}tabColumn${noteColumnIndex}`}
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
                : "drop-shadow(0px 5px 5px transparent)",
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
      {/* TODO: don't want to be repeating twice below, find way to combine */}
      <div className="baseFlex">
        <div
          style={{
            gap: editing ? "0.5rem" : "0",
          }}
          className="baseVertFlex mb-[3.2rem] mt-4"
        >
          {noteColumnData.map((note, index) => (
            <Fragment key={index}>
              {index === 0 && (
                <div className="baseFlex h-9 w-full">
                  <PalmMuteNode
                    note={note}
                    effectColumn={false}
                    columnIndex={noteColumnIndex}
                    sectionIndex={sectionIndex}
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
                    width: editing ? "auto" : "18px",
                  }}
                  className="baseFlex relative"
                >
                  <div
                    style={{
                      width: editing
                        ? relativelyGetColumn(-1)?.[8] === "measureLine"
                          ? "4px"
                          : "8px"
                        : // need to fix logic below
                        // relativelyGetColumn(-1)?.[8] === "measureLine" &&
                        //   (relativelyGetColumn(0)?.[index]?.length ?? 0) < 2
                        (relativelyGetColumn(0)?.[index]?.length ?? 0) > 1
                        ? "0px"
                        : "1px",

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
                    className="h-[1px] bg-pink-50/50 "
                  ></div>

                  <TabNote
                    note={note}
                    inlineEffect={false}
                    sectionIndex={sectionIndex}
                    columnIndex={noteColumnIndex}
                    noteIndex={index}
                  />

                  <div
                    style={{
                      width: editing
                        ? "8px"
                        : `${
                            (relativelyGetColumn(0)?.[index]?.length ?? 0) > 1
                              ? "0px"
                              : "1px"
                          }`,
                      opacity:
                        editing ||
                        relativelyGetColumn(1)[index] === "" ||
                        (relativelyGetColumn(2)[index] === "|" &&
                          relativelyGetColumn(2)[index] === "") ||
                        relativelyGetColumn(1)[index] === undefined
                          ? 1
                          : 0,
                    }}
                    className="h-[1px] bg-pink-50/50"
                  ></div>
                </div>
              )}

              {editing &&
                index === 7 &&
                !reorderingColumns &&
                !showingDeleteColumnsButtons && (
                  <div className="relative h-0 w-full">
                    <div className="absolute left-1/2 right-1/2 top-2 w-[3rem] -translate-x-1/2">
                      <TabNote
                        note={note}
                        inlineEffect={false}
                        sectionIndex={sectionIndex}
                        columnIndex={noteColumnIndex}
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
                    {tabData[sectionIndex]?.data[
                      noteColumnIndex
                    ]?.[7]?.includes("^") && (
                      <div className="relative top-1 rotate-180">v</div>
                    )}
                    {tabData[sectionIndex]?.data[
                      noteColumnIndex
                    ]?.[7]?.includes("v") && <div>v</div>}
                    {tabData[sectionIndex]?.data[
                      noteColumnIndex
                    ]?.[7]?.includes("s") && <div>s</div>}
                    {tabData[sectionIndex]?.data[
                      noteColumnIndex
                    ]?.[7]?.includes(">") && <div>{">"}</div>}
                    {tabData[sectionIndex]?.data[
                      noteColumnIndex
                    ]?.[7]?.includes(".") && (
                      <div className="relative bottom-2">.</div>
                    )}
                  </div>
                </div>
              )}
            </Fragment>
          ))}
        </div>

        <div
          style={{
            gap: editing ? "0.5rem" : "0",
          }}
          className="baseVertFlex mb-[3.2rem] mt-4"
        >
          {effectColumnData?.map((note, index) => (
            <Fragment key={index}>
              {index === 0 && (
                <div className="baseFlex h-9 w-full">
                  <PalmMuteNode
                    note={note}
                    effectColumn={true}
                    columnIndex={noteColumnIndex + 1}
                    sectionIndex={sectionIndex}
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

                    // this should prob be dynamic to go down to 11px if right next to measure line!
                    width: editing ? "auto" : "12px",
                  }}
                  className="baseFlex"
                >
                  {editing && (
                    <div className="h-[1px] w-1 bg-pink-50/50 "></div>
                  )}
                  <TabNote
                    note={note}
                    inlineEffect={true}
                    sectionIndex={sectionIndex}
                    columnIndex={noteColumnIndex + 1}
                    noteIndex={index}
                  />

                  {editing && (
                    <div
                      style={{
                        width: `${
                          editing
                            ? relativelyGetColumn(2)?.[8] === "measureLine"
                              ? "2px"
                              : "4px"
                            : relativelyGetColumn(2)?.[8] === "measureLine"
                            ? "1px"
                            : "2px"
                        }`,
                      }}
                      className="h-[1px] bg-pink-50/50"
                    ></div>
                  )}
                </div>
              )}

              {index === 7 &&
                !reorderingColumns &&
                !showingDeleteColumnsButtons && (
                  <div className="relative h-0 w-full"></div>
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

export default TabNoteAndEffectCombo;
