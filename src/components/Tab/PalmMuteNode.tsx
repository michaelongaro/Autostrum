import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Button } from "../ui/button";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import type { LastModifiedPalmMuteNodeLocation } from "./TabSection";

interface PalmMuteNode {
  value: string;
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;
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
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
}: PalmMuteNode) {
  const [hoveringOnPalmMuteNode, setHoveringOnPalmMuteNode] = useState(false);

  const { editing, tabData, setTabData, modifyPalmMuteDashes } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
      setTabData: state.setTabData,
      modifyPalmMuteDashes: state.modifyPalmMuteDashes,
    }),
    shallow
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    // tab arrow key navigation (limited to current section, so sectionIdx will stay constant)
    if (e.key === "ArrowDown") {
      e.preventDefault(); // prevent cursor from moving

      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${columnIndex}-1`
      );

      newNoteToFocus?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const completedSearchOfPalmMuteNodes = false;
      let currentIndex = columnIndex - 1;

      while (!completedSearchOfPalmMuteNodes) {
        // if PM node is reachable and not a connecting node between start & end
        // nodes, then focus the PM node
        if (
          tabData[sectionIndex]!.data[subSectionIndex].data[
            currentIndex
          ]?.[0] !== "-" &&
          getButtonOpacity(
            tabData[sectionIndex]!.data[subSectionIndex].data[
              currentIndex
            ]?.[0] ?? "-",
            currentIndex
          ) === "1"
        ) {
          const newNoteToFocus = document.getElementById(
            `input-${sectionIndex}-${subSectionIndex}-${currentIndex}-${0}`
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
      let currentIndex = columnIndex + 1;

      while (!completedSearchOfPalmMuteNodes) {
        // if PM node is reachable and not a connecting node between start & end
        // nodes, then focus the PM node
        if (
          tabData[sectionIndex]!.data[subSectionIndex].data[
            currentIndex
          ]?.[0] !== "-" &&
          getButtonOpacity(
            tabData[sectionIndex]!.data[subSectionIndex].data[
              currentIndex
            ]?.[0] ?? "-",
            currentIndex
          ) === "1"
        ) {
          const newNoteToFocus = document.getElementById(
            `input-${sectionIndex}-${subSectionIndex}-${currentIndex}-${0}`
          );

          newNoteToFocus?.focus();
          return;
        }

        currentIndex++;

        if (
          currentIndex >
          tabData[sectionIndex]!.data[subSectionIndex]!.data.length
        )
          return;
      }
    }
  }

  const findColumnIndexOfNearestNode = useCallback(
    (searchingFor?: "prevStart" | "prevEnd" | "nextStart" | "nextEnd") => {
      let currentIndex = lastModifiedPalmMuteNode?.columnIndex;
      const foundPairNodeColumnIndex = false;

      // searchingFor being undefined means we are looking for the nearest "start" node

      if (currentIndex === undefined) return 0;

      while (!foundPairNodeColumnIndex) {
        const currentNode =
          tabData[sectionIndex]!.data[subSectionIndex].data[currentIndex]?.[0];

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
          tabData[sectionIndex]!.data[subSectionIndex]!.data.length - 1
        ) {
          return tabData[sectionIndex]!.data[subSectionIndex]!.data.length;
        }
      }

      return 0;
    },
    [sectionIndex, subSectionIndex, tabData, lastModifiedPalmMuteNode]
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
          columnIndex >= findColumnIndexOfNearestNode())
      ) {
        return "0.25";
      }

      if (
        isPrevValueStart &&
        (columnIndex <= findColumnIndexOfNearestNode("prevEnd") ||
          columnIndex > findColumnIndexOfNearestNode("nextEnd"))
      ) {
        return "0.25";
      }

      if (
        isPrevValueEnd &&
        (columnIndex < findColumnIndexOfNearestNode("prevStart") ||
          columnIndex >= findColumnIndexOfNearestNode("nextStart"))
      ) {
        return "0.25";
      }

      return "1";
    },
    [
      editingPalmMuteNodes,
      lastModifiedPalmMuteNode,
      findColumnIndexOfNearestNode,
    ]
  );

  function handlePalmMuteNodeClick() {
    // forces edit mode when editing placement of a palm mute node
    if (!editingPalmMuteNodes) setEditingPalmMuteNodes(true);

    if (lastModifiedPalmMuteNode === null) {
      setLastModifiedPalmMuteNode({
        columnIndex,
        prevValue: value, // value before clicking
        currentValue: value === "start" || value === "end" ? "" : "start", // value after clicking
      });

      if (value === "") {
        const newTabData = [...tabData];
        newTabData[sectionIndex]!.data[subSectionIndex].data[columnIndex]![0] =
          "start";
        setTabData(newTabData);
      } else {
        // removing node + dashes in between
        modifyPalmMuteDashes(
          tabData,
          setTabData,
          sectionIndex,
          subSectionIndex,
          columnIndex,
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
        lastModifiedPalmMuteNode.columnIndex === columnIndex) ||
      (lastModifiedPalmMuteNode.prevValue !== "" &&
        (value === "start" || value === "end"))
    ) {
      const newTabData = [...tabData];
      newTabData[sectionIndex]!.data[subSectionIndex].data[columnIndex]![0] =
        "";
      setTabData(newTabData);
      setLastModifiedPalmMuteNode(null);
    }

    // adding end node
    else {
      // adding node + dashes in between
      modifyPalmMuteDashes(
        tabData,
        setTabData,
        sectionIndex,
        subSectionIndex,
        columnIndex,
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
              id={`input-${sectionIndex}-${subSectionIndex}-${columnIndex}-0`}
              style={{
                pointerEvents:
                  getButtonOpacity(value, columnIndex) === "1" ? "all" : "none",
                boxShadow: hoveringOnPalmMuteNode
                  ? "0 0 5px 2px hsl(327, 73%, 97%)"
                  : "",
                opacity: getButtonOpacity(value, columnIndex),
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

      {value === "-" && <div className="h-[1px] w-full bg-pink-50"></div>}
    </>
  );
}

export default PalmMuteNode;
