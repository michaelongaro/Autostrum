import { useState } from "react";
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

  const {
    editing,
    tabData,
    setTabData,
    newPalmMuteLocation,
    setNewPalmMuteLocation,
    addingNewPalmMuteSection,
    setAddingNewPalmMuteSection,
  } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
      setTabData: state.setTabData,
      newPalmMuteLocation: state.newPalmMuteLocation,
      setNewPalmMuteLocation: state.setNewPalmMuteLocation,
      addingNewPalmMuteSection: state.addingNewPalmMuteSection,
      setAddingNewPalmMuteSection: state.setAddingNewPalmMuteSection,
    }),
    shallow
  );

  return (
    <>
      {note === "start" ||
        (note === "end" &&
          (editing ? (
            <Button
              style={{
                boxShadow:
                  newPalmMuteLocation[0] === columnIndex ||
                  hoveringOnPalmMuteNode
                    ? "0 0 5px 2px #FFF"
                    : "",
                opacity: addingNewPalmMuteSection
                  ? newPalmMuteLocation[0] > columnIndex
                    ? 0.25
                    : 1
                  : 0,
              }}
              className="rounded-full transition-all"
              onMouseEnter={() => setHoveringOnPalmMuteNode(true)}
              onMouseLeave={() => setHoveringOnPalmMuteNode(false)}
              onClick={() => {
                if (newPalmMuteLocation[0] === -1) {
                  setNewPalmMuteLocation([columnIndex, -1]);
                } else {
                  const newTabData = [...tabData];

                  // ideally want to allow even just a singular palm mute node too...

                  // still prob want to have the horiz lines coming from the main nodes and for odd columns
                  // still have the horiz lines to connect the two nodes fully

                  // should be saved as "start" "-" and "end" respectively

                  // loop over all columns in between start and end palm mute nodes
                  for (let i = newPalmMuteLocation[0]!; i <= columnIndex; i++) {
                    let value = "-";
                    if (i === newPalmMuteLocation[0]!) {
                      value = "start";
                    } else if (i === columnIndex) {
                      value = "end";
                    }

                    newTabData[sectionIndex]!.data[columnIndex]![i] = value;
                  }

                  setTabData(newTabData);
                  setAddingNewPalmMuteSection(false);
                  setNewPalmMuteLocation([-1, -1]);
                }
              }}
            >
              {newPalmMuteLocation[0] === columnIndex ? "PM start" : "PM end"}
            </Button>
          ) : (
            <div className="baseFlex relative">
              |<i className="absolute left-4 top-0">PM</i>
              <div className="h-[1px] w-4 bg-pink-50"></div>
            </div>
          )))}

      {addingNewPalmMuteSection && columnIndex % 2 === 0 && (
        <Button
          style={{
            boxShadow:
              newPalmMuteLocation[0] === columnIndex || hoveringOnPalmMuteNode
                ? "0 0 5px 2px #FFF"
                : "",
            opacity: addingNewPalmMuteSection
              ? newPalmMuteLocation[0] > columnIndex
                ? 0.25
                : 1
              : 0,
          }}
          className="rounded-full transition-all"
          onMouseEnter={() => setHoveringOnPalmMuteNode(true)}
          onMouseLeave={() => setHoveringOnPalmMuteNode(false)}
          onClick={() => {
            if (newPalmMuteLocation[0] === -1) {
              setNewPalmMuteLocation([columnIndex, -1]);
            } else {
              const newTabData = [...tabData];

              // ideally want to allow even just a singular palm mute node too...

              // still prob want to have the horiz lines coming from the main nodes and for odd columns
              // still have the horiz lines to connect the two nodes fully

              // should be saved as "start" "-" and "end" respectively

              // loop over all columns in between start and end palm mute nodes
              for (let i = newPalmMuteLocation[0]!; i <= columnIndex; i++) {
                let value = "-";
                if (i === newPalmMuteLocation[0]!) {
                  value = "start";
                } else if (i === columnIndex) {
                  value = "end";
                }

                newTabData[sectionIndex]!.data[columnIndex]![i] = value;
              }

              setTabData(newTabData);
              setAddingNewPalmMuteSection(false);
              setNewPalmMuteLocation([-1, -1]);
            }
          }}
        >
          {newPalmMuteLocation[0] === columnIndex ? "PM start" : "PM end"}
        </Button>
      )}

      {note === "-" && <div className="h-[1px] w-4 bg-pink-50"></div>}
    </>
  );
}

export default PalmMuteNode;
