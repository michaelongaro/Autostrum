import React, { Fragment } from "react";
import { type ITabSection } from "./Tab";
import TabNote from "./TabNote";

interface TabColumn {
  columnData: string[];
  setTabData: React.Dispatch<React.SetStateAction<ITabSection[]>>;
  sectionIndex: number;
  columnIndex: number;
}

function TabColumn({
  columnData,
  setTabData,
  sectionIndex,
  columnIndex,
}: TabColumn) {
  // need handling for when column is a measure line

  return (
    <div className="baseVertFlex gap-2">
      {columnData.map((note, index) => (
        <Fragment key={index}>
          {index === 0 && (
            <div className="baseVertFlex w-full">
              <TabNote
                note={note}
                setTabData={setTabData}
                sectionIndex={sectionIndex}
                columnIndex={columnIndex}
                noteIndex={index}
              />
              <div className="mt-4 h-[2px] w-full bg-pink-50"></div>
            </div>
          )}

          {index > 0 && index < 7 && (
            <div className="baseFlex">
              <div className="h-[1px] w-4 bg-pink-50"></div>
              <TabNote
                note={note}
                setTabData={setTabData}
                sectionIndex={sectionIndex}
                columnIndex={columnIndex}
                noteIndex={index}
              />
              <div className="h-[1px] w-4 bg-pink-50"></div>
            </div>
          )}

          {index === 7 && (
            <div className="baseVertFlex w-full">
              <div className="mb-4 h-[2px] w-full bg-pink-50"></div>
              <TabNote
                note={note}
                setTabData={setTabData}
                sectionIndex={sectionIndex}
                columnIndex={columnIndex}
                noteIndex={index}
              />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

export default TabColumn;
