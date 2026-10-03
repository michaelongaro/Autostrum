import { useTabStore } from "~/stores/TabStore";
import { playbackMetadataHasColumn } from "~/utils/playbackColumnIndex";

const IDLE_HIGHLIGHT = {
  columnIsBeingPlayed: false,
  columnHasBeenPlayed: false,
  durationOfChord: 0,
  isHighlighted: false,
};

/**
 * Fine-grained playback highlight state for a single tab column.
 *
 * Returns primitives inside one shallow-compared object so Zustand only
 * re-renders the column(s) whose highlight state actually changed. Keeping
 * this out of TabSection avoids section-wide re-renders (and DndContext
 * invalidation) on every currentChordIndex tick during playback.
 *
 * While audio is stopped this returns a stable object and does no metadata
 * scan. While playing, "is this column in the compiled tab?" is a cached
 * set lookup — not a linear search per column. Both used to be O(metadata)
 * per mounted column per store update, which is quadratic when every note
 * lives in one section.
 */
export function useColumnPlaybackHighlight(
  sectionIndex: number,
  subSectionIndex: number,
  columnIndex: number,
) {
  return useTabStore((state) => {
    if (
      !state.audioMetadata.playing ||
      state.audioMetadata.editingLoopRange ||
      !state.currentlyPlayingMetadata
    ) {
      return IDLE_HIGHLIGHT;
    }

    const metadata = state.currentlyPlayingMetadata;
    const current = metadata[state.currentChordIndex];
    const location = current?.location;
    if (!location) return IDLE_HIGHLIGHT;

    if (
      location.sectionIndex !== sectionIndex ||
      location.subSectionIndex !== subSectionIndex ||
      location.chordIndex < columnIndex
    ) {
      return IDLE_HIGHLIGHT;
    }

    if (
      !playbackMetadataHasColumn(metadata, {
        sectionIndex,
        subSectionIndex,
        chordIndex: columnIndex,
      })
    ) {
      return IDLE_HIGHLIGHT;
    }

    const columnIsBeingPlayed = location.chordIndex === columnIndex;
    const columnHasBeenPlayed = location.chordIndex > columnIndex;
    const isHighlighted = columnIsBeingPlayed || columnHasBeenPlayed;
    if (!isHighlighted) return IDLE_HIGHLIGHT;

    let durationOfChord = 0;
    if (columnIsBeingPlayed) {
      durationOfChord =
        60 /
        ((current.bpm / Number(current.noteLengthMultiplier)) *
          state.playbackSpeed);
    }

    return {
      columnIsBeingPlayed,
      columnHasBeenPlayed,
      durationOfChord,
      isHighlighted,
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
