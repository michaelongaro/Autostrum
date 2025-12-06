import type { Chord } from "~/stores/TabStore";

/**
 * Chord color palette -
 * Uses 9 theme colors tied to major chords + a lighter version of
 * each theme color for minor chords (lvl 8 pastel variants, 7 for pistachio, verdant, aqua)
 */
export const CHORD_COLORS = [
  "#E93D82", // peony / crimson
  "#E093B2", // lighter peony / pastel crimson
  "#CA244D", // quartz / ruby
  "#E592A3", // lighter quartz / pastel ruby
  "#E54D2E", // saffron / tomato
  "#EC8E7B", // lighter saffron / pastel tomato
  "#A18072", // maple / bronze
  "#C2A499", // lighter maple / pastel bronze
  "#46A758", // pistachio / grass
  "#94CE9A", // lighter pistachio / pastel grass
  "#12A594", // verdant / teal
  "#83CDC1", // lighter verdant / pastel teal
  "#00A2C7", // aqua / cyan
  "#7DCEDC", // lighter aqua / pastel cyan
  "#3E63DD", // sapphire / indigo
  "#8DA4EF", // lighter sapphire / pastel indigo
  "#8E4EC6", // amethyst / purple
  "#BE93E4", // lighter amethyst / pastel purple
] as const;

export type ChordColor = (typeof CHORD_COLORS)[number];

/**
 * Mapping of chord root notes to color pair indices.
 * Each root note maps to a pair index (0-8), where:
 * - Even index (pairIndex * 2) = major chord color
 * - Odd index (pairIndex * 2 + 1) = minor chord color
 */
const CHORD_ROOT_TO_COLOR_INDEX: Record<string, number> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
  // Sharps/flats map to remaining colors
  "C#": 7,
  Db: 7,
  "D#": 8,
  Eb: 8,
  "F#": 0,
  Gb: 0,
  "G#": 1,
  Ab: 1,
  "A#": 2,
  Bb: 2,
};

/**
 * Get auto-assigned color for a chord name based on root note and quality.
 * Returns the appropriate major or minor variant color.
 * Returns null if chord name doesn't match a known pattern.
 */
export function getColorForChordName(chordName: string): string | null {
  if (!chordName) return null;

  // Extract root note (handles sharps/flats)
  const match = chordName.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;

  const root = match[1];
  const quality = match[2] ?? "";
  if (!root) return null;

  const pairIndex = CHORD_ROOT_TO_COLOR_INDEX[root];
  if (pairIndex === undefined) return null;

  // Check if it's a minor chord (m, min, minor, but not maj)
  const isMinor =
    quality.startsWith("m") &&
    !quality.startsWith("maj") &&
    !quality.startsWith("major");

  // Major = even index, Minor = odd index
  const colorIndex = pairIndex * 2 + (isMinor ? 1 : 0);
  return CHORD_COLORS[colorIndex] ?? null;
}

/**
 * Get the next chord color based on existing chords count.
 * Cycles through the palette.
 */
export function getNextChordColor(existingChords: Chord[]): string {
  const index = existingChords.length % CHORD_COLORS.length;
  return CHORD_COLORS[index]!;
}

const colorsThatNeedLightText = [
  "#E93D82", // peony / crimson
  "#CA244D", // quartz / ruby
  "#CE2C31", // maple / bronze
  "#E54D2E", // saffron / tomato
  "#46A758", // pistachio / grass
  "#12A594", // verdant / teal
  "#00A2C7", // aqua / cyan
  "#3E63DD", // sapphire / indigo
  "#8E4EC6", // amethyst / purple
];

export function getContrastTextColor(hexColor: string): string {
  return colorsThatNeedLightText.includes(hexColor) ? "#FFFFFF" : "#000000";
}
