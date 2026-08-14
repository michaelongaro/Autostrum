import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Element } from "react-scroll";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { IoClose } from "react-icons/io5";
import { RxDragHandleDots2 } from "react-icons/rx";
import { useTabStore, type FullNoteLengths } from "~/stores/TabStore";
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
import {
  useTabColumnNeighborMeta,
  useTabNoteColumnData,
} from "~/hooks/useTabDataSelectors";
import { useColumnPlaybackHighlight } from "~/hooks/useColumnPlaybackHighlight";
import { NoteLengthDropdown } from "./NoteLengthDropdown";
import renderNoteLengthGuide from "~/utils/renderNoteLengthGuide";
import {
  createTabNote,
  getStringValue,
  isTabNote,
} from "~/utils/tabNoteHelpers";
import {
  EDITING_TAB_COLUMN_HEIGHT_PX,
  EDITING_TAB_COLUMN_WIDTH_PX,
  EDITING_TAB_NOTE_LENGTH_GAP_PX,
  EDITING_TAB_PALM_MUTE_HEIGHT_PX,
  EDITING_TAB_STRING_ROW_HEIGHT_PX,
  EDITING_TAB_STRINGS_HEIGHT_PX,
} from "~/utils/editingTabGeometry";

interface TabNotesColumnProps {
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;

  pmNodeOpacity: string;
  editingPalmMuteNodes: boolean;
  setEditingPalmMuteNodes: Dispatch<SetStateAction<boolean>>;
  lastModifiedPalmMuteNode: LastModifiedPalmMuteNodeLocation | null;
  setLastModifiedPalmMuteNode: Dispatch<
    SetStateAction<LastModifiedPalmMuteNodeLocation | null>
  >;
  reorderingColumns: boolean;
  showingDeleteColumnsButtons: boolean;
}

function TabNotesColumn({
  sectionIndex,
  subSectionIndex,
  columnIndex,

  pmNodeOpacity,
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
  reorderingColumns,
  showingDeleteColumnsButtons,
}: TabNotesColumnProps) {
  const [hoveringOnHandle, setHoveringOnHandle] = useState(false);
  const [grabbingHandle, setGrabbingHandle] = useState(false);
  const [highlightChord, setHighlightChord] = useState(false);
  const [chordSettingDropdownIsOpen, setChordSettingDropdownIsOpen] =
    useState(false);
  // Local hover state avoids re-rendering every column in the section on mouse move
  const [isHovered, setIsHovered] = useState(false);

  const { columnIsBeingPlayed, columnHasBeenPlayed, durationOfChord } =
    useColumnPlaybackHighlight(sectionIndex, subSectionIndex, columnIndex);

  const columnData = useTabNoteColumnData(
    sectionIndex,
    subSectionIndex,
    columnIndex,
  );

  const neighborMeta = useTabColumnNeighborMeta(
    sectionIndex,
    subSectionIndex,
    columnIndex,
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: columnData?.id ?? `tab-note-${columnIndex}`,
    disabled: !reorderingColumns, // hopefully this is a performance improvement?
  });

  const { pauseAudio, setTabData, setHoveredChordLocation } = useTabStore(
    (state) => ({
      pauseAudio: state.pauseAudio,
      setTabData: state.setTabData,
      setHoveredChordLocation: state.setHoveredChordLocation,
    }),
  );

  // ideally don't need this and can just use prop values passed in, but need to have a
  // [0] index special case, since when looping it would keep the [0] index at 100% width
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

  if (!columnData) {
    return null;
  }

  function deleteColumnButtonDisabled() {
    let disabled = false;

    if (neighborMeta.columnCount === 1) {
      disabled = true;
    }

    // if the current chord is the first/last "elem" in the section and there is a measure line
    // right after/before -> disable
    if (
      (columnIndex === 0 && neighborMeta.nextIsMeasureLine) ||
      (columnIndex === neighborMeta.columnCount - 1 &&
        neighborMeta.previousIsMeasureLine)
    ) {
      disabled = true;
    }

    // if the current chord is being flanked by two measure lines -> disable
    if (neighborMeta.previousIsMeasureLine && neighborMeta.nextIsMeasureLine) {
      disabled = true;
    }

    return disabled;
  }

  function handleDeleteChord() {
    pauseAudio(true);

    setTabData((draft) => {
      const currentSubSection = draft[sectionIndex]?.data[subSectionIndex];

      if (currentSubSection?.type !== "tab") return;

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

      if (currentSubSection?.type !== "tab") return;

      const currentColumn = currentSubSection.data[columnIndex];
      if (!currentColumn || !isTabNote(currentColumn)) return;

      const newColumnPalmMuteValue: "" | "-" =
        (currentColumn.palmMute === "start" && after) ||
        (currentColumn.palmMute === "end" && !after) ||
        currentColumn.palmMute === "-"
          ? "-"
          : "";

      const newColumnData = createTabNote({
        palmMute: newColumnPalmMuteValue,
        noteLength: neighborMeta.baseNoteLength,
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

      if (currentSubSection?.type !== "tab") return;

      const column = currentSubSection.data[columnIndex];
      if (column && isTabNote(column)) {
        column.noteLength = noteLength;
      }
    });
  }

  const currentIsRestStrum = columnData.chordEffects === "r";

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
        height: EDITING_TAB_COLUMN_HEIGHT_PX,
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        setHoveredChordLocation({
          sectionIndex,
          subSectionIndex,
          chordIndex: columnIndex,
        });
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoveredChordLocation(null);
      }}
      className="baseVertFlex shrink-0 cursor-default"
    >
      <Element
        name={`section${sectionIndex}-subSection${subSectionIndex}-chord${columnIndex}`}
        id={`section${sectionIndex}-subSection${subSectionIndex}-chord${columnIndex}`}
        className="baseFlex relative"
      >
        {/* absolutely positioned chord highlight */}
        <div
          className="pointer-events-none absolute left-0 z-0 w-full bg-primary/25"
          style={{
            top: EDITING_TAB_PALM_MUTE_HEIGHT_PX + 13,
            height: EDITING_TAB_STRINGS_HEIGHT_PX - 25,
            transform:
              highlightChord || columnHasBeenPlayed ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "left center",
            transitionDuration: highlightChord ? `${durationOfChord}s` : "0s",
            msTransitionProperty: "transform",
            transitionTimingFunction: "linear",
          }}
        ></div>

        <div
          className="baseVertFlex"
          style={{ width: EDITING_TAB_COLUMN_WIDTH_PX }}
        >
          {/* Palm Mute Node */}
          <div
            className="baseFlex w-full"
            style={{ height: EDITING_TAB_PALM_MUTE_HEIGHT_PX }}
          >
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

          {/* String Notes (1-6) */}
          {([1, 2, 3, 4, 5, 6] as const).map((stringIndex) => (
            <div
              key={stringIndex}
              style={{
                height: EDITING_TAB_STRING_ROW_HEIGHT_PX,
                minHeight: EDITING_TAB_STRING_ROW_HEIGHT_PX,
                width: EDITING_TAB_COLUMN_WIDTH_PX,
              }}
              className="baseFlex relative"
            >
              <div className="h-[1px] min-w-[2px] flex-[1] bg-foreground/50"></div>

              <TabNote
                note={getStringValue(columnData, stringIndex)}
                sectionIndex={sectionIndex}
                subSectionIndex={subSectionIndex}
                columnIndex={columnIndex}
                noteIndex={stringIndex}
              />

              <div className="h-[1px] min-w-[2px] flex-[1] bg-foreground/50"></div>
            </div>
          ))}

          {/* Note Length Guide */}
          <div
            className="baseVertFlex mb-2 h-4 w-full"
            style={{ marginTop: EDITING_TAB_NOTE_LENGTH_GAP_PX }}
          >
            {renderNoteLengthGuide({
              previousNoteLength: neighborMeta.previousNoteLength,
              currentNoteLength: columnData.noteLength,
              nextNoteLength: neighborMeta.nextNoteLength,
              previousIsRestStrum: neighborMeta.previousIsRestStrum,
              currentIsRestStrum,
              nextIsRestStrum: neighborMeta.nextIsRestStrum,
              isFirstInGroup: neighborMeta.isFirstInGroup,
              isLastInGroup: neighborMeta.isLastInGroup,
            })}
          </div>

          {/* Chord Effects */}
          {!reorderingColumns && !showingDeleteColumnsButtons && (
            <div className="mt-1 h-8 w-[29px]">
              <TabNote
                note={columnData.chordEffects}
                sectionIndex={sectionIndex}
                subSectionIndex={subSectionIndex}
                columnIndex={columnIndex}
                noteIndex={7}
              />
            </div>
          )}

          {reorderingColumns && (
            <div className="baseFlex relative mt-1 h-8 w-full">
              <div
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                className={`hover:box-shadow-md w-[1.5rem] cursor-grab rounded-md text-foreground ${
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
            <div className="baseFlex mt-1 h-8 w-full">
              <Button
                variant={"destructive"}
                size="sm"
                disabled={deleteColumnButtonDisabled()}
                className="h-[1.75rem] w-[1.75rem] p-1"
                onClick={handleDeleteChord}
              >
                <IoClose className="size-6" />
              </Button>
            </div>
          )}

          {/* Chord Settings Dropdown */}
          {isHovered || chordSettingDropdownIsOpen ? (
            <DropdownMenu
              modal={true}
              open={chordSettingDropdownIsOpen}
              onOpenChange={(open) => setChordSettingDropdownIsOpen(open)}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="my-1 h-2.5 w-5 !p-1 hover:!bg-primary hover:!text-primary-foreground"
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
          ) : (
            <div className="my-1 h-2.5 w-5"></div>
          )}
        </div>
      </Element>
    </motion.div>
  );
}

export default TabNotesColumn;
