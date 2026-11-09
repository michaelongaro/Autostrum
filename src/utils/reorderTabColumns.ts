import type { TabMeasureLine, TabNote } from "~/stores/TabStore";
import { getPalmMuteValue, setPalmMuteValue } from "~/utils/tabNoteHelpers";

type Column = TabNote | TabMeasureLine;

/** Validate before changing any columns: returning from an Immer recipe does not roll back mutations. */
export function reorderTabColumns(
  columns: Column[],
  activeId: string,
  overId: string,
): Column[] {
  const from = columns.findIndex((column) => column.id === activeId);
  const to = columns.findIndex((column) => column.id === overId);
  if (from < 0 || to < 0 || from === to) return columns;
  const moved = [...columns];
  moved.splice(to, 0, moved.splice(from, 1)[0]!);
  if (
    moved.some(
      (column, index) =>
        column.type === "measureLine" &&
        (index === 0 ||
          index === moved.length - 1 ||
          moved[index - 1]?.type === "measureLine"),
    )
  )
    return columns;

  // Keep endpoint identity through the move, then derive all interior coverage.
  // A moved endpoint that crosses its pair or another range removes only its
  // own range; the untouched ranges must never be merged or cleared.
  const positions = new Map(moved.map((column, index) => [column.id, index]));
  const ranges: { start: number; end: number; moved: boolean }[] = [];
  let start: Column | undefined;
  for (const column of columns) {
    const value = getPalmMuteValue(column);
    if (value === "start") start = column;
    else if (value === "end" && start) {
      ranges.push({
        start: positions.get(start.id)!,
        end: positions.get(column.id)!,
        moved: start.id === activeId || column.id === activeId,
      });
      start = undefined;
    }
  }
  const kept = ranges.filter(
    (range) =>
      range.start < range.end &&
      (!range.moved ||
        !ranges.some(
          (other) =>
            !other.moved &&
            range.start <= other.end &&
            range.end >= other.start,
        )),
  );
  const values = new Array<"" | "-" | "start" | "end">(moved.length).fill("");
  for (const range of kept) {
    values[range.start] = "start";
    values[range.end] = "end";
    for (let i = range.start + 1; i < range.end; i++) values[i] = "-";
  }
  return moved.map((column, index) => {
    const value = values[index]!;
    if (getPalmMuteValue(column) === value) return column;
    const updated = { ...column };
    setPalmMuteValue(updated, value);
    return updated;
  });
}
