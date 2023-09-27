import { useEffect } from "react";
import { shallow } from "zustand/shallow";
import { useTabStore } from "~/stores/TabStore";
interface UseAutoscrollToCurrentChord {
  autoscrollEnabled: boolean;
}

function useAutoscrollToCurrentChord({
  autoscrollEnabled,
}: UseAutoscrollToCurrentChord) {
  const { currentlyPlayingMetadata, currentChordIndex, audioMetadata } =
    useTabStore(
      (state) => ({
        currentlyPlayingMetadata: state.currentlyPlayingMetadata,
        currentChordIndex: state.currentChordIndex,
        audioMetadata: state.audioMetadata,
      }),
      shallow
    );

  useEffect(() => {
    if (
      !audioMetadata.playing ||
      !currentlyPlayingMetadata ||
      !autoscrollEnabled
    )
      return;

    const { sectionIndex, subSectionIndex, chordSequenceIndex, chordIndex } =
      currentlyPlayingMetadata[currentChordIndex]!.location;
    let currentElement = null;

    if (chordSequenceIndex !== undefined) {
      currentElement = document.getElementById(
        `section${sectionIndex}-subSection${subSectionIndex}-chordSequence${chordSequenceIndex}-chord${chordIndex}`
      );
    } else {
      currentElement = document.getElementById(
        `section${sectionIndex}-subSection${subSectionIndex}-chord${chordIndex}`
      );
    }

    if (currentElement) {
      currentElement.scrollIntoView({
        behavior: "instant",
        block: "center",
        inline: "center",
      });
    }
  }, [
    currentlyPlayingMetadata,
    currentChordIndex,
    autoscrollEnabled,
    audioMetadata,
  ]);
}

export default useAutoscrollToCurrentChord;
