import { CHORD_COLORS } from "~/utils/chordColors";
import { compileFullTab } from "~/utils/chordCompilationHelpers";
import { isValidChordEffectsInput } from "~/utils/strumEffectHelpers";
import type {
  BaseNoteLengths,
  Chord,
  ChordSection,
  ChordSequence,
  FullNoteLengths,
  Section,
  SectionProgression,
  Strum,
  StrummingPattern,
  TabMeasureLine,
  TabNote,
  TabSection,
} from "~/stores/TabStore";

/**
 * Dev-only listening fixture. Every phrase is built so the real compilers
 * (`compileFullTab` / chord-section compile) emit the effect the playback
 * engine actually branches on. Production never mounts this data.
 */
export const SOUND_LAB_BPM = 75;

export const SOUND_LAB_SECTION_ID = "sl-section";

export const SOUND_LAB_CHORD_COUNT = 6;
export const SOUND_LAB_PATTERN_COUNT = 4;

const NOTE_LENGTHS: FullNoteLengths[] = [
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
];

const G = ["3", "2", "0", "0", "0", "3"] as const;
const EM = ["0", "2", "2", "0", "0", "0"] as const;

type FretName = "E" | "A" | "D" | "G" | "B" | "e";

type Phrase = {
  /** Kept next to the columns so the fixture stays readable. Not rendered. */
  label?: string;
  columns: (TabNote | TabMeasureLine)[];
};

export type SoundLabFixture = {
  tabData: Section[];
  chords: Chord[];
  strummingPatterns: StrummingPattern[];
  sectionProgression: SectionProgression[];
};

let idCounter = 0;

function resetIds() {
  idCounter = 0;
}

function nextId(prefix: string) {
  idCounter += 1;
  return `sl-${prefix}-${idCounter}`;
}

function n(
  frets: Partial<Record<FretName, string>>,
  opts?: {
    fx?: string;
    len?: FullNoteLengths;
    spreadAuto?: boolean;
    spread?: number | null;
  },
): TabNote {
  const fx = opts?.fx ?? "";
  if (!isValidChordEffectsInput(fx)) {
    throw new Error(`Invalid chord effect "${fx}"`);
  }

  return {
    type: "note",
    palmMute: "",
    firstString: frets.E ?? "",
    secondString: frets.A ?? "",
    thirdString: frets.D ?? "",
    fourthString: frets.G ?? "",
    fifthString: frets.B ?? "",
    sixthString: frets.e ?? "",
    chordEffects: fx,
    noteLength: opts?.len ?? "quarter",
    strumSpreadAuto: opts?.spreadAuto ?? true,
    strumSpreadSeconds: opts?.spread === undefined ? null : opts.spread,
    id: nextId("n"),
  };
}

function shape(
  frets: readonly string[],
  effect: string,
  opts?: {
    len?: FullNoteLengths;
    spreadAuto?: boolean;
    spread?: number | null;
    e?: string;
  },
): TabNote {
  return n(
    {
      E: frets[0],
      A: frets[1],
      D: frets[2],
      G: frets[3],
      B: frets[4],
      e: opts?.e ?? frets[5],
    },
    {
      fx: effect,
      len: opts?.len,
      spreadAuto: opts?.spreadAuto,
      spread: opts?.spread,
    },
  );
}

function bpmBar(bpm: number): TabMeasureLine {
  return {
    type: "measureLine",
    isInPalmMuteSection: false,
    bpmAfterLine: bpm,
    id: nextId("bpm"),
  };
}

function palmMute(
  columns: (TabNote | TabMeasureLine)[],
): (TabNote | TabMeasureLine)[] {
  const noteIndexes = columns.flatMap((column, index) =>
    column.type === "note" ? [index] : [],
  );
  const first = noteIndexes[0];
  const last = noteIndexes[noteIndexes.length - 1];
  if (first === undefined || last === undefined) return columns;

  for (const index of noteIndexes) {
    const column = columns[index];
    if (column?.type !== "note") continue;
    column.palmMute =
      index === first ? "start" : index === last ? "end" : "-";
  }

  for (let index = first; index <= last; index++) {
    const column = columns[index];
    if (column?.type === "measureLine") {
      column.isInPalmMuteSection = true;
    }
  }

  return columns;
}

function joinPhrases(phrases: Phrase[]): (TabNote | TabMeasureLine)[] {
  return phrases.flatMap((phrase) => phrase.columns);
}

function tabSection(
  columns: (TabNote | TabMeasureLine)[],
  opts?: {
    bpm?: number;
    repetitions?: number;
    base?: BaseNoteLengths;
  },
): TabSection {
  return {
    id: nextId("sub"),
    type: "tab",
    bpm: opts?.bpm ?? -1,
    baseNoteLength: opts?.base ?? "quarter",
    repetitions: opts?.repetitions ?? 1,
    data: columns,
  };
}

function strum(
  effect: string,
  opts?: {
    len?: FullNoteLengths;
    spreadAuto?: boolean;
    spread?: number | null;
    palmMute?: Strum["palmMute"];
  },
): Strum {
  if (!isValidChordEffectsInput(effect)) {
    throw new Error(`Invalid strum effect "${effect}"`);
  }

  return {
    palmMute: opts?.palmMute ?? "",
    strum: effect,
    noteLength: opts?.len ?? "quarter",
    strumSpreadAuto: opts?.spreadAuto ?? true,
    strumSpreadSeconds: opts?.spread === undefined ? null : opts.spread,
  };
}

function palmMuteStrums(strums: Strum[]): Strum[] {
  const last = strums.length - 1;
  return strums.map((item, index) => ({
    ...item,
    palmMute: index === 0 ? "start" : index === last ? "end" : "-",
  }));
}

function pattern(
  strums: Strum[],
  baseNoteLength: BaseNoteLengths,
): StrummingPattern {
  return {
    id: nextId("pattern"),
    baseNoteLength,
    strums,
  };
}

function sequence(
  strummingPattern: StrummingPattern,
  names: string[],
  opts?: { repetitions?: number; bpm?: number },
): ChordSequence {
  if (names.length !== strummingPattern.strums.length) {
    throw new Error(
      `Chord sequence has ${names.length} chords for ${strummingPattern.strums.length} strums`,
    );
  }

  return {
    id: nextId("seq"),
    strummingPattern,
    bpm: opts?.bpm ?? -1,
    repetitions: opts?.repetitions ?? 1,
    data: names,
  };
}

function createChords(): Chord[] {
  return [
    {
      id: "sl-chord-g",
      name: "G",
      color: CHORD_COLORS[0],
      frets: [...G],
    },
    {
      id: "sl-chord-em",
      name: "Em",
      color: CHORD_COLORS[1],
      frets: [...EM],
    },
    {
      id: "sl-chord-c",
      name: "C",
      color: CHORD_COLORS[2],
      frets: ["", "3", "2", "0", "1", "0"],
    },
    {
      id: "sl-chord-d",
      name: "D",
      color: CHORD_COLORS[3],
      frets: ["", "", "0", "2", "3", "2"],
    },
    {
      id: "sl-chord-am",
      name: "Am",
      color: CHORD_COLORS[4],
      frets: ["", "0", "2", "2", "1", "0"],
    },
    {
      id: "sl-chord-gdead",
      name: "Gdead",
      color: CHORD_COLORS[5],
      frets: ["3", "2", "0", "0", "0", "x"],
    },
  ];
}

function appendPhrases(
  columns: (TabNote | TabMeasureLine)[],
  phrases: Phrase[],
) {
  columns.push(...joinPhrases(phrases));
}

function half(fret: string, extra?: Parameters<typeof n>[1]) {
  return n({ e: fret }, { len: "half", ...extra });
}

export function createSoundLab(): SoundLabFixture {
  resetIds();

  const tabColumns: (TabNote | TabMeasureLine)[] = [];

  appendPhrases(tabColumns, [
    {
      label: "Plain high E 5",
      columns: [n({ e: "5" })],
    },
    {
      label: "Inline accent 5>",
      columns: [n({ e: "5>" })],
    },
    {
      label: "Inline staccato 5.",
      columns: [n({ e: "5." })],
    },
    {
      label: "Chord-effect accent > on fret 7 (not written on the fret)",
      columns: [n({ e: "7" }, { fx: ">" })],
    },
    {
      label: "Chord-effect staccato . on fret 7",
      columns: [n({ e: "7" }, { fx: "." })],
    },
    {
      label: "Vibrato 5~, half note",
      columns: [half("5~")],
    },
    {
      label: "Dead note x",
      columns: [n({ e: "x" })],
    },
    {
      label: "Chord-effect rest, then plain 5 so the silence has an edge",
      columns: [n({ e: "5" }, { fx: "r" }), n({ e: "5" })],
    },
  ]);

  appendPhrases(tabColumns, [
      {
        label: "Suffix hammer-on 5h to 7",
        columns: [n({ e: "5h" }), n({ e: "7" })],
      },
      {
        label: "Standalone hammer-on 4, h, 6",
        columns: [n({ e: "4" }), n({ e: "h" }), n({ e: "6" })],
      },
      {
        label: "Hammer-on 9h into vibrato 11~",
        columns: [n({ e: "9h" }), half("11~")],
      },
      {
        label: "Suffix pull-off 8p to 6",
        columns: [n({ e: "8p" }), n({ e: "6" })],
      },
      {
        label: "Standalone pull-off 7, p, 5",
        columns: [n({ e: "7" }), n({ e: "p" }), n({ e: "5" })],
      },
      {
        label: "Pull-off 10p into vibrato 8~",
        columns: [n({ e: "10p" }), half("8~")],
      },
      {
        label: "Palm-muted hammer-on 3h to 5",
        columns: palmMute([n({ e: "3h" }), n({ e: "5" })]),
      },
      {
        label: "Palm-muted pull-off 6p to 4",
        columns: palmMute([n({ e: "6p" }), n({ e: "4" })]),
      },
    ],
  );

  appendPhrases(tabColumns, [
    {
      label: "Suffix slide up 5/ to 7",
      columns: [half("5/"), half("7")],
    },
    {
      label: "Standalone slide up 2, /, 4",
      columns: [half("2"), half("/"), half("4")],
    },
    {
      label: "Suffix slide down 7\\ to 5",
      columns: [half("7\\"), half("5")],
    },
    {
      label: "Standalone slide down 9, \\, 7",
      columns: [half("9"), half("\\"), half("7")],
    },
    {
      label: "Pre-note slide up into 8",
      columns: [half("/8")],
    },
    {
      label: "Pre-note slide down into 4",
      columns: [half("\\4")],
    },
    {
      label: "Post-note slide up off 6/, then a low E so the slide has a destination column",
      columns: [half("6/"), n({ E: "0" })],
    },
    {
      label: "Post-note slide down off 12\\, then low E fret 3",
      columns: [half("12\\"), n({ E: "3" })],
    },
    {
      label: "Slide up 4/ into vibrato 6~",
      columns: [half("4/"), half("6~")],
    },
    {
      label: "Palm-muted slide up 5/ to 8",
      columns: palmMute([half("5/"), half("8")]),
    },
  ]);

  appendPhrases(tabColumns, [
      {
        label:
          "Unspecified bend 7b (two frets). Low E separates it from a plucked 9, the pitch it should reach.",
        columns: [half("7b"), n({ E: "0" }), half("9")],
      },
      {
        label:
          "Bend 5b to a silent 8, then low E, then a plucked 8 to compare the target.",
        columns: [half("5b"), half("8"), n({ E: "0" }), half("8")],
      },
      {
        label: "Bend 4b to 6, then a release column r back to 4",
        columns: [half("4b"), half("6"), half("r")],
      },
      {
        label: "Bend 3b released by the suffix 6r",
        columns: [half("3b"), half("6r")],
      },
      {
        label:
          "Continuous 2b, 4, r, 2b. The second bend should not be plucked again.",
        columns: [half("2b"), half("4"), half("r"), half("2b")],
      },
      {
        label: "Palm-muted bend 6b to 8",
        columns: palmMute([half("6b"), half("8")]),
      },
  ]);

  appendPhrases(tabColumns, [
    {
      label: "Low E fret 3, open then palm-muted, so the low-string mute filter is obvious",
      columns: [
        n({ E: "3" }),
        n({ E: "3" }),
        ...palmMute([n({ E: "3" }), n({ E: "3" })]),
      ],
    },
    {
      label: "High E fret 12, open then palm-muted (high-string mute filter)",
      columns: [
        n({ e: "12" }),
        n({ e: "12" }),
        ...palmMute([n({ e: "12" }), n({ e: "12" })]),
      ],
    },
    {
      label: "Palm-muted inline accents",
      columns: palmMute([n({ e: "5>" }), n({ e: "5>" })]),
    },
    {
      label: "Palm-muted staccato",
      columns: palmMute([n({ e: "5." }), n({ e: "5." }), n({ e: "5." })]),
    },
    {
      label: "Palm-muted vibrato, half notes",
      columns: palmMute([half("7~"), half("7~")]),
    },
    {
      label: "Palm-muted dead notes",
      columns: palmMute([n({ e: "x" }), n({ e: "x" })]),
    },
    {
      label: "Palm mute across three notes",
      columns: palmMute([n({ e: "5" }), n({ e: "7" }), n({ e: "9" })]),
    },
  ]);

  const strumPhrases: Phrase[] = [
    ["", "Block chord, no strum"],
    ["v", "Downstrum"],
    ["^", "Upstrum"],
    ["v~", "Arpeggiated downstrum"],
    ["^~", "Arpeggiated upstrum"],
    ["v>", "Downstrum, accent"],
    ["v.", "Downstrum, staccato"],
    ["v>.", "Downstrum, accent then staccato"],
    ["v.>", "Downstrum, staccato then accent"],
    ["^>", "Upstrum, accent"],
    ["^.", "Upstrum, staccato"],
    ["^>.", "Upstrum, accent then staccato"],
    ["^.>", "Upstrum, staccato then accent"],
    ["v~>", "Arpeggiated downstrum, accent"],
    ["v~.", "Arpeggiated downstrum, staccato"],
    ["v~>.", "Arpeggiated downstrum, accent and staccato"],
    ["^~>", "Arpeggiated upstrum, accent"],
    ["^~.", "Arpeggiated upstrum, staccato"],
    ["^~>.", "Arpeggiated upstrum, accent and staccato"],
    [">", "Accent only, strings together"],
    [".", "Staccato only, strings together"],
    ["r", "Rest"],
    ["v", "Downstrum after the rest"],
  ].map(([effect, label]) => ({
    label: label!,
    columns: [shape(G, effect!)],
  }));

  strumPhrases.push(
    {
      label: "Downstrum with spread forced to 0s",
      columns: [shape(G, "v", { spreadAuto: false, spread: 0 })],
    },
    {
      label: "Downstrum at the widest normal spread, 0.15s",
      columns: [shape(G, "v", { spreadAuto: false, spread: 0.15 })],
    },
    {
      label: "Upstrum at 0.15s, so the reversed string order is audible",
      columns: [shape(G, "^", { spreadAuto: false, spread: 0.15 })],
    },
    {
      label: "Arpeggiated downstrum at the tightest arp spread, 0.16s",
      columns: [shape(G, "v~", { spreadAuto: false, spread: 0.16 })],
    },
    {
      label: "Arpeggiated downstrum at the widest arp spread, 0.3s",
      columns: [shape(G, "v~", { spreadAuto: false, spread: 0.3 })],
    },
    {
      label: "Arpeggiated downstrum with automatic spread",
      columns: [shape(G, "v~", { spreadAuto: true })],
    },
    {
      label: "Three palm-muted downstrums",
      columns: palmMute([shape(G, "v"), shape(G, "v"), shape(G, "v")]),
    },
    {
      label: "Downstrum with a dead high E",
      columns: [shape(G, "v", { e: "x" })],
    },
    {
      label: "Dead high E with a chord-effect accent",
      columns: [n({ e: "x" }, { fx: ">" })],
    },
    {
      label: "Downstrum with vibrato on the high E only",
      columns: [shape(G, "v", { e: "3~" })],
    },
    {
      label: "Downstrum with staccato on the high E only",
      columns: [shape(G, "v", { e: "3." })],
    },
    {
      label: "Downstrum with an accent on the high E only",
      columns: [shape(G, "v", { e: "3>" })],
    },
    {
      label: "Downstrum whose high E hammers 3h to 5",
      columns: [shape(G, "v", { e: "3h" }), n({ e: "5" })],
    },
  );

  appendPhrases(tabColumns, strumPhrases);

  appendPhrases(tabColumns, [
    {
      label: "Downstrum, as a reference before the slaps",
      columns: [shape(G, "v")],
    },
    {
      label: "Slap. The chord frets are not plucked.",
      columns: [shape(G, "s")],
    },
    {
      label: "Accented slap",
      columns: [shape(G, "s>")],
    },
    {
      label: "Staccato slap",
      columns: [shape(G, "s.")],
    },
    {
      label: "Slap, accent then staccato",
      columns: [shape(G, "s>.")],
    },
    {
      label: "Slap, staccato then accent",
      columns: [shape(G, "s.>")],
    },
    {
      label: "Palm-muted slap, then palm-muted accented slap",
      columns: palmMute([shape(G, "s"), shape(G, "s>")]),
    },
    {
      label: "Downstrum after the slaps",
      columns: [shape(G, "v")],
    },
  ]);

  tabColumns.push(
    bpmBar(120),
    ...NOTE_LENGTHS.map((len) => n({ e: "0" }, { len })),
    bpmBar(70),
    half("5~"),
    bpmBar(160),
    half("5~"),
    bpmBar(60),
    shape(G, "v~"),
    bpmBar(220),
    shape(G, "v~"),
  );

  const chordEffects = pattern(
    [
      strum("", { len: "eighth" }),
      strum("v", { len: "eighth" }),
      strum("^", { len: "eighth" }),
      strum("v~", { len: "eighth" }),
      strum("s", { len: "eighth" }),
      strum("r", { len: "eighth" }),
      strum("v>", { len: "eighth" }),
      strum("v.", { len: "eighth" }),
    ],
    "eighth",
  );
  const chordArticulation = pattern(
    [
      strum("v", { spreadAuto: false, spread: 0 }),
      strum("v", { spreadAuto: false, spread: 0.15 }),
      strum("v~", { spreadAuto: false, spread: 0.3 }),
      ...palmMuteStrums([strum("v"), strum("v"), strum("^")]),
    ],
    "quarter",
  );
  const chordChanges = pattern(
    [strum("v"), strum("^"), strum("v"), strum("^")],
    "quarter",
  );
  const chordEdges = pattern(
    [
      strum("v", { len: "sixteenth" }),
      strum("v", { len: "whole" }),
      strum("v"),
      strum("v"),
    ],
    "quarter",
  );

  const chordSubSection: ChordSection = {
    id: nextId("chord-sub"),
    type: "chord",
    bpm: -1,
    repetitions: 1,
    data: [
      sequence(chordEffects, Array(chordEffects.strums.length).fill("G")),
      sequence(
        chordArticulation,
        Array(chordArticulation.strums.length).fill("Em"),
      ),
      sequence(chordChanges, ["G", "", "C", ""], { repetitions: 2 }),
      sequence(chordEdges, ["", "Missing", "D", "Gdead"]),
    ],
  };

  const section: Section = {
    id: SOUND_LAB_SECTION_ID,
    title: "Sound lab",
    data: [
      tabSection(tabColumns),
      chordSubSection,
    ],
  };

  return {
    tabData: [section],
    chords: createChords(),
    strummingPatterns: [
      chordEffects,
      chordArticulation,
      chordChanges,
      chordEdges,
    ],
    sectionProgression: [
      {
        id: "sl-prog-section",
        sectionId: SOUND_LAB_SECTION_ID,
        title: section.title,
        repetitions: 1,
        startSeconds: 0,
        endSeconds: 0,
      },
    ],
  };
}

const REQUIRED_EFFECTS = [
  "",
  "v",
  "^",
  "v~",
  "^~",
  "v>",
  "v.",
  "v>.",
  "v.>",
  "^>",
  "^.",
  "^>.",
  "^.>",
  "v~>",
  "v~.",
  "v~>.",
  "^~>",
  "^~.",
  "^~>.",
  "s",
  "s>",
  "s.",
  "s>.",
  "s.>",
  ">",
  ".",
  "r",
];

const REQUIRED_SPREADS = ["", "auto", "0", "0.15", "0.16", "0.3"];

function fretKey(column: string[] | undefined) {
  if (!column || column.length < 7) return "";
  return column.slice(1, 7).join("|");
}

function highE(compiled: string[][]) {
  return compiled.map((column) =>
    column.length === 0 ? "" : (column[6] ?? ""),
  );
}

function hasSequence(lane: string[], sequence: string[]) {
  outer: for (let index = 0; index <= lane.length - sequence.length; index++) {
    for (let offset = 0; offset < sequence.length; offset++) {
      if (lane[index + offset] !== sequence[offset]) continue outer;
    }
    return true;
  }
  return false;
}

function countGram(compiled: string[][], keys: string[]) {
  let count = 0;
  for (let index = 0; index <= compiled.length - keys.length; index++) {
    const matched = keys.every(
      (key, offset) => fretKey(compiled[index + offset]) === key,
    );
    if (matched) count += 1;
  }
  return count;
}

function verifySoundLab(lab: SoundLabFixture) {
  const failures: string[] = [];
  const fail = (message: string) => failures.push(message);

  if (lab.chords.length !== SOUND_LAB_CHORD_COUNT) {
    fail(`expected ${SOUND_LAB_CHORD_COUNT} chords`);
  }
  if (lab.strummingPatterns.length !== SOUND_LAB_PATTERN_COUNT) {
    fail(`expected ${SOUND_LAB_PATTERN_COUNT} strumming patterns`);
  }

  if (lab.tabData.length !== 1) {
    fail("sound lab should be a single section");
  }
  const section = lab.tabData[0];
  const tabSubSection = section?.data[0];
  const strumSubSection = section?.data[1];
  if (section?.data.length !== 2) {
    fail("sound lab should contain one tab subsection and one strumming subsection");
  }
  if (tabSubSection?.type !== "tab") {
    fail("first subsection should be a tab");
  }
  if (strumSubSection?.type !== "chord") {
    fail("second subsection should be a strumming section");
  }
  if (tabSubSection?.type === "tab") {
    for (const column of tabSubSection.data) {
      if (column.type === "measureLine" && column.bpmAfterLine === null) {
        fail("measure lines are only for BPM changes");
      }
    }
  }

  const compiled = compileFullTab({
    tabData: lab.tabData,
    sectionProgression: lab.sectionProgression,
    chords: lab.chords,
    strummingPatterns: lab.strummingPatterns,
    baselineBpm: SOUND_LAB_BPM,
    playbackSpeed: 1,
    setCurrentlyPlayingMetadata: () => {},
    startLoopIndex: 0,
    endLoopIndex: -1,
    forMetadataOnly: false,
  });

  const lane = highE(compiled);
  const sequences: string[][] = [
    ["5h", "7"],
    ["4", "h", "6"],
    ["9h", "11~"],
    ["8p", "6"],
    ["7", "p", "5"],
    ["10p", "8~"],
    ["3h", "5"],
    ["6p", "4"],
    ["5/", "7"],
    ["2", "/", "4"],
    ["7\\", "5"],
    ["9", "\\", "7"],
    ["4/", "6~"],
    ["5/", "8"],
    ["7b", "", "9"],
    ["5b", "8", "", "8"],
    ["4b", "6", "r"],
    ["3b", "6r"],
    ["2b", "4", "r", "2b"],
    ["6b", "8"],
    ["3h", "5"],
  ];

  for (const sequence of sequences) {
    if (!hasSequence(lane, sequence)) {
      fail(`missing high-E sequence ${sequence.join(" | ")}`);
    }
  }

  if (!compiled.some((column) => column[6] === "/8")) {
    fail("missing pre-note slide up");
  }
  if (!compiled.some((column) => column[6] === "\\4")) {
    fail("missing pre-note slide down");
  }
  if (
    !compiled.some(
      (column, index) =>
        column[6] === "6/" &&
        compiled[index + 1]?.[6] === "" &&
        compiled[index + 1]?.[1] === "0",
    )
  ) {
    fail("missing post-note slide up");
  }
  if (
    !compiled.some(
      (column, index) =>
        column[6] === "12\\" &&
        compiled[index + 1]?.[6] === "" &&
        compiled[index + 1]?.[1] === "3",
    )
  ) {
    fail("missing post-note slide down");
  }

  const effects = new Set(compiled.map((column) => column[7] ?? ""));
  for (const effect of REQUIRED_EFFECTS) {
    if (!effects.has(effect)) fail(`missing chord effect "${effect}"`);
  }

  const lengths = new Set(compiled.map((column) => column[8] ?? ""));
  for (const length of NOTE_LENGTHS) {
    if (!lengths.has(length)) fail(`missing note length "${length}"`);
  }

  const spreads = new Set(compiled.map((column) => column[10] ?? ""));
  for (const spread of REQUIRED_SPREADS) {
    if (!spreads.has(spread)) fail(`missing strum spread "${spread}"`);
  }

  const palmMutes = new Set(compiled.map((column) => column[0] ?? ""));
  for (const palmMuteValue of ["start", "-", "end"]) {
    if (!palmMutes.has(palmMuteValue)) {
      fail(`missing palm mute "${palmMuteValue}"`);
    }
  }

  if (
    !compiled.some(
      (column) =>
        column[0] !== "" && column[1] === "3" && (column[6] ?? "") === "",
    )
  ) {
    fail("missing palm-muted low E");
  }
  if (
    !compiled.some((column) => column[0] !== "" && column[6] === "12")
  ) {
    fail("missing palm-muted high E");
  }
  if (!compiled.some((column) => column[0] !== "" && column[6] === "x")) {
    fail("missing palm-muted dead note");
  }
  if (
    !compiled.some(
      (column) => column[7] === "v" && column[6] === "x" && column[1] === "3",
    )
  ) {
    fail("missing downstrum with a dead high E");
  }

  const bpms = new Set(compiled.map((column) => column[9] ?? ""));
  for (const bpm of ["75", "120", "70", "160", "60", "220"]) {
    if (!bpms.has(bpm)) fail(`missing compiled BPM ${bpm}`);
  }
  if (!compiled.some((column) => column[6] === "5~" && column[9] === "70")) {
    fail("vibrato did not compile at 70 BPM");
  }
  if (!compiled.some((column) => column[6] === "5~" && column[9] === "160")) {
    fail("vibrato did not compile at 160 BPM");
  }

  const gKey = "3|2|0|0|0|3";
  const cKey = "|3|2|0|1|0";
  if (countGram(compiled, [gKey, gKey, cKey, cKey]) !== 2) {
    fail("G/C carry-forward sequence should compile twice");
  }
  if (
    !compiled.some(
      (column) =>
        column[8] === "whole" &&
        column[7] === "" &&
        fretKey(column) === "|||||",
    )
  ) {
    fail("missing-chord strum should compile as a silent whole note");
  }
  if (
    !compiled.some(
      (column) =>
        column[8] === "sixteenth" &&
        column[7] === "" &&
        fretKey(column) === "|||||",
    )
  ) {
    fail("leading empty chord should compile as a silent sixteenth");
  }
  if (!compiled.some((column) => fretKey(column) === "||0|2|3|2")) {
    fail("missing D chord");
  }
  if (!compiled.some((column) => fretKey(column) === "3|2|0|0|0|x")) {
    fail("missing Gdead chord");
  }

  if (failures.length > 0) {
    throw new Error(`Sound lab fixture is incomplete:\n${failures.join("\n")}`);
  }
}

let soundLabVerified = false;

export function createVerifiedSoundLab() {
  const lab = createSoundLab();
  // Verify lazily. Compiling at import time runs while TabStore is still
  // initializing and trips a circular-init error on noteLengthMultipliers.
  if (!soundLabVerified) {
    verifySoundLab(lab);
    soundLabVerified = true;
  }
  return lab;
}
