import { useTabStore } from "~/stores/TabStore";

/**
 * Fine-grained playback highlight state for a single tab column.
 *
 * Returns primitives inside one shallow-compared object so Zustand only
 * re-renders the column(s) whose highlight state actually changed. Keeping
 * this out of TabSection avoids section-wide re-renders (and DndContext
 * invalidation) on every currentChordIndex tick during playback.
 *
 * Note coloring matches the playback modal (primary on frets for the current
 * and already-played chords). Unlike the modal, the current chord stays
 * highlighted while paused so it remains visible under the parked playhead.
 */
export function useColumnPlaybackHighlight(
  sectionIndex: number,
  subSectionIndex: number,
  columnIndex: number,
) {
  return useTabStore((state) => {
    const metadata = state.currentlyPlayingMetadata;
    const location = metadata?.[state.currentChordIndex]?.location;

    let columnIsBeingPlayed = false;
    let columnHasBeenPlayed = false;
    let durationOfChord = 0;

    if (metadata && location && !state.showPlaybackModal) {
      const isSameSection =
        location.sectionIndex === sectionIndex &&
        location.subSectionIndex === subSectionIndex;
      const isCurrentColumn =
        isSameSection && location.chordIndex === columnIndex;

      if (state.audioMetadata.editingLoopRange) {
        columnHasBeenPlayed = metadata.some(
          (entry) =>
            sectionIndex === entry.location.sectionIndex &&
            subSectionIndex === entry.location.subSectionIndex &&
            columnIndex === entry.location.chordIndex,
        );
      } else {
        // Prefer metadata-index comparison (same idea as PlaybackVisibleChords)
        // so past chords stay highlighted across sections and while paused.
        let isPast = false;
        let isCurrent = false;
        for (let index = 0; index < metadata.length; index++) {
          const entry = metadata[index];
          if (!entry) continue;
          if (
            entry.location.sectionIndex === sectionIndex &&
            entry.location.subSectionIndex === subSectionIndex &&
            entry.location.chordIndex === columnIndex
          ) {
            if (index === state.currentChordIndex) {
              isCurrent = true;
            } else if (index < state.currentChordIndex) {
              isPast = true;
            }
          }
        }

        // Keep the current chord highlighted while paused so notes stay
        // visible under the parked playhead (same idea as useStrumHighlight).
        columnIsBeingPlayed = isCurrent;
        columnHasBeenPlayed = isPast && !isCurrent;
      }

      if (isCurrentColumn) {
        const currentMeta = metadata[state.currentChordIndex];
        if (currentMeta) {
          durationOfChord =
            60 /
            ((currentMeta.bpm / Number(currentMeta.noteLengthMultiplier)) *
              state.playbackSpeed);
        }
      }
    }

    return {
      columnIsBeingPlayed,
      columnHasBeenPlayed,
      durationOfChord,
      isHighlighted: columnIsBeingPlayed || columnHasBeenPlayed,
    };
  });
}

/**
 * Measure lines aren't played; tie styling to the closest previous note column.
 */
export function useMeasureLineHasBeenPlayed(
  sectionIndex: number,
  subSectionIndex: number,
  measureLineColumnIndex: number,
) {
  const { columnHasBeenPlayed } = useColumnPlaybackHighlight(
    sectionIndex,
    subSectionIndex,
    measureLineColumnIndex - 1,
  );
  return columnHasBeenPlayed;
}
