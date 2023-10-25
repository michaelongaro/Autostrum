import { useEffect } from "react";
import { shallow } from "zustand/shallow";
import { useTabStore } from "~/stores/TabStore";
interface UseAutoscrollToCurrentChord {
  autoscrollEnabled: boolean;
}

function useAutoscrollToCurrentChord({
  autoscrollEnabled,
}: UseAutoscrollToCurrentChord) {
  const {
    currentlyPlayingMetadata,
    currentChordIndex,
    audioMetadata,
    setIsProgramaticallyScrolling,
  } = useTabStore(
    (state) => ({
      currentlyPlayingMetadata: state.currentlyPlayingMetadata,
      currentChordIndex: state.currentChordIndex,
      audioMetadata: state.audioMetadata,
      setIsProgramaticallyScrolling: state.setIsProgramaticallyScrolling,
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

    setIsProgramaticallyScrolling(true);

    const { sectionIndex, subSectionIndex, chordSequenceIndex, chordIndex } =
      currentlyPlayingMetadata[currentChordIndex]!.location;
    let currentElement = null;

    if (chordSequenceIndex !== undefined) {
      currentElement = document.getElementById(
        `section${sectionIndex}-subSection${subSectionIndex}-chordSequence${chordSequenceIndex}-chord${chordIndex}`
      );
    } else {
      currentElement = document.getElementById(
        `tabPreview-section${sectionIndex}-subSection${subSectionIndex}-chord${chordIndex}`
      );

      if (!currentElement) {
        currentElement = document.getElementById(
          `section${sectionIndex}-subSection${subSectionIndex}-chord${chordIndex}`
        );
      }
    }

    if (currentElement) {
      currentElement.scrollIntoView({
        behavior: "instant",
        block: "center",
        inline: "center",
      });

      setTimeout(() => {
        setIsProgramaticallyScrolling(false);
      }, 50);
    }
  }, [
    currentlyPlayingMetadata,
    currentChordIndex,
    autoscrollEnabled,
    audioMetadata,
    setIsProgramaticallyScrolling,
  ]);
}

export default useAutoscrollToCurrentChord;
