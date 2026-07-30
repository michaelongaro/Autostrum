import type { AudioMetadata, PlaybackMetadata } from "~/stores/TabStore";
import type { LoopRangeNodeRole } from "~/components/Tab/Playback/PlaybackLoopRangeNode";

export type LoopRangeSelectionStep = "selectStart" | "selectEnd" | "complete";

function isNonSelectableLoopIndex(
  index: number,
  playbackMetadata: PlaybackMetadata[] | null,
): boolean {
  const type = playbackMetadata?.[index]?.type;
  return type === "ornamental" || type === "loopDelaySpacer";
}

/**
 * Snap a Range thumb index off measure lines / ornamental columns.
 * Prefers continuing in `moveDirection`, then searches the opposite way.
 */
export function snapLoopRangeIndexOffOrnamental({
  index,
  moveDirection,
  playbackMetadata,
  minIndex,
  maxIndex,
}: {
  index: number;
  moveDirection: -1 | 1;
  playbackMetadata: PlaybackMetadata[] | null;
  minIndex: number;
  maxIndex: number;
}): number | null {
  if (index < minIndex || index > maxIndex) return null;

  if (!isNonSelectableLoopIndex(index, playbackMetadata)) {
    return index;
  }

  for (const direction of [moveDirection, -moveDirection] as const) {
    let cursor = index + direction;
    while (cursor >= minIndex && cursor <= maxIndex) {
      if (!isNonSelectableLoopIndex(cursor, playbackMetadata)) {
        return cursor;
      }
      cursor += direction;
    }
  }

  return null;
}

/** Store/UI sentinel: endLoopIndex -1 means "through the last chord". */
export function getConcreteLoopEndIndex(
  endLoopIndex: number,
  fullTabMetadataLength: number,
): number {
  if (endLoopIndex === -1) {
    return Math.max(0, fullTabMetadataLength - 1);
  }
  return endLoopIndex;
}

/**
 * Concrete [start, end] for the two-thumb Range while editing.
 * Missing endpoints expand toward the tab bounds so the Range always has values.
 */
export function getConcreteDraftLoopRange(
  draftStartIndex: number | null,
  draftEndIndex: number | null,
  fullTabMetadataLength: number,
): [number, number] {
  const lastIndex = Math.max(0, fullTabMetadataLength - 1);

  if (draftStartIndex === null && draftEndIndex === null) {
    return [0, lastIndex];
  }
  if (draftStartIndex !== null && draftEndIndex === null) {
    return [draftStartIndex, lastIndex];
  }
  if (draftStartIndex === null && draftEndIndex !== null) {
    return [0, draftEndIndex];
  }

  return [draftStartIndex!, draftEndIndex!];
}

export function isDraftLoopRangeEmpty(
  draftStartIndex: number | null,
  draftEndIndex: number | null,
): boolean {
  return draftStartIndex === null && draftEndIndex === null;
}

export function isDraftLoopRangeComplete(
  draftStartIndex: number | null,
  draftEndIndex: number | null,
): boolean {
  return draftStartIndex !== null && draftEndIndex !== null;
}

export function isDraftLoopRangeUnchanged(
  draftStartIndex: number | null,
  draftEndIndex: number | null,
  audioMetadata: AudioMetadata,
): boolean {
  const storeIsFullRange =
    audioMetadata.startLoopIndex === 0 && audioMetadata.endLoopIndex === -1;

  if (isDraftLoopRangeEmpty(draftStartIndex, draftEndIndex)) {
    return storeIsFullRange;
  }

  if (!isDraftLoopRangeComplete(draftStartIndex, draftEndIndex)) {
    return false;
  }

  const concreteStoreEnd = getConcreteLoopEndIndex(
    audioMetadata.endLoopIndex,
    audioMetadata.fullTabMetadataLength,
  );

  return (
    draftStartIndex === audioMetadata.startLoopIndex &&
    draftEndIndex === concreteStoreEnd
  );
}

export function getLoopRangeSelectionStep(
  draftStartIndex: number | null,
  draftEndIndex: number | null,
): LoopRangeSelectionStep {
  if (draftStartIndex !== null && draftEndIndex !== null) return "complete";
  if (draftStartIndex !== null && draftEndIndex === null) return "selectEnd";
  // start null (end may or may not be set) → picking a start
  return "selectStart";
}

export function getLoopRangePrompt(
  selectionStep: LoopRangeSelectionStep,
): string | null {
  if (selectionStep === "selectStart") {
    return "Select a starting chord for the loop range";
  }
  if (selectionStep === "selectEnd") {
    return "Select an ending chord for the loop range";
  }
  return null;
}

/**
 * Chord is dimmed outside the in-progress / completed draft range.
 * - start only: dim before start
 * - end only: dim after end
 * - both: dim outside [start, end]
 */
export function isLoopRangeChordDimmed({
  index,
  draftStartIndex,
  draftEndIndex,
}: {
  index: number;
  draftStartIndex: number | null;
  draftEndIndex: number | null;
}): boolean {
  if (draftStartIndex === null && draftEndIndex === null) return false;

  if (draftStartIndex !== null && draftEndIndex === null) {
    return index < draftStartIndex;
  }

  if (draftStartIndex === null && draftEndIndex !== null) {
    return index > draftEndIndex;
  }

  return index < draftStartIndex! || index > draftEndIndex!;
}

export function getLoopRangeNodePresentation({
  index,
  isSelectableChord,
  draftStartIndex,
  draftEndIndex,
  fullTabMetadataLength,
}: {
  index: number;
  isSelectableChord: boolean;
  draftStartIndex: number | null;
  draftEndIndex: number | null;
  fullTabMetadataLength: number;
}): { role: LoopRangeNodeRole; opacity: number; disabled: boolean } {
  // Hide interactive nodes on artificially repeated strip copies.
  if (
    fullTabMetadataLength <= 1 ||
    index < 0 ||
    index >= fullTabMetadataLength
  ) {
    return { role: "none", opacity: 0, disabled: true };
  }

  const selectionStep = getLoopRangeSelectionStep(
    draftStartIndex,
    draftEndIndex,
  );

  // Completed range: endpoints labeled, interior is a connecting line.
  if (selectionStep === "complete") {
    if (index === draftStartIndex) {
      return { role: "start", opacity: 1, disabled: false };
    }
    if (index === draftEndIndex) {
      return { role: "end", opacity: 1, disabled: false };
    }
    if (
      draftStartIndex !== null &&
      draftEndIndex !== null &&
      index > draftStartIndex &&
      index < draftEndIndex
    ) {
      return { role: "middle", opacity: 1, disabled: true };
    }

    if (!isSelectableChord) {
      return { role: "none", opacity: 0, disabled: true };
    }

    // Keep opacity/disabled coupled: lowered opacity always means disabled.
    return {
      role: "plus",
      opacity: 0.25,
      disabled: true,
    };
  }

  // Interior connector lines only apply once both endpoints exist.
  if (!isSelectableChord) {
    return { role: "none", opacity: 0, disabled: true };
  }

  if (selectionStep === "selectEnd" && draftStartIndex !== null) {
    if (index === draftStartIndex) {
      return { role: "start", opacity: 1, disabled: false };
    }

    const isValidEnd =
      index > draftStartIndex && Math.abs(index - draftStartIndex) >= 1;

    return {
      role: "plus",
      opacity: isValidEnd ? 1 : 0.25,
      disabled: !isValidEnd,
    };
  }

  // selectStart — optionally with a fixed end already chosen
  if (draftEndIndex !== null && index === draftEndIndex) {
    return { role: "end", opacity: 1, disabled: false };
  }

  const isValidStart =
    draftEndIndex === null
      ? index < fullTabMetadataLength - 1
      : index < draftEndIndex && Math.abs(draftEndIndex - index) >= 1;

  return {
    role: "plus",
    opacity: isValidStart ? 1 : 0.25,
    disabled: !isValidStart,
  };
}
