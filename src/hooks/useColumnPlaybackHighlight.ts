import { useTabStore } from "~/stores/TabStore";

/**
 * Fine-grained playback highlight state for a single tab column.
 *
 * Returns primitives inside one shallow-compared object so Zustand only
 * re-renders the column(s) whose highlight state actually changed. Keeping
 * this out of TabSection avoids section-wide re-renders (and DndContext
 * invalidation) on every currentChordIndex tick during playback.
 */
export function useColumnPlaybackHighlight(
  sectionIndex: number,
  subSectionIndex: number,
  columnIndex: number,
) {
  return useTabStore((state) => {
    const metadata = state.currentlyPlayingMetadata?.[state.currentChordIndex];
    const location = metadata?.location;

    let columnIsBeingPlayed = false;
    let columnHasBeenPlayed = false;
    let durationOfChord = 0;

    if (state.currentlyPlayingMetadata && location) {
      const isSameSection =
        location.sectionIndex === sectionIndex &&
        location.subSectionIndex === subSectionIndex;
      const isCurrentColumn =
        isSameSection && location.chordIndex === columnIndex;

      columnIsBeingPlayed =
        isCurrentColumn &&
        state.audioMetadata.playing &&
        !state.audioMetadata.editingLoopRange;

      if (state.audioMetadata.editingLoopRange) {
        columnHasBeenPlayed = state.currentlyPlayingMetadata.some(
          (entry) =>
            sectionIndex === entry.location.sectionIndex &&
            subSectionIndex === entry.location.subSectionIndex &&
            columnIndex === entry.location.chordIndex,
        );
      } else {
        const correspondingChordExists = state.currentlyPlayingMetadata.some(
          (entry) =>
            sectionIndex === entry.location.sectionIndex &&
            subSectionIndex === entry.location.subSectionIndex &&
            columnIndex === entry.location.chordIndex,
        );

        if (correspondingChordExists) {
          const subSection = state.tabData[sectionIndex]?.data[subSectionIndex];
          const subSectionLength =
            subSection?.type === "tab" ? subSection.data.length : 0;

          columnHasBeenPlayed =
            isSameSection &&
            (location.chordIndex > columnIndex ||
              (location.chordIndex === columnIndex &&
                location.chordIndex === subSectionLength));
        }
      }

      if (isCurrentColumn) {
        durationOfChord =
          60 /
          ((metadata.bpm / Number(metadata.noteLengthMultiplier)) *
            state.playbackSpeed);
      }
    }

    return { columnIsBeingPlayed, columnHasBeenPlayed, durationOfChord };
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
