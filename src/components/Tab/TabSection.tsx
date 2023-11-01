import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import isEqual from "lodash.isequal";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState, memo, Fragment } from "react";
import { BsKeyboard } from "react-icons/bs";
import { FaTrashAlt } from "react-icons/fa";
import { HiOutlineInformationCircle } from "react-icons/hi";
import { IoClose } from "react-icons/io5";
import { v4 as uuid } from "uuid";
import { shallow } from "zustand/shallow";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  useTabStore,
  type TabSection as TabSectionType,
} from "~/stores/TabStore";
import { parse, toString } from "~/utils/tunings";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { traverseToRemoveHangingPairNode } from "~/utils/palmMuteHelpers";
import MiscellaneousControls from "./MiscellaneousControls";
import focusAndScrollIntoView from "~/utils/focusAndScrollIntoView";
import TabMeasureLine from "./TabMeasureLine";
import TabNotesColumn from "./TabNotesColumn";

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
      const currentNote = document.getElementById(
        `${sectionIndex}${subSectionIndex}ExtendTabButton`
      );
      const newNoteToFocus = document.getElementById(inputIdToFocus);
      focusAndScrollIntoView(currentNote, newNoteToFocus);
      setInputIdToFocus(null);
    }
  }, [inputIdToFocus, sectionIndex, subSectionIndex]);

  function getColumnIds() {
    const newIds = [];

    for (const columnData of subSectionData.data) {
      newIds.push(columnData[9]!);
    }

    return newIds;
  }

  const {
    bpm,
    tuning,
    getTabData,
    setTabData,
    editing,
    preventFramerLayoutShift,
    currentlyPlayingMetadata,
    currentChordIndex,
    playbackSpeed,
    audioMetadata,
  } = useTabStore(
    (state) => ({
      bpm: state.bpm,
      tuning: state.tuning,
      getTabData: state.getTabData,
      setTabData: state.setTabData,
      editing: state.editing,
      preventFramerLayoutShift: state.preventFramerLayoutShift,
      currentlyPlayingMetadata: state.currentlyPlayingMetadata,
      currentChordIndex: state.currentChordIndex,
      playbackSpeed: state.playbackSpeed,
      audioMetadata: state.audioMetadata,
    }),
    shallow
  );

  // should these functions below be in zustand?

  function addNewColumns() {
    const newTabData = getTabData();

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
      // if only had a hanging "start" node, then just revert
      // start node to being empty
      if (lastModifiedPalmMuteNode.prevValue === "") {
        const newTabData = getTabData();
        newTabData[sectionIndex]!.data[subSectionIndex]!.data[
          lastModifiedPalmMuteNode.columnIndex
        ]![0] = "";

        setTabData(newTabData);
      }
      // otherwise need to traverse to find + remove pair node
      else {
        traverseToRemoveHangingPairNode({
          tabData: getTabData(),
          setTabData,
          sectionIndex,
          subSectionIndex,
          startColumnIndex: lastModifiedPalmMuteNode.columnIndex,
          pairNodeToRemove:
            lastModifiedPalmMuteNode.prevValue === "start" ? "end" : "start",
        });
      }

      setLastModifiedPalmMuteNode(null);
    }
    setEditingPalmMuteNodes(false);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    const prevTabData = getTabData();
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

    const newTabData = getTabData();

    newTabData[sectionIndex]!.data[subSectionIndex]!.repetitions =
      newRepetitions;

    setTabData(newTabData);
  }

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newBpm = e.target.value.length === 0 ? -1 : parseInt(e.target.value);
    if (isNaN(newBpm) || newBpm > 500) return;

    const newTabData = getTabData();

    newTabData[sectionIndex]!.data[subSectionIndex]!.bpm = newBpm;

    setTabData(newTabData);
  }

  function handleExtendTabButtonKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>
  ) {
    if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const firstNewColumnIndex = subSectionData.data.length - 1; // this will be the first of the 8 new strums added

      const currentNote = document.getElementById(
        `${sectionIndex}${subSectionIndex}ExtendTabButton`
      );
      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${firstNewColumnIndex}-3`
      );

      focusAndScrollIntoView(currentNote, newNoteToFocus);
    } else if (e.key === "Enter") {
      const newTabData = getTabData();

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

      const firstNewColumnIndex = subSectionData.data.length;

      setInputIdToFocus(
        `input-${sectionIndex}-${subSectionIndex}-${firstNewColumnIndex}-3`
      );
    }
  }

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

  function getDurationOfCurrentChord() {
    const location = currentlyPlayingMetadata?.[currentChordIndex]?.location;
    if (!currentlyPlayingMetadata || !location) return 0;

    const { bpm, noteLengthMultiplier } =
      currentlyPlayingMetadata[currentChordIndex]!;

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

  return (
    <motion.div
      key={subSectionData.id}
      {...(editing && !preventFramerLayoutShift && { layout: "position" })}
      variants={opacityAndScaleVariants}
      // initial="closed"
      // animate="expanded"
      // exit="closed"
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
                placeholder={bpm === -1 ? "" : bpm.toString()}
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
                  Edit PM sections
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
                      <p className="baseFlex gap-2 text-sm font-semibold md:text-base">
                        <BsKeyboard className="h-5 w-5 sm:h-6 sm:w-6" />
                        Hotkeys
                      </p>
                      <ul className="list-disc pl-4 text-sm md:text-base">
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
            height: editing ? "280px" : "168px",
            gap: editing ? "1.35rem" : "0",
            marginBottom: editing ? "0" : "-1px",
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

        <DndContext
          sensors={sensors}
          modifiers={[restrictToParentElement]}
          collisionDetection={rectIntersection}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={getColumnIds()}
            strategy={rectSortingStrategy}
          >
            {subSectionData.data.map((column, index) => (
              <Fragment key={column[9]}>
                {column.includes("|") ? (
                  <TabMeasureLine
                    columnData={column}
                    sectionIndex={sectionIndex}
                    subSectionIndex={subSectionIndex}
                    columnIndex={index}
                    reorderingColumns={reorderingColumns}
                    showingDeleteColumnsButtons={showingDeleteColumnsButtons}
                    columnHasBeenPlayed={columnHasBeenPlayed(index - 1)} // measure lines aren't "played", so tieing logic to closest previous column
                  />
                ) : (
                  <TabNotesColumn
                    sectionIndex={sectionIndex}
                    subSectionIndex={subSectionIndex}
                    columnIndex={index}
                    columnData={column}
                    columnIsBeingPlayed={columnIsBeingPlayed(index)}
                    columnHasBeenPlayed={columnHasBeenPlayed(index)}
                    durationOfChord={getDurationOfCurrentChord()}
                    editingPalmMuteNodes={editingPalmMuteNodes}
                    setEditingPalmMuteNodes={setEditingPalmMuteNodes}
                    lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                    setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
                    reorderingColumns={reorderingColumns}
                    showingDeleteColumnsButtons={showingDeleteColumnsButtons}
                  />
                )}
              </Fragment>
            ))}
          </SortableContext>
        </DndContext>

        <div
          style={{
            height: editing ? "280px" : "168px",
            marginBottom: editing ? "0" : "-1px",
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

export default memo(TabSection, (prevProps, nextProps) => {
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
