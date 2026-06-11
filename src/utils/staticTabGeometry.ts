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
export const STATIC_TAB_TUNING_GUTTER_WIDTH_PX = 32;

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
 * measured width (guards against float error from dividing the measured
 * width by the current zoom).
 */
const ROW_PACKING_EPSILON_PX = 0.1;

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
 * subsection body's layout width (measured width divided by current zoom).
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
 * @param bodyTopPx        subsection body's bounding rect top (visual px,
 *                         i.e. already scaled by zoom)
 * @param viewportHeightPx window.innerHeight
 * @param zoom             current tab zoom (CSS zoom applied by an ancestor)
 * @returns the visible row range, or null when no row is within range
 */
export function getVisibleRowRange(
  layout: StaticTabRowLayout,
  bodyTopPx: number,
  viewportHeightPx: number,
  zoom: number,
  overscanPx: number = STATIC_TAB_OVERSCAN_PX,
): VisibleRowRange | null {
  const rowCount = layout.rows.length;
  if (rowCount === 0) return null;

  const safeZoom = zoom > 0 ? zoom : 1;

  // convert the overscan-expanded viewport window into the body's
  // unzoomed (layout px) coordinate space
  const windowStart = (-overscanPx - bodyTopPx) / safeZoom;
  const windowEnd = (viewportHeightPx + overscanPx - bodyTopPx) / safeZoom;

  if (windowEnd <= 0 || windowStart >= layout.totalHeight) return null;

  const clamp = (value: number) => Math.min(Math.max(value, 0), rowCount - 1);

  return {
    startRow: clamp(Math.floor(windowStart / STATIC_TAB_ROW_HEIGHT_PX)),
    endRow: clamp(Math.ceil(windowEnd / STATIC_TAB_ROW_HEIGHT_PX) - 1),
  };
}
