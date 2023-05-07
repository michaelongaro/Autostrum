import React, { Fragment } from "react";
import TabNote from "./TabNote";
import PalmMuteNode from "./PalmMuteNode";

interface TabColumn {
  columnData: string[];
  sectionIndex: number;
  columnIndex: number;
}

function TabColumn({
  columnData,
  sectionIndex,
  columnIndex,
}: // finalColumnInSection, add later
TabColumn) {
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
                sectionIndex={sectionIndex}
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
                sectionIndex={sectionIndex}
                columnIndex={columnIndex}
                noteIndex={index}
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
                  sectionIndex={sectionIndex}
                  columnIndex={columnIndex}
                  noteIndex={index}
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
