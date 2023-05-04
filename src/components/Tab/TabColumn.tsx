import React, { Fragment } from "react";
import { type ITabSection } from "./Tab";
import TabNote from "./TabNote";
import PalmMuteNode from "./PalmMuteNode";

interface TabColumn {
  columnData: string[];
  setTabData: React.Dispatch<React.SetStateAction<ITabSection[]>>;
  sectionIndex: number;
  columnIndex: number;
  editing: boolean;
  addingNewPalmMuteSection: boolean;
  setAddingNewPalmMuteSection: React.Dispatch<React.SetStateAction<boolean>>;
  newPalmMuteLocation: number[];
  setNewPalmMuteLocation: React.Dispatch<React.SetStateAction<number[]>>;
}

function TabColumn({
  columnData,
  setTabData,
  sectionIndex,
  columnIndex,
  // finalColumnInSection, add later
  editing,
  addingNewPalmMuteSection,
  setAddingNewPalmMuteSection,
  newPalmMuteLocation,
  setNewPalmMuteLocation,
}: TabColumn) {
  // need handling for when column is a measure line

  return (
    <div
      style={{
        gap: `${columnIndex % 2 === 0 ? "0.5rem" : "0rem"}`,
      }}
      className="baseVertFlex my-4"
    >
      {columnData.map((note, index) => (
        <Fragment key={index}>
          {index === 0 && (
            <div className="baseVertFlex w-full">
              <PalmMuteNode
                note={note}
                columnIndex={columnIndex}
                setTabData={setTabData}
                addingNewPalmMuteSection={addingNewPalmMuteSection}
                setAddingNewPalmMuteSection={setAddingNewPalmMuteSection}
                newPalmMuteLocation={newPalmMuteLocation}
                setNewPalmMuteLocation={setNewPalmMuteLocation}
              />

              <div className="mt-4 h-[2px] w-full bg-pink-50"></div>
            </div>
          )}

          {index > 0 && index < 7 && (
            <div className="baseFlex">
              {/* maybe w-4 needs to go down to w-2 on odd idx? */}
              {columnIndex % 2 === 0 && (
                <div className="h-[1px] w-4 bg-pink-50"></div>
              )}
              <TabNote
                note={note}
                setTabData={setTabData}
                sectionIndex={sectionIndex}
                columnIndex={columnIndex}
                noteIndex={index}
                editing={editing}
              />
              {columnIndex % 2 === 0 && (
                <div className="h-[1px] w-4 bg-pink-50"></div>
              )}
            </div>
          )}

          {index === 7 && (
            <div className="baseVertFlex w-full">
              <div className="mb-4 h-[2px] w-full bg-pink-50"></div>
              {columnIndex % 2 === 0 && (
                <TabNote
                  note={note}
                  setTabData={setTabData}
                  sectionIndex={sectionIndex}
                  columnIndex={columnIndex}
                  noteIndex={index}
                  editing={editing}
                />
              )}
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

export default TabColumn;
