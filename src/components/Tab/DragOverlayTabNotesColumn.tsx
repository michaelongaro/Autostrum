import { motion } from "framer-motion";
import { Fragment, type Dispatch, type SetStateAction } from "react";
import PalmMuteNode from "./PalmMuteNode";
import TabNote from "./TabNote";
import type { LastModifiedPalmMuteNodeLocation } from "./TabSection";

interface DragOverlayTabNotesColumn {
  columnData: string[];
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;

  editingPalmMuteNodes: boolean;
  setEditingPalmMuteNodes: Dispatch<SetStateAction<boolean>>;
  lastModifiedPalmMuteNode: LastModifiedPalmMuteNodeLocation | null;
  setLastModifiedPalmMuteNode: Dispatch<
    SetStateAction<LastModifiedPalmMuteNodeLocation | null>
  >;
  reorderingColumns: boolean;
  showingDeleteColumnsButtons: boolean;
}

function DragOverlayTabNotesColumn({
  columnData,
  sectionIndex,
  subSectionIndex,
  columnIndex,

  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
  reorderingColumns,
  showingDeleteColumnsButtons,
}: DragOverlayTabNotesColumn) {
  console.log(columnData);

  return (
    <motion.div
      key={`${columnData[9]!}dragOverlay`}
      // layout={"position"}
      // style={{
      //   // transform: CSS.Transform.toString(transform),
      //   transform: CSS.Transform.toString(
      //     // just testing with Translate intstead of what I think it should be: Transform
      //     transform && { ...transform, scaleY: 1, scaleX: 1 }
      //   ),
      //   transition,
      // }}
      className="baseVertFlex cursor-default scroll-m-8 opacity-25"
    >
      <div className="baseFlex relative">
        <div className="baseVertFlex mb-[3.2rem] mt-4 gap-2">
          {columnData.map((note, index) => (
            <Fragment key={index}>
              {index === 0 && (
                <div className="baseFlex h-9 w-full">
                  <PalmMuteNode
                    value={note}
                    columnIndex={columnIndex}
                    sectionIndex={sectionIndex}
                    subSectionIndex={subSectionIndex}
                    editingPalmMuteNodes={editingPalmMuteNodes}
                    setEditingPalmMuteNodes={setEditingPalmMuteNodes}
                    lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                    setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
                  />
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

                    // maybe also need "flex-basis: content" here if editing?
                  }}
                  className="baseFlex relative w-[60px] basis-[content]"
                >
                  <div
                    style={
                      {
                        // width: editing
                        //   ? relativelyGetColumn(-1)?.[8] === "measureLine"
                        //     ? "4px"
                        //     : "8px"
                        //   : // need to fix logic below
                        //   // relativelyGetColumn(-1)?.[8] === "measureLine" &&
                        //   //   (relativelyGetColumn(0)?.[index]?.length ?? 0) < 2
                        //   (relativelyGetColumn(0)?.[index]?.length ?? 0) > 1
                        //   ? "0px"
                        //   : "1px",
                      }
                    }
                    className="h-[1px] flex-[1] bg-pink-50/50"
                  ></div>

                  <TabNote
                    note={note}
                    sectionIndex={sectionIndex}
                    subSectionIndex={subSectionIndex}
                    columnIndex={columnIndex}
                    noteIndex={index}
                  />

                  <div
                    style={
                      {
                        // width: editing
                        //   ? "8px"
                        //   : `${
                        //       (relativelyGetColumn(0)?.[index]?.length ?? 0) > 1
                        //         ? "0px"
                        //         : "1px"
                        //     }`,
                      }
                    }
                    className="h-[1px] flex-[1] bg-pink-50/50"
                  ></div>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default DragOverlayTabNotesColumn;
