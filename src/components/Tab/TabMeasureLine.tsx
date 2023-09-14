import { useState, Fragment } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { motion } from "framer-motion";
import { type TabColumn } from "./TabColumn";
import { useSortable } from "@dnd-kit/sortable";
import { RxDragHandleDots2 } from "react-icons/rx";
import { IoClose } from "react-icons/io5";
import { Button } from "../ui/button";
import { CSS } from "@dnd-kit/utilities";
import { BsMusicNote } from "react-icons/bs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Input } from "../ui/input";

const sectionVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
  },
  closed: {
    opacity: 1,
    scale: 1,
  },
};

const initialStyles = {
  x: 0,
  y: 0,
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

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newBpm = e.target.value.length === 0 ? -1 : parseInt(e.target.value);
    if (isNaN(newBpm) || newBpm > 400) return;

    const newTabData = [...tabData];

    newTabData[sectionIndex]!.data[subSectionIndex]!.data[
      columnIndex
    ][7] = `${newBpm}`;

    setTabData(newTabData);
  }

  return (
    <motion.div
      key={columnData[9]}
      ref={setNodeRef}
      // layoutId={columnData[9]}
      style={{
        transform: CSS.Transform.toString(
          transform && { ...transform, scaleY: 1, scaleX: 1 }
        ),
        transition,
      }}
      className="baseVertFlex relative mb-[3.2rem] mt-4"
    >
      {columnData.map((note, index) => (
        <Fragment key={index}>
          {index === 0 && (
            <>
              {!editing &&
                tabData[sectionIndex]!.data[subSectionIndex]!.data[
                  columnIndex
                ][7] &&
                tabData[sectionIndex]!.data[subSectionIndex]!.data[
                  columnIndex
                ][7] !== -1 && (
                  <div
                    className={`baseFlex absolute !flex-nowrap gap-[0.125rem] text-pink-50 ${
                      note === "-" ? "-top-2" : "top-2"
                    }`}
                  >
                    <BsMusicNote className="h-4 w-4" />
                    <p className="text-center text-xs">
                      {tabData[sectionIndex]!.data[subSectionIndex]!.data[
                        columnIndex
                      ][7].toString()}
                    </p>
                  </div>
                )}

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
            </>
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

          {index === 8 &&
            editing &&
            !reorderingColumns &&
            !showingDeleteColumnsButtons && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button className="absolute -bottom-7 z-50 h-5 w-5 rounded-full p-[0.125rem] text-pink-50">
                    <BsMusicNote className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="baseVertFlex w-52 !flex-nowrap gap-4 p-2"
                  side="bottom"
                >
                  <p className="w-auto text-center text-sm">
                    Specify a new BPM for this measure
                  </p>

                  <div className="baseFlex gap-2">
                    <BsMusicNote className="h-5 w-5" />
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="placeholder:text-grey-800/50 h-8 w-11 px-2 md:h-10 md:w-[52px] md:px-3"
                      placeholder={(tabData[sectionIndex]?.data[subSectionIndex]
                        ?.bpm === -1
                        ? 75
                        : tabData[sectionIndex]?.data[subSectionIndex]?.bpm
                      ).toString()}
                      value={
                        tabData[sectionIndex]!.data[subSectionIndex]!.data[
                          columnIndex
                        ][7] === "-1"
                          ? ""
                          : tabData[sectionIndex]!.data[subSectionIndex]!.data[
                              columnIndex
                            ][7].toString()
                      }
                      onChange={handleBpmChange}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            )}

          {index === 8 && reorderingColumns && (
            <div
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              className="hover:box-shadow-md absolute bottom-[-2.7rem] z-50 cursor-grab rounded-md text-pink-50 active:cursor-grabbing"
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
              className="absolute bottom-[-2.7rem] left-1/2 right-1/2 z-50 h-[1.75rem] w-[1.75rem] -translate-x-1/2 p-1"
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
