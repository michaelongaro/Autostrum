import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { useState } from "react";
import { IoClose } from "react-icons/io5";
import { RxDragHandleDots2 } from "react-icons/rx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { getTabData, useTabStore } from "~/stores/TabStore";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import focusAndScrollIntoView from "~/utils/focusAndScrollIntoView";
import { QuarterNote } from "~/utils/noteLengthIcons";
import {
  useTabColumnNeighborMeta,
  useTabMeasureLineColumnData,
  useTabSubSectionBpm,
} from "~/hooks/useTabDataSelectors";
import { useMeasureLineHasBeenPlayed } from "~/hooks/useColumnPlaybackHighlight";
import { isTabMeasureLine } from "~/utils/tabNoteHelpers";
import {
  EDITING_TAB_COLUMN_HEIGHT_PX,
  EDITING_TAB_COLUMN_WIDTH_PX,
  EDITING_TAB_FOOTER_HEIGHT_PX,
  EDITING_TAB_NOTE_LENGTH_GAP_PX,
  EDITING_TAB_PALM_MUTE_HEIGHT_PX,
  EDITING_TAB_STAFF_LINE_HEIGHT_PX,
  EDITING_TAB_STAFF_LINE_INSET_PX,
  EDITING_TAB_STRING_ROW_HEIGHT_PX,
  EDITING_TAB_STRINGS_HEIGHT_PX,
} from "~/utils/editingTabGeometry";

// FYI: this whole component is such a mess architecture-wise, but I don't really know
// how to refactor it so we don't have so many magic numbers

interface TabMeasureLineProps {
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;
  reorderingColumns: boolean;
  showingDeleteColumnsButtons: boolean;
}

function TabMeasureLine({
  sectionIndex,
  subSectionIndex,
  columnIndex,
  reorderingColumns,
  showingDeleteColumnsButtons,
}: TabMeasureLineProps) {
  const [hoveringOnHandle, setHoveringOnHandle] = useState(false);
  const [grabbingHandle, setGrabbingHandle] = useState(false);
  const columnHasBeenPlayed = useMeasureLineHasBeenPlayed(
    sectionIndex,
    subSectionIndex,
    columnIndex,
  );

  const columnData = useTabMeasureLineColumnData(
    sectionIndex,
    subSectionIndex,
    columnIndex,
  );

  const neighborMeta = useTabColumnNeighborMeta(
    sectionIndex,
    subSectionIndex,
    columnIndex,
  );

  const subSectionBpm = useTabSubSectionBpm(sectionIndex, subSectionIndex);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: columnData?.id ?? `measure-line-${columnIndex}`,
    disabled: !reorderingColumns, // hopefully this is a performance improvement?
  });

  const { bpm, setTabData } = useTabStore((state) => ({
    bpm: state.bpm,
    setTabData: state.setTabData,
  }));

  // Only the playing boolean — avoid re-rendering on loop-range / location ticks.
  const audioIsPlaying = useTabStore((state) => state.audioMetadata.playing);

  if (!columnData) {
    return null;
  }

  function handleDeleteMeasureLine() {
    setTabData((draft) => {
      draft[sectionIndex]?.data[subSectionIndex]?.data.splice(columnIndex, 1);
    });
  }

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newBpm =
      e.target.value.length === 0 ? null : parseInt(e.target.value);
    if (newBpm !== null && (isNaN(newBpm) || newBpm > 500)) return;

    setTabData((draft) => {
      const section = draft[sectionIndex]?.data[subSectionIndex];

      if (section?.type !== "tab") return;

      const column = section.data[columnIndex];
      if (column && isTabMeasureLine(column)) {
        column.bpmAfterLine = newBpm;
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    e.stopPropagation();

    const currentNote = document.getElementById(
      `input-${sectionIndex}-${subSectionIndex}-${columnIndex}-7`,
    );

    const subSection = getTabData()[sectionIndex]?.data[subSectionIndex];
    const columns = subSection?.type === "tab" ? subSection.data : [];

    // tab arrow key navigation (limited to current section, so sectionIdx will stay constant)
    if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const prevColumn = columns[columnIndex - 1];
      const adjColumnIndex =
        prevColumn && isTabMeasureLine(prevColumn)
          ? columnIndex - 2
          : columnIndex - 1;

      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${adjColumnIndex}-7`,
      );

      focusAndScrollIntoView(currentNote, newNoteToFocus);
      return;
    } else if (e.key === "ArrowRight") {
      e.preventDefault(); // prevent cursor from moving

      if (columnIndex === neighborMeta.columnCount - 1) {
        const newNoteToFocus = document.getElementById(
          `${sectionIndex}${subSectionIndex}ExtendTabButton`,
        );

        focusAndScrollIntoView(currentNote, newNoteToFocus, true);
        return;
      }

      const nextColumn = columns[columnIndex + 1];
      const adjColumnIndex =
        nextColumn && isTabMeasureLine(nextColumn)
          ? columnIndex + 2
          : columnIndex + 1;

      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${adjColumnIndex}-7`,
      );

      focusAndScrollIntoView(currentNote, newNoteToFocus);
      return;
    }
  }

  function inputPlaceholder() {
    if (subSectionBpm === -1) {
      return bpm === -1 ? "" : bpm.toString();
    }
    return subSectionBpm.toString();
  }

  return (
    <motion.div
      key={columnData.id}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(
          transform && { ...transform, scaleY: 1, scaleX: 1 },
        ),
        // need to have same width as chords for the drag and drop algorithm
        // to behave properly without the ui breaking
        width:
          reorderingColumns || showingDeleteColumnsButtons
            ? `${EDITING_TAB_COLUMN_WIDTH_PX}px`
            : "1px",
        height: EDITING_TAB_COLUMN_HEIGHT_PX,
        transition: `${transition ?? ""}, width 0.15s ease-in-out`,
        zIndex: isDragging ? 20 : "auto",
      }}
      className="baseVertFlex relative"
      id={`section${sectionIndex}-subSection${subSectionIndex}-chord${columnIndex}`}
    >
      {/* Reorder/delete mode: dim past columns so the active edit target is clearer */}
      <div
        style={{
          opacity:
            reorderingColumns || showingDeleteColumnsButtons ? "100%" : "0%",
          top: EDITING_TAB_PALM_MUTE_HEIGHT_PX + 11,
          height: EDITING_TAB_STRINGS_HEIGHT_PX - 25,
        }}
        className="absolute left-0 w-full bg-background"
      ></div>

      {/* Palm mute connecting line (shown when measure line is inside palm mute section) */}
      <div
        className="baseFlex w-full shrink-0"
        style={{ height: EDITING_TAB_PALM_MUTE_HEIGHT_PX - 4 }}
      >
        {columnData.isInPalmMuteSection && (
          <div className="mb-1 h-[1px] w-full bg-foreground"></div>
        )}
      </div>

      {/* Render measure line for each string (indices 1-6) */}
      <div
        className="relative w-full"
        style={{ height: EDITING_TAB_STRINGS_HEIGHT_PX }}
      >
        {([1, 2, 3, 4, 5, 6] as const).map((stringIndex) => (
          <div
            key={stringIndex}
            className="baseFlex w-full"
            style={{ height: EDITING_TAB_STRING_ROW_HEIGHT_PX }}
          >
            {(reorderingColumns || showingDeleteColumnsButtons) && (
              <>
                <div className="h-[1px] flex-[1] bg-foreground/50"></div>
                <div className="h-[1px] flex-[1] bg-foreground/50"></div>
              </>
            )}
          </div>
        ))}
        <div
          className={`absolute w-px bg-foreground/50 ${
            reorderingColumns || showingDeleteColumnsButtons
              ? "left-1/2 -translate-x-1/2"
              : "left-0"
          }`}
          style={{
            top: EDITING_TAB_STAFF_LINE_INSET_PX,
            height: EDITING_TAB_STAFF_LINE_HEIGHT_PX,
          }}
        ></div>
      </div>

      {/* BPM popover */}
      {!reorderingColumns && !showingDeleteColumnsButtons && (
        <div
          className="relative w-full"
          style={{ height: EDITING_TAB_FOOTER_HEIGHT_PX }}
        >
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id={`input-${sectionIndex}-${subSectionIndex}-${columnIndex}-7`}
                className="absolute left-[-10px] top-[-4px] z-10 size-5 shrink-0 rounded-full p-[0.125rem]"
                onKeyDown={handleKeyDown}
              >
                <QuarterNote className="mr-[1px] h-[1rem]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="baseVertFlex z-40 w-52 gap-4 p-2"
              side="bottom"
            >
              <p className="w-auto text-center text-sm">
                Specify a new BPM for the following measure
              </p>

              <div className="baseFlex">
                <QuarterNote className="size-5 fill-foreground" />

                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="placeholder:text-grey-800/50 h-8 w-11 px-2 md:h-10 md:w-[52px] md:px-3"
                  placeholder={inputPlaceholder()}
                  value={
                    columnData.bpmAfterLine === null
                      ? ""
                      : columnData.bpmAfterLine.toString()
                  }
                  onChange={handleBpmChange}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {(reorderingColumns || showingDeleteColumnsButtons) && (
        <div
          className="baseVertFlex w-full"
          style={{ height: EDITING_TAB_FOOTER_HEIGHT_PX }}
        >
          <div
            className="w-full shrink-0"
            style={{ height: EDITING_TAB_NOTE_LENGTH_GAP_PX }}
          ></div>
          <div className="baseVertFlex mb-[-6px] mt-[6px] w-full">
            <div className="baseVertFlex relative h-[58px] w-full">
              {reorderingColumns && (
                <div
                  ref={setActivatorNodeRef}
                  {...attributes}
                  {...listeners}
                  className={`hover:box-shadow-md ${
                    isDragging ? "cursor-grabbing" : "cursor-grab"
                  } absolute top-[18px] z-20 mt-1 cursor-grab rounded-md text-foreground active:cursor-grabbing`}
                  onMouseEnter={() => setHoveringOnHandle(true)}
                  onMouseDown={() => setGrabbingHandle(true)}
                  onMouseLeave={() => {
                    setGrabbingHandle(false);
                    setHoveringOnHandle(false);
                  }}
                  onMouseUp={() => {
                    setGrabbingHandle(false);
                    setHoveringOnHandle(false);
                  }}
                >
                  <RxDragHandleDots2 className="h-8 w-6" />
                  <div
                    style={{
                      opacity: hoveringOnHandle
                        ? grabbingHandle
                          ? 0.5
                          : 1
                        : 0,
                    }}
                    className="absolute bottom-0 left-1/2 right-1/2 h-8 -translate-x-1/2 rounded-md bg-primary/20 p-4 transition-colors"
                  ></div>
                </div>
              )}

              {showingDeleteColumnsButtons && (
                <Button
                  variant={"destructive"}
                  size="sm"
                  disabled={audioIsPlaying}
                  className="absolute top-[20px] z-20 mt-1 h-[1.75rem] w-[1.75rem] p-1"
                  onClick={handleDeleteMeasureLine}
                >
                  <IoClose className="h-6 w-6" />
                </Button>
              )}
            </div>

            <div className="h-[16px] w-full"></div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default TabMeasureLine;
