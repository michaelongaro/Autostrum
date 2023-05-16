import { Fragment } from "react";
import TabNote from "./TabNote";
import PalmMuteNode from "./PalmMuteNode";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { type TabColumn } from "./TabColumn";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function TabNoteAndEffectCombo({
  id,
  columnData,
  sectionIndex,
  columnIndex,
}: TabColumn) {
  // need handling for when column is a measure line

  // package in docs if you can make it work + framer motion useId or whatever it is.
  const { attributes, listeners, setNodeRef, transform, transition } =
    // hoping that columnIndex is fine here. if you can drag across sections we will need to modify.
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { editing, tabData } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
    }),
    shallow
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="baseFlex"
      // TODO: disabled somehow, look at docs..
    >
      {/* TODO: don't want to be repeating twice below, find way to combine */}
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
                className="baseFlex"
              >
                <div className="h-[1px] w-2 bg-pink-50 "></div>
                <TabNote
                  note={note[0]!}
                  inlineEffect={false}
                  sectionIndex={sectionIndex}
                  columnIndex={columnIndex}
                  noteIndex={index}
                />
                <div className="h-[1px] w-2 bg-pink-50"></div>
              </div>
            )}

            {index === 7 && !columnData.includes("|") && (
              <div className="relative h-0 w-full">
                {columnIndex % 2 === 0 && (
                  <div className="absolute left-1/2 right-1/2 top-2 w-[3.35rem] -translate-x-1/2">
                    <TabNote
                      note={note}
                      inlineEffect={false}
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
                className="baseFlex"
              >
                <div className="h-[1px] w-2 bg-pink-50 "></div>
                <TabNote
                  note={note[1]!}
                  inlineEffect={true}
                  sectionIndex={sectionIndex}
                  columnIndex={columnIndex}
                  noteIndex={index}
                />
                <div className="h-[1px] w-2 bg-pink-50"></div>
              </div>
            )}

            {index === 7 && (
              <div className="relative h-0 w-full">
                {/* even worth to keep this section? */}
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export default TabNoteAndEffectCombo;
