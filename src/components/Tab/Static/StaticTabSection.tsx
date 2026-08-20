import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useIsomorphicLayoutEffect } from "@react-hookz/web";
import StaticTabMeasureLine from "~/components/Tab/Static/StaticTabMeasureLine";
import StaticTabNotesColumn from "~/components/Tab/Static/StaticTabNotesColumn";
import { PrettyVerticalTuning } from "~/components/ui/PrettyTuning";
import {
  useTabStore,
  type TabMeasureLine,
  type TabNote,
  type TabSection,
} from "~/stores/TabStore";
import type { COLORS, THEME } from "~/stores/TabStore";
import { isTabMeasureLine } from "~/utils/tabNoteHelpers";
import { getMeasureLineBpmDisplay } from "~/utils/measureLineBpm";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import {
  buildStaticTabRowLayout,
  getStaticTabLayoutWidthPx,
  getVisibleRowRangeFromBodyRect,
  getVisibleViewportWindow,
  STATIC_TAB_BORDER_SPACER_PX,
  STATIC_TAB_END_LINE_WIDTH_PX,
  STATIC_TAB_MIN_VIRTUALIZATION_ROWS,
  STATIC_TAB_NOTE_LENGTH_FOOTER_HEIGHT_PX,
  STATIC_TAB_OVERSCAN_PX,
  STATIC_TAB_PALM_MUTE_HEADER_HEIGHT_PX,
  STATIC_TAB_ROW_HEIGHT_PX,
  STATIC_TAB_STAFF_BLOCK_HEIGHT_PX,
  STATIC_TAB_STAFF_LINE_HEIGHT_PX,
  STATIC_TAB_STAFF_LINE_INSET_PX,
  STATIC_TAB_STAFF_LINE_WIDTH_PX,
  STATIC_TAB_TUNING_GUTTER_WIDTH_PX,
  STATIC_TAB_TUNING_NOTE_GAP_PX,
  STATIC_TAB_VERTICAL_TUNING_HEIGHT_PX,
  type StaticTabRowLayout,
  type VisibleRowRange,
} from "~/utils/staticTabGeometry";

export interface LastModifiedPalmMuteNodeLocation {
  columnIndex: number;
  prevValue: string;
  currentValue: string;
}

interface StaticTabSection {
  subSectionData: TabSection;
  // retained for call-site compatibility (TabScreenshotPreview /
  // PracticePlaybackPanel); neighbors are now resolved from subSectionData
  sectionIndex: number;
  subSectionIndex: number;
  color: COLORS;
  theme: THEME;
  overflowX?: boolean;
  /**
   * Opt-in row-level virtualization. Only enabled from StaticTab via
   * StaticSectionContainer; every other caller keeps the full-render path.
   */
  virtualized?: boolean;
}

function StaticTabSection(props: StaticTabSection) {
  if (props.virtualized && !props.overflowX) {
    return <VirtualizedStaticTabSection {...props} />;
  }

  return <FullStaticTabSection {...props} />;
}

function FullStaticTabSection({
  subSectionData,
  color,
  theme,
  overflowX,
}: StaticTabSection) {
  const { tuning, bpm } = useTabStore((state) => ({
    tuning: state.tuning,
    bpm: state.bpm,
  }));

  return (
    <SectionCard>
      <div
        className={`baseFlex relative w-full !justify-start ${overflowX ? "overflow-x-auto" : "flex-wrap"}`}
      >
        <TuningGutter tuning={tuning} />
        {renderColumnRange(
          subSectionData.data,
          0,
          subSectionData.data.length - 1,
          color,
          theme,
          subSectionData.bpm,
          bpm,
        )}
      </div>
    </SectionCard>
  );
}

function VirtualizedStaticTabSection({
  subSectionData,
  color,
  theme,
}: StaticTabSection) {
  const { tuning, bpm } = useTabStore((state) => ({
    tuning: state.tuning,
    bpm: state.bpm,
  }));

  // App zoom — triggers a remasure when the setting changes. Visible-range
  // math no longer divides by this value; it maps the body's own rect.
  const zoom = useGetLocalStorageValues().zoom;
  const safeZoom = zoom > 0 ? zoom : 1;

  const bodyRef = useRef<HTMLDivElement | null>(null);

  // subsection body width in layout px; null until first measurement, during
  // which the full-render markup is kept so SSR output and StaticTab's
  // section-height measurement stay intact
  const [innerWidth, setInnerWidth] = useState<number | null>(null);
  const [visibleRange, setVisibleRange] = useState<VisibleRowRange | null>(
    null,
  );

  const layout: StaticTabRowLayout | null =
    innerWidth === null
      ? null
      : buildStaticTabRowLayout(subSectionData.data, innerWidth);

  // below the minimum-row threshold the subsection stays fully rendered
  const virtualizedLayout =
    layout !== null && layout.rows.length >= STATIC_TAB_MIN_VIRTUALIZATION_ROWS
      ? layout
      : null;
  const isVirtualized = virtualizedLayout !== null;

  const layoutRef = useRef<StaticTabRowLayout | null>(null);

  // React Compiler escape hatch: identity is a layout/resize effect dependency.
  const measureWidth = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;

    const width = getStaticTabLayoutWidthPx(body);

    // ignore degenerate measurements (e.g. while the element is hidden) so a
    // transient 0 width can never knock the subsection back to a full render
    if (width <= 0) return;

    setInnerWidth((prev) =>
      prev !== null && Math.abs(prev - width) < 0.5 ? prev : width,
    );
  }, []);

  // React Compiler escape hatch: identity is a layout/scroll effect dependency.
  const recomputeVisibleRange = useCallback(() => {
    const body = bodyRef.current;
    const currentLayout = layoutRef.current;
    if (!body || !currentLayout) return;

    // Map the body's getBoundingClientRect onto layout.totalHeight. Do not
    // divide by a separately measured CSS zoom or shift by
    // visualViewport.offsetTop — both desync on iOS Safari and were behind
    // "empty while in viewport" cards that only recovered when the settings
    // Drawer pinned body { position: fixed }.
    const viewport = getVisibleViewportWindow();
    const range = getVisibleRowRangeFromBodyRect(
      currentLayout,
      body.getBoundingClientRect(),
      viewport.height,
      STATIC_TAB_OVERSCAN_PX,
      viewport.top,
    );

    setVisibleRange((prev) =>
      prev?.startRow === range?.startRow && prev?.endRow === range?.endRow
        ? prev
        : range,
    );
  }, []);

  // measure + re-slide the visible window whenever zoom changes. Width in
  // layout px can change with CSS zoom on Safari used-value builds, and even
  // when it doesn't the visible window must be recomputed.
  useIsomorphicLayoutEffect(() => {
    measureWidth();
    recomputeVisibleRange();
  }, [safeZoom, measureWidth, recomputeVisibleRange]);

  // recompute the visible rows pre-paint whenever the row layout changes so
  // the swap from full render to virtualized rows never flashes blank rows
  useIsomorphicLayoutEffect(() => {
    layoutRef.current = virtualizedLayout;
    recomputeVisibleRange();
  }, [virtualizedLayout, recomputeVisibleRange]);

  // keep the measured width current on resize
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(() => measureWidth());
    resizeObserver.observe(body);

    return () => resizeObserver.disconnect();
  }, [measureWidth]);

  // Always track scroll/resize while virtualized, and also recompute on
  // IntersectionObserver updates. IO is NOT a gate (that left subsections
  // stuck empty); it is an extra signal for iOS when programmatic scroll
  // restore after the settings Drawer closes does not emit a scroll event.
  useEffect(() => {
    if (!isVirtualized) return;

    const body = bodyRef.current;
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
        { rootMargin: `${STATIC_TAB_OVERSCAN_PX}px 0px` },
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

  let bodyContent: ReactNode;

  if (virtualizedLayout === null) {
    // pre-measurement + below-threshold: identical to the full-render path
    bodyContent = (
      <>
        <TuningGutter tuning={tuning} />
        {renderColumnRange(
          subSectionData.data,
          0,
          subSectionData.data.length - 1,
          color,
          theme,
          subSectionData.bpm,
          bpm,
        )}
      </>
    );
  } else {
    const { rows, totalHeight } = virtualizedLayout;
    const lastRowIndex = rows.length - 1;
    const startRow =
      visibleRange === null ? 0 : Math.min(visibleRange.startRow, lastRowIndex);
    const endRow =
      visibleRange === null ? -1 : Math.min(visibleRange.endRow, lastRowIndex);
    const hasVisibleRows = endRow >= startRow;

    // two aggregate spacers sized to the summed hidden row heights keep the
    // total subsection height (and page scroll height) stable while scrolling
    const topSpacerHeight = hasVisibleRows
      ? (rows[startRow]?.top ?? 0)
      : totalHeight;
    const bottomSpacerHeight = hasVisibleRows
      ? totalHeight - ((rows[endRow]?.top ?? 0) + STATIC_TAB_ROW_HEIGHT_PX)
      : 0;

    bodyContent = (
      <>
        <div style={{ height: topSpacerHeight }} aria-hidden="true" />
        {hasVisibleRows &&
          rows.slice(startRow, endRow + 1).map((row) => (
            <div
              key={row.rowIndex}
              style={{ height: STATIC_TAB_ROW_HEIGHT_PX }}
              className="baseFlex w-full !justify-start"
            >
              {row.rowIndex === 0 && <TuningGutter tuning={tuning} />}
              {renderColumnRange(
                subSectionData.data,
                row.startIndex,
                row.endIndex,
                color,
                theme,
                subSectionData.bpm,
                bpm,
              )}
            </div>
          ))}
        <div style={{ height: bottomSpacerHeight }} aria-hidden="true" />
      </>
    );
  }

  return (
    // The card normally shrink-wraps to its flex-wrap content, which would
    // create a feedback loop once rows are virtualized (fewer rendered rows
    // -> narrower card -> narrower measured width -> repack). A subsection
    // that virtualizes always packs more than one row, meaning its wrapped
    // content already spanned the full container width, so pinning the card
    // to w-full is visually identical and keeps the measured width stable.
    <SectionCard fullWidth={isVirtualized}>
      <div
        ref={bodyRef}
        style={
          virtualizedLayout === null
            ? undefined
            : { height: virtualizedLayout.totalHeight }
        }
        className={
          virtualizedLayout === null
            ? "baseFlex relative w-full flex-wrap !justify-start"
            : "relative w-full"
        }
      >
        {bodyContent}
      </div>
    </SectionCard>
  );
}

function SectionCard({
  fullWidth = false,
  children,
}: {
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        borderColor: "hsl(var(--screenshot-border))",
        backgroundColor: "hsl(var(--screenshot-secondary) / 0.25)",
      }}
      className={`baseVertFlex relative h-full !justify-start rounded-md border px-4 py-4 shadow-md md:px-8 ${fullWidth ? "w-full" : ""}`}
    >
      {children}
    </div>
  );
}

const STATIC_STAFF_LINE_MARGIN_TOP_PX =
  STATIC_TAB_PALM_MUTE_HEADER_HEIGHT_PX +
  STATIC_TAB_BORDER_SPACER_PX +
  STATIC_TAB_STAFF_LINE_INSET_PX;

function StaticStaffLine() {
  return (
    <div
      className="shrink-0"
      style={{
        width: STATIC_TAB_STAFF_LINE_WIDTH_PX,
        height: STATIC_TAB_STAFF_LINE_HEIGHT_PX,
        marginTop: STATIC_TAB_BORDER_SPACER_PX + STATIC_TAB_STAFF_LINE_INSET_PX,
        backgroundColor: "hsl(var(--screenshot-foreground) / 0.5)",
      }}
    />
  );
}

// rendered at the start of the first row only
function TuningGutter({ tuning }: { tuning: string }) {
  return (
    <div
      style={{
        height: STATIC_TAB_ROW_HEIGHT_PX,
        width: STATIC_TAB_TUNING_GUTTER_WIDTH_PX,
        color: "hsl(var(--screenshot-foreground))",
      }}
      className="baseVertFlex !justify-start"
    >
      <div
        style={{ height: STATIC_TAB_PALM_MUTE_HEADER_HEIGHT_PX }}
        className="w-full"
      ></div>
      <div
        style={{ height: STATIC_TAB_STAFF_BLOCK_HEIGHT_PX }}
        className="baseFlex w-full !items-start !justify-end"
      >
        <div
          style={{
            paddingRight: STATIC_TAB_TUNING_NOTE_GAP_PX,
            paddingTop:
              STATIC_TAB_BORDER_SPACER_PX + STATIC_TAB_STAFF_LINE_INSET_PX - 12,
          }}
        >
          <PrettyVerticalTuning
            tuning={tuning}
            height={`${STATIC_TAB_VERTICAL_TUNING_HEIGHT_PX}px`}
          />
        </div>
        <StaticStaffLine />
      </div>
      <div
        style={{ height: STATIC_TAB_NOTE_LENGTH_FOOTER_HEIGHT_PX }}
        className="w-full"
      ></div>
    </div>
  );
}

function StaticEndStaffLine() {
  return (
    <div
      style={{
        height: STATIC_TAB_ROW_HEIGHT_PX,
        width: STATIC_TAB_END_LINE_WIDTH_PX,
      }}
      className="shrink-0"
    >
      <div
        style={{
          width: STATIC_TAB_END_LINE_WIDTH_PX,
          height: STATIC_TAB_STAFF_LINE_HEIGHT_PX,
          marginTop: STATIC_STAFF_LINE_MARGIN_TOP_PX,
          backgroundColor: "hsl(var(--screenshot-foreground) / 0.5)",
        }}
      />
    </div>
  );
}

// renders columns [startIndex, endIndex] (inclusive), resolving each column's
// neighbors here so individual columns don't need store subscriptions
function renderColumnRange(
  columns: (TabNote | TabMeasureLine)[],
  startIndex: number,
  endIndex: number,
  color: COLORS,
  theme: THEME,
  subSectionBpm: number,
  baselineBpm: number,
): ReactNode[] {
  const renderedColumns: ReactNode[] = [];

  for (let index = startIndex; index <= endIndex; index++) {
    const column = columns[index];
    if (column === undefined) continue;

    if (isTabMeasureLine(column)) {
      const { show, bpm } = getMeasureLineBpmDisplay({
        columns,
        measureLineIndex: index,
        subSectionBpm,
        baselineBpm,
      });
      renderedColumns.push(
        <StaticTabMeasureLine
          key={column.id}
          isInPalmMuteSection={column.isInPalmMuteSection}
          showBpm={show}
          bpmToShow={show ? bpm : undefined}
        />,
      );
    } else {
      renderedColumns.push(
        <StaticTabNotesColumn
          key={column.id}
          columnData={column}
          previousColumn={columns[index - 1]}
          nextColumn={columns[index + 1]}
          isLastColumn={index === columns.length - 1}
          color={color}
          theme={theme}
        />,
      );
    }
  }

  if (endIndex === columns.length - 1) {
    renderedColumns.push(<StaticEndStaffLine key="static-end-staff-line" />);
  }

  return renderedColumns;
}

export default StaticTabSection;
