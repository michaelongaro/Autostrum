import type { TabMeasureLine, TabNote } from "~/stores/TabStore";
import { isTabMeasureLine } from "~/utils/tabNoteHelpers";

// ---------------------------------------------------------------------------
// Shared geometry for the static tab renderer.
//
// Single source of truth for the fixed dimensions that used to live as
// hardcoded tailwind classes spread across StaticTabSection,
// StaticTabNotesColumn, StaticTabMeasureLine, StaticStrummingPattern and
// PrettyTuning. Row-level virtualization (StaticTabSection) relies on these
// values to deterministically pack columns into rows and compute spacer
// heights without measuring the DOM, so every component that renders a
// column MUST size itself from these constants.
// ---------------------------------------------------------------------------

/** Full height of one packed tab row (palm mute header + strings + note length footer). */
export const STATIC_TAB_ROW_HEIGHT_PX = 248;

/** Height of the palm mute node header at the top of every column. */
export const STATIC_TAB_PALM_MUTE_HEADER_HEIGHT_PX = 32;

/** Height of the note length guide + chord effects footer at the bottom of every column. */
export const STATIC_TAB_NOTE_LENGTH_FOOTER_HEIGHT_PX = 55;

/** Width of the tuning gutter rendered at the start of the first row only. */
export const STATIC_TAB_TUNING_GUTTER_WIDTH_PX = 34;

/** Height of the rounded tuning box inside the tuning gutter / end cap. */
export const STATIC_TAB_TUNING_BOX_HEIGHT_PX = 160;

/** Height of the vertical tuning note list inside the tuning box. */
export const STATIC_TAB_VERTICAL_TUNING_HEIGHT_PX = 150;

/** Width of the vertical tuning note list (wider variant fits accidentals). */
export const STATIC_TAB_VERTICAL_TUNING_WIDTH_PX = 12;
export const STATIC_TAB_VERTICAL_TUNING_ACCIDENTAL_WIDTH_PX = 16;

/** Width of a regular (non-last) notes column. */
export const STATIC_TAB_NOTES_COLUMN_WIDTH_PX = 34;

/** Width of the rounded end cap appended to the last notes column. */
export const STATIC_TAB_END_CAP_WIDTH_PX = 12;

/** Width of the last notes column (regular column + end cap). */
export const STATIC_TAB_LAST_NOTES_COLUMN_WIDTH_PX =
  STATIC_TAB_NOTES_COLUMN_WIDTH_PX + STATIC_TAB_END_CAP_WIDTH_PX;

/** Width of a measure line column. */
export const STATIC_TAB_MEASURE_LINE_WIDTH_PX = 2;

/** Width of a single strum column inside a strumming pattern. */
export const STATIC_STRUMMING_PATTERN_STRUM_WIDTH_PX = 40;

/**
 * Extra distance (viewport px) above and below the viewport within which
 * rows are still rendered, so normal scrolling never reveals blank rows.
 */
export const STATIC_TAB_OVERSCAN_PX = 300;

/**
 * Subsections that pack into fewer rows than this stay on the simple
 * full-render path; virtualization overhead isn't worth it for them.
 *
 * Kept intentionally low (2): even a small subsection collapses to two
 * spacers while outside the overscan window, which is where the bulk of the
 * DOM reduction comes from on long tabs made of many modest subsections
 * (a typical 8-measure subsection is only ~3 rows on desktop, so a higher
 * threshold would disable virtualization for most real-world tabs).
 * Single-row subsections must stay on the full-render path regardless,
 * since their card shrink-wraps narrower than the container.
 */
export const STATIC_TAB_MIN_VIRTUALIZATION_ROWS = 2;

/**
 * Tolerance used when packing integer-width columns against a fractional
 * measured width (guards against sub-pixel layout widths).
 */
const ROW_PACKING_EPSILON_PX = 0.1;

/**
 * Minimum relative difference before a visual/layout width ratio is treated
 * as a real CSS zoom (guards against sub-pixel rounding noise at zoom=1).
 */
const CSS_ZOOM_RATIO_EPSILON = 0.001;

/**
 * Layout-space width of a subsection body for row packing.
 *
 * Prefer `offsetWidth` over `getBoundingClientRect().width / zoom`:
 * `offsetWidth` is always in the element's unzoomed CSS layout pixels (what
 * flex-wrap packs against), while `getBoundingClientRect` may or may not
 * already include CSS `zoom` depending on the browser (Chromium scales it;
 * older WebKit/iOS Safari historically returned unscaled values). Dividing
 * an already-unscaled rect by zoom under-measures the width on those
 * engines and packs too few columns per row.
 */
export function getStaticTabLayoutWidthPx(element: HTMLElement): number {
  return element.offsetWidth;
}

/**
 * Collapse near-1.0 ratios to exactly 1 so tiny sub-pixel noise doesn't
 * nudge row windows around at the default zoom.
 */
function normalizeCssZoomRatio(measured: number): number {
  if (Math.abs(measured - 1) < CSS_ZOOM_RATIO_EPSILON) return 1;
  return measured;
}

/**
 * Effective scale that converts this element's `getBoundingClientRect`
 * coordinates into its layout (unzoomed) coordinate space.
 *
 * Prefer a known layout height (the virtualized body's `style.height` /
 * `layout.totalHeight`) when available: `rect.height / layoutHeight` measures
 * how THIS engine scaled the same axis we use for row tops. Width-based
 * `rect.width / offsetWidth` is the fallback, but on some mobile WebKit
 * builds under CSS `zoom` the width ratio can collapse to ~1 while `top` /
 * `height` remain visually scaled — which makes the visible-row window drift
 * off-screen and leave in-viewport subsections empty.
 *
 * Either path matches whatever the engine actually does with CSS `zoom`:
 * - Chromium / modern Safari: ratio ≈ applied zoom → divide visual rects
 * - Older WebKit that ignores zoom in rects: ratio ≈ 1 → leave rects as-is
 *
 * Do **not** substitute `element.currentCSSZoom` or the app zoom setting
 * here: those describe the intended CSS zoom, not how the rect was scaled,
 * and using them on engines with unscaled rects would double-correct.
 */
export function getElementCssZoomForRect(
  element: HTMLElement,
  fallbackZoom: number = 1,
  layoutHeightPx?: number,
): number {
  const safeFallback = fallbackZoom > 0 ? fallbackZoom : 1;
  const rect = element.getBoundingClientRect();

  if (
    layoutHeightPx !== undefined &&
    layoutHeightPx > 0 &&
    Number.isFinite(layoutHeightPx)
  ) {
    const visualHeight = rect.height;
    if (visualHeight > 0 && Number.isFinite(visualHeight)) {
      const measured = visualHeight / layoutHeightPx;
      if (Number.isFinite(measured) && measured > 0) {
        return normalizeCssZoomRatio(measured);
      }
    }
  }

  const layoutWidth = element.offsetWidth;
  if (layoutWidth <= 0) return safeFallback;

  const visualWidth = rect.width;
  if (visualWidth <= 0 || !Number.isFinite(visualWidth)) return safeFallback;

  const measured = visualWidth / layoutWidth;
  if (!Number.isFinite(measured) || measured <= 0) return safeFallback;

  return normalizeCssZoomRatio(measured);
}

/**
 * Visible viewport window in the same coordinate space as
 * `getBoundingClientRect()` (layout viewport CSS pixels).
 *
 * On iOS Safari the visual viewport can pan/resize independently of
 * `window.innerHeight` (URL bar, pinch-zoom). Prefer VisualViewport when
 * present so row windows track what is actually on screen.
 */
export function getVisibleViewportWindow(): {
  top: number;
  height: number;
} {
  const visualViewport = window.visualViewport;
  if (visualViewport) {
    return {
      top: visualViewport.offsetTop,
      height: visualViewport.height,
    };
  }

  return { top: 0, height: window.innerHeight };
}

export function getStaticTabColumnWidthPx(
  column: TabNote | TabMeasureLine,
  isLastColumn: boolean,
): number {
  if (isTabMeasureLine(column)) return STATIC_TAB_MEASURE_LINE_WIDTH_PX;

  return isLastColumn
    ? STATIC_TAB_LAST_NOTES_COLUMN_WIDTH_PX
    : STATIC_TAB_NOTES_COLUMN_WIDTH_PX;
}

export interface StaticTabRowMetadata {
  rowIndex: number;
  /** Index (inclusive) of the first column in this row. */
  startIndex: number;
  /** Index (inclusive) of the last column in this row. */
  endIndex: number;
  /** Summed width of this row's items (incl. tuning gutter on row 0). */
  width: number;
  /** Cumulative offset of this row's top edge from the subsection body top. */
  top: number;
}

export interface StaticTabRowLayout {
  rows: StaticTabRowMetadata[];
  totalHeight: number;
}

/**
 * Deterministically packs tab columns into rows, replicating what the
 * browser's flex-wrap layout produces: row 0 starts with the 32px tuning
 * gutter, later rows use the full inner width. `innerWidthPx` must be the
 * subsection body's layout width (`offsetWidth` / `getStaticTabLayoutWidthPx`),
 * not a zoom-scaled `getBoundingClientRect` width.
 */
export function buildStaticTabRowLayout(
  columns: (TabNote | TabMeasureLine)[],
  innerWidthPx: number,
): StaticTabRowLayout {
  const rows: StaticTabRowMetadata[] = [];

  if (columns.length === 0 || innerWidthPx <= 0) {
    return { rows, totalHeight: 0 };
  }

  const maxRowWidth = innerWidthPx + ROW_PACKING_EPSILON_PX;

  let startIndex = 0;
  let rowWidth = STATIC_TAB_TUNING_GUTTER_WIDTH_PX; // row 0 reserves the gutter
  let columnsInRow = 0;

  const pushRow = (endIndex: number) => {
    rows.push({
      rowIndex: rows.length,
      startIndex,
      endIndex,
      width: rowWidth,
      top: rows.length * STATIC_TAB_ROW_HEIGHT_PX,
    });
  };

  for (const [index, column] of columns.entries()) {
    const columnWidth = getStaticTabColumnWidthPx(
      column,
      index === columns.length - 1,
    );

    if (columnsInRow > 0 && rowWidth + columnWidth > maxRowWidth) {
      pushRow(index - 1);
      startIndex = index;
      rowWidth = 0;
      columnsInRow = 0;
    }

    rowWidth += columnWidth;
    columnsInRow++;
  }

  pushRow(columns.length - 1);

  return { rows, totalHeight: rows.length * STATIC_TAB_ROW_HEIGHT_PX };
}

export interface VisibleRowRange {
  /** Index (inclusive) of the first row to render. */
  startRow: number;
  /** Index (inclusive) of the last row to render. */
  endRow: number;
}

/**
 * Computes which rows fall inside the overscan-expanded viewport.
 *
 * @param bodyTopPx        subsection body's `getBoundingClientRect().top`
 * @param viewportHeightPx visible viewport height (prefer
 *                         `visualViewport.height`, else `window.innerHeight`)
 * @param zoom             scale that converts viewport/`bodyTopPx` coords
 *                         into the body's layout coordinate space — pass
 *                         `getElementCssZoomForRect(body, fallback, totalHeight)`,
 *                         not the raw app zoom setting (see that helper's docs)
 * @param overscanPx       extra buffer above/below the viewport in the same
 *                         coordinate space as `bodyTopPx` / viewport height
 * @param viewportTopPx    top edge of the visible viewport in that same space
 *                         (visualViewport.offsetTop on iOS; 0 otherwise)
 * @returns the visible row range, or null when no row is within range
 */
export function getVisibleRowRange(
  layout: StaticTabRowLayout,
  bodyTopPx: number,
  viewportHeightPx: number,
  zoom: number,
  overscanPx: number = STATIC_TAB_OVERSCAN_PX,
  viewportTopPx: number = 0,
): VisibleRowRange | null {
  const rowCount = layout.rows.length;
  if (rowCount === 0) return null;

  const safeZoom = zoom > 0 ? zoom : 1;
  const safeViewportHeight =
    Number.isFinite(viewportHeightPx) && viewportHeightPx > 0
      ? viewportHeightPx
      : 0;
  const safeViewportTop = Number.isFinite(viewportTopPx) ? viewportTopPx : 0;

  // convert the overscan-expanded viewport window into the body's
  // unzoomed (layout px) coordinate space
  const windowStart =
    (safeViewportTop - overscanPx - bodyTopPx) / safeZoom;
  const windowEnd =
    (safeViewportTop + safeViewportHeight + overscanPx - bodyTopPx) /
    safeZoom;

  if (windowEnd <= 0 || windowStart >= layout.totalHeight) return null;

  const clamp = (value: number) => Math.min(Math.max(value, 0), rowCount - 1);

  const startRow = clamp(Math.floor(windowStart / STATIC_TAB_ROW_HEIGHT_PX));
  const endRow = clamp(Math.ceil(windowEnd / STATIC_TAB_ROW_HEIGHT_PX) - 1);

  // Defensive: floating-point edge cases can yield an inverted range even
  // when the window overlaps the body; treat that as "nothing visible".
  if (endRow < startRow) return null;

  return { startRow, endRow };
}
