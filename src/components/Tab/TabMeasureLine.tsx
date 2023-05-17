import { Fragment, type CSSProperties } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { type TabColumn } from "./TabColumn";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RxDragHandleDots2 } from "react-icons/rx";

function TabMeasureLine({ columnData, sectionIndex, columnIndex }: TabColumn) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } =
    // hoping that columnIndex is fine here. if you can drag across sections we will need to modify.
    useSortable({ id: `${columnIndex}` });

  const style: CSSProperties = {
    opacity: isDragging ? 0.4 : 1,
    transform: CSS.Translate.toString(transform),
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
      className="baseVertFlex relative my-14 transition-opacity"
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
                height: `${index === 1 || index === 6 ? "46px" : "48px"}`,
                borderBottom: `${
                  index === 6 ? "2px solid rgb(253 242 248)" : "none"
                }`,
              }}
              className="w-[2px] bg-pink-50"
              onMouseEnter={() => console.log("hovering on measure line")}
            >
              {/* <div className="w-[4px] bg-pink-50"></div>
              <div
                style={{
                  height: `${index === 1 || index === 6 ? "46px" : "47px"}`,
                }}
                className="baseFlex w-[2px] bg-pink-50"
              ></div>

              <div className="w-[4px] bg-pink-50"></div> */}
            </div>
          )}

          {index === 8 && (
            <div
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              className="hover:box-shadow-md absolute bottom-[-3.25rem] cursor-grab rounded-md text-pink-50 active:cursor-grabbing"
            >
              <RxDragHandleDots2 className="h-8 w-6" />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

export default TabMeasureLine;
