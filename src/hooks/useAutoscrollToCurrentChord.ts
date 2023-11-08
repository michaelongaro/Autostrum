import { useState, useEffect } from "react";
import { shallow } from "zustand/shallow";
import { useTabStore } from "~/stores/TabStore";
import { scroller } from "react-scroll";
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
      const currentChordYScrollValue = rect.y;

      if (
        previousChordYScrollValue !== -1 &&
        Math.abs(previousChordYScrollValue - currentChordYScrollValue) < 50
      ) {
        return;
      }

      const isAboveLargeViewport = window.innerWidth >= 1024;
      const targetIsWayOutOfViewport =
        Math.abs(previousChordYScrollValue - currentChordYScrollValue) >
        window.innerHeight * 3;
      const targetIsOutOfViewportWithMargins =
        rect.top < 100 ||
        rect.bottom > window.innerHeight - (isAboveLargeViewport ? 120 : 100);

      if (targetIsOutOfViewportWithMargins) {
        scroller.scrollTo(currentElement.id, {
          duration: targetIsWayOutOfViewport ? 0 : 300, // prevents jarring scroll
          delay: 0,
          smooth: "easeOutQuart",
          offset: -(
            window.innerHeight / 2 -
            rect.height / 2 -
            window.innerHeight * 0.25
          ),
        });
      }

      setPreviousChordYScrollValue(currentChordYScrollValue);
    }
  }, [
    currentlyPlayingMetadata,
    currentChordIndex,
    autoscrollEnabled,
    audioMetadata,
    previousChordYScrollValue,
  ]);
}

export default useAutoscrollToCurrentChord;
