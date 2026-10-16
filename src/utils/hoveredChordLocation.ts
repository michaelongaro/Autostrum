import type { HoveredChordLocation } from "~/stores/TabStore";

/**
 * Hovered chord for spacebar-to-play. Kept off the Zustand store on purpose:
 * writing it there notifies every column subscriber, which is O(mounted
 * columns) on every mouse enter — painful when a whole song is one section.
 */
let hoveredChordLocation: HoveredChordLocation | null = null;

export function setHoveredChordLocationValue(
  location: HoveredChordLocation | null,
) {
  hoveredChordLocation = location;
}

export function getHoveredChordLocationValue(): HoveredChordLocation | null {
  return hoveredChordLocation;
}
