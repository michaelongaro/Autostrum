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

/**
 * Map a playback `currentChordIndex` (relative to the committed loop strip,
 * which may include artificial viewport duplicates + loop-delay spacers) onto
 * the corresponding full-tab metadata index for loop-range editing.
 *
 * Cycle length is `(concreteEnd - start + 1) + loopDelay` — one baseline copy
 * before artificial duplication. Indices that land on delay spacers clamp to
 * the last real chord in the loop so the editor stays on tab content.
 */
export function mapLoopRelativeChordIndexToFullTabIndex({
  currentChordIndex,
  startLoopIndex,
  endLoopIndex,
  fullTabMetadataLength,
  loopDelay,
}: {
  currentChordIndex: number;
  startLoopIndex: number;
  endLoopIndex: number;
  fullTabMetadataLength: number;
  loopDelay: number;
}): number {
  const concreteEnd = getConcreteLoopEndIndex(
    endLoopIndex,
    fullTabMetadataLength,
  );
  const loopRangeLength = Math.max(1, concreteEnd - startLoopIndex + 1);
  const cycleLength = loopRangeLength + Math.max(0, loopDelay);

  const relativeInCycle =
    ((currentChordIndex % cycleLength) + cycleLength) % cycleLength;
  const relativeInRange = Math.min(relativeInCycle, loopRangeLength - 1);
  const result = startLoopIndex + relativeInRange;

  // #region agent log
  if (typeof window !== "undefined") {
    try {
      // Lazy import avoided: keep sync + tiny. Mirror via fetch for NDJSON sink.
      const payload = {
        hypothesisId: "A",
        location: "loopRangeHelpers.ts:mapLoopRelativeChordIndexToFullTabIndex",
        message: "mapping computation",
        data: {
          currentChordIndex,
          startLoopIndex,
          endLoopIndex,
          fullTabMetadataLength,
          loopDelay,
          concreteEnd,
          loopRangeLength,
          cycleLength,
          relativeInCycle,
          relativeInRange,
          result,
        },
        timestamp: Date.now(),
      };
      console.log("[agent-debug]", payload);
      void fetch("/api/agent-debug-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      /* ignore */
    }
  }
  // #endregion

  return result;
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
