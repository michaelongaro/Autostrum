import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Button } from "../ui/button";
import { type StrummingPattern, useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import type { LastModifiedPalmMuteNodeLocation } from "./TabSection";

interface StrummingPatternPalmMuteNode {
  value: string;
  beatIndex: number;
  strummingPatternBeingEdited: {
    index: number;
    value: StrummingPattern;
  };
  editingPalmMuteNodes: boolean;
  setEditingPalmMuteNodes: Dispatch<SetStateAction<boolean>>;
  lastModifiedPalmMuteNode: LastModifiedPalmMuteNodeLocation | null;
  setLastModifiedPalmMuteNode: Dispatch<
    SetStateAction<LastModifiedPalmMuteNodeLocation | null>
  >;
  editing: boolean;
}

function StrummingPatternPalmMuteNode({
  value,
  beatIndex,
  strummingPatternBeingEdited,
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
  editing,
}: StrummingPatternPalmMuteNode) {
  const [hoveringOnPalmMuteNode, setHoveringOnPalmMuteNode] = useState(false);

  const {
    setStrummingPatternBeingEdited,
    modifyStrummingPatternPalmMuteDashes,
  } = useTabStore(
    (state) => ({
      setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
      modifyStrummingPatternPalmMuteDashes:
        state.modifyStrummingPatternPalmMuteDashes,
    }),
    shallow
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    // tab arrow key navigation (limited to current section, so sectionIdx will stay constant)
    if (e.key === "ArrowDown") {
      e.preventDefault(); // prevent cursor from moving

      const newNoteToFocus = document.getElementById(
        `input-strummingPatternModal-${beatIndex}-1`
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
            currentIndex
          ) === "1"
        ) {
          const newNoteToFocus = document.getElementById(
            `input-strummingPatternModal-${currentIndex}-${0}`
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
            "strummingPatternExtendPatternButton"
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
            currentIndex
          ) === "1"
        ) {
          const newNoteToFocus = document.getElementById(
            `input-strummingPatternModal-${currentIndex}-${0}`
          );

          newNoteToFocus?.focus();
          return;
        }

        currentIndex++;
      }
    }
  }

  const findBeatIndexOfNearestNode = useCallback(
    (searchingFor?: "prevStart" | "prevEnd" | "nextStart" | "nextEnd") => {
      let currentIndex = lastModifiedPalmMuteNode?.columnIndex;
      const foundPairNodeBeatIndex = false;

      // searchingFor being undefined means we are looking for the nearest "start" node

      if (currentIndex === undefined) return 0;

      while (!foundPairNodeBeatIndex) {
        const currentNode =
          strummingPatternBeingEdited.value.strums[currentIndex]?.palmMute;

        // it's implied that there shouldn't be an "end" node since we just added the "start" node
        if (lastModifiedPalmMuteNode?.prevValue === "") {
          if (
            currentNode === "start" &&
            currentIndex !== lastModifiedPalmMuteNode?.columnIndex
          )
            return currentIndex;

          currentIndex++;
        } else if (lastModifiedPalmMuteNode?.prevValue === "start") {
          if (currentNode === "end") return currentIndex;

          if (searchingFor === "nextEnd") currentIndex++;
          else if (searchingFor === "prevEnd") currentIndex--;
        } else {
          if (currentNode === "start") return currentIndex;

          if (searchingFor === "nextStart") currentIndex++;
          else if (searchingFor === "prevStart") currentIndex--;
        }

        if (currentIndex < 0) return -1; // or maybe 0
        if (
          currentIndex >
          strummingPatternBeingEdited.value.strums.length - 1
        ) {
          return strummingPatternBeingEdited.value.strums.length;
        }
      }

      return 0;
    },
    [strummingPatternBeingEdited, lastModifiedPalmMuteNode]
  );

  const getButtonOpacity = useCallback(
    (value: string, columnIndex: number) => {
      const isNotEditing =
        !editingPalmMuteNodes && value !== "start" && value !== "end";
      const isPrevValueStart = lastModifiedPalmMuteNode?.prevValue === "start";
      const isPrevValueEnd = lastModifiedPalmMuteNode?.prevValue === "end";

      if (isNotEditing) return "0";

      if (
        lastModifiedPalmMuteNode?.prevValue === "" &&
        (columnIndex < lastModifiedPalmMuteNode?.columnIndex ||
          columnIndex >= findBeatIndexOfNearestNode())
      ) {
        return "0.25";
      }

      if (
        isPrevValueStart &&
        (columnIndex <= findBeatIndexOfNearestNode("prevEnd") ||
          columnIndex > findBeatIndexOfNearestNode("nextEnd"))
      ) {
        return "0.25";
      }

      if (
        isPrevValueEnd &&
        (columnIndex < findBeatIndexOfNearestNode("prevStart") ||
          columnIndex >= findBeatIndexOfNearestNode("nextStart"))
      ) {
        return "0.25";
      }

      return "1";
    },
    [editingPalmMuteNodes, lastModifiedPalmMuteNode, findBeatIndexOfNearestNode]
  );

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
        modifyStrummingPatternPalmMuteDashes(
          strummingPatternBeingEdited,
          setStrummingPatternBeingEdited,
          beatIndex,
          value
        );
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
      modifyStrummingPatternPalmMuteDashes(
        strummingPatternBeingEdited,
        setStrummingPatternBeingEdited,
        beatIndex,
        value,
        lastModifiedPalmMuteNode.prevValue
      );
      setLastModifiedPalmMuteNode(null);
    }
  }

  return (
    <>
      {!editing && (value === "start" || value === "end") && (
        <>
          {value === "start" && (
            <div className="baseFlex relative w-full !flex-nowrap">
              |<i className="absolute -top-3 left-3">PM</i>
              <div className="h-[1px] w-full bg-pink-50"></div>
            </div>
          )}

          {value === "end" && (
            <div className="baseFlex relative w-full !flex-nowrap">
              <div className="h-[1px] w-full bg-pink-50"></div>|
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
                pointerEvents:
                  getButtonOpacity(value, beatIndex) === "1" ? "all" : "none",
                boxShadow: hoveringOnPalmMuteNode
                  ? "0 0 5px 2px hsl(327, 73%, 97%)"
                  : "",
                opacity: getButtonOpacity(value, beatIndex),
              }}
              size={"sm"}
              className="min-w-[2.25rem] rounded-full transition-all"
              onMouseEnter={() => setHoveringOnPalmMuteNode(true)}
              onTouchStart={() => setHoveringOnPalmMuteNode(true)}
              onMouseLeave={() => setHoveringOnPalmMuteNode(false)}
              onTouchEnd={() => setHoveringOnPalmMuteNode(false)}
              onKeyDown={handleKeyDown}
              onClick={handlePalmMuteNodeClick}
            >
              {value === "start" && (
                <div className="baseVertFlex text-xs">
                  <span>PM</span>
                  <span>start</span>
                </div>
              )}
              {value === "end" && (
                <div className="baseVertFlex text-xs">
                  <span>PM</span>
                  <span>end</span>
                </div>
              )}
              {editingPalmMuteNodes && value === "" && "+"}
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
          className="h-[1px] w-full bg-pink-50"
        ></div>
      )}
    </>
  );
}

export default StrummingPatternPalmMuteNode;
