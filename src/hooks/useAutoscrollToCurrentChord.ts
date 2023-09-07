import { useEffect } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
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
      const rect = currentElement.getBoundingClientRect();
      if (
        rect.top < 0 ||
        rect.bottom >
          (window.innerHeight || document.documentElement.clientHeight) // not sure if second part necessary
      ) {
        currentElement.scrollIntoView({
          behavior: "instant",
          block: "center",
          inline: "center",
        });
      }
    }
  }, [
    currentlyPlayingMetadata,
    currentChordIndex,
    autoscrollEnabled,
    audioMetadata,
  ]);
}

export default useAutoscrollToCurrentChord;
