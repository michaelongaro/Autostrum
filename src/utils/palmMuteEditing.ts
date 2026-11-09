import type { TabMeasureLine, TabNote } from "~/stores/TabStore";

export type PalmMuteValue = "" | "-" | "start" | "end";

export interface PendingPalmMuteEdit {
  columnIndex: number;
  prevValue: string;
  currentValue: string;
}

/** null represents a measure line: it carries coverage, never an endpoint. */
type Values = readonly (PalmMuteValue | null)[];

/** Undo/redo can restore the intermediate snapshot between two endpoint clicks. */
export function recoverPendingPalmMuteEdit(
  values: Values,
): PendingPalmMuteEdit | null {
  let start = -1;
  for (let i = 0; i < values.length; i++) {
    if (values[i] === "start") start = i;
    else if (values[i] === "end") {
      if (start < 0)
        return { columnIndex: i, prevValue: "", currentValue: "end" };
      start = -1;
    }
  }
  return start < 0
    ? null
    : { columnIndex: start, prevValue: "", currentValue: "start" };
}

export function getTabPalmMuteValues(columns: (TabNote | TabMeasureLine)[]) {
  return columns.map((column) =>
    column.type === "note" ? column.palmMute : null,
  );
}

export function applyTabPalmMuteValues(
  columns: (TabNote | TabMeasureLine)[],
  values: Values,
) {
  let start = -1;
  columns.forEach((column, index) => {
    if (column.type === "measureLine") column.isInPalmMuteSection = false;
    else column.palmMute = values[index] ?? "";
  });
  values.forEach((value, index) => {
    if (value === "start") start = index;
    else if (value === "end" && start >= 0) {
      for (let i = start + 1; i < index; i++) {
        const column = columns[i];
        if (column?.type === "measureLine") column.isInPalmMuteSection = true;
      }
      start = -1;
    }
  });
}

export function getPalmMuteOpacities(
  values: Values,
  pending: PendingPalmMuteEdit | null,
): string[] {
  if (!pending) return values.map(() => "1");
  const enabled = values.map(() => "0.25");
  const { columnIndex: anchor, prevValue } = pending;
  enabled[anchor] = "1";
  const scan = (step: number, stop: PalmMuteValue, includeStop: boolean) => {
    for (let i = anchor + step; i >= 0 && i < values.length; i += step) {
      if (values[i] === stop) {
        if (includeStop) enabled[i] = "1";
        break;
      }
      if (values[i] === "") enabled[i] = "1";
    }
  };
  if (prevValue === "") {
    if (pending.currentValue === "end") scan(-1, "end", false);
    else scan(1, "start", false);
  } else if (prevValue === "start") {
    scan(-1, "end", false);
    scan(1, "end", true);
  } else if (prevValue === "end") {
    scan(1, "start", false);
    scan(-1, "start", true);
  }
  return enabled;
}

function findPair(values: Values, anchor: number, endpoint: string) {
  const step = endpoint === "start" ? 1 : -1;
  const pair = endpoint === "start" ? "end" : "start";
  for (let i = anchor + step; i >= 0 && i < values.length; i += step) {
    if (values[i] === pair) return i;
    if (values[i] === endpoint) break;
  }
  return -1;
}

function fillRange(
  values: (PalmMuteValue | null)[],
  start: number,
  end: number,
  clear: boolean,
) {
  for (let i = start; i <= end; i++) {
    if (values[i] === null) continue;
    values[i] = clear ? "" : i === start ? "start" : i === end ? "end" : "-";
  }
}

/** One transition for both tab and strumming editors, including disabled-target guards. */
export function editPalmMuteNode(
  source: Values,
  pending: PendingPalmMuteEdit | null,
  index: number,
) {
  const values = [...source];
  const value = values[index];
  if (
    value == null ||
    value === "-" ||
    getPalmMuteOpacities(values, pending)[index] !== "1"
  ) {
    return { values, pending };
  }
  if (!pending) {
    if (value === "") values[index] = "start";
    else {
      const pair = findPair(values, index, value);
      if (pair < 0) {
        values[index] = "";
        return { values, pending: null };
      }
      fillRange(values, Math.min(pair, index), Math.max(pair, index), true);
      values[pair] = value === "start" ? "end" : "start";
    }
    return {
      values,
      pending: {
        columnIndex: index,
        prevValue: value,
        currentValue: value === "" ? "start" : "",
      },
    };
  }
  const anchor = pending.columnIndex;
  if (pending.prevValue === "") {
    if (index === anchor) values[anchor] = "";
    else
      fillRange(
        values,
        Math.min(anchor, index),
        Math.max(anchor, index),
        false,
      );
  } else {
    const pair = findPair(values, anchor, pending.prevValue);
    if (pair < 0) return { values, pending: null };
    // Clicking the same node restores it; clicking its pair deletes the range.
    if (index !== pair)
      fillRange(values, Math.min(pair, index), Math.max(pair, index), false);
    else values[pair] = "";
  }
  return { values, pending: null };
}

/** Leaving edit mode commits a pending removal and discards an unfinished addition. */
export function finishPalmMuteEdit(
  source: Values,
  pending: PendingPalmMuteEdit | null,
) {
  const values = [...source];
  if (!pending) return values;
  if (pending.prevValue === "") values[pending.columnIndex] = "";
  else {
    const pair = findPair(values, pending.columnIndex, pending.prevValue);
    if (pair >= 0)
      fillRange(
        values,
        Math.min(pair, pending.columnIndex),
        Math.max(pair, pending.columnIndex),
        true,
      );
  }
  return values;
}

export function removePalmMuteEndpoint(source: Values, index: number) {
  const values = [...source];
  const value = values[index];
  if (value === "start" || value === "end") {
    const pair = findPair(values, index, value);
    fillRange(
      values,
      pair < 0 ? index : Math.min(pair, index),
      pair < 0 ? index : Math.max(pair, index),
      true,
    );
  }
  return values;
}
