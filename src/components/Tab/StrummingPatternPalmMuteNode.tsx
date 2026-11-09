import { type Dispatch, type SetStateAction } from "react";
import { BsPlus } from "react-icons/bs";
import { useTabStore, type StrummingPattern } from "~/stores/TabStore";
import { editPalmMuteNode } from "~/utils/palmMuteEditing";
import { Button } from "~/components/ui/button";
import type { LastModifiedPalmMuteNodeLocation } from "./TabSection";

interface StrummingPatternPalmMuteNodeProps {
  value: string;
  beatIndex: number;
  strummingPatternBeingEdited: {
    index: number;
    value: StrummingPattern;
  };
  opacity: string;
  editingPalmMuteNodes: boolean;
  setEditingPalmMuteNodes: Dispatch<SetStateAction<boolean>>;
  lastModifiedPalmMuteNode: LastModifiedPalmMuteNodeLocation | null;
  setLastModifiedPalmMuteNode: Dispatch<
    SetStateAction<LastModifiedPalmMuteNodeLocation | null>
  >;
  viewingInSelectDropdown: boolean;
  editing: boolean;
}

function StrummingPatternPalmMuteNode({
  value,
  beatIndex,
  strummingPatternBeingEdited,
  opacity,
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
  viewingInSelectDropdown,
  editing,
}: StrummingPatternPalmMuteNodeProps) {
  const { setStrummingPatternBeingEdited } = useTabStore((state) => ({
    setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
  }));

  function getButtonOpacity() {
    if (!editingPalmMuteNodes) {
      return value === "start" || value === "end" ? "1" : "0";
    }
    return opacity;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const newNoteToFocus = document.getElementById(
        `input-strummingPatternModal-${beatIndex}-1`,
      );
      newNoteToFocus?.focus();
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      navigateToPalmMuteNode(-1);
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      navigateToPalmMuteNode(1);
    }
  }

  function navigateToPalmMuteNode(direction: -1 | 1) {
    let currentIndex = beatIndex + direction;
    const strums = strummingPatternBeingEdited.value.strums;

    while (currentIndex >= 0 && currentIndex < strums.length) {
      const palmMuteValue = strums[currentIndex]?.palmMute;

      if (palmMuteValue !== "-") {
        const newNoteToFocus = document.getElementById(
          `input-strummingPatternModal-${currentIndex}-0`,
        );
        if (
          newNoteToFocus instanceof HTMLButtonElement &&
          !newNoteToFocus.disabled
        ) {
          newNoteToFocus.focus();
          return;
        }
      }

      currentIndex += direction;
    }

    // If navigating right and reached the end, focus extend button
    if (direction === 1) {
      const extendButton = document.getElementById(
        "strummingPatternExtendPatternButton",
      );
      extendButton?.focus();
    }
  }

  function handlePalmMuteNodeClick() {
    const result = editPalmMuteNode(
      strummingPatternBeingEdited.value.strums.map((strum) => strum.palmMute),
      lastModifiedPalmMuteNode,
      beatIndex,
    );
    setStrummingPatternBeingEdited({
      ...strummingPatternBeingEdited,
      value: {
        ...strummingPatternBeingEdited.value,
        strums: strummingPatternBeingEdited.value.strums.map(
          (strum, index) => ({
            ...strum,
            palmMute: result.values[index] ?? "",
          }),
        ),
      },
    });
    setLastModifiedPalmMuteNode(result.pending);
    setEditingPalmMuteNodes(true);
  }

  return (
    <>
      {!editing && (value === "start" || value === "end") && (
        <>
          {value === "start" && (
            <div
              style={{
                margin: viewingInSelectDropdown ? "0.15rem 0" : "0",
              }}
              className="baseFlex relative w-full"
            >
              <div className="ml-1 h-4 w-[1px] flex-shrink-0 bg-current"></div>
              <div className="h-[1px] w-1 flex-shrink-0 bg-current"></div>
              <i className="mx-[2px] flex-shrink-0">PM</i>
              <div className="h-[1px] w-full bg-current"></div>
            </div>
          )}

          {value === "end" && (
            <div className="baseFlex relative my-1 w-full">
              <div className="h-[1px] w-full bg-current"></div>
              <div className="mr-1 h-4 w-[1px] bg-current"></div>
            </div>
          )}
        </>
      )}

      {editing && (
        <>
          {(value === "start" ||
            value === "end" ||
            (editingPalmMuteNodes && value === "")) && (
            <Button
              id={`input-strummingPatternModal-${beatIndex}-0`}
              disabled={getButtonOpacity() !== "1"}
              onKeyDown={handleKeyDown}
              onClick={handlePalmMuteNodeClick}
              className={`my-1 h-7 p-0 transition-all ${editingPalmMuteNodes ? "mx-1 w-[40px]" : "group mx-0 w-full bg-transparent !shadow-none"}`}
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
        </>
      )}

      {value === "-" && (
        <div
          style={{
            margin: editing
              ? editingPalmMuteNodes
                ? "1.1rem 0"
                : "1.1rem 0"
              : "0.7rem 0",
          }}
          className={`h-[1px] w-full ${
            !editing || !editingPalmMuteNodes || getButtonOpacity() === "1"
              ? "bg-current"
              : "bg-foreground/50"
          }`}
        ></div>
      )}
    </>
  );
}

export default StrummingPatternPalmMuteNode;
