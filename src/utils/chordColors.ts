import type { Chord } from "~/stores/TabStore";

/**
 * Chord color palette -
 * Uses 9 theme colors tied to major chords + a lighter version of
 * each theme color for minor chords (lvl 7 dark variants, 8 for quartz and crimson)
 */
export const CHORD_COLORS = [
  "#E93D82", // peony / crimson
  "#EAACC3", // lighter peony / dark crimson
  "#CA244D", // quartz / ruby
  "#E592A3", // lighter quartz / dark ruby
  "#CE2C31", // crimson / red
  "#EB8E90", // lighter crimson / dark red
  "#E54D2E", // saffron / tomato
  "#F5A898", // lighter saffron / dark tomato
  "#46A758", // pistachio / grass
  "#94CE9A", // lighter pistachio / dark grass
  "#12A594", // verdant / teal
  "#83CDC1", // lighter verdant / dark teal
  "#00A2C7", // aqua / cyan
  "#7DCEDC", // lighter aqua / dark cyan
  "#3E63DD", // sapphire / indigo
  "#ABBDF9", // lighter sapphire / dark indigo
  "#8E4EC6", // amethyst / purple
  "#D1AFEC", // lighter amethyst / dark purple
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

/**
 * Calculate relative luminance of a hex color
 * Based on WCAG 2.0 formula
 */
function getLuminance(hexColor: string): number {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Get contrasting text color (white or dark gray) based on background luminance
 */
export function getContrastTextColor(hexColor: string): string {
  const luminance = getLuminance(hexColor);
  // Use white text for dark backgrounds, black for light backgrounds
  return luminance > 0.4 ? "#000000" : "#FFFFFF";
}
