import { useState, useEffect } from "react";
import { shallow } from "zustand/shallow";
import { useTabStore } from "~/stores/TabStore";
interface UseAutoscrollToCurrentChord {
  autoscrollEnabled: boolean;
}

function useAutoscrollToCurrentChord({
  autoscrollEnabled,
}: UseAutoscrollToCurrentChord) {
  // not my favorite hack: but is used to avoid scrolling when
  // the current chord is still visible but there is small difference
  // in height (<50px) between the current chord and the previous chord
  // to avoid jarring scrolling effects.
  const [previousChordYScrollValue, setPreviousChordYScrollValue] =
    useState(-1);

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
        `section${sectionIndex}-subSection${subSectionIndex}-chord${chordIndex}`
      );
    }

    if (currentElement) {
      // if the current chord is still visible, don't scroll
      const currentChordYScrollValue = currentElement.getBoundingClientRect().y;

      if (
        previousChordYScrollValue !== -1 &&
        Math.abs(previousChordYScrollValue - currentChordYScrollValue) < 50
      ) {
        setIsProgramaticallyScrolling(false);
        return;
      }

      currentElement.scrollIntoView({
        behavior: "instant",
        block: "center",
        inline: "center",
      });

      setPreviousChordYScrollValue(currentChordYScrollValue);

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
    previousChordYScrollValue,
  ]);
}

export default useAutoscrollToCurrentChord;
