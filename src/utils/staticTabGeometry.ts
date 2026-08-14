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

export const STATIC_TAB_STRING_COUNT = 6;

/** Vertical space for one string row. Unchanged from the boxed layout. */
export const STATIC_TAB_STRING_ROW_HEIGHT_PX = 24;

export const STATIC_TAB_STRINGS_HEIGHT_PX =
  STATIC_TAB_STRING_ROW_HEIGHT_PX * STATIC_TAB_STRING_COUNT;

/**
 * Empty space above the first string / below the sixth string. Previously
 * held the 2px top/bottom container borders; kept so packed row height and
 * palm-mute / note-length alignment stay the same.
 */
export const STATIC_TAB_BORDER_SPACER_PX = 0;

/** String stack plus the former top/bottom border spacers (8 + 144 + 8). */
export const STATIC_TAB_STAFF_BLOCK_HEIGHT_PX =
  STATIC_TAB_STRINGS_HEIGHT_PX + STATIC_TAB_BORDER_SPACER_PX * 2;

/** Full height of one packed tab row (palm mute header + spacers + strings + footer). */
export const STATIC_TAB_ROW_HEIGHT_PX = 221;

/** Height of the palm mute node header at the top of every column. */
export const STATIC_TAB_PALM_MUTE_HEADER_HEIGHT_PX = 32;

/** Height of the note length guide + chord effects footer at the bottom of every column. */
export const STATIC_TAB_NOTE_LENGTH_FOOTER_HEIGHT_PX = 45;

/** Width of the vertical tuning note list (wider variant fits accidentals). */
export const STATIC_TAB_VERTICAL_TUNING_WIDTH_PX = 12;
export const STATIC_TAB_VERTICAL_TUNING_ACCIDENTAL_WIDTH_PX = 16;

/** Gap between the tuning letters and the 1px start nut. */
export const STATIC_TAB_TUNING_NOTE_GAP_PX = 8;

/** 1px start/end/measure vertical lines through the first–sixth strings. */
export const STATIC_TAB_STAFF_LINE_WIDTH_PX = 1;

/** Offset from the top of the string stack to the first 1px string line. */
export const STATIC_TAB_STAFF_LINE_INSET_PX =
  STATIC_TAB_STRING_ROW_HEIGHT_PX / 2;

/** Vertical line spanning the first string through the sixth string. */
export const STATIC_TAB_STAFF_LINE_HEIGHT_PX =
  (STATIC_TAB_STRING_COUNT - 1) * STATIC_TAB_STRING_ROW_HEIGHT_PX + 1;

/** Height of the vertical tuning note list (aligned to the staff line). */
export const STATIC_TAB_VERTICAL_TUNING_HEIGHT_PX =
  STATIC_TAB_STAFF_LINE_HEIGHT_PX;

/**
 * Width of the tuning gutter at the start of the first row: accidental-width
 * letters + gap + 1px start nut. Packed to the right so the nut sits flush
 * against the first notes column.
 */
export const STATIC_TAB_TUNING_GUTTER_WIDTH_PX =
  STATIC_TAB_VERTICAL_TUNING_ACCIDENTAL_WIDTH_PX +
  STATIC_TAB_TUNING_NOTE_GAP_PX +
  STATIC_TAB_STAFF_LINE_WIDTH_PX;

/** Width of a regular (non-last) notes column. */
export const STATIC_TAB_NOTES_COLUMN_WIDTH_PX = 34;

/** Width of the 1px end nut after the last column. */
export const STATIC_TAB_END_LINE_WIDTH_PX = STATIC_TAB_STAFF_LINE_WIDTH_PX;

/** Width of a measure line column. */
export const STATIC_TAB_MEASURE_LINE_WIDTH_PX = STATIC_TAB_STAFF_LINE_WIDTH_PX;

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
 * Prefer `offsetWidth` (unzoomed layout px on Chromium / healthy WebKit).
 * Some Safari CSS-zoom used-value builds report a visual `offsetWidth`
 * (≈ `getBoundingClientRect().width`) while `offsetHeight` still tracks
 * unzoomed layout height. In that asymmetric case, recover the packing
 * width as `rect.width / (rect.height / offsetHeight)` so zoom < 1 does
 * not under-measure and over-fragment into virtualized rows.
 */
export function getStaticTabLayoutWidthPx(element: HTMLElement): number {
  const offsetWidth = element.offsetWidth;
  if (offsetWidth <= 0) return 0;

  const rect = element.getBoundingClientRect();
  const offsetHeight = element.offsetHeight;
  if (
    rect.width > 0 &&
    rect.height > 0 &&
    offsetHeight > 0 &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height)
  ) {
    const heightZoom = rect.height / offsetHeight;
    if (
      Number.isFinite(heightZoom) &&
      heightZoom > 0 &&
      Math.abs(heightZoom - 1) >= CSS_ZOOM_RATIO_EPSILON
    ) {
      const widthLooksVisual =
        Math.abs(offsetWidth - rect.width) / rect.width < 0.02;
      if (widthLooksVisual) {
        const layoutWidth = rect.width / heightZoom;
        if (Number.isFinite(layoutWidth) && layoutWidth > 0) {
          return layoutWidth;
        }
      }
    }
  }

  return offsetWidth;
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
 * Viewport window in the same coordinate space as
 * `Element.getBoundingClientRect()` for document scrolling.
 *
 * Use the layout viewport (`top = 0`, `window.innerHeight`), not
 * `visualViewport.offsetTop`. On iOS Safari, `getBoundingClientRect`
 * is layout-viewport-relative; adding `visualViewport.offsetTop` double-
 * shifts the window. That matched a real failure mode where opening the
 * mobile settings Drawer (vaul pins `body { position: fixed }`, forcing
 * `offsetTop ≈ 0`) made rows appear, then closing it emptied them again.
 *
 * Still listen to `visualViewport` resize/scroll as *signals* to
 * recompute — but do not take coordinates from it here.
 */
export function getVisibleViewportWindow(): {
  top: number;
  height: number;
} {
  return { top: 0, height: window.innerHeight };
}

export function getStaticTabColumnWidthPx(
  column: TabNote | TabMeasureLine,
  isLastColumn: boolean,
): number {
  const baseWidth = isTabMeasureLine(column)
    ? STATIC_TAB_MEASURE_LINE_WIDTH_PX
    : STATIC_TAB_NOTES_COLUMN_WIDTH_PX;

  // The 1px end nut is a sibling after the last column.
  return isLastColumn ? baseWidth + STATIC_TAB_END_LINE_WIDTH_PX : baseWidth;
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
 * browser's flex-wrap layout produces: row 0 starts with the tuning
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
 * Computes which rows fall inside the overscan-expanded viewport by mapping
 * the body's own `getBoundingClientRect()` onto `layout.totalHeight`.
 *
 * This avoids an explicit CSS-zoom divide. Mixing `bodyTop / measuredZoom`
 * with a separately sourced viewport height is brittle on iOS Safari:
 * width/height/top can disagree about whether CSS `zoom` is in the rect,
 * and `visualViewport` coordinates can disagree with `getBoundingClientRect`.
 * The body's rect is one coordinate space — project the visible overlap
 * through it as a fraction of `totalHeight`.
 *
 * @param bodyRect         subsection body `getBoundingClientRect()`
 * @param viewportHeightPx layout viewport height (`window.innerHeight`)
 * @param overscanPx       extra buffer above/below the viewport, in the same
 *                         coordinate space as `bodyRect` / viewport height
 * @param viewportTopPx    layout viewport top (always 0 for document scroll)
 */
export function getVisibleRowRangeFromBodyRect(
  layout: StaticTabRowLayout,
  bodyRect: Pick<DOMRect, "top" | "bottom" | "height">,
  viewportHeightPx: number,
  overscanPx: number = STATIC_TAB_OVERSCAN_PX,
  viewportTopPx: number = 0,
): VisibleRowRange | null {
  const rowCount = layout.rows.length;
  if (rowCount === 0 || layout.totalHeight <= 0) return null;

  const bodyHeight = bodyRect.height;
  if (!(bodyHeight > 0) || !Number.isFinite(bodyHeight)) return null;

  const safeViewportHeight =
    Number.isFinite(viewportHeightPx) && viewportHeightPx > 0
      ? viewportHeightPx
      : 0;
  const safeViewportTop = Number.isFinite(viewportTopPx) ? viewportTopPx : 0;

  const viewStart = safeViewportTop - overscanPx;
  const viewEnd = safeViewportTop + safeViewportHeight + overscanPx;

  const overlapStart = Math.max(viewStart, bodyRect.top);
  const overlapEnd = Math.min(viewEnd, bodyRect.bottom);
  if (!(overlapEnd > overlapStart)) return null;

  // Map visual overlap → layout px using the body's rendered height as the
  // sole scale. Equivalent to dividing by CSS zoom when the engine scales
  // the rect uniformly; still correct when it doesn't.
  const layoutStart =
    ((overlapStart - bodyRect.top) / bodyHeight) * layout.totalHeight;
  const layoutEnd =
    ((overlapEnd - bodyRect.top) / bodyHeight) * layout.totalHeight;

  const clamp = (value: number) => Math.min(Math.max(value, 0), rowCount - 1);

  const startRow = clamp(Math.floor(layoutStart / STATIC_TAB_ROW_HEIGHT_PX));
  const endRow = clamp(Math.ceil(layoutEnd / STATIC_TAB_ROW_HEIGHT_PX) - 1);

  if (endRow < startRow) return null;

  return { startRow, endRow };
}

/**
 * @deprecated Prefer {@link getVisibleRowRangeFromBodyRect}. Kept for
 * geometry unit tests that exercise the older zoom-division path.
 */
export function getVisibleRowRange(
  layout: StaticTabRowLayout,
  bodyTopPx: number,
  viewportHeightPx: number,
  zoom: number,
  overscanPx: number = STATIC_TAB_OVERSCAN_PX,
  viewportTopPx: number = 0,
): VisibleRowRange | null {
  const safeZoom = zoom > 0 ? zoom : 1;
  // Synthesize a body rect whose height matches layout.totalHeight * zoom so
  // the fraction mapper reproduces the legacy division formula.
  const bodyHeight = layout.totalHeight * safeZoom;
  return getVisibleRowRangeFromBodyRect(
    layout,
    {
      top: bodyTopPx,
      bottom: bodyTopPx + bodyHeight,
      height: bodyHeight,
    },
    viewportHeightPx,
    overscanPx,
    viewportTopPx,
  );
}
