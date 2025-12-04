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
import {
  useTabStore,
  type TabMeasureLine as TabMeasureLineType,
} from "~/stores/TabStore";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import focusAndScrollIntoView from "~/utils/focusAndScrollIntoView";
import { QuarterNote } from "~/utils/noteLengthIcons";
import { useTabSubSectionData } from "~/hooks/useTabDataSelectors";
import { isTabMeasureLine } from "~/utils/tabNoteHelpers";

// FYI: this whole component is such a mess architecture-wise, but I don't really know
// how to refactor it so we don't have so many magic numbers

interface TabMeasureLineProps {
  columnData: TabMeasureLineType;
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;
  reorderingColumns: boolean;
  showingDeleteColumnsButtons: boolean;
  columnHasBeenPlayed: boolean;
}

function TabMeasureLine({
  columnData,
  sectionIndex,
  subSectionIndex,
  columnIndex,
  reorderingColumns,
  showingDeleteColumnsButtons,
  columnHasBeenPlayed,
}: TabMeasureLineProps) {
  const [hoveringOnHandle, setHoveringOnHandle] = useState(false);
  const [grabbingHandle, setGrabbingHandle] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: columnData.id,
    disabled: !reorderingColumns, // hopefully this is a performance improvement?
  });

  const { audioMetadata, bpm, setTabData } = useTabStore((state) => ({
    audioMetadata: state.audioMetadata,
    bpm: state.bpm,
    setTabData: state.setTabData,
  }));

  const subSection = useTabSubSectionData(sectionIndex, subSectionIndex);

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
      const section = draft[sectionIndex]!.data[subSectionIndex];

      if (!section || section.type !== "tab") return;

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

    // tab arrow key navigation (limited to current section, so sectionIdx will stay constant)
    if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const prevColumn = subSection.data[columnIndex - 1];
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

      if (columnIndex === subSection.data.length - 1) {
        const newNoteToFocus = document.getElementById(
          `${sectionIndex}${subSectionIndex}ExtendTabButton`,
        );

        focusAndScrollIntoView(currentNote, newNoteToFocus);
        return;
      }

      const nextColumn = subSection.data[columnIndex + 1];
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

  function renderMeasureLine(index: number) {
    if (index === 1) {
      return (
        <div className="baseVertFlex w-full bg-background">
          {/* top border */}
          <div className="baseVertFlex w-full">
            <div className="h-[2px] w-full bg-foreground"></div>
          </div>

          <div className="baseFlex w-full">
            {/* left dummy string */}
            {(reorderingColumns || showingDeleteColumnsButtons) && (
              <div className="mt-[7px] h-[1px] flex-[1] bg-foreground/50"></div>
            )}

            {/* measure line */}
            <div
              style={{
                height: getHeightOfMeasureLineSubSection(index),
              }}
              className="w-[2px] bg-foreground"
            ></div>

            {/* right dummy string */}
            {(reorderingColumns || showingDeleteColumnsButtons) && (
              <div className="mt-[7px] h-[1px] flex-[1] bg-foreground/50"></div>
            )}
          </div>
        </div>
      );
    } else if (index === 2) {
      return (
        <div className="baseFlex w-full bg-background">
          {/* left dummy string */}
          {(reorderingColumns || showingDeleteColumnsButtons) && (
            <div className="mt-[4px] h-[1px] flex-[1] bg-foreground/50"></div>
          )}
          {/* measure line */}
          <div
            style={{
              height: getHeightOfMeasureLineSubSection(index),
            }}
            className="w-[2px] bg-foreground"
          ></div>
          {/* right dummy string */}
          {(reorderingColumns || showingDeleteColumnsButtons) && (
            <div className="mt-[4px] h-[1px] flex-[1] bg-foreground/50"></div>
          )}
        </div>
      );
    } else if (index === 3) {
      return (
        <div className="baseFlex w-full bg-background">
          {/* left dummy string */}
          {(reorderingColumns || showingDeleteColumnsButtons) && (
            <div className="h-[1px] flex-[1] bg-foreground/50"></div>
          )}
          {/* measure line */}
          <div
            style={{
              height: getHeightOfMeasureLineSubSection(index),
            }}
            className="w-[2px] bg-foreground"
          ></div>
          {/* right dummy string */}
          {(reorderingColumns || showingDeleteColumnsButtons) && (
            <div className="h-[1px] flex-[1] bg-foreground/50"></div>
          )}
        </div>
      );
    } else if (index === 4) {
      return (
        <div className="baseFlex w-full bg-background">
          {/* left dummy string */}
          {(reorderingColumns || showingDeleteColumnsButtons) && (
            <div className="mb-[3px] h-[1px] flex-[1] bg-foreground/50"></div>
          )}
          {/* measure line */}
          <div
            style={{
              height: getHeightOfMeasureLineSubSection(index),
            }}
            className="w-[2px] bg-foreground"
          ></div>
          {/* right dummy string */}
          {(reorderingColumns || showingDeleteColumnsButtons) && (
            <div className="mb-[3px] h-[1px] flex-[1] bg-foreground/50"></div>
          )}
        </div>
      );
    } else if (index === 5) {
      return (
        <div className="baseFlex w-full bg-background">
          {/* left dummy string */}
          {(reorderingColumns || showingDeleteColumnsButtons) && (
            <div className="mb-[5px] h-[1px] flex-[1] bg-foreground/50"></div>
          )}
          {/* measure line */}
          <div
            style={{
              height: getHeightOfMeasureLineSubSection(index),
            }}
            className="w-[2px] bg-foreground"
          ></div>
          {/* right dummy string */}
          {(reorderingColumns || showingDeleteColumnsButtons) && (
            <div className="mb-[5px] h-[1px] flex-[1] bg-foreground/50"></div>
          )}
        </div>
      );
    } else if (index === 6) {
      return (
        <div className="baseVertFlex w-full bg-background">
          <div className="baseFlex w-full">
            {/* left dummy string */}
            {(reorderingColumns || showingDeleteColumnsButtons) && (
              <div className="mb-[7px] h-[1px] flex-[1] bg-foreground/50"></div>
            )}

            {/* measure line */}
            <div
              style={{
                height: getHeightOfMeasureLineSubSection(index),
              }}
              className="w-[2px] bg-foreground"
            ></div>

            {/* right dummy string */}
            {(reorderingColumns || showingDeleteColumnsButtons) && (
              <div className="mb-[7px] h-[1px] flex-[1] bg-foreground/50"></div>
            )}
          </div>

          {/* bottom border */}
          <div className="baseVertFlex w-full">
            <div className="h-[2px] w-full bg-foreground"></div>
          </div>
        </div>
      );
    }
  }

  function getHeightOfMeasureLineSubSection(index: number) {
    let height = "0px";

    if (index === 1) {
      height = "42px";
    } else if (index === 2) {
      height = "43px";
    } else if (index === 3) {
      height = "43px";
    } else if (index === 4) {
      height = "42px";
    } else if (index === 5) {
      height = "42px";
    } else if (index === 6) {
      height = "42px";
    }

    return height;
  }

  function inputPlaceholder() {
    const subSectionBpm = subSection.bpm;
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
          reorderingColumns || showingDeleteColumnsButtons ? "48px" : "2px",
        transition: `${transition ?? ""}, width 0.15s ease-in-out`,
        zIndex: isDragging ? 20 : "auto",
      }}
      className="baseVertFlex relative h-[380px]"
    >
      {(reorderingColumns || showingDeleteColumnsButtons) && (
        <div
          style={{
            width: columnHasBeenPlayed ? "100%" : "0%",
          }}
          className="absolute left-0 top-1/2 h-[276px] w-0 -translate-y-1/2 bg-primary/15"
        ></div>
      )}

      {/* Palm mute connecting line (shown when measure line is inside palm mute section) */}
      <div className="baseFlex h-[48px] w-full shrink-0">
        {columnData.isInPalmMuteSection && (
          <div className="relative top-[-26px] h-[1px] w-full bg-foreground"></div>
        )}
      </div>

      {/* Render measure line for each string (indices 1-6) */}
      {([1, 2, 3, 4, 5, 6] as const).map((stringIndex) => (
        <div key={stringIndex} className="baseFlex w-full">
          {renderMeasureLine(stringIndex)}
        </div>
      ))}

      {/* BPM popover */}
      {!reorderingColumns && !showingDeleteColumnsButtons && (
        <div className="relative h-[86px] w-full">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id={`input-${sectionIndex}-${subSectionIndex}-${columnIndex}-7`}
                className="absolute left-[-10px] top-1 z-10 size-5 shrink-0 rounded-full p-[0.125rem]"
                onKeyDown={handleKeyDown}
              >
                <QuarterNote className="mr-[1px] h-[1rem]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="baseVertFlex !z-10 w-52 gap-4 p-2"
              side="bottom"
            >
              <p className="w-auto text-center text-sm">
                Specify a new BPM for the following measure
              </p>

              <div className="baseFlex gap-2">
                <QuarterNote className="fill-foreground" />

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
        <div className="baseVertFlex w-full">
          <div className="baseVertFlex relative h-[58px] w-full">
            {reorderingColumns && (
              <div
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                className={`hover:box-shadow-md ${
                  isDragging ? "cursor-grabbing" : "cursor-grab"
                } absolute top-[18px] z-20 cursor-grab rounded-md text-foreground active:cursor-grabbing`}
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
                    opacity: hoveringOnHandle ? (grabbingHandle ? 0.5 : 1) : 0,
                  }}
                  className="absolute bottom-0 left-1/2 right-1/2 h-8 -translate-x-1/2 rounded-md bg-primary/20 p-4 transition-colors"
                ></div>
              </div>
            )}

            {showingDeleteColumnsButtons && (
              <Button
                variant={"destructive"}
                size="sm"
                disabled={audioMetadata.playing}
                className="absolute top-[20px] z-20 h-[1.75rem] w-[1.75rem] p-1"
                onClick={handleDeleteMeasureLine}
              >
                <IoClose className="h-6 w-6" />
              </Button>
            )}
          </div>

          <div className="h-[16px] w-full"></div>
        </div>
      )}
    </motion.div>
  );
}

export default TabMeasureLine;
