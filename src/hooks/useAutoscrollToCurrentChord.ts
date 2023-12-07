import { useState, useEffect } from "react";
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
  const [previousChordSectionIndex, setPreviousChordSectionIndex] =
    useState(-1);

  const {
    editing,
    currentlyPlayingMetadata,
    currentChordIndex,
    audioMetadata,
    playbackSpeed,
  } = useTabStore((state) => ({
    editing: state.editing,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    currentChordIndex: state.currentChordIndex,
    audioMetadata: state.audioMetadata,
    playbackSpeed: state.playbackSpeed,
  }));

  useEffect(() => {
    if (
      // don't want to scroll to first chord when first loading tab
      (previousChordYScrollValue === -1 && currentChordIndex === 0) ||
      (editing && !audioMetadata.playing) ||
      !currentlyPlayingMetadata ||
      !autoscrollEnabled ||
      currentChordIndex === currentlyPlayingMetadata.length - 1 // always are going to be scrolling to the next chord (for better ux)
    )
      return;

    const durationOfCurrentChord =
      60 /
      ((currentlyPlayingMetadata[currentChordIndex]!.bpm /
        Number(
          currentlyPlayingMetadata[currentChordIndex]!.noteLengthMultiplier
        )) *
        playbackSpeed);

    const { sectionIndex, subSectionIndex, chordSequenceIndex, chordIndex } =
      currentlyPlayingMetadata[currentChordIndex + 1]!.location;
    let currentElement: HTMLElement | null = null;

    if (chordSequenceIndex !== undefined) {
      currentElement = document.getElementById(
        `section${sectionIndex}-subSection${subSectionIndex}-chordSequence${chordSequenceIndex}-chord${chordIndex}`
      );
    } else {
      currentElement = document.getElementById(
        `section${sectionIndex}-subSection${subSectionIndex}-chord${chordIndex}`
      );
    }

    if (!currentElement) return;

    const rect = currentElement.getBoundingClientRect();
    const currentChordYScrollValue = rect.y;

    if (
      previousChordYScrollValue !== -1 &&
      Math.abs(previousChordYScrollValue - currentChordYScrollValue) < 50 &&
      previousChordSectionIndex === sectionIndex
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
    const isFirstChordOfNewStrummingSection =
      chordSequenceIndex !== undefined &&
      previousChordSectionIndex !== sectionIndex &&
      chordIndex === 0;

    setTimeout(
      () => {
        if (
          currentElement &&
          (targetIsOutOfViewportWithMargins ||
            isFirstChordOfNewStrummingSection)
        ) {
          scroller.scrollTo(currentElement.id, {
            duration: targetIsWayOutOfViewport ? 0 : 200, // prevents jarring scroll
            delay: 0,
            smooth: "easeInOutQuad",
            offset: isFirstChordOfNewStrummingSection
              ? -160
              : -(
                  window.innerHeight / 2 -
                  rect.height / 2 -
                  window.innerHeight * 0.26
                ),
          });
        }

        setPreviousChordYScrollValue(currentChordYScrollValue);
        setPreviousChordSectionIndex(sectionIndex);
      },
      // TODO: technically I think you would want to abstract this whole function out to optionally do the
      // current chord or the next chord based on whether or not the audio is playing, since when scrolling
      // backwards through the tab I think it is off by one.
      audioMetadata.playing ? durationOfCurrentChord * 0.85 : 0
    );
  }, [
    editing,
    currentlyPlayingMetadata,
    currentChordIndex,
    autoscrollEnabled,
    audioMetadata,
    previousChordYScrollValue,
    previousChordSectionIndex,
    playbackSpeed,
  ]);
}

export default useAutoscrollToCurrentChord;
