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
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useCallback, useState, Fragment } from "react";
import { FaTrashAlt } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  useTabStore,
  type TabSection as TabSectionType,
} from "~/stores/TabStore";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { traverseToRemoveHangingPairNode } from "~/utils/palmMuteHelpers";
import MiscellaneousControls from "./MiscellaneousControls";
import focusAndScrollIntoView from "~/utils/focusAndScrollIntoView";
import TabMeasureLine from "./TabMeasureLine";
import TabNotesColumn from "./TabNotesColumn";
import { PrettyVerticalTuning } from "~/components/ui/PrettyTuning";
import { QuarterNote } from "~/utils/bpmIconRenderingHelpers";
import { useTabSubSectionData } from "~/hooks/useTabDataSelectors";

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

const xVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      delay: 0.1,
      duration: 0.2,
    },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
      delay: 0,
    },
  },
};

const containerVariants = {
  hidden: { x: "-100%", width: 0, opacity: 0, zIndex: -1 },
  visible: {
    x: 0,
    width: "auto",
    opacity: 1,
    zIndex: 1,
    transition: {
      delay: 0,
      duration: 0.2,
    },
  },
  exit: {
    x: "-100%",
    width: 0,
    opacity: 0,
    zIndex: -1,
    transition: {
      duration: 0.2,
      delay: 0.1,
    },
  },
};

export interface LastModifiedPalmMuteNodeLocation {
  columnIndex: number;
  prevValue: string;
  currentValue: string;
}

interface TabSection {
  sectionIndex: number;
  subSectionIndex: number;
}

function TabSection({ sectionIndex, subSectionIndex }: TabSection) {
  const [editingPalmMuteNodes, setEditingPalmMuteNodes] = useState(false);
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);
  const [pmNodeOpacities, setPMNodeOpacities] = useState<string[]>([]);

  const [reorderingColumns, setReorderingColumns] = useState(false);
  const [showingDeleteColumnsButtons, setShowingDeleteColumnsButtons] =
    useState(false);
  const [columnIdxBeingHovered, setColumnIdxBeingHovered] = useState<
    number | null
  >(null);

  const [inputIdToFocus, setInputIdToFocus] = useState<string | null>(null);

  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const subSection = useTabSubSectionData(sectionIndex, subSectionIndex);

  useEffect(() => {
    if (inputIdToFocus) {
      const currentNote = document.getElementById(
        `${sectionIndex}${subSectionIndex}ExtendTabButton`,
      );
      const newNoteToFocus = document.getElementById(inputIdToFocus);
      focusAndScrollIntoView(currentNote, newNoteToFocus);
      setInputIdToFocus(null);
    }
  }, [inputIdToFocus, sectionIndex, subSectionIndex]);

  function getColumnIds() {
    return subSection.data.map((column) => column[9]!);
  }

  const {
    bpm,
    tuning,
    currentlyPlayingMetadata,
    currentChordIndex,
    playbackSpeed,
    audioMetadata,
    setTabData,
  } = useTabStore((state) => ({
    bpm: state.bpm,
    tuning: state.tuning,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    currentChordIndex: state.currentChordIndex,
    playbackSpeed: state.playbackSpeed,
    audioMetadata: state.audioMetadata,
    setTabData: state.setTabData,
  }));

  const getPMNodeOpacities = useCallback(() => {
    if (lastModifiedPalmMuteNode === null) {
      return new Array(subSection.data.length).fill("1") as string[];
    }

    const newOpacities = new Array(subSection.data.length).fill(
      "0.25",
    ) as string[];

    // added new "PM Start" node
    if (lastModifiedPalmMuteNode.prevValue === "") {
      let nearestStartNodeIndex = lastModifiedPalmMuteNode.columnIndex + 1;
      for (
        let i = lastModifiedPalmMuteNode.columnIndex + 1;
        i < subSection.data.length;
        i++
      ) {
        if (subSection.data[i]?.[0] === "start") break;
        nearestStartNodeIndex++;
      }

      newOpacities.fill(
        "1",
        lastModifiedPalmMuteNode.columnIndex,
        nearestStartNodeIndex,
      );
    }
    // removed "PM Start" node
    else if (lastModifiedPalmMuteNode.prevValue === "start") {
      let pairEndNodeIndex = lastModifiedPalmMuteNode.columnIndex + 1;
      for (
        let i = lastModifiedPalmMuteNode.columnIndex + 1;
        i < subSection.data.length;
        i++
      ) {
        if (subSection.data[i]?.[0] === "end") break;
        pairEndNodeIndex++;
      }

      let nearestPrevEndNodeIndex = lastModifiedPalmMuteNode.columnIndex - 1;
      for (let i = lastModifiedPalmMuteNode.columnIndex - 1; i >= 0; i--) {
        if (subSection.data[i]?.[0] === "end") {
          nearestPrevEndNodeIndex = i + 1;
          break;
        }
        if (nearestPrevEndNodeIndex !== 0) nearestPrevEndNodeIndex--;
      }

      newOpacities.fill("1", nearestPrevEndNodeIndex, pairEndNodeIndex + 1);
    }
    // removed "PM End" node
    else if (lastModifiedPalmMuteNode.prevValue === "end") {
      let pairStartNodeIndex = lastModifiedPalmMuteNode.columnIndex - 1;
      for (let i = lastModifiedPalmMuteNode.columnIndex - 1; i >= 0; i--) {
        if (subSection.data[i]?.[0] === "start") {
          pairStartNodeIndex = i;
          break;
        }
      }

      let nearestNextStartNodeIndex = lastModifiedPalmMuteNode.columnIndex + 1;
      for (
        let i = lastModifiedPalmMuteNode.columnIndex + 1;
        i < subSection.data.length;
        i++
      ) {
        if (subSection.data[i]?.[0] === "start") {
          nearestNextStartNodeIndex = i;
          break;
        }
      }

      newOpacities.fill("1", pairStartNodeIndex, nearestNextStartNodeIndex);
    }

    return newOpacities;
  }, [subSection.data, lastModifiedPalmMuteNode]);

  useEffect(() => {
    if (editingPalmMuteNodes) {
      setPMNodeOpacities(getPMNodeOpacities());
    }
  }, [editingPalmMuteNodes, lastModifiedPalmMuteNode, getPMNodeOpacities]);

  // should these functions below be in zustand?

  function addNewColumns() {
    setTabData((draft) => {
      const subSection = draft[sectionIndex]!.data[subSectionIndex];
      if (subSection?.type === "tab") {
        for (let i = 0; i < 8; i++) {
          subSection.data.push(
            Array.from({ length: 10 }, (_, index) => {
              if (index === 8) {
                return "1/4th";
              } else if (index === 9) {
                return crypto.randomUUID();
              } else {
                return "";
              }
            }),
          );
        }
      }
    });
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
        setTabData((draft) => {
          const subSection = draft[sectionIndex]!.data[subSectionIndex];

          if (subSection?.type === "tab") {
            subSection.data[lastModifiedPalmMuteNode.columnIndex]![0] = "";
          }
        });
      }
      // otherwise need to traverse to find + remove pair node
      else {
        traverseToRemoveHangingPairNode({
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

    setTabData((draft) => {
      const prevSectionData = draft[sectionIndex]?.data[subSectionIndex];

      if (
        prevSectionData === undefined ||
        prevSectionData.type !== "tab" ||
        typeof active.id !== "string" ||
        typeof over?.id !== "string" ||
        active.id === over.id
      ) {
        return;
      }

      let startIndex = 0;
      let endIndex = 0;

      for (let i = 0; i < prevSectionData.data.length; i++) {
        if (prevSectionData.data[i]?.[9] === active.id) {
          startIndex = i;
        } else if (prevSectionData.data[i]?.[9] === over.id) {
          endIndex = i;
        }
      }

      const startPalmMuteValue = prevSectionData.data[startIndex]?.[0];

      // Get the result from your helpers, mutate in-place instead of reassigning
      const { newSectionData, action, pairPalmMuteIndex } =
        moveAndAssignNewPalmMuteValue({
          sectionData: prevSectionData,
          startIndex,
          endIndex,
        });

      // Copy props from newSectionData into prevSectionData (immer mutability)
      prevSectionData.data = newSectionData.data;

      // Prevent two measure lines next to each other or on ends
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

      // If we are handling palm mute sections, perform the update in-draft
      if (startPalmMuteValue === "start" || startPalmMuteValue === "end") {
        let direction: "left" | "right" = "right";

        if (startIndex > endIndex) {
          direction = "left";
        }

        if (
          action === "destroy" &&
          ((startPalmMuteValue === "start" && endIndex < pairPalmMuteIndex) ||
            (startPalmMuteValue === "end" && endIndex > pairPalmMuteIndex))
        ) {
          direction = direction === "left" ? "right" : "left";
        }

        // Call helper and mutate in place
        const handledSection = handlePreviousPalmMuteSection({
          sectionData: prevSectionData,
          startIndex,
          endIndex,
          direction,
          action,
        });

        // Copy data back to the draft's section
        prevSectionData.data = handledSection.data;
      }
      // Otherwise, data was already mutated in-place above
      // Draft is already mutably updated, just exit
    });
  }

  function handleRepetitionsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newRepetitions =
      e.target.value.length === 0 ? -1 : parseInt(e.target.value);
    if (isNaN(newRepetitions) || newRepetitions > 99) return;

    setTabData((draft) => {
      const subSection = draft[sectionIndex]!.data[subSectionIndex];
      if (subSection?.type === "tab") {
        subSection.repetitions = newRepetitions;
      }
    });
  }

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newBpm = e.target.value.length === 0 ? -1 : parseInt(e.target.value);
    if (isNaN(newBpm) || newBpm > 500) return;

    setTabData((draft) => {
      const subSection = draft[sectionIndex]!.data[subSectionIndex];
      if (subSection?.type === "tab") {
        subSection.bpm = newBpm;
      }
    });
  }

  function handleExtendTabButtonKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
  ) {
    if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const firstNewColumnIndex = subSection.data.length - 1; // this will be the first of the 8 new strums added

      const currentNote = document.getElementById(
        `${sectionIndex}${subSectionIndex}ExtendTabButton`,
      );
      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${firstNewColumnIndex}-3`,
      );

      focusAndScrollIntoView(currentNote, newNoteToFocus);
    } else if (e.key === "Enter") {
      setTabData((draft) => {
        const subSection = draft[sectionIndex]!.data[subSectionIndex];
        if (subSection?.type === "tab") {
          for (let i = 0; i < 8; i++) {
            subSection.data.push(
              Array.from({ length: 10 }, (_, index) => {
                if (index === 8) {
                  return "1/4th";
                } else if (index === 9) {
                  return crypto.randomUUID();
                } else {
                  return "";
                }
              }),
            );
          }
        }
      });

      const firstNewColumnIndex = subSection.data.length;
      setInputIdToFocus(
        `input-${sectionIndex}-${subSectionIndex}-${firstNewColumnIndex}-3`,
      );
    }
  }

  function columnIsBeingPlayed(columnIndex: number) {
    const location = currentlyPlayingMetadata?.[currentChordIndex]?.location;
    if (
      !currentlyPlayingMetadata ||
      !location ||
      audioMetadata.editingLoopRange
    )
      return false;

    const isSameSection =
      location.sectionIndex === sectionIndex &&
      location.subSectionIndex === subSectionIndex;

    const columnIsBeingPlayed =
      isSameSection && location.chordIndex === columnIndex;

    return columnIsBeingPlayed && audioMetadata.playing;
  }

  function columnHasBeenPlayed(columnIndex: number) {
    const location = currentlyPlayingMetadata?.[currentChordIndex]?.location;
    if (!currentlyPlayingMetadata || !location) return false;

    if (audioMetadata.editingLoopRange) {
      const isInSectionBeingLooped = currentlyPlayingMetadata.some(
        (metadata) => {
          return (
            sectionIndex === metadata.location.sectionIndex &&
            subSectionIndex === metadata.location.subSectionIndex &&
            columnIndex === metadata.location.chordIndex
          );
        },
      );

      return isInSectionBeingLooped;
    }

    const correspondingChordIndex = currentlyPlayingMetadata.some(
      (metadata) => {
        return (
          sectionIndex === metadata.location.sectionIndex &&
          subSectionIndex === metadata.location.subSectionIndex &&
          columnIndex === metadata.location.chordIndex
        );
      },
    );

    if (!correspondingChordIndex) return false;

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

  return (
    <motion.div
      key={subSection.id}
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
        padding: aboveMediumViewportWidth ? "2rem" : "1rem 0.5rem 1rem 0.5rem",
      }}
      className="baseVertFlex relative h-full w-full !justify-start gap-1 rounded-md rounded-tl-md border bg-secondary-active/50 shadow-md"
    >
      <div className="baseFlex w-full !items-start">
        <div className="baseVertFlex w-5/6 !items-start gap-4 lg:!flex-row lg:!justify-start">
          <div className="baseFlex gap-2">
            <div className="baseFlex gap-2">
              <div className="baseFlex gap-2">
                <Label htmlFor={`${sectionIndex}${subSectionIndex}bpmInput`}>
                  BPM
                </Label>
                <div className="baseFlex">
                  <QuarterNote className="-ml-1 size-5" />

                  <Input
                    id={`${sectionIndex}${subSectionIndex}bpmInput`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-[52px] px-2.5"
                    placeholder={bpm === -1 ? "" : bpm.toString()}
                    value={
                      subSection.bpm === -1 ? "" : subSection.bpm.toString()
                    }
                    onChange={handleBpmChange}
                  />
                </div>
              </div>

              <Label
                htmlFor={`${sectionIndex}${subSectionIndex}repetitionsInput`}
              >
                Repetitions
              </Label>
              <div className="relative w-12">
                <span className="absolute bottom-[9px] left-2 text-sm">x</span>
                <Input
                  id={`${sectionIndex}${subSectionIndex}repetitionsInput`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-[45px] px-2 pl-4"
                  placeholder="1"
                  value={
                    subSection.repetitions === -1
                      ? ""
                      : subSection.repetitions.toString()
                  }
                  onChange={handleRepetitionsChange}
                />
              </div>
            </div>
          </div>

          <div className="baseVertFlex !items-start gap-2 lg:!flex-row">
            <div className="baseFlex">
              <Button
                disabled={editingPalmMuteNodes}
                style={{
                  borderRadius: editingPalmMuteNodes
                    ? "0.375rem 0 0 0.375rem"
                    : "0.375rem",
                  transitionDelay: "0.1s",
                }}
                onClick={toggleEditingPalmMuteNodes}
              >
                PM Editor
              </Button>

              <AnimatePresence>
                {editingPalmMuteNodes && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{
                      ease: "easeInOut",
                    }}
                  >
                    <Button
                      className="rounded-l-none rounded-r-md px-2 py-0"
                      onClick={toggleEditingPalmMuteNodes}
                    >
                      <motion.div
                        variants={xVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{
                          ease: "easeInOut",
                        }}
                      >
                        <IoClose className="h-6 w-6" />
                      </motion.div>
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="baseFlex">
              <Button
                disabled={reorderingColumns}
                style={{
                  borderRadius: reorderingColumns
                    ? "0.375rem 0 0 0.375rem"
                    : "0.375rem",
                  transitionDelay: "0.1s",
                }}
                onClick={() => {
                  setReorderingColumns(!reorderingColumns);
                  setShowingDeleteColumnsButtons(false);
                }}
              >
                Reorder chords
              </Button>

              <AnimatePresence>
                {reorderingColumns && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{
                      ease: "easeInOut",
                    }}
                  >
                    <Button
                      className="rounded-l-none rounded-r-md px-2 py-0"
                      onClick={() => {
                        setReorderingColumns(!reorderingColumns);
                        setShowingDeleteColumnsButtons(false);
                      }}
                    >
                      <motion.div
                        variants={xVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{
                          ease: "easeInOut",
                        }}
                      >
                        <IoClose className="h-6 w-6" />
                      </motion.div>
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="baseFlex">
              <Button
                variant={"destructive"}
                disabled={showingDeleteColumnsButtons}
                style={{
                  borderRadius: showingDeleteColumnsButtons
                    ? "0.375rem 0 0 0.375rem"
                    : "0.375rem",
                  transitionDelay: "0.1s",
                }}
                className="baseFlex gap-2"
                onClick={() => {
                  setShowingDeleteColumnsButtons(!showingDeleteColumnsButtons);
                  setReorderingColumns(false);
                }}
              >
                Delete chords
                <FaTrashAlt className="h-4 w-4" />
              </Button>

              <AnimatePresence>
                {showingDeleteColumnsButtons && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{
                      ease: "easeInOut",
                    }}
                  >
                    <Button
                      variant={"destructive"}
                      className="rounded-l-none rounded-r-md px-2 py-0"
                      onClick={() => {
                        setShowingDeleteColumnsButtons(
                          !showingDeleteColumnsButtons,
                        );
                        setReorderingColumns(false);
                      }}
                    >
                      <motion.div
                        variants={xVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{
                          ease: "easeInOut",
                        }}
                      >
                        <IoClose className="h-6 w-6" />
                      </motion.div>
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <MiscellaneousControls
          type={"tab"}
          sectionIndex={sectionIndex}
          subSectionIndex={subSectionIndex}
        />
      </div>

      <div className="baseFlex relative w-full flex-wrap !justify-start">
        {editingPalmMuteNodes && (
          <p className="absolute left-[0.4rem] top-6 text-sm italic">PM</p>
        )}

        <div className="baseVertFlex relative h-[280px] rounded-l-2xl border-2 border-foreground p-2">
          <PrettyVerticalTuning tuning={tuning} height={"250px"} />
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
            {subSection.data.map((column, index) => (
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
                    isLastColumn={index === subSection.data.length - 1}
                    columnIsBeingPlayed={columnIsBeingPlayed(index)}
                    columnHasBeenPlayed={columnHasBeenPlayed(index)}
                    durationOfChord={getDurationOfCurrentChord()}
                    pmNodeOpacity={pmNodeOpacities[index] ?? "1"}
                    editingPalmMuteNodes={editingPalmMuteNodes}
                    setEditingPalmMuteNodes={setEditingPalmMuteNodes}
                    lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                    setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
                    reorderingColumns={reorderingColumns}
                    showingDeleteColumnsButtons={showingDeleteColumnsButtons}
                    columnIdxBeingHovered={columnIdxBeingHovered}
                    setColumnIdxBeingHovered={setColumnIdxBeingHovered}
                  />
                )}
              </Fragment>
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <Button
        id={`${sectionIndex}${subSectionIndex}ExtendTabButton`}
        onKeyDown={handleExtendTabButtonKeyDown}
        onClick={addNewColumns}
        className="mt-2"
      >
        Extend tab
      </Button>
    </motion.div>
  );
}

export default TabSection;
