import type { AudioMetadata } from "~/stores/TabStore";
import type { LoopRangeNodeRole } from "~/components/Tab/Playback/PlaybackLoopRangeNode";

export type LoopRangeSelectionStep = "selectStart" | "selectEnd" | "complete";

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

export function isFullLoopRange(
  loopRange: [number, number],
  fullTabMetadataLength: number,
): boolean {
  return (
    loopRange[0] === 0 &&
    loopRange[1] === Math.max(0, fullTabMetadataLength - 1)
  );
}

export function isDraftLoopRangeUnchanged(
  loopRange: [number, number],
  audioMetadata: AudioMetadata,
): boolean {
  const concreteStoreEnd = getConcreteLoopEndIndex(
    audioMetadata.endLoopIndex,
    audioMetadata.fullTabMetadataLength,
  );

  return (
    loopRange[0] === audioMetadata.startLoopIndex &&
    loopRange[1] === concreteStoreEnd
  );
}

export function getLoopRangeSelectionStep({
  loopRange,
  pendingStartIndex,
  fullTabMetadataLength,
}: {
  loopRange: [number, number];
  pendingStartIndex: number | null;
  fullTabMetadataLength: number;
}): LoopRangeSelectionStep {
  if (pendingStartIndex !== null) return "selectEnd";
  if (isFullLoopRange(loopRange, fullTabMetadataLength)) return "selectStart";
  return "complete";
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
 * While awaiting an end after a start pick, only chords before the start dim.
 */
export function isLoopRangeChordDimmed({
  index,
  loopRange,
  pendingStartIndex,
  selectionStep,
}: {
  index: number;
  loopRange: [number, number];
  pendingStartIndex: number | null;
  selectionStep: LoopRangeSelectionStep;
}): boolean {
  if (selectionStep === "selectStart") return false;

  if (selectionStep === "selectEnd" && pendingStartIndex !== null) {
    return index < pendingStartIndex;
  }

  return index < loopRange[0] || index > loopRange[1];
}

export function getLoopRangeNodePresentation({
  index,
  isSelectableChord,
  loopRange,
  pendingStartIndex,
  selectionStep,
}: {
  index: number;
  isSelectableChord: boolean;
  loopRange: [number, number];
  pendingStartIndex: number | null;
  selectionStep: LoopRangeSelectionStep;
}): { role: LoopRangeNodeRole; opacity: number; disabled: boolean } {
  if (!isSelectableChord) {
    return { role: "none", opacity: 0, disabled: true };
  }

  if (selectionStep === "selectStart") {
    return { role: "plus", opacity: 1, disabled: false };
  }

  if (selectionStep === "selectEnd" && pendingStartIndex !== null) {
    if (index === pendingStartIndex) {
      return { role: "start", opacity: 1, disabled: false };
    }

    // Mirror palm-mute validity: only allow ends after the pending start, and
    // keep the existing min span of 2 indices used by the granular editor.
    const isValidEnd =
      index > pendingStartIndex &&
      Math.abs(index - pendingStartIndex) >= 2;

    return {
      role: "plus",
      opacity: isValidEnd ? 1 : 0.25,
      disabled: !isValidEnd,
    };
  }

  // Complete range: label endpoints, offer + elsewhere to start a new range.
  if (index === loopRange[0]) {
    return { role: "start", opacity: 1, disabled: false };
  }
  if (index === loopRange[1]) {
    return { role: "end", opacity: 1, disabled: false };
  }

  return { role: "plus", opacity: 1, disabled: false };
}
