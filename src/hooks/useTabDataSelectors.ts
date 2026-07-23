import {
  useTabStore,
  type TabSection,
  type ChordSection,
  type ChordSequence,
  type TabNote,
  type TabMeasureLine,
  type FullNoteLengths,
} from "~/stores/TabStore";
import sectionIsEffectivelyEmpty from "~/utils/sectionIsEffectivelyEmpty";
import { isTabMeasureLine, isTabNote } from "~/utils/tabNoteHelpers";

/**
 * Fine-grained tabData selectors for the editing tree.
 *
 * Rules of thumb (keep re-renders local):
 * - Parents map by ID/type lists, never by full section/subsection objects.
 * - Leaves select only the column/fields they render.
 * - Event handlers that need more data should call `getTabData()` /
 *   `getTabStore()` instead of widening a React subscription.
 * - Prefer primitives / ID arrays so `useShallow` (applied in `useTabStore`)
 *   keeps results stable across unrelated immer updates.
 */

const EMPTY_STRING_ARRAY: string[] = [];
const EMPTY_TYPE_ARRAY: ("tab" | "chord" | "note" | "measureLine")[] = [];

/**
 * Section IDs only — stable across nested note edits (immer structural sharing
 * keeps sibling section objects intact; useShallow keeps this ID list stable).
 */
export const useSectionIds = () => {
  return useTabStore(
    (state) => state.tabData.map((section) => section.id) ?? EMPTY_STRING_ARRAY,
  );
};

export const useSectionTitle = (sectionIndex: number) => {
  return useTabStore((state) => state.tabData[sectionIndex]?.title ?? "");
};

export const useSectionId = (sectionIndex: number) => {
  return useTabStore((state) => state.tabData[sectionIndex]?.id ?? "");
};

export const useSubSectionIds = (sectionIndex: number) => {
  return useTabStore((state) => {
    const section = state.tabData[sectionIndex];
    if (!section) return EMPTY_STRING_ARRAY;
    return section.data.map((sub) => sub.id);
  });
};

export const useSubSectionTypes = (sectionIndex: number) => {
  return useTabStore((state) => {
    const section = state.tabData[sectionIndex];
    if (!section) return EMPTY_TYPE_ARRAY as ("tab" | "chord")[];
    return section.data.map((sub) => sub.type);
  });
};

export const useSectionDataLength = (sectionIndex: number) => {
  return useTabStore((state) => state.tabData[sectionIndex]?.data.length ?? 0);
};

export const useSectionData = (sectionIndex: number) => {
  return useTabStore((state) => state.tabData[sectionIndex]!);
};

export const useSubSectionData = (
  sectionIndex: number,
  subSectionIndex: number,
) => {
  return useTabStore((state) => {
    const section = state.tabData[sectionIndex];

    // @ts-expect-error TODO come back later
    return section.data[subSectionIndex]!;
  });
};

export const useTabSubSectionData = (
  sectionIndex: number,
  subSectionIndex: number,
) => {
  return useTabStore((state) => {
    const section = state.tabData[sectionIndex];

    // @ts-expect-error TODO come back later
    return section.data[subSectionIndex] as TabSection;
  });
};

/** Primitive fields for TabSection chrome — avoids re-rendering on note edits. */
export const useTabSubSectionMeta = (
  sectionIndex: number,
  subSectionIndex: number,
) => {
  return useTabStore((state) => {
    const sub = state.tabData[sectionIndex]?.data[subSectionIndex];
    if (sub?.type !== "tab") {
      return {
        id: "",
        bpm: -1,
        repetitions: 1,
        baseNoteLength: "quarter" as const,
        columnCount: 0,
      };
    }
    return {
      id: sub.id,
      bpm: sub.bpm,
      repetitions: sub.repetitions,
      baseNoteLength: sub.baseNoteLength,
      columnCount: sub.data.length,
    };
  });
};

/** Single primitive — e.g. measure-line BPM placeholder fallback. */
export const useTabSubSectionBpm = (
  sectionIndex: number,
  subSectionIndex: number,
) => {
  return useTabStore((state) => {
    const sub = state.tabData[sectionIndex]?.data[subSectionIndex];
    return sub?.type === "tab" ? sub.bpm : -1;
  });
};

export const useTabColumnIds = (
  sectionIndex: number,
  subSectionIndex: number,
) => {
  return useTabStore((state) => {
    const sub = state.tabData[sectionIndex]?.data[subSectionIndex];
    if (sub?.type !== "tab") return EMPTY_STRING_ARRAY;
    return sub.data.map((column) => column.id);
  });
};

export const useTabColumnTypes = (
  sectionIndex: number,
  subSectionIndex: number,
) => {
  return useTabStore((state) => {
    const sub = state.tabData[sectionIndex]?.data[subSectionIndex];
    if (sub?.type !== "tab") {
      return EMPTY_TYPE_ARRAY as ("note" | "measureLine")[];
    }
    return sub.data.map((column) => column.type);
  });
};

/** Single column — only this column's subscribers re-render when it changes. */
export const useTabColumnData = (
  sectionIndex: number,
  subSectionIndex: number,
  columnIndex: number,
): TabNote | TabMeasureLine | undefined => {
  return useTabStore((state) => {
    const sub = state.tabData[sectionIndex]?.data[subSectionIndex];
    if (sub?.type !== "tab") return undefined;
    return sub.data[columnIndex];
  });
};

export const useTabNoteColumnData = (
  sectionIndex: number,
  subSectionIndex: number,
  columnIndex: number,
): TabNote | undefined => {
  return useTabStore((state) => {
    const sub = state.tabData[sectionIndex]?.data[subSectionIndex];
    if (sub?.type !== "tab") return undefined;
    const column = sub.data[columnIndex];
    return column && isTabNote(column) ? column : undefined;
  });
};

export const useTabMeasureLineColumnData = (
  sectionIndex: number,
  subSectionIndex: number,
  columnIndex: number,
): TabMeasureLine | undefined => {
  return useTabStore((state) => {
    const sub = state.tabData[sectionIndex]?.data[subSectionIndex];
    if (sub?.type !== "tab") return undefined;
    const column = sub.data[columnIndex];
    return column && isTabMeasureLine(column) ? column : undefined;
  });
};

/**
 * Neighbor metadata for note-length beams / delete guards — primitives only so
 * unrelated string edits in this column don't pull neighbors along, and
 * neighbor note-length edits do update this column's guide.
 */
export const useTabColumnNeighborMeta = (
  sectionIndex: number,
  subSectionIndex: number,
  columnIndex: number,
) => {
  return useTabStore((state) => {
    const sub = state.tabData[sectionIndex]?.data[subSectionIndex];
    if (sub?.type !== "tab") {
      return {
        columnCount: 0,
        baseNoteLength: "quarter" as const,
        previousNoteLength: undefined as FullNoteLengths | undefined,
        nextNoteLength: undefined as FullNoteLengths | undefined,
        previousIsRestStrum: undefined as boolean | undefined,
        nextIsRestStrum: undefined as boolean | undefined,
        previousIsMeasureLine: false,
        nextIsMeasureLine: false,
        isFirstInGroup: true,
        isLastInGroup: true,
      };
    }

    const previousColumn =
      columnIndex > 0 ? sub.data[columnIndex - 1] : undefined;
    const nextColumn =
      columnIndex < sub.data.length - 1 ? sub.data[columnIndex + 1] : undefined;

    const previousColumnIsPlayable =
      previousColumn !== undefined && isTabNote(previousColumn);
    const nextColumnIsPlayable =
      nextColumn !== undefined && isTabNote(nextColumn);

    const previousIsMeasureLine =
      previousColumn !== undefined && isTabMeasureLine(previousColumn);
    const nextIsMeasureLine =
      nextColumn !== undefined && isTabMeasureLine(nextColumn);

    const isLastColumn = columnIndex === sub.data.length - 1;

    return {
      columnCount: sub.data.length,
      baseNoteLength: sub.baseNoteLength,
      previousNoteLength: previousColumnIsPlayable
        ? previousColumn.noteLength
        : undefined,
      nextNoteLength: nextColumnIsPlayable ? nextColumn.noteLength : undefined,
      previousIsRestStrum: previousColumnIsPlayable
        ? previousColumn.chordEffects === "r"
        : undefined,
      nextIsRestStrum: nextColumnIsPlayable
        ? nextColumn.chordEffects === "r"
        : undefined,
      previousIsMeasureLine,
      nextIsMeasureLine,
      isFirstInGroup: columnIndex === 0 || previousIsMeasureLine,
      isLastInGroup: isLastColumn || nextIsMeasureLine,
    };
  });
};

export const useChordSubSectionData = (
  sectionIndex: number,
  subSectionIndex: number,
) => {
  return useTabStore((state) => {
    const section = state.tabData[sectionIndex];

    // @ts-expect-error TODO come back later
    return section.data[subSectionIndex] as ChordSection;
  });
};

export const useChordSubSectionMeta = (
  sectionIndex: number,
  subSectionIndex: number,
) => {
  return useTabStore((state) => {
    const sub = state.tabData[sectionIndex]?.data[subSectionIndex];
    if (sub?.type !== "chord") {
      return {
        id: "",
        bpm: -1,
        repetitions: 1,
        sequenceCount: 0,
      };
    }
    return {
      id: sub.id,
      bpm: sub.bpm,
      repetitions: sub.repetitions,
      sequenceCount: sub.data.length,
    };
  });
};

export const useChordSequenceIds = (
  sectionIndex: number,
  subSectionIndex: number,
) => {
  return useTabStore((state) => {
    const sub = state.tabData[sectionIndex]?.data[subSectionIndex];
    if (sub?.type !== "chord") return EMPTY_STRING_ARRAY;
    return sub.data.map((sequence) => sequence.id);
  });
};

export const useChordSequenceData = (
  sectionIndex: number,
  subSectionIndex: number,
  chordSequenceIndex: number,
) => {
  return useTabStore((state) => {
    const section = state.tabData[sectionIndex];

    // @ts-expect-error TODO come back later
    return section.data[subSectionIndex].data[
      chordSequenceIndex
    ] as ChordSequence;
  });
};

export const useChordSequenceParentBpm = (
  sectionIndex: number,
  subSectionIndex: number,
) => {
  return useTabStore((state) => {
    const sub = state.tabData[sectionIndex]?.data[subSectionIndex];
    return sub?.type === "chord" ? sub.bpm : -1;
  });
};

export const useColumnData = (
  sectionIndex: number,
  subSectionIndex: number,
  columnIndex: number,
) => {
  return useTabStore((state) => {
    const subSection = state.tabData[sectionIndex]?.data[subSectionIndex];

    // @ts-expect-error TODO come back later
    return subSection.data[columnIndex] as string[];
  });
};

export const useTabDataSubSectionLength = (sectionIndex: number) => {
  // @ts-expect-error TODO come back later
  return useTabStore((state) => state.tabData[sectionIndex].data.length);
};

export const useTabDataLength = () => {
  return useTabStore((state) => state.tabData.length);
};

export const useChordSequenceLength = (
  sectionIndex: number,
  subSectionIndex: number,
) => {
  return useTabStore((state) => {
    const sub = state.tabData[sectionIndex]?.data[subSectionIndex];
    return sub?.type === "chord" ? sub.data.length : 0;
  });
};

/** Derived emptiness for play-button disabled state without whole-section sub. */
export const useSectionIsEffectivelyEmpty = (
  sectionIndex: number,
  subSectionIndex?: number,
) => {
  return useTabStore((state) => {
    const section = state.tabData[sectionIndex];
    if (!section) return true;
    return sectionIsEffectivelyEmpty(section, subSectionIndex);
  });
};
