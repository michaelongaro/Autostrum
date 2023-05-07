import { useEffect, useState } from "react";
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
    lastModifiedHangingNode,
    setLastModifiedHangingNode,
    editingPalmMuteNodes,
    setEditingPalmMuteNodes,
  } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
      setTabData: state.setTabData,
      lastModifiedHangingNode: state.lastModifiedHangingNode,
      setLastModifiedHangingNode: state.setLastModifiedHangingNode,
      editingPalmMuteNodes: state.editingPalmMuteNodes,
      setEditingPalmMuteNodes: state.setEditingPalmMuteNodes,
    }),
    shallow
  );

  useEffect(() => {
    if (editingPalmMuteNodes || note === "start" || note === "end") {
      if (lastModifiedHangingNode !== null) {
        if (
          lastModifiedHangingNode.currentValue === "start" &&
          columnIndex < lastModifiedHangingNode.columnIndex
        ) {
          setButtonOpacity("0.25");
        } else if (
          lastModifiedHangingNode.currentValue === "end" &&
          columnIndex > lastModifiedHangingNode.columnIndex
        ) {
          setButtonOpacity("0.25");
        }
      } else {
        setButtonOpacity("1");
      }
    } else {
      setButtonOpacity("0");
    }
  }, [columnIndex, note, editingPalmMuteNodes, lastModifiedHangingNode]);

  function handlePalmMuteNodeClick() {
    if (lastModifiedHangingNode === null) {
      // forces edit mode when editing placement of a palm mute node
      if (!editingPalmMuteNodes) setEditingPalmMuteNodes(true);

      setLastModifiedHangingNode({
        columnIndex,
        prevValue: note, // value before clicking
        currentValue: note === "start" || note === "end" ? "" : "start", // value after clicking
      });

      // modify tabData here
      const newTabData = [...tabData];
      newTabData[sectionIndex]!.data[columnIndex]![0] =
        note === "start" || note === "end" ? "" : "start";
      setTabData(newTabData);
    } else {
      const newTabData = [...tabData];

      // ideally want to allow even just a singular palm mute node too...

      // startColumnIndex < endColumnIndex: loop over all columns in between start and end palm mute nodes
      if (columnIndex > lastModifiedHangingNode.columnIndex) {
        for (
          let i = lastModifiedHangingNode.columnIndex;
          i <= columnIndex;
          i++
        ) {
          let value = "-";
          if (i === lastModifiedHangingNode.columnIndex) {
            value = "start";
          } else if (i === columnIndex) {
            value = "end";
          }

          newTabData[sectionIndex]!.data[i]![0] = value;
        }
      } else {
        // endColumnIndex < startColumnIndex: loop over all columns in between start and end palm mute nodes
        for (
          let i = columnIndex;
          i <= lastModifiedHangingNode.columnIndex;
          i++
        ) {
          let value = "-";
          if (i === columnIndex) {
            value = "start";
          } else if (i === lastModifiedHangingNode.columnIndex) {
            value = "end";
          }

          newTabData[sectionIndex]!.data[i]![0] = value;
        }
      }

      setTabData(newTabData);
      setEditingPalmMuteNodes(false);
      setLastModifiedHangingNode(null);
    }
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
                  boxShadow:
                    lastModifiedHangingNode?.columnIndex === columnIndex ||
                    hoveringOnPalmMuteNode
                      ? "0 0 5px 2px #FFF"
                      : "",
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
