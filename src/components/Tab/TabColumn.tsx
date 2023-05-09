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
    <div className="baseVertFlex my-14 gap-2">
      {columnData.map((note, index) => (
        <Fragment key={index}>
          {index === 0 && (
            // this positioning is still a bit off
            <div className="relative h-0 w-full">
              <div className="absolute bottom-0 left-1/2 right-1/2 w-[2rem] -translate-x-1/2">
                <PalmMuteNode
                  note={note}
                  columnIndex={columnIndex}
                  sectionIndex={sectionIndex}
                />
              </div>
            </div>
          )}

          {index > 0 && index < 7 && (
            <div
              style={{
                borderTop: `${
                  index === 1 ? "2px solid rgb(253 242 248)" : "none"
                }`,
                paddingTop: `${index === 1 ? "0.45rem" : "0rem"}`,
                borderBottom: `${
                  index === 6 ? "2px solid rgb(253 242 248)" : "none"
                }`,
                paddingBottom: `${index === 6 ? "0.45rem" : "0rem"}`,
              }}
              className="baseFlex border-spacing-4"
            >
              <div className="h-[1px] w-2 bg-pink-50 "></div>
              <TabNote
                note={note}
                sectionIndex={sectionIndex}
                columnIndex={columnIndex}
                noteIndex={index}
              />
              <div className="h-[1px] w-2 bg-pink-50"></div>
            </div>
          )}

          {index === 7 && (
            <div className="relative h-0 w-full">
              {columnIndex % 2 === 0 && (
                <div className="absolute left-1/2 right-1/2 top-2 w-[3.35rem] -translate-x-1/2">
                  <TabNote
                    note={note}
                    sectionIndex={sectionIndex}
                    columnIndex={columnIndex}
                    noteIndex={index}
                  />
                </div>
              )}
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

export default TabColumn;
