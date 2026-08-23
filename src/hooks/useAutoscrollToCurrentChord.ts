import { useEffect, useRef } from "react";
import { useTabStore } from "~/stores/TabStore";
import scrollChordIntoView, {
  getChordElement,
  getChordViewportMargins,
  isTabletOrLargerViewport,
} from "~/utils/scrollChordIntoView";

function useAutoscrollToCurrentChord(autoscrollEnabled: boolean) {
  // not my favorite hack: but is used to avoid scrolling when
  // the current chord is still visible but there is small difference
  // in height (<50px) between the current chord and the previous chord
  // to avoid jarring scrolling effects.
  const previousChordYScrollValueRef = useRef(-1);
  const previousChordSectionIndexRef = useRef(-1);

  const {
    editing,
    currentlyPlayingMetadata,
    currentChordIndex,
    audioMetadata,
    interactingWithAudioProgressSlider,
  } = useTabStore((state) => ({
    editing: state.editing,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    currentChordIndex: state.currentChordIndex,
    audioMetadata: state.audioMetadata,
    interactingWithAudioProgressSlider:
      state.interactingWithAudioProgressSlider,
  }));

  useEffect(() => {
    if (
      !editing ||
      // don't want to scroll to first chord when initially loading tab in
      (previousChordYScrollValueRef.current === -1 &&
        currentChordIndex === 0) ||
      !audioMetadata.playing ||
      !autoscrollEnabled ||
      !currentlyPlayingMetadata?.[currentChordIndex] // Safety check
    ) {
      return;
    }

    const currentChordLocation =
      currentlyPlayingMetadata[currentChordIndex].location;
    const currentElement = getChordElement(currentChordLocation);

    if (!currentElement) return;

    const rect = currentElement.getBoundingClientRect();
    const currentChordYScrollValue = rect.y;
    const { topMargin, bottomMargin } = getChordViewportMargins();
    const { sectionIndex, chordSequenceIndex, chordIndex } =
      currentChordLocation;
    const isTabletOrLarger = isTabletOrLargerViewport();

    if (
      previousChordYScrollValueRef.current !== -1 &&
      Math.abs(
        previousChordYScrollValueRef.current - currentChordYScrollValue,
      ) < 50 &&
      previousChordSectionIndexRef.current === sectionIndex
    ) {
      return;
    }

    const targetIsWayOutOfViewport =
      Math.abs(
        previousChordYScrollValueRef.current - currentChordYScrollValue,
      ) >
      window.innerHeight * 3;

    const targetIsOutOfViewportWithMargins =
      rect.top < topMargin || rect.bottom > window.innerHeight - bottomMargin;

    const isFirstChordOfNewStrummingSection =
      chordSequenceIndex !== undefined &&
      previousChordSectionIndexRef.current !== sectionIndex &&
      chordIndex === 0;

    // Tablet+: keep the active chord vertically centered whenever its row
    // changes. Smaller viewports keep the existing edge-margin behavior.
    if (
      isTabletOrLarger ||
      targetIsOutOfViewportWithMargins ||
      isFirstChordOfNewStrummingSection
    ) {
      scrollChordIntoView({
        location: currentChordLocation,
        duration: targetIsWayOutOfViewport ? 0 : 200,
        align: isTabletOrLarger
          ? "center"
          : isFirstChordOfNewStrummingSection
            ? "belowHeader"
            : "comfortable",
      });
    }

    // After a centered scroll, store the post-scroll target Y so same-row
    // chords (still near center) don't immediately trigger another scroll.
    previousChordYScrollValueRef.current = isTabletOrLarger
      ? Math.round(window.innerHeight / 2 - rect.height / 2)
      : currentChordYScrollValue;
    previousChordSectionIndexRef.current = sectionIndex;
  }, [
    editing,
    currentlyPlayingMetadata,
    currentChordIndex,
    autoscrollEnabled,
    audioMetadata,
    interactingWithAudioProgressSlider,
  ]);
}

export default useAutoscrollToCurrentChord;
