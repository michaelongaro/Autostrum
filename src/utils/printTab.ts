import type {
  getTabStore,
  Section,
  SectionProgression,
  TabSection,
} from "~/stores/TabStore";
import {
  STATIC_TAB_END_LINE_WIDTH_PX,
  STATIC_TAB_MEASURE_LINE_WIDTH_PX,
  STATIC_TAB_NOTES_COLUMN_WIDTH_PX,
  STATIC_TAB_TUNING_GUTTER_WIDTH_PX,
} from "~/utils/staticTabGeometry";

export type PrintTabData = Pick<
  ReturnType<typeof getTabStore>,
  | "id"
  | "title"
  | "artistName"
  | "description"
  | "tuning"
  | "bpm"
  | "capo"
  | "key"
  | "chords"
  | "tabData"
  | "sectionProgression"
>;

export interface PrintOptions {
  layout: "compact" | "expanded";
  paper: "letter" | "a4";
  orientation: "portrait" | "landscape";
  scale: number;
  colorChords: boolean;
  chordDiagrams: boolean;
  leftHanded: boolean;
  description: boolean;
  progression: boolean;
  newPagePerSection: boolean;
  expandRepeats: boolean;
  sectionIds: string[];
}

export function getPrintPageSize(options: PrintOptions) {
  const dimensions = options.paper === "a4" ? [210, 297] : [215.9, 279.4];
  const [width, height] =
    options.orientation === "landscape" ? dimensions.toReversed() : dimensions;
  const margin = (12 * 96) / 25.4;
  return {
    width: (width! * 96) / 25.4,
    height: (height! * 96) / 25.4,
    margin,
    contentWidth: (width! * 96) / 25.4 - margin * 2,
    contentHeight: (height! * 96) / 25.4 - margin * 2 - 48,
  };
}

export function printRepeatCount(count: number) {
  return Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;
}

export function printRepetitions(count: number, expand: boolean) {
  const length = expand ? printRepeatCount(count) : 1;
  if (length > 1000)
    throw new Error(
      "Too many repeats to expand. Turn off Expand all repeats or use the compact layout.",
    );
  return Array.from({ length }, (_, index) => index);
}

/** Resolve by ID, never by a potentially stale or duplicated section title. */
export function getPrintProgression(
  sections: Section[],
  progression: SectionProgression[],
  selectedIds: string[],
) {
  const selected = new Set(selectedIds);
  const byId = new Map(sections.map((section) => [section.id, section]));
  const valid = progression.flatMap((entry) => {
    const section = byId.get(entry.sectionId);
    return section
      ? [{ section, repetitions: printRepeatCount(entry.repetitions) }]
      : [];
  });
  // Match playback: use the document order when no valid progression exists.
  const order =
    valid.length > 0
      ? valid
      : sections.map((section) => ({ section, repetitions: 1 }));
  return order.filter(({ section }) => selected.has(section.id));
}

export function getPrintSections(data: PrintTabData, options: PrintOptions) {
  if (options.layout === "compact") {
    return data.tabData
      .filter((section) => options.sectionIds.includes(section.id))
      .map((section) => ({ section, label: section.title }));
  }
  const visits: { section: Section; label: string }[] = [];
  for (const { section, repetitions } of getPrintProgression(
    data.tabData,
    data.sectionProgression,
    options.sectionIds,
  )) {
    for (const repeat of printRepetitions(repetitions, options.expandRepeats)) {
      visits.push({
        section,
        label: `${section.title}${repetitions > 1 ? (options.expandRepeats ? ` (${repeat + 1}/${repetitions})` : ` · Repeat ${repetitions}×`) : ""}`,
      });
      if (visits.length > 1000)
        throw new Error(
          "This play order is too long to expand. Use the compact layout or select fewer sections.",
        );
    }
  }
  return visits;
}

/** Reserve the tuning gutter on every line, including continuation pages. */
export function getPrintTabRows(columns: TabSection["data"], width: number) {
  const rows: { start: number; end: number }[] = [];
  let start = 0;
  let used = STATIC_TAB_TUNING_GUTTER_WIDTH_PX;
  for (const [index, column] of columns.entries()) {
    const size =
      (column.type === "measureLine"
        ? STATIC_TAB_MEASURE_LINE_WIDTH_PX
        : STATIC_TAB_NOTES_COLUMN_WIDTH_PX) +
      (index === columns.length - 1 ? STATIC_TAB_END_LINE_WIDTH_PX : 0);
    if (index > start && used + size > width) {
      rows.push({ start, end: index - 1 });
      start = index;
      used = STATIC_TAB_TUNING_GUTTER_WIDTH_PX;
    }
    used += size;
  }
  if (columns.length > 0) rows.push({ start, end: columns.length - 1 });
  return rows;
}
