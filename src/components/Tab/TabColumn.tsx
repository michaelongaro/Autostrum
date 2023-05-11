import React, { Fragment } from "react";
import TabNote from "./TabNote";
import PalmMuteNode from "./PalmMuteNode";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";

interface TabColumn {
  columnData: string[];
  sectionIndex: number;
  columnIndex: number;
}

function TabColumn({ columnData, sectionIndex, columnIndex }: TabColumn) {
  // need handling for when column is a measure line

  // package in docs if you can make it work + framer motion useId or whatever it is.

  const { editing, tabData } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
    }),
    shallow
  );

  if (tabData[sectionIndex]?.data[columnIndex - 1]?.includes("|")) return null;

  return (
    <div
      style={{
        gap: columnData.includes("|") ? "0rem" : "0.5rem",
      }}
      className="baseVertFlex my-14 gap-2"
      // need the measure line handling to be done here?
    >
      {columnData.map((note, index) => (
        <Fragment key={index}>
          {index === 0 && (
            // this positioning is still a bit off
            <div className="relative h-0 w-full">
              <div className="absolute bottom-0 left-1/2 right-1/2 w-[2rem] -translate-x-1/2">
                <>
                  {/* note sure if this is the best way to do this, but handling specifically
                      for when PM crosses over a measure line. */}
                  {note === "-" ? (
                    <div className="h-[1px] w-full bg-pink-50"></div>
                  ) : (
                    <>
                      {!columnData.includes("|") && (
                        <PalmMuteNode
                          note={note}
                          columnIndex={columnIndex}
                          sectionIndex={sectionIndex}
                        />
                      )}
                    </>
                  )}
                </>
              </div>
            </div>
          )}

          {index > 0 && index < 7 && (
            <div
              style={{
                borderTop: `${
                  index === 1 ? "2px solid rgb(253 242 248)" : "none"
                }`,
                paddingTop: `${
                  index === 1 && !columnData.includes("|") ? "0.45rem" : "0rem"
                }`,
                borderBottom: `${
                  index === 6 ? "2px solid rgb(253 242 248)" : "none"
                }`,
                paddingBottom: `${
                  index === 6 && !columnData.includes("|") ? "0.45rem" : "0rem"
                }`,
              }}
              className="baseFlex"
            >
              <>
                {note === "|" ? (
                  <div
                    style={{
                      height: `${index === 1 || index === 6 ? "46px" : "47px"}`,
                    }}
                    className="baseFlex w-[2px] bg-pink-50"
                    onMouseEnter={() => console.log("hovering on measure line")}
                  ></div>
                ) : (
                  <>
                    <div className="h-[1px] w-2 bg-pink-50 "></div>
                    <TabNote
                      note={note}
                      sectionIndex={sectionIndex}
                      columnIndex={columnIndex}
                      noteIndex={index}
                    />
                    <div className="h-[1px] w-2 bg-pink-50"></div>
                  </>
                )}
              </>
            </div>
          )}

          {index === 7 && !columnData.includes("|") && (
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
