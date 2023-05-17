import { Fragment } from "react";
import TabNote from "./TabNote";
import PalmMuteNode from "./PalmMuteNode";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TabNoteAndEffectCombo {
  noteColumnData: string[];
  effectColumnData: string[] | undefined;
  sectionIndex: number;
  noteColumnIndex: number;
}

function TabNoteAndEffectCombo({
  noteColumnData,
  effectColumnData,
  sectionIndex,
  noteColumnIndex,
}: TabNoteAndEffectCombo) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    // hoping that noteColumnIndex is fine here. if you can drag across sections we will need to modify.
    useSortable({ id: `${noteColumnIndex}`, disabled: true });

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
      className="baseFlex cursor-default"
    >
      {/* TODO: don't want to be repeating twice below, find way to combine */}
      <div className="baseVertFlex my-14 gap-2">
        {noteColumnData.map((note, index) => (
          <Fragment key={index}>
            {index === 0 && (
              // this positioning is still a bit off
              <div className="relative h-0 w-full">
                <div className="absolute bottom-0 left-1/2 right-1/2 w-[2rem] -translate-x-1/2">
                  <PalmMuteNode
                    note={note}
                    columnIndex={noteColumnIndex}
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
                <div
                  style={{
                    width: `${
                      tabData[sectionIndex]?.data[noteColumnIndex - 1]?.[8] ===
                      "measureLine"
                        ? "1.25rem"
                        : "8px"
                    }`,
                  }}
                  className="h-[1px] bg-pink-50 "
                ></div>
                <TabNote
                  note={note}
                  inlineEffect={false}
                  sectionIndex={sectionIndex}
                  columnIndex={noteColumnIndex}
                  noteIndex={index}
                />
                <div className="h-[1px] w-2 bg-pink-50"></div>
              </div>
            )}

            {index === 7 && (
              <div className="relative h-0 w-full">
                <div
                  style={{
                    left: `${
                      tabData[sectionIndex]?.data[noteColumnIndex - 1]?.[8] ===
                      "measureLine"
                        ? "60%"
                        : "50%"
                    }`,
                  }}
                  className="absolute left-1/2 right-1/2 top-2 w-[3rem] -translate-x-1/2"
                >
                  <TabNote
                    note={note}
                    inlineEffect={false}
                    sectionIndex={sectionIndex}
                    columnIndex={noteColumnIndex}
                    noteIndex={index}
                  />
                </div>
              </div>
            )}
          </Fragment>
        ))}
      </div>

      <div className="baseVertFlex my-14 gap-2">
        {effectColumnData?.map((note, index) => (
          <Fragment key={index}>
            {index === 0 && (
              // this positioning is still a bit off
              <div className="relative h-0 w-full">
                <div className="absolute bottom-0 left-1/2 right-1/2 w-[2rem] -translate-x-1/2">
                  <PalmMuteNode
                    note={note}
                    columnIndex={noteColumnIndex + 1}
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
                  note={note}
                  inlineEffect={true}
                  sectionIndex={sectionIndex}
                  columnIndex={noteColumnIndex + 1}
                  noteIndex={index}
                />
                <div
                  style={{
                    width: `${
                      tabData[sectionIndex]?.data[noteColumnIndex + 2]?.[8] ===
                      "measureLine"
                        ? "1.25rem"
                        : "8px"
                    }`,
                  }}
                  className="h-[1px] w-2 bg-pink-50"
                ></div>
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
