// import { env } from "~/env";
import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

type BaseNoteLength = "whole" | "half" | "quarter" | "eighth" | "sixteenth";
type FullNoteLength =
  | BaseNoteLength
  | "whole dotted"
  | "whole double-dotted"
  | "half dotted"
  | "half double-dotted"
  | "quarter dotted"
  | "quarter double-dotted"
  | "eighth dotted"
  | "eighth double-dotted"
  | "sixteenth dotted"
  | "sixteenth double-dotted";

type StrummingPattern = {
  id: string;
  baseNoteLength: BaseNoteLength;
  strums: Strum[];
  [key: string]: unknown;
};

type Strum = {
  palmMute: string;
  strum: string;
  noteLength: FullNoteLength;
  noteLengthModified: boolean;
  [key: string]: unknown;
};

type TabSection = {
  id: string;
  type: "tab";
  bpm: number;
  baseNoteLength?: BaseNoteLength;
  repetitions: number;
  data: unknown[];
  [key: string]: unknown;
};

type ChordSequence = {
  id: string;
  strummingPattern: StrummingPattern;
  bpm: number;
  repetitions: number;
  data: string[];
  [key: string]: unknown;
};

type ChordSection = {
  id: string;
  type: "chord";
  bpm: number;
  repetitions: number;
  data: ChordSequence[];
  [key: string]: unknown;
};

type Section = {
  id: string;
  title?: string;
  data?: Array<TabSection | ChordSection | Record<string, unknown>>;
  [key: string]: unknown;
};

const FULL_NOTE_LENGTH_VALUES: Set<FullNoteLength> = new Set([
  "whole",
  "whole dotted",
  "whole double-dotted",
  "half",
  "half dotted",
  "half double-dotted",
  "quarter",
  "quarter dotted",
  "quarter double-dotted",
  "eighth",
  "eighth dotted",
  "eighth double-dotted",
  "sixteenth",
  "sixteenth dotted",
  "sixteenth double-dotted",
]);

const BASE_NOTE_LENGTH_VALUES: Set<BaseNoteLength> = new Set([
  "whole",
  "half",
  "quarter",
  "eighth",
  "sixteenth",
]);

const TAB_NOTE_LENGTH_MAP: Map<string, FullNoteLength | "measureLine"> =
  new Map([
    ["1", "quarter"],
    ["1.0", "quarter"],
    ["1/4", "quarter"],
    ["1/4th", "quarter"],
    ["quarter", "quarter"],
    ["quarter dotted", "quarter dotted"],
    ["quarter double dotted", "quarter double-dotted"],
    ["quarter double-dotted", "quarter double-dotted"],
    ["1/2", "half"],
    ["0.5", "eighth"],
    ["0.50", "eighth"],
    ["1/8", "eighth"],
    ["1/8th", "eighth"],
    ["eighth", "eighth"],
    ["eighth dotted", "eighth dotted"],
    ["eighth double dotted", "eighth double-dotted"],
    ["eighth double-dotted", "eighth double-dotted"],
    ["0.333", "eighth"],
    ["0.3333", "eighth"],
    ["0.25", "sixteenth"],
    ["0.250", "sixteenth"],
    ["1/16", "sixteenth"],
    ["1/16th", "sixteenth"],
    ["sixteenth", "sixteenth"],
    ["sixteenth dotted", "sixteenth dotted"],
    ["sixteenth double dotted", "sixteenth double-dotted"],
    ["sixteenth double-dotted", "sixteenth double-dotted"],
    ["measureline", "measureLine"],
    ["measure_line", "measureLine"],
  ]);

const BASE_NOTE_LENGTH_MAP: Map<string, BaseNoteLength> = new Map([
  ["1", "quarter"],
  ["1.0", "quarter"],
  ["1/4", "quarter"],
  ["1/4th", "quarter"],
  ["quarter", "quarter"],
  ["quarter dotted", "quarter"],
  ["quarter double dotted", "quarter"],
  ["quarter double-dotted", "quarter"],
  ["1/2", "half"],
  ["0.5", "eighth"],
  ["0.50", "eighth"],
  ["1/8", "eighth"],
  ["1/8th", "eighth"],
  ["eighth", "eighth"],
  ["eighth dotted", "eighth"],
  ["eighth double dotted", "eighth"],
  ["eighth double-dotted", "eighth"],
  ["0.333", "eighth"],
  ["0.3333", "eighth"],
  ["0.25", "sixteenth"],
  ["0.250", "sixteenth"],
  ["1/16", "sixteenth"],
  ["1/16th", "sixteenth"],
  ["sixteenth", "sixteenth"],
  ["sixteenth dotted", "sixteenth"],
  ["sixteenth double dotted", "sixteenth"],
  ["sixteenth double-dotted", "sixteenth"],
  ["1/4th triplet", "quarter"],
  ["1/8th triplet", "eighth"],
  ["1/16th triplet", "sixteenth"],
  ["triplet", "quarter"],
]);

const unknownTabNoteLengths = new Set<string>();
const unknownBaseLengths = new Set<string>();

function normalise(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }
  if (typeof value === "number") {
    return value.toString();
  }
  return String(value).toLowerCase();
}

function mapTabNoteLength(value: unknown): FullNoteLength | "measureLine" {
  if (
    typeof value === "string" &&
    FULL_NOTE_LENGTH_VALUES.has(value as FullNoteLength)
  ) {
    return value as FullNoteLength;
  }

  if (value === "measureLine") {
    return "measureLine";
  }

  const key = normalise(value);
  if (key && TAB_NOTE_LENGTH_MAP.has(key)) {
    return TAB_NOTE_LENGTH_MAP.get(key)!;
  }

  if (value !== undefined && value !== null) {
    unknownTabNoteLengths.add(String(value));
  }

  return "quarter";
}

function mapBaseNoteLength(value: unknown): BaseNoteLength {
  if (
    typeof value === "string" &&
    BASE_NOTE_LENGTH_VALUES.has(value as BaseNoteLength)
  ) {
    return value as BaseNoteLength;
  }

  const key = normalise(value);
  if (key && BASE_NOTE_LENGTH_MAP.has(key)) {
    return BASE_NOTE_LENGTH_MAP.get(key)!;
  }

  if (value !== undefined && value !== null) {
    unknownBaseLengths.add(String(value));
  }

  return "quarter";
}

function convertStrum(strum: unknown, fallback: BaseNoteLength): Strum {
  const base: Record<string, unknown> =
    typeof strum === "object" && strum !== null
      ? { ...(strum as Record<string, unknown>) }
      : {};

  const palmMute = typeof base.palmMute === "string" ? base.palmMute : "";
  const strumValue = typeof base.strum === "string" ? base.strum : "";
  const rawNoteLength = base.noteLength;

  let noteLength: FullNoteLength;
  if (
    typeof rawNoteLength === "string" &&
    FULL_NOTE_LENGTH_VALUES.has(rawNoteLength as FullNoteLength)
  ) {
    noteLength = rawNoteLength as FullNoteLength;
  } else {
    noteLength = fallback;
  }

  const noteLengthModified =
    typeof base.noteLengthModified === "boolean"
      ? base.noteLengthModified
      : false;

  return {
    ...base,
    palmMute,
    strum: strumValue,
    noteLength,
    noteLengthModified,
  } as Strum;
}

function convertStrummingPattern(pattern: unknown): {
  value: StrummingPattern | unknown;
  changed: boolean;
} {
  if (typeof pattern !== "object" || pattern === null) {
    return { value: pattern, changed: false };
  }

  const candidate = pattern as Record<string, unknown>;
  const alreadyConverted =
    typeof candidate.baseNoteLength === "string" &&
    BASE_NOTE_LENGTH_VALUES.has(candidate.baseNoteLength as BaseNoteLength) &&
    Array.isArray(candidate.strums) &&
    candidate.strums.every(
      (strum) =>
        typeof strum === "object" &&
        strum !== null &&
        typeof (strum as Record<string, unknown>).noteLength === "string" &&
        FULL_NOTE_LENGTH_VALUES.has(
          (strum as Record<string, unknown>).noteLength as FullNoteLength,
        ) &&
        typeof (strum as Record<string, unknown>).noteLengthModified ===
          "boolean",
    ) &&
    !("noteLength" in candidate);

  if (alreadyConverted) {
    return { value: pattern, changed: false };
  }

  const baseNoteLength = mapBaseNoteLength(
    candidate.baseNoteLength ?? candidate.noteLength,
  );

  const strumsArray = Array.isArray(candidate.strums) ? candidate.strums : [];
  const convertedStrums = strumsArray.map((strum) =>
    convertStrum(strum, baseNoteLength),
  );

  const updated: StrummingPattern = {
    ...candidate,
    baseNoteLength,
    strums: convertedStrums,
  } as StrummingPattern;

  delete (updated as Record<string, unknown>).noteLength;

  return { value: updated, changed: true };
}

function convertTabColumn(column: unknown): {
  value: unknown;
  changed: boolean;
} {
  if (!Array.isArray(column)) {
    return { value: column, changed: false };
  }

  const col = column as unknown[];

  const alreadyConverted =
    col.length >= 11 &&
    typeof col[9] === "string" &&
    (col[9] === "true" || col[9] === "false") &&
    typeof col[10] === "string";

  if (alreadyConverted) {
    return { value: column, changed: false };
  }

  const convertedNoteLength = mapTabNoteLength(col[8]);
  const noteLengthModified = "false";

  const maybeId =
    typeof col[9] === "string" && col[9].length > 0 ? col[9] : null;
  const id = maybeId ?? randomUUID();

  const resized = col.slice(0, 9);
  while (resized.length < 9) {
    resized.push("");
  }
  resized[8] = convertedNoteLength;
  resized.push(noteLengthModified, id);

  return { value: resized, changed: true };
}

function convertTabSection(section: TabSection): boolean {
  let changed = false;

  if (section.baseNoteLength !== "quarter") {
    section.baseNoteLength = "quarter";
    changed = true;
  }

  if (Array.isArray(section.data)) {
    section.data = section.data.map((column) => {
      const { value, changed: columnChanged } = convertTabColumn(column);
      if (columnChanged) {
        changed = true;
      }
      return value;
    });
  }

  return changed;
}

function convertChordSection(section: ChordSection): boolean {
  let changed = false;

  if (!Array.isArray(section.data)) {
    return changed;
  }

  section.data = section.data.map((sequence) => {
    const sequenceCopy = { ...sequence };
    const { value, changed: patternChanged } = convertStrummingPattern(
      sequenceCopy.strummingPattern,
    );
    if (patternChanged) {
      sequenceCopy.strummingPattern = value as StrummingPattern;
      changed = true;
    }
    return sequenceCopy;
  });

  return changed;
}

function convertTabData(tabData: unknown): {
  value: unknown;
  changed: boolean;
} {
  if (!Array.isArray(tabData)) {
    return { value: tabData, changed: false };
  }

  let changed = false;

  const convertedSections = (tabData as Section[]).map((section) => {
    if (!section || typeof section !== "object") {
      return section;
    }

    if (!Array.isArray(section.data)) {
      return section;
    }

    let sectionChanged = false;
    const newData = section.data.map((subSection) => {
      if (!subSection || typeof subSection !== "object") {
        return subSection;
      }

      if ((subSection as TabSection).type === "tab") {
        const tabSection = subSection as TabSection;
        if (convertTabSection(tabSection)) {
          sectionChanged = true;
        }
        return tabSection;
      }

      if ((subSection as ChordSection).type === "chord") {
        const chordSection = subSection as ChordSection;
        if (convertChordSection(chordSection)) {
          sectionChanged = true;
        }
        return chordSection;
      }

      return subSection;
    });

    if (sectionChanged) {
      changed = true;
      return { ...section, data: newData };
    }

    return section;
  });

  return { value: changed ? convertedSections : tabData, changed };
}

function convertStrummingPatternsCollection(patterns: unknown): {
  value: unknown;
  changed: boolean;
} {
  if (!Array.isArray(patterns)) {
    return { value: patterns, changed: false };
  }

  let changed = false;
  const converted = (patterns as unknown[]).map((pattern) => {
    const { value, changed: patternChanged } = convertStrummingPattern(pattern);
    if (patternChanged) {
      changed = true;
    }
    return value;
  });

  return { value: changed ? converted : patterns, changed };
}

async function updateTabs(): Promise<void> {
  const batchSize = 25;
  let cursor: number | undefined;
  let processed = 0;
  let updated = 0;

  for (;;) {
    const tabs = await prisma.tab.findMany({
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        tabData: true,
        strummingPatterns: true,
      },
    });

    if (tabs.length === 0) {
      break;
    }

    for (const tab of tabs) {
      processed += 1;

      const tabDataResult = convertTabData(tab.tabData as unknown);
      const strummingPatternsResult = convertStrummingPatternsCollection(
        tab.strummingPatterns as unknown,
      );

      const data: Prisma.TabUpdateInput = {};
      if (tabDataResult.changed) {
        data.tabData = tabDataResult.value as Prisma.InputJsonValue;
      }
      if (strummingPatternsResult.changed) {
        data.strummingPatterns =
          strummingPatternsResult.value as Prisma.InputJsonValue;
      }

      if (Object.keys(data).length > 0) {
        await prisma.tab.update({
          where: { id: tab.id },
          data,
        });
        updated += 1;
      }
    }

    cursor = tabs[tabs.length - 1]!.id;
  }

  console.log(`Processed ${processed} tabs.`);
  console.log(`Updated ${updated} tabs.`);
  if (unknownTabNoteLengths.size > 0) {
    console.warn(
      "Encountered unknown tab note length values:",
      Array.from(unknownTabNoteLengths),
    );
  }
  if (unknownBaseLengths.size > 0) {
    console.warn(
      "Encountered unknown base note length values:",
      Array.from(unknownBaseLengths),
    );
  }
}

async function main(): Promise<void> {
  try {
    await updateTabs();
  } catch (error) {
    console.error("Failed to update tab data:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
