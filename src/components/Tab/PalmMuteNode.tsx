import { type Dispatch, type SetStateAction } from "react";
import { BsPlus } from "react-icons/bs";
import { useTabDataGetter, useTabStore } from "~/stores/TabStore";
import {
  applyTabPalmMuteValues,
  editPalmMuteNode,
  getTabPalmMuteValues,
} from "~/utils/palmMuteEditing";
import { Button } from "~/components/ui/button";
import type { LastModifiedPalmMuteNodeLocation } from "./TabSection";
import focusAndScrollIntoView from "~/utils/focusAndScrollIntoView";
import { isTabMeasureLine, getPalmMuteValue } from "~/utils/tabNoteHelpers";

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
  const getTabData = useTabDataGetter();
  const { setTabData } = useTabStore((state) => ({
    setTabData: state.setTabData,
  }));

  function getButtonOpacity() {
    if (!editingPalmMuteNodes) {
      if (value === "start" || value === "end") return "1";
      return "0";
    }

    return opacity;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const currentPalmMuteNode = document.getElementById(
      `input-${sectionIndex}-${subSectionIndex}-${columnIndex}-0`,
    );

    const tabSubSection = getTabData()[sectionIndex]?.data[subSectionIndex];
    const columns = tabSubSection?.type === "tab" ? tabSubSection.data : [];

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
        const currentColumn = columns[currentIndex];
        if (!currentColumn) {
          currentIndex--;
          continue;
        }

        if (isTabMeasureLine(currentColumn)) {
          currentIndex--;
          continue;
        }

        const palmMuteValue = getPalmMuteValue(currentColumn);
        if (palmMuteValue !== "-") {
          const newNoteToFocus = document.getElementById(
            `input-${sectionIndex}-${subSectionIndex}-${currentIndex}-0`,
          );

          if (
            newNoteToFocus instanceof HTMLButtonElement &&
            !newNoteToFocus.disabled
          ) {
            focusAndScrollIntoView(currentPalmMuteNode, newNoteToFocus);
            return;
          }
        }

        currentIndex--;
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();

      let currentIndex = columnIndex + 1;

      while (currentIndex < columns.length) {
        const currentColumn = columns[currentIndex];
        if (!currentColumn) {
          currentIndex++;
          continue;
        }

        if (isTabMeasureLine(currentColumn)) {
          currentIndex++;
          continue;
        }

        const palmMuteValue = getPalmMuteValue(currentColumn);
        if (palmMuteValue !== "-") {
          const newNoteToFocus = document.getElementById(
            `input-${sectionIndex}-${subSectionIndex}-${currentIndex}-0`,
          );

          if (
            newNoteToFocus instanceof HTMLButtonElement &&
            !newNoteToFocus.disabled
          ) {
            focusAndScrollIntoView(currentPalmMuteNode, newNoteToFocus);
            return;
          }
        }

        currentIndex++;
      }

      const newNoteToFocus = document.getElementById(
        `${sectionIndex}${subSectionIndex}ExtendTabButton`,
      );
      focusAndScrollIntoView(currentPalmMuteNode, newNoteToFocus, true);
    }
  }

  function handlePalmMuteNodeClick() {
    const subSection = getTabData()[sectionIndex]?.data[subSectionIndex];
    if (subSection?.type !== "tab") return;
    const result = editPalmMuteNode(
      getTabPalmMuteValues(subSection.data),
      lastModifiedPalmMuteNode,
      columnIndex,
    );
    setTabData((draft) => {
      const current = draft[sectionIndex]?.data[subSectionIndex];
      if (current?.type === "tab")
        applyTabPalmMuteValues(current.data, result.values);
    });
    setLastModifiedPalmMuteNode(result.pending);
    setEditingPalmMuteNodes(true);
  }

  return (
    <>
      {(value === "start" ||
        value === "end" ||
        (editingPalmMuteNodes && value === "")) && (
        <Button
          id={`input-${sectionIndex}-${subSectionIndex}-${columnIndex}-0`}
          disabled={getButtonOpacity() !== "1"}
          onKeyDown={handleKeyDown}
          onClick={handlePalmMuteNodeClick}
          className={`h-7 w-full p-0 transition-all ${editingPalmMuteNodes ? "mx-1" : "group mx-0 bg-transparent !shadow-none"}`}
        >
          {value === "start" && (
            <div className="baseFlex w-full">
              <div
                className={`ml-1 h-[14px] w-[1px] shrink-0 ${editingPalmMuteNodes ? "bg-primary-foreground" : "bg-foreground group-hover:bg-primary-foreground"}`}
              ></div>

              <div
                className={`h-[1px] w-[3px] shrink-0 ${editingPalmMuteNodes ? "bg-primary-foreground" : "bg-foreground group-hover:bg-primary-foreground"}`}
              ></div>

              <i
                className={`mx-[2px] text-xs ${editingPalmMuteNodes ? "text-primary-foreground" : "text-foreground group-hover:text-primary-foreground"}`}
              >
                PM
              </i>

              <div
                className={`h-[1px] w-auto grow ${editingPalmMuteNodes ? "bg-primary-foreground" : "bg-foreground group-hover:bg-primary-foreground"}`}
              ></div>
            </div>
          )}

          {value === "end" && (
            <div className="baseFlex w-full">
              <div
                className={`h-[1px] w-auto grow ${editingPalmMuteNodes ? "bg-primary-foreground" : "bg-foreground group-hover:bg-primary-foreground"}`}
              ></div>

              <div
                className={`mr-1 h-[14px] w-[1px] ${editingPalmMuteNodes ? "bg-primary-foreground" : "bg-foreground group-hover:bg-primary-foreground"}`}
              ></div>
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
