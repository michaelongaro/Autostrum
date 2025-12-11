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
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { PrettyVerticalTuning } from "~/components/ui/PrettyTuning";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useTabSubSectionData } from "~/hooks/useTabDataSelectors";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import {
  useTabStore,
  type TabSection as TabSectionType,
} from "~/stores/TabStore";
import focusAndScrollIntoView from "~/utils/focusAndScrollIntoView";
import {
  EighthNote,
  HalfNote,
  QuarterNote,
  SixteenthNote,
  WholeNote,
} from "~/utils/noteLengthIcons";
import { traverseToRemoveHangingPairNode } from "~/utils/palmMuteHelpers";
import {
  createTabNote,
  getPalmMuteValue,
  isTabMeasureLine,
  isTabNote,
  setPalmMuteValue,
} from "~/utils/tabNoteHelpers";
import MiscellaneousControls from "./MiscellaneousControls";
import TabMeasureLine from "./TabMeasureLine";
import TabNotesColumn from "./TabNotesColumn";

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
    transition: {
      ease: "easeInOut" as const,
      duration: 0.35,
    },
  },
  closed: {
    opacity: 0,
    scale: 0.75,
    transition: {
      ease: "easeInOut" as const,
      duration: 0.35,
    },
  },
};

const xVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      delay: 0,
      duration: 0.25,
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
  hidden: { width: 0, opacity: 0, zIndex: -1 },
  visible: {
    width: "auto",
    opacity: 1,
    zIndex: 1,
    transition: {
      duration: 0.2,
    },
  },
  exit: {
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

  const [showNoteLengthChangeDialog, setShowNoteLengthChangeDialog] =
    useState(false);
  const [noteLengthChangeType, setNoteLengthChangeType] = useState<
    "onlyUnchanged" | "all"
  >("onlyUnchanged");
  const [proposedNoteLength, setProposedNoteLength] = useState<
    "whole" | "half" | "quarter" | "eighth" | "sixteenth" | null
  >(null);

  const containerRef = useRef<HTMLDivElement>(null);

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
    return subSection.data.map((column) => column.id);
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

    const getPalmMute = (index: number) => {
      const col = subSection.data[index];
      return col && isTabNote(col) ? col.palmMute : "";
    };

    // Case 1: Added new "PM Start" node - show valid end positions
    if (lastModifiedPalmMuteNode.prevValue === "") {
      // The start node itself should be fully visible (to allow cancel)
      newOpacities[lastModifiedPalmMuteNode.columnIndex] = "1";

      // Find the nearest existing "start" node to the right (can't place end past it)
      let nearestStartNodeIndex = subSection.data.length;
      for (
        let i = lastModifiedPalmMuteNode.columnIndex + 1;
        i < subSection.data.length;
        i++
      ) {
        const pm = getPalmMute(i);
        if (pm === "start") {
          nearestStartNodeIndex = i;
          break;
        }
      }

      // Enable all empty nodes between the new start and the nearest start node/end of section
      for (
        let i = lastModifiedPalmMuteNode.columnIndex + 1;
        i < nearestStartNodeIndex;
        i++
      ) {
        const pm = getPalmMute(i);
        // Only enable empty nodes (and the start node we placed)
        if (pm === "" || i === lastModifiedPalmMuteNode.columnIndex) {
          newOpacities[i] = "1";
        }
      }
    }

    // Case 2: Removed "PM Start" node - enable all nodes to the left (until an end node is found) and all the way right until the pair end node is found.
    else if (lastModifiedPalmMuteNode.prevValue === "start") {
      // The removed start node should be visible (to allow cancel/restore)
      newOpacities[lastModifiedPalmMuteNode.columnIndex] = "1";

      // Enable all empty nodes to the left until an "end" node is found
      for (let i = lastModifiedPalmMuteNode.columnIndex - 1; i >= 0; i--) {
        const pm = getPalmMute(i);
        if (pm === "end") {
          break;
        }
        newOpacities[i] = "1";
      }
      // Enable all empty nodes to the right until the pair "end" node is found
      for (
        let i = lastModifiedPalmMuteNode.columnIndex + 1;
        i < subSection.data.length;
        i++
      ) {
        const pm = getPalmMute(i);
        if (pm === "end") {
          newOpacities[i] = "1";
          break;
        }
        newOpacities[i] = "1";
      }
    }

    // Case 3: Removed "PM End" node - enable all nodes to the right (until a start node is found) and all the way left until the pair start node is found.
    else if (lastModifiedPalmMuteNode.prevValue === "end") {
      // The removed end node should be visible (to allow cancel/restore)
      newOpacities[lastModifiedPalmMuteNode.columnIndex] = "1";

      // Enable all empty nodes to the right until a "start" node is found
      for (
        let i = lastModifiedPalmMuteNode.columnIndex + 1;
        i < subSection.data.length;
        i++
      ) {
        const pm = getPalmMute(i);
        if (pm === "start") {
          break;
        }
        newOpacities[i] = "1";
      }
      // Enable all empty nodes to the left until the pair "start" node is found
      for (let i = lastModifiedPalmMuteNode.columnIndex - 1; i >= 0; i--) {
        const pm = getPalmMute(i);
        if (pm === "start") {
          newOpacities[i] = "1";
          break;
        }
        newOpacities[i] = "1";
      }
    }

    return newOpacities;
  }, [subSection.data, lastModifiedPalmMuteNode]);

  useEffect(() => {
    if (editingPalmMuteNodes) {
      setPMNodeOpacities(getPMNodeOpacities());
    }
  }, [editingPalmMuteNodes, lastModifiedPalmMuteNode, getPMNodeOpacities]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        !containerRef.current?.contains(document.activeElement) &&
        // mouse isn't within this container
        !containerRef.current?.matches(":hover")
      ) {
        return;
      }

      if (e.altKey && e.key === "r") {
        e.preventDefault();
        setReorderingColumns((prev) => !prev);
        setShowingDeleteColumnsButtons(false);
        setEditingPalmMuteNodes(false);
      } else if (e.altKey && e.key === "d") {
        e.preventDefault();
        setShowingDeleteColumnsButtons((prev) => !prev);
        setReorderingColumns(false);
        setEditingPalmMuteNodes(false);
      } else if (e.altKey && e.key === "p") {
        e.preventDefault();
        setEditingPalmMuteNodes((prev) => !prev);
        setLastModifiedPalmMuteNode(null);
        setReorderingColumns(false);
        setShowingDeleteColumnsButtons(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // should these functions below be in zustand?

  function addNewColumns() {
    setTabData((draft) => {
      const subSection = draft[sectionIndex]!.data[subSectionIndex];
      if (subSection?.type === "tab") {
        for (let i = 0; i < 8; i++) {
          subSection.data.push(
            createTabNote({
              noteLength: subSection.baseNoteLength,
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
      const column = newSectionData.data[currentIndex];
      const value = column ? getPalmMuteValue(column) : "";

      // landed outside of a pm section, but broke prev pm section
      if (value === initialPalmMuteValue) {
        const endColumn = newSectionData.data[endIndex];
        if (endColumn) setPalmMuteValue(endColumn, "");
        action = "destroy";
        break;
      }

      // landed inside of a pm section, but broke prev pm section
      if (
        ((initialPalmMuteValue === "start" && value === "end") ||
          (initialPalmMuteValue === "end" && value === "start")) &&
        currentIndex !== pairPalmMuteIndex
      ) {
        const endColumn = newSectionData.data[endIndex];
        if (endColumn) setPalmMuteValue(endColumn, "-");
        action = "destroy";
        break;
      }

      // landed outside of a pm section, able to keep prev pm section
      if (currentIndex === pairPalmMuteIndex) {
        if (
          (initialPalmMuteValue === "start" && endIndex > pairPalmMuteIndex) ||
          (initialPalmMuteValue === "end" && endIndex < pairPalmMuteIndex)
        ) {
          const endColumn = newSectionData.data[endIndex];
          if (endColumn) setPalmMuteValue(endColumn, "");
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
    const startColumn = sectionData.data[startIndex];
    const initialPalmMuteValue = startColumn
      ? getPalmMuteValue(startColumn)
      : "";
    let pairPalmMuteIndex = -1;

    if (initialPalmMuteValue === "start") {
      // initial thought was to start +1 from startIndex, but I'm not sure that's necessary
      let index = startIndex;
      while (index < sectionData.data.length) {
        const col = sectionData.data[index];
        if (col && getPalmMuteValue(col) === "end") {
          pairPalmMuteIndex = index;
          break;
        }
        index++;
      }
    } else if (initialPalmMuteValue === "end") {
      let index = startIndex;
      while (index >= 0) {
        const col = sectionData.data[index];
        if (col && getPalmMuteValue(col) === "start") {
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
        const col = newSectionData.data[index];
        const colValue = col ? getPalmMuteValue(col) : "";

        if (colValue === "end") {
          const endCol = newSectionData.data[endIndex];
          if (endCol) setPalmMuteValue(endCol, "");
          break;
        }

        if (colValue === "start") {
          const endCol = newSectionData.data[endIndex];
          if (endCol) setPalmMuteValue(endCol, "-");
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
        const endCol = newSectionData.data[endIndex];
        if (endCol) setPalmMuteValue(endCol, "");
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
          const col = sectionData.data[index];
          if (col) setPalmMuteValue(col, "-");

          index--;
        }
      } else {
        while (index < endIndex) {
          const col = sectionData.data[index];
          if (col) setPalmMuteValue(col, "-");

          index++;
        }
      }
    } else if (action === "shrink") {
      // should basically be right, but is copilot generated
      if (direction === "left") {
        while (index > endIndex) {
          const col = sectionData.data[index];
          if (col) setPalmMuteValue(col, "");

          index--;
        }
      } else {
        while (index < endIndex) {
          const col = sectionData.data[index];
          if (col) setPalmMuteValue(col, "");

          index++;
        }
      }
    } else {
      if (direction === "left") {
        while (index >= 0) {
          const col = sectionData.data[index];
          if (col && getPalmMuteValue(col) === "start") {
            setPalmMuteValue(col, "");
            break;
          }

          if (col) setPalmMuteValue(col, "");

          index--;
        }
      } else {
        while (index < sectionData.data.length) {
          const col = sectionData.data[index];
          if (col && getPalmMuteValue(col) === "end") {
            setPalmMuteValue(col, "");
            break;
          }

          if (col) setPalmMuteValue(col, "");

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
            const col = subSection.data[lastModifiedPalmMuteNode.columnIndex];
            if (col) setPalmMuteValue(col, "");
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
        if (prevSectionData.data[i]?.id === active.id) {
          startIndex = i;
        } else if (prevSectionData.data[i]?.id === over.id) {
          endIndex = i;
        }
      }

      const startColumn = prevSectionData.data[startIndex];
      const startPalmMuteValue =
        startColumn && isTabNote(startColumn) ? startColumn.palmMute : "";

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
          (isTabMeasureLine(prevSectionData.data[i]!) &&
            isTabMeasureLine(prevSectionData.data[i + 1]!)) ||
          isTabMeasureLine(prevSectionData.data[0]!) ||
          isTabMeasureLine(
            prevSectionData.data[prevSectionData.data.length - 1]!,
          )
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
            subSection.data.push(createTabNote());
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

  function handleBaseNoteLengthChange(
    newNoteLength: "whole" | "half" | "quarter" | "eighth" | "sixteenth",
  ) {
    setTabData((draft) => {
      const subSection = draft[sectionIndex]!.data[subSectionIndex];
      if (subSection?.type === "tab") {
        subSection.baseNoteLength = newNoteLength;
        for (let i = 0; i < subSection.data.length; i++) {
          const column = subSection.data[i]!;

          // Skip measure lines since they don't have a note length
          if (isTabMeasureLine(column)) continue;

          column.noteLength = newNoteLength;
        }
      }
    });
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
      ref={containerRef}
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
      className="baseVertFlex relative h-full w-full !justify-start gap-1 rounded-md rounded-tl-md border bg-secondary-active/25 shadow-md"
    >
      <div className="baseFlex w-full !items-start">
        <div className="baseVertFlex w-5/6 !items-start gap-4 xl:!flex-row xl:!justify-start">
          <div className="baseFlex gap-2">
            <div className="baseVertFlex !items-start gap-2 sm:!flex-row sm:!items-center">
              <div className="baseFlex gap-2">
                <Label
                  htmlFor={`${sectionIndex}${subSectionIndex}noteLengthSelect`}
                >
                  Note length
                </Label>
                <Select
                  value={subSection.baseNoteLength}
                  onValueChange={handleBaseNoteLengthChange}
                >
                  <SelectTrigger
                    id={`${sectionIndex}${subSectionIndex}noteLengthSelect`}
                    className="w-[135px]"
                  >
                    <SelectValue placeholder="Select a length" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="whole">
                      <div className="baseFlex gap-2">
                        <WholeNote />
                        Whole
                      </div>
                    </SelectItem>
                    <SelectItem value="half">
                      <div className="baseFlex gap-2">
                        <HalfNote />
                        Half
                      </div>
                    </SelectItem>
                    <SelectItem value="quarter">
                      <div className="baseFlex gap-2">
                        <QuarterNote />
                        Quarter
                      </div>
                    </SelectItem>
                    <SelectItem value="eighth">
                      <div className="baseFlex gap-2">
                        <EighthNote />
                        Eighth
                      </div>
                    </SelectItem>
                    <SelectItem value="sixteenth">
                      <div className="baseFlex gap-2">
                        <SixteenthNote />
                        Sixteenth
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

              <div className="baseFlex gap-2">
                <Label
                  htmlFor={`${sectionIndex}${subSectionIndex}repetitionsInput`}
                >
                  Repetitions
                </Label>
                <div className="relative w-12">
                  <span className="pointer-events-none absolute bottom-[9px] left-2 text-sm">
                    x
                  </span>
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
          </div>

          <div className="baseVertFlex !items-start gap-2 sm:!flex-row">
            <div className="baseFlex">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent side={"bottom"}>
                    <p>
                      Toggle: <kbd className="ml-1">Alt</kbd> + <kbd>p</kbd>
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

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
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent side={"bottom"}>
                    <p>
                      Toggle: <kbd className="ml-1">Alt</kbd> + <kbd>r</kbd>
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

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
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={"destructive"}
                      disabled={showingDeleteColumnsButtons}
                      style={{
                        borderRadius: showingDeleteColumnsButtons
                          ? "0.375rem 0 0 0.375rem"
                          : "0.375rem",
                        transitionDelay: "0.1s",
                      }}
                      className="baseFlex"
                      onClick={() => {
                        setShowingDeleteColumnsButtons(
                          !showingDeleteColumnsButtons,
                        );
                        setReorderingColumns(false);
                      }}
                    >
                      Delete chords
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side={"bottom"}>
                    <p>
                      Toggle: <kbd className="ml-1">Alt</kbd> + <kbd>d</kbd>
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

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

      <div className="baseFlex relative mt-4 w-full flex-wrap !items-start !justify-start">
        {editingPalmMuteNodes && (
          <p className="absolute left-[6px] top-[14px] text-sm italic">PM</p>
        )}

        <div className="baseVertFlex">
          <div className="h-[48px]"></div>
          <div className="baseVertFlex relative h-[258px] rounded-l-2xl border-2 border-foreground bg-background/75 p-2">
            <PrettyVerticalTuning tuning={tuning} height={"230px"} />
          </div>
          <div className="h-[74px]"></div>
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
              <Fragment key={column.id}>
                {isTabMeasureLine(column) ? (
                  <TabMeasureLine
                    columnData={column}
                    sectionIndex={sectionIndex}
                    subSectionIndex={subSectionIndex}
                    columnIndex={index}
                    reorderingColumns={reorderingColumns}
                    showingDeleteColumnsButtons={showingDeleteColumnsButtons}
                    columnHasBeenPlayed={columnHasBeenPlayed(index - 1)} // measure lines aren't "played", so tying logic to closest previous column
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
        className="mt-8 px-4"
      >
        Extend tab
      </Button>
    </motion.div>
  );
}

export default TabSection;
