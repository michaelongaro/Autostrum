import {
  useCallback,
  useEffect,
  useMemo,
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
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";
import type { COLORS, THEME } from "~/stores/TabStore";
import { isTabMeasureLine } from "~/utils/tabNoteHelpers";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import {
  buildStaticTabRowLayout,
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
    <SectionCard color={color} theme={theme}>
      <div
        className={`baseFlex relative w-full !justify-start ${overflowX ? "overflow-x-auto" : "flex-wrap"}`}
      >
        <TuningGutter tuning={tuning} color={color} theme={theme} />
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

  const zoom = useGetLocalStorageValues().zoom;
  const safeZoom = zoom > 0 ? zoom : 1;

  const bodyRef = useRef<HTMLDivElement | null>(null);

  // subsection body width in layout px (measured width divided by zoom);
  // null until first measurement, during which the full-render markup is
  // kept so SSR output and StaticTab's section-height measurement stay intact
  const [innerWidth, setInnerWidth] = useState<number | null>(null);
  const [visibleRange, setVisibleRange] = useState<VisibleRowRange | null>(
    null,
  );
  const [isNearViewport, setIsNearViewport] = useState(false);

  const layout = useMemo<StaticTabRowLayout | null>(() => {
    if (innerWidth === null) return null;
    return buildStaticTabRowLayout(subSectionData.data, innerWidth);
  }, [subSectionData.data, innerWidth]);

  // below the minimum-row threshold the subsection stays fully rendered
  const virtualizedLayout =
    layout !== null && layout.rows.length >= STATIC_TAB_MIN_VIRTUALIZATION_ROWS
      ? layout
      : null;
  const isVirtualized = virtualizedLayout !== null;

  const zoomRef = useRef(safeZoom);
  const layoutRef = useRef<StaticTabRowLayout | null>(null);

  const measureWidth = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;

    // getBoundingClientRect() is in visual (zoomed) px; row packing happens
    // in the body's own layout px, so divide the zoom back out
    const width = body.getBoundingClientRect().width / zoomRef.current;
    setInnerWidth((prev) => (prev === width ? prev : width));
  }, []);

  const recomputeVisibleRange = useCallback(() => {
    const body = bodyRef.current;
    const currentLayout = layoutRef.current;
    if (!body || !currentLayout) return;

    const range = getVisibleRowRange(
      currentLayout,
      body.getBoundingClientRect().top,
      window.innerHeight,
      zoomRef.current,
      STATIC_TAB_OVERSCAN_PX,
    );

    setVisibleRange((prev) =>
      prev?.startRow === range?.startRow && prev?.endRow === range?.endRow
        ? prev
        : range,
    );
  }, []);

  // measure synchronously before paint (and re-measure whenever zoom changes)
  useIsomorphicLayoutEffect(() => {
    zoomRef.current = safeZoom;
    measureWidth();
  }, [safeZoom, measureWidth]);

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
        <TuningGutter tuning={tuning} color={color} theme={theme} />
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
              {row.rowIndex === 0 && (
                <TuningGutter tuning={tuning} color={color} theme={theme} />
              )}
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
    <SectionCard color={color} theme={theme}>
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
  color,
  theme,
  children,
}: {
  color: COLORS;
  theme: THEME;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        borderColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-border"]})`,
        backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-secondary"]} / 0.25)`,
      }}
      className="baseVertFlex relative h-full !justify-start rounded-md border px-4 py-4 shadow-md md:px-8"
    >
      {children}
    </div>
  );
}

// rendered at the start of the first row only
function TuningGutter({
  tuning,
  color,
  theme,
}: {
  tuning: string;
  color: COLORS;
  theme: THEME;
}) {
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
          borderColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
          color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
          backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-background"]} / 0.75)`,
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
        <StaticTabMeasureLine
          key={column.id}
          columnData={column}
          color={color}
          theme={theme}
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

  return renderedColumns;
}

export default StaticTabSection;
