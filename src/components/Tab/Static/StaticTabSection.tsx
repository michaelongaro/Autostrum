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
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import {
  buildStaticTabRowLayout,
  getElementCssZoomForRect,
  getStaticTabLayoutWidthPx,
  getVisibleRowRange,
  STATIC_TAB_MIN_VIRTUALIZATION_ROWS,
  STATIC_TAB_NOTE_LENGTH_FOOTER_HEIGHT_PX,
  STATIC_TAB_OVERSCAN_PX,
  STATIC_TAB_PALM_MUTE_HEADER_HEIGHT_PX,
  STATIC_TAB_ROW_HEIGHT_PX,
  STATIC_TAB_TUNING_BOX_HEIGHT_PX,
  STATIC_TAB_TUNING_GUTTER_WIDTH_PX,
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
  const { tuning } = useTabStore((state) => ({
    tuning: state.tuning,
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
  const { tuning } = useTabStore((state) => ({
    tuning: state.tuning,
  }));

  // App zoom setting — kept as a fallback for getElementCssZoomForRect when
  // the body has no measurable layout width yet. Visible-range conversion
  // uses the measured rect/offsetWidth ratio, not this value directly.
  const zoom = useGetLocalStorageValues().zoom;
  const safeZoom = zoom > 0 ? zoom : 1;

  const bodyRef = useRef<HTMLDivElement | null>(null);

  // subsection body width in layout px (offsetWidth); null until first
  // measurement, during which the full-render markup is kept so SSR output
  // and StaticTab's section-height measurement stay intact
  const [innerWidth, setInnerWidth] = useState<number | null>(null);
  const [visibleRange, setVisibleRange] = useState<VisibleRowRange | null>(
    null,
  );
  const [isNearViewport, setIsNearViewport] = useState(false);

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

  const zoomFallbackRef = useRef(safeZoom);
  const layoutRef = useRef<StaticTabRowLayout | null>(null);

  // React Compiler escape hatch: identity is a layout/resize effect dependency.
  const measureWidth = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;

    // Layout px from offsetWidth — independent of whether getBoundingClientRect
    // includes CSS zoom (Chromium) or not (older WebKit/iOS Safari).
    const width = getStaticTabLayoutWidthPx(body);

    // ignore degenerate measurements (e.g. while the element is hidden) so a
    // transient 0 width can never knock the subsection back to a full render
    if (width <= 0) return;

    setInnerWidth((prev) => (prev === width ? prev : width));
  }, []);

  // React Compiler escape hatch: identity is a layout/scroll effect dependency.
  const recomputeVisibleRange = useCallback(() => {
    const body = bodyRef.current;
    const currentLayout = layoutRef.current;
    if (!body || !currentLayout) return;

    // Scale factor that matches how THIS engine scaled the body's rect, so
    // we convert bodyTop into layout space without double-dividing on
    // browsers where getBoundingClientRect ignores CSS zoom.
    const rectZoom = getElementCssZoomForRect(body, zoomFallbackRef.current);

    const range = getVisibleRowRange(
      currentLayout,
      body.getBoundingClientRect().top,
      window.innerHeight,
      rectZoom,
      STATIC_TAB_OVERSCAN_PX,
    );

    setVisibleRange((prev) =>
      prev?.startRow === range?.startRow && prev?.endRow === range?.endRow
        ? prev
        : range,
    );
  }, []);

  // measure + re-slide the visible window whenever zoom changes. Width in
  // layout px is usually unchanged by CSS zoom, so measureWidth alone would
  // no-op and leave a stale visible range computed under the previous zoom.
  useIsomorphicLayoutEffect(() => {
    zoomFallbackRef.current = safeZoom;
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

  // activate/deactivate this subsection as it nears the viewport
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || typeof IntersectionObserver === "undefined") return;

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;

        setIsNearViewport(entry.isIntersecting);
        recomputeVisibleRange();
      },
      { rootMargin: `${STATIC_TAB_OVERSCAN_PX}px 0px` },
    );
    intersectionObserver.observe(body);

    return () => intersectionObserver.disconnect();
  }, [recomputeVisibleRange]);

  // while near the viewport, track scroll/resize to slide the visible window
  useEffect(() => {
    if (!isNearViewport || !isVirtualized) return;

    let rafId = 0;
    const scheduleRecompute = () => {
      if (rafId !== 0) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        recomputeVisibleRange();
      });
    };

    window.addEventListener("scroll", scheduleRecompute, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", scheduleRecompute, { passive: true });

    return () => {
      window.removeEventListener("scroll", scheduleRecompute, {
        capture: true,
      });
      window.removeEventListener("resize", scheduleRecompute);
      if (rafId !== 0) cancelAnimationFrame(rafId);
    };
  }, [isNearViewport, isVirtualized, recomputeVisibleRange]);

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

// rendered at the start of the first row only
function TuningGutter({ tuning }: { tuning: string }) {
  return (
    <div
      style={{
        height: STATIC_TAB_ROW_HEIGHT_PX,
        width: STATIC_TAB_TUNING_GUTTER_WIDTH_PX,
      }}
      className="baseVertFlex"
    >
      <div
        style={{ height: STATIC_TAB_PALM_MUTE_HEADER_HEIGHT_PX }}
        className="w-full"
      ></div>
      <div
        style={{
          height: STATIC_TAB_TUNING_BOX_HEIGHT_PX,
          width: STATIC_TAB_TUNING_GUTTER_WIDTH_PX,
          borderColor: "hsl(var(--screenshot-foreground))",
          color: "hsl(var(--screenshot-foreground))",
          backgroundColor: "hsl(var(--screenshot-background) / 0.75)",
        }}
        className="baseVertFlex relative rounded-l-2xl border-2 p-2"
      >
        <PrettyVerticalTuning
          tuning={tuning}
          height={`${STATIC_TAB_VERTICAL_TUNING_HEIGHT_PX}px`}
        />
      </div>
      <div
        style={{ height: STATIC_TAB_NOTE_LENGTH_FOOTER_HEIGHT_PX }}
        className="w-full"
      ></div>
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
): ReactNode[] {
  const renderedColumns: ReactNode[] = [];

  for (let index = startIndex; index <= endIndex; index++) {
    const column = columns[index];
    if (column === undefined) continue;

    if (isTabMeasureLine(column)) {
      renderedColumns.push(
        <StaticTabMeasureLine key={column.id} columnData={column} />,
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

  return renderedColumns;
}

export default StaticTabSection;
