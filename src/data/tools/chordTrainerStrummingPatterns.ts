export type ChordTrainerStrum = {
  /** Compiled chord-effect string: `v`, `^`, `v>`, `^>`, or empty for a spacer. */
  effect: string;
};

export type ChordTrainerStrummingPattern = {
  id: string;
  label: string;
  /** Original shorthand notation, or `null` for the one-strum-per-chord option. */
  notation: string | null;
  /** When false, the visualizer hides strum icons (the "None" option). */
  showIcons: boolean;
  strums: ChordTrainerStrum[];
};

/**
 * Parse trainer shorthand into equal-duration slots.
 *
 * - `D` / `U` → downstrum / upstrum
 * - `>` immediately after `D` or `U` → accent
 * - a space → empty spacer
 */
export function parseChordTrainerStrummingNotation(
  notation: string,
): ChordTrainerStrum[] {
  const strums: ChordTrainerStrum[] = [];

  for (let index = 0; index < notation.length; index++) {
    const char = notation[index];

    if (char === "D" || char === "U") {
      const accented = notation[index + 1] === ">";
      if (accented) {
        index += 1;
      }

      strums.push({
        effect: `${char === "D" ? "v" : "^"}${accented ? ">" : ""}`,
      });
      continue;
    }

    if (char === " ") {
      strums.push({ effect: "" });
    }
  }

  return strums;
}

function createPattern(
  notation: string,
): ChordTrainerStrummingPattern {
  return {
    id: notation,
    label: notation,
    notation,
    showIcons: true,
    strums: parseChordTrainerStrummingNotation(notation),
  };
}

export const NONE_CHORD_TRAINER_STRUMMING_PATTERN: ChordTrainerStrummingPattern =
  {
    id: "none",
    label: "None",
    notation: null,
    showIcons: false,
    strums: [{ effect: "v" }],
  };

export const CHORD_TRAINER_STRUMMING_PATTERN_NOTATIONS = [
  "DDDD",
  "D DU UDU",
  "D> D  UDU",
  "D>DDD>DD",
  "D DUDU",
] as const;

export const CHORD_TRAINER_STRUMMING_PATTERNS: ChordTrainerStrummingPattern[] = [
  NONE_CHORD_TRAINER_STRUMMING_PATTERN,
  ...CHORD_TRAINER_STRUMMING_PATTERN_NOTATIONS.map(createPattern),
];

export function getChordTrainerStrummingPattern(
  patternId: string,
): ChordTrainerStrummingPattern {
  return (
    CHORD_TRAINER_STRUMMING_PATTERNS.find((pattern) => pattern.id === patternId) ??
    NONE_CHORD_TRAINER_STRUMMING_PATTERN
  );
}
