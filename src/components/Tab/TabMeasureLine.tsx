import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Fragment, useState } from "react";
import { BsMusicNote } from "react-icons/bs";
import { IoClose } from "react-icons/io5";
import { RxDragHandleDots2 } from "react-icons/rx";
import { shallow } from "zustand/shallow";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useTabStore } from "~/stores/TabStore";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { type TabColumn } from "./TabColumn";

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

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    e.stopPropagation();

    // tab arrow key navigation (limited to current section, so sectionIdx will stay constant)
    if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const adjColumnIndex =
        tabData[sectionIndex]!.data[subSectionIndex]!.data[
          columnIndex - 1
        ]?.[7] === "|"
          ? columnIndex - 2
          : columnIndex - 1;

      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${adjColumnIndex}-7`
      );

      newNoteToFocus?.focus();
      return;
    } else if (e.key === "ArrowRight") {
      e.preventDefault(); // prevent cursor from moving

      if (
        columnIndex ===
        tabData[sectionIndex]!.data[subSectionIndex]!.data.length - 1
      ) {
        const newNoteToFocus = document.getElementById(
          `${sectionIndex}${subSectionIndex}ExtendTabButton`
        );

        newNoteToFocus?.focus();
        return;
      }

      const adjColumnIndex =
        tabData[sectionIndex]!.data[subSectionIndex].data[
          columnIndex + 1
        ]?.[7] === "|"
          ? columnIndex + 2
          : columnIndex + 1;

      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${adjColumnIndex}-7`
      );

      newNoteToFocus?.focus();
      return;
    }

    const newTabData = [...tabData];

    setTabData(newTabData);
  }

  function renderMeasureLine(index: number) {
    if (editing) {
      if (index === 1) {
        return (
          <div className="baseVertFlex w-full !flex-nowrap">
            {/* top border and vert stub to normalize heights of middle indicies */}
            {reorderingColumns && !isDragging && (
              <div className="baseVertFlex w-full">
                <div className="h-[2px] w-full bg-pink-50"></div>
                <div className="h-[3px] w-[2px] bg-pink-50"></div>
              </div>
            )}

            <div className="baseFlex w-full">
              {/* left dummy string */}
              {reorderingColumns && !isDragging && (
                <div className="h-[1px] flex-[1] bg-pink-50/50"></div>
              )}

              {/* measure line */}
              <div
                style={{
                  height: getHeightOfMeasureLineSubSection(index),
                }}
                className="w-[2px] bg-pink-50"
              ></div>

              {/* right dummy string */}
              {reorderingColumns && !isDragging && (
                <div className="h-[1px] flex-[1] bg-pink-50/50"></div>
              )}
            </div>
          </div>
        );
      } else if (index === 6) {
        return (
          <div className="baseVertFlex w-full !flex-nowrap">
            <div className="baseFlex w-full">
              {/* left dummy string */}
              {reorderingColumns && !isDragging && (
                <div className="h-[1px] flex-[1] bg-pink-50/50"></div>
              )}

              {/* measure line */}
              <div
                style={{
                  height: getHeightOfMeasureLineSubSection(index),
                }}
                className="w-[2px] bg-pink-50"
              ></div>

              {/* right dummy string */}
              {reorderingColumns && !isDragging && (
                <div className="h-[1px] flex-[1] bg-pink-50/50"></div>
              )}
            </div>
            {/* bottom border and vert stub to normalize heights of middle indicies */}
            {reorderingColumns && !isDragging && (
              <div className="baseVertFlex w-full">
                <div className="h-[3px] w-[2px] bg-pink-50"></div>
                <div className="h-[2px] w-full bg-pink-50"></div>
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div className="baseFlex w-full">
            {/* left dummy string */}
            {reorderingColumns && !isDragging && (
              <div className="h-[1px] flex-[1] bg-pink-50/50"></div>
            )}

            {/* measure line */}
            <div
              style={{
                height: getHeightOfMeasureLineSubSection(index),
              }}
              className="w-[2px] bg-pink-50"
            ></div>

            {/* right dummy string */}
            {reorderingColumns && !isDragging && (
              <div className="h-[1px] flex-[1] bg-pink-50/50"></div>
            )}
          </div>
        );
      }
    }

    // else:
    return (
      <div
        style={{
          height: getHeightOfMeasureLineSubSection(index),
        }}
        className="w-[2px] bg-pink-50"
      ></div>
    );
  }

  function getHeightOfMeasureLineSubSection(index: number) {
    let height = "0px";

    if (editing) {
      if (reorderingColumns && !isDragging) {
        height = "45px";
      } else {
        if (index === 1 || index === 6) {
          height = "47px";
        } else {
          height = "46.5px"; // hacky "magic" number to get everything to line up correctly
        }
      }
    } else {
      height = "28px";
    }

    return height;
  }

  return (
    <motion.div
      key={columnData[9]}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(
          transform && { ...transform, scaleY: 1, scaleX: 1 }
        ),
        // need to have same width as chords for the drag and drop algorithms
        // to behave properly without the ui breaking
        width: reorderingColumns ? "60px" : "2px",
        transition: `${transition ?? ""}, width 0.15s ease-in-out`,
        height: editing ? "400px" : "271px",
      }}
      className="baseVertFlex relative"
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
                      note === "-" ? "top-[10px]" : "top-[27px]"
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

              <div className="baseFlex mb-0 h-0 w-full">
                {note === "-" && (
                  <div
                    style={{
                      top: editing ? "-26px" : "-18px",
                    }}
                    className="relative h-[1px] w-full bg-pink-50"
                  ></div>
                )}
              </div>
            </>
          )}

          {index > 0 && index < 7 && (
            <div className="baseFlex w-full">{renderMeasureLine(index)}</div>
          )}

          {index === 8 &&
            editing &&
            !reorderingColumns &&
            !showingDeleteColumnsButtons && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id={`input-${sectionIndex}-${subSectionIndex}-${columnIndex}-7`}
                    className="absolute bottom-7 z-50 h-5 w-5 rounded-full p-[0.125rem] text-pink-50"
                    onKeyDown={handleKeyDown}
                  >
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
        </Fragment>
      ))}

      {reorderingColumns && (
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className={`hover:box-shadow-md isDragging ? "cursor-grabbing" : "cursor-grab" absolute bottom-4
              z-50 cursor-grab rounded-md text-pink-50 active:cursor-grabbing`}
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

      {showingDeleteColumnsButtons && (
        <Button
          variant={"destructive"}
          size="sm"
          className="absolute bottom-4 left-1/2 right-1/2 z-50 h-[1.75rem] w-[1.75rem] -translate-x-1/2 p-1"
          onClick={handleDeleteMeasureLine}
        >
          <IoClose className="h-6 w-6" />
        </Button>
      )}
    </motion.div>
  );
}

export default TabMeasureLine;
