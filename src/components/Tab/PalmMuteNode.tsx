import { useCallback, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";

interface PalmMuteNode {
  note: string;
  effectColumn: boolean;
  columnIndex: number;
  sectionIndex: number;
}

function PalmMuteNode({
  note,
  effectColumn,
  columnIndex,
  sectionIndex,
}: PalmMuteNode) {
  const [hoveringOnPalmMuteNode, setHoveringOnPalmMuteNode] = useState(false);
  const [buttonOpacity, setButtonOpacity] = useState("0");

  const {
    editing,
    tabData,
    setTabData,
    lastModifiedPalmMuteNode,
    setLastModifiedPalmMuteNode,
    editingPalmMuteNodes,
    setEditingPalmMuteNodes,
    modifyPalmMuteDashes,
  } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
      setTabData: state.setTabData,
      lastModifiedPalmMuteNode: state.lastModifiedPalmMuteNode,
      setLastModifiedPalmMuteNode: state.setLastModifiedPalmMuteNode,
      editingPalmMuteNodes: state.editingPalmMuteNodes,
      setEditingPalmMuteNodes: state.setEditingPalmMuteNodes,
      modifyPalmMuteDashes: state.modifyPalmMuteDashes,
    }),
    shallow
  );

  const findColumnIndexOfNearestNode = useCallback(
    (type: "pairNode" | "nearestStart") => {
      let currentIndex =
        type === "pairNode"
          ? lastModifiedPalmMuteNode?.columnIndex
          : (lastModifiedPalmMuteNode?.columnIndex ?? 0) + 1;
      const foundPairNodeColumnIndex = false;

      if (currentIndex === undefined) return 0;

      while (!foundPairNodeColumnIndex) {
        const currentNode = tabData[sectionIndex]!.data[currentIndex]?.[0];

        if (lastModifiedPalmMuteNode?.prevValue === "") {
          if (currentNode === "start") return currentIndex;

          currentIndex++;
        } else if (lastModifiedPalmMuteNode?.prevValue === "start") {
          if (currentNode === "end") return currentIndex;

          currentIndex++;
        } else {
          if (currentNode === "start") return currentIndex;

          currentIndex--;
        }

        if (
          currentIndex < 0 ||
          currentIndex > tabData[sectionIndex]!.data.length - 1
        ) {
          return tabData[sectionIndex]!.data.length - 1;
        }
      }

      return 0;
    },
    [sectionIndex, tabData, lastModifiedPalmMuteNode]
  );

  useEffect(() => {
    setButtonOpacity("1");

    if (!editingPalmMuteNodes && note !== "start" && note !== "end") {
      setButtonOpacity("0");
      return;
    }

    if (
      lastModifiedPalmMuteNode?.prevValue === "" &&
      (columnIndex < lastModifiedPalmMuteNode?.columnIndex ||
        columnIndex >= findColumnIndexOfNearestNode("nearestStart"))
    ) {
      setButtonOpacity("0.25");
    } else {
      if (
        lastModifiedPalmMuteNode?.prevValue === "start" &&
        columnIndex > findColumnIndexOfNearestNode("pairNode")
      ) {
        setButtonOpacity("0.25");
      } else if (
        lastModifiedPalmMuteNode?.prevValue === "end" &&
        columnIndex < findColumnIndexOfNearestNode("pairNode")
      ) {
        setButtonOpacity("0.25");
      }
    }
  }, [
    columnIndex,
    note,
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
        prevValue: note, // value before clicking
        currentValue: note === "start" || note === "end" ? "" : "start", // value after clicking
      });

      if (note === "") {
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
          note
        );
      }
    }

    // removing start node that was just added
    else if (
      (lastModifiedPalmMuteNode.prevValue === "" &&
        lastModifiedPalmMuteNode.columnIndex === columnIndex) ||
      (lastModifiedPalmMuteNode.prevValue !== "" &&
        (note === "start" || note === "end"))
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
        note,
        lastModifiedPalmMuteNode.prevValue
      );

      setLastModifiedPalmMuteNode(null);
    }
  }

  return (
    <>
      {!editing && (note === "start" || note === "end") && (
        <>
          {note === "start" && (
            <div className="baseFlex relative">
              |<i className="absolute left-4 top-0">PM</i>
              <div className="h-[1px] w-4 bg-pink-50"></div>
            </div>
          )}

          {note === "end" && (
            <div className="baseFlex relative">
              <div className="h-[1px] w-4 bg-pink-50"></div>|
            </div>
          )}
        </>
      )}

      {editing && (
        <>
          {(note === "start" ||
            note === "end" ||
            (editingPalmMuteNodes && note === "" && !effectColumn)) && (
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
              {note === "start" && (
                <div className="baseVertFlex text-xs">
                  <span>PM</span>
                  <span>start</span>
                </div>
              )}
              {note === "end" && (
                <div className="baseVertFlex text-xs">
                  <span>PM</span>
                  <span>end</span>
                </div>
              )}
              {editingPalmMuteNodes && note === "" && "+"}
            </Button>
          )}
        </>
      )}

      {note === "-" && <div className="h-[1px] w-full bg-pink-50"></div>}
    </>
  );
}

export default PalmMuteNode;
