import { useEffect, useRef } from "react";
import { useTabStore } from "~/stores/TabStore";
import scrollChordIntoView from "~/utils/scrollChordIntoView";

const STICKY_HEADER_HEIGHT_PX = 64;
const MOBILE_TOP_SCROLL_PADDING_PX = 20;
const DESKTOP_TOP_SCROLL_PADDING_PX = 28;
const MOBILE_BOTTOM_VIEWPORT_PADDING_PX = 24;
const DESKTOP_BOTTOM_VIEWPORT_PADDING_PX = 32;

function getChordElementById(location: {
  sectionIndex: number;
  subSectionIndex: number;
  chordSequenceIndex?: number;
  chordIndex: number;
}): HTMLElement | null {
  const { sectionIndex, subSectionIndex, chordSequenceIndex, chordIndex } =
    location;

  if (chordSequenceIndex !== undefined) {
    return document.getElementById(
      `section${sectionIndex}-subSection${subSectionIndex}-chordSequence${chordSequenceIndex}-chord${chordIndex}`,
    );
  }

  return document.getElementById(
    `section${sectionIndex}-subSection${subSectionIndex}-chord${chordIndex}`,
  );
}

function getChordViewportMargins() {
  const isAboveLargeViewport = window.innerWidth >= 1024;

  return {
    topMargin:
      STICKY_HEADER_HEIGHT_PX +
      (isAboveLargeViewport
        ? DESKTOP_TOP_SCROLL_PADDING_PX
        : MOBILE_TOP_SCROLL_PADDING_PX),
    bottomMargin: isAboveLargeViewport
      ? DESKTOP_BOTTOM_VIEWPORT_PADDING_PX
      : MOBILE_BOTTOM_VIEWPORT_PADDING_PX,
  };
}

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
      // potential complications w/ short (aka repeated) tab data while in playback dialog
      !editing ||
      // don't want to scroll to first chord when initially loading tab in
      (previousChordYScrollValueRef.current === -1 &&
        currentChordIndex === 0) ||
      !currentlyPlayingMetadata ||
      (!audioMetadata.playing && !interactingWithAudioProgressSlider) ||
      !autoscrollEnabled ||
      !currentlyPlayingMetadata[currentChordIndex] // Safety check
    )
      return;

    const currentChordLocation =
      currentlyPlayingMetadata[currentChordIndex].location;
    const currentElement = getChordElementById(currentChordLocation);

    if (!currentElement) return;

    const rect = currentElement.getBoundingClientRect();
    const currentChordYScrollValue = rect.y;
    const { topMargin, bottomMargin } = getChordViewportMargins();
    const { sectionIndex, chordSequenceIndex, chordIndex } =
      currentChordLocation;

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

    if (targetIsOutOfViewportWithMargins || isFirstChordOfNewStrummingSection) {
      scrollChordIntoView({
        location: currentChordLocation,
        duration: targetIsWayOutOfViewport ? 0 : 200,
        align: isFirstChordOfNewStrummingSection
          ? "belowHeader"
          : "comfortable",
      });
    }

    previousChordYScrollValueRef.current = currentChordYScrollValue;
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
