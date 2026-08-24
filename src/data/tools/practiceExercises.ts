import type { FullNoteLengths, Section, TabNote } from "~/stores/TabStore";
import { createTabMeasureLine, createTabNote } from "~/utils/tabNoteHelpers";

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

export type PracticeStep = {
  stringIndex: GuitarString;
  fret: string;
  noteLength?: FullNoteLengths;
};

export type PracticeExercise = {
  id: string;
  title: string;
  description: string;
  level: PracticeLevel;
  bpm: number;
  tuning: string;
  notesPerMeasure?: number;
  steps: PracticeStep[];
};

type FretShape = readonly (readonly number[])[];

const STANDARD_TUNING = "e2 a2 d3 g3 b3 e4";
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
  noteLength?: FullNoteLengths,
): PracticeStep {
  return {
    stringIndex,
    fret: String(fret),
    ...(noteLength ? { noteLength } : {}),
  };
}

function reverseSteps(steps: PracticeStep[]): PracticeStep[] {
  return [...steps].reverse();
}

function upAndDown(steps: PracticeStep[]): PracticeStep[] {
  if (steps.length < 2) return steps;
  return [...steps, ...reverseSteps(steps).slice(1)];
}

function fromShape(
  shape: FretShape,
  noteLength?: FullNoteLengths,
): PracticeStep[] {
  const steps: PracticeStep[] = [];
  shape.forEach((frets, stringOffset) => {
    const stringIndex = (stringOffset + 1) as GuitarString;
    for (const fret of frets) {
      steps.push(n(stringIndex, fret, noteLength));
    }
  });
  return steps;
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
  const extra = [...actual].filter((pc) => !expected.has(pc)).sort((a, b) => a - b);
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
}): PracticeStep[] {
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
}): PracticeStep[] {
  assertShapePitchClasses(id, shape, pitchClasses);
  const notes = fromShape(shape);
  const up: PracticeStep[] = [];
  for (let i = 0; i <= notes.length - groupSize; i++) {
    up.push(...notes.slice(i, i + groupSize));
  }
  const down: PracticeStep[] = [];
  for (let i = notes.length - 1; i >= groupSize - 1; i--) {
    for (let j = 0; j < groupSize; j++) {
      const note = notes[i - j];
      if (note) down.push(note);
    }
  }
  return [...up, ...down];
}

function acrossStrings(
  frets: readonly number[],
  options?: {
    from?: GuitarString;
    to?: GuitarString;
    noteLength?: FullNoteLengths;
  },
): PracticeStep[] {
  const from = options?.from ?? 1;
  const to = options?.to ?? 6;
  const steps: PracticeStep[] = [];
  const direction = from <= to ? 1 : -1;
  for (
    let stringIndex = from;
    direction > 0 ? stringIndex <= to : stringIndex >= to;
    stringIndex = (stringIndex + direction) as GuitarString
  ) {
    for (const fret of frets) {
      steps.push(n(stringIndex, fret, options?.noteLength));
    }
  }
  return steps;
}

function fretRun(
  stringIndex: GuitarString,
  fromFret: number,
  toFret: number,
): PracticeStep[] {
  const steps: PracticeStep[] = [];
  const direction = fromFret <= toFret ? 1 : -1;
  for (
    let fret = fromFret;
    direction > 0 ? fret <= toFret : fret >= toFret;
    fret += direction
  ) {
    steps.push(n(stringIndex, fret));
  }
  return steps;
}

function classicSpiderCrawl(): PracticeStep[] {
  const up: PracticeStep[] = [];
  for (let stringIndex = 1; stringIndex <= 5; stringIndex++) {
    const a = stringIndex as GuitarString;
    const b = (stringIndex + 1) as GuitarString;
    up.push(n(a, 1), n(b, 2), n(a, 3), n(b, 4));
  }

  const down: PracticeStep[] = [];
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
): PracticeStep[] {
  const steps: PracticeStep[] = [];
  for (let start = firstStartFret; start <= lastStartFret; start++) {
    steps.push(
      n(stringIndex, start),
      n(stringIndex, start + 1),
      n(stringIndex, start + 2),
      n(stringIndex, start + 3),
    );
  }
  return steps;
}

function createSingleStringTabNote({
  stringIndex,
  fret,
  noteLength,
}: {
  stringIndex: GuitarString;
  fret: string;
  noteLength?: FullNoteLengths;
}): TabNote {
  return createTabNote({
    firstString: stringIndex === 1 ? fret : "",
    secondString: stringIndex === 2 ? fret : "",
    thirdString: stringIndex === 3 ? fret : "",
    fourthString: stringIndex === 4 ? fret : "",
    fifthString: stringIndex === 5 ? fret : "",
    sixthString: stringIndex === 6 ? fret : "",
    noteLength: noteLength ?? "quarter",
  });
}

function createTabDataForExercise({
  exercise,
  repetitions,
}: {
  exercise: PracticeExercise;
  repetitions: number;
}): Section[] {
  const notesPerMeasure = exercise.notesPerMeasure ?? 4;
  const sectionData = exercise.steps.flatMap((step, index) => {
    const isEndOfMeasure =
      (index + 1) % notesPerMeasure === 0 && index < exercise.steps.length - 1;

    return [
      createSingleStringTabNote(step),
      ...(isEndOfMeasure ? [createTabMeasureLine()] : []),
    ];
  });

  return [
    {
      id: crypto.randomUUID(),
      title: exercise.title,
      data: [
        {
          id: crypto.randomUUID(),
          type: "tab",
          bpm: exercise.bpm,
          baseNoteLength: "quarter",
          repetitions: Math.max(1, repetitions),
          data: sectionData,
        },
      ],
    },
  ];
}

export function buildPracticeExerciseTabData(
  exercise: PracticeExercise,
  options?: {
    repetitions?: number;
  },
) {
  return createTabDataForExercise({
    exercise,
    repetitions: options?.repetitions ?? 1,
  });
}

export function groupPracticeExercisesByLevel(exercises: PracticeExercise[]) {
  return PRACTICE_LEVELS.map((level) => ({
    level,
    label: PRACTICE_LEVEL_LABELS[level],
    items: exercises.filter((exercise) => exercise.level === level),
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

export const warmupExercises: PracticeExercise[] = [
  {
    id: "open-string-picking",
    title: "Open String Alternate Picking",
    description:
      "Pick across the open strings to settle your right hand before fretting.",
    level: "beginner",
    bpm: 60,
    tuning: STANDARD_TUNING,
    steps: upAndDown(acrossStrings([0])),
  },
  {
    id: "chromatic-ladder",
    title: "1-2-3-4 Chromatic Ladder",
    description:
      "One finger per fret on every string, ascending and descending.",
    level: "beginner",
    bpm: 72,
    tuning: STANDARD_TUNING,
    steps: upAndDown(acrossStrings([1, 2, 3, 4])),
  },
  {
    id: "chromatic-reverse",
    title: "4-3-2-1 Chromatic Reverse",
    description:
      "Start on the pinky and walk backwards — the weaker direction for most players.",
    level: "beginner",
    bpm: 72,
    tuning: STANDARD_TUNING,
    steps: upAndDown(acrossStrings([4, 3, 2, 1])),
  },
  {
    id: "one-string-chromatic",
    title: "Single-String Chromatic",
    description:
      "Walk 0–12 on the low E, then back down. Repeat the idea on every string.",
    level: "beginner",
    bpm: 70,
    tuning: STANDARD_TUNING,
    steps: upAndDown(fretRun(1, 0, 12)),
  },
  {
    id: "hammer-on-ladder",
    title: "Hammer-On Ladder",
    description:
      "Fret 5, then hammer 7 with the ring finger on each string.",
    level: "beginner",
    bpm: 70,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 4,
    steps: acrossStrings([5, 7], { noteLength: "eighth" }),
  },
  {
    id: "spider-crawl",
    title: "Classic Spider Crawl",
    description:
      "Stagger 1-2-3-4 across adjacent strings, then reverse the crawl.",
    level: "intermediate",
    bpm: 70,
    tuning: STANDARD_TUNING,
    steps: classicSpiderCrawl(),
  },
  {
    id: "spider-walk",
    title: "Offset Spider Walk",
    description:
      "Wider string jumps to challenge left-hand independence and accuracy.",
    level: "intermediate",
    bpm: 72,
    tuning: STANDARD_TUNING,
    steps: [
      { stringIndex: 1, fret: "1" },
      { stringIndex: 3, fret: "2" },
      { stringIndex: 2, fret: "3" },
      { stringIndex: 4, fret: "4" },
      { stringIndex: 3, fret: "1" },
      { stringIndex: 5, fret: "2" },
      { stringIndex: 4, fret: "3" },
      { stringIndex: 6, fret: "4" },
      { stringIndex: 2, fret: "1" },
      { stringIndex: 4, fret: "2" },
      { stringIndex: 3, fret: "3" },
      { stringIndex: 5, fret: "4" },
      { stringIndex: 4, fret: "1" },
      { stringIndex: 6, fret: "2" },
      { stringIndex: 5, fret: "3" },
      { stringIndex: 3, fret: "4" },
    ],
  },
  {
    id: "stretch-1245",
    title: "1-2-4-5 Stretch",
    description:
      "Index–middle–pinky with a one-fret gap. Keep the wrist relaxed.",
    level: "intermediate",
    bpm: 66,
    tuning: STANDARD_TUNING,
    steps: upAndDown(acrossStrings([1, 2, 4, 5])),
  },
  {
    id: "finger-permutation-1324",
    title: "1-3-2-4 Finger Independence",
    description:
      "The classic permutation: index, ring, middle, pinky on every string.",
    level: "intermediate",
    bpm: 76,
    tuning: STANDARD_TUNING,
    steps: upAndDown(acrossStrings([1, 3, 2, 4])),
  },
  {
    id: "pinky-strength",
    title: "Pinky Strength Builder",
    description:
      "Index and pinky only (5–8) so the fourth finger stops flying off the neck.",
    level: "intermediate",
    bpm: 80,
    tuning: STANDARD_TUNING,
    steps: upAndDown(acrossStrings([5, 8])),
  },
  {
    id: "pull-off-ladder",
    title: "Pull-Off Ladder",
    description:
      "Fret 7, then pull off to 5 on each string. Keep both notes even.",
    level: "intermediate",
    bpm: 70,
    tuning: STANDARD_TUNING,
    steps: acrossStrings([7, 5], { noteLength: "eighth" }),
  },
  {
    id: "position-shift-chromatic",
    title: "Shifting Chromatic Box",
    description:
      "Move the 1-2-3-4 box up the G string, one fret at a time.",
    level: "intermediate",
    bpm: 80,
    tuning: STANDARD_TUNING,
    steps: shiftingChromaticBox(4, 1, 9),
  },
  {
    id: "string-skipping-warmup",
    title: "String Skipping Workout",
    description:
      "Skip one string at a time with a 5–7 box to tighten picking accuracy.",
    level: "intermediate",
    bpm: 88,
    tuning: STANDARD_TUNING,
    steps: [
      { stringIndex: 1, fret: "5" },
      { stringIndex: 1, fret: "7" },
      { stringIndex: 3, fret: "5" },
      { stringIndex: 3, fret: "7" },
      { stringIndex: 2, fret: "5" },
      { stringIndex: 2, fret: "7" },
      { stringIndex: 4, fret: "5" },
      { stringIndex: 4, fret: "7" },
      { stringIndex: 3, fret: "5" },
      { stringIndex: 3, fret: "7" },
      { stringIndex: 5, fret: "5" },
      { stringIndex: 5, fret: "7" },
      { stringIndex: 4, fret: "5" },
      { stringIndex: 4, fret: "7" },
      { stringIndex: 6, fret: "5" },
      { stringIndex: 6, fret: "7" },
    ],
  },
  {
    id: "legato-trills",
    title: "Legato Trills",
    description:
      "Hammer-on/pull-off bursts on the D string, first 2nd–3rd then 2nd–4th fingers.",
    level: "advanced",
    bpm: 75,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 8,
    steps: [
      { stringIndex: 3, fret: "5", noteLength: "sixteenth" },
      { stringIndex: 3, fret: "7", noteLength: "sixteenth" },
      { stringIndex: 3, fret: "5", noteLength: "sixteenth" },
      { stringIndex: 3, fret: "7", noteLength: "sixteenth" },
      { stringIndex: 3, fret: "5", noteLength: "sixteenth" },
      { stringIndex: 3, fret: "7", noteLength: "sixteenth" },
      { stringIndex: 3, fret: "5", noteLength: "sixteenth" },
      { stringIndex: 3, fret: "7", noteLength: "sixteenth" },
      { stringIndex: 3, fret: "5", noteLength: "sixteenth" },
      { stringIndex: 3, fret: "8", noteLength: "sixteenth" },
      { stringIndex: 3, fret: "5", noteLength: "sixteenth" },
      { stringIndex: 3, fret: "8", noteLength: "sixteenth" },
      { stringIndex: 3, fret: "5", noteLength: "sixteenth" },
      { stringIndex: 3, fret: "8", noteLength: "sixteenth" },
      { stringIndex: 3, fret: "5", noteLength: "sixteenth" },
      { stringIndex: 3, fret: "8", noteLength: "sixteenth" },
    ],
  },
  {
    id: "three-nps-chromatic",
    title: "3-Note-Per-String Chromatic",
    description:
      "Three-finger chromatic rows for economy picking and even leftover motion.",
    level: "advanced",
    bpm: 88,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 3,
    steps: upAndDown(acrossStrings([5, 6, 7], { noteLength: "eighth" })),
  },
  {
    id: "sweep-picking-prep",
    title: "Sweep Picking Primer",
    description:
      "Em triad on the top three strings, rolling the right hand through adjacent strings.",
    level: "advanced",
    bpm: 96,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 4,
    steps: [
      { stringIndex: 4, fret: "9", noteLength: "eighth" },
      { stringIndex: 5, fret: "8", noteLength: "eighth" },
      { stringIndex: 6, fret: "7", noteLength: "eighth" },
      { stringIndex: 6, fret: "12", noteLength: "eighth" },
      { stringIndex: 6, fret: "7", noteLength: "eighth" },
      { stringIndex: 5, fret: "8", noteLength: "eighth" },
      { stringIndex: 4, fret: "9", noteLength: "eighth" },
      { stringIndex: 4, fret: "9", noteLength: "eighth" },
    ],
  },
  {
    id: "wide-string-skipping",
    title: "Wide String Skipping",
    description:
      "Skip two strings (E–G, A–B, D–high E) to lock in pick-hand targeting.",
    level: "advanced",
    bpm: 90,
    tuning: STANDARD_TUNING,
    steps: [
      { stringIndex: 1, fret: "5" },
      { stringIndex: 1, fret: "7" },
      { stringIndex: 4, fret: "5" },
      { stringIndex: 4, fret: "7" },
      { stringIndex: 2, fret: "5" },
      { stringIndex: 2, fret: "7" },
      { stringIndex: 5, fret: "5" },
      { stringIndex: 5, fret: "7" },
      { stringIndex: 3, fret: "5" },
      { stringIndex: 3, fret: "7" },
      { stringIndex: 6, fret: "5" },
      { stringIndex: 6, fret: "7" },
    ],
  },
];

export const scaleExercises: PracticeExercise[] = [
  {
    id: "e-minor-pentatonic-open",
    title: "E Minor Pentatonic (Open)",
    description:
      "The first box most guitarists learn — open-position rock and blues vocabulary.",
    level: "beginner",
    bpm: 72,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 2,
    steps: scaleFromShape({
      id: "e-minor-pentatonic-open",
      shape: [[0, 3], [0, 2], [0, 2], [0, 2], [0, 3], [0, 3]],
      pitchClasses: E_MINOR_PENT,
    }),
  },
  {
    id: "a-minor-pentatonic-position-1",
    title: "A Minor Pentatonic (Position 1)",
    description: "The classic 5th-fret box, ascending and descending.",
    level: "beginner",
    bpm: 80,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 2,
    steps: scaleFromShape({
      id: "a-minor-pentatonic-position-1",
      shape: AM_PENT_POS_1,
      pitchClasses: A_MINOR_PENT,
    }),
  },
  {
    id: "e-blues-open",
    title: "E Blues Scale (Open)",
    description:
      "E minor pentatonic plus the blue note (Bb) in the open position.",
    level: "beginner",
    bpm: 78,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 4,
    steps: scaleFromShape({
      id: "e-blues-open",
      shape: [[0, 3], [0, 1, 2], [0, 2], [0, 2, 3], [0, 3], [0, 3]],
      pitchClasses: E_BLUES,
    }),
  },
  {
    id: "g-major-pentatonic-position-1",
    title: "G Major Pentatonic (Position 1)",
    description:
      "The major-pentatonic box with the root on the 3rd-fret low E.",
    level: "beginner",
    bpm: 80,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 2,
    steps: scaleFromShape({
      id: "g-major-pentatonic-position-1",
      shape: [[3, 5], [2, 5], [2, 5], [2, 4], [3, 5], [3, 5]],
      pitchClasses: G_MAJOR_PENT,
    }),
  },
  {
    id: "g-major-open",
    title: "G Major (Open Position)",
    description:
      "Open-position G major — campfire key and the relative major of E minor.",
    level: "beginner",
    bpm: 72,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 3,
    steps: scaleFromShape({
      id: "g-major-open",
      shape: [[2, 3, 5], [2, 3, 5], [2, 4, 5], [2, 4, 5], [3, 5], [2, 3, 5]],
      pitchClasses: G_MAJOR,
    }),
  },
  {
    id: "e-natural-minor",
    title: "E Natural Minor (Open Position)",
    description:
      "Open E Aeolian. Same notes as G major, starting on E.",
    level: "beginner",
    bpm: 72,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 3,
    steps: scaleFromShape({
      id: "e-natural-minor",
      shape: [[0, 2, 3], [0, 2, 3], [0, 2, 4], [0, 2, 4], [0, 1, 3], [0, 2, 3]],
      pitchClasses: G_MAJOR,
    }),
  },
  {
    id: "c-major-open",
    title: "C Major (Open Position)",
    description:
      "The C major scale in open position, two octaves from the low E.",
    level: "beginner",
    bpm: 72,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 3,
    steps: scaleFromShape({
      id: "c-major-open",
      shape: [[0, 1, 3], [0, 2, 3], [0, 2, 3], [0, 2, 4], [1, 3], [0, 1, 3]],
      pitchClasses: C_MAJOR,
    }),
  },
  {
    id: "a-minor-pentatonic-position-2",
    title: "A Minor Pentatonic (Position 2)",
    description: "The 7th/8th-fret box. Connects Position 1 toward the 12th fret.",
    level: "intermediate",
    bpm: 84,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 2,
    steps: scaleFromShape({
      id: "a-minor-pentatonic-position-2",
      shape: [[8, 10], [7, 10], [7, 10], [7, 9], [8, 10], [8, 10]],
      pitchClasses: A_MINOR_PENT,
    }),
  },
  {
    id: "a-minor-pentatonic-position-3",
    title: "A Minor Pentatonic (Position 3)",
    description: "The 9th/10th-fret box — great for connecting licks across CAGED shapes.",
    level: "intermediate",
    bpm: 84,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 2,
    steps: scaleFromShape({
      id: "a-minor-pentatonic-position-3",
      shape: [[10, 12], [10, 12], [10, 12], [9, 12], [10, 13], [10, 12]],
      pitchClasses: A_MINOR_PENT,
    }),
  },
  {
    id: "a-minor-pentatonic-position-4",
    title: "A Minor Pentatonic (Position 4)",
    description: "The 12th-fret box. Same pattern as Position 1, one octave up.",
    level: "intermediate",
    bpm: 84,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 2,
    steps: scaleFromShape({
      id: "a-minor-pentatonic-position-4",
      shape: [[12, 15], [12, 15], [12, 14], [12, 14], [13, 15], [12, 15]],
      pitchClasses: A_MINOR_PENT,
    }),
  },
  {
    id: "a-minor-pentatonic-position-5",
    title: "A Minor Pentatonic (Position 5)",
    description:
      "The 3rd-fret box that wraps back into Position 1. Completes the five CAGED pentatonic shapes.",
    level: "intermediate",
    bpm: 84,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 2,
    steps: scaleFromShape({
      id: "a-minor-pentatonic-position-5",
      shape: [[3, 5], [3, 5], [2, 5], [2, 5], [3, 5], [3, 5]],
      pitchClasses: A_MINOR_PENT,
    }),
  },
  {
    id: "a-blues-position-1",
    title: "A Blues Scale (Position 1)",
    description:
      "A minor pentatonic plus the b5 (Eb) in the home box — the essential blues/rock scale.",
    level: "intermediate",
    bpm: 82,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 4,
    steps: scaleFromShape({
      id: "a-blues-position-1",
      shape: [[5, 8], [5, 6, 7], [5, 7], [5, 7, 8], [5, 8], [5, 8]],
      pitchClasses: A_BLUES,
    }),
  },
  {
    id: "a-natural-minor-5th",
    title: "A Natural Minor (5th Position)",
    description:
      "Full Aeolian around the pentatonic box. Add the 2nd and b6 to Position 1.",
    level: "intermediate",
    bpm: 84,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 3,
    steps: scaleFromShape({
      id: "a-natural-minor-5th",
      shape: [[5, 7, 8], [5, 7, 8], [5, 7, 9], [5, 7, 9], [6, 8, 9], [5, 7, 8]],
      pitchClasses: C_MAJOR,
    }),
  },
  {
    id: "c-major-e-shape",
    title: "C Major (E-shape / 8th Fret)",
    description:
      "Moveable E-form major scale. Same fingering as open E, barred at the 8th fret.",
    level: "intermediate",
    bpm: 86,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 3,
    steps: scaleFromShape({
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
  },
  {
    id: "g-major-3nps",
    title: "G Major (3 Notes Per String)",
    description:
      "Three-notes-per-string G major for legato, economy picking, and even timing.",
    level: "intermediate",
    bpm: 88,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 3,
    steps: scaleFromShape({
      id: "g-major-3nps",
      shape: [[3, 5, 7], [3, 5, 7], [4, 5, 7], [4, 5, 7], [5, 7, 8], [5, 7, 8]],
      pitchClasses: G_MAJOR,
    }),
  },
  {
    id: "d-dorian-mode",
    title: "D Dorian Mode",
    description:
      "The Santana/funk minor sound — C major starting on D, 5th-position box.",
    level: "intermediate",
    bpm: 90,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 3,
    steps: scaleFromShape({
      id: "d-dorian-mode",
      shape: [[5, 7, 8], [5, 7, 8], [5, 7, 9], [4, 5, 7], [5, 6, 8], [5, 7, 8]],
      pitchClasses: C_MAJOR,
    }),
  },
  {
    id: "a-mixolydian",
    title: "A Mixolydian (5th Position)",
    description:
      "Dominant / rock-and-roll scale over A7. Major with a b7.",
    level: "intermediate",
    bpm: 90,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 3,
    steps: scaleFromShape({
      id: "a-mixolydian",
      shape: [[5, 7, 9], [5, 7, 9], [5, 7, 9], [6, 7, 9], [7, 8, 10], [7, 9, 10]],
      pitchClasses: D_MAJOR,
    }),
  },
  {
    id: "e-mixolydian-open",
    title: "E Mixolydian (Open Position)",
    description:
      "Open E7 vocabulary — the scale behind countless blues and southern-rock intros.",
    level: "intermediate",
    bpm: 84,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 3,
    steps: scaleFromShape({
      id: "e-mixolydian-open",
      shape: [[0, 2, 4], [0, 2, 4], [0, 2, 4], [1, 2, 4], [0, 2, 3], [0, 2, 4]],
      pitchClasses: A_MAJOR,
    }),
  },
  {
    id: "a-harmonic-minor",
    title: "A Harmonic Minor",
    description:
      "Natural minor with a raised 7th (G#). Neoclassical, flamenco, and metal staple.",
    level: "advanced",
    bpm: 92,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 4,
    steps: scaleFromShape({
      id: "a-harmonic-minor",
      shape: [[5, 7, 8], [5, 7, 8], [6, 7], [4, 5, 7], [5, 6], [4, 5]],
      pitchClasses: A_HARMONIC_MINOR,
    }),
  },
  {
    id: "e-phrygian-dominant",
    title: "E Phrygian Dominant",
    description:
      "5th mode of A harmonic minor. The Spanish/metal sound over E.",
    level: "advanced",
    bpm: 92,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 3,
    steps: scaleFromShape({
      id: "e-phrygian-dominant",
      shape: [[0, 1, 4], [0, 2, 3], [0, 2], [1, 2, 4], [1, 3, 5], [0, 1, 4]],
      pitchClasses: A_HARMONIC_MINOR,
    }),
  },
  {
    id: "a-minor-pentatonic-in-3s",
    title: "A Minor Pentatonic Sequences (3s)",
    description:
      "Position 1 grouped in threes. The sequence players use to turn the box into lead lines.",
    level: "advanced",
    bpm: 88,
    tuning: STANDARD_TUNING,
    notesPerMeasure: 3,
    steps: scaleSequences({
      id: "a-minor-pentatonic-in-3s",
      shape: AM_PENT_POS_1,
      pitchClasses: A_MINOR_PENT,
      groupSize: 3,
    }),
  },
];
