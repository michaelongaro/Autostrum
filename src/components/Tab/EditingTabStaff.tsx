import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { Transform } from "@dnd-kit/utilities";
import { useIsomorphicLayoutEffect } from "@react-hookz/web";
import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Button } from "~/components/ui/button";
import { PrettyVerticalTuning } from "~/components/ui/PrettyTuning";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  EDITING_TAB_PLAYHEAD_HEIGHT_PX,
  useEditingTabPlayhead,
} from "~/hooks/useEditingTabPlayhead";
import { useTabStore } from "~/stores/TabStore";
import {
  EDITING_TAB_COLUMN_HEIGHT_PX,
  EDITING_TAB_FOOTER_HEIGHT_PX,
  EDITING_TAB_ROW_STRIDE_PX,
  EDITING_TAB_STAFF_LINE_HEIGHT_PX,
  EDITING_TAB_STAFF_LINE_INSET_PX,
  EDITING_TAB_TUNING_PALM_MUTE_SPACER_PX,
} from "~/utils/editingTabGeometry";
import {
  buildEditingTabRowLayout,
  findEditingTabRowIndex,
  getEditingTuningGutterWidthPx,
  shouldVirtualizeEditingTab,
  type EditingTabRow,
  type EditingTabRowLayout,
} from "~/utils/editingTabLayout";
import { EighthNote, QuarterNote } from "~/utils/noteLengthIcons";
import {
  getStaticTabLayoutWidthPx,
  getVisibleRowRangeFromBodyRect,
  getVisibleViewportWindow,
  type VisibleRowRange,
} from "~/utils/staticTabGeometry";
import type { LastModifiedPalmMuteNodeLocation } from "./TabSection";
import TabMeasureLine, { SortableTabMeasureLine } from "./TabMeasureLine";
import TabNotesColumn, { SortableTabNotesColumn } from "./TabNotesColumn";

const EDITING_TAB_OVERSCAN_PX = EDITING_TAB_ROW_STRIDE_PX * 2;

const keyboardSensorOptions = {
  coordinateGetter: sortableKeyboardCoordinates,
};

const ENDCAP_GROUP_CLASS =
  "baseFlex w-max shrink-0 flex-nowrap !items-start !justify-start";

/**
 * Keep column drags inside the staff. The last column's DOM parent is the
 * endcap group, so `restrictToParentElement` would clamp that drag to the
 * group instead of the staff.
 */
function restrictTransformToRect(
  transform: Transform,
  rect: { top: number; left: number; bottom: number; right: number },
  boundingRect: DOMRect,
): Transform {
  const value = { ...transform };

  if (rect.top + transform.y <= boundingRect.top) {
    value.y = boundingRect.top - rect.top;
  } else if (
    rect.bottom + transform.y >=
    boundingRect.top + boundingRect.height
  ) {
    value.y = boundingRect.top + boundingRect.height - rect.bottom;
  }

  if (rect.left + transform.x <= boundingRect.left) {
    value.x = boundingRect.left - rect.left;
  } else if (
    rect.right + transform.x >=
    boundingRect.left + boundingRect.width
  ) {
    value.x = boundingRect.left + boundingRect.width - rect.right;
  }

  return value;
}

interface RevealColumnDetail {
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;
  noteIndex: number;
}

interface EditingTabStaffProps {
  sectionIndex: number;
  subSectionIndex: number;
  columnIds: string[];
  columnTypes: ("note" | "measureLine")[];
  pmNodeOpacities: string[];
  editingPalmMuteNodes: boolean;
  setEditingPalmMuteNodes: Dispatch<SetStateAction<boolean>>;
  lastModifiedPalmMuteNode: LastModifiedPalmMuteNodeLocation | null;
  setLastModifiedPalmMuteNode: Dispatch<
    SetStateAction<LastModifiedPalmMuteNodeLocation | null>
  >;
  reorderingColumns: boolean;
  showingDeleteColumnsButtons: boolean;
  onDragEnd: (event: DragEndEvent) => void;
}

function EditingTabStaff({
  sectionIndex,
  subSectionIndex,
  columnIds,
  columnTypes,
  pmNodeOpacities,
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
  reorderingColumns,
  showingDeleteColumnsButtons,
  onDragEnd,
}: EditingTabStaffProps) {
  const staffRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<EditingTabRowLayout | null>(null);

  const [innerWidth, setInnerWidth] = useState<number | null>(null);
  const [visibleRange, setVisibleRange] = useState<VisibleRowRange | null>(
    null,
  );
  const [pinnedColumn, setPinnedColumn] = useState<RevealColumnDetail | null>(
    null,
  );

  const { tuning, setShowGlossaryDialog } = useTabStore((state) => ({
    tuning: state.tuning,
    setShowGlossaryDialog: state.setShowGlossaryDialog,
  }));

  // While audio is playing, keep the active column's row mounted so the
  // playhead can measure it even if it sits just outside the overscan window.
  // Paused playback does not pin a row — otherwise column 0 stays mounted
  // for the life of a long section.
  const playbackColumnIndex = useTabStore((state) => {
    if (!state.audioMetadata.playing) return -1;
    const metadata = state.currentlyPlayingMetadata;
    if (!metadata) return -1;
    const location = metadata[state.currentChordIndex]?.location;
    if (
      location?.sectionIndex !== sectionIndex ||
      location.subSectionIndex !== subSectionIndex
    ) {
      return -1;
    }
    return location.chordIndex;
  });

  useEditingTabPlayhead({
    sectionIndex,
    subSectionIndex,
    containerRef: staffRef,
    playheadRef,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, keyboardSensorOptions),
  );

  const dndModifiers = useMemo<Modifier[]>(
    () => [
      ({ transform, draggingNodeRect }) => {
        const staff = staffRef.current;
        if (!draggingNodeRect || !staff) return transform;
        return restrictTransformToRect(
          transform,
          draggingNodeRect,
          staff.getBoundingClientRect(),
        );
      },
    ],
    [],
  );

  const forceFullLayout = reorderingColumns || showingDeleteColumnsButtons;
  const canVirtualize =
    !forceFullLayout && shouldVirtualizeEditingTab(columnIds.length);

  const layout =
    canVirtualize && innerWidth !== null && innerWidth > 0
      ? buildEditingTabRowLayout(
          columnTypes,
          innerWidth,
          getEditingTuningGutterWidthPx(tuning),
        )
      : null;

  const virtualizedLayout =
    layout !== null && layout.rows.length >= 2 ? layout : null;
  const isVirtualized = virtualizedLayout !== null;

  const measureWidth = useCallback(() => {
    const body = staffRef.current;
    if (!body) return;
    const width = getStaticTabLayoutWidthPx(body);
    if (width <= 0) return;
    setInnerWidth((prev) =>
      prev !== null && Math.abs(prev - width) < 0.5 ? prev : width,
    );
  }, []);

  const recomputeVisibleRange = useCallback(() => {
    const body = staffRef.current;
    const currentLayout = layoutRef.current;
    if (!body || !currentLayout) return;

    const viewport = getVisibleViewportWindow();
    const range = getVisibleRowRangeFromBodyRect(
      currentLayout,
      body.getBoundingClientRect(),
      viewport.height,
      EDITING_TAB_OVERSCAN_PX,
      viewport.top,
      currentLayout.rowStride,
    );

    setVisibleRange((prev) =>
      prev?.startRow === range?.startRow && prev?.endRow === range?.endRow
        ? prev
        : range,
    );
  }, []);

  useIsomorphicLayoutEffect(() => {
    layoutRef.current = virtualizedLayout;
    if (!canVirtualize) return;
    measureWidth();
    recomputeVisibleRange();
  }, [canVirtualize, virtualizedLayout, measureWidth, recomputeVisibleRange]);

  useEffect(() => {
    const body = staffRef.current;
    if (!body || !canVirtualize || typeof ResizeObserver === "undefined") {
      return;
    }
    const resizeObserver = new ResizeObserver(() => measureWidth());
    resizeObserver.observe(body);
    return () => resizeObserver.disconnect();
  }, [canVirtualize, measureWidth]);

  useEffect(() => {
    if (!isVirtualized) return;

    const body = staffRef.current;
    let rafId = 0;
    const scheduleRecompute = () => {
      if (rafId !== 0) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        recomputeVisibleRange();
      });
    };

    scheduleRecompute();

    window.addEventListener("scroll", scheduleRecompute, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", scheduleRecompute, { passive: true });
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("scroll", scheduleRecompute);
    visualViewport?.addEventListener("resize", scheduleRecompute);

    let intersectionObserver: IntersectionObserver | null = null;
    if (body && typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(
        () => scheduleRecompute(),
        {
          rootMargin: `${EDITING_TAB_OVERSCAN_PX}px 0px`,
        },
      );
      intersectionObserver.observe(body);
    }

    return () => {
      window.removeEventListener("scroll", scheduleRecompute, {
        capture: true,
      });
      window.removeEventListener("resize", scheduleRecompute);
      visualViewport?.removeEventListener("scroll", scheduleRecompute);
      visualViewport?.removeEventListener("resize", scheduleRecompute);
      intersectionObserver?.disconnect();
      if (rafId !== 0) cancelAnimationFrame(rafId);
    };
  }, [isVirtualized, recomputeVisibleRange]);

  useEffect(() => {
    function onReveal(event: Event) {
      const detail = (event as CustomEvent<RevealColumnDetail>).detail;
      if (
        !detail ||
        detail.sectionIndex !== sectionIndex ||
        detail.subSectionIndex !== subSectionIndex
      ) {
        return;
      }
      setPinnedColumn(detail);
    }

    window.addEventListener("editing-tab-reveal-column", onReveal);
    return () => {
      window.removeEventListener("editing-tab-reveal-column", onReveal);
    };
  }, [sectionIndex, subSectionIndex]);

  useIsomorphicLayoutEffect(() => {
    if (!pinnedColumn) return;
    const input = document.getElementById(
      `input-${pinnedColumn.sectionIndex}-${pinnedColumn.subSectionIndex}-${pinnedColumn.columnIndex}-${pinnedColumn.noteIndex}`,
    );
    if (!(input instanceof HTMLElement)) return;
    if (document.activeElement !== input) input.focus();

    const currentLayout = layoutRef.current;
    const rowIndex = currentLayout
      ? findEditingTabRowIndex(currentLayout, pinnedColumn.columnIndex)
      : -1;
    const inWindow =
      visibleRange !== null &&
      rowIndex >= visibleRange.startRow &&
      rowIndex <= visibleRange.endRow;

    if (inWindow || !isVirtualized) {
      setPinnedColumn(null);
      return;
    }

    input.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pinnedColumn, visibleRange, isVirtualized]);

  function renderColumn(index: number) {
    const columnId = columnIds[index];
    if (!columnId) return null;

    if (columnTypes[index] === "measureLine") {
      const measureProps = {
        sectionIndex,
        subSectionIndex,
        columnIndex: index,
        editingPalmMuteNodes,
        reorderingColumns,
        showingDeleteColumnsButtons,
      };
      return reorderingColumns ? (
        <SortableTabMeasureLine key={columnId} {...measureProps} />
      ) : (
        <TabMeasureLine key={columnId} {...measureProps} />
      );
    }

    const noteProps = {
      sectionIndex,
      subSectionIndex,
      columnIndex: index,
      pmNodeOpacity: pmNodeOpacities[index] ?? "1",
      editingPalmMuteNodes,
      setEditingPalmMuteNodes,
      lastModifiedPalmMuteNode,
      setLastModifiedPalmMuteNode,
      reorderingColumns,
      showingDeleteColumnsButtons,
    };

    return reorderingColumns ? (
      <SortableTabNotesColumn key={columnId} {...noteProps} />
    ) : (
      <TabNotesColumn key={columnId} {...noteProps} />
    );
  }

  function renderColumns(startIndex: number, endIndex: number) {
    const columns = [];
    for (let index = startIndex; index <= endIndex; index++) {
      columns.push(renderColumnWithEndcap(index));
    }
    return columns;
  }

  // The 1px end nut is its own flex item. Grouping it with the last column
  // keeps flex-wrap from dropping the nut onto a line by itself.
  function renderColumnWithEndcap(index: number) {
    const column = renderColumn(index);
    if (index !== columnIds.length - 1 || column === null) return column;

    return (
      <div
        key={`${columnIds[index]}-endcap`}
        data-tab-endcap-group=""
        className={ENDCAP_GROUP_CLASS}
      >
        {column}
        <EndNut />
      </div>
    );
  }

  const rowsToPaint: EditingTabRow[] = [];
  if (virtualizedLayout) {
    const wanted = new Set<number>();
    if (visibleRange) {
      const lastRowIndex = virtualizedLayout.rows.length - 1;
      const startRow = Math.min(visibleRange.startRow, lastRowIndex);
      const endRow = Math.min(visibleRange.endRow, lastRowIndex);
      for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
        wanted.add(rowIndex);
      }
    }

    const pinnedIndexes = [pinnedColumn?.columnIndex ?? -1];
    if (playbackColumnIndex >= 0) {
      pinnedIndexes.push(playbackColumnIndex, playbackColumnIndex + 1);
    }
    for (const columnIndex of pinnedIndexes) {
      if (columnIndex < 0) continue;
      const rowIndex = findEditingTabRowIndex(virtualizedLayout, columnIndex);
      if (rowIndex >= 0) wanted.add(rowIndex);
    }

    for (const rowIndex of [...wanted].sort((a, b) => a - b)) {
      const row = virtualizedLayout.rows[rowIndex];
      if (row) rowsToPaint.push(row);
    }
  }

  const awaitingVirtualMeasure =
    canVirtualize && !isVirtualized && innerWidth === null;

  return (
    <div
      ref={staffRef}
      data-editing-tab-staff=""
      data-editing-tab-virtualized={isVirtualized ? "true" : "false"}
      style={
        isVirtualized && virtualizedLayout
          ? { height: virtualizedLayout.totalHeight }
          : awaitingVirtualMeasure
            ? { minHeight: EDITING_TAB_COLUMN_HEIGHT_PX }
            : undefined
      }
      className="baseFlex relative mt-4 w-full flex-wrap !items-start !justify-start gap-y-4"
    >
      {isVirtualized && virtualizedLayout ? (
        rowsToPaint.map((row) => (
          <div
            key={row.rowIndex}
            className="baseFlex absolute left-0 w-full !items-start !justify-start"
            style={{
              top: row.top,
              height: EDITING_TAB_COLUMN_HEIGHT_PX,
            }}
          >
            {row.rowIndex === 0 && (
              <TuningGutter
                tuning={tuning}
                onOpenGlossary={() => setShowGlossaryDialog(true)}
              />
            )}
            {renderColumns(row.startIndex, row.endIndex)}
          </div>
        ))
      ) : awaitingVirtualMeasure ? null : (
        <>
          <TuningGutter
            tuning={tuning}
            onOpenGlossary={() => setShowGlossaryDialog(true)}
          />
          {reorderingColumns ? (
            <DndContext
              sensors={sensors}
              modifiers={dndModifiers}
              collisionDetection={rectIntersection}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={columnIds} strategy={rectSortingStrategy}>
                {columnIds.map((columnId, index) => (
                  <Fragment key={columnId}>
                    {renderColumnWithEndcap(index)}
                  </Fragment>
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            columnIds.map((columnId, index) => (
              <Fragment key={columnId}>
                {renderColumnWithEndcap(index)}
              </Fragment>
            ))
          )}
          {columnIds.length === 0 && <EndNut />}
        </>
      )}

      <div
        ref={playheadRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-10 w-[2px] bg-primary will-change-transform"
        style={{
          height: EDITING_TAB_PLAYHEAD_HEIGHT_PX,
          opacity: 0,
        }}
      />
    </div>
  );
}

function TuningGutter({
  tuning,
  onOpenGlossary,
}: {
  tuning: string;
  onOpenGlossary: () => void;
}) {
  return (
    <div className="baseVertFlex shrink-0">
      <div style={{ height: EDITING_TAB_TUNING_PALM_MUTE_SPACER_PX }}></div>
      <div className="baseFlex !items-start">
        <div className="pr-2">
          <PrettyVerticalTuning
            tuning={tuning}
            height={`${EDITING_TAB_STAFF_LINE_HEIGHT_PX}px`}
          />
        </div>
        <div
          className="shrink-0 bg-foreground/50"
          style={{
            width: 1,
            height: EDITING_TAB_STAFF_LINE_HEIGHT_PX,
            marginTop: EDITING_TAB_STAFF_LINE_INSET_PX,
          }}
        ></div>
      </div>

      <div className="baseFlex relative h-[41px] w-full">
        <Popover>
          <PopoverTrigger className="baseFlex absolute left-[-8px] top-4 size-6 rounded-md transition-all hover:bg-primary-foreground/20 active:hover:bg-primary-foreground/10">
            <QuarterNote />
            <EighthNote />
          </PopoverTrigger>
          <PopoverContent className="baseVertFlex p-3" side="left">
            <span className="font-medium">Note lengths</span>
            <span>
              For more info, visit the{" "}
              <Button
                variant="link"
                className="h-4 p-0 underline"
                onClick={onOpenGlossary}
              >
                Glossary
              </Button>
            </span>
          </PopoverContent>
        </Popover>
      </div>

      <div className="baseFlex relative h-[41px] w-full">
        <Popover>
          <PopoverTrigger className="absolute left-[-8px] top-2 size-6 rounded-md transition-all hover:bg-primary-foreground/20 active:hover:bg-primary-foreground/10">
            <BsArrowDown className="absolute left-0 top-1 size-4" />
            <BsArrowUp className="absolute left-2 top-1 size-4" />
          </PopoverTrigger>
          <PopoverContent className="baseVertFlex p-3" side="left">
            <span className="font-medium">Chord modifiers</span>
            <span>
              For more info, visit the{" "}
              <Button
                variant="link"
                className="h-4 p-0 underline"
                onClick={onOpenGlossary}
              >
                Glossary
              </Button>
            </span>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function EndNut() {
  return (
    <div data-tab-end-nut="" className="baseVertFlex shrink-0">
      <div style={{ height: EDITING_TAB_TUNING_PALM_MUTE_SPACER_PX }}></div>
      <div className="baseFlex !items-start">
        <div
          className="shrink-0 bg-foreground/50"
          style={{
            width: 1,
            height: EDITING_TAB_STAFF_LINE_HEIGHT_PX,
            marginTop: EDITING_TAB_STAFF_LINE_INSET_PX,
          }}
        ></div>
      </div>
      <div style={{ height: EDITING_TAB_FOOTER_HEIGHT_PX }}></div>
    </div>
  );
}

export default EditingTabStaff;
