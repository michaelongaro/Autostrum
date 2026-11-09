import type { TabMeasureLine, TabNote } from "~/stores/TabStore";
import {
  applyTabPalmMuteValues,
  getTabPalmMuteValues,
  removePalmMuteEndpoint,
} from "~/utils/palmMuteEditing";

type Column = TabNote | TabMeasureLine;

export function canDeleteTabNote(columns: Column[], index: number) {
  return (
    columns[index]?.type === "note" &&
    columns.length > 1 &&
    !(index === 0 && columns[index + 1]?.type === "measureLine") &&
    !(
      index === columns.length - 1 && columns[index - 1]?.type === "measureLine"
    ) &&
    !(
      columns[index - 1]?.type === "measureLine" &&
      columns[index + 1]?.type === "measureLine"
    )
  );
}

export function deleteTabNote(columns: Column[], index: number): Column[] {
  if (!canDeleteTabNote(columns, index)) return columns;
  const values = removePalmMuteEndpoint(getTabPalmMuteValues(columns), index);
  const updated = columns.map((column) => ({ ...column }));
  applyTabPalmMuteValues(updated, values);
  updated.splice(index, 1);
  return updated;
}
