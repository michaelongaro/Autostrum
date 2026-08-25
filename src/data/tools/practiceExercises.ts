import type {
  FullNoteLengths,
  Section,
  TabNote,
  TabSection,
} from "~/stores/TabStore";
import {
  createTabMeasureLine,
  createTabNote,
  stringIndexToKey,
} from "~/utils/tabNoteHelpers";
import { DEFAULT_TUNING } from "~/utils/tunings";

/**
 * String numbering matches TabStore: 1 = low E (firstString), 6 = high E
 * (sixthString). This is the opposite of spoken guitar numbering (where
 * "string 1" is high E).
 */
export type GuitarString = 1 | 2 | 3 | 4 | 5 | 6;

export type PracticeLevel = "beginner" | "intermediate" | "advanced";

export const PRACTICE_LEVELS: PracticeLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

export const PRACTICE_LEVEL_LABELS: Record<PracticeLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const PRACTICE_TUNING = DEFAULT_TUNING;

export type PracticeExercise = {
  id: string;
  title: string;
  description: string;
  level: PracticeLevel;
  section: Section;
};

type FretShape = readonly (readonly number[])[];

type FretEffect = "h" | "p" | "/" | "\\";

type FretInput =
  | number
  | {
      fret: number;
      effect?: FretEffect;
      noteLength?: FullNoteLengths;
    };

const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64] as const;

const PC = {
  C: 0,
  Cs: 1,
  D: 2,
  Ds: 3,
  E: 4,
  F: 5,
  Fs: 6,
  G: 7,
  Gs: 8,
  A: 9,
  As: 10,
  B: 11,
} as const;

const C_MAJOR = [PC.C, PC.D, PC.E, PC.F, PC.G, PC.A, PC.B] as const;
const G_MAJOR = [PC.G, PC.A, PC.B, PC.C, PC.D, PC.E, PC.Fs] as const;
const A_MAJOR = [PC.A, PC.B, PC.Cs, PC.D, PC.E, PC.Fs, PC.Gs] as const;
const D_MAJOR = [PC.D, PC.E, PC.Fs, PC.G, PC.A, PC.B, PC.Cs] as const;
const A_MINOR_PENT = [PC.A, PC.C, PC.D, PC.E, PC.G] as const;
const E_MINOR_PENT = [PC.E, PC.G, PC.A, PC.B, PC.D] as const;
const G_MAJOR_PENT = [PC.G, PC.A, PC.B, PC.D, PC.E] as const;
const A_BLUES = [PC.A, PC.C, PC.D, PC.Ds, PC.E, PC.G] as const;
const E_BLUES = [PC.E, PC.G, PC.A, PC.As, PC.B, PC.D] as const;
const A_HARMONIC_MINOR = [PC.A, PC.B, PC.C, PC.D, PC.E, PC.F, PC.Gs] as const;

function n(
  stringIndex: GuitarString,
  fret: number,
  options?: {
    noteLength?: FullNoteLengths;
    effect?: FretEffect;
  },
): TabNote {
  return createTabNote({
    [stringIndexToKey(stringIndex)]: `${fret}${options?.effect ?? ""}`,
    noteLength: options?.noteLength ?? "quarter",
  });
}

function reverseNotes(notes: TabNote[]): TabNote[] {
  return [...notes].reverse();
}

function upAndDown(notes: TabNote[]): TabNote[] {
  if (notes.length < 2) return notes;
  return [...notes, ...reverseNotes(notes).slice(1)];
}

function fromShape(
  shape: FretShape,
  noteLength?: FullNoteLengths,
): TabNote[] {
  const notes: TabNote[] = [];
  shape.forEach((frets, stringOffset) => {
    const stringIndex = (stringOffset + 1) as GuitarString;
    for (const fret of frets) {
      notes.push(n(stringIndex, fret, { noteLength }));
    }
  });
  return notes;
}

function assertShapePitchClasses(
  id: string,
  shape: FretShape,
  expectedPitchClasses: readonly number[],
) {
  if (shape.length !== 6) {
    throw new Error(`[${id}] shape must list 6 strings (low E → high E)`);
  }

  const actual = new Set<number>();
  shape.forEach((frets, stringOffset) => {
    const openMidi = STANDARD_TUNING_MIDI[stringOffset];
    if (openMidi === undefined) return;
    for (const fret of frets) {
      actual.add((openMidi + fret) % 12);
    }
  });

  const expected = new Set(expectedPitchClasses);
  const extra = [...actual]
    .filter((pc) => !expected.has(pc))
    .sort((a, b) => a - b);
  const missing = [...expected]
    .filter((pc) => !actual.has(pc))
    .sort((a, b) => a - b);

  if (extra.length > 0 || missing.length > 0) {
    throw new Error(
      `[${id}] pitch-class mismatch. extra=[${extra.join(",")}] missing=[${missing.join(",")}]`,
    );
  }
}

function scaleFromShape({
  id,
  shape,
  pitchClasses,
  noteLength,
  descend = true,
}: {
  id: string;
  shape: FretShape;
  pitchClasses: readonly number[];
  noteLength?: FullNoteLengths;
  descend?: boolean;
}): TabNote[] {
  assertShapePitchClasses(id, shape, pitchClasses);
  const ascending = fromShape(shape, noteLength);
  return descend ? upAndDown(ascending) : ascending;
}

function scaleSequences({
  id,
  shape,
  pitchClasses,
  groupSize,
}: {
  id: string;
  shape: FretShape;
  pitchClasses: readonly number[];
  groupSize: number;
}): TabNote[] {
  assertShapePitchClasses(id, shape, pitchClasses);
  const notes = fromShape(shape);
  const up: TabNote[] = [];
  for (let i = 0; i <= notes.length - groupSize; i++) {
    up.push(...notes.slice(i, i + groupSize));
  }
  const down: TabNote[] = [];
  for (let i = notes.length - 1; i >= groupSize - 1; i--) {
    for (let j = 0; j < groupSize; j++) {
      const note = notes[i - j];
      if (note) down.push(note);
    }
  }
  return [...up, ...down];
}

function acrossStrings(
  frets: readonly FretInput[],
  options?: {
    from?: GuitarString;
    to?: GuitarString;
    noteLength?: FullNoteLengths;
  },
): TabNote[] {
  const from = options?.from ?? 1;
  const to = options?.to ?? 6;
  const notes: TabNote[] = [];
  const direction = from <= to ? 1 : -1;
  for (
    let stringIndex = from;
    direction > 0 ? stringIndex <= to : stringIndex >= to;
    stringIndex = (stringIndex + direction) as GuitarString
  ) {
    for (const fretInput of frets) {
      const spec =
        typeof fretInput === "number" ? { fret: fretInput } : fretInput;
      notes.push(
        n(stringIndex, spec.fret, {
          noteLength: spec.noteLength ?? options?.noteLength,
          effect: spec.effect,
        }),
      );
    }
  }
  return notes;
}

function fretRun(
  stringIndex: GuitarString,
  fromFret: number,
  toFret: number,
): TabNote[] {
  const notes: TabNote[] = [];
  const direction = fromFret <= toFret ? 1 : -1;
  for (
    let fret = fromFret;
    direction > 0 ? fret <= toFret : fret >= toFret;
    fret += direction
  ) {
    notes.push(n(stringIndex, fret));
  }
  return notes;
}

function classicSpiderCrawl(): TabNote[] {
  const up: TabNote[] = [];
  for (let stringIndex = 1; stringIndex <= 5; stringIndex++) {
    const a = stringIndex as GuitarString;
    const b = (stringIndex + 1) as GuitarString;
    up.push(n(a, 1), n(b, 2), n(a, 3), n(b, 4));
  }

  const down: TabNote[] = [];
  for (let stringIndex = 5; stringIndex >= 1; stringIndex--) {
    const a = stringIndex as GuitarString;
    const b = (stringIndex + 1) as GuitarString;
    down.push(n(b, 4), n(a, 3), n(b, 2), n(a, 1));
  }

  return [...up, ...down.slice(1)];
}

function shiftingChromaticBox(
  stringIndex: GuitarString,
  firstStartFret: number,
  lastStartFret: number,
): TabNote[] {
  const notes: TabNote[] = [];
  for (let start = firstStartFret; start <= lastStartFret; start++) {
    notes.push(
      n(stringIndex, start),
      n(stringIndex, start + 1),
      n(stringIndex, start + 2),
      n(stringIndex, start + 3),
    );
  }
  return notes;
}

function trill({
  stringIndex,
  lowFret,
  highFret,
  noteCount,
  noteLength,
}: {
  stringIndex: GuitarString;
  lowFret: number;
  highFret: number;
  noteCount: number;
  noteLength: FullNoteLengths;
}): TabNote[] {
  const notes: TabNote[] = [];
  for (let i = 0; i < noteCount; i++) {
    const isLast = i === noteCount - 1;
    if (i % 2 === 0) {
      notes.push(
        n(stringIndex, lowFret, {
          noteLength,
          effect: isLast ? undefined : "h",
        }),
      );
    } else {
      notes.push(
        n(stringIndex, highFret, {
          noteLength,
          effect: isLast ? undefined : "p",
        }),
      );
    }
  }
  return notes;
}

function noteHasEffect(note: TabNote, effect: FretEffect): boolean {
  return [
    note.firstString,
    note.secondString,
    note.thirdString,
    note.fourthString,
    note.fifthString,
    note.sixthString,
  ].some((value) => value.includes(effect));
}

function assertHasEffect(id: string, notes: TabNote[], effect: FretEffect) {
  if (!notes.some((note) => noteHasEffect(note, effect))) {
    throw new Error(`[${id}] expected at least one "${effect}" effect`);
  }
}

function createExerciseSection({
  id,
  title,
  bpm,
  notesPerMeasure = 4,
  repetitions = 2,
  notes,
}: {
  id: string;
  title: string;
  bpm: number;
  notesPerMeasure?: number;
  repetitions?: number;
  notes: TabNote[];
}): Section {
  const data = notes.flatMap((note, index) => {
    const column: TabNote = { ...note, id: `${id}-n-${index}` };
    const isEndOfMeasure =
      (index + 1) % notesPerMeasure === 0 && index < notes.length - 1;

    if (!isEndOfMeasure) return [column];

    return [
      column,
      { ...createTabMeasureLine(), id: `${id}-ml-${index}` },
    ];
  });

  return {
    id,
    title,
    data: [
      {
        id: `${id}-tab`,
        type: "tab",
        bpm,
        baseNoteLength: "quarter",
        repetitions,
        data,
      },
    ],
  };
}

function exercise({
  id,
  title,
  description,
  level,
  bpm,
  notesPerMeasure,
  notes,
}: {
  id: string;
  title: string;
  description: string;
  level: PracticeLevel;
  bpm: number;
  notesPerMeasure?: number;
  notes: TabNote[];
}): PracticeExercise {
  return {
    id,
    title,
    description,
    level,
    section: createExerciseSection({
      id,
      title,
      bpm,
      notesPerMeasure,
      notes,
    }),
  };
}

export function getPracticeExerciseTabSection(
  exercise: PracticeExercise,
): TabSection | null {
  const subSection = exercise.section.data[0];
  return subSection?.type === "tab" ? subSection : null;
}

export function getPracticeExerciseBpm(exercise: PracticeExercise): number {
  return getPracticeExerciseTabSection(exercise)?.bpm ?? 75;
}

export function getPracticeExercisesTabData(
  exercises: PracticeExercise[],
): Section[] {
  return exercises.map((item) => item.section);
}

export type PracticeExerciseGroup = {
  level: PracticeLevel;
  label: string;
  items: PracticeExercise[];
};

export function groupPracticeExercisesByLevel(
  exercises: PracticeExercise[],
): PracticeExerciseGroup[] {
  return PRACTICE_LEVELS.map((level) => ({
    level,
    label: PRACTICE_LEVEL_LABELS[level],
    items: exercises.filter((item) => item.level === level),
  })).filter((group) => group.items.length > 0);
}

const AM_PENT_POS_1 = [
  [5, 8],
  [5, 7],
  [5, 7],
  [5, 7],
  [5, 8],
  [5, 8],
] as const;

const hammerOnLadderNotes = acrossStrings([{ fret: 5, effect: "h" }, 7], {
  noteLength: "eighth",
});
assertHasEffect("hammer-on-ladder", hammerOnLadderNotes, "h");

const pullOffLadderNotes = acrossStrings([{ fret: 7, effect: "p" }, 5], {
  noteLength: "eighth",
});
assertHasEffect("pull-off-ladder", pullOffLadderNotes, "p");

const legatoTrillNotes = [
  ...trill({
    stringIndex: 3,
    lowFret: 5,
    highFret: 7,
    noteCount: 8,
    noteLength: "sixteenth",
  }),
  ...trill({
    stringIndex: 3,
    lowFret: 5,
    highFret: 8,
    noteCount: 8,
    noteLength: "sixteenth",
  }),
];
assertHasEffect("legato-trills", legatoTrillNotes, "h");
assertHasEffect("legato-trills", legatoTrillNotes, "p");

export const warmupExercises: PracticeExercise[] = [
  exercise({
    id: "open-string-picking",
    title: "Open String Alternate Picking",
    description:
      "Pick across the open strings to settle your right hand before fretting.",
    level: "beginner",
    bpm: 60,
    notes: upAndDown(acrossStrings([0])),
  }),
  exercise({
    id: "chromatic-ladder",
    title: "1-2-3-4 Chromatic Ladder",
    description:
      "One finger per fret on every string, ascending and descending.",
    level: "beginner",
    bpm: 72,
    notes: upAndDown(acrossStrings([1, 2, 3, 4])),
  }),
  exercise({
    id: "chromatic-reverse",
    title: "4-3-2-1 Chromatic Reverse",
    description:
      "Start on the pinky and walk backwards — the weaker direction for most players.",
    level: "beginner",
    bpm: 72,
    notes: upAndDown(acrossStrings([4, 3, 2, 1])),
  }),
  exercise({
    id: "one-string-chromatic",
    title: "Single-String Chromatic",
    description:
      "Walk 0–12 on the low E, then back down. Repeat the idea on every string.",
    level: "beginner",
    bpm: 70,
    notes: upAndDown(fretRun(1, 0, 12)),
  }),
  exercise({
    id: "hammer-on-ladder",
    title: "Hammer-On Ladder",
    description:
      "Fret 5, then hammer 7 with the ring finger on each string.",
    level: "beginner",
    bpm: 70,
    notesPerMeasure: 4,
    notes: hammerOnLadderNotes,
  }),
  exercise({
    id: "spider-crawl",
    title: "Classic Spider Crawl",
    description:
      "Stagger 1-2-3-4 across adjacent strings, then reverse the crawl.",
    level: "intermediate",
    bpm: 70,
    notes: classicSpiderCrawl(),
  }),
  exercise({
    id: "spider-walk",
    title: "Offset Spider Walk",
    description:
      "Wider string jumps to challenge left-hand independence and accuracy.",
    level: "intermediate",
    bpm: 72,
    notes: [
      n(1, 1),
      n(3, 2),
      n(2, 3),
      n(4, 4),
      n(3, 1),
      n(5, 2),
      n(4, 3),
      n(6, 4),
      n(2, 1),
      n(4, 2),
      n(3, 3),
      n(5, 4),
      n(4, 1),
      n(6, 2),
      n(5, 3),
      n(3, 4),
    ],
  }),
  exercise({
    id: "stretch-1245",
    title: "1-2-4-5 Stretch",
    description:
      "Index–middle–pinky with a one-fret gap. Keep the wrist relaxed.",
    level: "intermediate",
    bpm: 66,
    notes: upAndDown(acrossStrings([1, 2, 4, 5])),
  }),
  exercise({
    id: "finger-permutation-1324",
    title: "1-3-2-4 Finger Independence",
    description:
      "The classic permutation: index, ring, middle, pinky on every string.",
    level: "intermediate",
    bpm: 76,
    notes: upAndDown(acrossStrings([1, 3, 2, 4])),
  }),
  exercise({
    id: "pinky-strength",
    title: "Pinky Strength Builder",
    description:
      "Index and pinky only (5–8) so the fourth finger stops flying off the neck.",
    level: "intermediate",
    bpm: 80,
    notes: upAndDown(acrossStrings([5, 8])),
  }),
  exercise({
    id: "pull-off-ladder",
    title: "Pull-Off Ladder",
    description:
      "Fret 7, then pull off to 5 on each string. Keep both notes even.",
    level: "intermediate",
    bpm: 70,
    notes: pullOffLadderNotes,
  }),
  exercise({
    id: "position-shift-chromatic",
    title: "Shifting Chromatic Box",
    description: "Move the 1-2-3-4 box up the G string, one fret at a time.",
    level: "intermediate",
    bpm: 80,
    notes: shiftingChromaticBox(4, 1, 9),
  }),
  exercise({
    id: "string-skipping-warmup",
    title: "String Skipping Workout",
    description:
      "Skip one string at a time with a 5–7 box to tighten picking accuracy.",
    level: "intermediate",
    bpm: 88,
    notes: [
      n(1, 5),
      n(1, 7),
      n(3, 5),
      n(3, 7),
      n(2, 5),
      n(2, 7),
      n(4, 5),
      n(4, 7),
      n(3, 5),
      n(3, 7),
      n(5, 5),
      n(5, 7),
      n(4, 5),
      n(4, 7),
      n(6, 5),
      n(6, 7),
    ],
  }),
  exercise({
    id: "legato-trills",
    title: "Legato Trills",
    description:
      "Hammer-on/pull-off bursts on the D string, first 2nd–3rd then 2nd–4th fingers.",
    level: "advanced",
    bpm: 75,
    notesPerMeasure: 8,
    notes: legatoTrillNotes,
  }),
  exercise({
    id: "three-nps-chromatic",
    title: "3-Note-Per-String Chromatic",
    description:
      "Three-finger chromatic rows for economy picking and even leftover motion.",
    level: "advanced",
    bpm: 88,
    notesPerMeasure: 3,
    notes: upAndDown(acrossStrings([5, 6, 7], { noteLength: "eighth" })),
  }),
  exercise({
    id: "sweep-picking-prep",
    title: "Sweep Picking Primer",
    description:
      "Em triad on the top three strings, rolling the right hand through adjacent strings.",
    level: "advanced",
    bpm: 96,
    notesPerMeasure: 4,
    notes: [
      n(4, 9, { noteLength: "eighth" }),
      n(5, 8, { noteLength: "eighth" }),
      n(6, 7, { noteLength: "eighth" }),
      n(6, 12, { noteLength: "eighth" }),
      n(6, 7, { noteLength: "eighth" }),
      n(5, 8, { noteLength: "eighth" }),
      n(4, 9, { noteLength: "eighth" }),
      n(4, 9, { noteLength: "eighth" }),
    ],
  }),
  exercise({
    id: "wide-string-skipping",
    title: "Wide String Skipping",
    description:
      "Skip two strings (E–G, A–B, D–high E) to lock in pick-hand targeting.",
    level: "advanced",
    bpm: 90,
    notes: [
      n(1, 5),
      n(1, 7),
      n(4, 5),
      n(4, 7),
      n(2, 5),
      n(2, 7),
      n(5, 5),
      n(5, 7),
      n(3, 5),
      n(3, 7),
      n(6, 5),
      n(6, 7),
    ],
  }),
];

export const scaleExercises: PracticeExercise[] = [
  exercise({
    id: "e-minor-pentatonic-open",
    title: "E Minor Pentatonic (Open)",
    description:
      "The first box most guitarists learn — open-position rock and blues vocabulary.",
    level: "beginner",
    bpm: 72,
    notesPerMeasure: 2,
    notes: scaleFromShape({
      id: "e-minor-pentatonic-open",
      shape: [
        [0, 3],
        [0, 2],
        [0, 2],
        [0, 2],
        [0, 3],
        [0, 3],
      ],
      pitchClasses: E_MINOR_PENT,
    }),
  }),
  exercise({
    id: "a-minor-pentatonic-position-1",
    title: "A Minor Pentatonic (Position 1)",
    description: "The classic 5th-fret box, ascending and descending.",
    level: "beginner",
    bpm: 80,
    notesPerMeasure: 2,
    notes: scaleFromShape({
      id: "a-minor-pentatonic-position-1",
      shape: AM_PENT_POS_1,
      pitchClasses: A_MINOR_PENT,
    }),
  }),
  exercise({
    id: "e-blues-open",
    title: "E Blues Scale (Open)",
    description:
      "E minor pentatonic plus the blue note (Bb) in the open position.",
    level: "beginner",
    bpm: 78,
    notesPerMeasure: 4,
    notes: scaleFromShape({
      id: "e-blues-open",
      shape: [
        [0, 3],
        [0, 1, 2],
        [0, 2],
        [0, 2, 3],
        [0, 3],
        [0, 3],
      ],
      pitchClasses: E_BLUES,
    }),
  }),
  exercise({
    id: "g-major-pentatonic-position-1",
    title: "G Major Pentatonic (Position 1)",
    description:
      "The major-pentatonic box with the root on the 3rd-fret low E.",
    level: "beginner",
    bpm: 80,
    notesPerMeasure: 2,
    notes: scaleFromShape({
      id: "g-major-pentatonic-position-1",
      shape: [
        [3, 5],
        [2, 5],
        [2, 5],
        [2, 4],
        [3, 5],
        [3, 5],
      ],
      pitchClasses: G_MAJOR_PENT,
    }),
  }),
  exercise({
    id: "g-major-open",
    title: "G Major (Open Position)",
    description:
      "Open-position G major — campfire key and the relative major of E minor.",
    level: "beginner",
    bpm: 72,
    notesPerMeasure: 3,
    notes: scaleFromShape({
      id: "g-major-open",
      shape: [
        [2, 3, 5],
        [2, 3, 5],
        [2, 4, 5],
        [2, 4, 5],
        [3, 5],
        [2, 3, 5],
      ],
      pitchClasses: G_MAJOR,
    }),
  }),
  exercise({
    id: "e-natural-minor",
    title: "E Natural Minor (Open Position)",
    description: "Open E Aeolian. Same notes as G major, starting on E.",
    level: "beginner",
    bpm: 72,
    notesPerMeasure: 3,
    notes: scaleFromShape({
      id: "e-natural-minor",
      shape: [
        [0, 2, 3],
        [0, 2, 3],
        [0, 2, 4],
        [0, 2, 4],
        [0, 1, 3],
        [0, 2, 3],
      ],
      pitchClasses: G_MAJOR,
    }),
  }),
  exercise({
    id: "c-major-open",
    title: "C Major (Open Position)",
    description:
      "The C major scale in open position, two octaves from the low E.",
    level: "beginner",
    bpm: 72,
    notesPerMeasure: 3,
    notes: scaleFromShape({
      id: "c-major-open",
      shape: [
        [0, 1, 3],
        [0, 2, 3],
        [0, 2, 3],
        [0, 2, 4],
        [1, 3],
        [0, 1, 3],
      ],
      pitchClasses: C_MAJOR,
    }),
  }),
  exercise({
    id: "a-minor-pentatonic-position-2",
    title: "A Minor Pentatonic (Position 2)",
    description:
      "The 7th/8th-fret box. Connects Position 1 toward the 12th fret.",
    level: "intermediate",
    bpm: 84,
    notesPerMeasure: 2,
    notes: scaleFromShape({
      id: "a-minor-pentatonic-position-2",
      shape: [
        [8, 10],
        [7, 10],
        [7, 10],
        [7, 9],
        [8, 10],
        [8, 10],
      ],
      pitchClasses: A_MINOR_PENT,
    }),
  }),
  exercise({
    id: "a-minor-pentatonic-position-3",
    title: "A Minor Pentatonic (Position 3)",
    description:
      "The 9th/10th-fret box — great for connecting licks across CAGED shapes.",
    level: "intermediate",
    bpm: 84,
    notesPerMeasure: 2,
    notes: scaleFromShape({
      id: "a-minor-pentatonic-position-3",
      shape: [
        [10, 12],
        [10, 12],
        [10, 12],
        [9, 12],
        [10, 13],
        [10, 12],
      ],
      pitchClasses: A_MINOR_PENT,
    }),
  }),
  exercise({
    id: "a-minor-pentatonic-position-4",
    title: "A Minor Pentatonic (Position 4)",
    description: "The 12th-fret box. Same pattern as Position 1, one octave up.",
    level: "intermediate",
    bpm: 84,
    notesPerMeasure: 2,
    notes: scaleFromShape({
      id: "a-minor-pentatonic-position-4",
      shape: [
        [12, 15],
        [12, 15],
        [12, 14],
        [12, 14],
        [13, 15],
        [12, 15],
      ],
      pitchClasses: A_MINOR_PENT,
    }),
  }),
  exercise({
    id: "a-minor-pentatonic-position-5",
    title: "A Minor Pentatonic (Position 5)",
    description:
      "The 3rd-fret box that wraps back into Position 1. Completes the five CAGED pentatonic shapes.",
    level: "intermediate",
    bpm: 84,
    notesPerMeasure: 2,
    notes: scaleFromShape({
      id: "a-minor-pentatonic-position-5",
      shape: [
        [3, 5],
        [3, 5],
        [2, 5],
        [2, 5],
        [3, 5],
        [3, 5],
      ],
      pitchClasses: A_MINOR_PENT,
    }),
  }),
  exercise({
    id: "a-blues-position-1",
    title: "A Blues Scale (Position 1)",
    description:
      "A minor pentatonic plus the b5 (Eb) in the home box — the essential blues/rock scale.",
    level: "intermediate",
    bpm: 82,
    notesPerMeasure: 4,
    notes: scaleFromShape({
      id: "a-blues-position-1",
      shape: [
        [5, 8],
        [5, 6, 7],
        [5, 7],
        [5, 7, 8],
        [5, 8],
        [5, 8],
      ],
      pitchClasses: A_BLUES,
    }),
  }),
  exercise({
    id: "a-natural-minor-5th",
    title: "A Natural Minor (5th Position)",
    description:
      "Full Aeolian around the pentatonic box. Add the 2nd and b6 to Position 1.",
    level: "intermediate",
    bpm: 84,
    notesPerMeasure: 3,
    notes: scaleFromShape({
      id: "a-natural-minor-5th",
      shape: [
        [5, 7, 8],
        [5, 7, 8],
        [5, 7, 9],
        [5, 7, 9],
        [6, 8, 10],
        [5, 7, 8],
      ],
      pitchClasses: C_MAJOR,
    }),
  }),
  exercise({
    id: "c-major-e-shape",
    title: "C Major (E-shape / 8th Fret)",
    description:
      "Moveable E-form major scale. Same fingering as open E, barred at the 8th fret.",
    level: "intermediate",
    bpm: 86,
    notesPerMeasure: 3,
    notes: scaleFromShape({
      id: "c-major-e-shape",
      shape: [
        [8, 10, 12],
        [8, 10, 12],
        [9, 10, 12],
        [9, 10, 12],
        [10, 12, 13],
        [10, 12, 13],
      ],
      pitchClasses: C_MAJOR,
    }),
  }),
  exercise({
    id: "g-major-3nps",
    title: "G Major (3 Notes Per String)",
    description:
      "Three-notes-per-string G major for legato, economy picking, and even timing.",
    level: "intermediate",
    bpm: 88,
    notesPerMeasure: 3,
    notes: scaleFromShape({
      id: "g-major-3nps",
      shape: [
        [3, 5, 7],
        [3, 5, 7],
        [4, 5, 7],
        [4, 5, 7],
        [5, 7, 8],
        [5, 7, 8],
      ],
      pitchClasses: G_MAJOR,
    }),
  }),
  exercise({
    id: "d-dorian-mode",
    title: "D Dorian Mode",
    description:
      "The Santana/funk minor sound — C major starting on D, 5th-position box.",
    level: "intermediate",
    bpm: 90,
    notesPerMeasure: 3,
    notes: scaleFromShape({
      id: "d-dorian-mode",
      shape: [
        [5, 7, 8],
        [5, 7, 8],
        [5, 7, 9],
        [4, 5, 7],
        [5, 6, 8],
        [5, 7, 8],
      ],
      pitchClasses: C_MAJOR,
    }),
  }),
  exercise({
    id: "a-mixolydian",
    title: "A Mixolydian (5th Position)",
    description: "Dominant / rock-and-roll scale over A7. Major with a b7.",
    level: "intermediate",
    bpm: 90,
    notesPerMeasure: 3,
    notes: scaleFromShape({
      id: "a-mixolydian",
      shape: [
        [5, 7, 9],
        [5, 7, 9],
        [5, 7, 9],
        [6, 7, 9],
        [7, 8, 10],
        [7, 9, 10],
      ],
      pitchClasses: D_MAJOR,
    }),
  }),
  exercise({
    id: "e-mixolydian-open",
    title: "E Mixolydian (Open Position)",
    description:
      "Open E7 vocabulary — the scale behind countless blues and southern-rock intros.",
    level: "intermediate",
    bpm: 84,
    notesPerMeasure: 3,
    notes: scaleFromShape({
      id: "e-mixolydian-open",
      shape: [
        [0, 2, 4],
        [0, 2, 4],
        [0, 2, 4],
        [1, 2, 4],
        [0, 2, 3],
        [0, 2, 4],
      ],
      pitchClasses: A_MAJOR,
    }),
  }),
  exercise({
    id: "a-harmonic-minor",
    title: "A Harmonic Minor",
    description:
      "Natural minor with a raised 7th (G#). Neoclassical, flamenco, and metal staple.",
    level: "advanced",
    bpm: 92,
    notesPerMeasure: 4,
    notes: scaleFromShape({
      id: "a-harmonic-minor",
      shape: [
        [5, 7, 8],
        [5, 7, 8],
        [6, 7],
        [4, 5, 7],
        [5, 6],
        [4, 5],
      ],
      pitchClasses: A_HARMONIC_MINOR,
    }),
  }),
  exercise({
    id: "e-phrygian-dominant",
    title: "E Phrygian Dominant",
    description:
      "5th mode of A harmonic minor. The Spanish/metal sound over E.",
    level: "advanced",
    bpm: 92,
    notesPerMeasure: 3,
    notes: scaleFromShape({
      id: "e-phrygian-dominant",
      shape: [
        [0, 1, 4],
        [0, 2, 3],
        [0, 2],
        [1, 2, 4],
        [1, 3, 5],
        [0, 1, 4],
      ],
      pitchClasses: A_HARMONIC_MINOR,
    }),
  }),
  exercise({
    id: "a-minor-pentatonic-in-3s",
    title: "A Minor Pentatonic Sequences (3s)",
    description:
      "Position 1 grouped in threes. The sequence players use to turn the box into lead lines.",
    level: "advanced",
    bpm: 88,
    notesPerMeasure: 3,
    notes: scaleSequences({
      id: "a-minor-pentatonic-in-3s",
      shape: AM_PENT_POS_1,
      pitchClasses: A_MINOR_PENT,
      groupSize: 3,
    }),
  }),
];
