import { useTabStore } from "~/stores/TabStore";

type UseStrumHighlightArgs = {
  strumIndex: number;
  /** When true, highlight follows previewMetadata (pattern editor / pattern list). */
  forPreview: boolean;
  /** Index into strummingPatterns; required for preview highlighting. */
  patternIndex?: number;
  sectionIndex?: number;
  subSectionIndex?: number;
  chordSequenceIndex?: number;
};

/**
 * Fine-grained highlight boolean for a single strum.
 *
 * Returns a stable primitive so Zustand only re-renders the strum(s) whose
 * highlight actually flipped. Keeps StrummingPattern from subscribing to
 * currentChordIndex / previewMetadata.currentChordIndex on every tick.
 */
export function useStrumHighlight({
  strumIndex,
  forPreview,
  patternIndex,
  sectionIndex,
  subSectionIndex,
  chordSequenceIndex,
}: UseStrumHighlightArgs): boolean {
  return useTabStore((state) => {
    if (forPreview) {
      return (
        state.previewMetadata.type === "strummingPattern" &&
        state.previewMetadata.indexOfPattern === patternIndex &&
        state.previewMetadata.currentChordIndex >= strumIndex
      );
    }

    const currentlyPlayingMetadata = state.currentlyPlayingMetadata;
    if (!currentlyPlayingMetadata) return false;

    if (state.audioMetadata.editingLoopRange) {
      return currentlyPlayingMetadata.some((metadata) => {
        return (
          sectionIndex === metadata.location.sectionIndex &&
          subSectionIndex === metadata.location.subSectionIndex &&
          chordSequenceIndex === metadata.location.chordSequenceIndex &&
          strumIndex === metadata.location.chordIndex
        );
      });
    }

    const correspondingChordExists = currentlyPlayingMetadata.some(
      (metadata) => {
        return (
          sectionIndex === metadata.location.sectionIndex &&
          subSectionIndex === metadata.location.subSectionIndex &&
          chordSequenceIndex === metadata.location.chordSequenceIndex &&
          strumIndex === metadata.location.chordIndex
        );
      },
    );

    if (!correspondingChordExists) return false;

    const location =
      currentlyPlayingMetadata[state.currentChordIndex]?.location;
    if (!location) return false;

    if (
      location.sectionIndex !== sectionIndex ||
      location.subSectionIndex !== subSectionIndex ||
      location.chordSequenceIndex !== chordSequenceIndex ||
      (location.chordIndex ?? -1) < strumIndex
    ) {
      return false;
    }

    return true;
  });
}
