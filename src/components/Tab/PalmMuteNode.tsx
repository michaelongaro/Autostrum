import { useCallback, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";

interface PalmMuteNode {
  note: string;
  columnIndex: number;
  sectionIndex: number;
}

function PalmMuteNode({ note, columnIndex, sectionIndex }: PalmMuteNode) {
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

  const findColumnIndexOfPairNode = useCallback(() => {
    let currentIndex = lastModifiedPalmMuteNode?.columnIndex;
    const foundPairNodeColumnIndex = false;

    if (currentIndex === undefined) return 0;

    while (!foundPairNodeColumnIndex) {
      const currentNode = tabData[sectionIndex]!.data[currentIndex]![0];

      if (lastModifiedPalmMuteNode?.prevValue === "start") {
        if (currentNode === "end") return currentIndex;

        currentIndex++;
      } else {
        if (currentNode === "start") return currentIndex;

        currentIndex--;
      }
    }

    return 0;
  }, [sectionIndex, tabData, lastModifiedPalmMuteNode]);

  useEffect(() => {
    setButtonOpacity("1");

    if (!editingPalmMuteNodes && note !== "start" && note !== "end") {
      setButtonOpacity("0");
      return;
    }

    if (
      lastModifiedPalmMuteNode?.prevValue === "" &&
      columnIndex < lastModifiedPalmMuteNode?.columnIndex
    ) {
      setButtonOpacity("0.25");
    } else {
      if (
        lastModifiedPalmMuteNode?.prevValue === "start" &&
        columnIndex > findColumnIndexOfPairNode()
      ) {
        setButtonOpacity("0.25");
      } else if (
        lastModifiedPalmMuteNode?.prevValue === "end" &&
        columnIndex < findColumnIndexOfPairNode()
      ) {
        setButtonOpacity("0.25");
      }
    }
  }, [
    columnIndex,
    note,
    editingPalmMuteNodes,
    lastModifiedPalmMuteNode,
    findColumnIndexOfPairNode,
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
    } else {
      // adding node + dashes in between
      modifyPalmMuteDashes(
        tabData,
        setTabData,
        sectionIndex,
        columnIndex,
        note,
        lastModifiedPalmMuteNode.prevValue
      );
      setEditingPalmMuteNodes(false);
      setLastModifiedPalmMuteNode(null);
    }

    // setHoveringOnPalmMuteNode(false);
  }

  // opacity still messed up + maybe manually get rid of box shadow after click..

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
            (editingPalmMuteNodes && note === "")) &&
            columnIndex % 2 === 0 && (
              <Button
                style={{
                  pointerEvents: buttonOpacity === "1" ? "all" : "none",
                  boxShadow: hoveringOnPalmMuteNode ? "0 0 5px 2px #FFF" : "",
                  opacity: buttonOpacity,
                }}
                className="rounded-full transition-all"
                onMouseEnter={() => setHoveringOnPalmMuteNode(true)}
                onTouchStart={() => setHoveringOnPalmMuteNode(true)}
                onMouseLeave={() => setHoveringOnPalmMuteNode(false)}
                onTouchEnd={() => setHoveringOnPalmMuteNode(false)}
                onClick={handlePalmMuteNodeClick}
              >
                {note === "start" && (
                  <div className="baseVertFlex text-xs">
                    <span>Remove</span>
                    <span>PM start</span>
                  </div>
                )}
                {note === "end" && (
                  <div className="baseVertFlex text-xs">
                    <span>Remove</span>
                    <span>PM end</span>
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
