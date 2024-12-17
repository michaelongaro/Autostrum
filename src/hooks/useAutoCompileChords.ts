import { useState, useEffect } from "react";
import {
  compileFullTab,
  compileSpecificChordGrouping,
  generateDefaultSectionProgression,
} from "~/utils/chordCompilationHelpers";
import { useTabStore } from "../stores/TabStore";
import {
  expandFullTab,
  expandSpecificSection,
  updateElapsedSecondsInSectionProgression,
  // expandSpecificChordGrouping,
} from "~/utils/playbackChordCompilationHelpers";

function useAutoCompileChords() {
  const [
    prevFullCurrentlyPlayingMetadataLength,
    setPrevFullCurrentlyPlayingMetadataLength,
  ] = useState(-1);

  const {
    editing,
    setCurrentlyPlayingMetadata,
    playbackSpeed,
    audioMetadata,
    setAudioMetadata,
    bpm,
    tabData,
    sectionProgression,
    chords,
    strummingPatterns,
    atomicallyUpdateAudioMetadata,
    setExpandedTabData,
    setPlaybackMetadata,
    setSectionProgression,
    visiblePlaybackContainerWidth,
    looping,
    loopDelay,
  } = useTabStore((state) => ({
    editing: state.editing,
    setCurrentlyPlayingMetadata: state.setCurrentlyPlayingMetadata,
    playbackSpeed: state.playbackSpeed,
    audioMetadata: state.audioMetadata,
    setAudioMetadata: state.setAudioMetadata,
    bpm: state.bpm,
    tabData: state.tabData,
    sectionProgression: state.sectionProgression,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    atomicallyUpdateAudioMetadata: state.atomicallyUpdateAudioMetadata,
    setExpandedTabData: state.setExpandedTabData,
    setPlaybackMetadata: state.setPlaybackMetadata,
    setSectionProgression: state.setSectionProgression,
    visiblePlaybackContainerWidth: state.visiblePlaybackContainerWidth,
    looping: state.looping,
    loopDelay: state.loopDelay,
  }));

  useEffect(() => {
    if (audioMetadata.type === "Artist recording") return;

    // I *think* this covers all of the edge cases
    function wholeTabIsEmpty() {
      if (tabData.length === 0 || tabData[0]?.data.length === 0) {
        return true;
      }

      if (
        tabData[0]?.data?.[0]?.type === "chord" &&
        tabData[0]?.data?.[0]?.data?.[0]?.data?.length === 0
      ) {
        return true;
      }

      return false;
    }

    if (wholeTabIsEmpty()) {
      setAudioMetadata({
        type: "Generated",
        tabId: -1,
        playing: false,
        location: null,
        startLoopIndex: 0,
        endLoopIndex: -1,
        editingLoopRange: false, // maybe problematic to do this here, be careful
        fullCurrentlyPlayingMetadataLength: -1,
      });
      setCurrentlyPlayingMetadata(null);
      return;
    }

    const sanitizedSectionProgression =
      sectionProgression.length > 0
        ? sectionProgression
        : generateDefaultSectionProgression(tabData); // I think you could get by without doing this, but leave it for now

    if (audioMetadata.location) {
      compileSpecificChordGrouping({
        tabData,
        location: audioMetadata.location,
        chords,
        baselineBpm: bpm,
        playbackSpeed,
        setCurrentlyPlayingMetadata,
        // want to show entire tab while editing loop range
        startLoopIndex: audioMetadata.editingLoopRange
          ? 0
          : audioMetadata.startLoopIndex,
        endLoopIndex: audioMetadata.editingLoopRange
          ? -1
          : audioMetadata.endLoopIndex,
        atomicallyUpdateAudioMetadata,
      });

      if (!editing) {
        const expandedTabData = expandSpecificSection({
          tabData,
          location: audioMetadata.location,
          chords,
          baselineBpm: bpm,
          playbackSpeed,
          setPlaybackMetadata,
          // startLoopIndex: audioMetadata.startLoopIndex,
          // endLoopIndex: audioMetadata.endLoopIndex,
        });

        setExpandedTabData(expandedTabData);
      }
    } else {
      compileFullTab({
        tabData,
        sectionProgression: sanitizedSectionProgression,
        chords,
        baselineBpm: bpm,
        playbackSpeed,
        setCurrentlyPlayingMetadata,
        startLoopIndex: audioMetadata.startLoopIndex,
        endLoopIndex: audioMetadata.endLoopIndex,
        atomicallyUpdateAudioMetadata,
        loopDelay,
      });

      if (!editing) {
        const expandedTabData = expandFullTab({
          tabData,
          sectionProgression: sanitizedSectionProgression,
          chords,
          baselineBpm: bpm,
          playbackSpeed,
          setPlaybackMetadata,
          // want to show entire tab while editing loop range
          startLoopIndex: audioMetadata.editingLoopRange
            ? 0
            : audioMetadata.startLoopIndex,
          endLoopIndex: audioMetadata.editingLoopRange
            ? -1
            : audioMetadata.endLoopIndex,
          visiblePlaybackContainerWidth,
          loopDelay,
        });

        setExpandedTabData(expandedTabData.chords);
      }
    }

    // recompute the elapsed seconds within section progression
    updateElapsedSecondsInSectionProgression({
      tabData,
      sectionProgression: sanitizedSectionProgression,
      baselineBpm: bpm,
      playbackSpeed,
      setSectionProgression,
    });
  }, [
    editing,
    bpm,
    tabData,
    playbackSpeed,
    audioMetadata.endLoopIndex,
    audioMetadata.location,
    audioMetadata.startLoopIndex,
    audioMetadata.editingLoopRange,
    audioMetadata.type,
    sectionProgression,
    chords,
    strummingPatterns,
    setAudioMetadata,
    setCurrentlyPlayingMetadata,
    atomicallyUpdateAudioMetadata,
    setExpandedTabData,
    setPlaybackMetadata,
    setSectionProgression,
    visiblePlaybackContainerWidth,
    looping,
    loopDelay,
  ]);

  // only applies while editing obv, but if you delete some chords, the loop range should be reset
  // to prevent potential playing of chords that no longer exist
  useEffect(() => {
    if (
      audioMetadata.fullCurrentlyPlayingMetadataLength ===
      prevFullCurrentlyPlayingMetadataLength
    )
      return;

    if (
      audioMetadata.fullCurrentlyPlayingMetadataLength <
      prevFullCurrentlyPlayingMetadataLength
    ) {
      atomicallyUpdateAudioMetadata({
        startLoopIndex: 0,
        endLoopIndex: -1,
      });
    }

    setPrevFullCurrentlyPlayingMetadataLength(
      audioMetadata.fullCurrentlyPlayingMetadataLength,
    );
  }, [
    audioMetadata.fullCurrentlyPlayingMetadataLength,
    atomicallyUpdateAudioMetadata,
    prevFullCurrentlyPlayingMetadataLength,
  ]);
}

export default useAutoCompileChords;
