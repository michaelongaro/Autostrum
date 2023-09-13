import { useState, useEffect, useMemo } from "react";
import {
  useTabStore,
  type TabSection as TabSectionType,
  type Section,
} from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import TabColumn from "./TabColumn";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { motion } from "framer-motion";
import { BiUpArrowAlt, BiDownArrowAlt } from "react-icons/bi";
import { IoClose } from "react-icons/io5";
import { FaTrashAlt } from "react-icons/fa";
import { HiOutlineInformationCircle } from "react-icons/hi";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { parse, toString } from "~/utils/tunings";
import { v4 as uuid } from "uuid";
import { Separator } from "~/components/ui/separator";
import { Label } from "~/components/ui/label";

import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import MiscellaneousControls from "./MiscellaneousControls";

// idk custom sorting strategies don't seem to be working very well, prob a good idea to
// give drag overlay a shot before calling it quits on the measure line behavior.

// import type { ClientRect } from "@dnd-kit/core";
// import type { SortingStrategy } from "@dnd-kit/sortable";

// const defaultScale = {
//   scaleX: 1,
//   scaleY: 1,
// };

// export const horizontalWrappingListSortingStrategy: SortingStrategy = ({
//   rects,
//   activeNodeRect: fallbackActiveRect,
//   activeIndex,
//   overIndex,
//   index,
// }) => {
//   const activeNodeRect = rects[activeIndex] ?? fallbackActiveRect;
//   if (!activeNodeRect) return null;

//   const activeRow = getRow(rects, activeIndex);
//   const overRow = getRow(rects, overIndex);
//   const indexRow = getRow(rects, index);

//   let x = 0,
//     y = 0;
//   const itemGap = getItemGap(rects, index, activeIndex);

//   if (index === activeIndex) {
//     const newIndexRect = rects[overIndex];
//     if (!newIndexRect) return null;
//     x = newIndexRect.left - activeNodeRect.left;
//     y = newIndexRect.top - activeNodeRect.top;
//   } else {
//     if (indexRow === activeRow && indexRow === overRow) {
//       if (index > activeIndex && index <= overIndex)
//         x = -activeNodeRect.width - itemGap;
//       else if (index < activeIndex && index >= overIndex)
//         x = activeNodeRect.width + itemGap;
//     } else if (indexRow === overRow && index !== overIndex) {
//       if (index > overIndex) x = -activeNodeRect.width - itemGap;
//       else if (index < overIndex) x = activeNodeRect.width + itemGap;
//     }
//   }

//   return { x, y, ...defaultScale };
// };

// function getItemGap(rects: ClientRect[], index: number, activeIndex: number) {
//   const currentRect = rects[index];
//   const previousRect = rects[index - 1];
//   const nextRect = rects[index + 1];
//   if (!currentRect || (!previousRect && !nextRect)) return 0;

//   return activeIndex < index
//     ? previousRect
//       ? currentRect.left - (previousRect.left + previousRect.width)
//       : nextRect.left - (currentRect.left + currentRect.width)
//     : nextRect
//     ? nextRect.left - (currentRect.left + currentRect.width)
//     : currentRect.left - (previousRect.left + previousRect.width);
// }

// function getRow(rects: ClientRect[], index: number): number {
//   const currentRect = rects[index];
//   if (!currentRect) return -1;
//   return currentRect.top;
// }

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
    transition: {
      ease: "easeInOut",
      duration: 0.25,
    },
  },
  closed: {
    opacity: 0,
    scale: 0.5,
    transition: {
      ease: "easeInOut",
      duration: 0.25,
    },
  },
};

export interface LastModifiedPalmMuteNodeLocation {
  columnIndex: number;
  prevValue: string;
  currentValue: string;
}

interface TabSection {
  sectionId: string;
  sectionIndex: number;
  subSectionIndex: number;
  subSectionData: TabSectionType;
}

function TabSection({
  sectionId,
  sectionIndex,
  subSectionIndex,
  subSectionData,
}: TabSection) {
  const [editingPalmMuteNodes, setEditingPalmMuteNodes] = useState(false);
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);
  const [reorderingColumns, setReorderingColumns] = useState(false);
  const [showingDeleteColumnsButtons, setShowingDeleteColumnsButtons] =
    useState(false);

  const [inputIdToFocus, setInputIdToFocus] = useState<string | null>(null);

  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (inputIdToFocus) {
      const newNoteToFocus = document.getElementById(inputIdToFocus);
      newNoteToFocus?.focus();
      setInputIdToFocus(null);
    }
  }, [inputIdToFocus]);

  function getColumnIds() {
    const newIds = [];

    for (const columnData of subSectionData.data) {
      newIds.push(columnData[9]!);
    }

    return newIds;
  }

  const { bpm, tuning, modifyPalmMuteDashes, tabData, setTabData, editing } =
    useTabStore(
      (state) => ({
        bpm: state.bpm,
        tuning: state.tuning,
        modifyPalmMuteDashes: state.modifyPalmMuteDashes,
        tabData: state.tabData,
        setTabData: state.setTabData,
        editing: state.editing,
      }),
      shallow
    );

  // should these functions below be in zustand?

  function addNewColumns() {
    const newTabData = [...tabData];

    for (let i = 0; i < 8; i++) {
      newTabData[sectionIndex]!.data[subSectionIndex]?.data.push(
        Array.from({ length: 10 }, (_, index) => {
          if (index === 8) {
            return "note";
          } else if (index === 9) {
            return uuid();
          } else {
            return "";
          }
        })
      );
    }

    setTabData(newTabData);
  }

  interface TraverseSectionData {
    newSectionData: TabSectionType;
    endIndex: number;
    pairPalmMuteIndex: number;
    initialPalmMuteValue: "start" | "end";
  }

  function traverseSectionData({
    newSectionData,
    endIndex,
    pairPalmMuteIndex,
    initialPalmMuteValue,
  }: TraverseSectionData) {
    const step = endIndex <= pairPalmMuteIndex ? 1 : -1;
    let action: "expand" | "destroy" = "expand";
    let currentIndex = endIndex + step;

    while (
      (step > 0 && currentIndex <= pairPalmMuteIndex) ||
      (step < 0 && currentIndex >= pairPalmMuteIndex)
    ) {
      const value = newSectionData.data[currentIndex]?.[0];

      // landed outside of a pm section, but broke prev pm section
      if (value === initialPalmMuteValue) {
        newSectionData.data[endIndex]![0] = "";
        action = "destroy";
        break;
      }

      // landed inside of a pm section, but broke prev pm section
      if (
        ((initialPalmMuteValue === "start" && value === "end") ||
          (initialPalmMuteValue === "end" && value === "start")) &&
        currentIndex !== pairPalmMuteIndex
      ) {
        newSectionData.data[endIndex]![0] = "-";
        action = "destroy";
        break;
      }

      // landed outside of a pm section, able to keep prev pm section
      if (currentIndex === pairPalmMuteIndex) {
        if (
          (initialPalmMuteValue === "start" && endIndex > pairPalmMuteIndex) ||
          (initialPalmMuteValue === "end" && endIndex < pairPalmMuteIndex)
        ) {
          newSectionData.data[endIndex]![0] = "";
          action = "destroy";
        } else {
          action = "expand";
        }

        break;
      }

      currentIndex += step;
    }

    return { newSectionData, action };
  }

  interface MoveAndAssignNewPalmMuteValue {
    sectionData: TabSectionType;
    startIndex: number;
    endIndex: number;
  }

  function moveAndAssignNewPalmMuteValue({
    sectionData,
    startIndex,
    endIndex,
  }: MoveAndAssignNewPalmMuteValue): {
    newSectionData: TabSectionType;
    action: "expand" | "shrink" | "destroy";
    pairPalmMuteIndex: number;
  } {
    const initialPalmMuteValue = sectionData.data[startIndex]![0];
    let pairPalmMuteIndex = -1;

    if (initialPalmMuteValue === "start") {
      // initial thought was to start +1 from startIndex, but I'm not sure that's necessary
      let index = startIndex;
      while (index < sectionData.data.length) {
        if (sectionData.data[index]?.[0] === "end") {
          pairPalmMuteIndex = index;
          break;
        }
        index++;
      }
    } else if (initialPalmMuteValue === "end") {
      let index = startIndex;
      while (index >= 0) {
        if (sectionData.data[index]?.[0] === "start") {
          pairPalmMuteIndex = index;
          break;
        }
        index--;
      }
    }

    const newSectionData = {
      ...sectionData,
      data: arrayMove(sectionData.data, startIndex, endIndex),
    };

    let index = endIndex;
    const action: "expand" | "shrink" | "destroy" = "expand";

    if (initialPalmMuteValue === "" || initialPalmMuteValue === "-") {
      while (index >= 0) {
        if (newSectionData.data[index]?.[0] === "end") {
          newSectionData.data[endIndex]![0] = "";
          break;
        }

        if (newSectionData.data[index]?.[0] === "start") {
          newSectionData.data[endIndex]![0] = "-";
          break;
        }

        index--;
      }
    } else if (
      initialPalmMuteValue === "start" ||
      initialPalmMuteValue === "end"
    ) {
      let results: {
        newSectionData: TabSectionType;
        action: "expand" | "shrink" | "destroy";
      };

      if (
        Math.min(startIndex, pairPalmMuteIndex) < endIndex &&
        endIndex < Math.max(startIndex, pairPalmMuteIndex)
      ) {
        return {
          newSectionData,
          action: "shrink",
          pairPalmMuteIndex,
        };
      } else if (endIndex === pairPalmMuteIndex) {
        newSectionData.data[endIndex]![0] = "";
        return {
          newSectionData,
          action: "destroy",
          pairPalmMuteIndex,
        };
      } else {
        results = traverseSectionData({
          newSectionData,
          endIndex,
          pairPalmMuteIndex,
          initialPalmMuteValue,
        });
      }

      return {
        newSectionData: results.newSectionData,
        action: results.action,
        pairPalmMuteIndex,
      };
    }

    return { newSectionData, action, pairPalmMuteIndex };
  }

  interface HandlePreviousPalmMuteSection {
    sectionData: TabSectionType;
    startIndex: number;
    endIndex: number;
    direction: "left" | "right";
    action: "expand" | "shrink" | "destroy";
  }

  function handlePreviousPalmMuteSection({
    sectionData,
    startIndex,
    endIndex,
    direction,
    action,
  }: HandlePreviousPalmMuteSection) {
    let index = startIndex;

    // may need to start with one index "forward"
    // I think if endIndex < startIndex you don't have to go one forward though

    // all edge cases are handled before this function is called
    if (action === "expand") {
      if (direction === "left") {
        while (index > endIndex) {
          sectionData.data[index]![0] = "-";

          index--;
        }
      } else {
        while (index < endIndex) {
          sectionData.data[index]![0] = "-";

          index++;
        }
      }
    } else if (action === "shrink") {
      // should basically be right, but is copilot generated
      if (direction === "left") {
        while (index > endIndex) {
          sectionData.data[index]![0] = "";

          index--;
        }
      } else {
        while (index < endIndex) {
          sectionData.data[index]![0] = "";

          index++;
        }
      }
    } else {
      if (direction === "left") {
        while (index >= 0) {
          if (sectionData.data[index]?.[0] === "start") {
            sectionData.data[index]![0] = "";
            break;
          }

          sectionData.data[index]![0] = "";

          index--;
        }
      } else {
        while (index < sectionData.data.length) {
          if (sectionData.data[index]?.[0] === "end") {
            sectionData.data[index]![0] = "";
            break;
          }

          sectionData.data[index]![0] = "";

          index++;
        }
      }
    }

    return sectionData;
  }

  function toggleEditingPalmMuteNodes() {
    if (!editingPalmMuteNodes) {
      setEditingPalmMuteNodes(true);
      return;
    } else if (lastModifiedPalmMuteNode) {
      // if prevValue was "" then can just do hardcoded solution as before
      if (lastModifiedPalmMuteNode.prevValue === "") {
        const newTabData = [...tabData];
        newTabData[sectionIndex]!.data[subSectionIndex]!.data[
          lastModifiedPalmMuteNode.columnIndex
        ]![0] = "";
        setTabData(newTabData);
      } else {
        modifyPalmMuteDashes(
          tabData,
          setTabData,
          sectionIndex,
          lastModifiedPalmMuteNode.columnIndex,
          "tempRemoveLater",
          lastModifiedPalmMuteNode.prevValue
        );
      }

      setLastModifiedPalmMuteNode(null);
    }
    setEditingPalmMuteNodes(false);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    const prevTabData = [...tabData];
    let prevSectionData = prevTabData[sectionIndex]?.data[subSectionIndex];

    if (
      prevSectionData === undefined ||
      prevSectionData.type !== "tab" ||
      typeof active.id !== "string" ||
      typeof over?.id !== "string" ||
      active.id === over?.id
    )
      return;

    let startIndex = 0;
    let endIndex = 0;

    for (let i = 0; i < prevSectionData.data.length; i++) {
      if (prevSectionData.data[i]?.[9] === active.id) {
        startIndex = i;
      } else if (prevSectionData.data[i]?.[9] === over?.id) {
        endIndex = i;
      }
    }

    const startPalmMuteValue = prevSectionData?.data[startIndex]?.[0];

    const { newSectionData, action, pairPalmMuteIndex } =
      moveAndAssignNewPalmMuteValue({
        sectionData: prevSectionData,
        startIndex,
        endIndex,
      });

    prevSectionData = newSectionData;

    // making sure there are no occurances of two measure lines right next to each other,
    // or at the start or end of the section
    for (let i = 0; i < prevSectionData.data.length - 2; i++) {
      if (
        (prevSectionData.data[i]?.[8] === "measureLine" &&
          prevSectionData.data[i + 1]?.[8] === "measureLine") ||
        prevSectionData.data[0]?.[8] === "measureLine" ||
        prevSectionData.data[prevSectionData.data.length - 1]?.[8] ===
          "measureLine"
      ) {
        return;
      }
    }

    if (startPalmMuteValue === "start" || startPalmMuteValue === "end") {
      let direction: "left" | "right" = "right";

      // is this right?? should it be conditional based on if startPalmMuteValue is "start" or "end"?
      if (startIndex > endIndex) {
        direction = "left";
      }

      // currently 01234   6789  5      got rid of 6789 instead of 01234
      // do same setup, but check what the direction is at all stages here, it REALLY should have been
      // left but it was in fact right...

      // if we are destroying a palm mute section, we need to instead iterate
      // through in the opposite direction (to remove the dashed/pair node)
      if (
        action === "destroy" &&
        // don't reverse if "crossing over" a paired node
        ((startPalmMuteValue === "start" && endIndex < pairPalmMuteIndex) ||
          (startPalmMuteValue === "end" && endIndex > pairPalmMuteIndex))
      ) {
        direction = direction === "left" ? "right" : "left";
      }

      prevSectionData = handlePreviousPalmMuteSection({
        sectionData: prevSectionData,
        startIndex,
        endIndex,
        direction,
        action,
      });

      prevTabData[sectionIndex]!.data[subSectionIndex] = prevSectionData;
    } else {
      prevTabData[sectionIndex]!.data[subSectionIndex] = prevSectionData;
    }

    setTabData(prevTabData);
  }

  function handleRepetitionsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newRepetitions =
      e.target.value.length === 0 ? -1 : parseInt(e.target.value);
    if (isNaN(newRepetitions) || newRepetitions > 99) return;

    const newTabData = [...tabData];

    newTabData[sectionIndex]!.data[subSectionIndex]!.repetitions =
      newRepetitions;

    setTabData(newTabData);
  }

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newBpm = e.target.value.length === 0 ? -1 : parseInt(e.target.value);
    if (isNaN(newBpm) || newBpm > 400) return;

    const newTabData = [...tabData];

    newTabData[sectionIndex]!.data[subSectionIndex]!.bpm = newBpm;

    setTabData(newTabData);
  }

  function handleExtendTabButtonKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>
  ) {
    if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const firstNewColumnIndex = subSectionData.data.length - 1; // this will be the first of the 8 new strums added

      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${firstNewColumnIndex}-3`
      );

      newNoteToFocus?.focus();
    } else if (e.key === "Enter") {
      const newTabData = [...tabData];

      for (let i = 0; i < 8; i++) {
        newTabData[sectionIndex]!.data[subSectionIndex]?.data.push(
          Array.from({ length: 10 }, (_, index) => {
            if (index === 8) {
              return "note";
            } else if (index === 9) {
              return uuid();
            } else {
              return "";
            }
          })
        );
      }

      setTabData(newTabData);

      const firstNewColumnIndex = subSectionData.data.length - 8; // this will be the first of the 8 new strums added

      setInputIdToFocus(
        `input-${sectionIndex}-${subSectionIndex}-${firstNewColumnIndex}-3`
      );
    }
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

  return (
    <motion.div
      key={subSectionData.id}
      layout={"position"}
      variants={opacityAndScaleVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      transition={{
        layout: {
          type: "spring",
          bounce: 0.15,
          duration: 1,
        },
      }}
      style={{
        gap: editing ? "1rem" : "0",
        padding: sectionPadding,
        width: editing ? "100%" : "auto",
        borderTopLeftRadius:
          !editing && subSectionData.repetitions > 1 ? 0 : "0.375rem",
      }}
      className="baseVertFlex lightestGlassmorphic relative h-full !justify-start rounded-md"
    >
      {editing && (
        <div className="baseFlex w-full !items-start">
          <div className="baseVertFlex w-5/6 !items-start gap-2 lg:!flex-row lg:!justify-start">
            <div className="baseFlex gap-2">
              <Label>Repetitions</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="h-8 w-11 px-2 md:h-10 md:w-[52px] md:px-3"
                placeholder="1"
                value={
                  subSectionData.repetitions === -1
                    ? ""
                    : subSectionData.repetitions.toString()
                }
                onChange={handleRepetitionsChange}
              />
            </div>

            <div className="baseFlex gap-2">
              <Label>BPM</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="h-8 w-11 px-2 md:h-10 md:w-[52px] md:px-3"
                placeholder={(bpm ?? 75).toString()}
                value={
                  subSectionData.bpm === -1 ? "" : subSectionData.bpm.toString()
                }
                onChange={handleBpmChange}
              />
            </div>

            <div className="baseVertFlex !items-start gap-2 lg:!flex-row">
              <div className="baseFlex">
                <Button
                  disabled={editingPalmMuteNodes}
                  style={{
                    borderRadius: editingPalmMuteNodes
                      ? "0.375rem 0 0 0.375rem"
                      : "0.375rem",
                  }}
                  // should you just manually add these styles to the button component?
                  // not sure of good usecases for having anything but small sized buttons at these viewports..

                  // className="transition-colors transition-opacity"
                  onClick={toggleEditingPalmMuteNodes}
                >
                  Edit palm mute sections
                </Button>

                {editingPalmMuteNodes && (
                  <Button
                    className="rounded-l-none rounded-r-md px-2 py-0"
                    onClick={toggleEditingPalmMuteNodes}
                  >
                    <IoClose className="h-6 w-6" />
                  </Button>
                )}
              </div>

              <div className="baseFlex">
                <Button
                  disabled={reorderingColumns}
                  style={{
                    borderRadius: reorderingColumns
                      ? "0.375rem 0 0 0.375rem"
                      : "0.375rem",
                  }}
                  // className="transition-colors transition-opacity"
                  onClick={() => {
                    setReorderingColumns(!reorderingColumns);
                    setShowingDeleteColumnsButtons(false);
                  }}
                >
                  Reorder chords
                </Button>

                {reorderingColumns && (
                  <Button
                    className="rounded-l-none rounded-r-md px-2 py-0"
                    onClick={() => {
                      setReorderingColumns(!reorderingColumns);
                      setShowingDeleteColumnsButtons(false);
                    }}
                  >
                    <IoClose className="h-6 w-6" />
                  </Button>
                )}
              </div>

              <div className="baseFlex">
                <Button
                  variant={"destructive"}
                  disabled={showingDeleteColumnsButtons}
                  style={{
                    borderRadius: showingDeleteColumnsButtons
                      ? "0.375rem 0 0 0.375rem"
                      : "0.375rem",
                  }}
                  className="baseFlex gap-2"
                  onClick={() => {
                    setShowingDeleteColumnsButtons(
                      !showingDeleteColumnsButtons
                    );
                    setReorderingColumns(false);
                  }}
                >
                  Delete chords
                  <FaTrashAlt className="h-4 w-4" />
                </Button>

                {showingDeleteColumnsButtons && (
                  <Button
                    variant={"destructive"}
                    className="rounded-l-none rounded-r-md px-2 py-0"
                    onClick={() => {
                      setShowingDeleteColumnsButtons(
                        !showingDeleteColumnsButtons
                      );
                      setReorderingColumns(false);
                    }}
                  >
                    <IoClose className="h-6 w-6" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <MiscellaneousControls
            type={"tab"}
            sectionId={sectionId}
            sectionIndex={sectionIndex}
            subSectionIndex={subSectionIndex}
          />
        </div>
      )}

      {/* try to use framer motion to animate sections sliding up/down to their new positions
        (this would mean both sections would need to slide for each click of "up"/"down" ) */}

      <div className="baseFlex relative w-full !justify-start">
        {editing && (
          <>
            {editingPalmMuteNodes ? (
              <p className="absolute left-[0.4rem] top-6 text-sm italic">PM</p>
            ) : (
              <div className="absolute left-1 top-6">
                <Popover>
                  <PopoverTrigger className="rounded-md p-1 transition-all hover:bg-white/20 active:hover:bg-white/10">
                    <HiOutlineInformationCircle className="h-5 w-5 " />
                  </PopoverTrigger>
                  <PopoverContent
                    side={"right"}
                    className="w-[300px] md:w-full"
                  >
                    <div className="baseVertFlex gap-1">
                      <p className="font-semibold">Hotkeys</p>
                      <ul className="list-disc pl-4">
                        <li>
                          You can navigate through inputs with your arrow keys.
                        </li>
                        <li>
                          Press <span className="font-semibold">A-G </span>
                          for respective major chords.
                        </li>
                        <li>
                          Press <span className="font-semibold">a-g </span>
                          for respective minor chords.
                        </li>
                        <li>Copying & pasting chords work as expected.</li>
                      </ul>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </>
        )}

        <div
          style={{
            height: editing ? "284px" : "168px",
            gap: editing ? "1.35rem" : "0.05rem",
          }}
          className="baseVertFlex relative rounded-l-2xl border-2 border-pink-50 p-2"
        >
          {toString(parse(tuning), { pad: 1 })
            .split(" ")
            .reverse()
            .map((note, index) => (
              <div key={index}>{note}</div>
            ))}
        </div>

        {/* TODO: when dragging measure line, the first <TabNoteAndEffectCombo /> will
        be shrunk down to 1px width and moved out of the way. I _believe_ that this is due to 
        maybe the dnd thinking that the measure line is actually as wide as the other elems but
        I'm not too sure. 
        
        Also when moving across other measure lines it moves them up out of
        the way when really I just want things to move horizontally/jump to next line if need
        be... Maybe somehow try to increase width of section as a whole? seems like it is doing
        the best it can but just has no space to expand out to. */}
        <DndContext
          sensors={sensors}
          modifiers={[restrictToParentElement]}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={getColumnIds()}
            strategy={rectSortingStrategy}
          >
            {subSectionData.data.map((column, index) => (
              <TabColumn
                key={column[9]} // this is a unique id for the column
                // ^^^ idk if it was adding the "layout" props or what, but
                // onDragEnd the column extends farther than it should and then
                // snaps back to correct position, this goes away by fully rerendering
                // by having key={index}, but feels like a copout to handle this way...
                columnData={column}
                sectionIndex={sectionIndex}
                subSectionIndex={subSectionIndex}
                columnIndex={index}
                editingPalmMuteNodes={editing ? editingPalmMuteNodes : false}
                setEditingPalmMuteNodes={setEditingPalmMuteNodes}
                lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
                reorderingColumns={editing ? reorderingColumns : false}
                showingDeleteColumnsButtons={
                  editing ? showingDeleteColumnsButtons : false
                }
              />
            ))}
          </SortableContext>
        </DndContext>

        <div
          style={{
            height: editing ? "284px" : "168px",
          }}
          className="rounded-r-2xl border-2 border-pink-50 p-1"
        ></div>
      </div>

      {editing && (
        <Button
          id={`${sectionIndex}${subSectionIndex}ExtendTabButton`}
          onKeyDown={handleExtendTabButtonKeyDown}
          onClick={addNewColumns}
        >
          Extend tab
        </Button>
      )}
    </motion.div>
  );
}

export default TabSection;
