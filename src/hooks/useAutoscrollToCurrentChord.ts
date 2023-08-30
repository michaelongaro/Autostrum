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

  // I am pretty sure that smooth scrolling just isn't an option due to the
  // nature of putting instant clarity on the current chord being played over "eye candy"

  // const debouncedScrollIntoView = useCallback(
  //   debounce(() => {
  //     const { sectionIndex, subSectionIndex, chordSequenceIndex, chordIndex } =
  //       currentlyPlayingMetadata![currentChordIndex]!.location;
  //     let currentElement = null;
  //     if (chordSequenceIndex !== undefined) {
  //       currentElement = document.getElementById(
  //         `section${sectionIndex}-subSection${subSectionIndex}-chordSequence${chordSequenceIndex}-chord${chordIndex}`
  //       );
  //     } else {
  //       currentElement = document.getElementById(
  //         `section${sectionIndex}-subSection${subSectionIndex}-chord${chordIndex}`
  //       );
  //     }

  //     if (currentElement) {
  //       const rect = currentElement.getBoundingClientRect();
  //       if (
  //         rect.top < 0 ||
  //         rect.bottom >
  //           (window.innerHeight || document.documentElement.clientHeight) // not sure if second part necessary
  //       ) {
  //         currentElement.scrollIntoView({
  //           behavior: "smooth",
  //           block: "center",
  //           inline: "center",
  //         });
  //       }
  //     }
  //   }, 250),
  //   [currentlyPlayingMetadata, currentChordIndex]
  // );

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
