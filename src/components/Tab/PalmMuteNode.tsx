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
  columnIndex: number;
  sectionIndex: number;
  editingPalmMuteNodes: boolean;
  setEditingPalmMuteNodes: Dispatch<SetStateAction<boolean>>;
  lastModifiedPalmMuteNode: LastModifiedPalmMuteNodeLocation | null;
  setLastModifiedPalmMuteNode: Dispatch<
    SetStateAction<LastModifiedPalmMuteNodeLocation | null>
  >;
}

function PalmMuteNode({
  value,
  columnIndex,
  sectionIndex,
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
}: PalmMuteNode) {
  const [hoveringOnPalmMuteNode, setHoveringOnPalmMuteNode] = useState(false);
  const [buttonOpacity, setButtonOpacity] = useState("0");

  const { editing, tabData, setTabData, modifyPalmMuteDashes } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
      setTabData: state.setTabData,
      modifyPalmMuteDashes: state.modifyPalmMuteDashes,
    }),
    shallow
  );

  const findColumnIndexOfNearestNode = useCallback(
    (searchingFor?: "prevStart" | "prevEnd" | "nextStart" | "nextEnd") => {
      let currentIndex = lastModifiedPalmMuteNode?.columnIndex;
      const foundPairNodeColumnIndex = false;

      // searchingFor being undefined means we are looking for the nearest "start" node

      if (currentIndex === undefined) return 0;

      while (!foundPairNodeColumnIndex) {
        const currentNode = tabData[sectionIndex]!.data[currentIndex]?.[0];

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

        if (currentIndex > tabData[sectionIndex]!.data.length - 1) {
          return tabData[sectionIndex]!.data.length;
        }
      }

      return 0;
    },
    [sectionIndex, tabData, lastModifiedPalmMuteNode]
  );

  useEffect(() => {
    setButtonOpacity("1");

    if (!editingPalmMuteNodes && value !== "start" && value !== "end") {
      setButtonOpacity("0");
      return;
    }

    if (
      lastModifiedPalmMuteNode?.prevValue === "" &&
      (columnIndex < lastModifiedPalmMuteNode?.columnIndex ||
        columnIndex >= findColumnIndexOfNearestNode())
    ) {
      setButtonOpacity("0.25");
    } else {
      if (
        lastModifiedPalmMuteNode?.prevValue === "start" &&
        (columnIndex <= findColumnIndexOfNearestNode("prevEnd") ||
          columnIndex > findColumnIndexOfNearestNode("nextEnd"))
      ) {
        setButtonOpacity("0.25");
      } else if (
        lastModifiedPalmMuteNode?.prevValue === "end" &&
        (columnIndex < findColumnIndexOfNearestNode("prevStart") ||
          columnIndex >= findColumnIndexOfNearestNode("nextStart"))
      ) {
        setButtonOpacity("0.25");
      }
    }
  }, [
    columnIndex,
    sectionIndex,
    value,
    editingPalmMuteNodes,
    lastModifiedPalmMuteNode,
    findColumnIndexOfNearestNode,
  ]);

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
        newTabData[sectionIndex]!.data[columnIndex]![0] = "start";
        setTabData(newTabData);
      } else {
        // removing node + dashes in between
        modifyPalmMuteDashes(
          tabData,
          setTabData,
          sectionIndex,
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
      newTabData[sectionIndex]!.data[columnIndex]![0] = "";
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
              |<i className="absolute -top-3 left-4">PM</i>
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
              style={{
                pointerEvents: buttonOpacity === "1" ? "all" : "none",
                boxShadow: hoveringOnPalmMuteNode ? "0 0 5px 2px #FFF" : "",
                opacity: buttonOpacity,
              }}
              size={"sm"}
              className="min-w-[2.25rem] rounded-full transition-all"
              onMouseEnter={() => setHoveringOnPalmMuteNode(true)}
              onTouchStart={() => setHoveringOnPalmMuteNode(true)}
              onMouseLeave={() => setHoveringOnPalmMuteNode(false)}
              onTouchEnd={() => setHoveringOnPalmMuteNode(false)}
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
