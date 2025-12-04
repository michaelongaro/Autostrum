import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Element } from "react-scroll";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { IoClose } from "react-icons/io5";
import { RxDragHandleDots2 } from "react-icons/rx";
import {
  useTabStore,
  type FullNoteLengths,
  type TabNote as TabNoteType,
} from "~/stores/TabStore";
import { BsPlus } from "react-icons/bs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import PalmMuteNode from "./PalmMuteNode";
import TabNote from "./TabNote";
import type { LastModifiedPalmMuteNodeLocation } from "./TabSection";
import Ellipsis from "~/components/ui/icons/Ellipsis";
import { useTabSubSectionData } from "~/hooks/useTabDataSelectors";
import { NoteLengthDropdown } from "./NoteLengthDropdown";
import renderStrummingGuide from "~/utils/renderStrummingGuide";
import {
  createTabNote,
  getStringValue,
  isTabMeasureLine,
  isTabNote,
} from "~/utils/tabNoteHelpers";

const noteLengthDurations = ["quarter", "eighth", "sixteenth"];
interface TabNotesColumnProps {
  columnData: TabNoteType;
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;
  isLastColumn: boolean;

  columnIsBeingPlayed: boolean;
  columnHasBeenPlayed: boolean;
  durationOfChord: number;

  pmNodeOpacity: string;
  editingPalmMuteNodes: boolean;
  setEditingPalmMuteNodes: Dispatch<SetStateAction<boolean>>;
  lastModifiedPalmMuteNode: LastModifiedPalmMuteNodeLocation | null;
  setLastModifiedPalmMuteNode: Dispatch<
    SetStateAction<LastModifiedPalmMuteNodeLocation | null>
  >;
  reorderingColumns: boolean;
  showingDeleteColumnsButtons: boolean;
  columnIdxBeingHovered: number | null;
  setColumnIdxBeingHovered: Dispatch<SetStateAction<number | null>>;
}

function TabNotesColumn({
  columnData,
  sectionIndex,
  subSectionIndex,
  columnIndex,
  isLastColumn,

  columnIsBeingPlayed,
  columnHasBeenPlayed,
  durationOfChord,

  pmNodeOpacity,
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
  reorderingColumns,
  showingDeleteColumnsButtons,
  columnIdxBeingHovered,
  setColumnIdxBeingHovered,
}: TabNotesColumnProps) {
  const [hoveringOnHandle, setHoveringOnHandle] = useState(false);
  const [grabbingHandle, setGrabbingHandle] = useState(false);
  const [highlightChord, setHighlightChord] = useState(false);
  const [chordSettingDropdownIsOpen, setChordSettingDropdownIsOpen] =
    useState(false);

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

  const { pauseAudio, currentChordIndex, setTabData } = useTabStore(
    (state) => ({
      pauseAudio: state.pauseAudio,
      currentChordIndex: state.currentChordIndex,
      setTabData: state.setTabData,
    }),
  );

  const subSection = useTabSubSectionData(sectionIndex, subSectionIndex);

  const previousColumn =
    columnIndex > 0 ? subSection.data[columnIndex - 1] : undefined;
  const nextColumn =
    columnIndex < subSection.data.length - 1
      ? subSection.data[columnIndex + 1]
      : undefined;

  const previousColumnIsPlayable =
    previousColumn !== undefined && isTabNote(previousColumn);
  const nextColumnIsPlayable =
    nextColumn !== undefined && isTabNote(nextColumn);

  const previousNoteLength = previousColumnIsPlayable
    ? previousColumn.noteLength
    : undefined;
  const nextNoteLength = nextColumnIsPlayable
    ? nextColumn.noteLength
    : undefined;

  const previousIsRestStrum = previousColumnIsPlayable
    ? previousColumn.chordEffects === "r"
    : undefined;
  const currentIsRestStrum = columnData.chordEffects === "r";
  const nextIsRestStrum = nextColumnIsPlayable
    ? nextColumn.chordEffects === "r"
    : undefined;

  // ideally don't need this and can just use prop values passed in, but need to have
  // [0] index special case since when looping it would keep the [0] index at 100% width
  // immediately, so we need this semi hacky solution
  useEffect(() => {
    if (columnIndex === 0) {
      if (columnIsBeingPlayed) {
        setHighlightChord(false);

        setTimeout(() => {
          setHighlightChord(true);
        }, 0);
      } else {
        setHighlightChord(false);
      }
    } else {
      setHighlightChord(columnIsBeingPlayed);
    }
  }, [columnIndex, columnIsBeingPlayed]);

  function deleteColumnButtonDisabled() {
    let disabled = false;

    if (subSection.data.length === 1) {
      disabled = true;
    }

    const prevColumn = subSection.data[columnIndex - 1];
    const nextColumnData = subSection.data[columnIndex + 1];

    // if the current chord is the first/last "elem" in the section and there is a measure line
    // right after/before -> disable
    if (
      (columnIndex === 0 &&
        nextColumnData &&
        isTabMeasureLine(nextColumnData)) ||
      (columnIndex === subSection.data.length - 1 &&
        prevColumn &&
        isTabMeasureLine(prevColumn))
    ) {
      disabled = true;
    }

    // if the current chord is being flanked by two measure lines -> disable
    if (
      prevColumn &&
      isTabMeasureLine(prevColumn) &&
      nextColumnData &&
      isTabMeasureLine(nextColumnData)
    ) {
      disabled = true;
    }

    return disabled;
  }

  function handleDeleteChord() {
    if (currentChordIndex !== 0) {
      pauseAudio(true);
    }

    setTabData((draft) => {
      const currentSubSection = draft[sectionIndex]?.data[subSectionIndex];

      if (currentSubSection === undefined || currentSubSection.type !== "tab")
        return;

      const currentColumn = currentSubSection.data[columnIndex];
      if (!currentColumn || !isTabNote(currentColumn)) return;

      const currentPalmMuteNodeValue = currentColumn.palmMute;

      const currentTabSectionLength =
        draft[sectionIndex]?.data[subSectionIndex]?.data.length ?? 0;

      if (currentPalmMuteNodeValue === "start") {
        let index = 0;
        while (index < currentTabSectionLength) {
          const col = currentSubSection.data[index];
          if (col && isTabNote(col)) {
            if (col.palmMute === "end") {
              col.palmMute = "";
              break;
            }
            col.palmMute = "";
          }

          index++;
        }
      } else if (currentPalmMuteNodeValue === "end") {
        let index = currentTabSectionLength - 1;
        while (index >= 0) {
          const col = currentSubSection.data[index];
          if (col && isTabNote(col)) {
            if (col.palmMute === "start") {
              col.palmMute = "";
              break;
            }
            col.palmMute = "";
          }

          index--;
        }
      }

      draft[sectionIndex]?.data[subSectionIndex]?.data.splice(columnIndex, 1);
    });
  }

  function addNewColumn(after: boolean) {
    setTabData((draft) => {
      const currentSubSection = draft[sectionIndex]?.data[subSectionIndex];
      if (currentSubSection === undefined || currentSubSection.type !== "tab")
        return;

      const newColumnPalmMuteValue: "" | "-" =
        (columnData.palmMute === "start" && after) ||
        (columnData.palmMute === "end" && !after) ||
        columnData.palmMute === "-"
          ? "-"
          : "";

      const newColumnData = createTabNote({
        palmMute: newColumnPalmMuteValue,
        noteLength: "quarter", // will be overwritten by note length if it's specified
      });

      currentSubSection.data.splice(
        after ? columnIndex + 1 : columnIndex,
        0,
        newColumnData,
      );
    });
  }

  function handleNoteLengthChange(noteLength: FullNoteLengths) {
    setTabData((draft) => {
      const currentSubSection = draft[sectionIndex]?.data[subSectionIndex];

      if (currentSubSection === undefined || currentSubSection.type !== "tab")
        return;

      const column = currentSubSection.data[columnIndex];
      if (column && isTabNote(column)) {
        column.noteLength = noteLength;
        column.noteLengthModified = true;
      }
    });
  }

  return (
    <motion.div
      key={columnData.id}
      // id={`section${sectionIndex}-subSection${subSectionIndex}-chord${columnIndex}`}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(
          transform && { ...transform, scaleY: 1, scaleX: 1 },
        ),
        transition,
        zIndex: isDragging ? 20 : "auto",
      }}
      onMouseEnter={() => setColumnIdxBeingHovered(columnIndex)}
      onMouseLeave={() => setColumnIdxBeingHovered(null)}
      className="baseVertFlex h-[400px] cursor-default"
    >
      <Element
        name={`section${sectionIndex}-subSection${subSectionIndex}-chord${columnIndex}`}
        id={`section${sectionIndex}-subSection${subSectionIndex}-chord${columnIndex}`}
        className="baseFlex relative"
      >
        <div
          style={{
            marginTop:
              reorderingColumns || showingDeleteColumnsButtons ? "8px" : "0",
            backgroundColor: "hsl(var(--primary) / 0.15)",
            transform:
              highlightChord || columnHasBeenPlayed
                ? `scaleX(${isLastColumn ? "0.8" : "1"})` // makes sure that "endcap" doesn't get highlighted as well
                : "scaleX(0)",
            transformOrigin: "left center",
            transitionDuration: highlightChord ? `${durationOfChord}s` : "0s",
            msTransitionProperty: "transform",
            transitionTimingFunction: "linear",
          }}
          className="absolute left-0 h-[276px] w-full"
        ></div>

        <div className="baseVertFlex mb-[3.2rem] mt-4 gap-2">
          {/* Palm Mute Node */}
          <div className="baseFlex h-9 w-full">
            <PalmMuteNode
              value={columnData.palmMute}
              columnIndex={columnIndex}
              sectionIndex={sectionIndex}
              subSectionIndex={subSectionIndex}
              opacity={pmNodeOpacity}
              editingPalmMuteNodes={editingPalmMuteNodes}
              setEditingPalmMuteNodes={setEditingPalmMuteNodes}
              lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
              setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
            />
          </div>

          {/* Chord Settings Dropdown */}
          {(columnIdxBeingHovered === columnIndex ||
            chordSettingDropdownIsOpen) && (
            <div
              key={`${columnData.id}chordSettings`}
              style={{
                bottom:
                  showingDeleteColumnsButtons || reorderingColumns
                    ? "32px"
                    : "40px",
              }}
              className={`absolute ${isLastColumn ? "right-7" : ""} `}
            >
              <DropdownMenu
                modal={true}
                open={chordSettingDropdownIsOpen}
                onOpenChange={(open) => setChordSettingDropdownIsOpen(open)}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-2.5 w-5 !p-1 hover:!bg-primary hover:!text-primary-foreground"
                  >
                    <Ellipsis className="h-3 w-4 rotate-90" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent side={"bottom"}>
                  <DropdownMenuItem
                    className="baseFlex !justify-between gap-2"
                    onClick={() => addNewColumn(false)}
                  >
                    Add chord before
                    <BsPlus className="h-4 w-4" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="baseFlex !justify-between gap-2"
                    onClick={() => addNewColumn(true)}
                  >
                    Add chord after
                    <BsPlus className="h-4 w-4" />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-primary" />
                  <NoteLengthDropdown
                    value={columnData.noteLength}
                    onValueChange={handleNoteLengthChange}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* String Notes (1-6) */}
          {([1, 2, 3, 4, 5, 6] as const).map((stringIndex) => (
            <div
              key={stringIndex}
              style={{
                borderTop: `${stringIndex === 1 ? "2px solid" : "none"}`,
                paddingTop: `${stringIndex === 1 ? "7px" : "0"}`,
                borderBottom: `${stringIndex === 6 ? "2px solid" : "none"}`,
                paddingBottom: `${stringIndex === 6 ? "7px" : "0"}`,
                transition: "width 0.15s ease-in-out",
                // maybe also need "flex-basis: content" here if editing?
              }}
              className="baseFlex relative w-12 basis-[content]"
            >
              <div className="h-[1px] flex-[1] bg-foreground/50"></div>

              <TabNote
                note={getStringValue(columnData, stringIndex)}
                sectionIndex={sectionIndex}
                subSectionIndex={subSectionIndex}
                columnIndex={columnIndex}
                noteIndex={stringIndex}
              />

              <div className="h-[1px] flex-[1] bg-foreground/50"></div>
            </div>
          ))}

          {/* Chord Effects */}
          {!reorderingColumns && !showingDeleteColumnsButtons && (
            <div className="relative h-0 w-full">
              <div className="absolute left-1/2 right-1/2 top-2 w-[29px] -translate-x-1/2">
                <TabNote
                  note={columnData.chordEffects}
                  sectionIndex={sectionIndex}
                  subSectionIndex={subSectionIndex}
                  columnIndex={columnIndex}
                  noteIndex={7}
                />
              </div>
            </div>
          )}

          {/* Strumming Guide */}
          <div
            style={{
              bottom:
                showingDeleteColumnsButtons || reorderingColumns
                  ? "-1.5rem"
                  : "-1rem",
            }}
            className={`baseVertFlex absolute ${isLastColumn ? "left-[42%]" : "left-[53%]"} right-1/2 h-4 w-full -translate-x-1/2`}
          >
            {renderStrummingGuide({
              previousNoteLength,
              currentNoteLength: columnData.noteLength,
              nextNoteLength,
              previousIsRestStrum,
              currentIsRestStrum,
              nextIsRestStrum,
            })}
          </div>
        </div>

        {isLastColumn && (
          <div
            className={`${reorderingColumns || showingDeleteColumnsButtons ? "mt-2" : ""} h-[280px] rounded-r-2xl border-2 border-foreground p-1`}
          ></div>
        )}
      </Element>

      {/* drag handle / delete button */}
      {reorderingColumns && (
        <div className="relative h-2 w-full">
          <div
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            style={{
              left: isLastColumn ? "40%" : "50%",
            }}
            className={`hover:box-shadow-md absolute bottom-4 w-[1.5rem] -translate-x-1/2 cursor-grab rounded-md text-foreground ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
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
        </div>
      )}

      {showingDeleteColumnsButtons && (
        <div className="relative h-2 w-full">
          <Button
            variant={"destructive"}
            size="sm"
            disabled={deleteColumnButtonDisabled()}
            style={{
              left: isLastColumn ? "40%" : "50%",
            }}
            className="absolute bottom-4 h-[1.75rem] w-[1.75rem] -translate-x-1/2 p-1"
            onClick={handleDeleteChord}
          >
            <IoClose className="h-6 w-6" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default TabNotesColumn;
