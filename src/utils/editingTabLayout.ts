import { getDisplayTuningNotes } from "~/utils/tunings";
import {
  EDITING_TAB_COLUMN_HEIGHT_PX,
  EDITING_TAB_COLUMN_WIDTH_PX,
  EDITING_TAB_MEASURE_LINE_WIDTH_PX,
  EDITING_TAB_ROW_STRIDE_PX,
  EDITING_TAB_TUNING_ACCIDENTAL_WIDTH_PX,
  EDITING_TAB_TUNING_GAP_PX,
  EDITING_TAB_TUNING_LETTER_WIDTH_PX,
  EDITING_TAB_VIRTUALIZE_MIN_COLUMNS,
} from "~/utils/editingTabGeometry";

const ROW_PACKING_EPSILON_PX = 0.1;

export interface EditingTabRow {
  rowIndex: number;
  /** Inclusive column index. */
  startIndex: number;
  /** Inclusive column index. */
  endIndex: number;
  /** Top edge, relative to the staff container. */
  top: number;
}

export interface EditingTabRowLayout {
  rows: EditingTabRow[];
  totalHeight: number;
  rowStride: number;
}

export function getEditingColumnWidthPx(
  columnType: "note" | "measureLine",
): number {
  return columnType === "measureLine"
    ? EDITING_TAB_MEASURE_LINE_WIDTH_PX
    : EDITING_TAB_COLUMN_WIDTH_PX;
}

/**
 * Width of the tuning gutter that sits at the start of row 0: letters + the
 * `pr-2` gap + the 1px start nut. Matches the flex item in the editing staff.
 */
export function getEditingTuningGutterWidthPx(
  tuning: string | null | undefined,
): number {
  const notes = getDisplayTuningNotes(tuning);
  const letterWidth = notes.toString().includes("#")
    ? EDITING_TAB_TUNING_ACCIDENTAL_WIDTH_PX
    : EDITING_TAB_TUNING_LETTER_WIDTH_PX;
  return letterWidth + EDITING_TAB_TUNING_GAP_PX + 1;
}

/**
 * Pack editing columns the way `flex-wrap` does: row 0 reserves the tuning
 * gutter, later rows use the full inner width, no column gap.
 */
export function buildEditingTabRowLayout(
  columnTypes: readonly ("note" | "measureLine")[],
  innerWidthPx: number,
  tuningGutterWidthPx: number,
): EditingTabRowLayout {
  const rowStride = EDITING_TAB_ROW_STRIDE_PX;
  if (columnTypes.length === 0 || innerWidthPx <= 0) {
    return { rows: [], totalHeight: 0, rowStride };
  }

  const maxRowWidth = innerWidthPx + ROW_PACKING_EPSILON_PX;
  const rows: EditingTabRow[] = [];

  let startIndex = 0;
  let rowWidth = Math.max(0, tuningGutterWidthPx);
  let columnsInRow = 0;

  const pushRow = (endIndex: number) => {
    rows.push({
      rowIndex: rows.length,
      startIndex,
      endIndex,
      top: rows.length * rowStride,
    });
  };

  for (let index = 0; index < columnTypes.length; index++) {
    const columnWidth = getEditingColumnWidthPx(columnTypes[index]!);

    if (columnsInRow > 0 && rowWidth + columnWidth > maxRowWidth) {
      pushRow(index - 1);
      startIndex = index;
      rowWidth = 0;
      columnsInRow = 0;
    }

    rowWidth += columnWidth;
    columnsInRow++;
  }

  pushRow(columnTypes.length - 1);

  const totalHeight =
    rows.length === 0
      ? 0
      : rows[rows.length - 1]!.top + EDITING_TAB_COLUMN_HEIGHT_PX;

  return { rows, totalHeight, rowStride };
}

export function findEditingTabRowIndex(
  layout: EditingTabRowLayout,
  columnIndex: number,
): number {
  const rows = layout.rows;
  let lo = 0;
  let hi = rows.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const row = rows[mid]!;
    if (columnIndex < row.startIndex) {
      hi = mid - 1;
    } else if (columnIndex > row.endIndex) {
      lo = mid + 1;
    } else {
      return row.rowIndex;
    }
  }
  return -1;
}

export function shouldVirtualizeEditingTab(columnCount: number): boolean {
  return columnCount >= EDITING_TAB_VIRTUALIZE_MIN_COLUMNS;
}
