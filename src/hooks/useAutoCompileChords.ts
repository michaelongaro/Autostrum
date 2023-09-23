import { useEffect } from "react";
import { shallow } from "zustand/shallow";
import {
  compileFullTab,
  compileSpecificChordGrouping,
  generateDefaultSectionProgression,
} from "~/utils/chordCompilationHelpers";
import { useTabStore } from "../stores/TabStore";

function useAutoCompileChords() {
  const {
    setCurrentlyPlayingMetadata,
    playbackSpeed,
    audioMetadata,
    setAudioMetadata,
    bpm,
    tabData,
    sectionProgression,
    chords,
    strummingPatterns,
  } = useTabStore(
    (state) => ({
      setCurrentlyPlayingMetadata: state.setCurrentlyPlayingMetadata,
      playbackSpeed: state.playbackSpeed,
      audioMetadata: state.audioMetadata,
      setAudioMetadata: state.setAudioMetadata,
      bpm: state.bpm,
      tabData: state.tabData,
      sectionProgression: state.sectionProgression,
      chords: state.chords,
      strummingPatterns: state.strummingPatterns,
    }),
    shallow
  );

  useEffect(() => {
    function wholeTabIsEmpty() {
      // I *think* this covers all of the edge cases
      if (tabData.length === 0 || tabData[0]?.data.length === 0) {
        return true;
      }
      return false;
    }

    if (wholeTabIsEmpty()) {
      setAudioMetadata({
        location: null,
        tabId: -1,
        playing: false,
        type: "Generated",
      });
      setCurrentlyPlayingMetadata(null);
      return;
    }

    if (audioMetadata.location) {
      compileSpecificChordGrouping({
        tabData,
        location: audioMetadata.location,
        chords,
        baselineBpm: bpm,
        playbackSpeed,
        setCurrentlyPlayingMetadata,
      });
    } else {
      const sanitizedSectionProgression =
        sectionProgression.length > 0
          ? sectionProgression
          : generateDefaultSectionProgression(tabData); // I think you could get by without doing this, but leave it for now

      compileFullTab({
        tabData,
        sectionProgression: sanitizedSectionProgression,
        chords,
        baselineBpm: bpm,
        playbackSpeed,
        setCurrentlyPlayingMetadata,
      });
    }
  }, [
    bpm,
    tabData,
    playbackSpeed,
    audioMetadata.location,
    sectionProgression,
    chords,
    strummingPatterns,
    setAudioMetadata,
    setCurrentlyPlayingMetadata,
  ]);
}

export default useAutoCompileChords;
