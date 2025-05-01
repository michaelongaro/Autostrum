import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { BsPlus } from "react-icons/bs";
import { useTabStore, type StrummingPattern } from "~/stores/TabStore";
import { addOrRemoveStrummingPatternPalmMuteDashes } from "~/utils/palmMuteHelpers";
import { Button } from "~/components/ui/button";
import type { LastModifiedPalmMuteNodeLocation } from "./TabSection";

interface StrummingPatternPalmMuteNode {
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
  darkMode: boolean;
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
  darkMode,
  viewingInSelectDropdown,
  editing,
}: StrummingPatternPalmMuteNode) {
  const [hoveringOnPalmMuteNode, setHoveringOnPalmMuteNode] = useState(false);

  const { setStrummingPatternBeingEdited } = useTabStore((state) => ({
    setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
  }));

  function getButtonOpacity() {
    if (!editingPalmMuteNodes) {
      if (value === "start" || value === "end") return "1";
      return "0";
    }

    return opacity;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    // tab arrow key navigation (limited to current section, so sectionIdx will stay constant)
    if (e.key === "ArrowDown") {
      e.preventDefault(); // prevent cursor from moving

      const newNoteToFocus = document.getElementById(
        `input-strummingPatternModal-${beatIndex}-1`,
      );

      newNoteToFocus?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const completedSearchOfPalmMuteNodes = false;
      let currentIndex = beatIndex - 1;

      while (!completedSearchOfPalmMuteNodes) {
        // if PM node is reachable and not a connecting node between start & end
        // nodes, then focus the PM node
        if (
          strummingPatternBeingEdited.value.strums[currentIndex]?.palmMute !==
            "-" &&
          getButtonOpacity(
            strummingPatternBeingEdited.value.strums[currentIndex]?.palmMute ??
              "-",
            currentIndex,
          ) === "1"
        ) {
          const newNoteToFocus = document.getElementById(
            `input-strummingPatternModal-${currentIndex}-${0}`,
          );

          newNoteToFocus?.focus();
          return;
        }

        currentIndex--;

        if (currentIndex < 0) return;
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault(); // prevent cursor from moving

      const completedSearchOfPalmMuteNodes = false;
      let currentIndex = beatIndex + 1;

      while (!completedSearchOfPalmMuteNodes) {
        if (currentIndex >= strummingPatternBeingEdited.value.strums.length) {
          const newNoteToFocus = document.getElementById(
            "strummingPatternExtendPatternButton",
          );

          newNoteToFocus?.focus();
          return;
        }

        // if PM node is reachable and not a connecting node between start & end
        // nodes, then focus the PM node
        if (
          strummingPatternBeingEdited.value.strums[currentIndex]?.palmMute !==
            "-" &&
          getButtonOpacity(
            strummingPatternBeingEdited.value.strums[currentIndex]?.palmMute ??
              "-",
            currentIndex,
          ) === "1"
        ) {
          const newNoteToFocus = document.getElementById(
            `input-strummingPatternModal-${currentIndex}-${0}`,
          );

          newNoteToFocus?.focus();
          return;
        }

        currentIndex++;
      }
    }
  }

  function handlePalmMuteNodeClick() {
    // forces edit mode when editing placement of a palm mute node
    if (!editingPalmMuteNodes) setEditingPalmMuteNodes(true);

    if (lastModifiedPalmMuteNode === null) {
      setLastModifiedPalmMuteNode({
        columnIndex: beatIndex,
        prevValue: value, // value before clicking
        currentValue: value === "start" || value === "end" ? "" : "start", // value after clicking
      });

      if (value === "") {
        const newStrummingPattern = {
          ...strummingPatternBeingEdited,
        };

        newStrummingPattern.value.strums[beatIndex]!.palmMute = "start";

        setStrummingPatternBeingEdited(newStrummingPattern);
      } else {
        // removing node + dashes in between
        addOrRemoveStrummingPatternPalmMuteDashes({
          strummingPatternBeingEdited,
          setStrummingPatternBeingEdited,
          startColumnIndex: beatIndex,
          prevValue: value,
        });
      }
    }

    // removing start node that was just added
    //    we know it's a start node because the lastModifiedPalmMuteNode isn't null
    //    and the only available nodes to click on is the corresponding node
    //    to the lastModifiedPalmMuteNode
    else if (
      (lastModifiedPalmMuteNode.prevValue === "" &&
        lastModifiedPalmMuteNode.columnIndex === beatIndex) ||
      (lastModifiedPalmMuteNode.prevValue !== "" &&
        (value === "start" || value === "end"))
    ) {
      const newStrummingPattern = {
        ...strummingPatternBeingEdited,
      };

      newStrummingPattern.value.strums[beatIndex]!.palmMute = "";

      setStrummingPatternBeingEdited(newStrummingPattern);
      setLastModifiedPalmMuteNode(null);
    }

    // adding end node
    else {
      // adding node + dashes in between
      addOrRemoveStrummingPatternPalmMuteDashes({
        strummingPatternBeingEdited,
        setStrummingPatternBeingEdited,
        startColumnIndex: beatIndex,
        prevValue: value,
        pairNodeValue: lastModifiedPalmMuteNode.prevValue,
      });

      setLastModifiedPalmMuteNode(null);
    }
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
              className="baseFlex relative w-full !flex-nowrap"
            >
              <div
                className={`h-4 w-[1px] flex-shrink-0 ${
                  darkMode ? "bg-foreground" : "bg-background"
                }`}
              ></div>
              <div
                className={`h-[1px] w-1 flex-shrink-0 ${darkMode ? "bg-foreground" : "bg-background"}`}
              ></div>
              <i className="mx-[0.125rem] flex-shrink-0">PM</i>
              <div
                className={`h-[1px] w-full ${
                  darkMode ? "bg-foreground" : "bg-background"
                }`}
              ></div>
            </div>
          )}

          {value === "end" && (
            <div className="baseFlex relative my-1 w-full !flex-nowrap">
              <div
                className={`h-[1px] w-full ${
                  darkMode ? "bg-foreground" : "bg-background"
                }`}
              ></div>
              <div
                className={`h-4 w-[1px] ${
                  darkMode ? "bg-foreground" : "bg-background"
                }`}
              ></div>
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
              style={{
                pointerEvents: getButtonOpacity() === "1" ? "all" : "none",
                boxShadow: hoveringOnPalmMuteNode
                  ? "0 0 2px 2px hsl(324, 77%, 95%)"
                  : "",
                opacity: getButtonOpacity(),
              }}
              size={"sm"}
              className="min-w-[2.25rem] rounded-full px-1 py-0 transition-all"
              onMouseEnter={() => setHoveringOnPalmMuteNode(true)}
              onTouchStart={() => setHoveringOnPalmMuteNode(true)}
              onMouseLeave={() => setHoveringOnPalmMuteNode(false)}
              onTouchEnd={() => setHoveringOnPalmMuteNode(false)}
              onKeyDown={handleKeyDown}
              onClick={handlePalmMuteNodeClick}
            >
              {value === "start" && (
                <div className="baseVertFlex text-[0.65rem]">
                  <span className="h-[13px] leading-[1.35]">PM</span>
                  <span className="h-[13px] leading-[1.35]">start</span>
                </div>
              )}
              {value === "end" && (
                <div className="baseVertFlex text-[0.65rem]">
                  <span className="h-[13px] leading-[1.35]">PM</span>
                  <span className="h-[13px] leading-[1.35]">end</span>
                </div>
              )}
              {editingPalmMuteNodes && value === "" && (
                <BsPlus className="h-5 w-5" />
              )}
            </Button>
          )}
        </>
      )}

      {value === "-" && (
        <div
          // height may have to be conditional based on if it is being edited or not
          style={{
            margin: editing ? "1.1rem 0" : "0.75rem 0", // guessing on 0.75rem value
          }}
          className={`h-[1px] w-full ${
            darkMode
              ? "bg-foreground"
              : !editing || !editingPalmMuteNodes || getButtonOpacity() === "1"
                ? "bg-background"
                : "bg-background/50"
          }`}
        ></div>
      )}
    </>
  );
}

export default StrummingPatternPalmMuteNode;
