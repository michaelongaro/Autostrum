import type {
  BaseNoteLengths,
  FullNoteLengths,
  TabMeasureLine,
  TabNote,
} from "~/stores/TabStore";

// Type guards
export function isTabNote(item: TabNote | TabMeasureLine): item is TabNote {
  return item.type === "note";
}

export function isTabMeasureLine(
  item: TabNote | TabMeasureLine,
): item is TabMeasureLine {
  return item.type === "measureLine";
}

// Factory functions
export function createTabNote(options?: {
  palmMute?: "" | "-" | "start" | "end";
  firstString?: string;
  secondString?: string;
  thirdString?: string;
  fourthString?: string;
  fifthString?: string;
  sixthString?: string;
  chordEffects?: string;
  noteLength?: FullNoteLengths;
  noteLengthModified?: boolean;
}): TabNote {
  return {
    type: "note",
    palmMute: options?.palmMute ?? "",
    firstString: options?.firstString ?? "",
    secondString: options?.secondString ?? "",
    thirdString: options?.thirdString ?? "",
    fourthString: options?.fourthString ?? "",
    fifthString: options?.fifthString ?? "",
    sixthString: options?.sixthString ?? "",
    chordEffects: options?.chordEffects ?? "",
    noteLength: options?.noteLength ?? "quarter",
    noteLengthModified: options?.noteLengthModified ?? false,
    id: crypto.randomUUID(),
  };
}

export function createTabMeasureLine(options?: {
  isInPalmMuteSection?: boolean;
  bpmAfterLine?: number | null;
}): TabMeasureLine {
  return {
    type: "measureLine",
    isInPalmMuteSection: options?.isInPalmMuteSection ?? false,
    bpmAfterLine: options?.bpmAfterLine ?? null,
    id: crypto.randomUUID(),
  };
}

// String index mapping (1 = firstString/low E, 6 = sixthString/high E)
type StringKey =
  | "firstString"
  | "secondString"
  | "thirdString"
  | "fourthString"
  | "fifthString"
  | "sixthString";

const stringIndexMap: Record<number, StringKey> = {
  1: "firstString",
  2: "secondString",
  3: "thirdString",
  4: "fourthString",
  5: "fifthString",
  6: "sixthString",
};

export function stringIndexToKey(index: number): StringKey {
  const key = stringIndexMap[index];
  if (!key) {
    throw new Error(`Invalid string index: ${index}. Must be 1-6.`);
  }
  return key;
}

export function getStringValue(note: TabNote, stringIndex: number): string {
  const key = stringIndexToKey(stringIndex);
  return note[key];
}

export function setStringValue(
  note: TabNote,
  stringIndex: number,
  value: string,
): void {
  const key = stringIndexToKey(stringIndex);
  note[key] = value;
}

// Legacy array conversion for playGeneratedAudioHelpers.ts
// Array format: [0]=palmMute, [1]=firstString(lowE), [2]=secondString, ..., [6]=sixthString(highE),
//               [7]=chordEffects, [8]=noteLength, [9]=noteLengthModified, [10]=id
export function tabNoteToArray(note: TabNote): string[] {
  return [
    note.palmMute,
    note.firstString,
    note.secondString,
    note.thirdString,
    note.fourthString,
    note.fifthString,
    note.sixthString,
    note.chordEffects,
    note.noteLength,
    String(note.noteLengthModified),
    note.id,
  ];
}

export function tabMeasureLineToArray(line: TabMeasureLine): string[] {
  return [
    line.isInPalmMuteSection ? "-" : "", // palmMute indicator
    "|", // firstString
    "|", // secondString
    "|", // thirdString
    "|", // fourthString
    "|", // fifthString
    "|", // sixthString
    line.bpmAfterLine !== null ? String(line.bpmAfterLine) : "-1", // chordEffects slot used for BPM
    "measureLine", // noteLength slot
    "false", // noteLengthModified placeholder
    line.id,
  ];
}

export function tabColumnToArray(column: TabNote | TabMeasureLine): string[] {
  if (isTabNote(column)) {
    return tabNoteToArray(column);
  }
  return tabMeasureLineToArray(column);
}

// Convert entire TabSection data to legacy format
export function tabSectionDataToArrays(
  data: (TabNote | TabMeasureLine)[],
): string[][] {
  return data.map(tabColumnToArray);
}

// Palm mute helpers for drag-and-drop operations
// These work with both TabNote and TabMeasureLine types

/**
 * Gets the palm mute value for a column (TabNote or TabMeasureLine).
 * For TabNote: returns the palmMute property ("" | "-" | "start" | "end")
 * For TabMeasureLine: returns "-" if in palm mute section, "" otherwise
 */
export function getPalmMuteValue(
  column: TabNote | TabMeasureLine,
): "" | "-" | "start" | "end" {
  if (isTabNote(column)) {
    return column.palmMute;
  }
  return column.isInPalmMuteSection ? "-" : "";
}

/**
 * Sets the palm mute value for a column (TabNote or TabMeasureLine).
 * For TabNote: sets the palmMute property
 * For TabMeasureLine: sets isInPalmMuteSection based on value
 */
export function setPalmMuteValue(
  column: TabNote | TabMeasureLine,
  value: "" | "-" | "start" | "end",
): void {
  if (isTabNote(column)) {
    column.palmMute = value;
  } else {
    // Measure lines can only be inside or outside a palm mute section
    column.isInPalmMuteSection = value === "-";
  }
}
