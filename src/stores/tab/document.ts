import isEqual from "lodash.isequal";
import type { TabDocument, TabState } from "./types";

export function getEditorDocument(state: TabState): TabDocument {
  return {
    title: state.title,
    artistId: state.artistId,
    artistName: state.artistName,
    artistIsVerified: state.artistIsVerified,
    description: state.description,
    genre: state.genre,
    tuning: state.tuning,
    bpm: state.bpm,
    capo: state.capo,
    key: state.key,
    difficulty: state.difficulty,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    sectionProgression: state.sectionProgression,
    tabData: state.tabData,
  };
}

export function editorDocumentsEqual(before: TabDocument, after: TabDocument) {
  if (before.sectionProgression === after.sectionProgression)
    return isEqual(before, after);
  // Timing is recalculated after music edits; it is not an editable field.
  const a = before.sectionProgression;
  const b = after.sectionProgression;
  return (
    a.length === b.length &&
    a.every((entry, index) => {
      const other = b[index]!;
      return (
        entry.id === other.id &&
        entry.sectionId === other.sectionId &&
        entry.title === other.title &&
        entry.repetitions === other.repetitions
      );
    }) &&
    isEqual({ ...before, sectionProgression: b }, after)
  );
}

// Resolve empty sequences as part of the originating edit. A React effect that
// fills these later would create a second undo step and could overwrite redo.
export function initializeEmptyChordSequences({
  tabData,
  strummingPatterns,
}: Pick<TabState, "tabData" | "strummingPatterns">) {
  const pattern = strummingPatterns[0];
  if (!pattern) return;
  for (const section of tabData) {
    for (const subSection of section.data) {
      if (subSection.type !== "chord") continue;
      for (const sequence of subSection.data) {
        if (Object.keys(sequence.strummingPattern).length > 0) continue;
        sequence.strummingPattern = pattern;
        sequence.bpm = -1;
        sequence.data = Array.from({ length: pattern.strums.length }, () => "");
      }
    }
  }
}
