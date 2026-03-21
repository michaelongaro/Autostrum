import type { FullNoteLengths, Section, TabNote } from "~/stores/TabStore";
import { createTabMeasureLine, createTabNote } from "~/utils/tabNoteHelpers";

export type PracticeExercise = {
  id: string;
  title: string;
  description: string;
  bpm: number;
  tuning: string;
  steps: {
    stringIndex: 1 | 2 | 3 | 4 | 5 | 6;
    fret: string;
    noteLength?: FullNoteLengths;
  }[];
};

function createSingleStringTabNote({
  stringIndex,
  fret,
  noteLength,
}: {
  stringIndex: 1 | 2 | 3 | 4 | 5 | 6;
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
  const sectionData = exercise.steps.flatMap((step, index) => {
    const isEndOfMeasure =
      (index + 1) % 4 === 0 && index < exercise.steps.length - 1;

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

export const warmupExercises: PracticeExercise[] = [
  {
    id: "chromatic-ladder",
    title: "1-2-3-4 Chromatic Ladder",
    description:
      "Cycle 1-2-3-4 on each string for finger independence and control.",
    bpm: 80,
    tuning: "e2 a2 d3 g3 b3 e4",
    steps: [
      { stringIndex: 1, fret: "1" },
      { stringIndex: 1, fret: "2" },
      { stringIndex: 1, fret: "3" },
      { stringIndex: 1, fret: "4" },
      { stringIndex: 2, fret: "1" },
      { stringIndex: 2, fret: "2" },
      { stringIndex: 2, fret: "3" },
      { stringIndex: 2, fret: "4" },
      { stringIndex: 3, fret: "1" },
      { stringIndex: 3, fret: "2" },
      { stringIndex: 3, fret: "3" },
      { stringIndex: 3, fret: "4" },
      { stringIndex: 4, fret: "1" },
      { stringIndex: 4, fret: "2" },
      { stringIndex: 4, fret: "3" },
      { stringIndex: 4, fret: "4" },
      { stringIndex: 5, fret: "1" },
      { stringIndex: 5, fret: "2" },
      { stringIndex: 5, fret: "3" },
      { stringIndex: 5, fret: "4" },
      { stringIndex: 6, fret: "1" },
      { stringIndex: 6, fret: "2" },
      { stringIndex: 6, fret: "3" },
      { stringIndex: 6, fret: "4" },
    ],
  },
  {
    id: "spider-walk",
    title: "Spider Walk",
    description: "Alternate string jumps to improve left-hand coordination.",
    bpm: 72,
    tuning: "e2 a2 d3 g3 b3 e4",
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
];

export const scaleExercises: PracticeExercise[] = [
  {
    id: "a-minor-pentatonic-position-1",
    title: "A Minor Pentatonic (Position 1)",
    description: "Classic box pattern ascending and descending.",
    bpm: 88,
    tuning: "e2 a2 d3 g3 b3 e4",
    steps: [
      { stringIndex: 1, fret: "5" },
      { stringIndex: 1, fret: "8" },
      { stringIndex: 2, fret: "5" },
      { stringIndex: 2, fret: "7" },
      { stringIndex: 3, fret: "5" },
      { stringIndex: 3, fret: "7" },
      { stringIndex: 4, fret: "5" },
      { stringIndex: 4, fret: "7" },
      { stringIndex: 5, fret: "5" },
      { stringIndex: 5, fret: "8" },
      { stringIndex: 6, fret: "5" },
      { stringIndex: 6, fret: "8" },
      { stringIndex: 6, fret: "5" },
      { stringIndex: 5, fret: "8" },
      { stringIndex: 5, fret: "5" },
      { stringIndex: 4, fret: "7" },
      { stringIndex: 4, fret: "5" },
      { stringIndex: 3, fret: "7" },
      { stringIndex: 3, fret: "5" },
      { stringIndex: 2, fret: "7" },
      { stringIndex: 2, fret: "5" },
      { stringIndex: 1, fret: "8" },
      { stringIndex: 1, fret: "5" },
    ],
  },
  {
    id: "g-major-3nps",
    title: "G Major (3 Notes Per String)",
    description:
      "Three-notes-per-string sequence for scale fluency and timing.",
    bpm: 92,
    tuning: "e2 a2 d3 g3 b3 e4",
    steps: [
      { stringIndex: 1, fret: "3" },
      { stringIndex: 1, fret: "5" },
      { stringIndex: 1, fret: "7" },
      { stringIndex: 2, fret: "3" },
      { stringIndex: 2, fret: "5" },
      { stringIndex: 2, fret: "7" },
      { stringIndex: 3, fret: "4" },
      { stringIndex: 3, fret: "5" },
      { stringIndex: 3, fret: "7" },
      { stringIndex: 4, fret: "4" },
      { stringIndex: 4, fret: "5" },
      { stringIndex: 4, fret: "7" },
      { stringIndex: 5, fret: "5" },
      { stringIndex: 5, fret: "7" },
      { stringIndex: 5, fret: "8" },
      { stringIndex: 6, fret: "5" },
      { stringIndex: 6, fret: "7" },
      { stringIndex: 6, fret: "8" },
    ],
  },
];
