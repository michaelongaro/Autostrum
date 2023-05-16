import { Fragment } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { type TabColumn } from "./TabColumn";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function TabMeasureLine({
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

  if (tabData[sectionIndex]?.data[columnIndex - 1]?.includes("|")) return null;

  return (
    <div
      ref={setNodeRef}
      // hmm maybe do need more unique id here
      style={style}
      {...attributes}
      {...listeners}
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
                  {note === "-" && (
                    <div className="h-[1px] w-full bg-pink-50"></div>
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
                borderBottom: `${
                  index === 6 ? "2px solid rgb(253 242 248)" : "none"
                }`,
              }}
              className="baseFlex"
            >
              <div
                style={{
                  height: `${index === 1 || index === 6 ? "46px" : "47px"}`,
                }}
                className="baseFlex w-[2px] bg-pink-50"
                onMouseEnter={() => console.log("hovering on measure line")}
              ></div>
            </div>
          )}

          {/* drag handler grabber here? */}
        </Fragment>
      ))}
    </div>
  );
}

export default TabMeasureLine;
