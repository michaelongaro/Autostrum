import type { Chord } from "~/stores/TabStore";

/**
 * Chord color palette - 9 distinct colors for chord visualization
 * These are separate from theme colors and designed to be distinguishable
 */
export const CHORD_COLORS = [
  "#E53935", // red
  "#FB8C00", // orange
  "#FDD835", // yellow
  "#43A047", // green
  "#00ACC1", // teal
  "#1E88E5", // blue
  "#8E24AA", // purple
  "#D81B60", // pink
  "#757575", // gray
] as const;

export type ChordColor = (typeof CHORD_COLORS)[number];

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
  // Use white text for dark backgrounds, dark gray for light backgrounds
  return luminance > 0.4 ? "#374151" : "#FFFFFF";
}
