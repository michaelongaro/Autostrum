import { useState } from "react";
import type { ITabSection } from "./Tab";
import { Button } from "../ui/button";

interface PalmMuteNode {
  note: string;
  addingNewPalmMuteSection: boolean;
  setAddingNewPalmMuteSection: React.Dispatch<React.SetStateAction<boolean>>;
  newPalmMuteLocation: [number, number];
  setNewPalmMuteLocation: React.Dispatch<
    React.SetStateAction<[number, number]>
  >;
  columnIndex: number;
  setTabData: React.Dispatch<React.SetStateAction<ITabSection[]>>;
  sectionIndex: number;
  editing: boolean;
}

function PalmMuteNode({
  note,
  addingNewPalmMuteSection,
  setAddingNewPalmMuteSection,
  newPalmMuteLocation,
  setNewPalmMuteLocation,
  columnIndex,
  sectionIndex,
  setTabData,
  editing,
}: PalmMuteNode) {
  const [hoveringOnPalmMuteNode, setHoveringOnPalmMuteNode] = useState(false);

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
              onClick={() =>
                setNewPalmMuteLocation((prev) => {
                  if (prev[0] === -1) {
                    return [columnIndex, -1];
                  } else {
                    setAddingNewPalmMuteSection(false);
                    setTabData((prevTabData) => {
                      const newTabData = [...prevTabData];

                      // ideally want to allow even just a singular palm mute node too...

                      // still prob want to have the horiz lines coming from the main nodes and for odd columns
                      // still have the horiz lines to connect the two nodes fully

                      // should be saved as "start" "-" and "end" respectively

                      // loop over all columns in between start and end palm mute nodes
                      for (let i = prev[0]!; i <= columnIndex; i++) {
                        let value = "-";
                        if (i === prev[0]!) {
                          value = "start";
                        } else if (i === columnIndex) {
                          value = "end";
                        }

                        newTabData[sectionIndex]!.data[columnIndex]![i] = value;
                      }
                      return newTabData;
                    });
                    return [-1, -1];
                  }
                })
              }
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
          onClick={() =>
            setNewPalmMuteLocation((prev) => {
              if (prev[0] === -1) {
                return [columnIndex, -1];
              } else {
                setAddingNewPalmMuteSection(false);
                setTabData((prevTabData) => {
                  const newTabData = [...prevTabData];

                  // ideally want to allow even just a singular palm mute node too...

                  // still prob want to have the horiz lines coming from the main nodes and for odd columns
                  // still have the horiz lines to connect the two nodes fully

                  // should be saved as "start" "-" and "end" respectively

                  // loop over all columns in between start and end palm mute nodes
                  for (let i = prev[0]!; i <= columnIndex; i++) {
                    let value = "-";
                    if (i === prev[0]!) {
                      value = "start";
                    } else if (i === columnIndex) {
                      value = "end";
                    }

                    newTabData[sectionIndex]!.data[columnIndex]![i] = value;
                  }
                  return newTabData;
                });
                return [-1, -1];
              }
            })
          }
        >
          {newPalmMuteLocation[0] === columnIndex ? "PM start" : "PM end"}
        </Button>
      )}

      {note === "-" && <div className="h-[1px] w-4 bg-pink-50"></div>}
    </>
  );
}

export default PalmMuteNode;
