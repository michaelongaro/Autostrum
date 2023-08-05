import { useState, Fragment } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { motion } from "framer-motion";
import { type TabColumn } from "./TabColumn";
import { useSortable } from "@dnd-kit/sortable";
import { RxDragHandleDots2 } from "react-icons/rx";
import { IoClose } from "react-icons/io5";
import { Button } from "../ui/button";

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

function TabMeasureLine({
  columnData,
  sectionIndex,
  subSectionIndex,
  columnIndex,
  reorderingColumns,
  showingDeleteColumnsButtons,
}: Omit<
  TabColumn,
  | "sectionId"
  | "editingPalmMuteNodes"
  | "setEditingPalmMuteNodes"
  | "lastModifiedPalmMuteNode"
  | "setLastModifiedPalmMuteNode"
>) {
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
  } = useSortable({ id: columnData[9]! });

  const { editing, tabData, setTabData } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
      setTabData: state.setTabData,
    }),
    shallow
  );

  function handleDeleteMeasureLine() {
    const newTabData = [...tabData];

    newTabData[sectionIndex]?.data[subSectionIndex]?.data.splice(
      columnIndex,
      1
    );

    setTabData(newTabData);
  }

  return (
    <motion.div
      key={columnData[9]}
      ref={setNodeRef}
      // layoutId={columnData[9]}
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
      className="baseVertFlex relative mb-[3.2rem] mt-4"
    >
      {columnData.map((note, index) => (
        <Fragment key={index}>
          {index === 0 && (
            <div className="baseFlex mb-0 h-9 w-full">
              {note === "-" && (
                <div
                  style={{
                    // relative positioning here is a hack, not sure completely why tweaking margins
                    // wasn't working
                    top: editing ? "-0.45rem" : "0",
                  }}
                  className="relative top-[-0.45rem] h-[1px] w-full bg-pink-50"
                ></div>
              )}
            </div>
          )}

          {index > 0 && index < 7 && (
            <div
              style={{
                borderTop: `${
                  index === 1 ? "2px solid rgb(253 242 248)" : "none"
                }`,
                height: `${
                  editing
                    ? index === 1 || index === 6
                      ? "46px"
                      : "48px"
                    : index === 1 || index === 6
                    ? "26px"
                    : "29px"
                }`,
                borderBottom: `${
                  index === 6 ? "2px solid rgb(253 242 248)" : "none"
                }`,
              }}
              className="w-[2px] bg-pink-50"
            ></div>
          )}

          {index === 8 && reorderingColumns && (
            <div
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              className="hover:box-shadow-md absolute bottom-[-2.7rem] cursor-grab rounded-md text-pink-50 active:cursor-grabbing"
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
          )}

          {index === 8 && showingDeleteColumnsButtons && (
            <Button
              variant={"destructive"}
              size="sm"
              className="absolute bottom-[-2.7rem] left-1/2 right-1/2 h-[1.75rem] w-[1.75rem] -translate-x-1/2 p-1"
              onClick={handleDeleteMeasureLine}
            >
              <IoClose className="h-6 w-6" />
            </Button>
          )}
        </Fragment>
      ))}
    </motion.div>
  );
}

export default TabMeasureLine;
