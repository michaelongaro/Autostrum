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
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } =
    // hoping that noteColumnIndex is fine here. if you can drag across sections we will need to modify.
    useSortable({ id: `${noteColumnIndex}`, disabled: true });

  const { editing, tabData, setTabData } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
      setTabData: state.setTabData,
    }),
    shallow
  );

  return (
    <motion.div
      key={`tabColumn${noteColumnIndex}`}
      ref={setNodeRef}
      layoutId={`tabColumn${noteColumnIndex}`}
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
              boxShadow: isDragging
                ? "0 0 0 1px rgba(63, 63, 68, 0.05), 0px 15px 15px 0 rgba(34, 33, 81, 0.25)"
                : undefined,
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
      {...attributes}
      {...listeners}
      className="baseFlex cursor-default"
    >
      {/* TODO: don't want to be repeating twice below, find way to combine */}
      <div className="baseVertFlex mb-[3.2rem] mt-4 gap-2">
        {noteColumnData.map((note, index) => (
          <Fragment key={index}>
            {index === 0 && (
              <div className="baseFlex h-9 w-full">
                <PalmMuteNode
                  note={note}
                  effectColumn={false}
                  columnIndex={noteColumnIndex}
                  sectionIndex={sectionIndex}
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
                }}
                className="baseFlex"
              >
                <div
                  style={{
                    width: `${
                      tabData[sectionIndex]?.data[noteColumnIndex - 1]?.[8] ===
                      "measureLine"
                        ? "1.25rem"
                        : "8px"
                    }`,
                  }}
                  className="h-[1px] bg-pink-50 "
                ></div>
                <TabNote
                  note={note}
                  inlineEffect={false}
                  sectionIndex={sectionIndex}
                  columnIndex={noteColumnIndex}
                  noteIndex={index}
                />
                <div className="h-[1px] w-2 bg-pink-50"></div>
              </div>
            )}

            {index === 7 && (
              <div className="relative h-0 w-full">
                <div
                  style={{
                    left: `${
                      tabData[sectionIndex]?.data[noteColumnIndex - 1]?.[8] ===
                      "measureLine"
                        ? "60%"
                        : "50%"
                    }`,
                  }}
                  className="absolute left-1/2 right-1/2 top-2 w-[3rem] -translate-x-1/2"
                >
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
          </Fragment>
        ))}
      </div>

      <div className="baseVertFlex mb-[3.2rem] mt-4 gap-2">
        {effectColumnData?.map((note, index) => (
          <Fragment key={index}>
            {index === 0 && (
              <div className="baseFlex h-9 w-full">
                <PalmMuteNode
                  note={note}
                  effectColumn={true}
                  columnIndex={noteColumnIndex + 1}
                  sectionIndex={sectionIndex}
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
                }}
                className="baseFlex"
              >
                <div className="h-[1px] w-2 bg-pink-50 "></div>
                <TabNote
                  note={note}
                  inlineEffect={true}
                  sectionIndex={sectionIndex}
                  columnIndex={noteColumnIndex + 1}
                  noteIndex={index}
                />
                <div
                  style={{
                    width: `${
                      tabData[sectionIndex]?.data[noteColumnIndex + 2]?.[8] ===
                      "measureLine"
                        ? "1.25rem"
                        : "8px"
                    }`,
                  }}
                  className="h-[1px] w-2 bg-pink-50"
                ></div>
              </div>
            )}

            {index === 7 && (
              <div className="relative h-0 w-full">
                {/* not sure if necessary, currently used just for positional purposes */}
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </motion.div>
  );
}

export default TabNoteAndEffectCombo;
