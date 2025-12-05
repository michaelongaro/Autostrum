import { type Dispatch, type SetStateAction } from "react";
import { BsPlus } from "react-icons/bs";
import { useTabStore } from "~/stores/TabStore";
import { addOrRemovePalmMuteDashes } from "~/utils/palmMuteHelpers";
import { Button } from "~/components/ui/button";
import type { LastModifiedPalmMuteNodeLocation } from "./TabSection";
import focusAndScrollIntoView from "~/utils/focusAndScrollIntoView";
import { useTabSubSectionData } from "~/hooks/useTabDataSelectors";
import type { Section } from "~/stores/TabStore";
import {
  isTabMeasureLine,
  isTabNote,
  getPalmMuteValue,
  setPalmMuteValue,
} from "~/utils/tabNoteHelpers";

interface PalmMuteNode {
  value: string;
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;
  opacity: string;
  editingPalmMuteNodes: boolean;
  setEditingPalmMuteNodes: Dispatch<SetStateAction<boolean>>;
  lastModifiedPalmMuteNode: LastModifiedPalmMuteNodeLocation | null;
  setLastModifiedPalmMuteNode: Dispatch<
    SetStateAction<LastModifiedPalmMuteNodeLocation | null>
  >;
}

function PalmMuteNode({
  value,
  sectionIndex,
  subSectionIndex,
  columnIndex,
  opacity,
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
}: PalmMuteNode) {
  const { setTabData } = useTabStore((state) => ({
    setTabData: state.setTabData,
  }));

  const subSection = useTabSubSectionData(sectionIndex, subSectionIndex);

  function getButtonOpacity() {
    if (!editingPalmMuteNodes) {
      if (value === "start" || value === "end") return "1";
      return "0";
    }

    return opacity;
  }

  function getButtonOpacityForIndex(palmMuteValue: string) {
    if (!editingPalmMuteNodes) {
      if (palmMuteValue === "start" || palmMuteValue === "end") return "1";
      return "0";
    }

    return opacity;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const currentPalmMuteNode = document.getElementById(
      `input-${sectionIndex}-${subSectionIndex}-${columnIndex}-0`,
    );

    if (e.key === "ArrowDown") {
      e.preventDefault();

      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${columnIndex}-1`,
      );

      focusAndScrollIntoView(currentPalmMuteNode, newNoteToFocus);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();

      let currentIndex = columnIndex - 1;

      while (currentIndex >= 0) {
        const currentColumn = subSection.data[currentIndex];
        if (!currentColumn) {
          currentIndex--;
          continue;
        }

        if (isTabMeasureLine(currentColumn)) {
          currentIndex--;
          continue;
        }

        const palmMuteValue = getPalmMuteValue(currentColumn);
        if (
          palmMuteValue !== "-" &&
          getButtonOpacityForIndex(palmMuteValue) === "1"
        ) {
          const newNoteToFocus = document.getElementById(
            `input-${sectionIndex}-${subSectionIndex}-${currentIndex}-0`,
          );

          focusAndScrollIntoView(currentPalmMuteNode, newNoteToFocus);
          return;
        }

        currentIndex--;
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();

      let currentIndex = columnIndex + 1;

      while (currentIndex < subSection.data.length) {
        const currentColumn = subSection.data[currentIndex];
        if (!currentColumn) {
          currentIndex++;
          continue;
        }

        if (isTabMeasureLine(currentColumn)) {
          currentIndex++;
          continue;
        }

        const palmMuteValue = getPalmMuteValue(currentColumn);
        if (
          palmMuteValue !== "-" &&
          getButtonOpacityForIndex(palmMuteValue) === "1"
        ) {
          const newNoteToFocus = document.getElementById(
            `input-${sectionIndex}-${subSectionIndex}-${currentIndex}-0`,
          );

          focusAndScrollIntoView(currentPalmMuteNode, newNoteToFocus);
          return;
        }

        currentIndex++;
      }

      const newNoteToFocus = document.getElementById(
        `${sectionIndex}${subSectionIndex}ExtendTabButton`,
      );
      focusAndScrollIntoView(currentPalmMuteNode, newNoteToFocus);
    }
  }

  function findPairNodeIndex(
    startIndex: number,
    nodeType: "start" | "end",
  ): number {
    if (nodeType === "start") {
      // Find the corresponding "end" node to the right
      for (let i = startIndex + 1; i < subSection.data.length; i++) {
        const col = subSection.data[i];
        if (col && isTabNote(col) && col.palmMute === "end") {
          return i;
        }
      }
    } else {
      // Find the corresponding "start" node to the left
      for (let i = startIndex - 1; i >= 0; i--) {
        const col = subSection.data[i];
        if (col && isTabNote(col) && col.palmMute === "start") {
          return i;
        }
      }
    }
    return -1;
  }

  // Helper function to get the current subsection safely
  function getCurrentSubSection(
    draft: Section[],
    sectionIndex: number,
    subSectionIndex: number,
  ) {
    const currentSubSection = draft[sectionIndex]?.data[subSectionIndex];
    if (currentSubSection === undefined || currentSubSection.type !== "tab") {
      return null;
    }
    return currentSubSection;
  }

  // Helper to set palm mute value at a specific column
  function setPalmMuteAtColumn(
    draft: Section[],
    sectionIndex: number,
    subSectionIndex: number,
    columnIndex: number,
    newValue: "" | "start" | "end" | "-",
  ) {
    const currentSubSection = getCurrentSubSection(
      draft,
      sectionIndex,
      subSectionIndex,
    );
    if (!currentSubSection) return;

    const column = currentSubSection.data[columnIndex];
    if (column) {
      if (isTabNote(column)) {
        setPalmMuteValue(column, newValue);
      } else if (isTabMeasureLine(column)) {
        column.isInPalmMuteSection = newValue !== "";
      }
    }
  }

  // Helper to clear a range of palm mute values
  function clearPalmMuteRange(
    draft: Section[],
    sectionIndex: number,
    subSectionIndex: number,
    startIdx: number,
    endIdx: number,
  ) {
    const currentSubSection = getCurrentSubSection(
      draft,
      sectionIndex,
      subSectionIndex,
    );
    if (!currentSubSection) return;

    for (let i = startIdx; i <= endIdx; i++) {
      const column = currentSubSection.data[i];
      if (column && isTabNote(column)) {
        setPalmMuteValue(column, "");
      }
    }
  }

  // Helper to set a complete palm mute section (start, dashes, end)
  function setPalmMuteRange(
    draft: Section[],
    sectionIndex: number,
    subSectionIndex: number,
    startIdx: number,
    endIdx: number,
  ) {
    const currentSubSection = getCurrentSubSection(
      draft,
      sectionIndex,
      subSectionIndex,
    );
    if (!currentSubSection) return;

    for (let i = startIdx; i <= endIdx; i++) {
      const column = currentSubSection.data[i];
      if (column) {
        if (i === startIdx) {
          setPalmMuteValue(column, "start");
        } else if (i === endIdx) {
          setPalmMuteValue(column, "end");
        } else {
          setPalmMuteValue(column, "-");
        }
      }
    }
  }

  function handlePalmMuteNodeClick() {
    if (!editingPalmMuteNodes) setEditingPalmMuteNodes(true);

    const isStartingFresh = lastModifiedPalmMuteNode === null;
    const isClickingSameCell =
      lastModifiedPalmMuteNode?.columnIndex === columnIndex;
    const wasEmpty = lastModifiedPalmMuteNode?.prevValue === "";
    const wasNode = lastModifiedPalmMuteNode?.prevValue !== "";

    // Case 1: No active operation - starting fresh
    if (isStartingFresh) {
      if (value === "") {
        // Start NEW palm mute section
        setLastModifiedPalmMuteNode({
          columnIndex,
          prevValue: "",
          currentValue: "start",
        });
        setTabData((draft) => {
          setPalmMuteAtColumn(
            draft,
            sectionIndex,
            subSectionIndex,
            columnIndex,
            "start",
          );
        });
      } else {
        // Begin REMOVAL operation on existing node
        setLastModifiedPalmMuteNode({
          columnIndex,
          prevValue: value,
          currentValue: "",
        });
        addOrRemovePalmMuteDashes({
          setTabData,
          sectionIndex,
          subSectionIndex,
          startColumnIndex: columnIndex,
          prevValue: value,
        });
      }
      return;
    }

    // Case 2: Cancel adding new start - clicked same empty cell again
    if (wasEmpty && isClickingSameCell) {
      setTabData((draft) => {
        setPalmMuteAtColumn(
          draft,
          sectionIndex,
          subSectionIndex,
          columnIndex,
          "",
        );
      });
      setLastModifiedPalmMuteNode(null);
      return;
    }

    // Case 3: Cancel removal - clicked same start/end node again
    if (wasNode && isClickingSameCell) {
      const prevValue = lastModifiedPalmMuteNode.prevValue as "start" | "end";
      setTabData((draft) => {
        setPalmMuteAtColumn(
          draft,
          sectionIndex,
          subSectionIndex,
          columnIndex,
          prevValue,
        );
      });
      addOrRemovePalmMuteDashes({
        setTabData,
        sectionIndex,
        subSectionIndex,
        startColumnIndex: columnIndex,
        prevValue: lastModifiedPalmMuteNode.prevValue,
      });
      return;
    }

    // Case 4: Complete removal - clicked on the PAIR node
    if (wasNode && (value === "start" || value === "end")) {
      const startIdx = Math.min(
        lastModifiedPalmMuteNode.columnIndex,
        columnIndex,
      );
      const endIdx = Math.max(
        lastModifiedPalmMuteNode.columnIndex,
        columnIndex,
      );

      setTabData((draft) => {
        clearPalmMuteRange(
          draft,
          sectionIndex,
          subSectionIndex,
          startIdx,
          endIdx,
        );
      });
      setLastModifiedPalmMuteNode(null);
      return;
    }

    // Case 5: Complete palm mute section (new or altered)
    if (lastModifiedPalmMuteNode.prevValue !== null && value === "") {
      const result = calculatePalmMuteRange(
        lastModifiedPalmMuteNode,
        columnIndex,
        findPairNodeIndex,
      );
      if (!result) return;

      let { startIdx, endIdx, clearRangeStart, clearRangeEnd } = result;

      // Swap if clicked "before" the anchor point
      if (startIdx > endIdx) {
        [startIdx, endIdx] = [endIdx, startIdx];
      }

      setTabData((draft) => {
        // Clear old range if altering existing section
        if (clearRangeStart !== null && clearRangeEnd !== null) {
          const clearStart = Math.min(clearRangeStart, startIdx);
          const clearEnd = Math.max(clearRangeEnd, endIdx);
          clearPalmMuteRange(
            draft,
            sectionIndex,
            subSectionIndex,
            clearStart,
            clearEnd,
          );
        }

        // Set the new range
        setPalmMuteRange(
          draft,
          sectionIndex,
          subSectionIndex,
          startIdx,
          endIdx,
        );
      });

      setLastModifiedPalmMuteNode(null);
    }
  }

  // Helper to calculate the range for Case 5
  function calculatePalmMuteRange(
    lastModified: NonNullable<typeof lastModifiedPalmMuteNode>,
    columnIndex: number,
    findPairNodeIndex: (idx: number, type: "start" | "end") => number,
  ): {
    startIdx: number;
    endIdx: number;
    clearRangeStart: number | null;
    clearRangeEnd: number | null;
  } | null {
    if (
      lastModified.prevValue === "" &&
      lastModified.currentValue === "start"
    ) {
      // Adding new section
      return {
        startIdx: lastModified.columnIndex,
        endIdx: columnIndex,
        clearRangeStart: null,
        clearRangeEnd: null,
      };
    }

    if (lastModified.prevValue === "end") {
      // Moving end node
      const existingStartIdx = findPairNodeIndex(
        lastModified.columnIndex,
        "end",
      );
      if (existingStartIdx === -1) return null;

      return {
        startIdx: existingStartIdx,
        endIdx: columnIndex,
        clearRangeStart: existingStartIdx,
        clearRangeEnd: lastModified.columnIndex,
      };
    }

    if (lastModified.prevValue === "start") {
      // Moving start node
      const existingEndIdx = findPairNodeIndex(
        lastModified.columnIndex,
        "start",
      );
      if (existingEndIdx === -1) return null;

      return {
        startIdx: columnIndex,
        endIdx: existingEndIdx,
        clearRangeStart: lastModified.columnIndex,
        clearRangeEnd: existingEndIdx,
      };
    }

    return null;
  }
  return (
    <>
      {(value === "start" ||
        value === "end" ||
        (editingPalmMuteNodes && value === "")) && (
        <Button
          id={`input-${sectionIndex}-${subSectionIndex}-${columnIndex}-0`}
          disabled={getButtonOpacity() !== "1"}
          size={"sm"}
          onKeyDown={handleKeyDown}
          onClick={handlePalmMuteNodeClick}
          className="min-w-[2.25rem] rounded-full px-1 py-0 transition-all"
        >
          {value === "start" && (
            <div className="baseVertFlex text-[10px]">
              <span className="h-[12px] leading-[1.35]">PM</span>
              <span className="h-[12px] leading-[1.35]">start</span>
            </div>
          )}
          {value === "end" && (
            <div className="baseVertFlex text-[10px]">
              <span className="h-[12px] leading-[1.35]">PM</span>
              <span className="h-[12px] leading-[1.35]">end</span>
            </div>
          )}
          {editingPalmMuteNodes && value === "" && (
            <BsPlus className="size-5" />
          )}
        </Button>
      )}

      {value === "-" && (
        <div
          className={`h-[1px] w-full transition-colors ${
            !editingPalmMuteNodes || getButtonOpacity() === "1"
              ? "bg-foreground"
              : "bg-foreground/50"
          } `}
        ></div>
      )}
    </>
  );
}

export default PalmMuteNode;
