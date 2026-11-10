import { type DragEndEvent } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import EditingTabStaff from "./EditingTabStaff";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  useTabColumnIds,
  useTabColumnTypes,
  useTabPalmMuteValues,
  useTabSubSectionMeta,
} from "~/hooks/useTabDataSelectors";
import { useTabStoreApi, useTabStore } from "~/stores/TabStore";
import focusAndScrollIntoView from "~/utils/focusAndScrollIntoView";
import {
  EighthNote,
  HalfNote,
  QuarterNote,
  SixteenthNote,
  WholeNote,
} from "~/utils/noteLengthIcons";
import {
  applyTabPalmMuteValues,
  finishPalmMuteEdit,
  getPalmMuteOpacities,
  getTabPalmMuteValues,
  recoverPendingPalmMuteEdit,
} from "~/utils/palmMuteEditing";
import { reorderTabColumns } from "~/utils/reorderTabColumns";
import { createTabNote, isTabMeasureLine } from "~/utils/tabNoteHelpers";
import MiscellaneousControls from "./MiscellaneousControls";

const xVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      delay: 0,
      duration: 0.25,
    },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
      delay: 0,
    },
  },
};

const containerVariants = {
  hidden: { width: 0, opacity: 0, zIndex: -1 },
  visible: {
    width: "auto",
    opacity: 1,
    zIndex: 1,
    transition: {
      duration: 0.2,
    },
  },
  exit: {
    width: 0,
    opacity: 0,
    zIndex: -1,
    transition: {
      duration: 0.2,
      delay: 0.1,
    },
  },
};

export interface LastModifiedPalmMuteNodeLocation {
  columnIndex: number;
  prevValue: string;
  currentValue: string;
}

interface TabSection {
  sectionIndex: number;
  subSectionIndex: number;
  presentation?: "full" | "embedded";
  className?: string;
}

function TabSection({
  sectionIndex,
  subSectionIndex,
  presentation = "full",
  className,
}: TabSection) {
  const store = useTabStoreApi();
  const [editingPalmMuteNodes, setEditingPalmMuteNodes] = useState(false);
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const [reorderingColumns, setReorderingColumns] = useState(false);
  const [showingDeleteColumnsButtons, setShowingDeleteColumnsButtons] =
    useState(false);

  const [inputIdToFocus, setInputIdToFocus] = useState<string | null>(null);
  useEffect(() => {
    return store.subscribe((state, previous) => {
      if (state.editorHistoryRevision === previous.editorHistoryRevision)
        return;
      const subSection = state.tabData[sectionIndex]?.data[subSectionIndex];
      const pending = recoverPendingPalmMuteEdit(
        getTabPalmMuteValues(subSection?.type === "tab" ? subSection.data : []),
      );
      setLastModifiedPalmMuteNode(pending);
      setEditingPalmMuteNodes(Boolean(pending));
    });
  }, [store, sectionIndex, subSectionIndex]);

  // Meta + column identity only — note edits must not re-render this section shell.
  const subSection = useTabSubSectionMeta(sectionIndex, subSectionIndex);
  const columnIds = useTabColumnIds(sectionIndex, subSectionIndex);
  const columnTypes = useTabColumnTypes(sectionIndex, subSectionIndex);

  useEffect(() => {
    if (!inputIdToFocus) return;

    const match = /^input-(\d+)-(\d+)-(\d+)-(\d+)$/.exec(inputIdToFocus);
    if (match) {
      window.dispatchEvent(
        new CustomEvent("editing-tab-reveal-column", {
          detail: {
            sectionIndex: Number(match[1]),
            subSectionIndex: Number(match[2]),
            columnIndex: Number(match[3]),
            noteIndex: Number(match[4]),
          },
        }),
      );
    }

    const frame = requestAnimationFrame(() => {
      const currentNote = document.getElementById(
        `${sectionIndex}${subSectionIndex}ExtendTabButton`,
      );
      const newNoteToFocus = document.getElementById(inputIdToFocus);
      focusAndScrollIntoView(currentNote, newNoteToFocus);
      setInputIdToFocus(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [inputIdToFocus, sectionIndex, subSectionIndex]);

  // Intentionally omit currentChordIndex / currentlyPlayingMetadata / playback
  // fields: columns subscribe to those with fine-grained selectors so playback
  // ticks don't re-render the whole section (and invalidate DndContext).
  const { bpm, setTabData } = useTabStore((state) => ({
    bpm: state.bpm,
    setTabData: state.setTabData,
  }));

  const palmMuteValues = useTabPalmMuteValues(
    sectionIndex,
    subSectionIndex,
    editingPalmMuteNodes,
  );
  const pmNodeOpacities = getPalmMuteOpacities(
    palmMuteValues,
    lastModifiedPalmMuteNode,
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        !containerRef.current?.contains(document.activeElement) &&
        // mouse isn't within this container
        !containerRef.current?.matches(":hover")
      ) {
        return;
      }

      if (e.altKey && e.key === "r") {
        e.preventDefault();
        toggleReorderingColumns();
      } else if (e.altKey && e.key === "d") {
        e.preventDefault();
        toggleDeletingColumns();
      } else if (e.altKey && e.key === "p") {
        e.preventDefault();
        toggleEditingPalmMuteNodes();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  function addNewColumns() {
    setTabData((draft) => {
      const subSection = draft[sectionIndex]!.data[subSectionIndex];
      if (subSection?.type === "tab") {
        for (let i = 0; i < 8; i++) {
          subSection.data.push(
            createTabNote({
              noteLength: subSection.baseNoteLength,
            }),
          );
        }
      }
    });
  }

  function finishEditingPalmMuteNodes() {
    if (lastModifiedPalmMuteNode) {
      setTabData((draft) => {
        const subSection = draft[sectionIndex]?.data[subSectionIndex];
        if (subSection?.type === "tab") {
          applyTabPalmMuteValues(
            subSection.data,
            finishPalmMuteEdit(
              getTabPalmMuteValues(subSection.data),
              lastModifiedPalmMuteNode,
            ),
          );
        }
      });
    }
    setLastModifiedPalmMuteNode(null);
    setEditingPalmMuteNodes(false);
  }

  function toggleEditingPalmMuteNodes() {
    if (editingPalmMuteNodes) finishEditingPalmMuteNodes();
    else {
      setReorderingColumns(false);
      setShowingDeleteColumnsButtons(false);
      setEditingPalmMuteNodes(true);
    }
  }

  function toggleReorderingColumns() {
    finishEditingPalmMuteNodes();
    setReorderingColumns((previous) => !previous);
    setShowingDeleteColumnsButtons(false);
  }

  function toggleDeletingColumns() {
    finishEditingPalmMuteNodes();
    setShowingDeleteColumnsButtons((previous) => !previous);
    setReorderingColumns(false);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (typeof active.id !== "string" || typeof over?.id !== "string") return;
    const activeId = active.id;
    const overId = over.id;
    setTabData((draft) => {
      const subSection = draft[sectionIndex]?.data[subSectionIndex];
      if (subSection?.type === "tab") {
        subSection.data = reorderTabColumns(subSection.data, activeId, overId);
      }
    });
  }

  function handleRepetitionsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newRepetitions =
      e.target.value.length === 0 ? -1 : parseInt(e.target.value);
    if (isNaN(newRepetitions) || newRepetitions > 99) return;

    setTabData((draft) => {
      const subSection = draft[sectionIndex]!.data[subSectionIndex];
      if (subSection?.type === "tab") {
        subSection.repetitions = newRepetitions;
      }
    });
  }

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newBpm = e.target.value.length === 0 ? -1 : parseInt(e.target.value);
    if (isNaN(newBpm) || newBpm > 500) return;

    setTabData((draft) => {
      const subSection = draft[sectionIndex]!.data[subSectionIndex];
      if (subSection?.type === "tab") {
        subSection.bpm = newBpm;
      }
    });
  }

  function handleExtendTabButtonKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
  ) {
    if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const firstNewColumnIndex = subSection.columnCount - 1; // this will be the first of the 8 new strums added

      const currentNote = document.getElementById(
        `${sectionIndex}${subSectionIndex}ExtendTabButton`,
      );
      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${firstNewColumnIndex}-3`,
      );

      focusAndScrollIntoView(currentNote, newNoteToFocus);
    } else if (e.key === "Enter") {
      addNewColumns();

      const firstNewColumnIndex = subSection.columnCount;
      setInputIdToFocus(
        `input-${sectionIndex}-${subSectionIndex}-${firstNewColumnIndex}-3`,
      );
    }
  }

  function handleBaseNoteLengthChange(
    newNoteLength: "whole" | "half" | "quarter" | "eighth" | "sixteenth",
  ) {
    setTabData((draft) => {
      const subSection = draft[sectionIndex]!.data[subSectionIndex];
      if (subSection?.type === "tab") {
        subSection.baseNoteLength = newNoteLength;
        for (const column of subSection.data) {
          // Skip measure lines since they don't have a note length
          if (isTabMeasureLine(column)) continue;

          column.noteLength = newNoteLength;
        }
      }
    });
  }

  return (
    <div
      ref={containerRef}
      onKeyDownCapture={(event) => {
        // Resolve the pending anchor before a shortcut changes column indices.
        if (
          lastModifiedPalmMuteNode &&
          event.target instanceof HTMLInputElement &&
          !event.altKey &&
          (["q", "w", "|"].includes(event.key.toLowerCase()) ||
            (event.ctrlKey && event.shiftKey && event.key === "Backspace"))
        ) {
          finishEditingPalmMuteNodes();
        }
      }}
      className={[
        presentation === "embedded"
          ? "baseVertFlex relative w-full !justify-start"
          : "baseVertFlex relative w-full !justify-start gap-1 rounded-md rounded-tl-md border bg-secondary-active/25 p-4 shadow-md md:p-8",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {presentation === "full" && (
        <div className="baseFlex w-full !items-start">
          <div className="baseVertFlex w-5/6 !items-start gap-4 xl:!flex-row xl:!justify-start">
            <div className="baseFlex gap-2">
              <div className="baseVertFlex !items-start gap-2 sm:!flex-row sm:!items-center lg:gap-4">
                <div className="baseFlex gap-2">
                  <Label
                    htmlFor={`${sectionIndex}${subSectionIndex}noteLengthSelect`}
                  >
                    Note length
                  </Label>
                  <Select
                    value={subSection.baseNoteLength}
                    onValueChange={(value) => {
                      if (value !== null) handleBaseNoteLengthChange(value);
                    }}
                  >
                    <SelectTrigger
                      id={`${sectionIndex}${subSectionIndex}noteLengthSelect`}
                      className="w-[135px] bg-background text-foreground"
                    >
                      <SelectValue placeholder="Select a length" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="whole">
                        <div className="baseFlex gap-2">
                          <WholeNote />
                          Whole
                        </div>
                      </SelectItem>
                      <SelectItem value="half">
                        <div className="baseFlex gap-2">
                          <HalfNote />
                          Half
                        </div>
                      </SelectItem>
                      <SelectItem value="quarter">
                        <div className="baseFlex gap-2">
                          <QuarterNote />
                          Quarter
                        </div>
                      </SelectItem>
                      <SelectItem value="eighth">
                        <div className="baseFlex gap-2">
                          <EighthNote />
                          Eighth
                        </div>
                      </SelectItem>
                      <SelectItem value="sixteenth">
                        <div className="baseFlex gap-2">
                          <SixteenthNote />
                          Sixteenth
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="baseFlex gap-2">
                  <Label htmlFor={`${sectionIndex}${subSectionIndex}bpmInput`}>
                    BPM
                  </Label>
                  <div className="baseFlex">
                    <QuarterNote className="-ml-1 size-5" />

                    <Input
                      id={`${sectionIndex}${subSectionIndex}bpmInput`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-[52px] bg-background px-2.5 text-foreground placeholder:text-foreground/70"
                      placeholder={bpm === -1 ? "" : bpm.toString()}
                      value={
                        subSection.bpm === -1 ? "" : subSection.bpm.toString()
                      }
                      onChange={handleBpmChange}
                    />
                  </div>
                </div>

                <div className="baseFlex gap-2">
                  <Label
                    htmlFor={`${sectionIndex}${subSectionIndex}repetitionsInput`}
                  >
                    Repetitions
                  </Label>
                  <div className="relative w-12">
                    <span className="pointer-events-none absolute bottom-[9px] left-2 text-sm text-foreground">
                      x
                    </span>
                    <Input
                      id={`${sectionIndex}${subSectionIndex}repetitionsInput`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-[45px] bg-background px-2 pl-4 text-foreground placeholder:text-foreground/70"
                      placeholder="1"
                      value={
                        subSection.repetitions === -1
                          ? ""
                          : subSection.repetitions.toString()
                      }
                      onChange={handleRepetitionsChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="baseVertFlex !items-start gap-2 sm:!flex-row lg:gap-4">
              <div className="baseFlex">
                <TooltipProvider delay={0}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          disabled={editingPalmMuteNodes}
                          style={{
                            borderRadius: editingPalmMuteNodes
                              ? "0.375rem 0 0 0.375rem"
                              : "0.375rem",
                            transitionDelay: "0.1s",
                          }}
                          onClick={toggleEditingPalmMuteNodes}
                        >
                          PM Editor
                        </Button>
                      }
                    />
                    <TooltipContent side={"bottom"}>
                      <p>
                        Toggle: <kbd className="ml-1">Alt</kbd> <kbd>p</kbd>
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <AnimatePresence>
                  {editingPalmMuteNodes && (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{
                        ease: "easeInOut",
                      }}
                    >
                      <Button
                        className="rounded-l-none rounded-r-md px-2 py-0"
                        onClick={toggleEditingPalmMuteNodes}
                      >
                        <motion.div
                          variants={xVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          transition={{
                            ease: "easeInOut",
                          }}
                        >
                          <IoClose className="h-6 w-6" />
                        </motion.div>
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="baseFlex">
                <TooltipProvider delay={0}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          disabled={reorderingColumns}
                          style={{
                            borderRadius: reorderingColumns
                              ? "0.375rem 0 0 0.375rem"
                              : "0.375rem",
                            transitionDelay: "0.1s",
                          }}
                          onClick={toggleReorderingColumns}
                        >
                          Reorder chords
                        </Button>
                      }
                    />
                    <TooltipContent side={"bottom"}>
                      <p>
                        Toggle: <kbd className="ml-1">Alt</kbd> <kbd>r</kbd>
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <AnimatePresence>
                  {reorderingColumns && (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{
                        ease: "easeInOut",
                      }}
                    >
                      <Button
                        className="rounded-l-none rounded-r-md px-2 py-0"
                        onClick={toggleReorderingColumns}
                      >
                        <motion.div
                          variants={xVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          transition={{
                            ease: "easeInOut",
                          }}
                        >
                          <IoClose className="h-6 w-6" />
                        </motion.div>
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="baseFlex">
                <TooltipProvider delay={0}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant={"destructive"}
                          disabled={showingDeleteColumnsButtons}
                          style={{
                            borderRadius: showingDeleteColumnsButtons
                              ? "0.375rem 0 0 0.375rem"
                              : "0.375rem",
                            transitionDelay: "0.1s",
                          }}
                          className="baseFlex"
                          onClick={toggleDeletingColumns}
                        >
                          Delete chords
                        </Button>
                      }
                    />
                    <TooltipContent side={"bottom"}>
                      <p>
                        Toggle: <kbd className="ml-1">Alt</kbd> <kbd>d</kbd>
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <AnimatePresence>
                  {showingDeleteColumnsButtons && (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{
                        ease: "easeInOut",
                      }}
                    >
                      <Button
                        variant={"destructive"}
                        className="rounded-l-none rounded-r-md px-2 py-0"
                        onClick={toggleDeletingColumns}
                      >
                        <motion.div
                          variants={xVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          transition={{
                            ease: "easeInOut",
                          }}
                        >
                          <IoClose className="h-6 w-6" />
                        </motion.div>
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <MiscellaneousControls
            type={"tab"}
            sectionIndex={sectionIndex}
            subSectionIndex={subSectionIndex}
          />
        </div>
      )}

      <EditingTabStaff
        sectionIndex={sectionIndex}
        subSectionIndex={subSectionIndex}
        columnIds={columnIds}
        columnTypes={columnTypes}
        pmNodeOpacities={pmNodeOpacities}
        editingPalmMuteNodes={editingPalmMuteNodes}
        setEditingPalmMuteNodes={setEditingPalmMuteNodes}
        lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
        setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
        reorderingColumns={reorderingColumns}
        showingDeleteColumnsButtons={showingDeleteColumnsButtons}
        onDragEnd={handleDragEnd}
      />

      {presentation === "full" && (
        <Button
          id={`${sectionIndex}${subSectionIndex}ExtendTabButton`}
          onKeyDown={handleExtendTabButtonKeyDown}
          onClick={addNewColumns}
          className="mt-8 px-4"
        >
          Extend tab
        </Button>
      )}
    </div>
  );
}

export default TabSection;
